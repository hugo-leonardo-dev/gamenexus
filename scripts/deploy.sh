#!/usr/bin/env bash
# ============================================================================
# deploy.sh — GameNexus
# ============================================================================
# Deploy completo do zero. Idempotente — pode rodar múltiplas vezes.
#
# Uso:
#   ./scripts/deploy.sh
#
# O que faz:
#   1. Verifica pré-requisitos (Docker, Git, .env)
#   2. Clona o repositório (ou git pull se já existir)
#   3. Cria diretórios necessários (backups, logs)
#   4. Builda as imagens Docker
#   5. Sobe os containers (app, postgres, redis, nginx, migrate)
#   6. Aguarda healthcheck do app
#   7. Configura cron jobs (backup diário + preços)
#   8. Exibe resumo final
# ============================================================================

set -euo pipefail

# ─── Cores para output ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Configurações ──────────────────────────────────────────────────────
PROJECT_DIR="/opt/gamenexus"
REPO_URL="https://github.com/seu-usuario/gamenexus.git"
BACKUP_DIR="${PROJECT_DIR}/backups"
LOG_DIR="${PROJECT_DIR}/logs"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# ─── Utilitários ────────────────────────────────────────────────────────
log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 não encontrado. Instale antes de continuar."
        exit 1
    fi
}

# ============================================================================
# 1. Verificação de Pré-requisitos
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GameNexus — Deploy Automatizado${NC}"
echo -e "${BLUE}  Início: ${TIMESTAMP}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

log_info "Verificando pré-requisitos..."

# Docker
check_command docker
log_ok "Docker encontrado: $(docker --version)"

# Docker Compose
check_command docker compose
log_ok "Docker Compose encontrado: $(docker compose version)"

# Git
check_command git
log_ok "Git encontrado: $(git --version)"

# OpenSSL (para gerar secrets)
check_command openssl
log_ok "OpenSSL encontrado"

# Verifica se o Docker daemon está rodando
if ! docker info &> /dev/null; then
    log_error "Docker daemon não está rodando. Execute: sudo systemctl start docker"
    exit 1
fi
log_ok "Docker daemon ativo"

echo ""

# ============================================================================
# 2. Preparação do Repositório
# ============================================================================

# Cria diretório do projeto se não existir
if [ ! -d "$PROJECT_DIR" ]; then
    log_info "Criando diretório do projeto: ${PROJECT_DIR}"
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown "$(whoami):$(whoami)" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Clona ou atualiza repositório
if [ ! -d "${PROJECT_DIR}/.git" ]; then
    log_info "Clonando repositório..."
    git clone "$REPO_URL" "$PROJECT_DIR"
    log_ok "Repositório clonado de: ${REPO_URL}"
else
    log_info "Repositório já existe. Atualizando..."
    git fetch origin
    git checkout main
    git pull origin main
    log_ok "Repositório atualizado (branch: main)"
fi

echo ""

# ============================================================================
# 3. Verificação do .env
# ============================================================================

if [ ! -f "${PROJECT_DIR}/.env" ]; then
    log_warn "Arquivo .env não encontrado em ${PROJECT_DIR}/.env"

    if [ -f "${PROJECT_DIR}/.env.example" ]; then
        echo ""
        log_info "Criando .env a partir do .env.example..."
        log_info "Edite o arquivo .env com suas configurações e rode este script novamente."
        echo ""
        cp .env.example .env

        # Gera secrets automaticamente
        if [[ "$(uname)" == "Linux" ]]; then
            sed -i "s/SUA_SENHA_AQUI/$(openssl rand -hex 16)/g" .env
            sed -i "s/openssl_rand_hex_32_aqui/$(openssl rand -hex 32)/g" .env
            sed -i "s|http://localhost:3000|https://gamenexus.seudominio.com|g" .env

            log_info "Secrets gerados automaticamente no .env:"
            grep -E "^(DATABASE_URL|AUTH_SECRET|CRON_SECRET|NEXTAUTH_URL)=" .env
        fi

        log_warn "⚠️  REVISÃO MANUAL NECESSÁRIA:"
        log_warn "   Preencha os valores de: AUTH_DISCORD_ID, AUTH_DISCORD_SECRET, NEXTAUTH_URL"
        log_warn "   Depois execute este script novamente."
    fi

    exit 0
fi

log_ok "Arquivo .env encontrado"
echo ""

# ============================================================================
# 4. Diretórios Auxiliares
# ============================================================================

log_info "Criando diretórios auxiliares..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"
log_ok "Diretórios criados: backups/, logs/"

# Create a .gitkeep so the directories are tracked
touch "${BACKUP_DIR}/.gitkeep"
touch "${LOG_DIR}/.gitkeep"

echo ""

# ============================================================================
# 5. Build das Imagens Docker
# ============================================================================

log_info "Buildando imagens Docker (isso pode levar alguns minutos)..."
docker compose build --pull
log_ok "Build concluído"

echo ""

# ============================================================================
# 6. Inicialização dos Containers
# ============================================================================

log_info "Iniciando containers..."
docker compose up -d --remove-orphans
log_ok "Todos os containers foram iniciados"

echo ""

# ============================================================================
# 7. Healthcheck
# ============================================================================

log_info "Aguardando healthcheck do app..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        log_ok "App está saudável e respondendo na porta 3000"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_warn "Timeout aguardando healthcheck. Verifique os logs: docker compose logs app"
fi

echo ""

# ============================================================================
# 8. Configuração de Cron Jobs
# ============================================================================

CRON_DIR="/etc/cron.d"
log_info "Configurando cron jobs..."

# Backup diário às 03:00
BACKUP_CRON="${CRON_DIR}/gamenexus-backup"
if [ ! -f "$BACKUP_CRON" ]; then
    echo "0 3 * * * root ${PROJECT_DIR}/scripts/backup.sh >> ${LOG_DIR}/cron-backup.log 2>&1" | \
        sudo tee "$BACKUP_CRON" > /dev/null
    sudo chmod 644 "$BACKUP_CRON"
    log_ok "Cron de backup configurado: 03:00 UTC (diário)"
else
    log_info "Cron de backup já existe"
fi

# Atualização de preços às 08:00
PRICES_CRON="${CRON_DIR}/gamenexus-prices"
if [ ! -f "$PRICES_CRON" ]; then
    # Lê o CRON_SECRET do .env (precisa estar disponível)
    CRON_TOKEN=$(grep "^CRON_SECRET=" "${PROJECT_DIR}/.env" | cut -d'=' -f2)

    echo "0 8 * * * root curl -s -H 'Authorization: Bearer ${CRON_TOKEN}' http://localhost:3000/api/cron/update-prices >> ${LOG_DIR}/cron-prices.log 2>&1" | \
        sudo tee "$PRICES_CRON" > /dev/null
    sudo chmod 644 "$PRICES_CRON"
    log_ok "Cron de preços configurado: 08:00 UTC (diário)"
else
    log_info "Cron de preços já existe"
fi

echo ""

# ============================================================================
# 9. Status Final
# ============================================================================

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  📍 Diretório:    ${PROJECT_DIR}"
echo -e "  🌐 URL:          $(grep "^NEXTAUTH_URL=" .env | cut -d'=' -f2 || echo 'http://localhost:3000')"
echo -e "  🐳 Containers:   $(docker compose ps --services | tr '\n' ' ')"
echo ""
echo -e "  📋 Comandos úteis:"
echo -e "     docker compose ps              # Status dos containers"
echo -e "     docker compose logs -f app     # Logs do app"
echo -e "     docker compose logs --tail=100 # Últimos logs"
echo -e "     docker stats                   # Uso de recursos"
echo -e "     ./scripts/backup.sh            # Backup manual"
echo -e "     ./scripts/update.sh            # Atualizar aplicação"
echo ""

# ─── Aviso sobre SSL ──────────────────────────────────────────────────────
echo -e "${YELLOW}⚠️  LEMBRETES:${NC}"
echo -e "   • SSL: Se usar Cloudflare, configure SSL/TLS como Flexible no Dashboard."
echo -e "   • SSL sem Cloudflare: gere certificados Let's Encrypt."
echo -e "   • Verifique o Discord OAuth redirect URI no Developer Portal."
echo -e "   • Monitore a RAM: docker stats (esperado ~770MB com todos os serviços)"
echo ""
