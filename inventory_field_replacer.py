#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
原材料库存查询字段蛇形命名批量替换工具
处理25个字段的驼峰到蛇形命名转换
"""

import os
import re
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# 字段映射关系
FIELD_MAPPINGS = {
    # 状态管理字段转换 (4个)
    'selectedProductTypes': 'selected_product_types',
    'lowStockOnly': 'low_stock_only', 
    'specificationMin': 'specification_min',
    'specificationMax': 'specification_max',
    
    # 库存查询参数字段转换 (4个)
    'materialTypes': 'material_types',
    'sortBy': 'sort_by',
    'remainingQuantity': 'remaining_quantity',
    'isLowStock': 'is_low_stock',
    
    # 库存项目字段转换 (14个)
    'purchaseId': 'purchase_id',
    'materialName': 'material_name',
    'materialType': 'material_type',
    'unitType': 'unit_type',
    'beadDiameter': 'bead_diameter',
    'minStockAlert': 'min_stock_alert',
    'originalQuantity': 'original_quantity',
    'usedQuantity': 'used_quantity',
    'pricePerUnit': 'price_per_unit',
    'pricePerGram': 'price_per_gram',
    'supplierName': 'supplier_name',
    'purchaseDate': 'purchase_date',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    
    # 函数名转换 (10个)
    'fetchHierarchicalInventory': 'fetch_hierarchical_inventory',
    'handleExport': 'handle_export',
    'handleViewModeChange': 'handle_view_mode_change',
    'handleMaterialClick': 'handle_material_click',
    'setLoading': 'set_loading',
    'setInventoryData': 'set_inventory_data',
    'setCurrentPage': 'set_current_page',
    'setTotalPages': 'set_total_pages',
    'setSelectedProductTypes': 'set_selected_product_types',
    'setViewMode': 'set_view_mode',
    
    # API方法名转换 (8个)
    'listHierarchical': 'list_hierarchical',
    'listGrouped': 'list_grouped',
    'getLowStockAlerts': 'get_low_stock_alerts',
    'getFinishedProducts': 'get_finished_products',
    'getStatistics': 'get_statistics',
    'getMaterialDistribution': 'get_material_distribution',
    'getConsumptionAnalysis': 'get_consumption_analysis',
    'getPriceDistribution': 'get_price_distribution'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json'}

# 需要处理的目录
TARGET_DIRECTORIES = ['src', 'backend', 'shared', 'api']

class InventoryFieldReplacer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / 'backup_inventory_fields'
        self.replacement_stats = {}
        self.processed_files = 0
        self.modified_files = 0
        self.total_replacements = 0
        
    def create_backup_dir(self):
        """创建备份目录"""
        if not self.backup_dir.exists():
            self.backup_dir.mkdir(parents=True)
            print(f"✅ 创建备份目录: {self.backup_dir}")
    
    def backup_file(self, file_path: Path) -> Path:
        """备份文件"""
        relative_path = file_path.relative_to(self.project_root)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        return backup_path
    
    def should_process_file(self, file_path: Path) -> bool:
        """判断是否需要处理该文件"""
        # 检查文件扩展名
        if file_path.suffix not in SUPPORTED_EXTENSIONS:
            return False
            
        # 跳过备份目录
        if 'backup' in str(file_path).lower():
            return False
            
        # 跳过node_modules等目录
        excluded_dirs = {'node_modules', '.git', 'dist', 'build', '.next'}
        if any(excluded in file_path.parts for excluded in excluded_dirs):
            return False
            
        return True
    
    def create_replacement_patterns(self) -> List[Tuple[re.Pattern, str, str]]:
        """创建替换模式列表"""
        patterns = []
        
        for old_field, new_field in FIELD_MAPPINGS.items():
            # 1. 对象属性访问模式: obj.field
            patterns.append((
                re.compile(rf'\b(\w+)\.{re.escape(old_field)}\b'),
                rf'\1.{new_field}',
                f'属性访问: {old_field} → {new_field}'
            ))
            
            # 2. 对象属性定义模式: { field: value }
            patterns.append((
                re.compile(rf'\b{re.escape(old_field)}\s*:'),
                f'{new_field}:',
                f'对象属性: {old_field} → {new_field}'
            ))
            
            # 3. 解构赋值模式: { field }
            patterns.append((
                re.compile(rf'\{{\s*([^}}]*\b){re.escape(old_field)}(\b[^}}]*)\s*\}}'),
                rf'{{\1{new_field}\2}}',
                f'解构赋值: {old_field} → {new_field}'
            ))
            
            # 4. 函数参数模式: function(field)
            patterns.append((
                re.compile(rf'\b{re.escape(old_field)}\s*[,)]'),
                lambda m: m.group(0).replace(old_field, new_field),
                f'函数参数: {old_field} → {new_field}'
            ))
            
            # 5. 变量声明模式: const field = 
            patterns.append((
                re.compile(rf'\b(const|let|var)\s+{re.escape(old_field)}\b'),
                rf'\1 {new_field}',
                f'变量声明: {old_field} → {new_field}'
            ))
            
            # 6. 字符串字面量模式: 'field' 或 "field"
            patterns.append((
                re.compile(rf'(["\']){re.escape(old_field)}\1'),
                rf'\1{new_field}\1',
                f'字符串字面量: {old_field} → {new_field}'
            ))
            
        return patterns
    
    def process_file(self, file_path: Path) -> bool:
        """处理单个文件"""
        try:
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            file_replacements = 0
            
            # 应用所有替换模式
            patterns = self.create_replacement_patterns()
            
            for pattern, replacement, description in patterns:
                if callable(replacement):
                    # 处理lambda函数替换
                    matches = list(pattern.finditer(content))
                    for match in reversed(matches):  # 从后往前替换避免位置偏移
                        new_text = replacement(match)
                        content = content[:match.start()] + new_text + content[match.end():]
                        file_replacements += 1
                else:
                    # 处理字符串替换
                    new_content, count = pattern.subn(replacement, content)
                    if count > 0:
                        content = new_content
                        file_replacements += count
                        
                        # 统计每个字段的替换次数
                        field_name = description.split(':')[1].split('→')[0].strip()
                        if field_name not in self.replacement_stats:
                            self.replacement_stats[field_name] = 0
                        self.replacement_stats[field_name] += count
            
            # 如果有修改，备份并写入新内容
            if content != original_content:
                self.backup_file(file_path)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.modified_files += 1
                self.total_replacements += file_replacements
                print(f"✅ 修改文件: {file_path.relative_to(self.project_root)} (替换 {file_replacements} 处)")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return False
    
    def process_directory(self, directory: Path):
        """处理目录中的所有文件"""
        if not directory.exists():
            print(f"⚠️  目录不存在: {directory}")
            return
            
        print(f"📁 处理目录: {directory}")
        
        for file_path in directory.rglob('*'):
            if file_path.is_file() and self.should_process_file(file_path):
                self.processed_files += 1
                self.process_file(file_path)
    
    def generate_report(self, start_time: float, end_time: float):
        """生成处理报告"""
        duration = end_time - start_time
        
        report = f"""
{'='*60}
原材料库存查询字段蛇形命名转换报告
{'='*60}
处理时间: {duration:.2f} 秒
处理文件总数: {self.processed_files}
修改文件数量: {self.modified_files}
总替换次数: {self.total_replacements}

字段替换统计:
{'-'*40}
"""
        
        # 按替换次数排序
        sorted_stats = sorted(self.replacement_stats.items(), key=lambda x: x[1], reverse=True)
        
        for field, count in sorted_stats:
            snake_case = FIELD_MAPPINGS.get(field, '未知')
            report += f"{field:30} → {snake_case:30} ({count:3d} 次)\n"
        
        report += f"\n{'='*60}\n"
        
        # 保存报告
        report_file = self.project_root / f'inventory_field_replacement_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(report)
        print(f"📊 详细报告已保存至: {report_file}")
    
    def run(self):
        """执行批量替换"""
        print("🚀 开始原材料库存查询字段蛇形命名转换...")
        print(f"📂 项目根目录: {self.project_root}")
        print(f"🔄 需要转换的字段数量: {len(FIELD_MAPPINGS)}")
        
        start_time = time.time()
        
        # 创建备份目录
        self.create_backup_dir()
        
        # 处理指定目录
        for dir_name in TARGET_DIRECTORIES:
            target_dir = self.project_root / dir_name
            self.process_directory(target_dir)
        
        end_time = time.time()
        
        # 生成报告
        self.generate_report(start_time, end_time)
        
        print("\n✅ 原材料库存查询字段蛇形命名转换完成!")

def main():
    """主函数"""
    project_root = os.getcwd()
    
    print("原材料库存查询字段蛇形命名批量替换工具")
    print("=" * 50)
    
    replacer = InventoryFieldReplacer(project_root)
    replacer.run()

if __name__ == '__main__':
    main()