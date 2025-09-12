#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SKU制作相关字段蛇形命名转换脚本
批量将SKU制作相关的驼峰命名字段转换为蛇形命名
"""

import os
import re
import time
import shutil
from datetime import datetime
from typing import Dict, List, Tuple

# SKU制作相关字段转换映射表
FIELD_REPLACEMENTS = {
    # 基础信息字段
    'skuCode': 'sku_code',
    'skuName': 'sku_name', 
    'materialSignatureHash': 'material_signature_hash',
    
    # 成本价格字段
    'laborCost': 'labor_cost',
    'craftCost': 'craft_cost',
    'sellingPrice': 'selling_price',
    'materialCost': 'material_cost',
    'profitMargin': 'profit_margin',
    
    # 数量相关字段
    'productionQuantity': 'production_quantity',
    'availableQuantity': 'available_quantity',
    'quantityUsedBeads': 'quantity_used_beads',
    'quantityUsedPieces': 'quantity_used_pieces',
    'selectedQuantity': 'selected_quantity',
    'quantityUsed': 'quantity_used',
    
    # 原材料选择字段
    'selectedMaterials': 'selected_materials',
    'materialId': 'material_id',
    'materialTraces': 'material_traces',
    'requiredMaterials': 'required_materials',
    
    # 批量制作字段
    'successCount': 'success_count',
    'failedCount': 'failed_count',
    'createdProducts': 'created_products',
    'failedProducts': 'failed_products',
    'materialCode': 'material_code',
    'errorCode': 'error_code',
    
    # 查询参数字段
    'availableOnly': 'available_only'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}

# 需要处理的目录
TARGET_DIRECTORIES = ['src', 'backend', 'shared', 'tests']

class SkuFieldReplacer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.backup_dir = os.path.join(project_root, 'backup_sku_fields')
        self.processed_files = 0
        self.modified_files = 0
        self.total_replacements = 0
        self.replacement_stats = {field: 0 for field in FIELD_REPLACEMENTS.keys()}
        self.start_time = None
        
    def create_backup_directory(self):
        """创建备份目录"""
        if os.path.exists(self.backup_dir):
            shutil.rmtree(self.backup_dir)
        os.makedirs(self.backup_dir, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
        
    def backup_file(self, file_path: str) -> str:
        """备份文件"""
        rel_path = os.path.relpath(file_path, self.project_root)
        backup_path = os.path.join(self.backup_dir, rel_path)
        backup_dir = os.path.dirname(backup_path)
        os.makedirs(backup_dir, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        return backup_path
        
    def is_target_file(self, file_path: str) -> bool:
        """检查是否为目标文件"""
        if not os.path.isfile(file_path):
            return False
            
        # 检查文件扩展名
        _, ext = os.path.splitext(file_path)
        if ext not in SUPPORTED_EXTENSIONS:
            return False
            
        # 排除备份文件和node_modules
        if 'node_modules' in file_path or 'backup_' in file_path:
            return False
            
        return True
        
    def create_replacement_patterns(self) -> List[Tuple[re.Pattern, str, str]]:
        """创建替换模式"""
        patterns = []
        
        for old_field, new_field in FIELD_REPLACEMENTS.items():
            # 1. 对象属性访问: obj.fieldName
            patterns.append((
                re.compile(rf'\b(\w+)\.{re.escape(old_field)}\b'),
                rf'\1.{new_field}',
                old_field
            ))
            
            # 2. 对象属性定义: { fieldName: value }
            patterns.append((
                re.compile(rf'\b{re.escape(old_field)}:'),
                f'{new_field}:',
                old_field
            ))
            
            # 3. 解构赋值: { fieldName }
            patterns.append((
                re.compile(rf'\{{\s*{re.escape(old_field)}\s*\}}'),
                f'{{ {new_field} }}',
                old_field
            ))
            
            # 4. 解构赋值中的字段: { fieldName, otherField }
            patterns.append((
                re.compile(rf'\{{([^}}]*?)\b{re.escape(old_field)}\b([^{{]*?)\}}'),
                rf'{{\1{new_field}\2}}',
                old_field
            ))
            
            # 5. 接口定义: fieldName: type
            patterns.append((
                re.compile(rf'^(\s*){re.escape(old_field)}(\??):\s*', re.MULTILINE),
                rf'\1{new_field}\2: ',
                old_field
            ))
            
            # 6. 变量名: const fieldName = 
            patterns.append((
                re.compile(rf'\b(const|let|var)\s+{re.escape(old_field)}\b'),
                rf'\1 {new_field}',
                old_field
            ))
            
            # 7. 函数参数: function(fieldName)
            patterns.append((
                re.compile(rf'\(([^)]*)\b{re.escape(old_field)}\b([^)]*)\)'),
                rf'(\1{new_field}\2)',
                old_field
            ))
            
            # 8. 数组解构: [fieldName]
            patterns.append((
                re.compile(rf'\[([^\]]*)\b{re.escape(old_field)}\b([^\[]*)\]'),
                rf'[\1{new_field}\2]',
                old_field
            ))
            
        return patterns
        
    def process_file(self, file_path: str) -> bool:
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original_content = content
            patterns = self.create_replacement_patterns()
            file_replacements = 0
            
            # 应用所有替换模式
            for pattern, replacement, field_name in patterns:
                matches = pattern.findall(content)
                if matches:
                    content = pattern.sub(replacement, content)
                    match_count = len(matches)
                    file_replacements += match_count
                    self.replacement_stats[field_name] += match_count
                    
            # 如果有修改，保存文件
            if content != original_content:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修改后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.modified_files += 1
                self.total_replacements += file_replacements
                print(f"✅ 修改文件: {file_path} (替换 {file_replacements} 处)")
                return True
                
            return False
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return False
            
    def process_directory(self, directory: str):
        """处理目录"""
        if not os.path.exists(directory):
            print(f"⚠️  目录不存在: {directory}")
            return
            
        print(f"🔍 处理目录: {directory}")
        
        for root, dirs, files in os.walk(directory):
            # 跳过node_modules和备份目录
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git'] and not d.startswith('backup_')]
            
            for file in files:
                file_path = os.path.join(root, file)
                if self.is_target_file(file_path):
                    self.processed_files += 1
                    self.process_file(file_path)
                    
    def run(self):
        """运行替换脚本"""
        self.start_time = time.time()
        print("🚀 开始SKU制作字段蛇形命名转换...")
        print(f"📁 项目根目录: {self.project_root}")
        print(f"🎯 目标字段数量: {len(FIELD_REPLACEMENTS)}")
        
        # 创建备份目录
        self.create_backup_directory()
        
        # 处理各个目录
        for directory in TARGET_DIRECTORIES:
            dir_path = os.path.join(self.project_root, directory)
            self.process_directory(dir_path)
            
        # 生成报告
        self.generate_report()
        
    def generate_report(self):
        """生成处理报告"""
        end_time = time.time()
        duration = end_time - self.start_time
        
        print("\n" + "="*60)
        print("📊 SKU制作字段蛇形命名转换完成报告")
        print("="*60)
        print(f"⏱️  处理时间: {duration:.2f} 秒")
        print(f"📁 处理文件总数: {self.processed_files}")
        print(f"✏️  修改文件数量: {self.modified_files}")
        print(f"🔄 总替换次数: {self.total_replacements}")
        print(f"💾 备份目录: {self.backup_dir}")
        
        print("\n📋 字段替换统计:")
        print("-" * 50)
        
        # 按替换次数排序
        sorted_stats = sorted(self.replacement_stats.items(), key=lambda x: x[1], reverse=True)
        
        for field, count in sorted_stats:
            if count > 0:
                new_field = FIELD_REPLACEMENTS[field]
                print(f"  {field:25} → {new_field:25} ({count:3d} 次)")
                
        # 统计未替换的字段
        unreplaced_fields = [field for field, count in self.replacement_stats.items() if count == 0]
        if unreplaced_fields:
            print(f"\n⚠️  未找到的字段 ({len(unreplaced_fields)} 个):")
            for field in unreplaced_fields:
                print(f"  - {field}")
                
        print("\n✅ SKU制作字段蛇形命名转换完成！")
        
        # 保存详细报告到文件
        report_file = os.path.join(self.project_root, 'sku_field_replacement_report.txt')
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"SKU制作字段蛇形命名转换报告\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"处理时间: {duration:.2f} 秒\n")
            f.write(f"处理文件总数: {self.processed_files}\n")
            f.write(f"修改文件数量: {self.modified_files}\n")
            f.write(f"总替换次数: {self.total_replacements}\n\n")
            
            f.write("字段替换详情:\n")
            for field, count in sorted_stats:
                if count > 0:
                    new_field = FIELD_REPLACEMENTS[field]
                    f.write(f"{field} → {new_field}: {count} 次\n")
                    
        print(f"📄 详细报告已保存到: {report_file}")

def main():
    """主函数"""
    project_root = os.getcwd()
    print(f"当前工作目录: {project_root}")
    
    replacer = SkuFieldReplacer(project_root)
    replacer.run()

if __name__ == '__main__':
    main()