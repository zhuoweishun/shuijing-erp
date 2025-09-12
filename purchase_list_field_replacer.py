#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
采购列表字段蛇形命名转换脚本
批量将采购列表相关的驼峰命名字段转换为蛇形命名
"""

import os
import re
import json
import shutil
import time
from pathlib import Path
from typing import Dict, List, Tuple

# 字段映射关系
FIELD_MAPPINGS = {
    # 状态管理字段转换 (23个)
    'isLoading': 'is_loading',
    'currentPage': 'current_page',
    'pageSize': 'page_size',
    'totalCount': 'total_count',
    'totalPages': 'total_pages',
    'searchTerm': 'search_term',
    'qualityFilter': 'quality_filter',
    'supplierFilter': 'supplier_filter',
    'materialTypesFilter': 'material_types_filter',
    'specificationMin': 'specification_min',
    'specificationMax': 'specification_max',
    'totalPriceMin': 'total_price_min',
    'totalPriceMax': 'total_price_max',
    'columnFilters': 'column_filters',
    'detailModal': 'detail_modal',
    'isOpen': 'is_open',
    'purchaseId': 'purchase_id',
    'isEditMode': 'is_edit_mode',
    'imagePreview': 'image_preview',
    'imageUrl': 'image_url',
    'altText': 'alt_text',
    'exportExcel': 'export_excel',
    'isVisible': 'is_visible',
    'filterType': 'filter_type',
    
    # 函数名转换 (22个)
    'fetchPurchases': 'fetch_purchases',
    'fetchAllSuppliers': 'fetch_all_suppliers',
    'applyFiltersImmediately': 'apply_filters_immediately',
    'handleReset': 'handle_reset',
    'handleSort': 'handle_sort',
    'toggleColumnFilter': 'toggle_column_filter',
    'handlePageChange': 'handle_page_change',
    'openDetailModal': 'open_detail_modal',
    'closeDetailModal': 'close_detail_modal',
    'openImagePreview': 'open_image_preview',
    'closeImagePreview': 'close_image_preview',
    'handleExportExcel': 'handle_export_excel',
    'handleEdit': 'handle_edit',
    'formatDate': 'format_date',
    'formatPrice': 'format_price',
    'formatWeight': 'format_weight',
    'formatSensitivePrice': 'format_sensitive_price',
    'formatQuality': 'format_quality',
    'getUniqueSuppliers': 'get_unique_suppliers',
    'getFilterPosition': 'get_filter_position',
    'updateFilterPosition': 'update_filter_position',
    'renderColumnFilter': 'render_column_filter',
    
    # 格式化函数转换 (4个)
    'formatProductType': 'format_product_type',
    'formatSpecification': 'format_specification',
    'formatQuantity': 'format_quantity',
    'getFirstPhotoUrl': 'get_first_photo_url'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json'}

# 需要遍历的目录
TARGET_DIRECTORIES = ['src', 'backend', 'shared', 'tests']

# 备份目录
BACKUP_DIR = 'backup_purchase_list_fields'

class PurchaseListFieldReplacer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / BACKUP_DIR
        self.stats = {
            'total_files_processed': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_replacements': {field: 0 for field in FIELD_MAPPINGS.keys()},
            'processing_time': 0,
            'modified_files': []
        }
        
    def create_backup_dir(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
        
    def backup_file(self, file_path: Path):
        """备份文件"""
        relative_path = file_path.relative_to(self.project_root)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        
    def should_process_file(self, file_path: Path) -> bool:
        """判断是否应该处理该文件"""
        # 检查文件扩展名
        if file_path.suffix not in SUPPORTED_EXTENSIONS:
            return False
            
        # 跳过备份目录
        if BACKUP_DIR in str(file_path):
            return False
            
        # 跳过node_modules等目录
        skip_dirs = {'node_modules', '.git', 'dist', 'build', 'coverage'}
        if any(skip_dir in file_path.parts for skip_dir in skip_dirs):
            return False
            
        return True
        
    def create_replacement_patterns(self) -> List[Tuple[re.Pattern, str, str]]:
        """创建替换模式"""
        patterns = []
        
        for old_field, new_field in FIELD_MAPPINGS.items():
            # 精确匹配模式，避免误替换
            # 匹配变量声明、对象属性、函数调用等
            pattern_strings = [
                # 变量声明: const/let/var oldField
                rf'\b(const|let|var)\s+{re.escape(old_field)}\b',
                # 对象属性: .oldField 或 ['oldField']
                rf'\.{re.escape(old_field)}\b',
                rf"\['{re.escape(old_field)}'\]",
                rf'\["{re.escape(old_field)}"\]',
                # 函数名: function oldField 或 oldField = function
                rf'\bfunction\s+{re.escape(old_field)}\b',
                rf'\b{re.escape(old_field)}\s*=\s*function',
                rf'\b{re.escape(old_field)}\s*=\s*\(',
                rf'\b{re.escape(old_field)}\s*:\s*function',
                rf'\b{re.escape(old_field)}\s*:\s*\(',
                # 箭头函数: oldField = () =>
                rf'\b{re.escape(old_field)}\s*=\s*\([^)]*\)\s*=>',
                rf'\b{re.escape(old_field)}\s*=\s*[^=]*=>',
                # 对象方法: oldField() 或 oldField:
                rf'\b{re.escape(old_field)}\s*\(',
                rf'\b{re.escape(old_field)}\s*:',
                # 解构赋值: { oldField }
                rf'\{{[^}}]*\b{re.escape(old_field)}\b[^}}]*\}}',
                # 类型定义: oldField?
                rf'\b{re.escape(old_field)}\?',
                # JSX属性
                rf'\b{re.escape(old_field)}\s*=',
            ]
            
            for pattern_str in pattern_strings:
                try:
                    pattern = re.compile(pattern_str)
                    patterns.append((pattern, old_field, new_field))
                except re.error:
                    continue
                    
        return patterns
        
    def replace_in_content(self, content: str, file_path: Path) -> Tuple[str, int]:
        """在内容中进行替换"""
        modified_content = content
        total_replacements = 0
        
        for old_field, new_field in FIELD_MAPPINGS.items():
            # 使用更精确的替换策略
            replacements_made = 0
            
            # 1. 替换变量声明
            pattern = rf'\b(const|let|var)\s+{re.escape(old_field)}\b'
            new_content, count = re.subn(pattern, rf'\1 {new_field}', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 2. 替换对象属性访问
            pattern = rf'\.{re.escape(old_field)}\b'
            new_content, count = re.subn(pattern, f'.{new_field}', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 3. 替换对象属性定义
            pattern = rf'\b{re.escape(old_field)}\s*:'
            new_content, count = re.subn(pattern, f'{new_field}:', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 4. 替换函数调用
            pattern = rf'\b{re.escape(old_field)}\s*\('
            new_content, count = re.subn(pattern, f'{new_field}(', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 5. 替换函数定义
            pattern = rf'\bfunction\s+{re.escape(old_field)}\b'
            new_content, count = re.subn(pattern, f'function {new_field}', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 6. 替换箭头函数
            pattern = rf'\b{re.escape(old_field)}\s*=\s*\('
            new_content, count = re.subn(pattern, f'{new_field} = (', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 7. 替换解构赋值中的字段
            pattern = rf'(\{{[^}}]*\b){re.escape(old_field)}(\b[^}}]*\}})'
            new_content, count = re.subn(pattern, rf'\1{new_field}\2', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 8. 替换JSX属性
            pattern = rf'\b{re.escape(old_field)}\s*='
            new_content, count = re.subn(pattern, f'{new_field}=', modified_content)
            modified_content = new_content
            replacements_made += count
            
            # 9. 替换字符串中的属性名
            pattern = rf"'{re.escape(old_field)}'"
            new_content, count = re.subn(pattern, f"'{new_field}'", modified_content)
            modified_content = new_content
            replacements_made += count
            
            pattern = rf'"{re.escape(old_field)}"'
            new_content, count = re.subn(pattern, f'"{new_field}"', modified_content)
            modified_content = new_content
            replacements_made += count
            
            if replacements_made > 0:
                self.stats['field_replacements'][old_field] += replacements_made
                total_replacements += replacements_made
                
        return modified_content, total_replacements
        
    def process_file(self, file_path: Path):
        """处理单个文件"""
        try:
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            # 进行替换
            modified_content, replacements = self.replace_in_content(original_content, file_path)
            
            # 如果有修改，备份并写入新内容
            if replacements > 0:
                self.backup_file(file_path)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                    
                self.stats['files_modified'] += 1
                self.stats['total_replacements'] += replacements
                self.stats['modified_files'].append(str(file_path.relative_to(self.project_root)))
                
                print(f"✅ 修改文件: {file_path.relative_to(self.project_root)} ({replacements}处替换)")
                
        except Exception as e:
            print(f"❌ 处理文件失败: {file_path} - {e}")
            
    def process_directory(self, directory: Path):
        """处理目录"""
        if not directory.exists():
            print(f"⚠️ 目录不存在: {directory}")
            return
            
        print(f"📁 处理目录: {directory}")
        
        for file_path in directory.rglob('*'):
            if file_path.is_file() and self.should_process_file(file_path):
                self.process_file(file_path)
                self.stats['total_files_processed'] += 1
                
    def generate_report(self):
        """生成处理报告"""
        report = {
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'processing_time_seconds': self.stats['processing_time'],
            'summary': {
                'total_files_processed': self.stats['total_files_processed'],
                'files_modified': self.stats['files_modified'],
                'total_replacements': self.stats['total_replacements']
            },
            'field_replacements': {k: v for k, v in self.stats['field_replacements'].items() if v > 0},
            'modified_files': self.stats['modified_files']
        }
        
        report_file = self.project_root / 'purchase_list_field_replacement_report.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            
        print(f"📊 生成报告: {report_file}")
        return report
        
    def run(self):
        """执行替换操作"""
        start_time = time.time()
        
        print("🚀 开始采购列表字段蛇形命名转换...")
        print(f"📂 项目根目录: {self.project_root}")
        print(f"🔄 需要转换的字段数量: {len(FIELD_MAPPINGS)}")
        
        # 创建备份目录
        self.create_backup_dir()
        
        # 处理各个目录
        for dir_name in TARGET_DIRECTORIES:
            target_dir = self.project_root / dir_name
            self.process_directory(target_dir)
            
        # 计算处理时间
        self.stats['processing_time'] = round(time.time() - start_time, 2)
        
        # 生成报告
        report = self.generate_report()
        
        # 输出统计信息
        print("\n" + "="*60)
        print("📊 采购列表字段替换完成统计")
        print("="*60)
        print(f"⏱️ 处理时间: {self.stats['processing_time']}秒")
        print(f"📁 处理文件: {self.stats['total_files_processed']}个")
        print(f"✏️ 修改文件: {self.stats['files_modified']}个")
        print(f"🔄 总替换数: {self.stats['total_replacements']}处")
        
        print("\n🎯 成功转换的字段:")
        successful_fields = {k: v for k, v in self.stats['field_replacements'].items() if v > 0}
        for i, (field, count) in enumerate(successful_fields.items(), 1):
            snake_case = FIELD_MAPPINGS[field]
            print(f"{i:2d}. {field} → {snake_case} ({count}处)")
            
        if not successful_fields:
            print("   无字段需要转换")
            
        print(f"\n💾 备份目录: {self.backup_dir}")
        print(f"📋 详细报告: purchase_list_field_replacement_report.json")
        print("\n🎉 采购列表相关的蛇形命名改造完成！")

def main():
    """主函数"""
    project_root = os.getcwd()
    replacer = PurchaseListFieldReplacer(project_root)
    replacer.run()

if __name__ == '__main__':
    main()