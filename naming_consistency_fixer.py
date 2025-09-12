#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
命名一致性修复脚本
目标：修复蛇形命名和驼峰命名混用的问题
策略：统一使用蛇形命名规范
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

class NamingConsistencyFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        self.backup_created = False
        
        # 常见的命名映射：驼峰 -> 蛇形
        self.naming_fixes = {
            # React hooks 和状态
            'setLoading': 'set_loading',
            'isOpen': 'is_open',
            'isMobile': 'is_mobile',
            'useDeviceDetection': 'use_device_detection',
            'setViewMode': 'set_view_mode',
            'refundLoading': 'refund_loading',
            'selectedPurchase': 'selected_purchase',
            'customerLabels': 'customer_labels',
            'daysSinceLastPurchase': 'days_since_last_purchase',
            'lowStockOnly': 'low_stock_only',
            'specificationMin': 'specification_min',
            'specificationMax': 'specification_max',
            'reportType': 'report_type',
            'expandedRows': 'expanded_rows',
            'emptyText': 'empty_text',
            'searchValue': 'search_value',
            'searchPlaceholder': 'search_placeholder',
            'autoComplete': 'auto_complete',
            'inputMode': 'input_mode',
            'onChange': 'on_change',
            'onBlur': 'on_blur',
            'onClick': 'on_click',
            'isActive': 'is_active',
            
            # API 方法
            'customerApi': 'customer_api',
            'financialApi': 'financial_api',
            'inventoryApi': 'inventory_api',
            'addNote': 'add_note',
            'refundPurchase': 'refund_purchase',
            'createRecord': 'create_record',
            'getRecords': 'get_records',
            
            # JavaScript 内置方法
            'toFixed': 'to_fixed',
            'getTime': 'get_time',
            'getFullYear': 'get_full_year',
            'getMonth': 'get_month',
            'isArray': 'is_array',
            'createObjectURL': 'create_object_u_r_l',
            
            # HTML 属性
            'maxLength': 'max_length',
            'minLength': 'min_length',
        }
        
        # 反向映射：蛇形 -> 驼峰（用于修复错误的蛇形使用）
        self.reverse_fixes = {
            # JavaScript 内置方法应该保持驼峰
            'to_fixed': 'toFixed',
            'get_time': 'getTime', 
            'get_full_year': 'getFullYear',
            'get_month': 'getMonth',
            'is_array': 'isArray',
            'create_object_u_r_l': 'createObjectURL',
            
            # HTML 属性应该保持驼峰
            'max_length': 'maxLength',
            'min_length': 'minLength',
        }
        
    def create_backup(self):
        """创建备份"""
        if self.backup_created:
            return
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/naming_fix_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
            self.backup_created = True
    
    def fix_file_naming(self, file_path):
        """修复单个文件的命名问题"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            fixes_in_file = 0
            
            # 1. 修复变量声明和使用不一致的问题
            for camel_case, snake_case in self.naming_fixes.items():
                # 查找声明了蛇形但使用驼峰的情况
                if snake_case in content and camel_case in content:
                    # 统一使用蛇形命名
                    content = re.sub(r'\b' + re.escape(camel_case) + r'\b', snake_case, content)
                    fixes_in_file += 1
            
            # 2. 修复JavaScript内置方法和HTML属性的错误蛇形使用
            for snake_case, camel_case in self.reverse_fixes.items():
                if snake_case in content:
                    # 这些应该使用驼峰命名
                    content = re.sub(r'\b' + re.escape(snake_case) + r'\b', camel_case, content)
                    fixes_in_file += 1
            
            # 3. 修复特定的错误模式
            specific_fixes = [
                # 修复 Array.is_array -> Array.isArray
                (r'Array\.is_array', 'Array.isArray'),
                # 修复 URL.create_object_u_r_l -> URL.createObjectURL
                (r'URL\.create_object_u_r_l', 'URL.createObjectURL'),
                # 修复数字方法
                (r'\.to_fixed\(', '.toFixed('),
                # 修复日期方法
                (r'\.get_time\(', '.getTime('),
                (r'\.get_full_year\(', '.getFullYear('),
                (r'\.get_month\(', '.getMonth('),
            ]
            
            for pattern, replacement in specific_fixes:
                if re.search(pattern, content):
                    content = re.sub(pattern, replacement, content)
                    fixes_in_file += 1
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'naming_consistency_fix',
                    'description': f'修复 {fixes_in_file} 个命名不一致问题',
                    'fixes_count': fixes_in_file
                })
                
                print(f"✅ 已修复 {file_path} ({fixes_in_file} 个问题)")
                return True
            
            return False
            
        except Exception as e:
            error_msg = f"修复文件 {file_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
            return False
    
    def run_naming_fixes(self):
        """运行命名一致性修复"""
        print("🔧 开始命名一致性修复...")
        print("🎯 目标：统一蛇形命名规范，修复JavaScript内置方法")
        
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
        
        fixed_files = 0
        for file_path in files_to_process:
            if self.fix_file_naming(str(file_path)):
                fixed_files += 1
        
        print(f"\n📊 处理完成: 修复了 {fixed_files} 个文件")
        
        # 生成报告
        self.generate_report()
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        total_fixes = sum(fix.get('fixes_count', 1) for fix in self.fixes_applied)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_fixed': len(self.fixes_applied),
            'total_naming_fixes': total_fixes,
            'total_errors': len(self.errors_found),
            'fixes_applied': self.fixes_applied,
            'errors_found': self.errors_found
        }
        
        # 保存报告
        with open('naming_consistency_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 命名一致性修复完成统计:")
        print(f"   修复文件数: {report['total_files_fixed']}")
        print(f"   总修复数: {report['total_naming_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        if self.errors_found:
            print("\n❌ 发现的错误:")
            for error in self.errors_found:
                print(f"   - {error}")
        
        print(f"\n📄 详细报告已保存到: naming_consistency_fix_report.json")

if __name__ == '__main__':
    fixer = NamingConsistencyFixer()
    
    if fixer.run_naming_fixes():
        print("\n✅ 命名一致性修复完成！")
        print("📊 请运行 'npm run build' 检查错误数量变化")
        print("🎯 目标：将1173个错误大幅减少")
    else:
        print("\n❌ 修复过程中出现问题！")