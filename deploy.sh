#!/bin/bash

# 水晶ERP系统自动化部署脚本
# 适用于阿里云服务器生产环境

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_DIR="/www/wwwroot/shuijing-erp"
API_DIR="$PROJECT_DIR/api"
LOG_DIR="$PROJECT_DIR/logs"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        exit 1
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
    log_success "目录创建完成"
}

# 备份当前配置
backup_config() {
    log_info "备份当前配置..."
    if [ -f "$API_DIR/.env" ]; then
        cp "$API_DIR/.env" "$BACKUP_DIR/.env_$DATE"
        log_success "配置文件已备份到 $BACKUP_DIR/.env_$DATE"
    fi
}

# Git同步代码
sync_code() {
    log_info "同步代码..."
    cd "$PROJECT_DIR"
    
    # 检查Git状态
    if [ -d ".git" ]; then
        # 暂存本地修改
        git stash push -m "Auto stash before deploy $DATE"
        
        # 拉取最新代码
        git fetch origin
        git reset --hard origin/main
        
        log_success "代码同步完成"
    else
        log_error "Git仓库不存在，请先初始化Git"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装前端依赖..."
    cd "$PROJECT_DIR"
    npm install --production
    
    log_info "安装后端依赖..."
    cd "$API_DIR"
    npm install --production
    
    log_success "依赖安装完成"
}

# 构建前端
build_frontend() {
    log_info "构建前端应用..."
    cd "$PROJECT_DIR"
    npm run build
    log_success "前端构建完成"
}

# 数据库连接测试
test_database() {
    log_info "测试数据库连接..."
    cd "$API_DIR"
    if node test-db-connection.js; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接失败，请检查配置"
        exit 1
    fi
}

# PM2服务管理
manage_pm2() {
    log_info "管理PM2服务..."
    cd "$PROJECT_DIR"
    
    # 检查PM2是否已安装
    if ! command -v pm2 &> /dev/null; then
        log_info "安装PM2..."
        npm install -g pm2
    fi
    
    # 重启服务
    if pm2 list | grep -q "shuijing-erp-api"; then
        log_info "重启现有服务..."
        pm2 reload ecosystem.config.js --env production
    else
        log_info "启动新服务..."
        pm2 start ecosystem.config.js --env production
    fi
    
    # 保存PM2配置
    pm2 save
    pm2 startup
    
    log_success "PM2服务管理完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查API健康状态
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "API服务健康检查通过"
    else
        log_warning "API健康检查失败，请检查服务状态"
    fi
    
    # 显示PM2状态
    pm2 status
}

# 清理旧备份
cleanup_backups() {
    log_info "清理旧备份文件..."
    find "$BACKUP_DIR" -name "*.env_*" -mtime +7 -delete
    log_success "旧备份清理完成"
}

# 主函数
main() {
    log_info "开始部署水晶ERP系统..."
    
    check_root
    create_directories
    backup_config
    sync_code
    install_dependencies
    build_frontend
    test_database
    manage_pm2
    health_check
    cleanup_backups
    
    log_success "部署完成！"
    log_info "访问地址: http://your-domain.com"
    log_info "API地址: http://your-domain.com/api"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"' ERR

# 执行主函数
main "$@"