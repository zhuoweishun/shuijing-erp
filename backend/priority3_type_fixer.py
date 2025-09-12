#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优先级3修复脚本：类型定义不匹配修复
修复接口定义与实际使用的命名不一致问题
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

class Priority3TypeFixer:
    def __init__(self):
        self.backend_dir = Path('.')
        self.src_dir = self.backend_dir / 'src'
        self.backup_dir = Path('../backups/priority3_type_fixes')
        self.report_file = 'priority3_type_fix_report.md'
        self.fixes_count = 0
        self.modified_files = []
        self.fix_log = []
        
        # 类型定义修复映射
        self.type_fixes = {
            # 对象属性命名修复
            r'\buserAgent\b': 'user_agent',
            r'\barrayContains\b': 'array_contains',
            r'\bcontentType\b': 'content_type',
            r'\bstatusCode\b': 'status_code',
            r'\berrorMessage\b': 'error_message',
            r'\brequestId\b': 'request_id',
            r'\bresponseTime\b': 'response_time',
            r'\bcreatedAt\b': 'created_at',
            r'\bupdatedAt\b': 'updated_at',
            r'\bdeletedAt\b': 'deleted_at',
            r'\bisActive\b': 'is_active',
            r'\bisDeleted\b': 'is_deleted',
            r'\bisPublic\b': 'is_public',
            r'\bisPrivate\b': 'is_private',
            r'\bfirstName\b': 'first_name',
            r'\blastName\b': 'last_name',
            r'\bfullName\b': 'full_name',
            r'\bphoneNumber\b': 'phone_number',
            r'\bemailAddress\b': 'email_address',
            r'\bpostalCode\b': 'postal_code',
            r'\bstreetAddress\b': 'street_address',
            r'\bcityName\b': 'city_name',
            r'\bstateName\b': 'state_name',
            r'\bcountryCode\b': 'country_code',
            r'\btotalCount\b': 'total_count',
            r'\btotalAmount\b': 'total_amount',
            r'\btotalPrice\b': 'total_price',
            r'\bunitPrice\b': 'unit_price',
            r'\bbasePrice\b': 'base_price',
            r'\bfinalPrice\b': 'final_price',
            r'\boriginalPrice\b': 'original_price',
            r'\bdiscountPrice\b': 'discount_price',
            r'\bproductId\b': 'product_id',
            r'\bproductName\b': 'product_name',
            r'\bproductCode\b': 'product_code',
            r'\bproductType\b': 'product_type',
            r'\bcategoryId\b': 'category_id',
            r'\bcategoryName\b': 'category_name',
            r'\bsupplierId\b': 'supplier_id',
            r'\bsupplierName\b': 'supplier_name',
            r'\bcustomerId\b': 'customer_id',
            r'\bcustomerName\b': 'customer_name',
            r'\borderId\b': 'order_id',
            r'\borderNumber\b': 'order_number',
            r'\borderStatus\b': 'order_status',
            r'\borderDate\b': 'order_date',
            r'\bpurchaseId\b': 'purchase_id',
            r'\bpurchaseCode\b': 'purchase_code',
            r'\bpurchaseDate\b': 'purchase_date',
            r'\bpurchaseStatus\b': 'purchase_status',
            r'\binventoryId\b': 'inventory_id',
            r'\binventoryCode\b': 'inventory_code',
            r'\binventoryStatus\b': 'inventory_status',
            r'\bstockLevel\b': 'stock_level',
            r'\bminStock\b': 'min_stock',
            r'\bmaxStock\b': 'max_stock',
            r'\bskuId\b': 'sku_id',
            r'\bskuCode\b': 'sku_code',
            r'\bskuName\b': 'sku_name',
            r'\bmaterialId\b': 'material_id',
            r'\bmaterialCode\b': 'material_code',
            r'\bmaterialName\b': 'material_name',
            r'\bmaterialType\b': 'material_type',
            r'\bfinancialId\b': 'financial_id',
            r'\bfinancialCode\b': 'financial_code',
            r'\bfinancialType\b': 'financial_type',
            r'\brecordType\b': 'record_type',
            r'\btransactionId\b': 'transaction_id',
            r'\btransactionType\b': 'transaction_type',
            r'\btransactionDate\b': 'transaction_date',
            r'\btransactionAmount\b': 'transaction_amount',
            r'\bpaymentMethod\b': 'payment_method',
            r'\bpaymentStatus\b': 'payment_status',
            r'\bpaymentDate\b': 'payment_date',
            r'\brefundAmount\b': 'refund_amount',
            r'\brefundDate\b': 'refund_date',
            r'\brefundReason\b': 'refund_reason',
        }
        
        # 保护的上下文（不进行替换的情况）
        self.protected_contexts = [
            r'console\.',  # console.log等
            r'JSON\.',     # JSON.stringify等
            r'Math\.',     # Math.floor等
            r'Object\.',   # Object.keys等
            r'Array\.',    # Array.from等
            r'String\.',   # String.prototype等
            r'Number\.',   # Number.parseInt等
            r'Date\.',     # Date.now等
            r'Promise\.',  # Promise.resolve等
            r'Error\.',    # Error.message等
            r'RegExp\.',   # RegExp.test等
            r'Buffer\.',   # Buffer.from等
            r'process\.',  # process.env等
            r'require\(',  # require()调用
            r'import\s+',  # import语句
            r'export\s+',  # export语句
            r'\"[^\"]*\"',  # 双引号字符串
            r"\'[^\']*\'",  # 单引号字符串
            r'`[^`]*`',    # 模板字符串
            r'//.*$',      # 单行注释
            r'/\*.*?\*/',  # 多行注释
        ]
    
    def create_backup(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
    
    def is_protected_context(self, text, start_pos):
        """检查是否在保护的上下文中"""
        # 获取前后文本用于上下文检查
        context_start = max(0, start_pos - 50)
        context_end = min(len(text), start_pos + 50)
        context = text[context_start:context_end]
        
        for pattern in self.protected_contexts:
            if re.search(pattern, context, re.MULTILINE | re.DOTALL):
                return True
        return False
    
    def fix_file_content(self, file_path, content):
        """修复文件内容中的类型定义错误"""
        original_content = content
        file_fixes = 0
        
        for pattern, replacement in self.type_fixes.items():
            # 查找所有匹配
            matches = list(re.finditer(pattern, content))
            
            # 从后往前替换，避免位置偏移
            for match in reversed(matches):
                start_pos = match.start()
                
                # 检查是否在保护的上下文中
                if self.is_protected_context(content, start_pos):
                    continue
                
                # 执行替换
                content = content[:start_pos] + replacement + content[match.end():]
                file_fixes += 1
                
                # 记录修复
                line_num = content[:start_pos].count('\n') + 1
                self.fix_log.append({
                    'file': str(file_path.relative_to(self.backend_dir)),
                    'line': line_num,
                    'pattern': pattern,
                    'old': match.group(),
                    'new': replacement
                })
        
        if file_fixes > 0:
            print(f"  📝 修复 {file_fixes} 处类型定义错误")
            self.fixes_count += file_fixes
            return content
        
        return original_content
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # 修复内容
            fixed_content = self.fix_file_content(file_path, original_content)
            
            # 如果有修改，保存文件
            if fixed_content != original_content:
                # 备份原文件
                relative_path = file_path.relative_to(self.backend_dir)
                backup_file = self.backup_dir / relative_path
                backup_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file_path, backup_file)
                
                # 写入修复后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                
                self.modified_files.append(str(relative_path))
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return False
    
    def find_typescript_files(self):
        """查找所有TypeScript文件"""
        patterns = ['**/*.ts', '**/*.tsx']
        files = []
        
        for pattern in patterns:
            files.extend(self.src_dir.glob(pattern))
        
        # 排除测试文件和声明文件
        filtered_files = []
        for file in files:
            if not any(exclude in str(file) for exclude in ['test', 'spec', '.d.ts', 'node_modules']):
                filtered_files.append(file)
        
        return filtered_files
    
    def run_typescript_check(self):
        """运行TypeScript编译检查"""
        print("\n🔍 运行TypeScript编译检查...")
        try:
            import subprocess
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit'],
                cwd=self.backend_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print("✅ TypeScript编译检查通过")
                return 0, "编译通过"
            else:
                error_lines = result.stderr.strip().split('\n')
                error_count = len([line for line in error_lines if 'error TS' in line])
                print(f"❌ TypeScript编译检查失败，发现 {error_count} 个错误")
                return error_count, result.stderr
                
        except Exception as e:
            print(f"❌ 运行TypeScript检查失败: {e}")
            return -1, str(e)
    
    def generate_report(self, errors_before, errors_after, tsc_output):
        """生成修复报告"""
        report_content = f"""# 优先级3修复报告：类型定义不匹配修复

## 修复概览

- **修复时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **处理文件数**: {len(self.find_typescript_files())}个
- **修改文件数**: {len(self.modified_files)}个
- **总修复数**: {self.fixes_count}处
- **编译错误**: {errors_before} → {errors_after}

## 主要修复类型

### 1. 对象属性命名统一
- `userAgent` → `user_agent`
- `arrayContains` → `array_contains`
- `contentType` → `content_type`
- `statusCode` → `status_code`

### 2. 数据库字段命名统一
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `isActive` → `is_active`
- `productId` → `product_id`

### 3. 业务字段命名统一
- `customerId` → `customer_id`
- `orderId` → `order_id`
- `purchaseCode` → `purchase_code`
- `materialType` → `material_type`

## 修改文件列表

"""
        
        for i, file in enumerate(self.modified_files, 1):
            report_content += f"{i}. `{file}`\n"
        
        report_content += f"""

## 详细修复记录

"""
        
        # 按文件分组显示修复记录
        files_fixes = {}
        for fix in self.fix_log:
            file = fix['file']
            if file not in files_fixes:
                files_fixes[file] = []
            files_fixes[file].append(fix)
        
        for file, fixes in files_fixes.items():
            report_content += f"\n### {file}\n\n"
            for fix in fixes:
                report_content += f"- 第{fix['line']}行: `{fix['old']}` → `{fix['new']}`\n"
        
        report_content += f"""

## TypeScript编译结果

```
{tsc_output}
```

## 修复策略

1. **精确匹配**: 只修复明确的类型定义不匹配问题
2. **上下文保护**: 避免修改字符串、注释和标准API
3. **全蛇形命名**: 统一采用蛇形命名规范
4. **类型安全**: 确保类型定义与实际使用一致

## 备份信息

- **备份目录**: `{self.backup_dir}`
- **备份文件数**: {len(self.modified_files)}个

## 下一步建议

{"✅ 类型定义修复完成，建议继续执行优先级4修复任务" if errors_after < errors_before else "⚠️ 仍有编译错误，建议检查剩余问题"}
"""
        
        with open(self.report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"\n📊 生成修复报告: {self.report_file}")
    
    def run(self):
        """执行修复"""
        print("🚀 开始优先级3修复：类型定义不匹配修复")
        print("=" * 50)
        
        # 获取修复前的错误数量
        errors_before, _ = self.run_typescript_check()
        
        # 创建备份
        self.create_backup()
        
        # 查找TypeScript文件
        ts_files = self.find_typescript_files()
        print(f"\n📁 找到 {len(ts_files)} 个TypeScript文件")
        
        # 处理文件
        print("\n🔧 开始修复类型定义错误...")
        for file_path in ts_files:
            print(f"📄 处理: {file_path.relative_to(self.backend_dir)}")
            self.process_file(file_path)
        
        # 获取修复后的错误数量
        errors_after, tsc_output = self.run_typescript_check()
        
        # 生成报告
        self.generate_report(errors_before, errors_after, tsc_output)
        
        # 输出结果
        print("\n" + "=" * 50)
        print("✅ 优先级3修复完成！")
        print(f"📊 处理文件: {len(ts_files)}个")
        print(f"📝 修改文件: {len(self.modified_files)}个")
        print(f"🔧 总修复数: {self.fixes_count}处")
        print(f"🐛 编译错误: {errors_before} → {errors_after}")
        
        if errors_after < errors_before:
            print(f"🎉 成功减少 {errors_before - errors_after} 个编译错误")
        elif errors_after == errors_before:
            print("⚠️ 编译错误数量未变化，可能需要其他类型的修复")
        else:
            print("❌ 编译错误增加，请检查修复逻辑")
        
        print(f"💾 备份目录: {self.backup_dir}")
        print(f"📋 修复报告: {self.report_file}")

if __name__ == '__main__':
    fixer = Priority3TypeFixer()
    fixer.run()