#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精确语法错误修复脚本
只修复明确的标准API命名错误，保护业务代码的蛇形命名
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
import json

class PreciseSyntaxFixer:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.backup_dir = self.root_dir / 'backups' / 'precise_syntax_fixes'
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'files_processed': 0,
            'files_modified': 0,
            'total_fixes': 0,
            'fix_details': [],
            'errors': []
        }
        
        # 标准API白名单 - 只修复这些明确的API方法
        self.api_fixes = {
            # Prisma 方法
            r'\b(\w+)\.find_unique\b': r'\1.findUnique',
            r'\b(\w+)\.find_many\b': r'\1.findMany',
            r'\b(\w+)\.find_first\b': r'\1.findFirst',
            r'\b(\w+)\.create_many\b': r'\1.createMany',
            r'\b(\w+)\.update_many\b': r'\1.updateMany',
            r'\b(\w+)\.delete_many\b': r'\1.deleteMany',
            r'\b(\w+)\.upsert\b': r'\1.upsert',
            r'\b(\w+)\.group_by\b': r'\1.groupBy',
            
            # JavaScript 内置方法
            r'\b(\w+)\.get_time\b': r'\1.getTime',
            r'\b(\w+)\.set_time\b': r'\1.setTime',
            r'\b(\w+)\.to_string\b': r'\1.toString',
            r'\b(\w+)\.to_lower_case\b': r'\1.toLowerCase',
            r'\b(\w+)\.to_upper_case\b': r'\1.toUpperCase',
            r'\b(\w+)\.parse_int\b': r'\1.parseInt',
            r'\b(\w+)\.parse_float\b': r'\1.parseFloat',
            r'\b(\w+)\.get_full_year\b': r'\1.getFullYear',
            r'\b(\w+)\.get_month\b': r'\1.getMonth',
            r'\b(\w+)\.get_date\b': r'\1.getDate',
            r'\b(\w+)\.get_hours\b': r'\1.getHours',
            r'\b(\w+)\.get_minutes\b': r'\1.getMinutes',
            r'\b(\w+)\.get_seconds\b': r'\1.getSeconds',
            
            # Array 方法
            r'\b(\w+)\.for_each\b': r'\1.forEach',
            r'\b(\w+)\.find_index\b': r'\1.findIndex',
            
            # Object 方法
            r'\bObject\.has_own_property\b': r'Object.hasOwnProperty',
            r'\bObject\.get_own_property_names\b': r'Object.getOwnPropertyNames',
            
            # Console 方法
            r'\bconsole\.log\b': r'console.log',  # 保持不变
            r'\bconsole\.error\b': r'console.error',  # 保持不变
            r'\bconsole\.warn\b': r'console.warn',  # 保持不变
            
            # JSON 方法
            r'\bJSON\.parse\b': r'JSON.parse',  # 保持不变
            r'\bJSON\.stringify\b': r'JSON.stringify',  # 保持不变
        }
        
        # React/DOM API 修复
        self.react_fixes = {
            r'\buseState\b': r'useState',
            r'\buseEffect\b': r'useEffect',
            r'\buseContext\b': r'useContext',
            r'\buseReducer\b': r'useReducer',
            r'\buseCallback\b': r'useCallback',
            r'\buseMemo\b': r'useMemo',
            r'\buseRef\b': r'useRef',
            r'\buseLayoutEffect\b': r'useLayoutEffect',
            r'\buseImperativeHandle\b': r'useImperativeHandle',
            r'\buseDebugValue\b': r'useDebugValue',
        }
    
    def create_backup(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ 创建备份目录: {self.backup_dir}")
    
    def backup_file(self, file_path):
        """备份单个文件"""
        relative_path = file_path.relative_to(self.root_dir)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
    
    def fix_file_content(self, content, file_path):
        """修复文件内容"""
        original_content = content
        fixes_made = []
        
        # 跳过字符串和注释内容的修复
        def should_skip_line(line):
            stripped = line.strip()
            # 跳过注释行
            if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
                return True
            # 跳过字符串字面量（简单检查）
            if '"' in line or "'" in line or '`' in line:
                # 更精确的字符串检查可以在这里实现
                pass
            return False
        
        lines = content.split('\n')
        modified_lines = []
        
        for i, line in enumerate(lines):
            if should_skip_line(line):
                modified_lines.append(line)
                continue
                
            modified_line = line
            
            # 应用API修复
            for pattern, replacement in self.api_fixes.items():
                if re.search(pattern, modified_line):
                    new_line = re.sub(pattern, replacement, modified_line)
                    if new_line != modified_line:
                        fixes_made.append({
                            'line': i + 1,
                            'type': 'API修复',
                            'pattern': pattern,
                            'before': modified_line.strip(),
                            'after': new_line.strip()
                        })
                        modified_line = new_line
            
            # 应用React修复（仅对前端文件）
            if str(file_path).endswith(('.tsx', '.jsx')):
                for pattern, replacement in self.react_fixes.items():
                    if re.search(pattern, modified_line):
                        new_line = re.sub(pattern, replacement, modified_line)
                        if new_line != modified_line:
                            fixes_made.append({
                                'line': i + 1,
                                'type': 'React API修复',
                                'pattern': pattern,
                                'before': modified_line.strip(),
                                'after': new_line.strip()
                            })
                            modified_line = new_line
            
            modified_lines.append(modified_line)
        
        modified_content = '\n'.join(modified_lines)
        
        return modified_content, fixes_made
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            self.report['files_processed'] += 1
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            modified_content, fixes_made = self.fix_file_content(content, file_path)
            
            if fixes_made:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修复后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                
                self.report['files_modified'] += 1
                self.report['total_fixes'] += len(fixes_made)
                
                file_detail = {
                    'file': str(file_path.relative_to(self.root_dir)),
                    'fixes_count': len(fixes_made),
                    'fixes': fixes_made
                }
                self.report['fix_details'].append(file_detail)
                
                print(f"✓ 修复文件: {file_path.relative_to(self.root_dir)} ({len(fixes_made)} 处修复)")
            
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {str(e)}"
            self.report['errors'].append(error_msg)
            print(f"✗ {error_msg}")
    
    def find_typescript_files(self):
        """查找需要处理的TypeScript文件"""
        files = []
        
        # 前端文件
        src_dir = self.root_dir / 'src'
        if src_dir.exists():
            for ext in ['*.ts', '*.tsx']:
                files.extend(src_dir.rglob(ext))
        
        # 后端文件
        backend_src_dir = self.root_dir / 'backend' / 'src'
        if backend_src_dir.exists():
            for ext in ['*.ts']:
                files.extend(backend_src_dir.rglob(ext))
        
        # 过滤掉测试文件和node_modules
        filtered_files = []
        for file in files:
            if 'node_modules' in str(file) or '__tests__' in str(file) or '.test.' in str(file) or '.spec.' in str(file):
                continue
            filtered_files.append(file)
        
        return filtered_files
    
    def run_typescript_check(self):
        """运行TypeScript编译检查"""
        print("\n🔍 运行TypeScript编译检查...")
        
        # 检查前端
        frontend_result = os.system('npx tsc --noEmit')
        
        # 检查后端
        backend_result = os.system('cd backend && npx tsc --noEmit')
        
        return frontend_result == 0 and backend_result == 0
    
    def generate_report(self):
        """生成修复报告"""
        report_path = self.root_dir / 'precise_syntax_fix_report.md'
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(f"# 精确语法错误修复报告\n\n")
            f.write(f"**修复时间**: {self.report['timestamp']}\n\n")
            f.write(f"## 修复统计\n\n")
            f.write(f"- 处理文件数: {self.report['files_processed']}\n")
            f.write(f"- 修改文件数: {self.report['files_modified']}\n")
            f.write(f"- 总修复数: {self.report['total_fixes']}\n\n")
            
            if self.report['fix_details']:
                f.write(f"## 修复详情\n\n")
                for detail in self.report['fix_details']:
                    f.write(f"### {detail['file']} ({detail['fixes_count']} 处修复)\n\n")
                    for fix in detail['fixes']:
                        f.write(f"**第 {fix['line']} 行** - {fix['type']}:\n")
                        f.write(f"- 修复前: `{fix['before']}`\n")
                        f.write(f"- 修复后: `{fix['after']}`\n\n")
            
            if self.report['errors']:
                f.write(f"## 错误记录\n\n")
                for error in self.report['errors']:
                    f.write(f"- {error}\n")
        
        # 保存JSON格式报告
        json_report_path = self.root_dir / 'precise_syntax_fix_report.json'
        with open(json_report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 修复报告已生成:")
        print(f"   - Markdown: {report_path}")
        print(f"   - JSON: {json_report_path}")
    
    def run(self):
        """执行修复流程"""
        print("🚀 开始精确语法错误修复...")
        print(f"📁 工作目录: {self.root_dir}")
        
        # 创建备份
        self.create_backup()
        
        # 查找文件
        files = self.find_typescript_files()
        print(f"📄 找到 {len(files)} 个TypeScript文件")
        
        if not files:
            print("⚠️ 未找到需要处理的文件")
            return
        
        # 处理文件
        print("\n🔧 开始修复文件...")
        for file_path in files:
            self.process_file(file_path)
        
        # 生成报告
        self.generate_report()
        
        # 运行编译检查
        compile_success = self.run_typescript_check()
        
        print(f"\n✅ 修复完成!")
        print(f"📊 修复统计:")
        print(f"   - 处理文件: {self.report['files_processed']}")
        print(f"   - 修改文件: {self.report['files_modified']}")
        print(f"   - 总修复数: {self.report['total_fixes']}")
        print(f"   - 编译检查: {'✅ 通过' if compile_success else '❌ 仍有错误'}")
        print(f"💾 备份目录: {self.backup_dir}")

if __name__ == '__main__':
    fixer = PreciseSyntaxFixer()
    fixer.run()