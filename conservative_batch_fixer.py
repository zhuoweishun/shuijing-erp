#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
保守的批量修复脚本
目标：将构建错误从当前状态减少到1000个以下
策略：只修复最常见、最安全的错误类型
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

class ConservativeBatchFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        self.backup_created = False
        
    def create_backup(self):
        """创建备份"""
        if self.backup_created:
            return
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/conservative_fix_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
            self.backup_created = True
    
    def fix_import_statements(self, content, file_path):
        """修复import语句中的常见问题"""
        original_content = content
        
        # 修复import语句中的多余分号
        content = re.sub(r'import\s+([^;]+);\s*from', r'import \1 from', content)
        
        # 修复import语句中的多余逗号
        content = re.sub(r'import\s*{([^}]+),\s*}\s*from', r'import {\1} from', content)
        
        # 修复export语句中的多余分号
        content = re.sub(r'export\s+([^;]+);\s*from', r'export \1 from', content)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'import_statement_fix',
                'description': '修复import/export语句语法'
            })
        
        return content
    
    def fix_interface_syntax(self, content, file_path):
        """修复interface语法问题"""
        original_content = content
        
        # 修复interface中的分号和逗号混用
        lines = content.split('\n')
        in_interface = False
        interface_depth = 0
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # 检测interface开始
            if re.match(r'^interface\s+\w+', stripped):
                in_interface = True
                interface_depth = 0
            
            if in_interface:
                # 计算大括号深度
                interface_depth += line.count('{') - line.count('}')
                
                # 在interface内部，修复属性定义
                if interface_depth > 0 and ':' in line and not line.strip().startswith('//'):
                    # 修复属性定义末尾的逗号为分号
                    if line.rstrip().endswith(',') and not line.strip().endswith('},'):
                        lines[i] = line.rstrip()[:-1] + ';'
                
                # interface结束
                if interface_depth <= 0 and '}' in line:
                    in_interface = False
        
        content = '\n'.join(lines)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'interface_syntax_fix',
                'description': '修复interface语法问题'
            })
        
        return content
    
    def fix_function_syntax(self, content, file_path):
        """修复函数语法问题"""
        original_content = content
        
        # 修复函数参数中的多余逗号
        content = re.sub(r'\(([^)]+),\s*\)', r'(\1)', content)
        
        # 修复箭头函数语法
        content = re.sub(r'=>\s*{([^}]+)},', r'=> {\1}', content)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'function_syntax_fix',
                'description': '修复函数语法问题'
            })
        
        return content
    
    def fix_jsx_syntax(self, content, file_path):
        """修复JSX语法问题"""
        original_content = content
        
        # 修复JSX属性中的多余逗号
        content = re.sub(r'(\w+)=\{([^}]+)\},', r'\1={\2}', content)
        
        # 修复JSX标签闭合问题
        content = re.sub(r'<(\w+)([^>]*)/,>', r'<\1\2 />', content)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'jsx_syntax_fix',
                'description': '修复JSX语法问题'
            })
        
        return content
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用各种修复
            content = self.fix_import_statements(content, file_path)
            content = self.fix_interface_syntax(content, file_path)
            content = self.fix_function_syntax(content, file_path)
            
            # 只对.tsx文件应用JSX修复
            if file_path.endswith('.tsx'):
                content = self.fix_jsx_syntax(content, file_path)
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 已修复: {file_path}")
            
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def run_conservative_fixes(self):
        """运行保守修复"""
        print("🔧 开始保守批量修复...")
        
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
        with open('conservative_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 修复完成统计:")
        print(f"   总修复数: {report['total_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        for fix_type, count in report['fixes_by_type'].items():
            print(f"   {fix_type}: {count}")
        
        print(f"\n📄 详细报告已保存到: conservative_fix_report.json")

if __name__ == '__main__':
    fixer = ConservativeBatchFixer()
    
    if fixer.run_conservative_fixes():
        print("\n✅ 保守修复完成！")
        print("📊 请运行 'npm run build' 检查错误数量变化")
        print("🎯 目标：将错误数量减少到1000个以下")
    else:
        print("\n❌ 修复过程中出现问题！")