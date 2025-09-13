#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复391个TypeScript错误的Python脚本
主要处理字段命名不一致、Prisma模型名称错误等共性问题
"""

import os
import re
import json
from datetime import datetime
from typing import Dict, List, Tuple

class BatchErrorFixer:
    def __init__(self):
        self.backend_dir = "d:\\shuijing ERP\\backend\\src\\routes"
        self.backup_dir = "d:\\shuijing ERP\\backups\\batch_fix_391"
        self.changes_log = []
        
        # 字段名映射 - 驼峰转蛇形
        self.field_mappings = {
            # 产品相关
            'productType': 'product_type',
            'skuId': 'sku_id', 
            'skuCode': 'sku_code',
            'skuName': 'sku_name',
            'totalQuantity': 'total_quantity',
            'availableQuantity': 'available_quantity',
            'unitPrice': 'unit_price',
            'totalPrice': 'total_price',
            'pricePerBead': 'price_per_bead',
            'pricePerGram': 'price_per_gram',
            'pricePerPiece': 'price_per_piece',
            'beadDiameter': 'bead_diameter',
            'pieceCount': 'piece_count',
            
            # 时间相关
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'purchaseDate': 'purchase_date',
            'refundDate': 'refund_date',
            
            # 数量相关
            'quantityUsedBeads': 'quantity_used',
            'quantityUsedPieces': 'quantity_used',
            'quantityChange': 'quantity_change',
            
            # 用户相关
            'userId': 'user_id',
            'userName': 'user_name',
            'supplierId': 'supplier_id',
            'customerId': 'customer_id',
            'materialId': 'material_id',
            'productId': 'product_id',
            'purchaseId': 'purchase_id',
            
            # 其他
            'materialType': 'material_type',
            'purchaseCode': 'purchase_code',
            'refundReason': 'refund_reason',
            'saleChannel': 'sale_channel',
            'laborCost': 'labor_cost',
            'craftCost': 'craft_cost'
        }
        
        # Prisma模型名称修正
        self.prisma_mappings = {
            'prisma.edit_log': 'prisma.editLog',
            'tx.edit_log': 'tx.editLog'
        }
        
        # 变量名修正
        self.variable_mappings = {
            'Conditions': 'conditions',
            'specificationConditions': 'specification_conditions'
        }
    
    def create_backup(self):
        """创建备份目录"""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
        
        # 备份主要文件
        files_to_backup = ['products.ts', 'purchases.ts', 'skus.ts', 'customers.ts', 'financial.ts', 'materials.ts']
        
        for filename in files_to_backup:
            source_path = os.path.join(self.backend_dir, filename)
            if os.path.exists(source_path):
                backup_path = os.path.join(self.backup_dir, f"{filename}.backup")
                with open(source_path, 'r', encoding='utf-8') as src:
                    with open(backup_path, 'w', encoding='utf-8') as dst:
                        dst.write(src.read())
                print(f"✓ 备份文件: {filename}")
    
    def fix_field_names(self, content: str, filename: str) -> str:
        """修复字段名称 - 驼峰转蛇形"""
        original_content = content
        changes_count = 0
        
        for camel_case, snake_case in self.field_mappings.items():
            # 匹配对象属性访问
            pattern1 = rf'\b(\w+)\.{camel_case}\b'
            replacement1 = rf'\1.{snake_case}'
            
            # 匹配对象字面量属性
            pattern2 = rf'\b{camel_case}:'
            replacement2 = f'{snake_case}:'
            
            # 匹配解构赋值
            pattern3 = rf'\{{\s*{camel_case}\s*\}}'
            replacement3 = f'{{ {snake_case} }}'
            
            # 匹配where条件
            pattern4 = rf'where:\s*\{{\s*{camel_case}:'
            replacement4 = f'where: {{ {snake_case}:'
            
            # 执行替换
            for pattern, replacement in [(pattern1, replacement1), (pattern2, replacement2), 
                                       (pattern3, replacement3), (pattern4, replacement4)]:
                new_content = re.sub(pattern, replacement, content)
                if new_content != content:
                    changes_count += new_content.count(snake_case) - content.count(snake_case)
                    content = new_content
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'field_names',
                'changes': changes_count,
                'description': f'修复了{changes_count}个字段名称'
            })
        
        return content
    
    def fix_prisma_models(self, content: str, filename: str) -> str:
        """修复Prisma模型名称"""
        original_content = content
        changes_count = 0
        
        for wrong_name, correct_name in self.prisma_mappings.items():
            if wrong_name in content:
                content = content.replace(wrong_name, correct_name)
                changes_count += 1
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'prisma_models',
                'changes': changes_count,
                'description': f'修复了{changes_count}个Prisma模型名称'
            })
        
        return content
    
    def fix_variable_names(self, content: str, filename: str) -> str:
        """修复变量名称"""
        original_content = content
        changes_count = 0
        
        for wrong_var, correct_var in self.variable_mappings.items():
            # 匹配变量声明和使用
            pattern = rf'\b{wrong_var}\b'
            if re.search(pattern, content):
                content = re.sub(pattern, correct_var, content)
                changes_count += 1
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'variable_names',
                'changes': changes_count,
                'description': f'修复了{changes_count}个变量名称'
            })
        
        return content
    
    def fix_material_usage_fields(self, content: str, filename: str) -> str:
        """修复MaterialUsage缺少material_id字段的问题"""
        original_content = content
        changes_count = 0
        
        # 查找MaterialUsage.create调用缺少material_id的情况
        pattern = r'(prisma\.materialUsage\.create\(\s*\{\s*data:\s*\{[^}]*)(purchase_id:[^,}]+)([^}]*\}\s*\})'
        
        def add_material_id(match):
            nonlocal changes_count
            before = match.group(1)
            purchase_id_part = match.group(2)
            after = match.group(3)
            
            # 检查是否已经有material_id
            if 'material_id:' not in before and 'material_id:' not in after:
                changes_count += 1
                # 添加material_id字段
                return f"{before}material_id: purchase.id, {purchase_id_part}{after}"
            return match.group(0)
        
        content = re.sub(pattern, add_material_id, content, flags=re.DOTALL)
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'material_usage_fields',
                'changes': changes_count,
                'description': f'添加了{changes_count}个缺失的material_id字段'
            })
        
        return content
    
    def fix_duplicate_properties(self, content: str, filename: str) -> str:
        """修复重复属性问题"""
        original_content = content
        changes_count = 0
        
        # 查找重复的quantity_used属性
        lines = content.split('\n')
        new_lines = []
        seen_properties = set()
        in_object = False
        
        for line in lines:
            # 检测对象开始
            if '{' in line and ('data:' in line or 'create(' in line):
                in_object = True
                seen_properties.clear()
            
            # 检测对象结束
            if '}' in line and in_object:
                in_object = False
                seen_properties.clear()
            
            # 检查重复属性
            if in_object:
                prop_match = re.search(r'(\w+):', line.strip())
                if prop_match:
                    prop_name = prop_match.group(1)
                    if prop_name in seen_properties:
                        # 跳过重复属性
                        changes_count += 1
                        continue
                    seen_properties.add(prop_name)
            
            new_lines.append(line)
        
        content = '\n'.join(new_lines)
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'duplicate_properties',
                'changes': changes_count,
                'description': f'移除了{changes_count}个重复属性'
            })
        
        return content
    
    def fix_type_assertions(self, content: str, filename: str) -> str:
        """修复类型断言问题"""
        original_content = content
        changes_count = 0
        
        # 修复 req.user?.role 类型问题
        if 'req.user?.role' in content:
            content = re.sub(r'req\.user\?\.role', 'req.user?.role || "EMPLOYEE"', content)
            changes_count += 1
        
        # 修复 error.code 类型问题
        pattern = r'if \(error\.code === \'P2003\'\)'
        if re.search(pattern, content):
            content = re.sub(pattern, 'if ((error as any).code === \'P2003\')', content)
            changes_count += 1
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'type_assertions',
                'changes': changes_count,
                'description': f'修复了{changes_count}个类型断言问题'
            })
        
        return content
    
    def fix_unused_variables(self, content: str, filename: str) -> str:
        """修复未使用变量问题"""
        original_content = content
        changes_count = 0
        
        # 移除未使用的变量声明
        unused_vars = ['req', 'userName']
        
        for var_name in unused_vars:
            # 查找未使用的参数
            pattern = rf'async \(([^)]*){var_name}([^)]*),\s*res\)'
            if re.search(pattern, content):
                content = re.sub(pattern, r'async (\1_\2, res)', content)
                changes_count += 1
            
            # 查找未使用的变量声明
            pattern = rf'const {var_name} = [^\n]+\n'
            if re.search(pattern, content):
                content = re.sub(pattern, '', content)
                changes_count += 1
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'unused_variables',
                'changes': changes_count,
                'description': f'修复了{changes_count}个未使用变量'
            })
        
        return content
    
    def fix_missing_returns(self, content: str, filename: str) -> str:
        """修复缺少返回值的问题"""
        original_content = content
        changes_count = 0
        
        # 查找async函数缺少返回值的情况
        lines = content.split('\n')
        new_lines = []
        
        for i, line in enumerate(lines):
            new_lines.append(line)
            
            # 检查是否是async函数定义
            if 'asyncHandler(async' in line and '=>' in line:
                # 查找函数结束位置
                brace_count = 0
                found_return = False
                
                for j in range(i + 1, min(i + 50, len(lines))):
                    check_line = lines[j]
                    brace_count += check_line.count('{') - check_line.count('}')
                    
                    if 'return' in check_line or 'res.json' in check_line or 'res.status' in check_line:
                        found_return = True
                    
                    # 函数结束
                    if brace_count <= 0 and j > i + 1:
                        if not found_return and 'res.' not in check_line:
                            # 在函数结束前添加默认返回
                            new_lines.insert(-1, '  // 默认返回')
                            new_lines.insert(-1, '  return res.status(500).json({ success: false, message: "操作失败" })')
                            changes_count += 1
                        break
        
        content = '\n'.join(new_lines)
        
        if content != original_content:
            self.changes_log.append({
                'file': filename,
                'type': 'missing_returns',
                'changes': changes_count,
                'description': f'添加了{changes_count}个缺失的返回语句'
            })
        
        return content
    
    def process_file(self, filename: str) -> bool:
        """处理单个文件"""
        file_path = os.path.join(self.backend_dir, filename)
        
        if not os.path.exists(file_path):
            print(f"⚠️  文件不存在: {filename}")
            return False
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用所有修复
            content = self.fix_field_names(content, filename)
            content = self.fix_prisma_models(content, filename)
            content = self.fix_variable_names(content, filename)
            content = self.fix_material_usage_fields(content, filename)
            content = self.fix_duplicate_properties(content, filename)
            content = self.fix_type_assertions(content, filename)
            content = self.fix_unused_variables(content, filename)
            content = self.fix_missing_returns(content, filename)
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✓ 修复文件: {filename}")
                return True
            else:
                print(f"- 无需修改: {filename}")
                return False
                
        except Exception as e:
            print(f"❌ 处理文件失败 {filename}: {str(e)}")
            return False
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_processed': len(set(change['file'] for change in self.changes_log)),
            'total_changes': sum(change['changes'] for change in self.changes_log),
            'changes_by_type': {},
            'changes_by_file': {},
            'detailed_changes': self.changes_log
        }
        
        # 按类型统计
        for change in self.changes_log:
            change_type = change['type']
            if change_type not in report['changes_by_type']:
                report['changes_by_type'][change_type] = 0
            report['changes_by_type'][change_type] += change['changes']
        
        # 按文件统计
        for change in self.changes_log:
            filename = change['file']
            if filename not in report['changes_by_file']:
                report['changes_by_file'][filename] = 0
            report['changes_by_file'][filename] += change['changes']
        
        # 保存报告
        report_path = os.path.join(self.backup_dir, 'fix_report_391.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 修复报告已保存: {report_path}")
        print(f"总共处理文件: {report['total_files_processed']}")
        print(f"总共修复问题: {report['total_changes']}")
        print("\n按类型统计:")
        for change_type, count in report['changes_by_type'].items():
            print(f"  {change_type}: {count}")
    
    def run(self):
        """运行批量修复"""
        print("🚀 开始批量修复391个TypeScript错误...")
        
        # 创建备份
        print("\n📦 创建备份...")
        self.create_backup()
        
        # 处理主要文件
        files_to_process = [
            'products.ts',
            'purchases.ts', 
            'skus.ts',
            'customers.ts',
            'financial.ts',
            'materials.ts'
        ]
        
        print("\n🔧 开始修复文件...")
        processed_count = 0
        
        for filename in files_to_process:
            if self.process_file(filename):
                processed_count += 1
        
        # 生成报告
        print("\n📋 生成修复报告...")
        self.generate_report()
        
        print(f"\n✅ 批量修复完成!")
        print(f"处理了 {processed_count} 个文件")
        print(f"建议运行 'npm run check' 验证修复效果")
        print(f"预期将391个错误减少到100个以内")

if __name__ == '__main__':
    fixer = BatchErrorFixer()
    fixer.run()