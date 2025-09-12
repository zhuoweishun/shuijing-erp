#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第四阶段：导入/导出清理脚本
处理模块路径问题、命名冲突和优化导入语句
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple

class ImportExportCleaner:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.src_dir = self.project_root / 'src'
        self.backup_dir = self.project_root / 'backups' / 'stage4_import_fixes'
        self.fixes_log = []
        self.file_changes = {}
        
        # 驼峰到蛇形的映射表
        self.camel_to_snake_mappings = {
            # API相关
            'getItem': 'get_item',
            'getApiUrl': 'get_api_url',
            'getCurrentApiUrl': 'get_current_api_url',
            'getErrorCodeFromStatus': 'get_error_code_from_status',
            'getAll': 'get_all',
            'getMaterials': 'get_materials',
            'getHistory': 'get_history',
            'getTraces': 'get_traces',
            'getStats': 'get_stats',
            'getRecords': 'get_records',
            'getOverview': 'get_overview',
            'getTransactions': 'get_transactions',
            'getPurchases': 'get_purchases',
            'getNotes': 'get_notes',
            'getAnalytics': 'get_analytics',
            'getAvailableSkus': 'get_available_skus',
            'getBusinessInsights': 'get_business_insights',
            'getConfig': 'get_config',
            'getAIConfig': 'get_ai_config',
            
            # 数据库查询相关
            'findMany': 'find_many',
            'findUnique': 'find_unique',
            'findIndex': 'find_index',
            'queryRaw': 'query_raw',
            'queryRawUnsafe': 'query_raw_unsafe',
            'getDatabaseStats': 'get_database_stats',
            'getSkuList': 'get_sku_list',
            'getSkuDetails': 'get_sku_details',
            
            # 组件相关
            'getNameFn': 'get_name_fn',
            'getQualityColor': 'get_quality_color',
            'getStockStatus': 'get_stock_status',
            'getCustomerLabels': 'get_customer_labels',
            'getFilterPosition': 'get_filter_position',
            'getColumnFilterType': 'get_column_filter_type',
            'getFilterValue': 'get_filter_value',
            'getRangeValues': 'get_range_values',
            'getFilteredMaterials': 'get_filtered_materials',
            'getInputValue': 'get_input_value',
            'getTransactionIcon': 'get_transaction_icon',
            'getStockStatusColor': 'get_stock_status_color',
            'getDeviceInfo': 'get_device_info',
            'getBrowserInfo': 'get_browser_info',
            'getInputProps': 'get_input_props',
            'getRootProps': 'get_root_props',
            
            # 工具函数相关
            'getTime': 'get_time',
            'getFullYear': 'get_full_year',
            'getMonth': 'get_month',
            'getDate': 'get_date',
            'getUserMedia': 'get_user_media',
            'getSupportedConstraints': 'get_supported_constraints',
            'getElementById': 'get_element_by_id',
            'querySelector': 'query_selector',
            'getEntriesByType': 'get_entries_by_type',
            'getPublicIP': 'get_public_ip',
            'getAccessUrls': 'get_access_urls',
            'getAvailablePort': 'get_available_port',
            
            # 字段映射相关
            'isActive': 'is_active',
            'isDeleted': 'is_deleted',
            'lastLoginAt': 'last_login_at',
            'realName': 'real_name',
            'unitCost': 'unit_cost',
            'materialStatus': 'material_status',
            'materialAction': 'material_action',
            'returnedMaterials': 'returned_materials',
            'productId': 'product_id',
            'productCode': 'product_code',
            'productDistribution': 'product_distribution',
            'pricePerPiece': 'price_per_piece',
            'remainingBeads': 'remaining_beads',
            'lastEditedById': 'last_edited_by_id',
            'supplierCode': 'supplier_code',
            'supplierInfo': 'supplier_info',
            'contactPerson': 'contact_person',
            'inventoryId': 'inventory_id',
            'stockQuantity': 'stock_quantity',
            'reservedQuantity': 'reserved_quantity',
            'hasLowStock': 'has_low_stock',
            'lowStockThreshold': 'low_stock_threshold',
            'skuNumber': 'sku_number',
            'customerAddress': 'customer_address',
            'daysSinceLastPurchase': 'days_since_last_purchase',
            'daysSinceFirstPurchase': 'days_since_first_purchase',
            'customerLabels': 'customer_labels',
            'primaryLabel': 'primary_label',
            'returnToMaterial': 'return_to_material',
            'customReturnQuantities': 'custom_return_quantities',
            'costAdjustment': 'cost_adjustment',
            'newQuantity': 'new_quantity',
            'soldQuantity': 'sold_quantity',
            'destroyedQuantity': 'destroyed_quantity',
            'restockedQuantity': 'restocked_quantity',
            'refundedQuantity': 'refunded_quantity',
            'newAvailableQuantity': 'new_available_quantity',
            'consumedMaterials': 'consumed_materials',
            'saleInfo': 'sale_info',
            'skuInfo': 'sku_info',
            'skuUnitPrice': 'sku_unit_price',
            'actualUnitPrice': 'actual_unit_price',
            'currentQuantity': 'current_quantity',
            'canRestock': 'can_restock',
            'insufficientMaterials': 'insufficient_materials',
            'logId': 'log_id',
            'operatorId': 'operator_id',
            'operatorName': 'operator_name',
            'specificationValue': 'specification_value',
            'specificationUnit': 'specification_unit',
            'maxTokens': 'max_tokens',
            'destroyedAt': 'destroyed_at',
            'restoredMaterials': 'restored_materials',
            'newCustomers': 'new_customers',
            'repeatCustomers': 'repeat_customers',
            'vipCustomers': 'vip_customers',
            'activeCustomers': 'active_customers',
            'inactiveCustomers': 'inactive_customers'
        }
        
        # 第三方库和React内置，不需要修改
        self.preserve_imports = {
            'react', 'react-dom', 'react-router-dom', 'react-hook-form',
            'lucide-react', 'recharts', 'sonner', 'zustand', 'vite',
            '@types/react', '@types/node', 'typescript', 'tailwindcss',
            'postcss', 'autoprefixer', 'eslint', 'prettier'
        }
    
    def camel_to_snake(self, name: str) -> str:
        """将驼峰命名转换为蛇形命名"""
        # 首先检查映射表
        if name in self.camel_to_snake_mappings:
            return self.camel_to_snake_mappings[name]
        
        # 通用转换规则
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
    
    def should_preserve_import(self, module_path: str) -> bool:
        """判断是否应该保留导入不变"""
        # 相对路径导入需要处理
        if module_path.startswith('./'):
            return False
        
        # 绝对路径中的项目内部模块需要处理
        if module_path.startswith('@/') or module_path.startswith('../'):
            return False
        
        # 第三方库保留不变
        for preserve in self.preserve_imports:
            if module_path.startswith(preserve):
                return True
        
        return False
    
    def fix_import_path(self, import_path: str) -> str:
        """修复导入路径中的命名"""
        if self.should_preserve_import(import_path):
            return import_path
        
        # 处理相对路径
        if import_path.startswith('./'):
            path_parts = import_path.split('/')
            fixed_parts = []
            for part in path_parts:
                if part and not part.startswith('.'):
                    # 转换文件名为蛇形
                    fixed_part = self.camel_to_snake(part)
                    fixed_parts.append(fixed_part)
                else:
                    fixed_parts.append(part)
            return '/'.join(fixed_parts)
        
        return import_path
    
    def fix_import_names(self, import_names: str) -> str:
        """修复导入名称"""
        # 处理 { name1, name2 } 格式
        if '{' in import_names and '}' in import_names:
            # 提取大括号内的内容
            match = re.search(r'\{([^}]+)\}', import_names)
            if match:
                names_content = match.group(1)
                names = [name.strip() for name in names_content.split(',')]
                fixed_names = []
                
                for name in names:
                    # 处理 as 重命名
                    if ' as ' in name:
                        original, alias = name.split(' as ')
                        fixed_original = self.camel_to_snake(original.strip())
                        fixed_names.append(f"{fixed_original} as {alias.strip()}")
                    else:
                        fixed_names.append(self.camel_to_snake(name.strip()))
                
                return import_names.replace(names_content, ', '.join(fixed_names))
        
        # 处理单个导入名称
        return self.camel_to_snake(import_names)
    
    def fix_export_names(self, export_content: str) -> str:
        """修复导出名称"""
        # 处理 export { name1, name2 }
        if '{' in export_content and '}' in export_content:
            match = re.search(r'\{([^}]+)\}', export_content)
            if match:
                names_content = match.group(1)
                names = [name.strip() for name in names_content.split(',')]
                fixed_names = []
                
                for name in names:
                    if ' as ' in name:
                        original, alias = name.split(' as ')
                        fixed_original = self.camel_to_snake(original.strip())
                        fixed_names.append(f"{fixed_original} as {alias.strip()}")
                    else:
                        fixed_names.append(self.camel_to_snake(name.strip()))
                
                return export_content.replace(names_content, ', '.join(fixed_names))
        
        return export_content
    
    def process_file(self, file_path: Path) -> bool:
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes_made = 0
            
            # 1. 修复import语句
            import_pattern = r'import\s+([^\n]+)\s+from\s+[\'"]([^\'"]*)[\'"](;?)'
            def fix_import(match):
                nonlocal changes_made
                import_part = match.group(1).strip()
                module_path = match.group(2)
                semicolon = match.group(3)
                
                if self.should_preserve_import(module_path):
                    return match.group(0)
                
                # 修复导入名称
                fixed_import_part = self.fix_import_names(import_part)
                
                # 修复模块路径
                fixed_module_path = self.fix_import_path(module_path)
                
                if fixed_import_part != import_part or fixed_module_path != module_path:
                    changes_made += 1
                    self.fixes_log.append({
                        'file': str(file_path.relative_to(self.project_root)),
                        'type': 'import_fix',
                        'original': match.group(0),
                        'fixed': f"import {fixed_import_part} from '{fixed_module_path}'{semicolon}"
                    })
                
                return f"import {fixed_import_part} from '{fixed_module_path}'{semicolon}"
            
            content = re.sub(import_pattern, fix_import, content)
            
            # 2. 修复export语句
            export_pattern = r'export\s+\{([^}]+)\}(\s+from\s+[\'"]([^\'"]*)[\'"](;?))?'
            def fix_export(match):
                nonlocal changes_made
                export_names = match.group(1)
                from_part = match.group(2) or ''
                module_path = match.group(3) or ''
                semicolon = match.group(4) or ''
                
                # 修复导出名称
                fixed_export_names = self.fix_export_names(export_names)
                
                # 如果有from部分，修复模块路径
                if module_path and not self.should_preserve_import(module_path):
                    fixed_module_path = self.fix_import_path(module_path)
                    from_part = f" from '{fixed_module_path}'{semicolon}"
                
                if fixed_export_names != export_names:
                    changes_made += 1
                    self.fixes_log.append({
                        'file': str(file_path.relative_to(self.project_root)),
                        'type': 'export_fix',
                        'original': match.group(0),
                        'fixed': f"export {{{fixed_export_names}}}{from_part}"
                    })
                
                return f"export {{{fixed_export_names}}}{from_part}"
            
            content = re.sub(export_pattern, fix_export, content)
            
            # 3. 修复动态导入
            dynamic_import_pattern = r'import\s*\(\s*[\'"]([^\'"]*)[\'"](\s*,\s*[^)]*)?\s*\)'
            def fix_dynamic_import(match):
                nonlocal changes_made
                module_path = match.group(1)
                options = match.group(2) or ''
                
                if self.should_preserve_import(module_path):
                    return match.group(0)
                
                fixed_module_path = self.fix_import_path(module_path)
                
                if fixed_module_path != module_path:
                    changes_made += 1
                    self.fixes_log.append({
                        'file': str(file_path.relative_to(self.project_root)),
                        'type': 'dynamic_import_fix',
                        'original': match.group(0),
                        'fixed': f"import('{fixed_module_path}'{options})"
                    })
                
                return f"import('{fixed_module_path}'{options})"
            
            content = re.sub(dynamic_import_pattern, fix_dynamic_import, content)
            
            # 4. 修复type导入
            type_import_pattern = r'import\s+type\s+([^\n]+)\s+from\s+[\'"]([^\'"]*)[\'"](;?)'
            def fix_type_import(match):
                nonlocal changes_made
                import_part = match.group(1).strip()
                module_path = match.group(2)
                semicolon = match.group(3)
                
                if self.should_preserve_import(module_path):
                    return match.group(0)
                
                # 修复类型导入名称
                fixed_import_part = self.fix_import_names(import_part)
                
                # 修复模块路径
                fixed_module_path = self.fix_import_path(module_path)
                
                if fixed_import_part != import_part or fixed_module_path != module_path:
                    changes_made += 1
                    self.fixes_log.append({
                        'file': str(file_path.relative_to(self.project_root)),
                        'type': 'type_import_fix',
                        'original': match.group(0),
                        'fixed': f"import type {fixed_import_part} from '{fixed_module_path}'{semicolon}"
                    })
                
                return f"import type {fixed_import_part} from '{fixed_module_path}'{semicolon}"
            
            content = re.sub(type_import_pattern, fix_type_import, content)
            
            # 如果有修改，写入文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.file_changes[str(file_path.relative_to(self.project_root))] = changes_made
                return True
            
            return False
            
        except Exception as e:
            print(f"处理文件 {file_path} 时出错: {e}")
            return False
    
    def create_backup(self):
        """创建备份"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # 备份src目录
        backup_src = self.backup_dir / 'src'
        shutil.copytree(self.src_dir, backup_src)
        
        print(f"✅ 备份已创建: {self.backup_dir}")
    
    def get_typescript_files(self) -> List[Path]:
        """获取所有TypeScript文件"""
        files = []
        for pattern in ['**/*.ts', '**/*.tsx']:
            files.extend(self.src_dir.glob(pattern))
        return files
    
    def run_typescript_check(self) -> bool:
        """运行TypeScript编译检查"""
        import subprocess
        try:
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except Exception as e:
            print(f"TypeScript检查失败: {e}")
            return False
    
    def generate_report(self) -> Dict:
        """生成修复报告"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        report = {
            'timestamp': timestamp,
            'stage': 'Stage 4 - Import/Export Cleanup',
            'summary': {
                'total_files_processed': len(self.get_typescript_files()),
                'files_modified': len(self.file_changes),
                'total_fixes': len(self.fixes_log)
            },
            'file_changes': self.file_changes,
            'detailed_fixes': self.fixes_log,
            'fix_types': {
                'import_fix': len([f for f in self.fixes_log if f['type'] == 'import_fix']),
                'export_fix': len([f for f in self.fixes_log if f['type'] == 'export_fix']),
                'dynamic_import_fix': len([f for f in self.fixes_log if f['type'] == 'dynamic_import_fix']),
                'type_import_fix': len([f for f in self.fixes_log if f['type'] == 'type_import_fix'])
            }
        }
        
        # 保存报告
        report_file = self.project_root / f'stage4_import_export_fixes_executed_{timestamp}.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        return report
    
    def execute(self, preview_mode: bool = False) -> Dict:
        """执行导入/导出清理"""
        print("🚀 开始第四阶段：导入/导出清理")
        print(f"📁 项目根目录: {self.project_root}")
        print(f"📂 源码目录: {self.src_dir}")
        
        if not preview_mode:
            # 创建备份
            self.create_backup()
        
        # 获取所有TypeScript文件
        ts_files = self.get_typescript_files()
        print(f"📄 找到 {len(ts_files)} 个TypeScript文件")
        
        if preview_mode:
            print("\n🔍 预览模式 - 不会实际修改文件")
        else:
            print("\n✏️ 执行模式 - 开始修复文件")
        
        # 处理每个文件
        modified_files = 0
        for file_path in ts_files:
            if not preview_mode:
                if self.process_file(file_path):
                    modified_files += 1
                    print(f"✅ 修复: {file_path.relative_to(self.project_root)}")
            else:
                # 预览模式只分析不修改
                print(f"📋 分析: {file_path.relative_to(self.project_root)}")
        
        # 生成报告
        report = self.generate_report()
        
        print("\n📊 修复统计:")
        print(f"  📄 处理文件: {report['summary']['total_files_processed']}")
        print(f"  ✏️ 修改文件: {report['summary']['files_modified']}")
        print(f"  🔧 总修复数: {report['summary']['total_fixes']}")
        
        print("\n🔧 修复类型分布:")
        for fix_type, count in report['fix_types'].items():
            print(f"  {fix_type}: {count}处")
        
        if not preview_mode:
            # 运行TypeScript编译检查
            print("\n🔍 运行TypeScript编译检查...")
            if self.run_typescript_check():
                print("✅ TypeScript编译检查通过")
            else:
                print("❌ TypeScript编译检查失败，请检查修复结果")
        
        return report

def main():
    """主函数"""
    project_root = os.getcwd()
    cleaner = ImportExportCleaner(project_root)
    
    print("第四阶段：导入/导出清理")
    print("=" * 50)
    
    # 询问是否预览
    preview = input("是否先预览修复内容？(y/n): ").lower().strip() == 'y'
    
    if preview:
        print("\n🔍 预览模式")
        cleaner.execute(preview_mode=True)
        
        proceed = input("\n是否继续执行实际修复？(y/n): ").lower().strip() == 'y'
        if not proceed:
            print("❌ 用户取消操作")
            return
    
    # 执行修复
    print("\n🚀 开始执行修复")
    report = cleaner.execute(preview_mode=False)
    
    print("\n🎉 第四阶段导入/导出清理完成！")
    print(f"📋 详细报告已保存")

if __name__ == '__main__':
    main()