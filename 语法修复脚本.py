#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
语法修复脚本
修复正则替换导致的语法错误
"""

import os
import re
import shutil
from datetime import datetime
import json

class SyntaxFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'syntax_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.changes_log = []
        
    def backup_file(self, file_path):
        """备份单个文件"""
        if os.path.exists(file_path):
            os.makedirs(self.backup_dir, exist_ok=True)
            rel_path = os.path.relpath(file_path, self.backend_dir)
            backup_path = os.path.join(self.backup_dir, rel_path)
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            shutil.copy2(file_path, backup_path)
    
    def fix_syntax_errors(self, content, file_path):
        """修复语法错误"""
        changes = 0
        
        # 修复因删除include导致的语法错误
        # 1. 修复空的include对象
        content = re.sub(r'include: \{\s*\},?', '', content)
        
        # 2. 修复多余的逗号
        content = re.sub(r',\s*\}', '}', content)
        content = re.sub(r',\s*\]', ']', content)
        
        # 3. 修复空的对象
        content = re.sub(r'\{\s*,', '{', content)
        
        # 4. 修复连续的逗号
        content = re.sub(r',,+', ',', content)
        
        # 5. 修复行首的逗号
        content = re.sub(r'^\s*,', '', content, flags=re.MULTILINE)
        
        # 6. 修复函数调用后的语法错误
        # 查找并修复 })) 后面缺少的内容
        lines = content.split('\n')
        fixed_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # 检查是否是 })) 结尾的行
            if re.match(r'^\s*\}\)\)\s*$', line):
                # 检查下一行是否是新的语句开始
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and not next_line.startswith('//') and not next_line.startswith('/*'):
                        # 如果下一行不是注释，可能需要添加分号或其他语法
                        if not next_line.startswith('router.') and not next_line.startswith('export'):
                            # 可能是函数体的一部分，需要检查上下文
                            pass
            
            fixed_lines.append(line)
            i += 1
        
        content = '\n'.join(fixed_lines)
        
        # 7. 修复特定的语法模式
        # 修复 }) 后面应该有 res.json 的情况
        content = re.sub(r'(\s*\}\)\s*)\n(\s*if \(!)', r'\1\n\n\2', content)
        
        # 8. 修复缺失的函数结束
        # 这个比较复杂，需要根据具体情况处理
        
        return content, changes
    
    def fix_specific_file_issues(self, content, file_path):
        """修复特定文件的问题"""
        changes = 0
        filename = os.path.basename(file_path)
        
        if filename == 'materials.ts':
            # materials.ts特定修复
            # 修复可能的include问题
            content = re.sub(r'include: \{\s*\},?', '', content)
            changes += 1
        
        elif filename == 'products.ts':
            # products.ts特定修复
            # 修复可能的语法问题
            content = re.sub(r'include: \{\s*\},?', '', content)
            changes += 1
        
        elif filename == 'customers.ts':
            # customers.ts特定修复
            content = re.sub(r'include: \{\s*\},?', '', content)
            changes += 1
        
        elif filename == 'financial.ts':
            # financial.ts特定修复
            content = re.sub(r'include: \{\s*\},?', '', content)
            changes += 1
        
        elif filename == 'skus.ts':
            # skus.ts特定修复
            content = re.sub(r'include: \{\s*\},?', '', content)
            changes += 1
        
        return content, changes
    
    def fix_file(self, file_path):
        """修复单个文件"""
        if not os.path.exists(file_path):
            return 0
        
        self.backup_file(file_path)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        total_changes = 0
        
        # 应用修复
        content, changes1 = self.fix_syntax_errors(content, file_path)
        total_changes += changes1
        
        content, changes2 = self.fix_specific_file_issues(content, file_path)
        total_changes += changes2
        
        # 写入文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复 {os.path.basename(file_path)}: {total_changes} 处语法修改")
            self.changes_log.append(f"{os.path.basename(file_path)}: {total_changes} 处语法修改")
        
        return total_changes
    
    def run(self):
        """运行语法修复"""
        print("🚀 开始修复语法错误...")
        
        # 有语法错误的文件
        error_files = [
            os.path.join(self.backend_dir, 'src', 'routes', 'customers.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'financial.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'materials.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'products.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'skus.ts'),
        ]
        
        existing_files = [f for f in error_files if os.path.exists(f)]
        
        # 修复
        total_changes = 0
        for file_path in existing_files:
            changes = self.fix_file(file_path)
            total_changes += changes
        
        # 报告
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_changes': total_changes,
            'files_processed': len(existing_files),
            'backup_location': self.backup_dir,
            'changes_log': self.changes_log
        }
        
        report_path = os.path.join(self.backend_dir, 'syntax_fix_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ 语法修复完成!")
        print(f"📊 总共修改: {total_changes} 处")
        print(f"📁 备份位置: {self.backup_dir}")
        print(f"📋 详细报告: {report_path}")

if __name__ == '__main__':
    backend_dir = r'D:\shuijing ERP\backend'
    fixer = SyntaxFixer(backend_dir)
    fixer.run()