#!/usr/bin/env bash
# ============================================================================
# restore.sh — GameNexus
# ============================================================================
# Restaura o banco de dados a partir de um backup existente.
#
# Uso:
#   ./scripts/restore.sh                    # Lista backups disponíveis
#   ./scripts/restore.sh backups/gamenexus-20260721-030000.sql.gz  # Restaura específico
#   ./scripts/restore.sh --latest           # Restaura o backup mais recente
#   ./scripts/restore.sh --dry-run backups/...  # Simula sem restaurar
#
# ⚠️  AVISO: O restore DERRUBA o app e APAGA os dados atuais do banco.
#    O container PostgreSQL é recriado do zero antes do restore.
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
BACKUP_DIR="${PROJECT_DIR}/backups"
COMPOSE_DIR="${PROJECT_DIR}"
CONTAINER_NAME="gamenexus-postgres"
DB_USER="gamenexus"
DB_NAME="gamenexus"

# ─── Modo Dry-Run ───────────────────────────────────────────────────────
DRY_RUN=false
for arg in "$@"; do
    if [ "$arg" = "--dry-run" ]; then
        DRY_RUN=true
    fi
done

# ─── Utilitários ────────────────────────────────────────────────────────
log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

confirm() {
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ⚠️  ATENÇÃO: Esta operação IRÁ SUBSTITUIR os dados atuais!${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  O que será feito:"
    echo -e "  • Parar o container ${CONTAINER_NAME}"
    echo -e "  • Remover o volume de dados atual"
    echo -e "  • Recriar o container PostgreSQL"
    echo -e "  • Restaurar o backup selecionado"
    echo -e "  • Reiniciar o app"
    echo ""
    read -rp "  Tem certeza? (yes/NÃO): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Operação cancelada."
        exit 0
    fi
}

list_backups() {
    echo -e "${BLUE}Backups disponíveis em ${BACKUP_DIR}:${NC}"
    echo ""

    BACKUPS=$(find "${BACKUP_DIR}" -name 'gamenexus-*.sql.gz' -type f | sort -r)

    if [ -z "$BACKUPS" ]; then
        log_warn "Nenhum backup encontrado em ${BACKUP_DIR}"
        log_info "Execute ./scripts/backup.sh primeiro para criar um backup."
        exit 1
    fi

    echo -e "  ${GREEN}Data${NC}                   ${GREEN}Arquivo${NC}                  ${GREEN}Tamanho${NC}"
    echo -e "  ─────────────────────────────────────────────────────────────"

    while IFS= read -r file; do
        FILENAME=$(basename "$file")
        FILESIZE=$(du -h "$file" | cut -f1)
        FILEDATE=$(echo "$FILENAME" | sed 's/gamenexus-\([0-9]\{8\}\)-\([0-9]\{6\}\).*/\1 \2/' | sed 's/\(....\)\(..\)\(..\)/\1-\2-\3/')
        echo -e "  ${FILEDATE}  ${FILENAME}  (${FILESIZE})"
    done <<< "$BACKUPS"

    echo ""
    log_info "Para restaurar, execute:"
    log_info "  ./scripts/restore.sh ${BACKUP_DIR}/gamenexus-YYYYMMDD-HHMMSS.sql.gz"
    log_info "  ./scripts/restore.sh --latest"
}

run_cmd() {
    if $DRY_RUN; then
        echo -e "${YELLOW}[DRY-RUN]${NC} $1"
        return 0
    else
        eval "$1"
    fi
}

# ============================================================================
# 1. Determinar arquivo de backup
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GameNexus — Restore do Banco de Dados${NC}"
echo -e "${BLUE}  Data: $(date +"%Y-%m-%d %H:%M:%S")${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

BACKUP_FILE=""

for arg in "$@"; do
    case "$arg" in
        --dry-run|--latest) continue ;;
        --*)
            log_error "Argumento desconhecido: ${arg}"
            echo "Uso: ./scripts/restore.sh [--latest|arquivo.gz] [--dry-run]"
            exit 1
            ;;
        *)
            BACKUP_FILE="$arg"
            ;;
    esac
done

# Se nenhum arquivo foi especificado, lista backups e sai
if [ -z "$BACKUP_FILE" ]; then
    # Se --latest, pega o backup mais recente
    if [[ "$*" == *"--latest"* ]]; then
        BACKUP_FILE=$(find "${BACKUP_DIR}" -name 'gamenexus-*.sql.gz' -type f | sort -r | head -1)
        if [ -z "$BACKUP_FILE" ]; then
            log_error "Nenhum backup encontrado para --latest"
            exit 1
        fi
        log_info "Usando backup mais recente: $(basename "$BACKUP_FILE")"
    else
        list_backups
        exit 0
    fi
fi

# ============================================================================
# 2. Verifica se o arquivo existe
# ============================================================================

# Suporta caminho absoluto ou relativo
if [ ! -f "$BACKUP_FILE" ]; then
    if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    else
        log_error "Arquivo não encontrado: ${BACKUP_FILE}"
        list_backups
        exit 1
    fi
fi

log_ok "Arquivo de backup encontrado: ${BACKUP_FILE}"

# Verifica se é um .gz válido
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    log_error "Arquivo de backup corrompido ou não é um gzip válido: ${BACKUP_FILE}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
RESTORE_SIZE=$(gunzip -c "$BACKUP_FILE" | wc -c | numfmt --to=iec 2>/dev/null || echo "desconhecido")

echo ""
log_info "  Tamanho (comprimido):   ${BACKUP_SIZE}"
log_info "  Tamanho (descomprimir): ${RESTORE_SIZE}"

echo ""

# ============================================================================
# 3. Confirmação
# ============================================================================

confirm

echo ""

# ============================================================================
# 4. Restore
# ============================================================================

cd "$COMPOSE_DIR"

log_info "Etapa 1/4: Parando aplicação..."
run_cmd "docker compose stop app nginx migrate 2>/dev/null || true"
log_ok "App parado"

echo ""

log_info "Etapa 2/4: Removendo volume PostgreSQL..."
run_cmd "docker compose down postgres 2>/dev/null || true"
run_cmd "docker volume rm gamenexus-pgdata 2>/dev/null || true"
log_ok "Volume removido (dados atuais apagados)"

echo ""

log_info "Etapa 3/4: Recriando PostgreSQL e restaurando backup..."
run_cmd "docker compose up -d postgres"

# Aguarda postgres ficar saudável
if ! $DRY_RUN; then
    log_info "Aguardando PostgreSQL iniciar..."
    for i in $(seq 1 30); do
        if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" &>/dev/null; then
            log_ok "PostgreSQL pronto"
            break
        fi
        sleep 2
    done
fi

# Restaura o backup
echo ""
RESTORE_CMD="gunzip -c '${BACKUP_FILE}' | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} ${DB_NAME}"

if $DRY_RUN; then
    log_info "${YELLOW}[DRY-RUN]${NC} ${RESTORE_CMD}"
else
    if gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" "${DB_NAME}"; then
        log_ok "Backup restaurado com sucesso!"

        # Conta registros restaurados
        log_info "Resumo dos dados restaurados:"
        docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -c "
            SELECT 'Usuários:    ' || COUNT(*)::text FROM \"User\"
            UNION ALL
            SELECT 'Grupos:      ' || COUNT(*)::text FROM \"Group\"
            UNION ALL
            SELECT 'Jogos:       ' || COUNT(*)::text FROM \"Game\"
            UNION ALL
            SELECT 'Membros:     ' || COUNT(*)::text FROM \"GroupMember\";
        " 2>/dev/null || log_warn "Não foi possível contar registros (tabelas podem estar vazias)"
    else
        log_error "Falha ao restaurar backup. O banco pode estar em estado inconsistente."
        exit 1
    fi
fi

echo ""

# ============================================================================
# 5. Reiniciar aplicação
# ============================================================================

log_info "Etapa 4/4: Reiniciando aplicação..."
# Sobe app (que depende de migrate) + nginx
# O migrate roda automaticamente via depends_on do app
run_cmd "docker compose up -d app nginx"

if ! $DRY_RUN; then
    log_info "Aguardando healthcheck do app..."
    for i in $(seq 1 30); do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            log_ok "App está saudável!"
            break
        fi
        sleep 2
    done
fi

echo ""

# ============================================================================
# 6. Resumo
# ============================================================================

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Restore concluído com sucesso!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  📂 Backup restaurado:  $(basename "$BACKUP_FILE")"
echo -e "  📍 Tamanho:            ${BACKUP_SIZE}"
echo -e "  🕐 Data:               $(date +"%Y-%m-%d %H:%M:%S")"
echo ""
echo -e "  Verifique os dados acessando a aplicação."
echo ""
