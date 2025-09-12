#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SKU销售列表字段蛇形命名转换脚本

功能：
- 批量将SKU销售列表相关的驼峰命名字段转换为蛇形命名
- 支持 .ts、.tsx、.js、.jsx 文件
- 精确匹配，避免误替换
- 自动备份原文件
- 生成详细的处理报告

作者：SOLO Coding Assistant
创建时间：2025-01-27
"""

import os
import re
import shutil
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# 字段映射表 - SKU销售列表相关字段
FIELD_MAPPINGS = {
    # SKU基础信息字段
    'skuId': 'sku_id',
    'skuCode': 'sku_code', 
    'skuName': 'sku_name',
    
    # 价格成本字段
    'sellingPrice': 'selling_price',
    'materialCost': 'material_cost',
    'laborCost': 'labor_cost',
    'craftCost': 'craft_cost',
    'profitMargin': 'profit_margin',
    
    # 库存数量字段
    'availableQuantity': 'available_quantity',
    'totalQuantity': 'total_quantity',
    
    # 销售相关字段
    'customerName': 'customer_name',
    'customerPhone': 'customer_phone',
    'saleChannel': 'sale_channel',
    'saleSource': 'sale_source',
    'actualTotalPrice': 'actual_total_price',
    'totalPrice': 'total_price',
    'originalPrice': 'original_price',
    'purchaseDate': 'purchase_date',
    'refundDate': 'refund_date',
    'refundReason': 'refund_reason',
    'refundNotes': 'refund_notes',
    'lastSaleDate': 'last_sale_date',
    
    # 状态管理字段
    'skuList': 'sku_list',
    'selectedSku': 'selected_sku',
    'detailModal': 'detail_modal',
    'imagePreview': 'image_preview',
    'imageUrl': 'image_url',
    'altText': 'alt_text',
    'canViewPrice': 'can_view_price',
    
    # 筛选查询字段
    'priceMin': 'price_min',
    'priceMax': 'price_max',
    'profitMarginMin': 'profit_margin_min',
    'profitMarginMax': 'profit_margin_max',
    'sortBy': 'sort_by',
    'sortOrder': 'sort_order',
    'columnFilters': 'column_filters',
    
    # 分页相关字段
    'totalPages': 'total_pages',
    
    # 权限控制字段
    'canSell': 'can_sell',
    'canDestroy': 'can_destroy',
    'canManage': 'can_manage'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}

# 需要处理的目录
TARGET_DIRECTORIES = ['src', 'backend', 'shared', 'tests']

# 备份目录
BACKUP_DIR = 'backup_sales_list_fields'

class SalesListFieldReplacer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / BACKUP_DIR
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_stats': {field: 0 for field in FIELD_MAPPINGS.keys()}
        }
        self.start_time = time.time()
        
    def create_backup_dir(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
        
    def backup_file(self, file_path: Path) -> Path:
        """备份文件"""
        relative_path = file_path.relative_to(self.project_root)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        return backup_path
        
    def is_target_file(self, file_path: Path) -> bool:
        """检查是否为目标文件"""
        return (
            file_path.suffix in SUPPORTED_EXTENSIONS and
            not file_path.name.endswith('.d.ts') and
            'node_modules' not in str(file_path) and
            '.git' not in str(file_path) and
            'dist' not in str(file_path) and
            'build' not in str(file_path)
        )
        
    def create_replacement_patterns(self) -> List[Tuple[re.Pattern, str, str]]:
        """创建替换模式"""
        patterns = []
        
        for old_field, new_field in FIELD_MAPPINGS.items():
            # 1. 对象属性访问: obj.fieldName
            patterns.append((
                re.compile(rf'\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.{re.escape(old_field)}\b'),
                rf'\1.{new_field}',
                old_field
            ))
            
            # 2. 对象属性定义: { fieldName: value }
            patterns.append((
                re.compile(rf'\{{\s*{re.escape(old_field)}\s*:'),
                f'{{ {new_field}:',
                old_field
            ))
            
            # 3. 对象属性简写: { fieldName }
            patterns.append((
                re.compile(rf'\{{([^}}]*,\s*)?{re.escape(old_field)}(\s*[,}}])'),
                rf'{{\1{new_field}\2',
                old_field
            ))
            
            # 4. 解构赋值: const { fieldName } = obj
            patterns.append((
                re.compile(rf'\{{([^}}]*,\s*)?{re.escape(old_field)}(\s*[,}}])'),
                rf'{{\1{new_field}\2',
                old_field
            ))
            
            # 5. 变量声明: const fieldName = 
            patterns.append((
                re.compile(rf'\b(const|let|var)\s+{re.escape(old_field)}\b'),
                rf'\1 {new_field}',
                old_field
            ))
            
            # 6. 函数参数: function(fieldName)
            patterns.append((
                re.compile(rf'\(([^)]*,\s*)?{re.escape(old_field)}(\s*[,)])'),
                rf'(\1{new_field}\2',
                old_field
            ))
            
            # 7. 接口/类型定义: fieldName: type
            patterns.append((
                re.compile(rf'^(\s*){re.escape(old_field)}(\s*[?:])', re.MULTILINE),
                rf'\1{new_field}\2',
                old_field
            ))
            
            # 8. 字符串字面量中的属性名: 'fieldName' 或 "fieldName"
            patterns.append((
                re.compile(rf"(['\"]){re.escape(old_field)}\1"),
                rf"\1{new_field}\1",
                old_field
            ))
            
        return patterns
        
    def process_file(self, file_path: Path) -> bool:
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original_content = content
            patterns = self.create_replacement_patterns()
            file_replacements = 0
            
            for pattern, replacement, field_name in patterns:
                matches = pattern.findall(content)
                if matches:
                    content = pattern.sub(replacement, content)
                    match_count = len(matches)
                    file_replacements += match_count
                    self.stats['field_stats'][field_name] += match_count
                    
            if content != original_content:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修改后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.stats['files_modified'] += 1
                self.stats['total_replacements'] += file_replacements
                
                print(f"✅ 修改文件: {file_path} (替换 {file_replacements} 处)")
                return True
                
            return False
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return False
            
    def process_directory(self, directory: Path):
        """处理目录"""
        if not directory.exists():
            print(f"⚠️  目录不存在: {directory}")
            return
            
        print(f"📁 处理目录: {directory}")
        
        for file_path in directory.rglob('*'):
            if file_path.is_file() and self.is_target_file(file_path):
                self.stats['files_processed'] += 1
                self.process_file(file_path)
                
    def run(self):
        """运行替换脚本"""
        print("🚀 开始SKU销售列表字段蛇形命名转换...")
        print(f"📂 项目根目录: {self.project_root}")
        print(f"🎯 目标字段数量: {len(FIELD_MAPPINGS)}")
        print("="*60)
        
        # 创建备份目录
        self.create_backup_dir()
        
        # 处理各个目录
        for dir_name in TARGET_DIRECTORIES:
            target_dir = self.project_root / dir_name
            self.process_directory(target_dir)
            
        # 生成报告
        self.generate_report()
        
    def generate_report(self):
        """生成处理报告"""
        end_time = time.time()
        duration = end_time - self.start_time
        
        print("\n" + "="*60)
        print("📊 SKU销售列表字段转换完成报告")
        print("="*60)
        print(f"⏱️  处理时间: {duration:.2f} 秒")
        print(f"📁 处理文件总数: {self.stats['files_processed']}")
        print(f"✏️  修改文件数量: {self.stats['files_modified']}")
        print(f"🔄 总替换次数: {self.stats['total_replacements']}")
        print(f"💾 备份目录: {self.backup_dir}")
        
        # 显示字段替换统计（按替换次数排序）
        print("\n🏆 字段替换统计（按替换次数排序）:")
        sorted_fields = sorted(
            self.stats['field_stats'].items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for i, (field, count) in enumerate(sorted_fields, 1):
            if count > 0:
                snake_field = FIELD_MAPPINGS[field]
                print(f"{i:2d}. {field} → {snake_field} ({count}次)")
                
        # 显示未替换的字段
        unused_fields = [field for field, count in sorted_fields if count == 0]
        if unused_fields:
            print(f"\n⚠️  未找到的字段 ({len(unused_fields)}个):")
            for field in unused_fields:
                snake_field = FIELD_MAPPINGS[field]
                print(f"   - {field} → {snake_field}")
                
        print("\n✅ SKU销售列表字段蛇形命名转换完成！")
        
        # 保存报告到文件
        report_file = self.project_root / 'sales_list_field_replacement_report.txt'
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"SKU销售列表字段蛇形命名转换报告\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"处理时间: {duration:.2f} 秒\n")
            f.write(f"处理文件总数: {self.stats['files_processed']}\n")
            f.write(f"修改文件数量: {self.stats['files_modified']}\n")
            f.write(f"总替换次数: {self.stats['total_replacements']}\n\n")
            
            f.write("字段替换详情:\n")
            for field, count in sorted_fields:
                if count > 0:
                    snake_field = FIELD_MAPPINGS[field]
                    f.write(f"{field} → {snake_field}: {count}次\n")
                    
        print(f"📄 详细报告已保存到: {report_file}")

def main():
    """主函数"""
    project_root = os.getcwd()
    replacer = SalesListFieldReplacer(project_root)
    replacer.run()

if __name__ == '__main__':
    main()