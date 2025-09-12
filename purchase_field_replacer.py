#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
采购录入字段蛇形命名转换脚本
批量将采购录入相关的驼峰命名字段转换为蛇形命名
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

# 字段映射关系
FIELD_MAPPINGS = {
    # 状态管理字段转换 (12个)
    'selectedMaterialType': 'selected_material_type',
    'selectedUnitType': 'selected_unit_type', 
    'isCameraActive': 'is_camera_active',
    'cameraError': 'camera_error',
    'forceEnableCamera': 'force_enable_camera',
    'fileDataList': 'file_data_list',
    'aiParsing': 'ai_parsing',
    'loadingSuppliers': 'loading_suppliers',
    'supplierInput': 'supplier_input',
    'showSupplierDropdown': 'show_supplier_dropdown',
    'filteredSuppliers': 'filtered_suppliers',
    'creatingSupplier': 'creating_supplier',
    
    # 函数名转换 (7个)
    'handleMaterialTypeChange': 'handle_material_type_change',
    'loadSuppliers': 'load_suppliers',
    'handleSupplierInputChange': 'handle_supplier_input_change',
    'handleSupplierSelect': 'handle_supplier_select',
    'handleAiParse': 'handle_ai_parse',
    'calculateMissingValue': 'calculate_missing_value',
    'onSubmit': 'on_submit',
    
    # 计算字段转换 (4个)
    'beadsPerString': 'beads_per_string',
    'totalBeads': 'total_beads',
    'unitPrice': 'unit_price',
    'pricePerBead': 'price_per_bead',
    
    # 其他字段转换 (6个)
    'purchaseCode': 'purchase_code',
    'supplierId': 'supplier_id',
    'createdBy': 'created_by',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'aiRecognitionResult': 'ai_recognition_result'
}

# 支持的文件扩展名
SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json'}

# 需要遍历的目录
TARGET_DIRECTORIES = ['src', 'backend', 'shared', 'tests']

# 备份目录
BACKUP_DIR = 'backup_purchase_fields'

class PurchaseFieldReplacer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / BACKUP_DIR
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_stats': {field: 0 for field in FIELD_MAPPINGS.keys()},
            'start_time': datetime.now()
        }
        
    def create_backup_dir(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
        
    def backup_file(self, file_path):
        """备份文件"""
        relative_path = file_path.relative_to(self.project_root)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        
    def should_process_file(self, file_path):
        """判断是否需要处理该文件"""
        # 检查文件扩展名
        if file_path.suffix not in SUPPORTED_EXTENSIONS:
            return False
            
        # 排除备份目录
        if BACKUP_DIR in str(file_path):
            return False
            
        # 排除node_modules等目录
        exclude_dirs = {'node_modules', '.git', 'dist', 'build', 'coverage'}
        if any(part in exclude_dirs for part in file_path.parts):
            return False
            
        return True
        
    def create_replacement_patterns(self):
        """创建替换模式"""
        patterns = []
        
        for old_field, new_field in FIELD_MAPPINGS.items():
            # 1. 变量声明和赋值 (const, let, var)
            patterns.append({
                'pattern': rf'\b(const|let|var)\s+{re.escape(old_field)}\b',
                'replacement': rf'\1 {new_field}',
                'field': old_field
            })
            
            # 2. 对象属性访问
            patterns.append({
                'pattern': rf'\.{re.escape(old_field)}\b',
                'replacement': f'.{new_field}',
                'field': old_field
            })
            
            # 3. 对象属性定义
            patterns.append({
                'pattern': rf'\b{re.escape(old_field)}:',
                'replacement': f'{new_field}:',
                'field': old_field
            })
            
            # 4. 解构赋值
            patterns.append({
                'pattern': rf'\{{[^}}]*\b{re.escape(old_field)}\b[^}}]*\}}',
                'replacement': lambda m, nf=new_field, of=old_field: m.group(0).replace(of, nf),
                'field': old_field
            })
            
            # 5. 函数调用
            patterns.append({
                'pattern': rf'\b{re.escape(old_field)}\s*\(',
                'replacement': f'{new_field}(',
                'field': old_field
            })
            
            # 6. 函数定义
            patterns.append({
                'pattern': rf'\bfunction\s+{re.escape(old_field)}\b',
                'replacement': f'function {new_field}',
                'field': old_field
            })
            
            # 7. 箭头函数赋值
            patterns.append({
                'pattern': rf'\bconst\s+{re.escape(old_field)}\s*=\s*\(',
                'replacement': f'const {new_field} = (',
                'field': old_field
            })
            
            # 8. React Hook 使用
            patterns.append({
                'pattern': rf'\b{re.escape(old_field)},\s*set',
                'replacement': f'{new_field}, set',
                'field': old_field
            })
            
            # 9. setState 函数名
            if old_field.startswith('set'):
                continue  # 跳过set开头的字段
            set_old = f'set{old_field[0].upper()}{old_field[1:]}'
            set_new = f'set_{new_field}'
            patterns.append({
                'pattern': rf'\b{re.escape(set_old)}\b',
                'replacement': set_new,
                'field': old_field
            })
            
        return patterns
        
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original_content = content
            file_replacements = 0
            
            patterns = self.create_replacement_patterns()
            
            for pattern_info in patterns:
                pattern = pattern_info['pattern']
                replacement = pattern_info['replacement']
                field = pattern_info['field']
                
                if callable(replacement):
                    # 处理复杂替换（如解构赋值）
                    matches = list(re.finditer(pattern, content))
                    for match in reversed(matches):  # 从后往前替换避免位置偏移
                        new_text = replacement(match)
                        if new_text != match.group(0):
                            content = content[:match.start()] + new_text + content[match.end():]
                            file_replacements += 1
                            self.stats['field_stats'][field] += 1
                else:
                    # 简单字符串替换
                    new_content, count = re.subn(pattern, replacement, content)
                    if count > 0:
                        content = new_content
                        file_replacements += count
                        self.stats['field_stats'][field] += count
                        
            self.stats['files_processed'] += 1
            
            if content != original_content:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修改后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.stats['files_modified'] += 1
                self.stats['total_replacements'] += file_replacements
                
                print(f"✅ 修改文件: {file_path.relative_to(self.project_root)} (替换 {file_replacements} 处)")
                
        except Exception as e:
            print(f"❌ 处理文件失败: {file_path} - {str(e)}")
            
    def process_directory(self, directory):
        """处理目录"""
        dir_path = self.project_root / directory
        if not dir_path.exists():
            print(f"⚠️  目录不存在: {directory}")
            return
            
        print(f"🔍 处理目录: {directory}")
        
        for file_path in dir_path.rglob('*'):
            if file_path.is_file() and self.should_process_file(file_path):
                self.process_file(file_path)
                
    def generate_report(self):
        """生成处理报告"""
        end_time = datetime.now()
        duration = end_time - self.stats['start_time']
        
        report = {
            'timestamp': end_time.isoformat(),
            'duration_seconds': duration.total_seconds(),
            'summary': {
                'files_processed': self.stats['files_processed'],
                'files_modified': self.stats['files_modified'],
                'total_replacements': self.stats['total_replacements']
            },
            'field_replacements': {}
        }
        
        # 只包含有替换的字段
        for field, count in self.stats['field_stats'].items():
            if count > 0:
                report['field_replacements'][f'{field} → {FIELD_MAPPINGS[field]}'] = count
                
        # 保存报告
        report_file = self.project_root / 'purchase_field_replacement_report.json'
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            
        return report
        
    def run(self):
        """执行字段替换"""
        print("🚀 开始采购录入字段蛇形命名转换...")
        print(f"📁 项目根目录: {self.project_root}")
        print(f"🔄 需要转换的字段数量: {len(FIELD_MAPPINGS)}")
        
        # 创建备份目录
        self.create_backup_dir()
        
        # 处理各个目录
        for directory in TARGET_DIRECTORIES:
            self.process_directory(directory)
            
        # 生成报告
        report = self.generate_report()
        
        # 打印总结
        print("\n" + "="*60)
        print("📊 采购录入字段转换完成！")
        print("="*60)
        print(f"⏱️  处理时间: {report['duration_seconds']:.2f} 秒")
        print(f"📁 处理文件: {report['summary']['files_processed']} 个")
        print(f"✏️  修改文件: {report['summary']['files_modified']} 个")
        print(f"🔄 总替换数: {report['summary']['total_replacements']} 处")
        
        if report['field_replacements']:
            print("\n🎯 字段转换详情:")
            for field_mapping, count in report['field_replacements'].items():
                print(f"   {field_mapping}: {count} 处")
        else:
            print("\n⚠️  未发现需要转换的字段")
            
        print(f"\n📄 详细报告: purchase_field_replacement_report.json")
        print(f"💾 备份目录: {BACKUP_DIR}/")
        
def main():
    """主函数"""
    project_root = Path.cwd()
    replacer = PurchaseFieldReplacer(project_root)
    replacer.run()
    
if __name__ == '__main__':
    main()