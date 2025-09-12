#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
字段名批量替换脚本
用于将驼峰命名转换为蛇形命名
"""

import os
import shutil
import re
from pathlib import Path

# 字段映射关系
FIELD_MAPPINGS = {
    # 第1批前端字段
    'material_name': 'material_name',
    'material_type': 'material_type',
    'unit_type': 'unit_type',
    'bead_diameter': 'bead_diameter',
    'piece_count': 'piece_count',
    'min_stock_alert': 'min_stock_alert',
    'price_per_gram': 'price_per_gram',
    'total_price': 'total_price',
    'supplier_name': 'supplier_name',
    'natural_language_input': 'natural_language_input',
    'supplier_input': 'supplier_input',
    'beads_per_string': 'beads_per_string',
    'total_beads': 'total_beads',
    'unit_price': 'unit_price',
    'price_per_bead': 'price_per_bead',
    
    # 第2批后端字段
    'product_name': 'product_name',
    'purchase_code': 'purchase_code',
    'ai_recognition_result': 'ai_recognition_result',
    'purchase_code_search': 'purchase_code_search',
    'start_date': 'start_date',
    'end_date': 'end_date',
    'sort_by': 'sort_by',
    'sort_order': 'sort_order',
    'diameter_min': 'diameter_min',
    'diameter_max': 'diameter_max',
    'quantity_min': 'quantity_min',
    'quantity_max': 'quantity_max',
    'price_per_gram_min': 'price_per_gram_min',
    'price_per_gram_max': 'price_per_gram_max',
    'material_types': 'material_types',
    
    # 第3批其他字段
    'page_num': 'page_num',
    'product_type': 'product_type',
    'type_map': 'type_map',
    'hierarchy_data': 'hierarchy_data',
    'spec_group': 'spec_group',
    'spec_index': 'spec_index',
    'quality_group': 'quality_group',
    'quality_index': 'quality_index',
    'batch_index': 'batch_index',
    'product_types': 'product_types',
    'total_quantity': 'total_quantity',
    'low_stock_items': 'low_stock_items',
    'avg_price': 'avg_price',
    'accessory_products': 'accessory_products'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.txt', '.py', '.java', '.json', '.sql', '.ts', '.tsx', '.js', '.jsx'}

def backup_file(file_path):
    """创建文件备份"""
    backup_path = file_path.with_name(f"{file_path.stem}_backup{file_path.suffix}")
    shutil.copy2(file_path, backup_path)
    return backup_path

def replace_fields_in_content(content):
    """在文件内容中替换字段名"""
    replacements_count = 0
    
    for old_field, new_field in FIELD_MAPPINGS.items():
        # 使用正则表达式进行精确匹配，避免部分匹配
        # 匹配单词边界，确保不会替换变量名的一部分
        pattern = r'\b' + re.escape(old_field) + r'\b'
        
        # 计算替换次数
        matches = re.findall(pattern, content)
        replacements_count += len(matches)
        
        # 执行替换
        content = re.sub(pattern, new_field, content)
    
    return content, replacements_count

def process_file(file_path):
    """处理单个文件"""
    try:
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        # 替换字段名
        new_content, replacements_count = replace_fields_in_content(original_content)
        
        # 如果有替换，则备份并写入新内容
        if replacements_count > 0:
            backup_file(file_path)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            return replacements_count
        
        return 0
        
    except Exception as e:
        print(f"处理文件 {file_path} 时出错: {e}")
        return 0

def process_directory(directory_path):
    """处理目录中的所有文件"""
    directory = Path(directory_path)
    
    if not directory.exists():
        print(f"目录不存在: {directory_path}")
        return
    
    total_replacements = 0
    processed_files = 0
    
    # 递归遍历所有文件
    for file_path in directory.rglob('*'):
        if file_path.is_file() and file_path.suffix in SUPPORTED_EXTENSIONS:
            # 跳过备份文件
            if '_backup' in file_path.stem:
                continue
                
            replacements = process_file(file_path)
            if replacements > 0:
                total_replacements += replacements
                processed_files += 1
                print(f"已处理: {file_path} (替换 {replacements} 处)")
    
    print(f"\n替换完成：共替换 {total_replacements} 处，涉及 {processed_files} 个文件")

def main():
    """主函数"""
    print("字段名批量替换脚本")
    print("支持的文件类型:", ', '.join(SUPPORTED_EXTENSIONS))
    print(f"共 {len(FIELD_MAPPINGS)} 个字段映射规则\n")
    
    # 使用当前目录作为目标目录
    target_directory = os.getcwd()
    print(f"处理目录: {target_directory}")
    
    # 开始处理
    print("\n开始处理...")
    process_directory(target_directory)
    print("\n处理完成！")

if __name__ == '__main__':
    main()