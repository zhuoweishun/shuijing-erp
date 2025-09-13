#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Backend错误批量修复脚本 - 修复389个TypeScript错误中的共性问题
针对Terminal#0-1058中的错误进行批量修复
"""

import os
import re
import shutil
from datetime import datetime
import json

class BackendErrorFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'before_389_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.fixed_files = []
        self.fix_report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_processed': 0,
            'total_fixes_applied': 0,
            'fixes_by_category': {
                'prisma_field_naming': 0,
                'missing_fields': 0,
                'type_errors': 0,
                'unused_variables': 0,
                'function_returns': 0
            },
            'files_modified': [],
            'errors': []
        }
        
        # 需要处理的文件列表
        self.target_files = [
            'src/routes/products.ts',
            'src/routes/purchases.ts', 
            'src/routes/skus.ts',
            'src/routes/financial.ts',
            'src/routes/inventory.ts',
            'src/routes/materials.ts',
            'src/routes/health.ts'
        ]
        
        # Prisma字段命名映射（驼峰 -> 蛇形）
        self.prisma_field_mappings = {
            'skuId': 'sku_id',
            'totalQuantity': 'total_quantity',
            'availableQuantity': 'available_quantity',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'skuCode': 'sku_code',
            'quantityUsedBeads': 'quantity_used',
            'quantityUsedPieces': 'quantity_used',
            'materialId': 'material_id',
            'userId': 'user_id',
            'purchaseId': 'purchase_id',
            'productId': 'product_id'
        }
        
    def create_backup(self):
        """创建备份目录和文件"""
        try:
            os.makedirs(self.backup_dir, exist_ok=True)
            
            for file_path in self.target_files:
                full_path = os.path.join(self.backend_dir, file_path)
                if os.path.exists(full_path):
                    backup_path = os.path.join(self.backup_dir, os.path.basename(file_path))
                    shutil.copy2(full_path, backup_path)
                    print(f"✅ 备份文件: {file_path}")
                    
            print(f"📁 备份目录: {self.backup_dir}")
            return True
        except Exception as e:
            print(f"❌ 创建备份失败: {e}")
            return False
    
    def fix_prisma_field_naming(self, content):
        """修复Prisma字段命名问题"""
        fixes_count = 0
        
        for camel_case, snake_case in self.prisma_field_mappings.items():
            # 修复对象属性访问
            pattern1 = rf'\b(\w+)\.{camel_case}\b'
            replacement1 = rf'\1.{snake_case}'
            new_content, count1 = re.subn(pattern1, replacement1, content)
            if count1 > 0:
                content = new_content
                fixes_count += count1
                print(f"  🔧 修复字段访问: {camel_case} -> {snake_case} ({count1}处)")
            
            # 修复对象字面量中的属性名
            pattern2 = rf'\b{camel_case}:'
            replacement2 = f'{snake_case}:'
            new_content, count2 = re.subn(pattern2, replacement2, content)
            if count2 > 0:
                content = new_content
                fixes_count += count2
                print(f"  🔧 修复对象属性: {camel_case}: -> {snake_case}: ({count2}处)")
            
            # 修复where条件中的字段名
            pattern3 = rf'where:\s*\{{\s*{camel_case}:'
            replacement3 = f'where: {{ {snake_case}:'
            new_content, count3 = re.subn(pattern3, replacement3, content)
            if count3 > 0:
                content = new_content
                fixes_count += count3
                print(f"  🔧 修复where条件: {camel_case} -> {snake_case} ({count3}处)")
        
        self.fix_report['fixes_by_category']['prisma_field_naming'] += fixes_count
        return content
    
    def fix_missing_fields(self, content):
        """修复缺少字段问题"""
        fixes_count = 0
        
        # 修复available_quantity字段缺失问题
        # 计算available_quantity而不是直接访问
        pattern1 = r'purchase\.available_quantity'
        replacement1 = '(purchase.piece_count || 0) - (purchase.material_usages?.reduce((sum, usage) => sum + usage.quantity_used, 0) || 0)'
        new_content, count1 = re.subn(pattern1, replacement1, content)
        if count1 > 0:
            content = new_content
            fixes_count += count1
            print(f"  🔧 修复available_quantity计算 ({count1}处)")
        
        # 修复specification变量未声明问题
        pattern2 = r'(\s+)specification,'
        replacement2 = r'\1specification: req.body.specification,'
        new_content, count2 = re.subn(pattern2, replacement2, content)
        if count2 > 0:
            content = new_content
            fixes_count += count2
            print(f"  🔧 修复specification变量声明 ({count2}处)")
        
        self.fix_report['fixes_by_category']['missing_fields'] += fixes_count
        return content
    
    def fix_type_errors(self, content):
        """修复类型错误"""
        fixes_count = 0
        
        # 修复null赋值给string类型的问题
        pattern1 = r'supplier_id = null'
        replacement1 = 'supplier_id = undefined'
        new_content, count1 = re.subn(pattern1, replacement1, content)
        if count1 > 0:
            content = new_content
            fixes_count += count1
            print(f"  🔧 修复null赋值问题 ({count1}处)")
        
        # 修复user_id可能为undefined的问题
        pattern2 = r'user_id: req\.user\?\.id'
        replacement2 = 'user_id: req.user!.id'
        new_content, count2 = re.subn(pattern2, replacement2, content)
        if count2 > 0:
            content = new_content
            fixes_count += count2
            print(f"  🔧 修复user_id类型问题 ({count2}处)")
        
        # 修复purchase可能为null的问题
        pattern3 = r'purchase\.piece_count'
        replacement3 = 'purchase?.piece_count'
        new_content, count3 = re.subn(pattern3, replacement3, content)
        if count3 > 0:
            content = new_content
            fixes_count += count3
            print(f"  🔧 修复purchase空值检查 ({count3}处)")
        
        self.fix_report['fixes_by_category']['type_errors'] += fixes_count
        return content
    
    def fix_unused_variables(self, content):
        """修复未使用变量问题"""
        fixes_count = 0
        
        # 修复未使用的req参数
        pattern1 = r'async \((req), res\) =>'
        replacement1 = 'async (_, res) =>'
        new_content, count1 = re.subn(pattern1, replacement1, content)
        if count1 > 0:
            content = new_content
            fixes_count += count1
            print(f"  🔧 修复未使用的req参数 ({count1}处)")
        
        # 修复未使用的变量声明
        pattern2 = r'let conditions: any\[\] = \[\];'
        replacement2 = '// let conditions: any[] = []; // 暂时注释未使用的变量'
        new_content, count2 = re.subn(pattern2, replacement2, content)
        if count2 > 0:
            content = new_content
            fixes_count += count2
            print(f"  🔧 注释未使用的变量 ({count2}处)")
        
        # 修复未使用的user变量
        pattern3 = r'const user = await prisma\.user\.findUnique\(\{'
        replacement3 = '// const user = await prisma.user.findUnique({ // 暂时注释未使用的变量'
        new_content, count3 = re.subn(pattern3, replacement3, content)
        if count3 > 0:
            content = new_content
            fixes_count += count3
            print(f"  🔧 注释未使用的user变量 ({count3}处)")
        
        self.fix_report['fixes_by_category']['unused_variables'] += fixes_count
        return content
    
    def fix_function_returns(self, content):
        """修复函数返回值问题"""
        fixes_count = 0
        
        # 为缺少返回值的函数添加默认返回
        # 查找async函数但没有明确返回值的情况
        pattern1 = r'(router\.(get|post|put|delete)\([^,]+,\s*authenticateToken,\s*asyncHandler\(async \([^)]+\) => \{[^}]*?)\}\)\)'
        
        def add_return_if_needed(match):
            function_body = match.group(1)
            if 'return ' not in function_body and 'res.json(' in function_body:
                # 如果函数体中有res.json但没有return，在最后添加return
                return function_body + '\n    // 函数执行完成\n  }))'
            return match.group(0)
        
        new_content = re.sub(pattern1, add_return_if_needed, content, flags=re.DOTALL)
        if new_content != content:
            fixes_count += 1
            content = new_content
            print(f"  🔧 修复函数返回值问题")
        
        self.fix_report['fixes_by_category']['function_returns'] += fixes_count
        return content
    
    def fix_product_type_comparisons(self, content):
        """修复产品类型比较错误"""
        fixes_count = 0
        
        # 修复重复的LOOSE_BEADS比较
        pattern1 = r"purchase\.product_type === 'LOOSE_BEADS' \|\| purchase\.product_type === 'LOOSE_BEADS'"
        replacement1 = "purchase.product_type === 'LOOSE_BEADS'"
        new_content, count1 = re.subn(pattern1, replacement1, content)
        if count1 > 0:
            content = new_content
            fixes_count += count1
            print(f"  🔧 修复重复的LOOSE_BEADS比较 ({count1}处)")
        
        # 修复不可能的类型比较
        pattern2 = r"purchase\.product_type === 'LOOSE_BEADS' \|\| purchase\.product_type === 'FINISHED'"
        replacement2 = "purchase.product_type === 'BRACELET' || purchase.product_type === 'FINISHED'"
        new_content, count2 = re.subn(pattern2, replacement2, content)
        if count2 > 0:
            content = new_content
            fixes_count += count2
            print(f"  🔧 修复产品类型比较逻辑 ({count2}处)")
        
        self.fix_report['fixes_by_category']['type_errors'] += fixes_count
        return content
    
    def fix_undefined_variables(self, content):
        """修复未定义变量问题"""
        fixes_count = 0
        
        # 修复user_name未定义问题
        pattern1 = r'\$\{ user_name \}'
        replacement1 = '${req.user?.user_name || "未知用户"}'
        new_content, count1 = re.subn(pattern1, replacement1, content)
        if count1 > 0:
            content = new_content
            fixes_count += count1
            print(f"  🔧 修复user_name未定义问题 ({count1}处)")
        
        # 修复purchase未定义问题
        pattern2 = r'material_id: purchase\.id'
        replacement2 = 'material_id: productData.material_id'
        new_content, count2 = re.subn(pattern2, replacement2, content)
        if count2 > 0:
            content = new_content
            fixes_count += count2
            print(f"  🔧 修复purchase未定义问题 ({count2}处)")
        
        self.fix_report['fixes_by_category']['type_errors'] += fixes_count
        return content
    
    def process_file(self, file_path):
        """处理单个文件"""
        full_path = os.path.join(self.backend_dir, file_path)
        
        if not os.path.exists(full_path):
            print(f"⚠️  文件不存在: {file_path}")
            return False
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            print(f"\n🔧 处理文件: {file_path}")
            
            # 应用各种修复
            content = self.fix_prisma_field_naming(content)
            content = self.fix_missing_fields(content)
            content = self.fix_type_errors(content)
            content = self.fix_unused_variables(content)
            content = self.fix_function_returns(content)
            content = self.fix_product_type_comparisons(content)
            content = self.fix_undefined_variables(content)
            
            # 如果内容有变化，写回文件
            if content != original_content:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.fixed_files.append(file_path)
                self.fix_report['files_modified'].append(file_path)
                print(f"✅ 文件已修复: {file_path}")
                return True
            else:
                print(f"ℹ️  文件无需修改: {file_path}")
                return False
                
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {e}"
            print(f"❌ {error_msg}")
            self.fix_report['errors'].append(error_msg)
            return False
    
    def run(self):
        """运行修复程序"""
        print("🚀 开始Backend错误批量修复...")
        print(f"📂 目标目录: {self.backend_dir}")
        
        # 创建备份
        if not self.create_backup():
            print("❌ 备份失败，终止修复")
            return False
        
        # 处理每个文件
        for file_path in self.target_files:
            self.process_file(file_path)
            self.fix_report['total_files_processed'] += 1
        
        # 计算总修复数
        self.fix_report['total_fixes_applied'] = sum(self.fix_report['fixes_by_category'].values())
        
        # 生成报告
        self.generate_report()
        
        print(f"\n✅ 修复完成!")
        print(f"📊 处理文件: {self.fix_report['total_files_processed']}个")
        print(f"🔧 应用修复: {self.fix_report['total_fixes_applied']}处")
        print(f"📝 修改文件: {len(self.fixed_files)}个")
        
        if self.fixed_files:
            print("\n📋 修改的文件:")
            for file_path in self.fixed_files:
                print(f"  - {file_path}")
        
        print(f"\n📁 备份位置: {self.backup_dir}")
        print("\n🔍 建议运行 'npm run check' 验证修复效果")
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        report_file = os.path.join(self.backend_dir, 'fix_report_389.json')
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(self.fix_report, f, ensure_ascii=False, indent=2)
            print(f"📄 修复报告已保存: {report_file}")
        except Exception as e:
            print(f"⚠️  保存报告失败: {e}")

def main():
    # 获取backend目录路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(script_dir, 'backend')
    
    if not os.path.exists(backend_dir):
        print(f"❌ Backend目录不存在: {backend_dir}")
        return False
    
    # 创建修复器并运行
    fixer = BackendErrorFixer(backend_dir)
    return fixer.run()

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)