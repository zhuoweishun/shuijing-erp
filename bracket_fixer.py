#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专门修复括号不匹配问题的脚本
针对 Expected ")" but found "}" 类型的错误
"""

import os
import re
import glob
from typing import List, Tuple

class BracketFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_files = []
        self.total_fixes = 0
        
    def fix_bracket_issues(self, content: str) -> Tuple[str, int]:
        """修复括号不匹配问题"""
        total_fixes = 0
        
        # 1. 修复函数调用中缺少右括号的问题
        # localStorage.getItem('auth_user' } -> localStorage.getItem('auth_user')
        pattern = r"(\w+\.\w+\('[^']+')\s*\}"
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match) + r'\s*\}'
            new_replacement = match + ')'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 2. 修复函数调用中缺少右括号的问题（双引号版本）
        # localStorage.getItem("auth_user" } -> localStorage.getItem("auth_user")
        pattern = r'(\w+\.\w+\("[^"]+")\s*\}'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match) + r'\s*\}'
            new_replacement = match + ')'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 3. 修复一般函数调用中的括号问题
        # function('param' } -> function('param')
        pattern = r"(\w+\('[^']+')\s*\}"
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match) + r'\s*\}'
            new_replacement = match + ')'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 4. 修复数组访问中的括号问题
        # array[index } -> array[index]
        pattern = r'(\w+\[[^\]]+)\s*\}'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match) + r'\s*\}'
            new_replacement = match + ']'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 5. 修复对象属性访问中的括号问题
        # object.property } -> object.property
        pattern = r'(\w+\.\w+)\s*\}(?!\s*[,;)])'  # 确保不是对象字面量的结束
        matches = re.findall(pattern, content)
        for match in matches:
            # 检查这不是对象字面量的一部分
            if not re.search(r'\{[^}]*' + re.escape(match) + r'\s*\}', content):
                old_pattern = re.escape(match) + r'\s*\}'
                new_replacement = match
                content = re.sub(old_pattern, new_replacement, content)
                total_fixes += 1
        
        # 6. 修复条件表达式中的括号问题
        # (condition } -> (condition)
        pattern = r'(\([^)]+)\s*\}'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match) + r'\s*\}'
            new_replacement = match + ')'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 7. 修复JSX属性中的括号问题
        # value={expression } -> value={expression}
        pattern = r'(\w+=\{[^}]+)\s*\}\s*\}'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match) + r'\s*\}\s*\}'
            new_replacement = match + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 8. 修复模板字符串中的括号问题
        # `template${expression }` -> `template${expression}`
        pattern = r'(\$\{[^}]+)\s*\}\s*\}'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match) + r'\s*\}\s*\}'
            new_replacement = match + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 9. 修复分号位置错误
        # statement; } -> statement }
        pattern = r';\s*\}'
        if re.search(pattern, content):
            content = re.sub(pattern, ' }', content)
            total_fixes += 1
        
        # 10. 修复多余的分号
        # }; -> }
        pattern = r'\};(?!\s*[\n\r]\s*[)}\]])'  # 确保不是语句结束
        if re.search(pattern, content):
            content = re.sub(pattern, '}', content)
            total_fixes += 1
        
        return content, total_fixes
    
    def fix_file(self, file_path: str) -> bool:
        """修复单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            content, total_file_fixes = self.fix_bracket_issues(original_content)
            
            # 如果有修复，写回文件
            if total_file_fixes > 0 and content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.fixed_files.append(file_path)
                self.total_fixes += total_file_fixes
                print(f"✅ 修复 {file_path}: {total_file_fixes} 个括号问题")
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
        
        print(f"🔍 找到 {len(files_to_fix)} 个文件需要检查括号问题")
        print("🔧 开始修复括号不匹配问题...")
        
        for file_path in files_to_fix:
            self.fix_file(file_path)
        
        print(f"\n📊 括号修复完成统计:")
        print(f"   - 修复文件数: {len(self.fixed_files)}")
        print(f"   - 总修复问题数: {self.total_fixes}")
        
        if self.fixed_files:
            print(f"\n📝 修复的文件列表:")
            for file_path in self.fixed_files:
                print(f"   - {file_path}")

def main():
    project_root = os.getcwd()
    print(f"🚀 开始批量修复括号不匹配问题")
    print(f"📁 项目根目录: {project_root}")
    
    fixer = BracketFixer(project_root)
    fixer.fix_all_files()
    
    print(f"\n✨ 括号修复完成！")
    print(f"💡 建议运行 'npm run build' 验证修复效果")

if __name__ == '__main__':
    main()