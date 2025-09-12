#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
蛇形命名修复脚本 - 修复React/TypeScript中的命名冲突
专门处理蛇形命名与React标准属性的冲突问题
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

class SnakeCaseFixer:
    def __init__(self):
        self.src_dir = Path('src')
        self.backup_dir = Path('backups') / f'snake_case_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        self.fixes_applied = []
        
        # React标准属性映射 - 蛇形到驼峰
        self.react_props_mapping = {
            'on_submit': 'onSubmit',
            'on_cancel': 'onCancel', 
            'input_mode': 'inputMode',
            'user_agent': 'userAgent',
            'inner_width': 'innerWidth',
            'inner_height': 'innerHeight',
            'to_upper_case': 'toUpperCase',
            'get_by_text': 'getByText',
            'get_by_label_text': 'getByLabelText',
            'query_by_text': 'queryByText',
            'to_be_in_the_document': 'toBeInTheDocument',
            'to_have_been_called_times': 'toHaveBeenCalledTimes',
            'object_containing': 'objectContaining'
        }
        
        # 变量名映射 - 保持蛇形但修复错误引用
        self.variable_fixes = {
            'cost_adjustment': 'costAdjustment',  # FormErrors中的字段
            'customer_address': 'customerAddress',  # FormErrors中的字段
            'piece_count_value': 'piece_count',  # 变量名修正
            'use_auth': 'useAuth',  # Hook名称
            'Test_wrapper': 'TestWrapper',  # 组件名称
            'use_device_detection': 'useDeviceDetection'  # Hook名称重复定义问题
        }
    
    def create_backup(self):
        """创建源代码备份"""
        if self.src_dir.exists():
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            shutil.copytree(self.src_dir, self.backup_dir / 'src')
            print(f"✅ 备份已创建: {self.backup_dir}")
    
    def fix_react_props(self, content, file_path):
        """修复React属性命名"""
        fixes = 0
        
        for snake_prop, camel_prop in self.react_props_mapping.items():
            # 修复JSX属性
            pattern = rf'\b{snake_prop}='
            if re.search(pattern, content):
                content = re.sub(pattern, f'{camel_prop}=', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'react_prop',
                    'from': snake_prop,
                    'to': camel_prop
                })
            
            # 修复对象属性访问
            pattern = rf'\.{snake_prop}\b'
            if re.search(pattern, content):
                content = re.sub(pattern, f'.{camel_prop}', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'property_access',
                    'from': snake_prop,
                    'to': camel_prop
                })
        
        return content, fixes
    
    def fix_variable_references(self, content, file_path):
        """修复变量引用错误"""
        fixes = 0
        
        for wrong_name, correct_name in self.variable_fixes.items():
            # 修复变量引用
            pattern = rf'\b{wrong_name}\b'
            if re.search(pattern, content):
                content = re.sub(pattern, correct_name, content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'variable_reference',
                    'from': wrong_name,
                    'to': correct_name
                })
        
        return content, fixes
    
    def fix_form_state_keys(self, content, file_path):
        """修复FormState键名问题"""
        fixes = 0
        
        # 修复FormState中的键名引用
        form_state_fixes = {
            '"costAdjustment"': '"cost_adjustment"',
            '"customerAddress"': '"customer_address"',
            '"returnToMaterial"': '"return_to_material"'
        }
        
        for wrong_key, correct_key in form_state_fixes.items():
            if wrong_key in content:
                content = content.replace(wrong_key, correct_key)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'form_state_key',
                    'from': wrong_key,
                    'to': correct_key
                })
        
        return content, fixes
    
    def fix_duplicate_declarations(self, content, file_path):
        """修复重复声明问题"""
        fixes = 0
        
        # 修复useDeviceDetection重复声明
        if 'useDeviceDetection.tsx' in str(file_path):
            # 移除重复的导入和声明
            lines = content.split('\n')
            new_lines = []
            seen_declarations = set()
            
            for line in lines:
                # 跳过重复的导入
                if 'import { use_device_detection }' in line:
                    continue
                # 跳过重复的函数声明
                if 'function use_device_detection' in line or 'const use_device_detection' in line:
                    if 'use_device_detection' not in seen_declarations:
                        seen_declarations.add('use_device_detection')
                        new_lines.append(line)
                    else:
                        fixes += 1
                        continue
                else:
                    new_lines.append(line)
            
            content = '\n'.join(new_lines)
            
            if fixes > 0:
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'duplicate_declaration',
                    'description': f'Removed {fixes} duplicate declarations'
                })
        
        return content, fixes
    
    def fix_unused_variables(self, content, file_path):
        """修复未使用变量"""
        fixes = 0
        
        # 移除未使用的变量声明
        unused_patterns = [
            r'const\s+base_color\s*=.*?;',
            r'const\s+total\s*=.*?;',
            r'const\s+Label\s*=.*?;',
            r'const\s+loading\s*=.*?;'
        ]
        
        for pattern in unused_patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, '', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'unused_variable',
                    'pattern': pattern
                })
        
        return content, fixes
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            total_fixes = 0
            
            # 应用各种修复
            content, fixes = self.fix_react_props(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_variable_references(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_form_state_keys(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_duplicate_declarations(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_unused_variables(content, file_path)
            total_fixes += fixes
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 修复文件: {file_path} ({total_fixes} 个问题)")
            
            return total_fixes
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return 0
    
    def run(self):
        """运行修复程序"""
        print("🔧 开始蛇形命名修复...")
        
        # 创建备份
        self.create_backup()
        
        # 处理所有TypeScript/TSX文件
        total_fixes = 0
        file_count = 0
        
        for file_path in self.src_dir.rglob('*.ts*'):
            if file_path.is_file():
                fixes = self.process_file(file_path)
                total_fixes += fixes
                if fixes > 0:
                    file_count += 1
        
        # 生成报告
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_fixes': total_fixes,
            'files_modified': file_count,
            'backup_location': str(self.backup_dir),
            'fixes_applied': self.fixes_applied
        }
        
        with open('snake_case_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📊 修复完成!")
        print(f"   总修复数: {total_fixes}")
        print(f"   修改文件: {file_count}")
        print(f"   备份位置: {self.backup_dir}")
        print(f"   详细报告: snake_case_fix_report.json")
        print(f"\n🔍 请运行 'npm run build' 检查错误数量变化")

if __name__ == '__main__':
    fixer = SnakeCaseFixer()
    fixer.run()