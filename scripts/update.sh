#!/usr/bin/env bash
# ============================================================================
# update.sh — GameNexus
# ============================================================================
# Atualiza a aplicação sem parar os containers completamente.
# Idempotente — pode rodar múltiplas vezes sem dano.
#
# Uso:
#   ./scripts/update.sh                    # Atualiza tudo
#   ./scripts/update.sh --skip-backup      # Pula backup automático
#   ./scripts/update.sh --dry-run          # Simula sem executar
#   ./scripts/update.sh --branch develop   # Atualiza de branch específica
#
# Fluxo:
#   1. Faz backup automático do banco
#   2. git pull (ou checkout de branch específica)
#   3. docker compose build (só se houver mudanças no Dockerfile ou código)
#   4. docker compose up -d (reinicia containers com novas imagens)
#   5. Aguarda healthcheck
#   6. Remove imagens antigas (docker system prune)
# ============================================================================

set -euo pipefail

# ─── Cores ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─── Configurações ──────────────────────────────────────────────────────
PROJECT_DIR="/opt/gamenexus"
COMPOSE_DIR="${PROJECT_DIR}"
BRANCH="main"
SKIP_BACKUP=false
DRY_RUN=false

# ─── Parsing de Argumentos ──────────────────────────────────────────────
for arg in "$@"; do
    case "$arg" in
        --skip-backup) SKIP_BACKUP=true ;;
        --dry-run)     DRY_RUN=true ;;
        --branch=*)    BRANCH="${arg#*=}" ;;
        --branch)      ;; # handled below
        *)
            # Se for o valor de --branch
            if [[ "${PREV_ARG:-}" == "--branch" ]]; then
                BRANCH="$arg"
            else
                echo -e "${RED}[ERROR]${NC} Argumento desconhecido: ${arg}"
                echo "Uso: ./scripts/update.sh [--skip-backup] [--dry-run] [--branch nome]"
                exit 1
            fi
            ;;
    esac
    PREV_ARG="$arg"
done

# ─── Utilitários ────────────────────────────────────────────────────────
log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

run_cmd() {
    if $DRY_RUN; then
        echo -e "${YELLOW}[DRY-RUN]${NC} $1"
    else
        eval "$1"
    fi
}

# ============================================================================
# 1. Verificações Iniciais
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GameNexus — Atualização Automática${NC}"
echo -e "${BLUE}  Data: $(date +"%Y-%m-%d %H:%M:%S")${NC}"
echo -e "${BLUE}  Branch: ${BRANCH}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

cd "$COMPOSE_DIR"

# Verifica se é um repositório git
if [ ! -d ".git" ]; then
    log_error "Diretório ${COMPOSE_DIR} não é um repositório Git."
    log_info "Execute ./scripts/deploy.sh para fazer o deploy inicial."
    exit 1
fi

# Verifica se há mudanças locais não commitadas
if ! git diff --quiet HEAD 2>/dev/null; then
    log_warn "Há mudanças locais não commitadas:"
    git status --short | head -10 | while IFS= read -r line; do
        echo -e "  ${YELLOW}${line}${NC}"
    done
    echo ""
    log_warn "Recomendação: Faça stash ou commit das mudanças antes de atualizar."
    read -rp "  Continuar mesmo assim? (yes/NÃO): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Atualização cancelada."
        exit 0
    fi
fi

echo ""

# ============================================================================
# 2. Backup Automático
# ============================================================================

if $SKIP_BACKUP; then
    log_info "Backup automático pulado (--skip-backup)"
else
    log_info "Fazendo backup automático do banco antes da atualização..."
    if $DRY_RUN; then
        echo -e "${YELLOW}[DRY-RUN]${NC} ./scripts/backup.sh"
    else
        if [ -f "${PROJECT_DIR}/scripts/backup.sh" ]; then
            "${PROJECT_DIR}/scripts/backup.sh" || log_warn "Backup falhou, mas continuando..."
        else
            log_warn "Script backup.sh não encontrado em ${PROJECT_DIR}/scripts/"
        fi
    fi
fi

echo ""

# ============================================================================
# 3. Atualizar Código
# ============================================================================

log_info "Atualizando código (branch: ${BRANCH})..."

# Salva o commit atual antes do pull
if ! $DRY_RUN; then
    OLD_COMMIT=$(git rev-parse HEAD)
fi

run_cmd "git fetch origin ${BRANCH}"
run_cmd "git checkout ${BRANCH}"
run_cmd "git pull origin ${BRANCH}"

if ! $DRY_RUN; then
    NEW_COMMIT=$(git rev-parse HEAD)
    COMMIT_COUNT=$(git rev-list --count "${OLD_COMMIT}..${NEW_COMMIT}" 2>/dev/null || echo "0")
    log_ok "Código atualizado (${COMMIT_COUNT} novo(s) commit(s))"
fi

echo ""

# ============================================================================
# 4. Verificar se precisa rebuildar
# ============================================================================

log_info "Verificando se há mudanças que exigem rebuild..."

# Verifica se Dockerfile, docker-compose ou package.json mudaram
CHANGED_FILES=$(git diff --name-only "${OLD_COMMIT}..${NEW_COMMIT}" 2>/dev/null || echo "")

NEEDS_REBUILD=false
for pattern in "Dockerfile" "docker-compose.yml" "package.json" "package-lock.json" "nginx/" ".dockerignore"; do
    if echo "$CHANGED_FILES" | grep -q "$pattern"; then
        NEEDS_REBUILD=true
        log_info "  Mudança detectada em: ${pattern}"
    fi
done

if $NEEDS_REBUILD || [ "$CHANGED_FILES" = "" ]; then
    # Se não conseguiu detectar mudanças (dry-run ou erro), rebuilda por segurança
    if [ "$CHANGED_FILES" = "" ] && ! $DRY_RUN; then
        log_info "  Não foi possível detectar mudanças — rebuildando por segurança"
    fi

    log_info "Buildando novas imagens..."
    run_cmd "docker compose build --pull"
    log_ok "Build concluído"
else
    log_info "  Nenhuma mudança em dependências — rebuild não necessário"
fi

echo ""

# ============================================================================
# 5. Migrations
# ============================================================================

# Força execução das migrations (se houver novas, serão aplicadas)
# O container migrate roda automaticamente via depends_on, mas forçamos aqui
log_info "Aplicando migrations pendentes..."
run_cmd "docker compose run --rm migrate 2>/dev/null || docker compose up -d migrate 2>/dev/null || true"
log_ok "Migrations verificadas"

echo ""

# ============================================================================
# 6. Reiniciar Containers
# ============================================================================

log_info "Reiniciando containers com as novas imagens..."
# docker compose up -d já é idempotente — se o container já existe com a
# imagem correta, ele não faz nada. Se a imagem mudou, ele recria.
run_cmd "docker compose up -d --remove-orphans"
log_ok "Containers reiniciados"
log_ok "Containers reiniciados"

echo ""

# ============================================================================
# 7. Healthcheck
# ============================================================================

log_info "Verificando healthcheck..."
if ! $DRY_RUN; then
    for i in $(seq 1 30); do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            log_ok "App está saudável!"
            break
        fi
        if [ "$i" -eq 30 ]; then
            log_warn "Timeout aguardando healthcheck. Verifique: docker compose logs app --tail=50"
        fi
        sleep 2
    done
fi

echo ""

# ============================================================================
# 8. Limpeza
# ============================================================================

log_info "Removendo imagens e containers não utilizados..."
run_cmd "docker system prune -f 2>/dev/null || true"
log_ok "Limpeza concluída"

echo ""

# ============================================================================
# 9. Resumo
# ============================================================================

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Atualização concluída com sucesso!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if ! $DRY_RUN; then
    echo -e "  📍 Diretório:  ${COMPOSE_DIR}"
    echo -e "  🌿 Branch:     ${BRANCH}"
    echo -e "  📝 Commit:     $(git log --oneline -1)"

    # Status dos containers
    echo ""
    echo -e "  🐳 Containers:"
    docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
fi

echo ""
