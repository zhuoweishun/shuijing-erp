#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第一阶段语法错误修复脚本
专门处理条件表达式不完整、逻辑操作符错误和括号/分号缺失等问题
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple

class Stage1SyntaxFixer:
    def __init__(self, preview_mode=True):
        self.preview_mode = preview_mode
        self.fixes_applied = []
        self.files_processed = 0
        self.total_fixes = 0
        self.backup_dir = "backups/stage1_syntax_fixes"
        
        # 语法错误修复模式
        self.fix_patterns = [
            # 条件表达式不完整修复
            {
                'name': '条件表达式||后缺失操作数',
                'pattern': r'\bif\s*\(([^)]*?)\s*\|\|\s*\)\s*{',
                'replacement': r'if (\1) {',
                'description': 'if (condition || ) → if (condition)'
            },
            {
                'name': '条件表达式&&后缺失操作数',
                'pattern': r'\bif\s*\(([^)]*?)\s*&&\s*\)\s*{',
                'replacement': r'if (\1) {',
                'description': 'if (condition && ) → if (condition)'
            },
            {
                'name': '逻辑表达式||后缺失操作数',
                'pattern': r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\|\|\s*(?=[;})])',
                'replacement': r'\1',
                'description': 'variable || → variable'
            },
            {
                'name': '逻辑表达式&&后缺失操作数',
                'pattern': r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*&&\s*(?=[;})])',
                'replacement': r'\1',
                'description': 'variable && → variable'
            },
            {
                'name': '三元操作符不完整',
                'pattern': r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\?\s*([^:]*?)\s*:\s*(?=[;})])',
                'replacement': r'\1 ? \2 : null',
                'description': 'condition ? value : → condition ? value : null'
            },
            {
                'name': 'JSX条件渲染不完整',
                'pattern': r'{([^}]*?)\s*&&\s*}',
                'replacement': r'{\1 && null}',
                'description': '{condition && } → {condition && null}'
            },
            {
                'name': '函数调用缺失右括号',
                'pattern': r'([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)(?<!\))\s*(?=[;,}\n])',
                'replacement': r'\1(\2)',
                'description': 'function(args → function(args)'
            },
            {
                'name': '对象属性访问后缺失操作',
                'pattern': r'\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\|\|\s*(?=[;})])',
                'replacement': r'.\1',
                'description': '.property || → .property'
            },
            {
                'name': '数组访问后缺失操作',
                'pattern': r'\[([^\]]*)\]\s*\|\|\s*(?=[;})])',
                'replacement': r'[\1]',
                'description': '[index] || → [index]'
            },
            {
                'name': '缺失分号的语句',
                'pattern': r'([a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*[^;\n]+)(?=\n\s*[a-zA-Z_$])',
                'replacement': r'\1;',
                'description': 'statement → statement;'
            }
        ]
    
    def create_backup(self, file_path: str) -> str:
        """创建文件备份"""
        if not self.preview_mode:
            backup_path = os.path.join(self.backup_dir, os.path.relpath(file_path, '.'))
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            shutil.copy2(file_path, backup_path)
            return backup_path
        return ""
    
    def fix_file_syntax(self, file_path: str) -> List[Dict]:
        """修复单个文件的语法错误"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            file_fixes = []
            
            for pattern_info in self.fix_patterns:
                pattern = pattern_info['pattern']
                replacement = pattern_info['replacement']
                
                matches = list(re.finditer(pattern, content, re.MULTILINE))
                if matches:
                    for match in matches:
                        line_num = content[:match.start()].count('\n') + 1
                        original_text = match.group(0)
                        fixed_text = re.sub(pattern, replacement, original_text)
                        
                        fix_info = {
                            'file': file_path,
                            'line': line_num,
                            'pattern_name': pattern_info['name'],
                            'description': pattern_info['description'],
                            'original': original_text.strip(),
                            'fixed': fixed_text.strip(),
                            'position': f"{match.start()}-{match.end()}"
                        }
                        file_fixes.append(fix_info)
                    
                    # 应用修复
                    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
            
            # 如果有修复且不是预览模式，写入文件
            if file_fixes and not self.preview_mode:
                self.create_backup(file_path)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            
            return file_fixes
            
        except Exception as e:
            print(f"❌ 处理文件 {file_path} 时出错: {e}")
            return []
    
    def find_typescript_files(self, directory: str) -> List[str]:
        """查找所有TypeScript文件"""
        ts_files = []
        for root, dirs, files in os.walk(directory):
            # 跳过node_modules和其他不需要的目录
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build', 'coverage']]
            
            for file in files:
                if file.endswith(('.ts', '.tsx')):
                    ts_files.append(os.path.join(root, file))
        
        return ts_files
    
    def generate_report(self) -> Dict:
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'mode': 'preview' if self.preview_mode else 'execute',
            'stage': 'Stage 1 - 语法错误修复',
            'summary': {
                'files_processed': self.files_processed,
                'files_with_fixes': len(set(fix['file'] for fix in self.fixes_applied)),
                'total_fixes': self.total_fixes,
                'backup_directory': self.backup_dir if not self.preview_mode else None
            },
            'fixes_by_pattern': {},
            'fixes_by_file': {},
            'detailed_fixes': self.fixes_applied
        }
        
        # 按模式统计
        for fix in self.fixes_applied:
            pattern_name = fix['pattern_name']
            if pattern_name not in report['fixes_by_pattern']:
                report['fixes_by_pattern'][pattern_name] = {
                    'count': 0,
                    'description': fix['description'],
                    'files': set()
                }
            report['fixes_by_pattern'][pattern_name]['count'] += 1
            report['fixes_by_pattern'][pattern_name]['files'].add(fix['file'])
        
        # 转换set为list以便JSON序列化
        for pattern_info in report['fixes_by_pattern'].values():
            pattern_info['files'] = list(pattern_info['files'])
        
        # 按文件统计
        for fix in self.fixes_applied:
            file_path = fix['file']
            if file_path not in report['fixes_by_file']:
                report['fixes_by_file'][file_path] = []
            report['fixes_by_file'][file_path].append({
                'line': fix['line'],
                'pattern': fix['pattern_name'],
                'original': fix['original'],
                'fixed': fix['fixed']
            })
        
        return report
    
    def run(self, target_directory: str = 'src') -> Dict:
        """执行语法修复"""
        print(f"🔧 开始第一阶段语法错误修复 ({'预览模式' if self.preview_mode else '执行模式'})")
        print(f"📁 目标目录: {target_directory}")
        
        # 创建备份目录
        if not self.preview_mode:
            os.makedirs(self.backup_dir, exist_ok=True)
        
        # 查找所有TypeScript文件
        ts_files = self.find_typescript_files(target_directory)
        print(f"📄 找到 {len(ts_files)} 个TypeScript文件")
        
        # 处理每个文件
        for file_path in ts_files:
            self.files_processed += 1
            file_fixes = self.fix_file_syntax(file_path)
            
            if file_fixes:
                self.fixes_applied.extend(file_fixes)
                self.total_fixes += len(file_fixes)
                print(f"✅ {file_path}: 修复了 {len(file_fixes)} 个语法错误")
            else:
                print(f"✓ {file_path}: 无需修复")
        
        # 生成报告
        report = self.generate_report()
        
        # 保存报告
        report_filename = f"stage1_syntax_fixes_{'preview' if self.preview_mode else 'executed'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 打印总结
        print("\n" + "="*60)
        print(f"🎯 第一阶段语法修复完成 ({'预览' if self.preview_mode else '执行'})")
        print(f"📊 处理文件: {self.files_processed} 个")
        print(f"🔧 修复文件: {len(set(fix['file'] for fix in self.fixes_applied))} 个")
        print(f"✨ 总修复数: {self.total_fixes} 处")
        print(f"📋 详细报告: {report_filename}")
        
        if self.preview_mode:
            print("\n⚠️  当前为预览模式，未实际修改文件")
            print("💡 要执行实际修复，请运行: python stage1_syntax_fixer.py --execute")
        else:
            print(f"💾 备份目录: {self.backup_dir}")
        
        print("="*60)
        
        return report

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='第一阶段语法错误修复工具')
    parser.add_argument('--execute', action='store_true', help='执行实际修复（默认为预览模式）')
    parser.add_argument('--directory', default='src', help='目标目录（默认: src）')
    
    args = parser.parse_args()
    
    # 创建修复器实例
    fixer = Stage1SyntaxFixer(preview_mode=not args.execute)
    
    # 执行修复
    report = fixer.run(args.directory)
    
    return report

if __name__ == '__main__':
    main()