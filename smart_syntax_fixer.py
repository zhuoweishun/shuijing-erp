#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能语法修复脚本
分析错误模式，批量修复，避免引入新问题
"""

import os
import re
import glob
import subprocess
from typing import List, Tuple, Dict

class SmartSyntaxFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_files = []
        self.total_fixes = 0
        self.error_patterns = {}
        
    def get_build_errors(self) -> List[str]:
        """获取构建错误信息"""
        try:
            result = subprocess.run(
                ['npx', 'vite', 'build'], 
                cwd=self.project_root,
                capture_output=True, 
                text=True,
                timeout=60
            )
            return result.stderr.split('\n') if result.stderr else []
        except Exception as e:
            print(f"获取构建错误失败: {e}")
            return []
    
    def analyze_error_patterns(self, errors: List[str]) -> Dict[str, int]:
        """分析错误模式"""
        patterns = {}
        
        for error in errors:
            if 'ERROR:' in error:
                if 'Unexpected' in error:
                    patterns['unexpected_token'] = patterns.get('unexpected_token', 0) + 1
                elif 'Expected' in error:
                    patterns['expected_token'] = patterns.get('expected_token', 0) + 1
                elif 'Unterminated' in error:
                    patterns['unterminated'] = patterns.get('unterminated', 0) + 1
                elif 'Transform failed' in error:
                    patterns['transform_failed'] = patterns.get('transform_failed', 0) + 1
        
        return patterns
    
    def apply_conservative_fixes(self, content: str) -> Tuple[str, int]:
        """应用保守的修复规则，避免引入新问题"""
        total_fixes = 0
        original_content = content
        
        # 1. 修复明确的函数名错误（最安全的修复）
        safe_function_fixes = [
            (r'\bsetmessages\b', 'set_messages'),
            (r'\bsetinput_message\b', 'set_input_message'),
            (r'\bsetis_loading\b', 'set_is_loading'),
            (r'\bsetError\b', 'set_error'),
            (r'\bsetstats\b', 'set_stats'),
            (r'\bsetuser\b', 'set_user'),
            (r'\bsettoken\b', 'set_token'),
        ]
        
        for pattern, replacement in safe_function_fixes:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                total_fixes += 1
        
        # 2. 修复明确的语法错误（保守修复）
        # 修复 render() <JSX> -> render( <JSX>
        if re.search(r'\.render\(\)\s*\n\s*<', content):
            content = re.sub(r'\.render\(\)\s*\n\s*(<)', r'.render(\n  \1', content)
            total_fixes += 1
        
        # 修复 }; ] -> } ]
        if re.search(r'\}\s*;\s*\]', content):
            content = re.sub(r'\}\s*;\s*\]', '}\n]', content)
            total_fixes += 1
        
        # 修复 </div>) -> </div>
        if re.search(r'</\w+>\)', content):
            content = re.sub(r'(</\w+>)\)', r'\1', content)
            total_fixes += 1
        
        # 修复 navigate('/path', \n permission: -> navigate('/path'), \n permission:
        if re.search(r"navigate\('[^']+',\s*\n\s*permission:", content):
            content = re.sub(r"(navigate\('[^']+'),\s*\n(\s*permission:)", r'\1\n      \2', content)
            total_fixes += 1
        
        # 修复 error.response? .data -> error.response?.data
        if re.search(r'\w+\?\s+\.\w+', content):
            content = re.sub(r'(\w+)\?\s+\.(\w+)', r'\1?.\2', content)
            total_fixes += 1
        
        # 修复 className={`; -> className={`
        if re.search(r'className=\{`\s*;', content):
            content = re.sub(r'className=\{`\s*;', 'className={`', content)
            total_fixes += 1
        
        # 修复 isActive -> is_active
        if re.search(r'\bisActive\b', content):
            content = re.sub(r'\bisActive\b', 'is_active', content)
            total_fixes += 1
        
        # 修复 .to_locale_date_string -> .toLocaleDateString
        if re.search(r'\.to_locale_date_string', content):
            content = re.sub(r'\.to_locale_date_string', '.toLocaleDateString', content)
            total_fixes += 1
        
        # 修复对象字面量中的分号错误（保守）
        # timestamp: new Date().toISOString()); -> timestamp: new Date().toISOString() });
        if re.search(r'toISOString\(\)\);', content):
            content = re.sub(r'toISOString\(\)\);', 'toISOString()\n        });', content)
            total_fixes += 1
        
        # 修复filter函数的括号
        # filter(item => condition)) -> filter(item => condition)
        if re.search(r'filter\([^)]+\)\s*\)', content):
            content = re.sub(r'(filter\([^)]+\))\s*\)', r'\1', content)
            total_fixes += 1
        
        # 只有在内容真正改变时才计算修复数量
        if content != original_content:
            return content, total_fixes
        else:
            return content, 0
    
    def fix_file_safely(self, file_path: str) -> bool:
        """安全地修复单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            content, total_file_fixes = self.apply_conservative_fixes(original_content)
            
            # 只有在有实际修复且内容确实改变时才写回文件
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
        # 先获取当前的构建错误
        print("🔍 分析当前构建错误...")
        errors = self.get_build_errors()
        error_patterns = self.analyze_error_patterns(errors)
        
        print(f"📊 错误模式分析:")
        for pattern, count in error_patterns.items():
            print(f"   - {pattern}: {count} 个")
        
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
        print("🔧 开始智能修复语法错误...")
        
        for file_path in files_to_fix:
            self.fix_file_safely(file_path)
        
        print(f"\n📊 修复完成统计:")
        print(f"   - 修复文件数: {len(self.fixed_files)}")
        print(f"   - 总修复问题数: {self.total_fixes}")
        
        # 再次检查构建错误
        print("\n🔍 验证修复效果...")
        new_errors = self.get_build_errors()
        new_error_patterns = self.analyze_error_patterns(new_errors)
        
        print(f"📊 修复后错误模式:")
        for pattern, count in new_error_patterns.items():
            print(f"   - {pattern}: {count} 个")
        
        if self.fixed_files:
            print(f"\n📝 修复的文件列表:")
            for file_path in self.fixed_files[:10]:  # 只显示前10个
                print(f"   - {file_path}")
            if len(self.fixed_files) > 10:
                print(f"   ... 还有 {len(self.fixed_files) - 10} 个文件")

def main():
    project_root = os.getcwd()
    print(f"🚀 开始智能批量修复语法错误")
    print(f"📁 项目根目录: {project_root}")
    
    fixer = SmartSyntaxFixer(project_root)
    fixer.fix_all_files()
    
    print(f"\n✨ 智能语法修复完成！")
    print(f"💡 建议运行 'npm run build' 验证修复效果")

if __name__ == '__main__':
    main()