#!/usr/bin/env bash
# ============================================================================
# backup.sh — GameNexus
# ============================================================================
# Backup do PostgreSQL. Idempotente — pode rodar múltiplas vezes no mesmo dia
# (cria arquivos com timestamp diferente).
#
# Uso:
#   ./scripts/backup.sh                    # Backup padrão (mantém 7 dias)
#   RETENTION_DAYS=30 ./scripts/backup.sh  # Backup com retenção customizada
#   ./scripts/backup.sh --dry-run          # Simula sem executar
#
# O que faz:
#   1. Verifica se o container postgres está rodando
#   2. Executa pg_dump via docker exec
#   3. Comprime com gzip
#   4. Remove backups mais antigos que RETENTION_DAYS (default: 7)
#   5. Loga resultado
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
LOG_DIR="${PROJECT_DIR}/logs"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER_NAME="gamenexus-postgres"
DB_USER="gamenexus"
DB_NAME="gamenexus"

# ─── Modo Dry-Run ───────────────────────────────────────────────────────
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}[DRY-RUN]${NC} Modo simulação — nenhuma ação será executada"
fi

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
# 1. Verificações
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GameNexus — Backup do Banco de Dados${NC}"
echo -e "${BLUE}  Data: $(date +"%Y-%m-%d %H:%M:%S")${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Cria diretórios se não existirem
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Verifica se o container postgres está rodando
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container ${CONTAINER_NAME} não está rodando."
    log_info "Verifique com: docker compose ps"
    exit 1
fi
log_ok "Container ${CONTAINER_NAME} está rodando"

# ============================================================================
# 2. Execução do Backup
# ============================================================================

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/gamenexus-${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

log_info "Iniciando pg_dump..."
log_info "  Banco:    ${DB_NAME}"
log_info "  Usuário:  ${DB_USER}"
log_info "  Destino:  ${BACKUP_FILE_GZ}"

# Executa pg_dump dentro do container e comprime
DUMP_CMD="docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME}"

if $DRY_RUN; then
    echo -e "${YELLOW}[DRY-RUN]${NC} ${DUMP_CMD} | gzip > ${BACKUP_FILE_GZ}"
else
    # pg_dump via docker exec, comprime com gzip
    if docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_FILE_GZ}"; then
        log_ok "Backup concluído com sucesso!"
    else
        log_error "Falha ao executar pg_dump. Verifique se o banco está acessível."
        exit 1
    fi
fi

# ============================================================================
# 3. Informações do Backup
# ============================================================================

if ! $DRY_RUN; then
    FILE_SIZE=$(du -h "${BACKUP_FILE_GZ}" | cut -f1)
    TABLE_COUNT=$(zcat "${BACKUP_FILE_GZ}" | grep -c "^COPY " || true)

    echo ""
    log_ok "Arquivo:   ${BACKUP_FILE_GZ}"
    log_ok "Tamanho:   ${FILE_SIZE}"
    log_ok "Tabelas:   ${TABLE_COUNT}"
fi

echo ""

# ============================================================================
# 4. Limpeza de Backups Antigos
# ============================================================================

log_info "Removendo backups mais antigos que ${RETENTION_DAYS} dias..."

PURGE_CMD="find ${BACKUP_DIR} -name 'gamenexus-*.sql.gz' -type f -mtime +${RETENTION_DAYS}"

if $DRY_RUN; then
    OLD_FILES=$(eval "${PURGE_CMD}" 2>/dev/null || true)
    if [ -n "$OLD_FILES" ]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} Removeria os seguintes arquivos:"
        echo "$OLD_FILES" | sed 's/^/    /'
    else
        log_info "Nenhum arquivo antigo para remover"
    fi
else
    OLD_FILES=$(eval "${PURGE_CMD} -delete" 2>/dev/null || true)
    if [ -n "$OLD_FILES" ]; then
        REMOVED=$(echo "$OLD_FILES" | wc -l)
        log_ok "${REMOVED} backup(s) antigo(s) removido(s)"
    else
        log_info "Nenhum backup antigo para remover"
    fi
fi

echo ""

# ============================================================================
# 5. Resumo
# ============================================================================

if ! $DRY_RUN; then
    TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1 || echo "0B")
    TOTAL_FILES=$(find "${BACKUP_DIR}" -name 'gamenexus-*.sql.gz' -type f | wc -l)

    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ Backup concluído com sucesso!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  📁 Diretório:  ${BACKUP_DIR}"
    echo -e "  💾 Total:      ${TOTAL_FILES} arquivo(s) (${TOTAL_SIZE})"
    echo -e "  🗑️  Retenção:   ${RETENTION_DAYS} dias"
    echo ""
fi
