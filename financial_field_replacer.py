#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
财务管理板块字段蛇形命名转换脚本
批量处理前后端代码中的驼峰命名字段转换为蛇形命名
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
import json

class FinancialFieldReplacer:
    def __init__(self):
        self.project_root = Path("d:/shuijing ERP")
        self.backup_dir = self.project_root / "backups" / f"financial_fields_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # 需要转换的字段映射 (26个)
        self.field_mappings = {
            # 基础字段
            'recordType': 'record_type',
            'referenceType': 'reference_type',
            'referenceId': 'reference_id',
            'transactionDate': 'transaction_date',
            'userId': 'user_id',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            
            # 统计字段
            'totalIncome': 'total_income',
            'totalExpense': 'total_expense',
            'totalRefund': 'total_refund',
            'totalLoss': 'total_loss',
            'netProfit': 'net_profit',
            'yearMonth': 'year_month',
            
            # 概览字段
            'thisMonth': 'this_month',
            'thisYear': 'this_year',
            'recentTransactions': 'recent_transactions',
            
            # 图表数据字段
            'incomeData': 'income_data',
            'expenseData': 'expense_data',
            'profitData': 'profit_data',
            
            # 库存状况字段
            'stalePeriodMonths': 'stale_period_months',
            'staleThresholdDate': 'stale_threshold_date',
            'materialInventory': 'material_inventory',
            'skuInventory': 'sku_inventory',
            'totalInventory': 'total_inventory',
            'staleCost': 'stale_cost',
            'staleCount': 'stale_count',
            'staleRatio': 'stale_ratio',
            
            # 退货相关字段
            'refundAmount': 'refund_amount',
            'customerName': 'customer_name',
            
            # 状态管理字段
            'isLoading': 'is_loading',
            'activeTab': 'active_tab',
            'financialRecords': 'financial_records',
            
            # 分页字段
            'totalPages': 'total_pages'
        }
        
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_replacements': {field: 0 for field in self.field_mappings.keys()},
            'errors': []
        }
        
        # 目标目录
        self.target_dirs = [
            self.project_root / "src",
            self.project_root / "backend" / "src",
            self.project_root / "shared"
        ]
        
        # 文件扩展名
        self.file_extensions = ['.ts', '.tsx']
    
    def create_backup(self, file_path):
        """创建文件备份"""
        try:
            relative_path = file_path.relative_to(self.project_root)
            backup_path = self.backup_dir / relative_path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, backup_path)
            return True
        except Exception as e:
            self.stats['errors'].append(f"备份文件失败 {file_path}: {str(e)}")
            return False
    
    def replace_in_content(self, content, file_path):
        """在内容中进行字段替换"""
        modified = False
        original_content = content
        
        for old_field, new_field in self.field_mappings.items():
            # 计算替换前该字段的出现次数
            old_count = len(re.findall(rf'\b{old_field}\b', content))
            
            # 多种匹配和替换模式
            replacements = [
                # 对象属性访问: obj.fieldName
                (rf'\b(\w+)\.{old_field}\b', rf'\1.{new_field}'),
                # 对象属性定义: { fieldName: value } 或 { fieldName, }
                (rf'\{{([^}}]*?)\b{old_field}\b([^{{]*?)\}}', lambda m: m.group(0).replace(old_field, new_field)),
                # 解构赋值: { fieldName } = obj
                (rf'\{{\s*{old_field}\s*\}}', f'{{ {new_field} }}'),
                # 变量声明: const fieldName = 
                (rf'\b(const|let|var)\s+{old_field}\b', rf'\1 {new_field}'),
                # 函数参数: function(fieldName) 或 (fieldName, other)
                (rf'\(([^)]*)\b{old_field}\b([^)]*)\)', lambda m: f"({m.group(1).replace(old_field, new_field)}{m.group(2)})"),
                # 字符串中的字段名: "fieldName" 或 'fieldName'
                (rf'["\']({old_field})["\']', rf'"{new_field}"'),
                # 类型定义: fieldName: type 或 fieldName?: type
                (rf'\b{old_field}(\??\s*):', rf'{new_field}\1:'),
                # 数组/对象方法调用中的字段
                (rf'\.map\(([^)]*)\b{old_field}\b([^)]*)\)', lambda m: f".map({m.group(1).replace(old_field, new_field)}{m.group(2)})"),
                (rf'\.filter\(([^)]*)\b{old_field}\b([^)]*)\)', lambda m: f".filter({m.group(1).replace(old_field, new_field)}{m.group(2)})"),
                (rf'\.sort\(([^)]*)\b{old_field}\b([^)]*)\)', lambda m: f".sort({m.group(1).replace(old_field, new_field)}{m.group(2)})"),
                # 简单的字段名替换（最后执行，避免过度匹配）
                (rf'\b{old_field}\b(?![a-zA-Z_])', new_field),
            ]
            
            for pattern, replacement in replacements:
                if callable(replacement):
                    # 使用lambda函数进行复杂替换
                    content = re.sub(pattern, replacement, content)
                else:
                    # 简单字符串替换
                    content = re.sub(pattern, replacement, content)
            
            # 计算替换后该字段的出现次数变化
            new_count = len(re.findall(rf'\b{new_field}\b', content))
            old_remaining = len(re.findall(rf'\b{old_field}\b', content))
            
            if old_remaining < old_count:
                replacements_made = old_count - old_remaining
                self.stats['field_replacements'][old_field] += replacements_made
                modified = True
        
        return content, modified
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            print(f"处理文件: {file_path}")
            
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 进行字段替换
            new_content, modified = self.replace_in_content(content, file_path)
            
            if modified:
                # 创建备份
                if self.create_backup(file_path):
                    # 写入修改后的内容
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    self.stats['files_modified'] += 1
                    print(f"  ✓ 文件已修改并备份")
                else:
                    print(f"  ✗ 备份失败，跳过修改")
            else:
                print(f"  - 无需修改")
            
            self.stats['files_processed'] += 1
            
        except Exception as e:
            error_msg = f"处理文件失败 {file_path}: {str(e)}"
            self.stats['errors'].append(error_msg)
            print(f"  ✗ {error_msg}")
    
    def scan_and_process(self):
        """扫描并处理所有目标文件"""
        print("开始扫描和处理文件...")
        print(f"备份目录: {self.backup_dir}")
        
        # 创建备份目录
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        for target_dir in self.target_dirs:
            if not target_dir.exists():
                print(f"目录不存在，跳过: {target_dir}")
                continue
            
            print(f"\n扫描目录: {target_dir}")
            
            for file_path in target_dir.rglob('*'):
                if file_path.is_file() and file_path.suffix in self.file_extensions:
                    self.process_file(file_path)
    
    def generate_report(self):
        """生成转换报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_fields_to_convert': len(self.field_mappings),
                'files_processed': self.stats['files_processed'],
                'files_modified': self.stats['files_modified'],
                'total_replacements': sum(self.stats['field_replacements'].values()),
                'backup_directory': str(self.backup_dir)
            },
            'field_replacements': self.stats['field_replacements'],
            'errors': self.stats['errors']
        }
        
        # 保存报告
        report_file = self.project_root / f"financial_field_conversion_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 打印报告摘要
        print("\n" + "="*60)
        print("财务管理字段转换报告")
        print("="*60)
        print(f"处理时间: {report['timestamp']}")
        print(f"总字段数: {report['summary']['total_fields_to_convert']}")
        print(f"处理文件数: {report['summary']['files_processed']}")
        print(f"修改文件数: {report['summary']['files_modified']}")
        print(f"总替换次数: {report['summary']['total_replacements']}")
        print(f"备份目录: {report['summary']['backup_directory']}")
        
        if self.stats['errors']:
            print(f"\n错误数量: {len(self.stats['errors'])}")
            for error in self.stats['errors']:
                print(f"  - {error}")
        
        print(f"\n详细报告已保存到: {report_file}")
        
        # 显示字段替换统计
        print("\n字段替换统计:")
        for field, count in self.stats['field_replacements'].items():
            if count > 0:
                print(f"  {field} → {self.field_mappings[field]}: {count} 次")
        
        return report_file
    
    def run(self):
        """运行转换流程"""
        print("财务管理板块字段蛇形命名转换工具")
        print(f"项目根目录: {self.project_root}")
        print(f"目标字段数: {len(self.field_mappings)}")
        
        # 确认执行
        confirm = input("\n是否继续执行转换? (y/N): ")
        if confirm.lower() != 'y':
            print("转换已取消")
            return
        
        # 执行转换
        self.scan_and_process()
        
        # 生成报告
        report_file = self.generate_report()
        
        print("\n转换完成！")
        return report_file

if __name__ == "__main__":
    replacer = FinancialFieldReplacer()
    replacer.run()