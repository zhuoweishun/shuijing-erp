#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全面的JavaScript/TypeScript语法错误批量修复脚本
一次性修复所有常见的语法问题
"""

import os
import re
import glob
from typing import List, Tuple

class ComprehensiveSyntaxFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_files = []
        self.total_fixes = 0
        
    def apply_all_fixes(self, content: str) -> Tuple[str, int]:
        """应用所有修复规则"""
        total_fixes = 0
        
        # 1. 修复函数调用中的setState错误
        patterns = [
            (r'setmessages\(', 'set_messages('),
            (r'setinput_message\(', 'set_input_message('),
            (r'setis_loading\(', 'set_is_loading('),
            (r'setError\(', 'set_error('),
            (r'setstats\(', 'set_stats('),
            (r'setis_', 'set_is_'),
            (r'setuser\(', 'set_user('),
            (r'settoken\(', 'set_token('),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                total_fixes += 1
        
        # 2. 修复函数参数语法错误
        # function({ param }): ) -> function({ param }): JSX.Element
        if re.search(r'\w+\s*\([^)]*\)\s*:\s*\)\s*\{', content):
            content = re.sub(r'(\w+)\s*\([^)]*\)\s*:\s*\)\s*\{', r'\1(...args): JSX.Element {', content)
            total_fixes += 1
            
        # async ( : Promise<void> => -> async (): Promise<void> =>
        if re.search(r'async\s*\(\s*:\s*Promise<[^>]+>\s*=>', content):
            content = re.sub(r'async\s*\(\s*:\s*Promise<([^>]+)>\s*=>', r'async (): Promise<\1> =>', content)
            total_fixes += 1
        
        # 3. 修复对象语法错误
        # { user: User token: string } -> { user: User, token: string }
        if re.search(r'\{\s*\w+:\s*\w+\s+\w+:\s*\w+\s*\}', content):
            content = re.sub(r'\{\s*(\w+):\s*(\w+)\s+(\w+):\s*(\w+)\s*\}', r'{ \1: \2, \3: \4 }', content)
            total_fixes += 1
        
        # 4. 修复可选链操作符错误
        # error.response? .data -> error.response?.data
        if re.search(r'\w+\?\s+\.\w+', content):
            content = re.sub(r'(\w+)\?\s+\.(\w+)', r'\1?.\2', content)
            total_fixes += 1
        
        # 5. 修复导航函数调用错误
        # navigate('/path', -> navigate('/path'),
        if re.search(r"navigate\('[^']+',\s*\n\s*permission:", content):
            content = re.sub(r"navigate\('([^']+)',\s*\n\s*permission:", r"navigate('\1'),\n      permission:", content)
            total_fixes += 1
        
        # 6. 修复JSX语法错误
        # </div>) -> </div>
        if re.search(r'</[^>]+>\)', content):
            content = re.sub(r'</([^>]+)>\)', r'</\1>', content)
            total_fixes += 1
            
        # <div>)content -> <div>content
        if re.search(r'<[^>]+>\)', content):
            content = re.sub(r'<([^>]+)>\)', r'<\1>', content)
            total_fixes += 1
        
        # 7. 修复括号不匹配问题
        # }; ] -> } ]
        if re.search(r'\}\s*;\s*\]', content):
            content = re.sub(r'\}\s*;\s*\]', '}\n]', content)
            total_fixes += 1
            
        # }) => { -> }) {
        if re.search(r'\}\)\s*=>\s*\{', content):
            content = re.sub(r'\}\)\s*=>\s*\{', '}) {', content)
            total_fixes += 1
        
        # 8. 修复条件渲染语法
        # }) {/* comment */} -> })}
        # {/* comment */}
        if re.search(r'\}\)\s*\{/\*[^*]*\*/\}', content):
            content = re.sub(r'\}\)\s*\{/\*([^*]*)\*/\}', r'})\n      \n      {/*\1*/}', content)
            total_fixes += 1
        
        # 9. 修复数组filter语法
        # filter(item => condition)) -> filter(item => condition)
        if re.search(r'filter\([^)]+\)\s*\)', content):
            content = re.sub(r'filter\(([^)]+)\)\s*\)', r'filter(\1)', content)
            total_fixes += 1
        
        # 10. 修复map函数语法
        # })} -> })
        if re.search(r'\}\)\}', content):
            content = re.sub(r'\}\)\}', '})', content)
            total_fixes += 1
        
        # 11. 修复className语法
        # className={`; -> className={`
        if re.search(r'className=\{`\s*;', content):
            content = re.sub(r'className=\{`\s*;', 'className={`', content)
            total_fixes += 1
        
        # className -> className="..."
        if re.search(r'className\s*$', content, flags=re.MULTILINE):
            content = re.sub(r'className\s*$', 'className="btn-primary"', content, flags=re.MULTILINE)
            total_fixes += 1
        
        # 12. 修复函数调用语法
        # onClick={() => function(} -> onClick={() => function()}
        if re.search(r'onClick=\{\(\) => \w+\(\}', content):
            content = re.sub(r'onClick=\{\(\) => (\w+)\(\}', r'onClick={() => \1()}', content)
            total_fixes += 1
        
        # 13. 修复输入框语法
        # onChange={(e) => setvalue(e.target.value} -> onChange={(e) => set_value(e.target.value)}
        if re.search(r'onChange=\{\(e\) => \w+\(e\.target\.value\}', content):
            content = re.sub(r'onChange=\{\(e\) => (\w+)\(e\.target\.value\}', r'onChange={(e) => \1(e.target.value)}', content)
            total_fixes += 1
        
        # 14. 修复disabled属性
        # disabled={!condition(} -> disabled={!condition()}
        if re.search(r'disabled=\{![^}]+\(\}', content):
            content = re.sub(r'disabled=\{!([^}]+)\(\}', r'disabled={!\1()}', content)
            total_fixes += 1
        
        # 15. 修复日期函数调用
        # .to_locale_date_string( -> .toLocaleDateString(
        if re.search(r'\.to_locale_date_string\(', content):
            content = re.sub(r'\.to_locale_date_string\(', '.toLocaleDateString(', content)
            total_fixes += 1
            
        # new Date().toLocaleDateString(} -> new Date().toLocaleDateString()
        if re.search(r'toLocaleDateString\(\}', content):
            content = re.sub(r'toLocaleDateString\(\}', 'toLocaleDateString()', content)
            total_fixes += 1
        
        # 16. 修复变量名错误
        # isActive -> is_active
        if re.search(r'\bisActive\b', content):
            content = re.sub(r'\bisActive\b', 'is_active', content)
            total_fixes += 1
        
        # 17. 修复return语句
        # return( -> return (
        if re.search(r'return\(', content):
            content = re.sub(r'return\(', 'return (', content)
            total_fixes += 1
        
        # 18. 修复Provider语法
        # <Provider value={value> -> <Provider value={value}>
        if re.search(r'value=\{[^}]+>', content):
            content = re.sub(r'value=\{([^}]+)>', r'value={\1}>', content)
            total_fixes += 1
        
        # 19. 修复解构赋值
        # const { } = -> const {} =
        if re.search(r'const\s*\{\s*\}\s*=', content):
            content = re.sub(r'const\s*\{\s*\}\s*=', 'const {} =', content)
            total_fixes += 1
        
        # 20. 修复多余的分号和括号
        # }; ) -> }
        if re.search(r'\}\s*;\s*\)', content):
            content = re.sub(r'\}\s*;\s*\)', '}', content)
            total_fixes += 1
            
        # ) ; } -> )
        if re.search(r'\)\s*;\s*\}', content):
            content = re.sub(r'\)\s*;\s*\}', ')', content)
            total_fixes += 1
        
        # 21. 修复不完整的JSX标签
        # <button -> <button className="btn-primary">
        if re.search(r'<button\s*$', content, flags=re.MULTILINE):
            content = re.sub(r'<button\s*$', '<button className="btn-primary">', content, flags=re.MULTILINE)
            total_fixes += 1
        
        # 22. 修复不完整的函数调用
        # function( -> function()
        if re.search(r'\w+\($', content, flags=re.MULTILINE):
            content = re.sub(r'(\w+)\($', r'\1()', content, flags=re.MULTILINE)
            total_fixes += 1
        
        # 23. 修复错误的事件处理
        # onKeyPress={ function } -> onKeyPress={function}
        if re.search(r'onKeyPress=\{\s+\w+\s+\}', content):
            content = re.sub(r'onKeyPress=\{\s+(\w+)\s+\}', r'onKeyPress={\1}', content)
            total_fixes += 1
        
        # 24. 修复对象字面量中的括号错误
        # { prop: value); -> { prop: value }
        if re.search(r'\{[^}]*\);', content):
            content = re.sub(r'(\{[^}]*)\);', r'\1 }', content)
            total_fixes += 1
        
        # 25. 修复console.log语法错误
        # console.log('text', { prop: value); -> console.log('text', { prop: value });
        if re.search(r'console\.log\([^)]*\{[^}]*\);', content):
            content = re.sub(r'(console\.log\([^)]*\{[^}]*)\);', r'\1 });', content)
            total_fixes += 1
        
        # 26. 修复ReactDOM.render语法
        # .render() <JSX> -> .render( <JSX>
        if re.search(r'\.render\(\)\s*<', content):
            content = re.sub(r'\.render\(\)\s*(<)', r'.render(\n  \1', content)
            total_fixes += 1
        
        # 27. 修复不完整的JSX属性
        # <input value={value} onChange={(e) => func(e.target.value} -> <input value={value} onChange={(e) => func(e.target.value)}
        if re.search(r'onChange=\{[^}]*e\.target\.value\}(?!\))', content):
            content = re.sub(r'(onChange=\{[^}]*e\.target\.value)\}', r'\1)}', content)
            total_fixes += 1
        
        # 28. 修复不完整的条件表达式
        # {condition && <div>content</div>} -> {condition && <div>content</div>}
        if re.search(r'\{[^}]*&&[^}]*</[^>]+>\}(?!\))', content):
            content = re.sub(r'(\{[^}]*&&[^}]*</[^>]+>)\}', r'\1}', content)
            total_fixes += 1
        
        # 29. 修复map函数中的return语句
        # .map((item) => return <div>content</div>) -> .map((item) => <div>content</div>)
        if re.search(r'\.map\([^)]*=>\s*return\s*<', content):
            content = re.sub(r'(\.map\([^)]*=>)\s*return\s*(<)', r'\1 \2', content)
            total_fixes += 1
        
        # 30. 修复不完整的三元操作符
        # condition ? value : -> condition ? value : null
        if re.search(r'\?[^:]*:[^}]*$', content, flags=re.MULTILINE):
            content = re.sub(r'(\?[^:]*:)\s*$', r'\1 null', content, flags=re.MULTILINE)
            total_fixes += 1
        
        return content, total_fixes
    
    def fix_file(self, file_path: str) -> bool:
        """修复单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            content, total_file_fixes = self.apply_all_fixes(original_content)
            
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
        print("🔧 开始全面修复语法错误...")
        
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
    print(f"🚀 开始全面批量修复语法错误")
    print(f"📁 项目根目录: {project_root}")
    
    fixer = ComprehensiveSyntaxFixer(project_root)
    fixer.fix_all_files()
    
    print(f"\n✨ 全面语法修复完成！")
    print(f"💡 建议运行 'npm run build' 验证修复效果")

if __name__ == '__main__':
    main()