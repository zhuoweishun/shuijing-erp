#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Login页面字段批量替换脚本
专门用于将login相关的驼峰命名字段转换为蛇形命名
"""

import os
import re
import shutil
from datetime import datetime

# 字段映射关系（login页面相关）
FIELD_MAPPINGS = {
    'setUser': 'set_user',
    'setToken': 'set_token',
    'LoginRequest': 'login_request',
    'LoginResponse': 'login_response',
    'AuthContextType': 'auth_context_type',
    'AuthProviderProps': 'auth_provider_props',
    'authHeader': 'auth_header',
    'JWT_SECRET': 'jwt_secret',
    'generateToken': 'generate_token',
    'verifyToken': 'verify_token',
    'authenticateToken': 'authenticate_token',
    'requireRole': 'require_role'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}

def is_supported_file(file_path):
    """检查文件是否为支持的类型"""
    _, ext = os.path.splitext(file_path)
    return ext.lower() in SUPPORTED_EXTENSIONS

def backup_file(file_path):
    """备份文件"""
    backup_path = f"{file_path}_backup"
    try:
        shutil.copy2(file_path, backup_path)
        return True
    except Exception as e:
        print(f"❌ 备份文件失败: {file_path} - {e}")
        return False

def replace_fields_in_content(content, file_path):
    """在文件内容中替换字段"""
    replacements_made = 0
    original_content = content
    
    for old_field, new_field in FIELD_MAPPINGS.items():
        # 使用正则表达式进行精确匹配
        # 匹配单词边界，避免误替换
        pattern = r'\b' + re.escape(old_field) + r'\b'
        
        # 计算替换次数
        matches = re.findall(pattern, content)
        if matches:
            content = re.sub(pattern, new_field, content)
            count = len(matches)
            replacements_made += count
            print(f"  ✅ {old_field} → {new_field} ({count}处)")
    
    return content, replacements_made

def process_file(file_path):
    """处理单个文件"""
    try:
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 替换字段
        new_content, replacements_made = replace_fields_in_content(content, file_path)
        
        # 如果有替换，则备份并写入新内容
        if replacements_made > 0:
            if backup_file(file_path):
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"📝 已处理: {file_path} (替换{replacements_made}处)")
                return replacements_made
            else:
                print(f"⚠️ 跳过文件（备份失败）: {file_path}")
                return 0
        
        return 0
        
    except Exception as e:
        print(f"❌ 处理文件失败: {file_path} - {e}")
        return 0

def process_directory(directory_path):
    """处理目录中的所有文件"""
    total_replacements = 0
    processed_files = 0
    
    print(f"🔍 扫描目录: {directory_path}")
    
    for root, dirs, files in os.walk(directory_path):
        # 跳过备份文件和特定目录
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'dist', 'build']]
        
        for file in files:
            file_path = os.path.join(root, file)
            
            # 跳过备份文件
            if file.endswith('_backup') or file.endswith('.backup'):
                continue
                
            if is_supported_file(file_path):
                replacements = process_file(file_path)
                if replacements > 0:
                    total_replacements += replacements
                    processed_files += 1
    
    return total_replacements, processed_files

def main():
    """主函数"""
    print("🚀 Login页面字段批量替换脚本")
    print("=" * 50)
    print(f"📋 将要替换的字段映射:")
    for old_field, new_field in FIELD_MAPPINGS.items():
        print(f"  {old_field} → {new_field}")
    print("=" * 50)
    
    # 获取目标目录
    target_directory = input("请输入目标目录路径（回车使用当前目录）: ").strip()
    if not target_directory:
        target_directory = os.getcwd()
    
    if not os.path.exists(target_directory):
        print(f"❌ 目录不存在: {target_directory}")
        return
    
    print(f"📂 目标目录: {target_directory}")
    print(f"📄 支持的文件类型: {', '.join(SUPPORTED_EXTENSIONS)}")
    
    # 确认操作
    confirm = input("\n确认开始替换？(y/N): ").strip().lower()
    if confirm != 'y':
        print("❌ 操作已取消")
        return
    
    # 记录开始时间
    start_time = datetime.now()
    print(f"\n⏰ 开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("🔄 开始处理...\n")
    
    # 处理目录
    total_replacements, processed_files = process_directory(target_directory)
    
    # 记录结束时间
    end_time = datetime.now()
    duration = end_time - start_time
    
    print("\n" + "=" * 50)
    print("✅ 替换完成！")
    print(f"📊 统计结果:")
    print(f"  - 共替换: {total_replacements} 处字段")
    print(f"  - 涉及文件: {processed_files} 个")
    print(f"  - 耗时: {duration.total_seconds():.2f} 秒")
    print(f"⏰ 完成时间: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n💡 提示: 所有修改的文件都已自动备份（文件名_backup）")

if __name__ == "__main__":
    main()