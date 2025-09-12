#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
React组件return语法修复脚本
修复所有 return( 为 return (
"""

import os
import re
import json
from datetime import datetime

def fix_return_syntax():
    """修复所有React组件文件中的return语法错误"""
    
    print("🔧 开始修复React组件return语法错误...")
    
    # 项目根目录
    project_root = os.getcwd()
    src_dir = os.path.join(project_root, 'src')
    
    if not os.path.exists(src_dir):
        print("❌ 未找到src目录")
        return
    
    # 统计信息
    fixed_files = []
    total_fixes = 0
    
    # 遍历所有tsx/jsx文件
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.jsx', '.ts')):
                file_path = os.path.join(root, file)
                
                try:
                    # 读取文件内容
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    file_fixes = 0
                    
                    # 修复 return( 为 return (
                    # 使用正则表达式匹配 return( 但不匹配 return() 或函数调用
                    pattern = r'\breturn\((?!\s*\))'
                    matches = re.findall(pattern, content)
                    if matches:
                        content = re.sub(pattern, 'return (', content)
                        file_fixes += len(matches)
                    
                    # 如果有修改，写回文件
                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        fixed_files.append({
                            'file': os.path.relpath(file_path, project_root),
                            'fixes': file_fixes
                        })
                        total_fixes += file_fixes
                        print(f"✅ 修复 {os.path.relpath(file_path, project_root)}: {file_fixes}处")
                
                except Exception as e:
                    print(f"❌ 处理文件 {file_path} 时出错: {e}")
    
    # 生成修复报告
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_fixes': total_fixes,
        'fixed_files_count': len(fixed_files),
        'fixed_files': fixed_files,
        'summary': f"成功修复 {len(fixed_files)} 个文件中的 {total_fixes} 处return语法错误"
    }
    
    # 保存报告
    report_path = os.path.join(project_root, 'return_syntax_fix_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n📊 修复完成!")
    print(f"   - 修复文件数: {len(fixed_files)}")
    print(f"   - 修复总数: {total_fixes}")
    print(f"   - 报告文件: {report_path}")
    
    if total_fixes > 0:
        print("\n🎉 所有return语法错误已修复!")
    else:
        print("\n✨ 未发现需要修复的return语法错误")

if __name__ == '__main__':
    fix_return_syntax()