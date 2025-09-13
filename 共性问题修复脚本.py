#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
共性问题批量修复脚本
目标：将359个错误减少到100以内
重点处理重复性的共性问题
"""

import os
import re
import shutil
from datetime import datetime
import json

class CommonIssuesFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'common_fixes_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.changes_log = []
        
    def backup_files(self, files):
        """备份文件"""
        os.makedirs(self.backup_dir, exist_ok=True)
        for file_path in files:
            if os.path.exists(file_path):
                rel_path = os.path.relpath(file_path, self.backend_dir)
                backup_path = os.path.join(self.backup_dir, rel_path)
                os.makedirs(os.path.dirname(backup_path), exist_ok=True)
                shutil.copy2(file_path, backup_path)
                print(f"✅ 备份: {rel_path}")
    
    def fix_parameter_naming(self, content, file_path):
        """修复参数命名错误"""
        changes = 0
        
        # 1. _req 改为 req (但保留函数参数定义中的_req)
        # 只修复函数体内的使用，不修复参数定义
        patterns = [
            # 修复函数体内使用_req的地方，但不是参数定义
            (r'(?<!async \()(?<!\()_req\.', 'req.'),
            # 修复缺失req参数的情况 - 将_req改为req在参数定义中
            (r'async \(_req, res\) =>', 'async (req, res) =>'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                old_content = content
                content = re.sub(pattern, replacement, content)
                count = len(re.findall(pattern, old_content))
                changes += count
                if count > 0:
                    self.changes_log.append(f"{os.path.basename(file_path)}: 修复参数命名 {count} 处")
        
        return content, changes
    
    def fix_field_naming(self, content, file_path):
        """修复字段命名不一致"""
        changes = 0
        
        # 字段命名修复
        patterns = [
            # materialUsages -> material_usages (属性访问)
            (r'\.materialUsages\b', '.material_usages'),
            # createdAt -> created_at (属性访问)
            (r'\.createdAt\b', '.created_at'),
            # updatedAt -> updated_at (属性访问)
            (r'\.updatedAt\b', '.updated_at'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                old_content = content
                content = re.sub(pattern, replacement, content)
                count = len(re.findall(pattern, old_content))
                changes += count
                if count > 0:
                    self.changes_log.append(f"{os.path.basename(file_path)}: 修复字段命名 {count} 处")
        
        return content, changes
    
    def fix_prisma_model_errors(self, content, file_path):
        """修复Prisma模型字段错误"""
        changes = 0
        
        # Prisma模型修复
        patterns = [
            # 删除不存在的purchase include
            (r'purchase: \{[^}]*\},?\s*', ''),
            # material_code -> id (因为material_code字段不存在)
            (r'material_code:', 'id:'),
            # total_cost -> total_price
            (r'total_cost', 'total_price'),
            # status: 'DEPLETED' -> status: 'INACTIVE'
            (r"status: 'DEPLETED'", "status: 'INACTIVE'"),
            # 删除不存在的sku include
            (r'sku: \{[^}]*\},?\s*', ''),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                old_content = content
                content = re.sub(pattern, replacement, content)
                count = len(re.findall(pattern, old_content))
                changes += count
                if count > 0:
                    self.changes_log.append(f"{os.path.basename(file_path)}: 修复Prisma模型 {count} 处")
        
        return content, changes
    
    def fix_type_errors(self, content, file_path):
        """修复类型错误"""
        changes = 0
        
        # 类型错误修复
        patterns = [
            # null赋值给number类型 -> 0
            (r'(\w+\.(?:avg_price|max_price|min_price)) = null', r'\1 = 0'),
            # delete操作符用于非可选属性 -> 赋值undefined
            (r'delete (converted\.(?:unit_price|total_value))', r'\1 = undefined'),
            # req.user可能undefined -> req.user?
            (r'req\.user\.role', 'req.user?.role'),
            (r'req\.user\.id', 'req.user?.id'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                old_content = content
                content = re.sub(pattern, replacement, content)
                count = len(re.findall(pattern, old_content))
                changes += count
                if count > 0:
                    self.changes_log.append(f"{os.path.basename(file_path)}: 修复类型错误 {count} 处")
        
        return content, changes
    
    def fix_error_handling(self, content, file_path):
        """修复错误处理"""
        changes = 0
        
        # 错误处理修复
        patterns = [
            # error.message需要类型断言
            (r'error\.message', '(error as Error).message'),
            # error.stack需要类型断言
            (r'error\.stack', '(error as Error).stack'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content) and '(error as Error)' not in content:
                old_content = content
                content = re.sub(pattern, replacement, content)
                count = len(re.findall(pattern, old_content))
                changes += count
                if count > 0:
                    self.changes_log.append(f"{os.path.basename(file_path)}: 修复错误处理 {count} 处")
        
        return content, changes
    
    def remove_unused_variables(self, content, file_path):
        """移除未使用的变量"""
        changes = 0
        
        # 移除未使用的变量
        patterns = [
            # 未使用的导入
            (r'generateMaterialSignature,?\s*', ''),
            # 未使用的变量声明
            (r'const specification,?\s*', ''),
            (r'profit_margin = 30,?\s*', ''),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                old_content = content
                content = re.sub(pattern, replacement, content)
                count = len(re.findall(pattern, old_content))
                changes += count
                if count > 0:
                    self.changes_log.append(f"{os.path.basename(file_path)}: 移除未使用变量 {count} 处")
        
        return content, changes
    
    def fix_missing_returns(self, content, file_path):
        """修复缺失的返回语句"""
        changes = 0
        
        # 为没有返回值的async函数添加返回
        # 这个比较复杂，暂时跳过，留给后续手动处理
        
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
        content, changes1 = self.fix_parameter_naming(content, file_path)
        total_changes += changes1
        
        content, changes2 = self.fix_field_naming(content, file_path)
        total_changes += changes2
        
        content, changes3 = self.fix_prisma_model_errors(content, file_path)
        total_changes += changes3
        
        content, changes4 = self.fix_type_errors(content, file_path)
        total_changes += changes4
        
        content, changes5 = self.fix_error_handling(content, file_path)
        total_changes += changes5
        
        content, changes6 = self.remove_unused_variables(content, file_path)
        total_changes += changes6
        
        content, changes7 = self.fix_missing_returns(content, file_path)
        total_changes += changes7
        
        # 写入文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复 {os.path.basename(file_path)}: {total_changes} 处修改")
        
        return total_changes
    
    def run(self):
        """运行共性问题修复"""
        print("🚀 开始修复共性问题...")
        
        # 重点文件
        target_files = [
            os.path.join(self.backend_dir, 'src', 'routes', 'inventory.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'materials.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'products.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'purchases.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'financial.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'customers.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'skus.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'suppliers.ts'),
            os.path.join(self.backend_dir, 'src', 'routes', 'users.ts'),
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
        
        report_path = os.path.join(self.backend_dir, 'common_fixes_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ 共性问题修复完成!")
        print(f"📊 总共修改: {total_changes} 处")
        print(f"📁 备份位置: {self.backup_dir}")
        print(f"📋 详细报告: {report_path}")
        print("\n🔍 建议运行构建检查剩余错误数量")

if __name__ == '__main__':
    backend_dir = r'D:\shuijing ERP\backend'
    fixer = CommonIssuesFixer(backend_dir)
    fixer.run()