@echo off
chcp 65001
echo ========================================
echo 水晶ERP项目安装向导
echo ========================================
echo.

echo 欢迎使用水晶ERP项目！
echo 本脚本将帮助您快速设置开发环境。
echo.

REM 检查Node.js
echo 正在检查Node.js安装...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到Node.js，请先安装Node.js 22.17.1或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js已安装
    node --version
)

REM 检查npm
echo 正在检查npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm未正确安装
    pause
    exit /b 1
) else (
    echo ✅ npm已安装
    npm --version
)

REM 检查MySQL
echo 正在检查MySQL...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未检测到MySQL命令行工具
    echo 请确保MySQL已安装并添加到PATH环境变量
    echo 如果已安装，可以忽略此警告
) else (
    echo ✅ MySQL已安装
    mysql --version
)

echo.
echo ========================================
echo 开始安装项目依赖
echo ========================================
echo.

REM 检查环境变量文件
echo 正在检查环境变量配置...
if not exist ".env" (
    if exist ".env.example" (
        echo 正在创建前端环境变量文件...
        copy ".env.example" ".env"
        echo ✅ 已创建.env文件，请根据需要修改配置
    ) else (
        echo 正在创建默认前端环境变量文件...
        echo VITE_API_BASE_URL=http://localhost:3001/api/v1 > .env
        echo VITE_APP_NAME=水晶ERP系统 >> .env
        echo ✅ 已创建默认.env文件
    )
)

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo 正在创建后端环境变量文件...
        copy "backend\.env.example" "backend\.env"
        echo ⚠️  请修改backend\.env文件中的数据库配置
    ) else (
        echo 正在创建默认后端环境变量文件...
        echo DATABASE_URL="mysql://root:your_password@localhost:3306/crystal_erp_dev" > backend\.env
        echo PORT=3001 >> backend\.env
        echo NODE_ENV=development >> backend\.env
        echo JWT_SECRET=crystal_erp_jwt_secret_key_2024 >> backend\.env
        echo JWT_EXPIRES_IN=7d >> backend\.env
        echo UPLOAD_PATH=./uploads >> backend\.env
        echo MAX_FILE_SIZE=5242880 >> backend\.env
        echo CORS_ORIGIN=* >> backend\.env
        echo LOG_LEVEL=info >> backend\.env
        echo ⚠️  请修改backend\.env文件中的数据库密码
    )
)

echo.
echo 正在安装前端依赖...
npm install
if %errorlevel% neq 0 (
    echo ❌ 前端依赖安装失败
    echo 请检查网络连接或尝试使用淘宝镜像:
    echo npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)
echo ✅ 前端依赖安装完成

echo.
echo 正在安装后端依赖...
cd backend
npm install
if %errorlevel% neq 0 (
    echo ❌ 后端依赖安装失败
    cd ..
    pause
    exit /b 1
)
echo ✅ 后端依赖安装完成

echo.
echo 正在生成Prisma客户端...
npm run db:generate
if %errorlevel% neq 0 (
    echo ❌ Prisma客户端生成失败
    echo 请检查backend\.env文件中的数据库配置
    cd ..
    pause
    exit /b 1
)
echo ✅ Prisma客户端生成完成

cd ..

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 🎉 项目依赖安装成功！
echo.
echo 📋 接下来的步骤：
echo 1. 确保MySQL服务已启动
echo 2. 修改backend\.env文件中的数据库配置
echo 3. 创建数据库: CREATE DATABASE crystal_erp_dev;
echo 4. 运行数据库迁移: cd backend ^&^& npm run db:push
echo 5. 运行数据库种子: npm run db:seed
echo 6. 启动项目: 运行"启动项目.bat"脚本
echo.
echo 📖 详细说明请查看"项目分享指南.md"文件
echo.
echo 🌐 启动后访问地址：
echo    前端: http://localhost:5173
echo    后端: http://localhost:3001
echo.
echo 👤 测试账号：
echo    管理员 - 用户名: boss, 密码: 123456
echo    员工   - 用户名: employee, 密码: 123456
echo.
pause