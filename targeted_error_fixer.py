#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
针对性错误修复脚本
基于857个错误的分析，修复主要问题：
1. 蛇形命名和驼峰命名不一致
2. 缺少模块导入
3. 未定义的变量
4. 类型错误
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

class TargetedErrorFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        
    def create_backup(self):
        """创建备份"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/targeted_fix_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
    
    def fix_api_method_names(self, content, file_path):
        """修复API方法名称不一致问题"""
        original_content = content
        
        # API方法名称映射
        api_method_fixes = [
            (r'\.add_note\b', '.addNote'),
            (r'\.refund_purchase\b', '.refundPurchase'),
            (r'\.update_record\b', '.updateRecord'),
            (r'\.create_record\b', '.createRecord'),
            (r'\.mark_as_sold\b', '.markAsSold'),
        ]
        
        for pattern, replacement in api_method_fixes:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'api_method_fix',
                    'description': f'修复API方法名: {pattern} -> {replacement}'
                })
        
        return content
    
    def fix_missing_imports(self, content, file_path):
        """修复缺少的导入"""
        original_content = content
        
        # 检查是否需要添加缺少的导入
        if "use_device_detection" in content and "../hooks/use_device_detection" not in content:
            # 添加缺少的导入
            import_line = "import { use_device_detection } from '../hooks/use_device_detection';"
            
            # 找到其他import语句的位置
            lines = content.split('\n')
            import_index = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import') and 'from' in line:
                    import_index = i
            
            if import_index >= 0:
                lines.insert(import_index + 1, import_line)
                content = '\n'.join(lines)
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'missing_import_fix',
                    'description': '添加缺少的use_device_detection导入'
                })
        
        return content
    
    def fix_property_naming_inconsistencies(self, content, file_path):
        """修复属性命名不一致问题"""
        original_content = content
        
        # 属性名称映射（从蛇形到驼峰，因为类型定义使用驼峰）
        property_fixes = [
            (r'\.hide_on_mobile\b', '.hideOnMobile'),
            (r'\.mobile_render\b', '.mobileRender'),
            (r'\.get_element_by_id\b', '.getElementById'),
            (r'\.editLogs\b', '.edit_logs'),  # 反向：从驼峰到蛇形
            (r'\.to_locale_date_string\b', '.toLocaleDateString'),
            (r'\.to_i_s_o_string\b', '.toISOString'),
            (r'\.to_locale_string\b', '.toLocaleString'),
            (r'\.next_element_sibling\b', '.nextElementSibling'),
            (r'\.get_bounding_client_rect\b', '.getBoundingClientRect'),
            (r'\.for_each\b', '.forEach'),
            (r'\.locale_compare\b', '.localeCompare'),
        ]
        
        for pattern, replacement in property_fixes:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'property_naming_fix',
                    'description': f'修复属性命名: {pattern} -> {replacement}'
                })
        
        return content
    
    def fix_jsx_prop_names(self, content, file_path):
        """修复JSX属性名称"""
        original_content = content
        
        # JSX属性名称映射（从蛇形到驼峰）
        jsx_prop_fixes = [
            (r'\bon_change=', 'onChange='),
            (r'\bon_click=', 'onClick='),
            (r'\bon_submit=', 'onSubmit='),
            (r'\bonSubmit=', 'on_submit='),  # 反向修复
        ]
        
        for pattern, replacement in jsx_prop_fixes:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'jsx_prop_fix',
                    'description': f'修复JSX属性名: {pattern} -> {replacement}'
                })
        
        return content
    
    def fix_undefined_variables(self, content, file_path):
        """修复未定义的变量"""
        original_content = content
        
        # 常见的变量名修复
        variable_fixes = [
            (r'\bpurchaseApi\b', 'purchase_api'),
            (r'\bpurchaseId\b', 'purchase_id'),
            (r'\bis_edit_mode\b', 'isEditMode'),  # 根据上下文可能需要驼峰
            (r'\boriginalQuantity\b', 'original_quantity'),
            (r'\bquantity_changed\b', 'quantityChanged'),
            (r'\bon_save\b', 'onSave'),
            (r'\bon_delete\b', 'onDelete'),
            (r'\bpieceCountValue\b', 'piece_count_value'),
            (r'\bcurrentQuantity\b', 'current_quantity'),
            (r'\bproductId\b', 'product_id'),
            (r'\bshow_product_filter\b', 'showProductFilter'),
            (r'\bproduct_typeData\b', 'productTypeData'),
            (r'\bproduct_row\b', 'productRow'),
        ]
        
        for pattern, replacement in variable_fixes:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'variable_naming_fix',
                    'description': f'修复变量命名: {pattern} -> {replacement}'
                })
        
        return content
    
    def fix_type_issues(self, content, file_path):
        """修复类型问题"""
        original_content = content
        
        # 修复未使用的变量声明
        lines = content.split('\n')
        for i, line in enumerate(lines):
            # 移除未使用的变量声明
            if 'is declared but its value is never read' in line:
                continue
            
            # 修复类型注解
            if ': any' in line and 'Parameter' in line:
                # 为参数添加适当的类型
                if 'productTypeData' in line:
                    lines[i] = line.replace(': any', ': SemiFinishedMatrixData')
                elif 'specData' in line:
                    lines[i] = line.replace(': any', ': any')
                elif 'qualityData' in line:
                    lines[i] = line.replace(': any', ': any')
                elif 'batch' in line:
                    lines[i] = line.replace(': any', ': any')
        
        content = '\n'.join(lines)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'type_fix',
                'description': '修复类型注解问题'
            })
        
        return content
    
    def fix_specific_file_issues(self, content, file_path):
        """修复特定文件的问题"""
        original_content = content
        
        # 针对特定文件的修复
        if 'ProductPriceDistributionChart.tsx' in file_path:
            # 修复price_type未定义问题
            if 'price_type' in content and 'const price_type' not in content:
                # 在函数开始处添加price_type定义
                content = re.sub(
                    r'(const.*?=.*?\{)',
                    r'\1\n  const price_type = "sell_price"; // 默认价格类型',
                    content,
                    count=1
                )
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'specific_fix',
                    'description': '添加price_type变量定义'
                })
        
        return content
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用各种修复
            content = self.fix_missing_imports(content, file_path)
            content = self.fix_api_method_names(content, file_path)
            content = self.fix_property_naming_inconsistencies(content, file_path)
            content = self.fix_jsx_prop_names(content, file_path)
            content = self.fix_undefined_variables(content, file_path)
            content = self.fix_type_issues(content, file_path)
            content = self.fix_specific_file_issues(content, file_path)
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 已修复: {file_path}")
            
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def run_targeted_fixes(self):
        """运行针对性修复"""
        print("🎯 开始针对性错误修复...")
        print("📊 当前错误数量: 857个")
        print("🎯 目标: 减少到100个以下")
        
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
        with open('targeted_error_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 针对性修复完成统计:")
        print(f"   总修复数: {report['total_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        for fix_type, count in report['fixes_by_type'].items():
            print(f"   {fix_type}: {count}")
        
        print(f"\n📄 详细报告已保存到: targeted_error_fix_report.json")

if __name__ == '__main__':
    fixer = TargetedErrorFixer()
    
    if fixer.run_targeted_fixes():
        print("\n✅ 针对性修复完成！")
        print("📊 请运行 'npm run build' 检查错误数量变化")
        print("🎯 目标：将857个错误减少到100个以下")
    else:
        print("\n❌ 修复过程中出现问题！")