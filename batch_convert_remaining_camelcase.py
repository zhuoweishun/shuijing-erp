#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量转换剩余驼峰命名字段为蛇形命名
处理95个适合转换的字段
"""

import os
import re
import shutil
import json
from datetime import datetime
from typing import Dict, List, Tuple

# 需要转换的字段映射
CONVERSION_MAP = {
    # Schema相关字段（13个）
    'diameterSchema': 'diameter_schema',
    'specificationSchema': 'specification_schema',
    'quantitySchema': 'quantity_schema',
    'priceSchema': 'price_schema',
    'weightSchema': 'weight_schema',
    'materialTypeSchema': 'material_type_schema',
    'unitTypeSchema': 'unit_type_schema',
    'qualitySchema': 'quality_schema',
    'productNameSchema': 'product_name_schema',
    'supplierNameSchema': 'supplier_name_schema',
    'notesSchema': 'notes_schema',
    'naturalLanguageInputSchema': 'natural_language_input_schema',
    'photosSchema': 'photos_schema',
    
    # 函数参数字段（50个）
    'fieldName': 'field_name',
    'productName': 'product_name',
    'userId': 'user_id',
    'oldIp': 'old_ip',
    'newIp': 'new_ip',
    'baseIP': 'base_ip',
    'dateKey': 'date_key',
    'existingSkuCount': 'existing_sku_count',
    'materialSignature': 'material_signature',
    'priceDifference': 'price_difference',
    'updatedSku': 'updated_sku',
    'newSku': 'new_sku',
    'isNewSku': 'is_new_sku',
    'cleanAction': 'clean_action',
    'cleanReferenceType': 'clean_reference_type',
    'validActions': 'valid_actions',
    'validReferenceTypes': 'valid_reference_types',
    'updatedCount': 'updated_count',
    'updatedPhotos': 'updated_photos',
    'timeoutId': 'timeout_id',
    'isConnected': 'is_connected',
    'testUrl': 'test_url',
    'reasonMatch': 'reason_match',
    'translatedReason': 'translated_reason',
    'pinyinMap': 'pinyin_map',
    'typeOrder': 'type_order',
    'materialNameA': 'material_name_a',
    'materialNameB': 'material_name_b',
    'letterA': 'letter_a',
    'letterB': 'letter_b',
    'nameA': 'name_a',
    'nameB': 'name_b',
    'numericCode': 'numeric_code',
    'paddedCode': 'padded_code',
    'numericId': 'numeric_id',
    'paddedId': 'padded_id',
    'idStr': 'id_str',
    'dateStr': 'date_str',
    'decimalPlaces': 'decimal_places',
    'invalidChars': 'invalid_chars',
    'minValue': 'min_value',
    'maxValue': 'max_value',
    'numValue': 'num_value',
    'diameterValidation': 'diameter_validation',
    'specValidation': 'spec_validation',
    'diffInSeconds': 'diff_in_seconds',
    'maxLength': 'max_length',
    'cardNumber': 'card_number',
    'frontendRecord': 'frontend_record',
    'dbRecord': 'db_record',
    'dbRecords': 'db_records',
    'dbData': 'db_data',
    
    # 接口和类型字段（17个）
    'FinancialRecordDB': 'financial_record_db',
    'RefundRecordDB': 'refund_record_db',
    'CreateFinancialRecordRequest': 'create_financial_record_request',
    'CreateRefundRequest': 'create_refund_request',
    'FinancialRecord': 'financial_record',
    'RefundRecord': 'refund_record',
    'FinancialSummary': 'financial_summary',
    'MonthlyFinancialSummary': 'monthly_financial_summary',
    'FinancialRecordQuery': 'financial_record_query',
    'RefundRecordQuery': 'refund_record_query',
    'FinancialOverview': 'financial_overview',
    'FinancialChartData': 'financial_chart_data',
    'FinancialRecordListResponse': 'financial_record_list_response',
    'RefundRecordListResponse': 'refund_record_list_response',
    'saleRecordId': 'sale_record_id',
    'customerContact': 'customer_contact',
    'lossAmount': 'loss_amount'
}

# JavaScript原生方法，不应该被转换
JS_NATIVE_METHODS = {
    'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'constructor', 'split', 'replace', 'match', 'search',
    'indexOf', 'lastIndexOf', 'charAt', 'charCodeAt', 'substring', 'substr',
    'slice', 'toLowerCase', 'toUpperCase', 'trim', 'concat', 'includes',
    'startsWith', 'endsWith', 'repeat', 'padStart', 'padEnd', 'localeCompare',
    'normalize', 'push', 'pop', 'shift', 'unshift', 'splice', 'sort',
    'reverse', 'join', 'forEach', 'map', 'filter', 'reduce', 'reduceRight',
    'find', 'findIndex', 'some', 'every', 'keys', 'values', 'entries',
    'fill', 'copyWithin', 'flat', 'flatMap', 'from', 'isArray', 'of',
    'getTime', 'getFullYear', 'getMonth', 'getDate', 'getDay', 'getHours',
    'getMinutes', 'getSeconds', 'getMilliseconds', 'toISOString', 'toJSON',
    'setFullYear', 'setMonth', 'setDate', 'setHours', 'setMinutes', 'setSeconds'
}

class CamelCaseConverter:
    def __init__(self):
        self.conversion_stats = {
            'files_scanned': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_conversions': {}
        }
        self.backup_dir = f"backup_remaining_camelcase_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.log_file = f"remaining_camelcase_conversion_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        
    def log(self, message: str):
        """记录日志"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_message + '\n')
    
    def create_backup(self, file_path: str) -> str:
        """创建文件备份"""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
        
        # 保持相对路径结构
        rel_path = os.path.relpath(file_path, 'd:\\shuijing ERP')
        backup_path = os.path.join(self.backup_dir, rel_path)
        
        # 创建备份目录
        backup_dir = os.path.dirname(backup_path)
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        shutil.copy2(file_path, backup_path)
        return backup_path
    
    def is_safe_to_replace(self, content: str, old_name: str, new_name: str, position: int) -> bool:
        """检查是否安全替换（避免替换JS原生方法）"""
        if old_name in JS_NATIVE_METHODS:
            return False
        
        # 检查前后字符，确保是完整的标识符
        start = position
        end = position + len(old_name)
        
        # 检查前一个字符
        if start > 0:
            prev_char = content[start - 1]
            if prev_char.isalnum() or prev_char == '_':
                return False
        
        # 检查后一个字符
        if end < len(content):
            next_char = content[end]
            if next_char.isalnum() or next_char == '_':
                return False
        
        return True
    
    def convert_file(self, file_path: str) -> bool:
        """转换单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            file_replacements = 0
            file_conversions = {}
            
            # 对每个需要转换的字段进行替换
            for old_name, new_name in CONVERSION_MAP.items():
                # 使用正则表达式查找所有匹配
                pattern = r'\b' + re.escape(old_name) + r'\b'
                matches = list(re.finditer(pattern, content))
                
                if matches:
                    # 从后往前替换，避免位置偏移
                    for match in reversed(matches):
                        if self.is_safe_to_replace(content, old_name, new_name, match.start()):
                            content = content[:match.start()] + new_name + content[match.end():]
                            file_replacements += 1
                            
                            if old_name not in file_conversions:
                                file_conversions[old_name] = 0
                            file_conversions[old_name] += 1
            
            # 如果有修改，保存文件
            if content != original_content:
                # 创建备份
                backup_path = self.create_backup(file_path)
                self.log(f"备份文件: {file_path} -> {backup_path}")
                
                # 保存修改后的文件
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.log(f"修改文件: {file_path} (替换 {file_replacements} 次)")
                
                # 更新统计
                self.conversion_stats['files_modified'] += 1
                self.conversion_stats['total_replacements'] += file_replacements
                
                for field, count in file_conversions.items():
                    if field not in self.conversion_stats['field_conversions']:
                        self.conversion_stats['field_conversions'][field] = 0
                    self.conversion_stats['field_conversions'][field] += count
                
                return True
            
            return False
            
        except Exception as e:
            self.log(f"处理文件 {file_path} 时出错: {str(e)}")
            return False
    
    def scan_directory(self, directory: str) -> List[str]:
        """扫描目录获取所有需要处理的文件"""
        target_files = []
        target_extensions = {'.ts', '.tsx', '.js'}
        
        for root, dirs, files in os.walk(directory):
            # 跳过node_modules和其他不需要的目录
            dirs[:] = [d for d in dirs if d not in {'node_modules', '.git', 'dist', 'build'}]
            
            for file in files:
                if any(file.endswith(ext) for ext in target_extensions):
                    target_files.append(os.path.join(root, file))
        
        return target_files
    
    def run_conversion(self):
        """运行转换过程"""
        self.log("开始剩余驼峰命名字段转换...")
        self.log(f"需要转换的字段数量: {len(CONVERSION_MAP)}")
        
        # 扫描目标目录
        target_directories = [
            'd:\\shuijing ERP\\src',
            'd:\\shuijing ERP\\backend\\src',
            'd:\\shuijing ERP\\shared'
        ]
        
        all_files = []
        for directory in target_directories:
            if os.path.exists(directory):
                files = self.scan_directory(directory)
                all_files.extend(files)
                self.log(f"扫描目录 {directory}: 找到 {len(files)} 个文件")
            else:
                self.log(f"目录不存在: {directory}")
        
        self.log(f"总共找到 {len(all_files)} 个文件需要处理")
        
        # 处理每个文件
        for file_path in all_files:
            self.conversion_stats['files_scanned'] += 1
            self.convert_file(file_path)
        
        # 生成转换报告
        self.generate_report()
    
    def generate_report(self):
        """生成转换报告"""
        report_file = f"remaining_camelcase_conversion_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = {
            'conversion_time': datetime.now().isoformat(),
            'statistics': self.conversion_stats,
            'conversion_map': CONVERSION_MAP,
            'backup_directory': self.backup_dir,
            'log_file': self.log_file
        }
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 打印总结
        self.log("\n=== 转换完成总结 ===")
        self.log(f"扫描文件数: {self.conversion_stats['files_scanned']}")
        self.log(f"修改文件数: {self.conversion_stats['files_modified']}")
        self.log(f"总替换次数: {self.conversion_stats['total_replacements']}")
        self.log(f"转换字段数: {len(self.conversion_stats['field_conversions'])}")
        
        if self.conversion_stats['field_conversions']:
            self.log("\n转换字段统计:")
            sorted_conversions = sorted(
                self.conversion_stats['field_conversions'].items(),
                key=lambda x: x[1],
                reverse=True
            )
            for field, count in sorted_conversions[:10]:  # 显示前10个
                snake_case = CONVERSION_MAP.get(field, field)
                self.log(f"  {field} -> {snake_case}: {count} 次")
        
        self.log(f"\n备份目录: {self.backup_dir}")
        self.log(f"转换报告: {report_file}")
        self.log(f"执行日志: {self.log_file}")

def main():
    """主函数"""
    converter = CamelCaseConverter()
    converter.run_conversion()

if __name__ == '__main__':
    main()