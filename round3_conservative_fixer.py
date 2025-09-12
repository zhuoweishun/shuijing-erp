#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第三轮保守语法错误修复工具
只修复最安全和最常见的错误类型
"""

import os
import re
import glob
from typing import List, Tuple

class ConservativeSyntaxFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_count = 0
        
    def fix_simple_missing_commas(self, content: str) -> str:
        """只修复最明显的缺少逗号问题"""
        # 只修复对象字面量中明显缺少逗号的情况
        # 例如：{ a: 1 b: 2 } -> { a: 1, b: 2 }
        content = re.sub(r'(\w+\s*:\s*[^,}]+)\s+(\w+\s*:)', r'\1, \2', content)
        
        # 修复数组中明显缺少逗号的情况
        # 例如：[1 2 3] -> [1, 2, 3]
        content = re.sub(r'(\d+)\s+(\d+)', r'\1, \2', content)
        
        return content
    
    def fix_simple_type_annotations(self, content: str) -> str:
        """修复简单的类型注解错误"""
        # 修复 : 后面缺少类型的情况
        # 例如：function(param: ) -> function(param: any)
        content = re.sub(r':\s*([,\)\}])', r': any\1', content)
        
        return content
    
    def fix_obvious_jsx_errors(self, content: str) -> str:
        """只修复最明显的JSX错误"""
        # 修复明显的JSX属性错误
        # 例如：<div className=value> -> <div className="value">
        content = re.sub(r'(\w+)=([a-zA-Z_]\w*)(?!\s*[=\(])', r'\1="\2"', content)
        
        return content
    
    def fix_simple_semicolons(self, content: str) -> str:
        """只在最安全的情况下添加分号"""
        lines = content.split('\n')
        fixed_lines = []
        
        for line in lines:
            stripped = line.strip()
            
            # 只在非常明显的情况下添加分号
            # 例如：return value -> return value;
            if (stripped.startswith('return ') and 
                not stripped.endswith((';', '{', '}')) and
                len(stripped) > 7):
                line = line.rstrip() + ';'
            
            # 例如：throw error -> throw error;
            elif (stripped.startswith('throw ') and 
                  not stripped.endswith((';', '{', '}')) and
                  len(stripped) > 6):
                line = line.rstrip() + ';'
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def fix_obvious_syntax_errors(self, content: str) -> str:
        """修复最明显的语法错误"""
        # 修复明显的括号不匹配（只处理简单情况）
        # 修复 }{ -> }, {
        content = re.sub(r'}\s*{', '}, {', content)
        
        # 修复 ][ -> ], [
        content = re.sub(r']\s*\[', '], [', content)
        
        return content
    
    def fix_file(self, file_path: str) -> bool:
        """修复单个文件的语法错误"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 只应用最保守的修复
            content = self.fix_obvious_syntax_errors(content)
            content = self.fix_simple_type_annotations(content)
            # 暂时禁用其他修复，避免引入新问题
            # content = self.fix_simple_missing_commas(content)
            # content = self.fix_simple_semicolons(content)
            
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
    
    print("开始第三轮保守语法错误修复...")
    print("当前错误数量：4289")
    print("目标：使用保守策略减少错误，避免引入新问题")
    
    fixer = ConservativeSyntaxFixer(project_root)
    fixed_count = fixer.run_fixes()
    
    if fixed_count > 0:
        print(f"\n请运行 'npx tsc -b' 检查修复效果")
        print("预期错误数量应该减少而不是增加")
    else:
        print("\n没有发现需要修复的文件")

if __name__ == "__main__":
    main()