#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统计、运算相关功能字段蛇形命名转换脚本
批量处理32个字段的驼峰到蛇形命名转换
"""

import os
import re
import shutil
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# 字段转换映射表
FIELD_CONVERSIONS = {
    # 总计相关字段
    'totalAmount': 'total_amount',
    'totalCustomers': 'total_customers',
    'totalVariants': 'total_variants',
    'totalValue': 'total_value',
    'totalCost': 'total_cost',
    'totalCostPerSku': 'total_cost_per_sku',
    'totalRemainingQuantity': 'total_remaining_quantity',
    
    # 数量计算字段
    'pieceCount': 'piece_count',
    'batchCount': 'batch_count',
    'successCount': 'success_count',
    'failedCount': 'failed_count',
    'purchaseCount': 'purchase_count',
    'variantCount': 'variant_count',
    'consumedQuantity': 'consumed_quantity',
    'newTotalQuantity': 'new_total_quantity',
    'returnedMaterialsCount': 'returned_materials_count',
    'staleCount': 'stale_count',
    
    # 比率和百分比字段
    'refundRate': 'refund_rate',
    'staleRatio': 'stale_ratio',
    'repeatPurchaseRate': 'repeat_purchase_rate',
    
    # 平均值字段
    'averageOrderValue': 'average_order_value',
    'averageProfitMargin': 'average_profit_margin',
    
    # 价格范围字段
    'actualTotalPrice': 'actual_total_price',
    'totalPriceMin': 'total_price_min',
    'totalPriceMax': 'total_price_max',
    
    # 统计分析字段
    'getStatistics': 'get_statistics',
    'getConsumptionAnalysis': 'get_consumption_analysis',
    
    # 计算相关字段
    'calculateCost': 'calculate_cost',
    'discountAmount': 'discount_amount',
    
    # 重试计数字段
    'retryCount': 'retry_count',
    'getRetryCount': 'get_retry_count',
    'incrementRetryCount': 'increment_retry_count',
    'resetRetryCount': 'reset_retry_count',
    
    # 调试统计字段
    'debugCount': 'debug_count',
    
    # 操作类型字段
    'operationType': 'operation_type',
    
    # 价格类型字段
    'priceType': 'price_type'
}

class StatisticsFieldConverter:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / 'backups' / f'statistics_fields_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_processed': 0,
            'total_files_modified': 0,
            'total_replacements': 0,
            'field_conversions': {},
            'modified_files': [],
            'errors': []
        }
        
    def create_backup_dir(self):
        """创建备份目录"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 备份目录已创建: {self.backup_dir}")
        
    def backup_file(self, file_path: Path) -> Path:
        """备份单个文件"""
        relative_path = file_path.relative_to(self.project_root)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        return backup_path
        
    def get_target_files(self) -> List[Path]:
        """获取需要处理的文件列表"""
        target_files = []
        
        # 前端文件 (src目录下的.tsx和.ts文件)
        frontend_src = self.project_root / 'src'
        if frontend_src.exists():
            target_files.extend(frontend_src.rglob('*.tsx'))
            target_files.extend(frontend_src.rglob('*.ts'))
            
        # 后端文件 (backend/src目录下的.ts文件)
        backend_src = self.project_root / 'backend' / 'src'
        if backend_src.exists():
            target_files.extend(backend_src.rglob('*.ts'))
            
        # 共享文件 (shared目录下的.ts文件)
        shared_dir = self.project_root / 'shared'
        if shared_dir.exists():
            target_files.extend(shared_dir.rglob('*.ts'))
            
        # 过滤掉node_modules和其他不需要的目录
        filtered_files = []
        for file_path in target_files:
            if 'node_modules' not in str(file_path) and '.git' not in str(file_path):
                filtered_files.append(file_path)
                
        return filtered_files
        
    def convert_field_in_content(self, content: str, file_path: Path) -> Tuple[str, int, Dict[str, int]]:
        """在文件内容中转换字段名"""
        modified_content = content
        total_replacements = 0
        field_replacements = {}
        
        for camel_case, snake_case in FIELD_CONVERSIONS.items():
            # 匹配各种使用场景的正则表达式
            patterns = [
                # 对象属性访问: obj.fieldName
                rf'\b(\w+)\.{re.escape(camel_case)}\b',
                # 对象属性定义: { fieldName: value }
                rf'\b{re.escape(camel_case)}\s*:',
                # 解构赋值: { fieldName }
                rf'\{{\s*{re.escape(camel_case)}\s*\}}',
                # 变量声明: const fieldName
                rf'\b(const|let|var)\s+{re.escape(camel_case)}\b',
                # 函数参数: function(fieldName)
                rf'\(([^)]*)\b{re.escape(camel_case)}\b([^)]*)\)',
                # 接口定义: fieldName?: type
                rf'\b{re.escape(camel_case)}\s*\?\s*:',
                # 字符串中的字段名: 'fieldName' 或 "fieldName"
                rf'["\']({re.escape(camel_case)})["\']',
                # 模板字符串中的字段名
                rf'`([^`]*){re.escape(camel_case)}([^`]*)`',
                # 数组/对象方法调用: .map(item => item.fieldName)
                rf'\bitem\.{re.escape(camel_case)}\b',
                # React props: {fieldName}
                rf'\{{\s*{re.escape(camel_case)}\s*\}}',
                # 类型定义: type.fieldName
                rf'\btype\.{re.escape(camel_case)}\b'
            ]
            
            field_count = 0
            for pattern in patterns:
                matches = re.findall(pattern, modified_content)
                if matches:
                    # 根据不同的模式进行替换
                    if 'obj.' in pattern or 'item.' in pattern or 'type.' in pattern:
                        # 对象属性访问
                        modified_content = re.sub(pattern, lambda m: m.group(0).replace(camel_case, snake_case), modified_content)
                    elif ':' in pattern:
                        # 对象属性定义
                        modified_content = re.sub(rf'\b{re.escape(camel_case)}\s*:', f'{snake_case}:', modified_content)
                    elif '(' in pattern:
                        # 函数参数
                        modified_content = re.sub(pattern, lambda m: m.group(0).replace(camel_case, snake_case), modified_content)
                    elif '"' in pattern or "'" in pattern:
                        # 字符串中的字段名
                        modified_content = re.sub(rf'["\']({re.escape(camel_case)})["\']', rf'"\1"'.replace(camel_case, snake_case), modified_content)
                    else:
                        # 其他情况
                        modified_content = re.sub(rf'\b{re.escape(camel_case)}\b', snake_case, modified_content)
                    
                    field_count += len(matches)
            
            if field_count > 0:
                field_replacements[f'{camel_case} → {snake_case}'] = field_count
                total_replacements += field_count
                
        return modified_content, total_replacements, field_replacements
        
    def process_file(self, file_path: Path) -> bool:
        """处理单个文件"""
        try:
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            # 转换字段名
            modified_content, replacements, field_replacements = self.convert_field_in_content(original_content, file_path)
            
            self.report['total_files_processed'] += 1
            
            # 如果有修改，则备份并写入新内容
            if replacements > 0:
                # 备份原文件
                backup_path = self.backup_file(file_path)
                
                # 写入修改后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                    
                self.report['total_files_modified'] += 1
                self.report['total_replacements'] += replacements
                self.report['modified_files'].append({
                    'file': str(file_path.relative_to(self.project_root)),
                    'replacements': replacements,
                    'field_conversions': field_replacements,
                    'backup_path': str(backup_path.relative_to(self.project_root))
                })
                
                # 更新字段转换统计
                for field_conversion, count in field_replacements.items():
                    if field_conversion not in self.report['field_conversions']:
                        self.report['field_conversions'][field_conversion] = 0
                    self.report['field_conversions'][field_conversion] += count
                    
                print(f"✅ 已处理: {file_path.relative_to(self.project_root)} ({replacements} 次替换)")
                return True
            else:
                print(f"⏭️  跳过: {file_path.relative_to(self.project_root)} (无需修改)")
                return False
                
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {str(e)}"
            self.report['errors'].append(error_msg)
            print(f"❌ {error_msg}")
            return False
            
    def generate_report(self):
        """生成转换报告"""
        report_path = self.project_root / f'statistics_fields_conversion_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
            
        print(f"\n📊 转换报告已生成: {report_path}")
        
        # 打印摘要
        print("\n" + "="*60)
        print("📈 统计、运算字段蛇形命名转换完成")
        print("="*60)
        print(f"📁 处理文件总数: {self.report['total_files_processed']}")
        print(f"✏️  修改文件数量: {self.report['total_files_modified']}")
        print(f"🔄 总替换次数: {self.report['total_replacements']}")
        print(f"📦 备份目录: {self.backup_dir.relative_to(self.project_root)}")
        
        if self.report['field_conversions']:
            print("\n🏷️  字段转换统计:")
            sorted_conversions = sorted(self.report['field_conversions'].items(), key=lambda x: x[1], reverse=True)
            for field_conversion, count in sorted_conversions[:10]:  # 显示前10个最频繁的转换
                print(f"   {field_conversion}: {count} 次")
                
        if self.report['errors']:
            print(f"\n⚠️  错误数量: {len(self.report['errors'])}")
            for error in self.report['errors']:
                print(f"   ❌ {error}")
                
        print("\n✅ 转换完成！请检查修改后的文件并测试功能是否正常。")
        
    def run(self):
        """执行转换流程"""
        print("🚀 开始统计、运算字段蛇形命名转换...")
        print(f"📂 项目根目录: {self.project_root}")
        print(f"🎯 目标字段数量: {len(FIELD_CONVERSIONS)}")
        
        # 创建备份目录
        self.create_backup_dir()
        
        # 获取目标文件
        target_files = self.get_target_files()
        print(f"📄 找到目标文件: {len(target_files)} 个")
        
        if not target_files:
            print("⚠️  未找到需要处理的文件")
            return
            
        # 处理文件
        print("\n🔄 开始处理文件...")
        for file_path in target_files:
            self.process_file(file_path)
            
        # 生成报告
        self.generate_report()

def main():
    """主函数"""
    project_root = os.getcwd()
    converter = StatisticsFieldConverter(project_root)
    converter.run()

if __name__ == '__main__':
    main()