#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证回滚状态脚本
检查当前的构建错误数量
"""

import subprocess
import os
import json
from datetime import datetime

def run_command(cmd):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=os.getcwd())
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def check_typescript_errors():
    """检查TypeScript错误"""
    print("🔍 检查TypeScript编译错误...")
    returncode, stdout, stderr = run_command("npx tsc --noEmit")
    
    if returncode == 0:
        print("✅ TypeScript编译无错误")
        return 0, []
    else:
        errors = stderr.split('\n') if stderr else stdout.split('\n')
        error_lines = [line for line in errors if 'error TS' in line]
        print(f"❌ TypeScript编译错误: {len(error_lines)}个")
        return len(error_lines), error_lines

def check_vite_build():
    """检查Vite构建错误"""
    print("🔍 检查Vite构建错误...")
    returncode, stdout, stderr = run_command("npx vite build")
    
    if returncode == 0:
        print("✅ Vite构建成功")
        return 0, []
    else:
        output = stdout + stderr
        error_lines = [line for line in output.split('\n') if 'error' in line.lower()]
        print(f"❌ Vite构建错误: {len(error_lines)}个")
        return len(error_lines), error_lines

def check_npm_build():
    """检查npm run build错误"""
    print("🔍 检查npm run build错误...")
    returncode, stdout, stderr = run_command("npm run build")
    
    if returncode == 0:
        print("✅ npm run build成功")
        return 0, []
    else:
        output = stdout + stderr
        # 查找 "Found X errors" 模式
        import re
        found_pattern = re.search(r'Found (\d+) error', output)
        if found_pattern:
            error_count = int(found_pattern.group(1))
            print(f"❌ npm run build错误: {error_count}个")
            return error_count, output.split('\n')
        else:
            error_lines = [line for line in output.split('\n') if 'error' in line.lower()]
            print(f"❌ npm run build错误: {len(error_lines)}个")
            return len(error_lines), error_lines

def check_src_structure():
    """检查src目录结构"""
    print("🔍 检查src目录结构...")
    
    required_files = [
        'src/index.css',
        'src/main.tsx',
        'src/App.tsx'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ 缺少文件: {missing_files}")
    else:
        print("✅ 关键文件都存在")
    
    return missing_files

def main():
    print("🔄 开始验证回滚状态...")
    print(f"📅 检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📁 当前目录: {os.getcwd()}")
    
    # 检查目录结构
    missing_files = check_src_structure()
    
    # 检查各种构建错误
    ts_errors, ts_error_list = check_typescript_errors()
    vite_errors, vite_error_list = check_vite_build()
    npm_errors, npm_error_list = check_npm_build()
    
    # 生成报告
    report = {
        'timestamp': datetime.now().isoformat(),
        'directory': os.getcwd(),
        'missing_files': missing_files,
        'typescript_errors': ts_errors,
        'vite_errors': vite_errors,
        'npm_build_errors': npm_errors,
        'error_details': {
            'typescript': ts_error_list[:10] if ts_error_list else [],  # 只保存前10个错误
            'vite': vite_error_list[:10] if vite_error_list else [],
            'npm_build': npm_error_list[:10] if npm_error_list else []
        }
    }
    
    # 保存报告
    with open('rollback_verification_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("\n📊 验证结果汇总:")
    print(f"   TypeScript错误: {ts_errors}个")
    print(f"   Vite构建错误: {vite_errors}个")
    print(f"   npm build错误: {npm_errors}个")
    print(f"   缺少文件: {len(missing_files)}个")
    
    if ts_errors == 0 and vite_errors == 0 and npm_errors == 0 and len(missing_files) == 0:
        print("\n🎉 回滚成功！项目状态正常")
    elif npm_errors <= 55:
        print(f"\n✅ 回滚基本成功！错误数量在可接受范围内({npm_errors}个)")
    else:
        print(f"\n❌ 回滚可能失败，错误数量过多({npm_errors}个)")
    
    print(f"\n📄 详细报告已保存到: rollback_verification_report.json")
    
    return npm_errors

if __name__ == '__main__':
    error_count = main()
    exit(0 if error_count <= 55 else 1)