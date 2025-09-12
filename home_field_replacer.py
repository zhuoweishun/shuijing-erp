#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主页字段批量替换脚本
用于将主页相关的驼峰命名字段转换为蛇形命名
"""

import os
import re
import shutil
import time
from datetime import datetime
from typing import Dict, List, Tuple

# 字段映射关系：驼峰 -> 蛇形
FIELD_MAPPINGS = {
    'handleSendMessage': 'handle_send_message',
    'handleKeyPress': 'handle_key_press',
    'loadDashboardData': 'load_dashboard_data',
    'quickActions': 'quick_actions',
    'filteredQuickActions': 'filtered_quick_actions',
    'purchase-entry': 'purchase_entry',
    'purchase-list': 'purchase_list',
    'customer-management': 'customer_management',
    'sales-list': 'sales_list',
    'totalPurchases': 'total_purchases',
    'totalMaterials': 'total_materials',
    'totalInventoryValue': 'total_inventory_value',
    'recentPurchases': 'recent_purchases',
    'recentMaterials': 'recent_materials',
    'supplierStats': 'supplier_stats',
    'purchaseDate': 'purchase_date',
    'createdAt': 'created_at',
    'totalCost': 'total_cost',
    'supplierId': 'supplier_id',
    'totalSpent': 'total_spent',
    'purchaseCount': 'purchase_count',
    'getData': 'get_data'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}

# 需要排除的目录
EXCLUDE_DIRS = {'node_modules', '.git', 'dist', 'build', '.next'}

class HomeFieldReplacer:
    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.backup_dir = os.path.join(root_dir, 'backup_home_fields')
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_stats': {field: 0 for field in FIELD_MAPPINGS.keys()}
        }
        
    def create_backup_dir(self):
        """创建备份目录"""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
            print(f"创建备份目录: {self.backup_dir}")
    
    def backup_file(self, file_path: str) -> str:
        """备份文件"""
        rel_path = os.path.relpath(file_path, self.root_dir)
        backup_path = os.path.join(self.backup_dir, rel_path)
        backup_dir = os.path.dirname(backup_path)
        
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        shutil.copy2(file_path, backup_path)
        return backup_path
    
    def should_process_file(self, file_path: str) -> bool:
        """判断是否应该处理该文件"""
        # 检查文件扩展名
        _, ext = os.path.splitext(file_path)
        if ext not in SUPPORTED_EXTENSIONS:
            return False
        
        # 检查是否在排除目录中
        path_parts = file_path.split(os.sep)
        for exclude_dir in EXCLUDE_DIRS:
            if exclude_dir in path_parts:
                return False
        
        return True
    
    def create_replacement_patterns(self) -> List[Tuple[re.Pattern, str, str]]:
        """创建替换模式"""
        patterns = []
        
        for old_field, new_field in FIELD_MAPPINGS.items():
            # 为不同的上下文创建不同的正则模式
            contexts = [
                # 对象属性访问: obj.field
                (rf'\b(\w+)\.{re.escape(old_field)}\b', rf'\1.{new_field}'),
                # 对象属性定义: { field: value }
                (rf'\b{re.escape(old_field)}\s*:', f'{new_field}:'),
                # 变量名: const field = 
                (rf'\b(const|let|var)\s+{re.escape(old_field)}\b', rf'\1 {new_field}'),
                # 函数名: function field(
                (rf'\bfunction\s+{re.escape(old_field)}\b', f'function {new_field}'),
                # 箭头函数: const field = (
                (rf'\bconst\s+{re.escape(old_field)}\s*=', f'const {new_field} ='),
                # 解构赋值: { field }
                (rf'\{{\s*{re.escape(old_field)}\s*\}}', f'{{ {new_field} }}'),
                # 字符串字面量: 'field' 或 "field"
                (rf"(['\"]){re.escape(old_field)}\1", rf"\1{new_field}\1"),
                # 模板字符串中的属性访问
                (rf'\$\{{[^}}]*\.{re.escape(old_field)}\b[^}}]*\}}', lambda m: m.group(0).replace(old_field, new_field)),
                # 类型定义: interface { field: type }
                (rf'\b{re.escape(old_field)}\s*\?\s*:', f'{new_field}?:'),
                (rf'\b{re.escape(old_field)}\s*:', f'{new_field}:'),
                # JSX属性: <Component field={value} />
                (rf'\s{re.escape(old_field)}\s*=', f' {new_field}='),
            ]
            
            for pattern_str, replacement in contexts:
                try:
                    pattern = re.compile(pattern_str)
                    patterns.append((pattern, replacement, old_field))
                except re.error as e:
                    print(f"警告: 无法编译正则表达式 '{pattern_str}': {e}")
        
        return patterns
    
    def replace_in_content(self, content: str, patterns: List[Tuple[re.Pattern, str, str]]) -> Tuple[str, int, Dict[str, int]]:
        """在内容中进行替换"""
        modified_content = content
        total_replacements = 0
        field_replacements = {field: 0 for field in FIELD_MAPPINGS.keys()}
        
        for pattern, replacement, field_name in patterns:
            if callable(replacement):
                # 处理lambda函数替换
                matches = list(pattern.finditer(modified_content))
                for match in reversed(matches):  # 从后往前替换，避免位置偏移
                    new_text = replacement(match)
                    if new_text != match.group(0):
                        modified_content = modified_content[:match.start()] + new_text + modified_content[match.end():]
                        field_replacements[field_name] += 1
                        total_replacements += 1
            else:
                # 处理字符串替换
                new_content, count = pattern.subn(replacement, modified_content)
                if count > 0:
                    modified_content = new_content
                    field_replacements[field_name] += count
                    total_replacements += count
        
        return modified_content, total_replacements, field_replacements
    
    def process_file(self, file_path: str, patterns: List[Tuple[re.Pattern, str, str]]) -> bool:
        """处理单个文件"""
        try:
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # 进行替换
            modified_content, replacements, field_stats = self.replace_in_content(original_content, patterns)
            
            # 如果有修改，则备份并写入新内容
            if replacements > 0:
                self.backup_file(file_path)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                
                self.stats['files_modified'] += 1
                self.stats['total_replacements'] += replacements
                
                # 更新字段统计
                for field, count in field_stats.items():
                    self.stats['field_stats'][field] += count
                
                print(f"✓ 已处理: {file_path} (替换 {replacements} 处)")
                return True
            
            return False
            
        except Exception as e:
            print(f"✗ 处理文件失败 {file_path}: {e}")
            return False
    
    def run(self):
        """执行批量替换"""
        print("=" * 60)
        print("主页字段批量替换工具")
        print("=" * 60)
        print(f"目标目录: {self.root_dir}")
        print(f"支持文件类型: {', '.join(SUPPORTED_EXTENSIONS)}")
        print(f"字段映射数量: {len(FIELD_MAPPINGS)}")
        print()
        
        start_time = time.time()
        
        # 创建备份目录
        self.create_backup_dir()
        
        # 创建替换模式
        patterns = self.create_replacement_patterns()
        print(f"生成替换模式: {len(patterns)} 个")
        print()
        
        # 遍历文件
        for root, dirs, files in os.walk(self.root_dir):
            # 排除特定目录
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                file_path = os.path.join(root, file)
                
                if self.should_process_file(file_path):
                    self.stats['files_processed'] += 1
                    self.process_file(file_path, patterns)
        
        end_time = time.time()
        
        # 输出统计结果
        self.print_statistics(end_time - start_time)
    
    def print_statistics(self, duration: float):
        """打印统计结果"""
        print()
        print("=" * 60)
        print("替换完成统计")
        print("=" * 60)
        print(f"处理文件数量: {self.stats['files_processed']}")
        print(f"修改文件数量: {self.stats['files_modified']}")
        print(f"总替换次数: {self.stats['total_replacements']}")
        print(f"处理时间: {duration:.2f} 秒")
        print()
        
        # 显示每个字段的替换统计
        print("字段替换详情:")
        print("-" * 40)
        successful_fields = []
        for field, count in self.stats['field_stats'].items():
            if count > 0:
                snake_field = FIELD_MAPPINGS[field]
                print(f"  {field} → {snake_field}: {count} 次")
                successful_fields.append(field)
        
        if not successful_fields:
            print("  未发现需要替换的字段")
        else:
            print(f"\n成功转换 {len(successful_fields)} 个字段")
        
        print(f"\n备份目录: {self.backup_dir}")
        print("=" * 60)

def main():
    """主函数"""
    # 获取当前脚本所在目录作为根目录
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    replacer = HomeFieldReplacer(root_dir)
    replacer.run()

if __name__ == '__main__':
    main()