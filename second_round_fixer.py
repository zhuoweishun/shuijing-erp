#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第二轮错误修复脚本 - 处理变量名不一致和未定义变量问题
专门处理剩余的238个TypeScript错误
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

class SecondRoundFixer:
    def __init__(self):
        self.src_dir = Path('src')
        self.backup_dir = Path('backups') / f'second_round_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        self.fixes_applied = []
        
        # 变量名修复映射
        self.variable_fixes = {
            # 未定义变量修复
            'piece_count': 'piece_count_value',
            'getFilterPosition': 'get_filter_position',
            'updateFilterPosition': 'update_filter_position',
            'category_name': 'category.name',
            'custom_state': 'custom_status',
            'labelKey': 'label_key',
            'selected_product_types': 'selected_product_type',
            'fetchHierarchicalInventory': 'fetch_hierarchical_inventory',
            'getApiUrl': 'get_api_url',
            'profitMargin': 'profit_margin',
            'laborCost': 'labor_cost',
            'craftCost': 'craft_cost',
            'userAgent': 'user_agent',
            'DropzoneUpload': 'dropzone_upload',
            
            # API方法名修复
            'upload_purchase_images': 'uploadPurchaseImages',
            'delete_purchase_images': 'deletePurchaseImages',
            'batch_create': 'batchCreate',
            'parse_crystal_purchase': 'parseCrystalPurchase',
            
            # DOM API修复
            'revoke_object_u_r_l': 'revokeObjectURL',
            'char_code_at': 'charCodeAt',
            'find_index': 'findIndex',
            'media_devices': 'mediaDevices',
            'read_as_data_u_r_l': 'readAsDataURL',
            'get_entries_by_type': 'getEntriesByType',
            'set_state': 'setState',
            'shift_key': 'shiftKey',
            
            # React Hook修复
            'use_form': 'useForm',
            'use_dropzone': 'useDropzone',
            'get_root_props': 'getRootProps',
            
            # 测试方法修复
            'to_be_disabled': 'toBeDisabled',
            'to_have_value': 'toHaveValue',
            'toHaveBeenCalled_times': 'toHaveBeenCalledTimes'
        }
        
        # 属性访问修复
        self.property_fixes = {
            'username': 'user_name',
            'isAuthenticated': 'is_authenticated',
            'isBoss': 'is_boss',
            'laborCost': 'labor_cost',
            'craftCost': 'craft_cost'
        }
        
        # 组件属性修复 - 从驼峰改回蛇形
        self.component_prop_fixes = {
            'onSubmit': 'on_submit',
            'onCancel': 'on_cancel'
        }
    
    def create_backup(self):
        """创建源代码备份"""
        if self.src_dir.exists():
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            shutil.copytree(self.src_dir, self.backup_dir / 'src')
            print(f"✅ 备份已创建: {self.backup_dir}")
    
    def fix_undefined_variables(self, content, file_path):
        """修复未定义变量"""
        fixes = 0
        
        for wrong_name, correct_name in self.variable_fixes.items():
            # 修复变量引用
            pattern = rf'\b{re.escape(wrong_name)}\b'
            if re.search(pattern, content):
                content = re.sub(pattern, correct_name, content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'undefined_variable',
                    'from': wrong_name,
                    'to': correct_name
                })
        
        return content, fixes
    
    def fix_property_access(self, content, file_path):
        """修复属性访问错误"""
        fixes = 0
        
        for wrong_prop, correct_prop in self.property_fixes.items():
            # 修复对象属性访问
            pattern = rf'\.{re.escape(wrong_prop)}\b'
            if re.search(pattern, content):
                content = re.sub(pattern, f'.{correct_prop}', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'property_access',
                    'from': wrong_prop,
                    'to': correct_prop
                })
        
        return content, fixes
    
    def fix_component_props(self, content, file_path):
        """修复组件属性"""
        fixes = 0
        
        for camel_prop, snake_prop in self.component_prop_fixes.items():
            # 修复JSX组件属性
            pattern = rf'\b{re.escape(camel_prop)}='
            if re.search(pattern, content):
                content = re.sub(pattern, f'{snake_prop}=', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'component_prop',
                    'from': camel_prop,
                    'to': snake_prop
                })
        
        return content, fixes
    
    def fix_import_statements(self, content, file_path):
        """修复导入语句"""
        fixes = 0
        
        # 修复错误的导入
        import_fixes = [
            (r'import.*use_form.*from.*react-hook-form', 'import { useForm } from "react-hook-form";'),
            (r'import.*use_dropzone.*from.*react-dropzone', 'import { useDropzone } from "react-dropzone";'),
            (r'import.*getApiUrl.*from.*\.\./services/api', 'import { get_api_url } from "../services/api";')
        ]
        
        for pattern, replacement in import_fixes:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'import_statement',
                    'pattern': pattern,
                    'replacement': replacement
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
            r'const\s+loading\s*=.*?;',
            r'const\s+inventory_status\s*=.*?;',
            r'const\s+use_dropzone\s*=.*?;',
            r'const\s+getApiUrl\s*=.*?;',
            r'const\s+isAuthenticated\s*=.*?;',
            r'const\s+isBoss\s*=.*?;',
            r'const\s+labor_cost\s*=.*?;',
            r'const\s+craft_cost\s*=.*?;',
            r'const\s+profit_margin\s*=.*?;',
            r'const\s+user_agent\s*=.*?;',
            r'const\s+Dropzone_upload\s*=.*?;',
            r'const\s+getRootProps\s*=.*?;',
            r'const\s+use_form\s*=.*?;'
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
    
    def fix_form_state_issues(self, content, file_path):
        """修复FormState相关问题"""
        fixes = 0
        
        # 修复FormState键名问题
        if 'SkuDestroyForm.tsx' in str(file_path):
            # 修复returnToMaterial键名
            content = content.replace('"returnToMaterial"', '"return_to_material"')
            content = content.replace("'returnToMaterial'", "'return_to_material'")
            fixes += 1
            
        # 修复对象属性问题
        if 'ProductEntry.tsx' in str(file_path):
            # 修复minQuantity属性
            content = content.replace('minQuantity:', 'min_quantity:')
            fixes += 1
            
        if fixes > 0:
            self.fixes_applied.append({
                'file': str(file_path),
                'type': 'form_state_fix',
                'description': f'Fixed {fixes} form state issues'
            })
        
        return content, fixes
    
    def fix_jsx_elements(self, content, file_path):
        """修复JSX元素问题"""
        fixes = 0
        
        # 修复自定义JSX元素
        if 'Financial.tsx' in str(file_path):
            # 移除不存在的inventory_status元素
            content = re.sub(r'<inventory_status[^>]*>[^<]*</inventory_status>', '', content)
            fixes += 1
            
        if fixes > 0:
            self.fixes_applied.append({
                'file': str(file_path),
                'type': 'jsx_element_fix',
                'description': f'Fixed {fixes} JSX element issues'
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
            content, fixes = self.fix_undefined_variables(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_property_access(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_component_props(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_import_statements(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_unused_variables(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_form_state_issues(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_jsx_elements(content, file_path)
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
        print("🔧 开始第二轮错误修复...")
        
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
        
        with open('second_round_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📊 第二轮修复完成!")
        print(f"   总修复数: {total_fixes}")
        print(f"   修改文件: {file_count}")
        print(f"   备份位置: {self.backup_dir}")
        print(f"   详细报告: second_round_fix_report.json")
        print(f"\n🔍 请运行 'npm run build' 检查错误数量变化")

if __name__ == '__main__':
    fixer = SecondRoundFixer()
    fixer.run()