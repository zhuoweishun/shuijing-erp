#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专门修复import语句和基础语法错误的工具
目标：修复TypeScript/React项目中被破坏的import语句
"""

import os
import re
import glob
from typing import List, Tuple

class ImportFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_count = 0
        
    def fix_import_statements(self, content: str) -> str:
        """修复被破坏的import语句"""
        lines = content.split('\n')
        fixed_lines = []
        
        for line in lines:
            original_line = line
            
            # 修复import语句中被破坏的引号
            if line.strip().startswith('import') or 'from' in line:
                # 恢复import语句的正确格式
                # 修复被替换的引号
                line = re.sub(r'&#123;', '{', line)
                line = re.sub(r'&#125;', '}', line)
                line = re.sub(r'&gt;', '>', line)
                line = re.sub(r'&lt;', '<', line)
                
                # 修复import语句的基本结构
                if 'import' in line and 'from' in line:
                    # 标准的 import { } from '' 格式
                    match = re.match(r'import\s*\{([^}]*)\}\s*from\s*["\']([^"\']*)["\'](.*)', line)
                    if match:
                        imports = match.group(1).strip()
                        module = match.group(2).strip()
                        rest = match.group(3).strip()
                        line = f"import {{ {imports} }} from '{module}'{';' if not rest.startswith(';') else rest}"
                elif line.strip().startswith('import') and 'from' not in line:
                    # 默认import格式
                    match = re.match(r'import\s+([^\s]+)\s+from\s*["\']([^"\']*)["\'](.*)', line)
                    if match:
                        default_import = match.group(1).strip()
                        module = match.group(2).strip()
                        rest = match.group(3).strip()
                        line = f"import {default_import} from '{module}'{';' if not rest.startswith(';') else rest}"
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def fix_basic_syntax_errors(self, content: str) -> str:
        """修复基础语法错误"""
        # 修复被错误替换的字符
        content = re.sub(r'&#123;', '{', content)
        content = re.sub(r'&#125;', '}', content)
        
        # 只在非JSX上下文中修复这些字符
        # 修复函数参数中的问题
        content = re.sub(r'\(([^)]*?)&gt;([^)]*?)\)', r'(\1>\2)', content)
        content = re.sub(r'\(([^)]*?)&lt;([^)]*?)\)', r'(\1<\2)', content)
        
        return content
    
    def fix_jsx_syntax(self, content: str) -> str:
        """修复JSX语法错误"""
        # 在JSX标签中保留正确的格式
        # 这里需要更精确的JSX解析，暂时保守处理
        return content
    
    def fix_file(self, file_path: str) -> bool:
        """修复单个文件的语法错误"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 按顺序应用修复
            content = self.fix_import_statements(content)
            content = self.fix_basic_syntax_errors(content)
            
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
    
    print("开始修复import语句和基础语法错误...")
    print("这次修复专注于恢复被破坏的import语句")
    
    fixer = ImportFixer(project_root)
    fixed_count = fixer.run_fixes()
    
    if fixed_count > 0:
        print(f"\n请运行 'npx tsc -b' 检查修复效果")
        print("预期错误数量应该显著减少")
    else:
        print("\n没有发现需要修复的文件")

if __name__ == "__main__":
    main()