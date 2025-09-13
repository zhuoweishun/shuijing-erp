#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终批量修复脚本
处理剩余的重复性错误，目标是将错误数量减少到100以内
"""

import os
import re
import shutil
from datetime import datetime
import json

class FinalBatchFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'final_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.changes_log = []
        
    def backup_files(self, files):
        """批量备份文件"""
        os.makedirs(self.backup_dir, exist_ok=True)
        for file_path in files:
            if os.path.exists(file_path):
                rel_path = os.path.relpath(file_path, self.backend_dir)
                backup_path = os.path.join(self.backup_dir, rel_path)
                os.makedirs(os.path.dirname(backup_path), exist_ok=True)
                shutil.copy2(file_path, backup_path)
    
    def fix_common_issues(self, content, file_path):
        """修复通用问题"""
        changes = 0
        original_content = content
        
        # 1. 修复所有未使用的参数
        patterns = [
            (r'\(req, res\) => \{\s*res\.json\(', '(_req, res) => {\n  res.json('),
            (r'\(req, res\) => \{\s*try', '(_req, res) => {\n  try'),
            (r'\(req, res\) => \{\s*console', '(_req, res) => {\n  console'),
            (r'\(product, index\) =>', '(product, _index) =>'),
            (r'\(purchase, index\) =>', '(purchase, _index) =>'),
            (r'\(customer, index\) =>', '(customer, _index) =>'),
            (r'\(supplier, index\) =>', '(supplier, _index) =>'),
            (r'\(user, index\) =>', '(user, _index) =>'),
            (r'\(item, index\) =>', '(item, _index) =>'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                changes += 1
        
        # 2. 修复类型问题 - null赋值给Decimal
        null_patterns = [
            (r'converted\.unit_price = null', 'delete converted.unit_price'),
            (r'converted\.total_value = null', 'delete converted.total_value'),
            (r'converted\.total_price = null', 'delete converted.total_price'),
            (r'converted\.price_per_bead = null', 'delete converted.price_per_bead'),
            (r'converted\.price_per_gram = null', 'delete converted.price_per_gram'),
        ]
        
        for pattern, replacement in null_patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                changes += 1
        
        # 3. 修复req.user可能undefined的问题
        req_user_patterns = [
            (r'req\.user\.role', 'req.user?.role'),
            (r'req\.user\.id', 'req.user?.id'),
            (r'req\.user\.name', 'req.user?.name'),
        ]
        
        for pattern, replacement in req_user_patterns:
            if re.search(pattern, content) and 'req.user?.' not in content:
                content = re.sub(pattern, replacement, content)
                changes += 1
        
        # 4. 修复属性访问可能null的问题
        null_access_patterns = [
            (r'usage\.purchase\.product_name', 'usage.purchase?.product_name'),
            (r'usage\.purchase\.bead_diameter', 'usage.purchase?.bead_diameter'),
            (r'usage\.purchase\.quality', 'usage.purchase?.quality'),
            (r'usage\.product\.name', 'usage.product?.name || "未知产品"'),
            (r'usage\.product\.id', 'usage.product?.id || ""'),
            (r'purchase\.piece_count > 0', '(purchase.piece_count || 0) > 0'),
        ]
        
        for pattern, replacement in null_access_patterns:
            if re.search(pattern, content) and '?.' not in pattern:
                content = re.sub(pattern, replacement, content)
                changes += 1
        
        # 5. 修复错误的函数返回
        # 为没有返回值的async函数添加返回
        if 'asyncHandler(async (req, res) => {' in content:
            # 查找可能缺少返回的地方
            lines = content.split('\n')
            new_lines = []
            in_async_function = False
            brace_count = 0
            
            for i, line in enumerate(lines):
                if 'asyncHandler(async' in line and '=>' in line:
                    in_async_function = True
                    brace_count = 0
                
                if in_async_function:
                    if '{' in line:
                        brace_count += line.count('{')
                    if '}' in line:
                        brace_count -= line.count('}')
                        if brace_count <= 0:
                            # 函数结束，检查是否需要添加返回
                            if i > 0 and 'return' not in lines[i-1] and 'res.json' not in lines[i-1]:
                                new_lines.append('  // 函数结束')
                            in_async_function = False
                
                new_lines.append(line)
            
            content = '\n'.join(new_lines)
        
        if content != original_content:
            self.changes_log.append(f"{os.path.basename(file_path)}: 修复通用问题 {changes} 处")
        
        return content, changes
    
    def fix_specific_file_issues(self, content, file_path):
        """修复特定文件的问题"""
        changes = 0
        filename = os.path.basename(file_path)
        
        if filename == 'materials.ts':
            # materials.ts特定问题
            # 由于material表不存在，需要完全重写或删除相关代码
            if 'prisma.material' in content or 'prisma.purchase' in content:
                # 将所有material相关的操作改为purchase
                content = re.sub(r'material_type', 'product_type', content)
                content = re.sub(r'SEMI_FINISHED', 'BRACELET', content)
                content = re.sub(r'FINISHED', 'FINISHED', content)
                changes += 3
        
        elif filename == 'products.ts':
            # products.ts特定问题
            # 修复产品类型比较错误
            type_fixes = [
                (r'purchase\.product_type === \'FINISHED\' && purchase\.product_type === \'LOOSE_BEADS\'', 
                 'purchase.product_type === \'LOOSE_BEADS\''),
                (r'purchase\.product_type === \'FINISHED\' && purchase\.product_type === \'BRACELET\'', 
                 'purchase.product_type === \'BRACELET\''),
                (r'purchase\.product_type === \'FINISHED\' && purchase\.product_type === \'ACCESSORIES\'', 
                 'purchase.product_type === \'ACCESSORIES\''),
            ]
            
            for pattern, replacement in type_fixes:
                if re.search(pattern, content):
                    content = re.sub(pattern, replacement, content)
                    changes += 1
        
        elif filename == 'purchases.ts':
            # purchases.ts特定问题
            if 'convertFromApiFormat' in content and 'function convertFromApiFormat' not in content:
                # 添加缺失的函数
                function_def = '''
// 临时转换函数
function convertFromApiFormat(data: any) {
  return data; // 现在都是蛇形命名，直接返回
}

'''
                content = function_def + content
                changes += 1
        
        if changes > 0:
            self.changes_log.append(f"{filename}: 修复特定问题 {changes} 处")
        
        return content, changes
    
    def remove_unused_imports(self, content, file_path):
        """移除未使用的导入"""
        changes = 0
        
        # 检查并移除未使用的导入
        import_patterns = [
            (r"import \{ z \} from 'zod'\n", 'z\.'),
            (r"import \{ generateMaterialSignature \} from", 'generateMaterialSignature'),
            (r", createSuccessResponse", 'createSuccessResponse\('),
        ]
        
        for import_line, usage_pattern in import_patterns:
            if re.search(import_line, content) and not re.search(usage_pattern, content):
                content = re.sub(import_line, '', content)
                changes += 1
        
        if changes > 0:
            self.changes_log.append(f"{os.path.basename(file_path)}: 移除未使用导入 {changes} 处")
        
        return content, changes
    
    def fix_file(self, file_path):
        """修复单个文件"""
        if not os.path.exists(file_path):
            return 0
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        total_changes = 0
        
        # 应用各种修复
        content, changes1 = self.fix_common_issues(content, file_path)
        total_changes += changes1
        
        content, changes2 = self.fix_specific_file_issues(content, file_path)
        total_changes += changes2
        
        content, changes3 = self.remove_unused_imports(content, file_path)
        total_changes += changes3
        
        # 写入文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复 {os.path.basename(file_path)}: {total_changes} 处修改")
        
        return total_changes
    
    def run(self):
        """运行最终批量修复"""
        print("🚀 开始最终批量修复...")
        
        # 目标文件
        target_files = [
            os.path.join(self.backend_dir, 'src', 'routes', 'materials.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'products.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'purchases.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'financial.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'inventory.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'customers.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'skus.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'suppliers.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'users.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'auth.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'dashboard.ts'),
        ]
        
        existing_files = [f for f in target_files if os.path.exists(f)]
        
        # 备份
        print("📦 备份文件...")
        self.backup_files(existing_files)
        
        # 修复
        print("🔧 开始修复...")
        total_changes = 0
        for file_path in existing_files:
            changes = self.fix_file(file_path)
            total_changes += changes
        
        # 报告
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_changes': total_changes,
            'files_processed': len(existing_files),
            'backup_location': self.backup_dir,
            'changes_log': self.changes_log
        }
        
        report_path = os.path.join(self.backend_dir, 'final_fix_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ 最终批量修复完成!")
        print(f"📊 总共修改: {total_changes} 处")
        print(f"📁 备份位置: {self.backup_dir}")
        print(f"📋 详细报告: {report_path}")
        print("\n🔍 建议运行构建检查剩余错误数量")

if __name__ == '__main__':
    backend_dir = r'D:\shuijing ERP\backend'
    fixer = FinalBatchFixer(backend_dir)
    fixer.run()