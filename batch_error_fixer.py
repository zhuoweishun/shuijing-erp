#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复TypeScript错误脚本
目标：将388个错误减少到100以内
重点处理重复性的字段命名和Prisma模型错误
"""

import os
import re
import shutil
from datetime import datetime
import json

class BatchErrorFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'before_batch_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
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
                print(f"✅ 备份文件: {rel_path}")
    
    def fix_prisma_model_names(self, content, file_path):
        """修复Prisma模型名称错误"""
        changes = 0
        
        # 1. prisma.material -> prisma.purchase (material表不存在)
        pattern1 = r'prisma\.material\b'
        if re.search(pattern1, content):
            content = re.sub(pattern1, 'prisma.purchase', content)
            changes += len(re.findall(pattern1, content))
            self.changes_log.append(f"{file_path}: 修复 prisma.material -> prisma.purchase")
        
        # 2. tx.material -> tx.purchase
        pattern2 = r'tx\.material\b'
        if re.search(pattern2, content):
            content = re.sub(pattern2, 'tx.purchase', content)
            changes += len(re.findall(pattern2, content))
            self.changes_log.append(f"{file_path}: 修复 tx.material -> tx.purchase")
        
        # 3. material_usage -> materialUsage (Prisma生成的是驼峰)
        pattern3 = r'prisma\.material_usage\b'
        if re.search(pattern3, content):
            content = re.sub(pattern3, 'prisma.materialUsage', content)
            changes += len(re.findall(pattern3, content))
            self.changes_log.append(f"{file_path}: 修复 prisma.material_usage -> prisma.materialUsage")
        
        pattern4 = r'tx\.material_usage\b'
        if re.search(pattern4, content):
            content = re.sub(pattern4, 'tx.materialUsage', content)
            changes += len(re.findall(pattern4, content))
            self.changes_log.append(f"{file_path}: 修复 tx.material_usage -> tx.materialUsage")
        
        return content, changes
    
    def fix_field_names(self, content, file_path):
        """修复字段命名错误"""
        changes = 0
        
        # 1. username -> user_name (在select中)
        pattern1 = r'username:\s*true'
        if re.search(pattern1, content):
            content = re.sub(pattern1, 'user_name: true', content)
            changes += len(re.findall(pattern1, content))
            self.changes_log.append(f"{file_path}: 修复 username -> user_name")
        
        # 2. quantity_used_beads -> quantity_used
        pattern2 = r'quantity_used_beads'
        if re.search(pattern2, content):
            content = re.sub(pattern2, 'quantity_used', content)
            changes += len(re.findall(pattern2, content))
            self.changes_log.append(f"{file_path}: 修复 quantity_used_beads -> quantity_used")
        
        # 3. quantity_used_pieces -> quantity_used
        pattern3 = r'quantity_used_pieces'
        if re.search(pattern3, content):
            content = re.sub(pattern3, 'quantity_used', content)
            changes += len(re.findall(pattern3, content))
            self.changes_log.append(f"{file_path}: 修复 quantity_used_pieces -> quantity_used")
        
        # 4. createdAt -> created_at (在属性访问中)
        pattern4 = r'\.createdAt\b'
        if re.search(pattern4, content):
            content = re.sub(pattern4, '.created_at', content)
            changes += len(re.findall(pattern4, content))
            self.changes_log.append(f"{file_path}: 修复 .createdAt -> .created_at")
        
        # 5. updatedAt -> updated_at (在属性访问中)
        pattern5 = r'\.updatedAt\b'
        if re.search(pattern5, content):
            content = re.sub(pattern5, '.updated_at', content)
            changes += len(re.findall(pattern5, content))
            self.changes_log.append(f"{file_path}: 修复 .updatedAt -> .updated_at")
        
        # 6. materialUsages -> material_usages (在include中)
        pattern6 = r'materialUsages:\s*true'
        if re.search(pattern6, content):
            content = re.sub(pattern6, 'material_usages: true', content)
            changes += len(re.findall(pattern6, content))
            self.changes_log.append(f"{file_path}: 修复 materialUsages -> material_usages (include)")
        
        pattern7 = r'materialUsages:\s*\{'
        if re.search(pattern7, content):
            content = re.sub(pattern7, 'material_usages: {', content)
            changes += len(re.findall(pattern7, content))
            self.changes_log.append(f"{file_path}: 修复 materialUsages -> material_usages (include object)")
        
        # 7. .material_usages (属性访问，这个应该保持蛇形)
        # 这个不需要修改，因为数据库字段确实是蛇形的
        
        return content, changes
    
    def fix_type_issues(self, content, file_path):
        """修复类型相关问题"""
        changes = 0
        
        # 1. 添加req.user的undefined检查
        pattern1 = r'if \(req\.user\.role'
        if re.search(pattern1, content):
            content = re.sub(pattern1, 'if (req.user?.role', content)
            changes += len(re.findall(pattern1, content))
            self.changes_log.append(f"{file_path}: 添加 req.user 的可选链操作符")
        
        # 2. 修复null赋值给Decimal类型的问题
        # 这个需要更复杂的处理，暂时跳过
        
        return content, changes
    
    def remove_unused_imports(self, content, file_path):
        """移除未使用的导入"""
        changes = 0
        
        # 移除未使用的z导入
        if "import { z } from 'zod'" in content and 'z.' not in content:
            content = re.sub(r"import \{ z \} from 'zod'\n?", '', content)
            changes += 1
            self.changes_log.append(f"{file_path}: 移除未使用的 z 导入")
        
        # 移除未使用的createSuccessResponse导入
        if 'createSuccessResponse' in content and 'createSuccessResponse(' not in content:
            content = re.sub(r',\s*createSuccessResponse', '', content)
            changes += 1
            self.changes_log.append(f"{file_path}: 移除未使用的 createSuccessResponse 导入")
        
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
        content, changes1 = self.fix_prisma_model_names(content, file_path)
        total_changes += changes1
        
        content, changes2 = self.fix_field_names(content, file_path)
        total_changes += changes2
        
        content, changes3 = self.fix_type_issues(content, file_path)
        total_changes += changes3
        
        content, changes4 = self.remove_unused_imports(content, file_path)
        total_changes += changes4
        
        # 只有在有变化时才写入文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ 修复文件: {os.path.basename(file_path)} ({total_changes} 处修改)")
        
        return total_changes
    
    def run(self):
        """运行批量修复"""
        print("🚀 开始批量修复TypeScript错误...")
        
        # 目标文件列表
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
        ]
        
        # 过滤存在的文件
        existing_files = [f for f in target_files if os.path.exists(f)]
        
        if not existing_files:
            print("❌ 没有找到目标文件")
            return
        
        # 备份文件
        print("📦 备份文件...")
        self.backup_files(existing_files)
        
        # 修复文件
        print("🔧 开始修复...")
        total_changes = 0
        for file_path in existing_files:
            changes = self.fix_file(file_path)
            total_changes += changes
        
        # 生成报告
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_changes': total_changes,
            'files_processed': len(existing_files),
            'backup_location': self.backup_dir,
            'changes_log': self.changes_log
        }
        
        report_path = os.path.join(self.backend_dir, 'batch_fix_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ 批量修复完成!")
        print(f"📊 总共修改: {total_changes} 处")
        print(f"📁 备份位置: {self.backup_dir}")
        print(f"📋 详细报告: {report_path}")
        print("\n🔍 建议运行 npm run build 检查剩余错误数量")

if __name__ == '__main__':
    backend_dir = r'D:\shuijing ERP\backend'
    fixer = BatchErrorFixer(backend_dir)
    fixer.run()