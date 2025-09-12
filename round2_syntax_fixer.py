#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第二轮语法错误修复工具
专门修复JSX语法错误、缺少逗号分号等问题
"""

import os
import re
import glob
from typing import List, Tuple

class Round2SyntaxFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_count = 0
        
    def fix_jsx_tokens(self, content: str) -> str:
        """修复JSX中的特殊token错误"""
        # 修复 JSX 中的特殊字符错误
        content = re.sub(r'\{\'\'\}', "{'}'}", content)  # 修复 {''} 为 {'}'}
        content = re.sub(r'\{\'>\'}', "{'>'}", content)  # 修复 {'>'} 
        content = re.sub(r'\{\'}\'}', "{'}'}", content)  # 修复 {'}'}
        
        return content
    
    def fix_missing_commas(self, content: str) -> str:
        """修复缺少逗号的问题"""
        lines = content.split('\n')
        fixed_lines = []
        
        for i, line in enumerate(lines):
            # 修复对象属性缺少逗号的问题
            # 如果行以 } 结尾，下一行以字母开头，可能需要逗号
            if (i < len(lines) - 1 and 
                line.strip().endswith('}') and 
                not line.strip().endswith('},') and
                lines[i + 1].strip() and
                re.match(r'^\s*[a-zA-Z_]', lines[i + 1])):
                line = line.rstrip() + ','
            
            # 修复函数参数缺少逗号
            # 匹配类似 "prop1 prop2" 的模式，应该是 "prop1, prop2"
            if '(' in line and ')' in line:
                # 在括号内查找缺少逗号的参数
                def fix_params(match):
                    params = match.group(1)
                    # 如果参数之间有空格但没有逗号，添加逗号
                    params = re.sub(r'(\w+)\s+(\w+)(?!\s*[=:])', r'\1, \2', params)
                    return f"({params})"
                
                line = re.sub(r'\(([^)]*)\)', fix_params, line)
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def fix_missing_semicolons(self, content: str) -> str:
        """修复缺少分号的问题"""
        lines = content.split('\n')
        fixed_lines = []
        
        for line in lines:
            stripped = line.strip()
            
            # 如果行看起来像是语句但没有分号，添加分号
            if (stripped and 
                not stripped.endswith((';', '{', '}', ')', ',', ':', '\\', '//', '/*')) and
                not stripped.startswith(('import', 'export', 'if', 'for', 'while', 'function', 'const', 'let', 'var', 'class', 'interface', 'type', '//', '/*', '<', '}')) and
                not '=' in stripped and
                not stripped.endswith('>')  and
                len(stripped) > 3):
                line = line.rstrip() + ';'
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def fix_jsx_closing_tags(self, content: str) -> str:
        """修复JSX闭合标签问题"""
        # 修复常见的JSX闭合标签问题
        # 这是一个简化的修复，只处理明显的错误
        
        # 修复自闭合标签
        content = re.sub(r'<(\w+)([^>]*?)>\s*</\1>', r'<\1\2 />', content)
        
        return content
    
    def fix_type_annotations(self, content: str) -> str:
        """修复类型注解错误"""
        # 修复缺少类型的问题
        # 例如：: 后面缺少类型
        content = re.sub(r':\s*(?=[,\)\}])', ': any', content)
        
        return content
    
    def fix_property_assignments(self, content: str) -> str:
        """修复属性赋值错误"""
        # 修复对象属性赋值中的语法错误
        # 例如：{ prop1 prop2: value } 应该是 { prop1, prop2: value }
        
        def fix_object_props(match):
            obj_content = match.group(1)
            # 在对象内容中查找缺少逗号的属性
            obj_content = re.sub(r'(\w+)\s+(\w+)\s*:', r'\1, \2:', obj_content)
            return f"{{{obj_content}}}"
        
        content = re.sub(r'\{([^{}]*)\}', fix_object_props, content)
        
        return content
    
    def fix_file(self, file_path: str) -> bool:
        """修复单个文件的语法错误"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 按顺序应用修复
            content = self.fix_jsx_tokens(content)
            content = self.fix_missing_commas(content)
            content = self.fix_property_assignments(content)
            content = self.fix_type_annotations(content)
            # content = self.fix_missing_semicolons(content)  # 暂时禁用，可能引起问题
            
            # 如果内容有变化，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.fixed_count += 1
                print(f"已修复: {file_path}")
                return True
            
            return False
        except Exception as e:
            print(f"修复文件 {file_path} 时出错: {e}")
            return False
    
    def get_typescript_files(self) -> List[str]:
        """获取所有TypeScript和React文件"""
        patterns = [
            os.path.join(self.project_root, 'src', '**', '*.ts'),
            os.path.join(self.project_root, 'src', '**', '*.tsx'),
        ]
        
        files = []
        for pattern in patterns:
            files.extend(glob.glob(pattern, recursive=True))
        
        return files
    
    def run_fixes(self) -> int:
        """运行所有修复"""
        files = self.get_typescript_files()
        print(f"找到 {len(files)} 个文件需要检查")
        
        for file_path in files:
            self.fix_file(file_path)
        
        print(f"\n修复完成！共修复了 {self.fixed_count} 个文件")
        return self.fixed_count

def main():
    project_root = r"d:\shuijing ERP"
    
    print("开始第二轮语法错误修复...")
    print("当前错误数量：1692")
    print("目标：继续减少错误数量")
    
    fixer = Round2SyntaxFixer(project_root)
    fixed_count = fixer.run_fixes()
    
    if fixed_count > 0:
        print(f"\n请运行 'npx tsc -b' 检查修复效果")
        print("预期错误数量应该进一步减少")
    else:
        print("\n没有发现需要修复的文件")

if __name__ == "__main__":
    main()