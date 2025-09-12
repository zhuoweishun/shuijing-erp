#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终语法修复脚本
目标：修复剩余的55个语法错误
主要问题：缺少逗号、大括号语法错误
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

class FinalSyntaxFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        self.backup_created = False
        
    def create_backup(self):
        """创建备份"""
        if self.backup_created:
            return
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/final_syntax_fix_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
            self.backup_created = True
    
    def fix_array_object_syntax(self, content, file_path):
        """修复数组和对象语法问题"""
        original_content = content
        
        # 修复 } 数字) 模式 - 应该是 }, 数字)
        content = re.sub(r'}\s+(\d+)\)', r'}, \1)', content)
        
        # 修复对象属性后缺少逗号的问题
        # 匹配 { key: 'value', label: 'text' } 模式中缺少逗号的情况
        content = re.sub(r"(\{\s*key:\s*'[^']+',\s*label:\s*'[^']+'\s*)\},", r'\1 },', content)
        
        # 修复 useEffect 依赖数组语法
        content = re.sub(r'}\s+\[([^\]]+)\]\)', r'}, [\1])', content)
        
        # 修复对象字面量中的语法错误
        content = re.sub(r'(\w+):\s+(\w+)\s*$', r'\1: \2,', content, flags=re.MULTILINE)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'array_object_syntax_fix',
                'description': '修复数组和对象语法问题'
            })
        
        return content
    
    def fix_function_call_syntax(self, content, file_path):
        """修复函数调用语法问题"""
        original_content = content
        
        # 修复 setTimeout 等函数调用语法
        content = re.sub(r'}\s+(\d+)\)', r'}, \1)', content)
        
        # 修复对象属性定义中缺少逗号
        lines = content.split('\n')
        for i, line in enumerate(lines):
            # 检查是否是对象属性定义行
            if ':' in line and not line.strip().startswith('//') and not line.strip().startswith('*'):
                stripped = line.strip()
                # 如果行以标识符结尾且下一行也是属性定义，添加逗号
                if i < len(lines) - 1:
                    next_line = lines[i + 1].strip()
                    if (re.match(r'^\w+:', next_line) and 
                        not stripped.endswith(',') and 
                        not stripped.endswith('{') and 
                        not stripped.endswith('}')):
                        lines[i] = line.rstrip() + ','
        
        content = '\n'.join(lines)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'function_call_syntax_fix',
                'description': '修复函数调用语法问题'
            })
        
        return content
    
    def fix_specific_patterns(self, content, file_path):
        """修复特定的语法模式"""
        original_content = content
        
        # 修复特定的错误模式
        patterns = [
            # 修复 } 数字) 模式
            (r'}\s+(\d+)\)', r'}, \1)'),
            # 修复对象属性后的语法
            (r'(selected_sku):\s+(\w+)\s*$', r'\1: \2,'),
            # 修复 sorting 对象语法
            (r'(sorting):\s+\{([^}]+)\}\s*,', r'\1: {\2},'),
            # 修复 filters 对象语法
            (r'(filters):\s+(\w+\.\w+)\s*,', r'\1: \2,'),
        ]
        
        for pattern, replacement in patterns:
            new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
            if new_content != content:
                content = new_content
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'specific_pattern_fix',
                    'description': f'修复特定模式: {pattern}'
                })
        
        return content
    
    def fix_object_literal_syntax(self, content, file_path):
        """修复对象字面量语法"""
        original_content = content
        
        lines = content.split('\n')
        in_object = False
        brace_count = 0
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # 检测对象开始
            if '{' in line:
                brace_count += line.count('{')
                if brace_count > 0:
                    in_object = True
            
            if in_object and brace_count > 0:
                # 在对象内部，检查属性定义
                if ':' in stripped and not stripped.startswith('//') and not stripped.startswith('*'):
                    # 如果是属性定义且不以逗号或大括号结尾，添加逗号
                    if (not stripped.endswith(',') and 
                        not stripped.endswith('{') and 
                        not stripped.endswith('}') and 
                        not stripped.endswith(';') and
                        i < len(lines) - 1):
                        
                        next_line = lines[i + 1].strip()
                        # 如果下一行是另一个属性或者是对象结束，添加逗号
                        if (next_line and 
                            (re.match(r'^\w+:', next_line) or next_line.startswith('}')) and
                            not next_line.startswith('//')): 
                            lines[i] = line.rstrip() + ','
            
            # 更新大括号计数
            if '}' in line:
                brace_count -= line.count('}')
                if brace_count <= 0:
                    in_object = False
                    brace_count = 0
        
        content = '\n'.join(lines)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'object_literal_syntax_fix',
                'description': '修复对象字面量语法'
            })
        
        return content
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用各种修复
            content = self.fix_array_object_syntax(content, file_path)
            content = self.fix_function_call_syntax(content, file_path)
            content = self.fix_specific_patterns(content, file_path)
            content = self.fix_object_literal_syntax(content, file_path)
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 已修复: {file_path}")
            
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def run_final_fixes(self):
        """运行最终修复"""
        print("🔧 开始最终语法修复...")
        print("🎯 目标：修复剩余的55个语法错误")
        
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
        with open('final_syntax_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 修复完成统计:")
        print(f"   总修复数: {report['total_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        for fix_type, count in report['fixes_by_type'].items():
            print(f"   {fix_type}: {count}")
        
        print(f"\n📄 详细报告已保存到: final_syntax_fix_report.json")

if __name__ == '__main__':
    fixer = FinalSyntaxFixer()
    
    if fixer.run_final_fixes():
        print("\n✅ 最终语法修复完成！")
        print("📊 请运行 'npm run build' 检查错误数量")
        print("🎯 目标：将55个错误进一步减少")
    else:
        print("\n❌ 修复过程中出现问题！")