#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优先级1修复脚本：恢复JavaScript内置方法的标准命名
只修复JavaScript标准API，保护业务代码的蛇形命名
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

class JavaScriptAPIFixer:
    def __init__(self):
        self.backend_dir = Path('.')
        self.src_dir = self.backend_dir / 'src'
        self.backup_dir = Path('../backups/priority1_js_api_fixes')
        self.fix_count = 0
        self.processed_files = 0
        self.modified_files = 0
        self.fix_log = []
        
        # JavaScript内置方法白名单 - 只修复这些标准API
        self.js_api_whitelist = {
            # Date对象方法
            r'\.get_time\(': '.getTime(',
            r'\.get_full_year\(': '.getFullYear(',
            r'\.get_month\(': '.getMonth(',
            r'\.get_date\(': '.getDate(',
            r'\.get_hours\(': '.getHours(',
            r'\.get_minutes\(': '.getMinutes(',
            r'\.get_seconds\(': '.getSeconds(',
            r'\.set_time\(': '.setTime(',
            r'\.set_full_year\(': '.setFullYear(',
            r'\.to_iso_string\(': '.toISOString(',
            
            # String对象方法
            r'\.to_string\(': '.toString(',
            r'\.to_lower_case\(': '.toLowerCase(',
            r'\.to_upper_case\(': '.toUpperCase(',
            r'\.char_at\(': '.charAt(',
            r'\.char_code_at\(': '.charCodeAt(',
            r'\.index_of\(': '.indexOf(',
            r'\.last_index_of\(': '.lastIndexOf(',
            r'\.sub_string\(': '.substring(',
            r'\.sub_str\(': '.substr(',
            r'\.replace_all\(': '.replaceAll(',
            r'\.trim_start\(': '.trimStart(',
            r'\.trim_end\(': '.trimEnd(',
            r'\.pad_start\(': '.padStart(',
            r'\.pad_end\(': '.padEnd(',
            
            # Number对象方法
            r'\.to_fixed\(': '.toFixed(',
            r'\.to_precision\(': '.toPrecision(',
            r'\.to_exponential\(': '.toExponential(',
            r'\.value_of\(': '.valueOf(',
            
            # Array对象方法
            r'\.for_each\(': '.forEach(',
            r'\.find_index\(': '.findIndex(',
            r'\.includes\(': '.includes(',
            r'\.index_of\(': '.indexOf(',
            r'\.last_index_of\(': '.lastIndexOf(',
            r'\.reduce_right\(': '.reduceRight(',
            
            # Object对象方法
            r'Object\.keys\(': 'Object.keys(',
            r'Object\.values\(': 'Object.values(',
            r'Object\.entries\(': 'Object.entries(',
            r'Object\.assign\(': 'Object.assign(',
            r'Object\.has_own_property\(': 'Object.hasOwnProperty(',
            
            # 全局函数
            r'\bparse_int\(': 'parseInt(',
            r'\bparse_float\(': 'parseFloat(',
            r'\bis_na_n\(': 'isNaN(',
            r'\bis_finite\(': 'isFinite(',
            r'\bset_timeout\(': 'setTimeout(',
            r'\bset_interval\(': 'setInterval(',
            r'\bclear_timeout\(': 'clearTimeout(',
            r'\bclear_interval\(': 'clearInterval(',
            
            # JSON对象方法
            r'JSON\.parse\(': 'JSON.parse(',
            r'JSON\.stringify\(': 'JSON.stringify(',
            
            # Math对象方法
            r'Math\.abs\(': 'Math.abs(',
            r'Math\.ceil\(': 'Math.ceil(',
            r'Math\.floor\(': 'Math.floor(',
            r'Math\.round\(': 'Math.round(',
            r'Math\.max\(': 'Math.max(',
            r'Math\.min\(': 'Math.min(',
            r'Math\.random\(': 'Math.random(',
            
            # Console对象方法
            r'console\.log\(': 'console.log(',
            r'console\.error\(': 'console.error(',
            r'console\.warn\(': 'console.warn(',
            r'console\.info\(': 'console.info(',
            r'console\.debug\(': 'console.debug(',
        }
    
    def create_backup(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
    
    def backup_file(self, file_path):
        """备份单个文件"""
        relative_path = file_path.relative_to(self.backend_dir)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
    
    def fix_js_api_in_file(self, file_path):
        """修复单个文件中的JavaScript API命名"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            file_fixes = 0
            
            # 应用JavaScript API修复
            for pattern, replacement in self.js_api_whitelist.items():
                matches = re.findall(pattern, content)
                if matches:
                    content = re.sub(pattern, replacement, content)
                    fix_count = len(matches)
                    file_fixes += fix_count
                    self.fix_log.append({
                        'file': str(file_path.relative_to(self.backend_dir)),
                        'pattern': pattern,
                        'replacement': replacement,
                        'count': fix_count
                    })
            
            # 如果有修改，保存文件
            if content != original_content:
                self.backup_file(file_path)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.modified_files += 1
                self.fix_count += file_fixes
                print(f"✅ 修复 {file_path.name}: {file_fixes}处")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return False
    
    def process_directory(self):
        """处理src目录下的所有TypeScript文件"""
        ts_files = list(self.src_dir.rglob('*.ts'))
        
        print(f"📁 找到 {len(ts_files)} 个TypeScript文件")
        
        for file_path in ts_files:
            self.processed_files += 1
            self.fix_js_api_in_file(file_path)
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'processed_files': self.processed_files,
                'modified_files': self.modified_files,
                'total_fixes': self.fix_count
            },
            'fixes_by_file': {},
            'fixes_by_pattern': {},
            'detailed_log': self.fix_log
        }
        
        # 按文件统计
        for log in self.fix_log:
            file_name = log['file']
            if file_name not in report['fixes_by_file']:
                report['fixes_by_file'][file_name] = 0
            report['fixes_by_file'][file_name] += log['count']
        
        # 按模式统计
        for log in self.fix_log:
            pattern = log['pattern']
            if pattern not in report['fixes_by_pattern']:
                report['fixes_by_pattern'][pattern] = 0
            report['fixes_by_pattern'][pattern] += log['count']
        
        # 保存JSON报告
        with open('priority1_js_api_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # 生成Markdown报告
        self.generate_markdown_report(report)
        
        return report
    
    def generate_markdown_report(self, report):
        """生成Markdown格式的报告"""
        md_content = f"""# 优先级1修复报告：JavaScript内置方法命名修复

## 修复概要

- **处理文件数**: {report['summary']['processed_files']}
- **修改文件数**: {report['summary']['modified_files']}
- **总修复数**: {report['summary']['total_fixes']}
- **修复时间**: {report['timestamp']}

## 修复策略

- ✅ 只修复JavaScript标准API方法
- ✅ 建立白名单保护机制
- ✅ 保护业务代码的蛇形命名
- ✅ 精确匹配，避免误修复

## 按文件统计

| 文件 | 修复数量 |
|------|----------|
"""
        
        for file_name, count in sorted(report['fixes_by_file'].items(), key=lambda x: x[1], reverse=True):
            md_content += f"| {file_name} | {count} |\n"
        
        md_content += "\n## 按修复模式统计\n\n| 修复模式 | 修复数量 |\n|----------|----------|\n"
        
        for pattern, count in sorted(report['fixes_by_pattern'].items(), key=lambda x: x[1], reverse=True):
            md_content += f"| `{pattern}` | {count} |\n"
        
        md_content += f"\n## 备份位置\n\n所有修改的文件已备份至: `{self.backup_dir}`\n"
        
        with open('priority1_js_api_fix_report.md', 'w', encoding='utf-8') as f:
            f.write(md_content)
    
    def run_typescript_check(self):
        """运行TypeScript编译检查"""
        print("\n🔍 运行TypeScript编译检查...")
        result = os.system('npx tsc --noEmit')
        if result == 0:
            print("✅ TypeScript编译检查通过")
            return True
        else:
            print("❌ TypeScript编译检查失败")
            return False
    
    def run(self):
        """执行修复流程"""
        print("🚀 开始优先级1修复：JavaScript内置方法命名修复")
        print("📋 修复策略：只修复JavaScript标准API，保护业务代码蛇形命名")
        
        # 创建备份
        self.create_backup()
        
        # 处理文件
        self.process_directory()
        
        # 生成报告
        report = self.generate_report()
        
        # 运行编译检查
        compile_success = self.run_typescript_check()
        
        # 输出总结
        print(f"\n📊 修复完成总结:")
        print(f"   - 处理文件: {self.processed_files}个")
        print(f"   - 修改文件: {self.modified_files}个")
        print(f"   - 总修复数: {self.fix_count}处")
        print(f"   - 编译状态: {'✅ 通过' if compile_success else '❌ 失败'}")
        print(f"   - 备份位置: {self.backup_dir}")
        print(f"   - 报告文件: priority1_js_api_fix_report.md")
        
        return report

if __name__ == '__main__':
    fixer = JavaScriptAPIFixer()
    fixer.run()