@echo off
chcp 65001
echo ========================================
echo 水晶ERP项目打包脚本
echo ========================================
echo.

set "PROJECT_NAME=shuijing-erp-source"
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "PACKAGE_NAME=%PROJECT_NAME%_%TIMESTAMP%"

echo 正在创建打包目录...
if exist "%PACKAGE_NAME%" rmdir /s /q "%PACKAGE_NAME%"
mkdir "%PACKAGE_NAME%"

echo.
echo 正在复制源代码文件...

REM 复制前端源代码
echo - 复制前端源代码
xcopy "src" "%PACKAGE_NAME%\src\" /E /I /Q
xcopy "public" "%PACKAGE_NAME%\public\" /E /I /Q

REM 复制后端源代码
echo - 复制后端源代码
xcopy "backend\src" "%PACKAGE_NAME%\backend\src\" /E /I /Q
xcopy "backend\prisma" "%PACKAGE_NAME%\backend\prisma\" /E /I /Q

REM 复制项目文档
echo - 复制项目文档
xcopy ".trae" "%PACKAGE_NAME%\.trae\" /E /I /Q

REM 复制配置文件
echo - 复制配置文件
copy "package.json" "%PACKAGE_NAME%\" >nul
copy "backend\package.json" "%PACKAGE_NAME%\backend\" >nul
copy "tsconfig.json" "%PACKAGE_NAME%\" >nul
copy "tsconfig.app.json" "%PACKAGE_NAME%\" >nul
copy "tsconfig.node.json" "%PACKAGE_NAME%\" >nul
copy "vite.config.ts" "%PACKAGE_NAME%\" >nul
copy "tailwind.config.js" "%PACKAGE_NAME%\" >nul
copy "postcss.config.js" "%PACKAGE_NAME%\" >nul
copy "backend\tsconfig.json" "%PACKAGE_NAME%\backend\" >nul
copy ".gitignore" "%PACKAGE_NAME%\" >nul
copy ".eslintrc.cjs" "%PACKAGE_NAME%\" >nul
copy "backend\jest.config.js" "%PACKAGE_NAME%\backend\" >nul

REM 复制说明文件
echo - 复制说明文件
copy "README.md" "%PACKAGE_NAME%\" >nul
copy "项目分享指南.md" "%PACKAGE_NAME%\" >nul

REM 创建环境变量模板
echo - 创建环境变量模板
echo # 前端环境变量模板 > "%PACKAGE_NAME%\.env.example"
echo # 请复制为.env文件并修改相应配置 >> "%PACKAGE_NAME%\.env.example"
echo VITE_API_BASE_URL=http://localhost:3001/api/v1 >> "%PACKAGE_NAME%\.env.example"
echo VITE_APP_NAME=水晶ERP系统 >> "%PACKAGE_NAME%\.env.example"

echo # 后端环境变量模板 > "%PACKAGE_NAME%\backend\.env.example"
echo # 请复制为.env文件并修改相应配置 >> "%PACKAGE_NAME%\backend\.env.example"
echo DATABASE_URL="mysql://root:your_password@localhost:3306/crystal_erp_dev" >> "%PACKAGE_NAME%\backend\.env.example"
echo PORT=3001 >> "%PACKAGE_NAME%\backend\.env.example"
echo NODE_ENV=development >> "%PACKAGE_NAME%\backend\.env.example"
echo JWT_SECRET=your_jwt_secret_key_here >> "%PACKAGE_NAME%\backend\.env.example"
echo JWT_EXPIRES_IN=7d >> "%PACKAGE_NAME%\backend\.env.example"

REM 创建快速启动脚本
echo - 创建快速启动脚本
echo @echo off > "%PACKAGE_NAME%\启动项目.bat"
echo chcp 65001 >> "%PACKAGE_NAME%\启动项目.bat"
echo echo 正在启动水晶ERP项目... >> "%PACKAGE_NAME%\启动项目.bat"
echo echo. >> "%PACKAGE_NAME%\启动项目.bat"
echo echo 1. 启动后端服务... >> "%PACKAGE_NAME%\启动项目.bat"
echo start "后端服务" cmd /k "cd backend ^&^& npm run dev" >> "%PACKAGE_NAME%\启动项目.bat"
echo timeout /t 3 >> "%PACKAGE_NAME%\启动项目.bat"
echo echo 2. 启动前端服务... >> "%PACKAGE_NAME%\启动项目.bat"
echo start "前端服务" cmd /k "npm run dev" >> "%PACKAGE_NAME%\启动项目.bat"
echo echo. >> "%PACKAGE_NAME%\启动项目.bat"
echo echo 项目启动完成！ >> "%PACKAGE_NAME%\启动项目.bat"
echo echo 前端地址: http://localhost:5173 >> "%PACKAGE_NAME%\启动项目.bat"
echo echo 后端地址: http://localhost:3001 >> "%PACKAGE_NAME%\启动项目.bat"
echo pause >> "%PACKAGE_NAME%\启动项目.bat"

echo.
echo 正在压缩文件...
if exist "%PACKAGE_NAME%.zip" del "%PACKAGE_NAME%.zip"
powershell -command "Compress-Archive -Path '%PACKAGE_NAME%' -DestinationPath '%PACKAGE_NAME%.zip'"

echo.
echo 清理临时文件...
rmdir /s /q "%PACKAGE_NAME%"

echo.
echo ========================================
echo 打包完成！
echo 文件名: %PACKAGE_NAME%.zip
echo 文件大小:
for %%A in ("%PACKAGE_NAME%.zip") do echo %%~zA 字节
echo.
echo 请将此压缩包发送给接收方，
echo 并提醒他们查看"项目分享指南.md"文件
echo ========================================
echo.
pause