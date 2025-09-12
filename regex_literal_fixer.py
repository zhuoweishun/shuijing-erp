#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复正则表达式字面量错误
主要问题：Unterminated regular expression literal
这是由于之前的修复脚本错误处理了正则表达式导致的
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

class RegexLiteralFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        
    def create_backup(self):
        """创建备份"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/regex_fix_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
    
    def fix_regex_literals(self, content, file_path):
        """修复正则表达式字面量问题"""
        original_content = content
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            # 检查是否包含可能的正则表达式错误
            if '//' in line and not line.strip().startswith('//'):
                # 检查是否是注释，如果不是注释则可能是错误的正则表达式
                comment_pos = line.find('//')
                before_comment = line[:comment_pos]
                
                # 如果在注释前有代码，检查是否有未闭合的正则表达式
                if before_comment.strip():
                    # 检查是否有单独的 / 字符可能被误认为正则表达式
                    # 常见的错误模式：className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    # 被错误处理为正则表达式
                    
                    # 修复被错误处理的className等属性
                    if 'className=' in line and '//' in line:
                        # 这可能是被错误处理的className属性
                        # 尝试修复
                        fixed_line = line.replace('//', '')
                        if fixed_line != line:
                            lines[i] = fixed_line
                            self.fixes_applied.append({
                                'file': file_path,
                                'line': i + 1,
                                'type': 'regex_literal_fix',
                                'description': '修复被错误处理的className属性'
                            })
            
            # 检查其他可能的正则表达式错误
            # 查找可能的未闭合正则表达式模式
            if re.search(r'[^\w]/[^/\s]', line) and not line.strip().startswith('//'):
                # 可能是错误的正则表达式，需要检查上下文
                # 如果是在字符串中，可能需要转义
                pass
        
        content = '\n'.join(lines)
        return content
    
    def fix_jsx_attribute_errors(self, content, file_path):
        """修复JSX属性错误"""
        original_content = content
        
        # 修复常见的JSX属性问题
        # 1. 修复className属性中的错误
        content = re.sub(r'className=\{([^}]+)\}//', r'className={\1}', content)
        
        # 2. 修复其他属性中的类似问题
        content = re.sub(r'(\w+)=\{([^}]+)\}//', r'\1={\2}', content)
        
        # 3. 修复字符串中的错误转义
        content = re.sub(r'"([^"]*)//', r'"\1', content)
        content = re.sub(r'\'([^\']*)//', r"'\1", content)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'jsx_attribute_fix',
                'description': '修复JSX属性中的正则表达式错误'
            })
        
        return content
    
    def fix_string_literal_errors(self, content, file_path):
        """修复字符串字面量错误"""
        original_content = content
        
        # 修复字符串中被错误处理的内容
        # 常见模式：字符串被意外截断或添加了不必要的字符
        
        # 修复被截断的CSS类名字符串
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'className=' in line or 'class=' in line:
                # 检查是否有未闭合的字符串
                if line.count('"') % 2 != 0 or line.count("'") % 2 != 0:
                    # 可能有未闭合的字符串，尝试修复
                    if '//' in line and not line.strip().startswith('//'):
                        # 移除可能错误添加的 //
                        fixed_line = line.replace('//', '')
                        lines[i] = fixed_line
                        self.fixes_applied.append({
                            'file': file_path,
                            'line': i + 1,
                            'type': 'string_literal_fix',
                            'description': '修复字符串字面量错误'
                        })
        
        content = '\n'.join(lines)
        return content
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用各种修复
            content = self.fix_jsx_attribute_errors(content, file_path)
            content = self.fix_string_literal_errors(content, file_path)
            content = self.fix_regex_literals(content, file_path)
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 已修复: {file_path}")
            
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def run_regex_fixes(self):
        """运行正则表达式修复"""
        print("🔧 开始修复正则表达式字面量错误...")
        print("📊 当前主要错误: Unterminated regular expression literal")
        
        # 创建备份
        self.create_backup()
        
        # 处理所有TypeScript和TSX文件
        src_dir = Path('src')
        if not src_dir.exists():
            print("❌ src目录不存在")
            return False
        
        files_to_process = []
        for ext in ['*.ts', '*.tsx']:
            files_to_process.extend(src_dir.rglob(ext))
        
        print(f"📁 找到 {len(files_to_process)} 个文件需要处理")
        
        for file_path in files_to_process:
            self.process_file(str(file_path))
        
        # 生成报告
        self.generate_report()
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_fixes': len(self.fixes_applied),
            'total_errors': len(self.errors_found),
            'fixes_by_type': {},
            'fixes_applied': self.fixes_applied,
            'errors_found': self.errors_found
        }
        
        # 统计修复类型
        for fix in self.fixes_applied:
            fix_type = fix['type']
            if fix_type not in report['fixes_by_type']:
                report['fixes_by_type'][fix_type] = 0
            report['fixes_by_type'][fix_type] += 1
        
        # 保存报告
        with open('regex_literal_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 正则表达式修复完成统计:")
        print(f"   总修复数: {report['total_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        for fix_type, count in report['fixes_by_type'].items():
            print(f"   {fix_type}: {count}")
        
        print(f"\n📄 详细报告已保存到: regex_literal_fix_report.json")

if __name__ == '__main__':
    fixer = RegexLiteralFixer()
    
    if fixer.run_regex_fixes():
        print("\n✅ 正则表达式修复完成！")
        print("📊 请运行 'npm run build' 检查错误数量变化")
        print("🎯 目标：修复 'Unterminated regular expression literal' 错误")
    else:
        print("\n❌ 修复过程中出现问题！")