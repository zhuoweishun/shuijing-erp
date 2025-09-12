#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优先级2修复脚本：统一变量命名
修复变量定义和使用时命名不一致的问题
确保全蛇形命名规范
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

class Priority2VariableNamingFixer:
    def __init__(self):
        self.backend_dir = Path('.')
        self.src_dir = self.backend_dir / 'src'
        self.backup_dir = Path('../backups/priority2_variable_fixes')
        self.fix_count = 0
        self.processed_files = 0
        self.modified_files = 0
        self.fix_log = []
        
        # 变量命名映射表 - 驼峰到蛇形
        self.variable_mappings = {
            # 客户相关变量
            'customerAddress': 'customer_address',
            'customerName': 'customer_name',
            'customerPhone': 'customer_phone',
            'customerData': 'customer_data',
            'customerInfo': 'customer_info',
            'customerList': 'customer_list',
            'customerLabels': 'customer_labels',
            'customerNotes': 'customer_notes',
            
            # 时间相关变量
            'daysSinceLastPurchase': 'days_since_last_purchase',
            'daysSinceFirstPurchase': 'days_since_first_purchase',
            'lastPurchaseDate': 'last_purchase_date',
            'firstPurchaseDate': 'first_purchase_date',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            
            # 用户相关变量
            'userAgent': 'user_agent',
            'userId': 'user_id',
            'userName': 'user_name',
            'userInfo': 'user_info',
            'userData': 'user_data',
            
            # 材料相关变量
            'materialType': 'material_type',
            'materialName': 'material_name',
            'materialData': 'material_data',
            'materialInfo': 'material_info',
            'materialList': 'material_list',
            'materialUsage': 'material_usage',
            
            # SKU相关变量
            'skuData': 'sku_data',
            'skuInfo': 'sku_info',
            'skuList': 'sku_list',
            'skuCode': 'sku_code',
            'skuName': 'sku_name',
            
            # 产品相关变量
            'productData': 'product_data',
            'productInfo': 'product_info',
            'productList': 'product_list',
            'productName': 'product_name',
            'productCode': 'product_code',
            
            # 采购相关变量
            'purchaseData': 'purchase_data',
            'purchaseInfo': 'purchase_info',
            'purchaseList': 'purchase_list',
            'purchaseCode': 'purchase_code',
            'purchaseDate': 'purchase_date',
            
            # 财务相关变量
            'totalPrice': 'total_price',
            'unitPrice': 'unit_price',
            'totalValue': 'total_value',
            'totalCost': 'total_cost',
            'materialCost': 'material_cost',
            'laborCost': 'labor_cost',
            
            # 库存相关变量
            'inventoryData': 'inventory_data',
            'inventoryInfo': 'inventory_info',
            'inventoryList': 'inventory_list',
            'stockQuantity': 'stock_quantity',
            'availableQuantity': 'available_quantity',
            
            # 其他常见变量
            'errorMessage': 'error_message',
            'responseData': 'response_data',
            'requestData': 'request_data',
            'resultData': 'result_data',
            'configData': 'config_data',
            'statusCode': 'status_code',
            'isActive': 'is_active',
            'isValid': 'is_valid',
            'hasError': 'has_error',
            'arrayContains': 'array_contains',
            'stringContains': 'string_contains',
        }
        
        # 需要保护的标准API和关键字
        self.protected_patterns = [
            r'\bconsole\.',
            r'\bMath\.',
            r'\bObject\.',
            r'\bArray\.',
            r'\bJSON\.',
            r'\bDate\.',
            r'\bString\.',
            r'\bNumber\.',
            r'\bBoolean\.',
            r'\bRegExp\.',
            r'\bPromise\.',
            r'\bsetTimeout\b',
            r'\bsetInterval\b',
            r'\bclearTimeout\b',
            r'\bclearInterval\b',
            r'\brequire\(',
            r'\bimport\s+',
            r'\bexport\s+',
            r'\bfunction\s+',
            r'\bclass\s+',
            r'\binterface\s+',
            r'\btype\s+',
            r'\benum\s+',
        ]
    
    def create_backup(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
    
    def backup_file(self, file_path):
        """备份单个文件"""
        relative_path = file_path.relative_to(self.backend_dir)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
    
    def is_protected_context(self, content, start_pos, end_pos):
        """检查是否在受保护的上下文中"""
        # 获取周围的上下文
        context_start = max(0, start_pos - 100)
        context_end = min(len(content), end_pos + 100)
        context = content[context_start:context_end]
        
        # 检查是否在受保护的模式中
        for pattern in self.protected_patterns:
            if re.search(pattern, context):
                return True
        
        # 检查是否在字符串或注释中
        before_context = content[context_start:start_pos]
        
        # 检查字符串上下文
        single_quotes = before_context.count("'") - before_context.count("\\'")
        double_quotes = before_context.count('"') - before_context.count('\\"')
        template_quotes = before_context.count('`') - before_context.count('\\`')
        
        if (single_quotes % 2 == 1 or double_quotes % 2 == 1 or template_quotes % 2 == 1):
            return True
        
        # 检查注释上下文
        if '//' in before_context.split('\n')[-1]:
            return True
        
        return False
    
    def fix_variable_naming(self, content, file_path):
        """修复变量命名"""
        original_content = content
        file_fixes = 0
        
        for camel_case, snake_case in self.variable_mappings.items():
            # 匹配变量声明和使用的模式
            patterns = [
                # 变量声明: const/let/var variableName
                rf'\b(const|let|var)\s+{camel_case}\b',
                # 对象属性: obj.variableName
                rf'\.{camel_case}\b',
                # 函数参数: function(variableName)
                rf'\({camel_case}\b',
                rf',\s*{camel_case}\b',
                # 赋值: variableName =
                rf'\b{camel_case}\s*=',
                # 使用: variableName.
                rf'\b{camel_case}\.',
                # 返回: return variableName
                rf'\breturn\s+{camel_case}\b',
                # 条件: if (variableName)
                rf'\bif\s*\(\s*{camel_case}\b',
                # 解构: { variableName }
                rf'\{{\s*{camel_case}\s*\}}',
                rf'\{{[^}}]*,\s*{camel_case}\s*[,}}]',
                # 数组解构: [variableName]
                rf'\[\s*{camel_case}\s*\]',
                rf'\[[^\]]*,\s*{camel_case}\s*[,\]]',
            ]
            
            for pattern in patterns:
                matches = list(re.finditer(pattern, content))
                for match in reversed(matches):  # 从后往前替换，避免位置偏移
                    start, end = match.span()
                    
                    # 检查是否在受保护的上下文中
                    if self.is_protected_context(content, start, end):
                        continue
                    
                    # 执行替换
                    matched_text = match.group()
                    new_text = matched_text.replace(camel_case, snake_case)
                    content = content[:start] + new_text + content[end:]
                    file_fixes += 1
                    
                    self.fix_log.append({
                        'file': str(file_path.relative_to(self.backend_dir)),
                        'line': content[:start].count('\n') + 1,
                        'original': camel_case,
                        'fixed': snake_case,
                        'context': matched_text
                    })
        
        self.fix_count += file_fixes
        return content, file_fixes
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.processed_files += 1
            fixed_content, file_fixes = self.fix_variable_naming(content, file_path)
            
            if file_fixes > 0:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修复后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                
                self.modified_files += 1
                print(f"✅ 修复 {file_path.name}: {file_fixes} 处变量命名")
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
    
    def process_directory(self):
        """处理目录中的所有TypeScript文件"""
        ts_files = list(self.src_dir.rglob('*.ts'))
        
        print(f"📁 找到 {len(ts_files)} 个TypeScript文件")
        
        for file_path in ts_files:
            self.process_file(file_path)
    
    def run_typescript_check(self):
        """运行TypeScript编译检查"""
        print("\n🔍 运行TypeScript编译检查...")
        result = os.system('npx tsc --noEmit')
        return result == 0
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'processed_files': self.processed_files,
                'modified_files': self.modified_files,
                'total_fixes': self.fix_count,
                'variable_mappings_used': len([m for m in self.variable_mappings.items() if any(log['original'] == m[0] for log in self.fix_log)])
            },
            'fixes_by_file': {},
            'detailed_fixes': self.fix_log
        }
        
        # 按文件统计修复数量
        for log in self.fix_log:
            file_name = log['file']
            if file_name not in report['fixes_by_file']:
                report['fixes_by_file'][file_name] = 0
            report['fixes_by_file'][file_name] += 1
        
        # 保存JSON报告
        with open('priority2_variable_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # 生成Markdown报告
        md_report = f"""# 优先级2修复报告：变量命名统一

## 修复概要

- **处理时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **处理文件数**: {self.processed_files}
- **修改文件数**: {self.modified_files}
- **总修复数**: {self.fix_count}
- **使用的变量映射**: {len([m for m in self.variable_mappings.items() if any(log['original'] == m[0] for log in self.fix_log)])}

## 按文件统计修复数量

"""
        
        for file_name, count in sorted(report['fixes_by_file'].items(), key=lambda x: x[1], reverse=True):
            md_report += f"- `{file_name}`: {count}处修复\n"
        
        md_report += f"""

## 主要修复类型

"""
        
        # 统计修复类型
        fix_types = {}
        for log in self.fix_log:
            original = log['original']
            if original not in fix_types:
                fix_types[original] = 0
            fix_types[original] += 1
        
        for original, count in sorted(fix_types.items(), key=lambda x: x[1], reverse=True)[:10]:
            snake_case = self.variable_mappings.get(original, 'unknown')
            md_report += f"- `{original}` → `{snake_case}`: {count}处\n"
        
        md_report += f"""

## 修复策略

- ✅ **精确匹配**: 只修复明确的变量命名不一致问题
- ✅ **上下文保护**: 避免修改字符串、注释和标准API
- ✅ **全蛇形命名**: 统一采用蛇形命名规范
- ✅ **安全备份**: 所有修改文件已备份至 `../backups/priority2_variable_fixes`

## 备份信息

- **备份目录**: `../backups/priority2_variable_fixes`
- **备份文件数**: {self.modified_files}
- **备份时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open('priority2_variable_fix_report.md', 'w', encoding='utf-8') as f:
            f.write(md_report)
        
        print(f"\n📊 生成修复报告:")
        print(f"   - priority2_variable_fix_report.json")
        print(f"   - priority2_variable_fix_report.md")
    
    def run(self):
        """执行修复流程"""
        print("🚀 开始优先级2修复：变量命名统一")
        print(f"📁 工作目录: {self.backend_dir.absolute()}")
        
        # 创建备份
        self.create_backup()
        
        # 处理文件
        self.process_directory()
        
        # 生成报告
        self.generate_report()
        
        # 运行编译检查
        compile_success = self.run_typescript_check()
        
        print(f"\n✅ 优先级2修复完成!")
        print(f"📊 处理文件: {self.processed_files}")
        print(f"📝 修改文件: {self.modified_files}")
        print(f"🔧 总修复数: {self.fix_count}")
        print(f"💾 备份目录: {self.backup_dir}")
        print(f"✅ 编译检查: {'通过' if compile_success else '失败'}")
        
        return compile_success

if __name__ == '__main__':
    fixer = Priority2VariableNamingFixer()
    fixer.run()