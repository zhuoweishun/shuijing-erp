#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终驼峰转蛇形批量转换脚本
处理剩余的57个适合转换的驼峰命名字段
"""

import os
import re
import json
import shutil
from datetime import datetime
from typing import Dict, List, Tuple, Set

class FinalCamelToSnakeConverter:
    def __init__(self):
        self.project_root = os.path.dirname(os.path.abspath(__file__))
        self.backup_dir = os.path.join(self.project_root, 'backups', f'final_conversion_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.report_file = os.path.join(self.project_root, 'final_conversion_report.json')
        self.log_file = os.path.join(self.project_root, 'final_conversion_log.txt')
        
        # 需要转换的字段映射
        self.field_mappings = {
            # 后端函数名称
            'updateImageUrls': 'update_image_urls',
            'updateCommonOldIps': 'update_common_old_ips',
            'generateMaterialSignature': 'generate_material_signature',
            'generateSkuHash': 'generate_sku_hash',
            'generateSkuCode': 'generate_sku_code',
            'generateSkuName': 'generate_sku_name',
            'findOrCreateSku': 'find_or_create_sku',
            'createSkuInventoryLog': 'create_sku_inventory_log',
            'decreaseSkuQuantity': 'decrease_sku_quantity',
            'adjustSkuQuantity': 'adjust_sku_quantity',
            'calculateBeadsPerString': 'calculate_beads_per_string',
            'isValidDiameter': 'is_valid_diameter',
            'isValidSpecification': 'is_valid_specification',
            'validateProductTypeFields': 'validate_product_type_fields',
            'validateRange': 'validate_range',
            
            # Schema相关
            'diameterSchema': 'diameter_schema',
            'specificationSchema': 'specification_schema',
            
            # 前端网络工具函数
            'networkConfig': 'network_config',
            'getNetworkConfig': 'get_network_config',
            'getLocalIp': 'get_local_ip',
            'setLocalIp': 'set_local_ip',
            'checkNetworkConnection': 'check_network_connection',
            'getBestApiEndpoint': 'get_best_api_endpoint',
            
            # 前端验证工具函数
            'validateDiameter': 'validate_diameter',
            'validateSpecification': 'validate_specification',
            'validateQuantity': 'validate_quantity',
            'validatePrice': 'validate_price',
            'validateWeight': 'validate_weight',
            
            # 前端格式化工具函数
            'formatPurchaseCode': 'format_purchase_code',
            'formatAmount': 'format_amount',
            'formatCurrency': 'format_currency',
            'formatDate': 'format_date',
            'formatDateOnly': 'format_date_only',
            'formatNumber': 'format_number',
            'formatPercentage': 'format_percentage',
            'formatFileSize': 'format_file_size',
            'formatRelativeTime': 'format_relative_time',
            'truncateText': 'truncate_text',
            'formatPhone': 'format_phone',
            'formatIdCard': 'format_id_card',
            'formatBankCard': 'format_bank_card',
            'formatAddress': 'format_address',
            
            # 前端拼音排序工具函数
            'getFirstLetter': 'get_first_letter',
            'getPinyinFirstLetter': 'get_pinyin_first_letter',
            'sortByPinyin': 'sort_by_pinyin',
            'sortMaterialsByTypeAndPinyin': 'sort_materials_by_type_and_pinyin',
            
            # 前端退款相关函数
            'translateRefundReason': 'translate_refund_reason',
            'extractAndTranslateRefundReason': 'extract_and_translate_refund_reason',
            
            # 共享类型定义
            'FinancialRecord': 'financial_record',
            'FinancialRecordDB': 'financial_record_db',
            'RefundRecord': 'refund_record',
            'RefundRecordDB': 'refund_record_db',
            'CreateFinancialRecordRequest': 'create_financial_record_request',
            'CreateRefundRequest': 'create_refund_request',
            
            # 共享字段名称
            'saleRecordId': 'sale_record_id',
            'customerContact': 'customer_contact',
            'lossAmount': 'loss_amount'
        }
        
        # JavaScript原生方法，不应该被替换
        self.js_native_methods = {
            'toLocaleString', 'toISOString', 'toUpperCase', 'toLowerCase',
            'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf',
            'propertyIsEnumerable', 'toLocaleLowerCase', 'toLocaleUpperCase',
            'charAt', 'charCodeAt', 'indexOf', 'lastIndexOf', 'substring',
            'substr', 'slice', 'split', 'replace', 'match', 'search',
            'concat', 'trim', 'trimStart', 'trimEnd', 'padStart', 'padEnd',
            'repeat', 'startsWith', 'endsWith', 'includes', 'normalize',
            'localeCompare', 'getFullYear', 'getMonth', 'getDate',
            'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds',
            'getTime', 'getTimezoneOffset', 'setFullYear', 'setMonth',
            'setDate', 'setHours', 'setMinutes', 'setSeconds', 'setMilliseconds',
            'setTime', 'toDateString', 'toTimeString', 'toJSON'
        }
        
        # 扫描目录
        self.scan_directories = [
            os.path.join(self.project_root, 'src'),
            os.path.join(self.project_root, 'backend', 'src'),
            os.path.join(self.project_root, 'shared')
        ]
        
        # 文件扩展名
        self.file_extensions = {'.ts', '.tsx', '.js'}
        
        # 统计信息
        self.stats = {
            'files_scanned': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'fields_converted': set(),
            'conversion_details': {}
        }
        
        # 日志记录
        self.log_entries = []
    
    def log(self, message: str, level: str = 'INFO'):
        """记录日志"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.log_entries.append(log_entry)
        print(log_entry)
    
    def create_backup(self, file_path: str) -> str:
        """创建文件备份"""
        relative_path = os.path.relpath(file_path, self.project_root)
        backup_path = os.path.join(self.backup_dir, relative_path)
        
        # 确保备份目录存在
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        # 复制文件
        shutil.copy2(file_path, backup_path)
        return backup_path
    
    def is_js_native_method_context(self, content: str, match_start: int, match_end: int) -> bool:
        """检查是否是JavaScript原生方法调用上下文"""
        # 检查前面是否有点号（方法调用）
        if match_start > 0 and content[match_start - 1] == '.':
            return True
        
        # 检查是否在字符串中
        before_match = content[:match_start]
        quote_count_single = before_match.count("'") - before_match.count("\\'")
        quote_count_double = before_match.count('"') - before_match.count('\\"')
        quote_count_template = before_match.count('`') - before_match.count('\\`')
        
        if (quote_count_single % 2 == 1 or 
            quote_count_double % 2 == 1 or 
            quote_count_template % 2 == 1):
            return True
        
        return False
    
    def replace_in_content(self, content: str, file_path: str) -> Tuple[str, int, Dict[str, int]]:
        """在内容中进行替换"""
        modified_content = content
        total_replacements = 0
        field_replacements = {}
        
        for camel_case, snake_case in self.field_mappings.items():
            # 跳过JavaScript原生方法
            if camel_case in self.js_native_methods:
                continue
            
            # 创建更精确的正则表达式
            # 匹配函数名、变量名、类型名等，但不匹配字符串内容
            patterns = [
                # 函数声明: function name() 或 export function name()
                rf'\b(function\s+|export\s+function\s+){re.escape(camel_case)}\b',
                # 函数表达式: const name = function() 或 const name = ()
                rf'\b(const\s+|let\s+|var\s+){re.escape(camel_case)}\s*[=:]',
                # 对象方法: { name: function() } 或 { name() }
                rf'\{{\s*{re.escape(camel_case)}\s*[:(]',
                # 类方法: class { name() }
                rf'\b{re.escape(camel_case)}\s*\(',
                # 变量引用: name( 或 name.
                rf'\b{re.escape(camel_case)}\b(?=\s*[\(\.])',
                # 类型定义: interface Name 或 type Name
                rf'\b(interface\s+|type\s+){re.escape(camel_case)}\b',
                # 导入导出: import { name } 或 export { name }
                rf'\b(import\s*\{{[^}}]*|export\s*\{{[^}}]*){re.escape(camel_case)}\b',
                # 一般变量名
                rf'\b{re.escape(camel_case)}\b'
            ]
            
            replacement_count = 0
            
            for pattern in patterns:
                matches = list(re.finditer(pattern, modified_content, re.MULTILINE))
                
                for match in reversed(matches):  # 从后往前替换，避免位置偏移
                    match_start = match.start()
                    match_end = match.end()
                    
                    # 检查是否在JavaScript原生方法调用上下文中
                    if self.is_js_native_method_context(modified_content, match_start, match_end):
                        continue
                    
                    # 获取匹配的完整文本
                    match_text = match.group()
                    
                    # 替换匹配的驼峰部分
                    new_text = match_text.replace(camel_case, snake_case)
                    
                    # 执行替换
                    modified_content = (modified_content[:match_start] + 
                                      new_text + 
                                      modified_content[match_end:])
                    
                    replacement_count += 1
                    total_replacements += 1
                    
                    self.log(f"在 {file_path} 中替换: {camel_case} -> {snake_case}")
            
            if replacement_count > 0:
                field_replacements[camel_case] = replacement_count
                self.stats['fields_converted'].add(camel_case)
        
        return modified_content, total_replacements, field_replacements
    
    def process_file(self, file_path: str) -> bool:
        """处理单个文件"""
        try:
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # 进行替换
            modified_content, replacements, field_replacements = self.replace_in_content(
                original_content, file_path
            )
            
            # 如果有修改，则写入文件
            if replacements > 0:
                # 创建备份
                backup_path = self.create_backup(file_path)
                self.log(f"已备份文件: {file_path} -> {backup_path}")
                
                # 写入修改后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                
                self.stats['files_modified'] += 1
                self.stats['total_replacements'] += replacements
                self.stats['conversion_details'][file_path] = field_replacements
                
                self.log(f"已修改文件: {file_path}，替换次数: {replacements}")
                return True
            
            return False
            
        except Exception as e:
            self.log(f"处理文件 {file_path} 时出错: {str(e)}", 'ERROR')
            return False
    
    def scan_and_process(self):
        """扫描并处理所有文件"""
        self.log("开始最终驼峰转蛇形批量转换")
        
        # 确保备份目录存在
        os.makedirs(self.backup_dir, exist_ok=True)
        
        for directory in self.scan_directories:
            if not os.path.exists(directory):
                self.log(f"目录不存在，跳过: {directory}", 'WARNING')
                continue
            
            self.log(f"扫描目录: {directory}")
            
            for root, dirs, files in os.walk(directory):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # 检查文件扩展名
                    if any(file.endswith(ext) for ext in self.file_extensions):
                        self.stats['files_scanned'] += 1
                        self.process_file(file_path)
    
    def generate_report(self):
        """生成转换报告"""
        report = {
            'conversion_time': datetime.now().isoformat(),
            'statistics': {
                'files_scanned': self.stats['files_scanned'],
                'files_modified': self.stats['files_modified'],
                'total_replacements': self.stats['total_replacements'],
                'fields_converted_count': len(self.stats['fields_converted']),
                'fields_converted': list(self.stats['fields_converted'])
            },
            'field_mappings_used': {
                camel: snake for camel, snake in self.field_mappings.items() 
                if camel in self.stats['fields_converted']
            },
            'conversion_details': self.stats['conversion_details'],
            'backup_directory': self.backup_dir,
            'scan_directories': self.scan_directories
        }
        
        # 保存报告
        with open(self.report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 保存日志
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(self.log_entries))
        
        self.log(f"转换报告已保存: {self.report_file}")
        self.log(f"转换日志已保存: {self.log_file}")
    
    def print_summary(self):
        """打印转换摘要"""
        print("\n" + "="*60)
        print("最终驼峰转蛇形批量转换完成")
        print("="*60)
        print(f"扫描文件数: {self.stats['files_scanned']}")
        print(f"修改文件数: {self.stats['files_modified']}")
        print(f"总替换次数: {self.stats['total_replacements']}")
        print(f"转换字段数: {len(self.stats['fields_converted'])}")
        
        if self.stats['fields_converted']:
            print("\n转换的字段:")
            for i, field in enumerate(sorted(self.stats['fields_converted']), 1):
                snake_case = self.field_mappings[field]
                print(f"{i:2d}. {field} -> {snake_case}")
        
        print(f"\n备份目录: {self.backup_dir}")
        print(f"转换报告: {self.report_file}")
        print(f"转换日志: {self.log_file}")
        print("="*60)

def main():
    """主函数"""
    converter = FinalCamelToSnakeConverter()
    
    try:
        # 执行转换
        converter.scan_and_process()
        
        # 生成报告
        converter.generate_report()
        
        # 打印摘要
        converter.print_summary()
        
    except KeyboardInterrupt:
        converter.log("转换被用户中断", 'WARNING')
    except Exception as e:
        converter.log(f"转换过程中发生错误: {str(e)}", 'ERROR')
        raise

if __name__ == '__main__':
    main()