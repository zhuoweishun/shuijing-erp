#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
紧急修复脚本 - 只修复最关键和最安全的语法错误
避免引入新问题
"""

import os
import re
import glob
from typing import List, Tuple

class EmergencyFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_files = []
        self.total_fixes = 0
        
    def apply_critical_fixes_only(self, content: str) -> Tuple[str, int]:
        """只应用最关键和最安全的修复"""
        total_fixes = 0
        original_content = content
        
        # 1. 只修复明确的函数名错误（100%安全）
        critical_function_fixes = [
            (r'\bsetmessages\b', 'set_messages'),
            (r'\bsetinput_message\b', 'set_input_message'), 
            (r'\bsetis_loading\b', 'set_is_loading'),
            (r'\bsetError\b', 'set_error'),
            (r'\bsetstats\b', 'set_stats'),
            (r'\bsetuser\b', 'set_user'),
            (r'\bsettoken\b', 'set_token'),
        ]
        
        for pattern, replacement in critical_function_fixes:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                total_fixes += 1
        
        # 2. 修复明确的API方法名错误（100%安全）
        if '.to_locale_date_string' in content:
            content = content.replace('.to_locale_date_string', '.toLocaleDateString')
            total_fixes += 1
        
        # 3. 修复明确的变量名错误（100%安全）
        if 'isActive' in content and 'is_active' not in content:
            content = re.sub(r'\bisActive\b', 'is_active', content)
            total_fixes += 1
        
        # 4. 修复明确的JSX自闭合标签错误（安全）
        # <Navigate to="/" replace />) -> <Navigate to="/" replace />}
        if re.search(r'<Navigate[^>]*/>\)', content):
            content = re.sub(r'(<Navigate[^>]*/>)\)', r'\1}', content)
            total_fixes += 1
        
        # 5. 修复明确的render函数调用错误（安全）
        if '.render()\n  <' in content:
            content = re.sub(r'\.render\(\)\n(\s*)(<)', r'.render(\n\1\2', content)
            total_fixes += 1
        
        # 6. 修复明确的localStorage调用错误（安全）
        # localStorage.getItem('key' } -> localStorage.getItem('key')
        if re.search(r"localStorage\.getItem\('[^']+' \}", content):
            content = re.sub(r"(localStorage\.getItem\('[^']+') \}", r'\1)', content)
            total_fixes += 1
        
        # 7. 修复明确的console.log对象错误（安全）
        # console.log('text', { prop: value); -> console.log('text', { prop: value });
        if re.search(r'console\.log\([^)]*\{[^}]*\);', content):
            content = re.sub(r'(console\.log\([^)]*\{[^}]*)\);', r'\1 });', content)
            total_fixes += 1
        
        # 只有在内容真正改变时才返回修复数量
        if content != original_content:
            return content, total_fixes
        else:
            return content, 0
    
    def fix_file_safely(self, file_path: str) -> bool:
        """安全地修复单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            content, total_file_fixes = self.apply_critical_fixes_only(original_content)
            
            # 只有在有实际修复且内容确实改变时才写回文件
            if total_file_fixes > 0 and content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.fixed_files.append(file_path)
                self.total_fixes += total_file_fixes
                print(f"✅ 安全修复 {file_path}: {total_file_fixes} 个问题")
                return True
                
        except Exception as e:
            print(f"❌ 修复 {file_path} 时出错: {e}")
            return False
            
        return False
    
    def fix_all_files(self) -> None:
        """修复所有相关文件"""
        # 定义要修复的文件模式
        patterns = [
            'src/**/*.tsx',
            'src/**/*.ts',
            'src/**/*.jsx', 
            'src/**/*.js'
        ]
        
        files_to_fix = []
        for pattern in patterns:
            files_to_fix.extend(glob.glob(
                os.path.join(self.project_root, pattern), 
                recursive=True
            ))
        
        print(f"🔍 找到 {len(files_to_fix)} 个文件需要紧急修复")
        print("🚨 开始紧急安全修复...")
        
        for file_path in files_to_fix:
            self.fix_file_safely(file_path)
        
        print(f"\n📊 紧急修复完成统计:")
        print(f"   - 修复文件数: {len(self.fixed_files)}")
        print(f"   - 总修复问题数: {self.total_fixes}")
        
        if self.fixed_files:
            print(f"\n📝 修复的文件列表:")
            for file_path in self.fixed_files[:5]:  # 只显示前5个
                print(f"   - {file_path}")
            if len(self.fixed_files) > 5:
                print(f"   ... 还有 {len(self.fixed_files) - 5} 个文件")

def main():
    project_root = os.getcwd()
    print(f"🚨 开始紧急语法修复")
    print(f"📁 项目根目录: {project_root}")
    print(f"⚠️  只修复最关键和最安全的问题")
    
    fixer = EmergencyFixer(project_root)
    fixer.fix_all_files()
    
    print(f"\n✨ 紧急修复完成！")
    print(f"💡 建议立即运行 'npm run build' 验证修复效果")

if __name__ == '__main__':
    main()