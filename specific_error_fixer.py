#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专门修复具体错误的脚本
针对 Expected "}" but found ")" 类型的错误
"""

import os
import re
from typing import Tuple

class SpecificErrorFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_files = []
        self.total_fixes = 0
        
    def fix_layout_tsx_line_92(self, content: str) -> Tuple[str, int]:
        """修复Layout.tsx第92行的错误"""
        fixes = 0
        lines = content.split('\n')
        
        if len(lines) >= 92:
            line_92 = lines[91]  # 第92行（0索引）
            
            # 查找可能的问题模式
            # 1. 函数参数中的括号问题
            if re.search(r'\([^)]*\)\)', line_92):
                lines[91] = re.sub(r'(\([^)]*\))\)', r'\1}', line_92)
                fixes += 1
            
            # 2. JSX属性中的括号问题
            elif re.search(r'\{[^}]*\)\}', line_92):
                lines[91] = re.sub(r'(\{[^}]*)\)(\})', r'\1}\2', line_92)
                fixes += 1
            
            # 3. 对象字面量中的括号问题
            elif re.search(r'\{[^}]*\)', line_92) and not re.search(r'\{[^}]*\}', line_92):
                lines[91] = re.sub(r'(\{[^}]*)\)', r'\1}', line_92)
                fixes += 1
        
        if fixes > 0:
            return '\n'.join(lines), fixes
        return content, 0
    
    def fix_useauth_tsx_line_19(self, content: str) -> Tuple[str, int]:
        """修复useAuth.tsx第19行的错误"""
        fixes = 0
        lines = content.split('\n')
        
        if len(lines) >= 19:
            line_19 = lines[18]  # 第19行（0索引）
            
            # 查找可能的问题模式
            # 1. 函数参数中的括号问题
            if re.search(r'\([^)]*\)\)', line_19):
                lines[18] = re.sub(r'(\([^)]*\))\)', r'\1}', line_19)
                fixes += 1
            
            # 2. JSX属性中的括号问题
            elif re.search(r'\{[^}]*\)\}', line_19):
                lines[18] = re.sub(r'(\{[^}]*)\)(\})', r'\1}\2', line_19)
                fixes += 1
            
            # 3. 对象字面量中的括号问题
            elif re.search(r'\{[^}]*\)', line_19) and not re.search(r'\{[^}]*\}', line_19):
                lines[18] = re.sub(r'(\{[^}]*)\)', r'\1}', line_19)
                fixes += 1
            
            # 4. 函数声明中的括号问题
            elif re.search(r'function.*\([^)]*\)\)', line_19):
                lines[18] = re.sub(r'(function.*\([^)]*\))\)', r'\1}', line_19)
                fixes += 1
        
        if fixes > 0:
            return '\n'.join(lines), fixes
        return content, 0
    
    def fix_general_bracket_issues(self, content: str) -> Tuple[str, int]:
        """修复一般的括号问题"""
        fixes = 0
        
        # 1. 修复函数参数中多余的右括号
        # function(param)) -> function(param)}
        if re.search(r'\w+\([^)]*\)\)', content):
            content = re.sub(r'(\w+\([^)]*\))\)', r'\1}', content)
            fixes += 1
        
        # 2. 修复JSX属性中的括号问题
        # {expression)) -> {expression}}
        if re.search(r'\{[^}]*\)\)', content):
            content = re.sub(r'(\{[^}]*)\)\)', r'\1}}', content)
            fixes += 1
        
        # 3. 修复对象字面量中的括号问题
        # { prop: value) -> { prop: value }
        if re.search(r'\{[^}]*\)(?!\s*[,;])', content):
            content = re.sub(r'(\{[^}]*)\)(?!\s*[,;])', r'\1}', content)
            fixes += 1
        
        # 4. 修复数组中的括号问题
        # [item)) -> [item]}
        if re.search(r'\[[^\]]*\)\)', content):
            content = re.sub(r'(\[[^\]]*)\)\)', r'\1]}', content)
            fixes += 1
        
        return content, fixes
    
    def fix_file(self, file_path: str) -> bool:
        """修复单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            content = original_content
            total_file_fixes = 0
            
            # 针对特定文件的修复
            if 'Layout.tsx' in file_path:
                content, fixes = self.fix_layout_tsx_line_92(content)
                total_file_fixes += fixes
            
            if 'useAuth.tsx' in file_path:
                content, fixes = self.fix_useauth_tsx_line_19(content)
                total_file_fixes += fixes
            
            # 通用括号问题修复
            content, fixes = self.fix_general_bracket_issues(content)
            total_file_fixes += fixes
            
            # 如果有修复，写回文件
            if total_file_fixes > 0 and content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.fixed_files.append(file_path)
                self.total_fixes += total_file_fixes
                print(f"✅ 修复 {os.path.basename(file_path)}: {total_file_fixes} 个括号问题")
                return True
                
        except Exception as e:
            print(f"❌ 修复 {file_path} 时出错: {e}")
            return False
            
        return False
    
    def fix_specific_files(self) -> None:
        """修复特定的问题文件"""
        target_files = [
            os.path.join(self.project_root, 'src', 'components', 'Layout.tsx'),
            os.path.join(self.project_root, 'src', 'hooks', 'useAuth.tsx')
        ]
        
        print(f"🎯 针对性修复特定错误文件")
        
        for file_path in target_files:
            if os.path.exists(file_path):
                self.fix_file(file_path)
            else:
                print(f"⚠️  文件不存在: {file_path}")
        
        print(f"\n📊 特定错误修复完成统计:")
        print(f"   - 修复文件数: {len(self.fixed_files)}")
        print(f"   - 总修复问题数: {self.total_fixes}")
        
        if self.fixed_files:
            print(f"\n📝 修复的文件列表:")
            for file_path in self.fixed_files:
                print(f"   - {file_path}")

def main():
    project_root = os.getcwd()
    print(f"🎯 开始修复特定的括号错误")
    print(f"📁 项目根目录: {project_root}")
    
    fixer = SpecificErrorFixer(project_root)
    fixer.fix_specific_files()
    
    print(f"\n✨ 特定错误修复完成！")
    print(f"💡 建议运行 'python error_tracker.py' 验证修复效果")

if __name__ == '__main__':
    main()