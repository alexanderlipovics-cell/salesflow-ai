#!/bin/bash
# ============================================
# 💾 SALESFLOW AI - AUTOMATED BACKUP SCRIPT
# ============================================
# Features:
# - Database backup (PostgreSQL)
# - Redis backup
# - S3 upload with encryption
# - Backup rotation
# - Slack notifications
# - Integrity verification

set -euo pipefail

# ==================== CONFIGURATION ====================
BACKUP_DIR="${BACKUP_DIR:-/opt/salesflow/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DIR=$(date +"%Y/%m/%d")
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# S3 Configuration
S3_BUCKET="${S3_BUCKET:-salesflow-backups}"
S3_REGION="${S3_REGION:-eu-central-1}"

# Database Configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-salesflow}"
DB_USER="${DB_USER:-salesflow}"

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Slack Webhook (optional)
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# ==================== COLORS ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==================== LOGGING ====================
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# ==================== SLACK NOTIFICATION ====================
notify_slack() {
    local message="$1"
    local color="${2:-good}"
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"text\": \"$message\",
                    \"footer\": \"SalesFlow Backup System\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null 2>&1 || true
    fi
}

# ==================== CLEANUP ====================
cleanup() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        log_error "Backup failed with exit code: $exit_code"
        notify_slack "❌ SalesFlow backup failed! Exit code: $exit_code" "danger"
    fi
    
    # Remove temporary files
    rm -f /tmp/backup_*.tmp 2>/dev/null || true
    
    exit $exit_code
}

trap cleanup EXIT

# ==================== PREREQUISITES ====================
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required tools
    for cmd in pg_dump redis-cli gzip aws sha256sum; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR/database"
    mkdir -p "$BACKUP_DIR/redis"
    mkdir -p "$BACKUP_DIR/logs"
    
    log_success "Prerequisites check passed"
}

# ==================== DATABASE BACKUP ====================
backup_database() {
    log "Starting PostgreSQL backup..."
    
    local backup_file="$BACKUP_DIR/database/salesflow_db_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    # Create backup
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --verbose \
        2>> "$BACKUP_DIR/logs/backup_${TIMESTAMP}.log" \
        > "$backup_file"
    
    # Check if backup is valid
    if [ ! -s "$backup_file" ]; then
        log_error "Database backup file is empty"
        return 1
    fi
    
    # Get row counts for verification
    local lead_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM leads;" 2>/dev/null | tr -d ' ')
    log "Database backup contains $lead_count leads"
    
    # Compress
    gzip -9 "$backup_file"
    
    # Calculate checksum
    local checksum=$(sha256sum "$compressed_file" | cut -d' ' -f1)
    echo "$checksum" > "${compressed_file}.sha256"
    
    # Get file size
    local size=$(du -h "$compressed_file" | cut -f1)
    
    log_success "Database backup completed: $compressed_file ($size)"
    
    # Upload to S3
    upload_to_s3 "$compressed_file" "database/$DATE_DIR/"
    upload_to_s3 "${compressed_file}.sha256" "database/$DATE_DIR/"
    
    echo "$compressed_file"
}

# ==================== REDIS BACKUP ====================
backup_redis() {
    log "Starting Redis backup..."
    
    local backup_file="$BACKUP_DIR/redis/salesflow_redis_${TIMESTAMP}.rdb"
    local compressed_file="${backup_file}.gz"
    
    # Trigger BGSAVE
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    
    # Wait for background save to complete
    local max_wait=60
    local waited=0
    while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)" == "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)" ]; do
        if [ $waited -ge $max_wait ]; then
            log_warning "Redis BGSAVE timeout, continuing..."
            break
        fi
        sleep 1
        ((waited++))
    done
    
    # Copy dump file
    docker cp salesflow_redis_1:/data/dump.rdb "$backup_file" 2>/dev/null || \
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$backup_file"
    
    if [ ! -s "$backup_file" ]; then
        log_warning "Redis backup file is empty or not found"
        return 0
    fi
    
    # Compress
    gzip -9 "$backup_file"
    
    # Calculate checksum
    local checksum=$(sha256sum "$compressed_file" | cut -d' ' -f1)
    echo "$checksum" > "${compressed_file}.sha256"
    
    local size=$(du -h "$compressed_file" | cut -f1)
    
    log_success "Redis backup completed: $compressed_file ($size)"
    
    # Upload to S3
    upload_to_s3 "$compressed_file" "redis/$DATE_DIR/"
    upload_to_s3 "${compressed_file}.sha256" "redis/$DATE_DIR/"
    
    echo "$compressed_file"
}

# ==================== S3 UPLOAD ====================
upload_to_s3() {
    local file="$1"
    local s3_path="$2"
    
    log "Uploading $(basename "$file") to S3..."
    
    aws s3 cp "$file" "s3://${S3_BUCKET}/${s3_path}$(basename "$file")" \
        --region "$S3_REGION" \
        --storage-class STANDARD_IA \
        --sse AES256 \
        --only-show-errors
    
    if [ $? -eq 0 ]; then
        log_success "Uploaded to S3: s3://${S3_BUCKET}/${s3_path}$(basename "$file")"
    else
        log_error "Failed to upload to S3"
        return 1
    fi
}

# ==================== CLEANUP OLD BACKUPS ====================
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type f -name "*.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type f -name "*.sha256" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR/logs" -type f -name "*.log" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # S3 cleanup (handled by S3 lifecycle policy, but manual cleanup as backup)
    local cutoff_date=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)
    
    aws s3 ls "s3://${S3_BUCKET}/database/" --recursive | \
        while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            if [[ "$file_date" < "$cutoff_date" ]]; then
                local file_path=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://${S3_BUCKET}/$file_path" --only-show-errors || true
            fi
        done
    
    log_success "Cleanup completed"
}

# ==================== VERIFY BACKUP ====================
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    local checksum_file="${backup_file}.sha256"
    
    if [ -f "$checksum_file" ]; then
        local stored_checksum=$(cat "$checksum_file")
        local current_checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
        
        if [ "$stored_checksum" == "$current_checksum" ]; then
            log_success "Backup integrity verified"
            return 0
        else
            log_error "Backup integrity check failed!"
            return 1
        fi
    fi
    
    log_warning "No checksum file found, skipping verification"
    return 0
}

# ==================== MAIN ====================
main() {
    log "============================================"
    log "🚀 SalesFlow AI Backup Starting"
    log "============================================"
    log "Timestamp: $TIMESTAMP"
    log "Backup Directory: $BACKUP_DIR"
    log "S3 Bucket: $S3_BUCKET"
    log ""
    
    check_prerequisites
    
    # Database backup
    local db_backup=$(backup_database)
    if [ -n "$db_backup" ]; then
        verify_backup "$db_backup"
    fi
    
    # Redis backup
    local redis_backup=$(backup_redis)
    if [ -n "$redis_backup" ]; then
        verify_backup "$redis_backup"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Calculate total backup size
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    
    log ""
    log "============================================"
    log_success "Backup completed successfully!"
    log "Total local backup size: $total_size"
    log "============================================"
    
    # Send success notification
    notify_slack "✅ SalesFlow backup completed successfully!\n• Database: $(basename "$db_backup" 2>/dev/null || echo 'N/A')\n• Redis: $(basename "$redis_backup" 2>/dev/null || echo 'N/A')\n• Total size: $total_size" "good"
}

# ==================== RESTORE FUNCTIONS ====================

restore_database() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "Usage: $0 restore-db <backup_file.sql.gz>"
        exit 1
    fi
    
    log "Restoring database from: $backup_file"
    
    # Decompress if needed
    local sql_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        sql_file="/tmp/restore_${TIMESTAMP}.sql"
        gunzip -c "$backup_file" > "$sql_file"
    fi
    
    # Verify checksum if available
    if [ -f "${backup_file}.sha256" ]; then
        verify_backup "$backup_file"
    fi
    
    # Restore
    log "Restoring to database..."
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        < "$sql_file"
    
    # Cleanup
    if [[ "$backup_file" == *.gz ]]; then
        rm -f "$sql_file"
    fi
    
    log_success "Database restored successfully!"
}

restore_redis() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "Usage: $0 restore-redis <backup_file.rdb.gz>"
        exit 1
    fi
    
    log "Restoring Redis from: $backup_file"
    
    # Decompress if needed
    local rdb_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        rdb_file="/tmp/restore_${TIMESTAMP}.rdb"
        gunzip -c "$backup_file" > "$rdb_file"
    fi
    
    # Stop Redis, replace dump, restart
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SHUTDOWN NOSAVE || true
    sleep 2
    
    # Copy RDB file
    docker cp "$rdb_file" salesflow_redis_1:/data/dump.rdb 2>/dev/null || \
        cp "$rdb_file" /var/lib/redis/dump.rdb
    
    # Start Redis
    docker-compose -f /opt/salesflow/docker-compose.prod.yml up -d redis || \
        systemctl start redis
    
    # Cleanup
    if [[ "$backup_file" == *.gz ]]; then
        rm -f "$rdb_file"
    fi
    
    log_success "Redis restored successfully!"
}

# ==================== CLI ====================
case "${1:-backup}" in
    backup)
        main
        ;;
    restore-db)
        restore_database "$2"
        ;;
    restore-redis)
        restore_redis "$2"
        ;;
    verify)
        verify_backup "$2"
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {backup|restore-db|restore-redis|verify|cleanup}"
        echo ""
        echo "Commands:"
        echo "  backup        - Run full backup (default)"
        echo "  restore-db    - Restore database from backup file"
        echo "  restore-redis - Restore Redis from backup file"
        echo "  verify        - Verify backup integrity"
        echo "  cleanup       - Clean up old backups"
        exit 1
        ;;
esac
