#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精确修复TypeScript类型文件中的字段命名问题
只修复接口定义和对象字面量中的字段名，不修复方法调用
"""

import os
import re
import json
from datetime import datetime

def create_backup():
    """创建备份目录"""
    backup_dir = "backups/typescript_field_fix_precise"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    return backup_dir

def backup_file(file_path, backup_dir):
    """备份单个文件"""
    import shutil
    filename = os.path.basename(file_path)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"{timestamp}_{filename}")
    shutil.copy2(file_path, backup_path)
    print(f"✅ 已备份: {file_path} -> {backup_path}")
    return backup_path

def fix_typescript_field_naming(content):
    """精确修复TypeScript字段命名问题"""
    fixes = []
    
    # 1. 修复接口定义中的字段名 (interface 内部的字段定义)
    # 匹配模式：在接口内部的 item.category?: type 或 item.category: type
    pattern1 = r'(\s+)item\.category(\??):\s*'
    matches1 = re.findall(pattern1, content)
    if matches1:
        content = re.sub(pattern1, r'\1item_category\2: ', content)
        fixes.append("接口定义: item.category -> item_category")
    
    # 2. 修复对象字面量中的字段名
    # 匹配模式：在对象字面量中的 item.category: value
    pattern2 = r'(\s+)item\.category:\s*'
    matches2 = re.findall(pattern2, content)
    if matches2:
        content = re.sub(pattern2, r'\1item_category: ', content)
        fixes.append("对象字面量: item.category -> item_category")
    
    # 3. 修复函数参数中的字段名
    # 匹配模式：在函数参数对象中的 item.category: type
    pattern3 = r'(data:\s*{[^}]*?)item\.category(\??):\s*'
    def replace_in_data_object(match):
        return match.group(1) + 'item_category' + match.group(2) + ': '
    
    if re.search(pattern3, content, re.DOTALL):
        content = re.sub(pattern3, replace_in_data_object, content, flags=re.DOTALL)
        fixes.append("函数参数: item.category -> item_category")
    
    # 4. 修复类型定义中的其他点号字段（但要排除已知的JavaScript API）
    # 排除列表：window.location, document.body, response.data 等
    excluded_patterns = [
        r'window\.location',
        r'document\.body',
        r'response\.data',
        r'error\.response',
        r'config\.body',
        r'location\.hostname',
        r'data\.length',
        r'record\.item',
        r'params\.item'
    ]
    
    # 查找其他可能的字段定义问题
    # 但要更加谨慎，只在明确的接口定义上下文中进行替换
    
    return content, fixes

def process_file(file_path, backup_dir):
    """处理单个文件"""
    print(f"\n🔧 处理文件: {file_path}")
    
    # 备份原文件
    backup_path = backup_file(file_path, backup_dir)
    
    # 读取文件内容
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        return False
    
    # 修复字段命名
    fixed_content, fixes = fix_typescript_field_naming(original_content)
    
    if fixes:
        # 写入修复后的内容
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"✅ 修复完成，共修复 {len(fixes)} 个问题:")
            for fix in fixes:
                print(f"   - {fix}")
            return True
        except Exception as e:
            print(f"❌ 写入文件失败: {e}")
            # 恢复备份
            import shutil
            shutil.copy2(backup_path, file_path)
            return False
    else:
        print("ℹ️ 未发现需要修复的问题")
        return True

def main():
    """主函数"""
    print("🚀 开始精确修复TypeScript字段命名问题...")
    
    # 创建备份目录
    backup_dir = create_backup()
    
    # 需要处理的文件列表
    files_to_process = [
        "src/services/api.ts",
        "src/components/FinancialRecordModal.tsx",
        "src/components/FinancialReports.tsx"
    ]
    
    success_count = 0
    total_count = 0
    
    for file_path in files_to_process:
        if os.path.exists(file_path):
            total_count += 1
            if process_file(file_path, backup_dir):
                success_count += 1
        else:
            print(f"⚠️ 文件不存在: {file_path}")
    
    print(f"\n📊 修复完成统计:")
    print(f"   - 总文件数: {total_count}")
    print(f"   - 成功修复: {success_count}")
    print(f"   - 失败数量: {total_count - success_count}")
    print(f"   - 备份目录: {backup_dir}")
    
    if success_count == total_count:
        print("\n🎉 所有文件修复成功！")
        return True
    else:
        print("\n⚠️ 部分文件修复失败，请检查错误信息")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)