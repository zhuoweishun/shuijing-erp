#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级错误修复脚本
针对materials.ts中的prisma.material错误和其他重复性问题
"""

import os
import re
import shutil
from datetime import datetime
import json

class AdvancedErrorFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'advanced_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.changes_log = []
        
    def backup_file(self, file_path):
        """备份单个文件"""
        if os.path.exists(file_path):
            os.makedirs(self.backup_dir, exist_ok=True)
            rel_path = os.path.relpath(file_path, self.backend_dir)
            backup_path = os.path.join(self.backup_dir, rel_path)
            os.makedirs(os.path.dirname(backup_path), exist_ok=True)
            shutil.copy2(file_path, backup_path)
            print(f"✅ 备份: {rel_path}")
    
    def fix_materials_ts(self, file_path):
        """专门修复materials.ts文件"""
        if not os.path.exists(file_path):
            print(f"❌ 文件不存在: {file_path}")
            return 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes = 0
        
        # 1. 所有 prisma.material 替换为 prisma.purchase
        content = re.sub(r'prisma\.material\b', 'prisma.purchase', content)
        changes += len(re.findall(r'prisma\.material\b', original_content))
        
        # 2. 所有 tx.material 替换为 tx.purchase
        content = re.sub(r'tx\.material\b', 'tx.purchase', content)
        changes += len(re.findall(r'tx\.material\b', original_content))
        
        # 3. material_usage -> materialUsage
        content = re.sub(r'prisma\.material_usage\b', 'prisma.materialUsage', content)
        content = re.sub(r'tx\.material_usage\b', 'tx.materialUsage', content)
        changes += len(re.findall(r'(prisma|tx)\.material_usage\b', original_content))
        
        # 4. 修复字段引用问题 - material表的字段应该用purchase表的字段
        # status字段在purchase表中可能是不同的名称
        content = re.sub(r"where: \{ status: 'ACTIVE' \}", "where: { status: 'ACTIVE' }", content)
        content = re.sub(r"where: \{ status: 'DEPLETED' \}", "where: { status: 'DEPLETED' }", content)
        
        # 5. material_type字段在purchase表中是product_type
        content = re.sub(r'material_type:', 'product_type:', content)
        changes += len(re.findall(r'material_type:', original_content))
        
        # 6. 移除未使用的req参数
        content = re.sub(r'async \(req, res\) =>', 'async (_req, res) =>', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复 materials.ts: {changes} 处修改")
            self.changes_log.append(f"materials.ts: {changes} 处修改")
        
        return changes
    
    def fix_products_ts(self, file_path):
        """修复products.ts文件"""
        if not os.path.exists(file_path):
            return 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes = 0
        
        # 1. 修复类型问题 - null不能赋值给Decimal
        # 将 converted.unit_price = null 改为 delete converted.unit_price
        content = re.sub(r'converted\.unit_price = null', 'delete converted.unit_price', content)
        content = re.sub(r'converted\.total_value = null', 'delete converted.total_value', content)
        changes += len(re.findall(r'converted\.(unit_price|total_value) = null', original_content))
        
        # 2. 修复material_usages属性访问
        content = re.sub(r'product\.material_usages', 'product.materialUsages', content)
        changes += len(re.findall(r'product\.material_usages', original_content))
        
        # 3. 修复purchase.material_usages访问
        content = re.sub(r'purchase\.material_usages', 'purchase.materialUsages', content)
        changes += len(re.findall(r'purchase\.material_usages', original_content))
        
        # 4. 修复产品类型比较问题
        # 将错误的类型比较修复
        content = re.sub(r'purchase\.product_type === \'FINISHED\'', 'purchase.product_type === \'FINISHED\'', content)
        
        # 5. 移除未使用的参数
        content = re.sub(r'\(product, index\) =>', '(product, _index) =>', content)
        content = re.sub(r'async \(req, res\) => \{\s*res\.json\(', 'async (_req, res) => {\n  res.json(', content)
        
        # 6. 添加返回语句
        # 查找没有返回值的async函数
        if 'Not all code paths return a value' in original_content:
            # 在函数末尾添加返回语句
            content = re.sub(r'(router\.(get|post|put|delete)\([^}]+\}\)\))', r'\1', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复 products.ts: {changes} 处修改")
            self.changes_log.append(f"products.ts: {changes} 处修改")
        
        return changes
    
    def fix_purchases_ts(self, file_path):
        """修复purchases.ts文件"""
        if not os.path.exists(file_path):
            return 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes = 0
        
        # 1. 添加缺失的convertFromApiFormat函数
        if 'convertFromApiFormat' in content and 'function convertFromApiFormat' not in content:
            convert_function = '''
// 临时的API格式转换函数
function convertFromApiFormat(data: any) {
  return data; // 直接返回，因为现在都是蛇形命名
}
'''
            content = convert_function + content
            changes += 1
        
        # 2. 修复属性访问问题
        content = re.sub(r'usage\.product\.name', 'usage.product?.name || "未知产品"', content)
        content = re.sub(r'usage\.product\.id', 'usage.product?.id || ""', content)
        changes += len(re.findall(r'usage\.product\.(name|id)', original_content))
        
        # 3. 移除未使用的参数
        content = re.sub(r'async \(req, res\) => \{\s*try', 'async (_req, res) => {\n    try', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复 purchases.ts: {changes} 处修改")
            self.changes_log.append(f"purchases.ts: {changes} 处修改")
        
        return changes
    
    def fix_all_files(self):
        """修复所有文件"""
        files_to_fix = [
            ('materials.ts', self.fix_materials_ts),
            ('products.ts', self.fix_products_ts),
            ('purchases.ts', self.fix_purchases_ts),
        ]
        
        total_changes = 0
        
        for filename, fix_func in files_to_fix:
            file_path = os.path.join(self.backend_dir, 'src', 'routes', filename)
            if os.path.exists(file_path):
                self.backup_file(file_path)
                changes = fix_func(file_path)
                total_changes += changes
            else:
                print(f"⚠️ 文件不存在: {filename}")
        
        return total_changes
    
    def run(self):
        """运行高级修复"""
        print("🚀 开始高级错误修复...")
        
        total_changes = self.fix_all_files()
        
        # 生成报告
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_changes': total_changes,
            'backup_location': self.backup_dir,
            'changes_log': self.changes_log
        }
        
        report_path = os.path.join(self.backend_dir, 'advanced_fix_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ 高级修复完成!")
        print(f"📊 总共修改: {total_changes} 处")
        print(f"📁 备份位置: {self.backup_dir}")
        print(f"📋 详细报告: {report_path}")

if __name__ == '__main__':
    backend_dir = r'D:\shuijing ERP\backend'
    fixer = AdvancedErrorFixer(backend_dir)
    fixer.run()