#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复JavaScript/TypeScript语法错误的Python脚本
专门针对构建过程中发现的语法问题
"""

import os
import re
import glob
from typing import List, Tuple

class SyntaxFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_files = []
        self.total_fixes = 0
        
    def fix_array_syntax_errors(self, content: str) -> Tuple[str, int]:
        """修复数组语法错误"""
        fixes = 0
        
        # 修复数组末尾的分号问题 (如: }; ] 应该是 } ])
        pattern = r'}\s*;\s*\]'
        if re.search(pattern, content):
            content = re.sub(pattern, '}\n]', content)
            fixes += 1
            
        return content, fixes
    
    def fix_template_literal_errors(self, content: str) -> Tuple[str, int]:
        """修复模板字符串语法错误"""
        fixes = 0
        
        # 修复错误的模板字符串开始符号 (如: className={`; 应该是 className={`)
        pattern = r'className=\{`\s*;'
        if re.search(pattern, content):
            content = re.sub(pattern, 'className={`', content)
            fixes += 1
            
        # 修复模板字符串中的语法错误
        pattern = r'`\s*;\s*([^`]+)`'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = f'`;\s*{re.escape(match)}`'
            new_replacement = f'`{match}`'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        return content, fixes
    
    def fix_jsx_syntax_errors(self, content: str) -> Tuple[str, int]:
        """修复JSX语法错误"""
        fixes = 0
        
        # 修复JSX中的错误括号 (如: <div>)内容</div> 应该是 <div>内容</div>)
        pattern = r'<(\w+)>\)([^<]+)</\1>'
        matches = re.findall(pattern, content)
        for tag, text in matches:
            old_pattern = f'<{tag}>\){re.escape(text)}</{tag}>'
            new_replacement = f'<{tag}>{text}</{tag}>'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        # 修复JSX属性中的错误语法
        pattern = r'\)\s*\}\s*>'
        if re.search(pattern, content):
            content = re.sub(pattern, '}>', content)
            fixes += 1
            
        return content, fixes
    
    def fix_function_syntax_errors(self, content: str) -> Tuple[str, int]:
        """修复函数语法错误"""
        fixes = 0
        
        # 修复函数调用中的错误括号 (如: function()}) 应该是 function()})
        pattern = r'(\w+\([^)]*\))\}\)'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = f'{re.escape(match)}\}}\)'
            new_replacement = f'{match})'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        return content, fixes
    
    def fix_bracket_mismatches(self, content: str) -> Tuple[str, int]:
        """修复括号不匹配问题"""
        fixes = 0
        
        # 修复多余的分号和括号组合
        patterns = [
            (r'\}\s*;\s*\)', '}'),  # }; ) -> }
            (r'\)\s*;\s*\}', ')'),  # ) ; } -> )
            (r'\]\s*;\s*\)', ']'),  # ] ; ) -> ]
            (r'\}\s*=>\s*\{', '} => {'),  # } => { 格式化
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                fixes += 1
                
        return content, fixes
    
    def fix_variable_declaration_errors(self, content: str) -> Tuple[str, int]:
        """修复变量声明错误"""
        fixes = 0
        
        # 修复解构赋值语法错误 (如: const { } = use_permission()) 
        pattern = r'const\s*\{\s*\}\s*='
        if re.search(pattern, content):
            content = re.sub(pattern, 'const {} =', content)
            fixes += 1
            
        return content, fixes
    
    def fix_optional_chaining_errors(self, content: str) -> Tuple[str, int]:
        """修复可选链操作符语法错误"""
        fixes = 0
        
        # 修复可选链中的空格问题 (如: error.response? .data 应该是 error.response?.data)
        pattern = r'(\w+)\?\s+\.(\w+)'
        matches = re.findall(pattern, content)
        for obj, prop in matches:
            old_pattern = f'{obj}?\\s+\\.{prop}'
            new_replacement = f'{obj}?.{prop}'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        return content, fixes
    
    def fix_function_parameter_errors(self, content: str) -> Tuple[str, int]:
        """修复函数参数语法错误"""
        fixes = 0
        
        # 修复函数参数中的错误语法 (如: function({ param }): ) 应该是 function({ param }): ReturnType)
        pattern = r'function\s*(\w*)\s*\([^)]*\)\s*:\s*\)\s*\{'
        matches = re.findall(pattern, content)
        for func_name in matches:
            old_pattern = f'function\\s*{func_name}\\s*\\([^)]*\\)\\s*:\\s*\\)\\s*\\{{'
            new_replacement = f'function {func_name}({{...args}}): JSX.Element {{'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        # 修复箭头函数参数错误 (如: async ( : Promise<void> => 应该是 async (): Promise<void> =>)
        pattern = r'async\s*\(\s*:\s*Promise<([^>]+)>\s*=>'
        matches = re.findall(pattern, content)
        for return_type in matches:
            old_pattern = f'async\\s*\\(\\s*:\\s*Promise<{return_type}>\\s*=>'
            new_replacement = f'async (): Promise<{return_type}> =>'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        return content, fixes
    
    def fix_object_syntax_errors(self, content: str) -> Tuple[str, int]:
        """修复对象语法错误"""
        fixes = 0
        
        # 修复对象属性中的语法错误 (如: { user: User token: string } 应该是 { user: User, token: string })
        pattern = r'\{\s*(\w+):\s*(\w+)\s+(\w+):\s*(\w+)\s*\}'
        matches = re.findall(pattern, content)
        for prop1, type1, prop2, type2 in matches:
            old_pattern = f'\\{{\\s*{prop1}:\\s*{type1}\\s+{prop2}:\\s*{type2}\\s*\\}}'
            new_replacement = f'{{ {prop1}: {type1}, {prop2}: {type2} }}'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        # 修复对象字面量中的分号错误
        pattern = r'(\w+):\s*(\w+)\s*;\s*\n\s*(\w+):\s*'
        matches = re.findall(pattern, content)
        for prop1, val1, prop2 in matches:
            old_pattern = f'{prop1}:\\s*{val1}\\s*;\\s*\\n\\s*{prop2}:'
            new_replacement = f'{prop1}: {val1},\n        {prop2}:'
            content = re.sub(old_pattern, new_replacement, content)
            fixes += 1
            
        return content, fixes
    
    def fix_specific_layout_errors(self, content: str) -> Tuple[str, int]:
        """修复Layout.tsx中的特定错误"""
        fixes = 0
        
        # 修复导航项数组的语法错误
        if 'icon: Settings' in content and '};' in content:
            # 将 }; ] 修复为 } ]
            content = content.replace('icon: Settings\n  };\n]', 'icon: Settings\n  }\n]')
            fixes += 1
            
        # 修复模板字符串中的分号错误
        if 'className={`;' in content:
            content = content.replace('className={`;', 'className={`')
            fixes += 1
            
        # 修复JSX中的括号错误
        if '<div className="space-y-1 px-4">)' in content:
            content = content.replace('<div className="space-y-1 px-4">)', '<div className="space-y-1 px-4">')
            fixes += 1
            
        # 修复return语句的括号
        if 'return(' in content:
            content = content.replace('return(', 'return (')
            fixes += 1
            
        # 修复Link组件的语法
        if '</Link>)' in content:
            content = content.replace('</Link>)', '</Link>')
            fixes += 1
            
        # 修复map函数的语法
        if '})}</div>' in content:
            content = content.replace('})}</div>', '})</div>')
            fixes += 1
            
        # 修复条件渲染的语法
        if '}) => {' in content:
            content = content.replace('}) => {', '}) {')
            fixes += 1
            
        # 修复变量名错误
        if 'isActive' in content:
            content = content.replace('isActive', 'is_active')
            fixes += 1
            
        return content, fixes
    
    def fix_file(self, file_path: str) -> bool:
        """修复单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            content = original_content
            total_file_fixes = 0
            
            # 应用所有修复规则
            content, fixes = self.fix_array_syntax_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_template_literal_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_jsx_syntax_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_function_syntax_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_bracket_mismatches(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_variable_declaration_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_optional_chaining_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_function_parameter_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_object_syntax_errors(content)
            total_file_fixes += fixes
            
            content, fixes = self.fix_specific_layout_errors(content)
            total_file_fixes += fixes
            
            # 如果有修复，写回文件
            if total_file_fixes > 0 and content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.fixed_files.append(file_path)
                self.total_fixes += total_file_fixes
                print(f"✅ 修复 {file_path}: {total_file_fixes} 个问题")
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
        
        print(f"🔍 找到 {len(files_to_fix)} 个文件需要检查")
        print("🔧 开始修复语法错误...")
        
        for file_path in files_to_fix:
            self.fix_file(file_path)
        
        print(f"\n📊 修复完成统计:")
        print(f"   - 修复文件数: {len(self.fixed_files)}")
        print(f"   - 总修复问题数: {self.total_fixes}")
        
        if self.fixed_files:
            print(f"\n📝 修复的文件列表:")
            for file_path in self.fixed_files:
                print(f"   - {file_path}")

def main():
    project_root = os.getcwd()
    print(f"🚀 开始批量修复语法错误")
    print(f"📁 项目根目录: {project_root}")
    
    fixer = SyntaxFixer(project_root)
    fixer.fix_all_files()
    
    print(f"\n✨ 语法修复完成！")
    print(f"💡 建议运行 'npm run build' 验证修复效果")

if __name__ == '__main__':
    main()