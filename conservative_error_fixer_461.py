#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
保守的错误修复脚本 - 修复461个TypeScript错误
极其谨慎的修复策略，只处理明确的共性问题
"""

import os
import re
import shutil
from datetime import datetime
import json

class ConservativeErrorFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'conservative_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.fixed_files = []
        self.fix_report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_processed': 0,
            'total_fixes_applied': 0,
            'fixes_by_category': {
                'req_parameter_restoration': 0,
                'field_naming_fixes': 0
            },
            'files_modified': [],
            'detailed_changes': [],
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
        
        # 字段命名映射（只处理明确的Prisma字段）
        self.field_mappings = {
            'productType': 'product_type',
            'pricePerBead': 'price_per_bead',
            'unitPrice': 'unit_price',
            'skuName': 'sku_name',
            'pricePerGram': 'price_per_gram',
            'pricePerPiece': 'price_per_piece'
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
    
    def restore_req_parameters(self, content, file_path):
        """恢复被错误改为_的req参数"""
        fixes_count = 0
        changes = []
        
        # 查找所有的路由处理函数
        # 匹配模式：router.method('path', middleware, asyncHandler(async (_, res) => {
        pattern = r'(router\.(get|post|put|delete)\([^,]+,\s*[^,]*,\s*asyncHandler\(async\s*\()(_)(,\s*res\)\s*=>)'
        
        def replace_underscore_with_req(match):
            nonlocal fixes_count, changes
            full_match = match.group(0)
            prefix = match.group(1)
            underscore = match.group(3)
            suffix = match.group(4)
            
            # 只有当参数是_时才替换为req
            if underscore == '_':
                fixes_count += 1
                change_detail = {
                    'type': 'req_parameter_restoration',
                    'line_content': full_match,
                    'change': f'将参数 _ 恢复为 req'
                }
                changes.append(change_detail)
                return f'{prefix}req{suffix}'
            return full_match
        
        new_content = re.sub(pattern, replace_underscore_with_req, content)
        
        # 记录修改详情
        if fixes_count > 0:
            self.fix_report['detailed_changes'].extend([
                {
                    'file': file_path,
                    'category': 'req_parameter_restoration',
                    'count': fixes_count,
                    'changes': changes
                }
            ])
            print(f"  🔧 恢复req参数: {fixes_count}处")
        
        self.fix_report['fixes_by_category']['req_parameter_restoration'] += fixes_count
        return new_content
    
    def fix_field_naming(self, content, file_path):
        """修复字段命名问题（极其谨慎）"""
        fixes_count = 0
        changes = []
        
        for camel_case, snake_case in self.field_mappings.items():
            # 只修复对象属性访问（purchase.fieldName）
            pattern1 = rf'\b(\w+)\.{camel_case}\b'
            replacement1 = rf'\1.{snake_case}'
            
            matches = list(re.finditer(pattern1, content))
            if matches:
                new_content, count = re.subn(pattern1, replacement1, content)
                if count > 0:
                    content = new_content
                    fixes_count += count
                    change_detail = {
                        'type': 'field_naming',
                        'field': camel_case,
                        'new_field': snake_case,
                        'count': count,
                        'pattern': '对象属性访问'
                    }
                    changes.append(change_detail)
                    print(f"  🔧 修复字段命名: {camel_case} -> {snake_case} ({count}处)")
        
        # 记录修改详情
        if fixes_count > 0:
            self.fix_report['detailed_changes'].append({
                'file': file_path,
                'category': 'field_naming_fixes',
                'count': fixes_count,
                'changes': changes
            })
        
        self.fix_report['fixes_by_category']['field_naming_fixes'] += fixes_count
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
            
            # 第一优先级：恢复req参数
            content = self.restore_req_parameters(content, file_path)
            
            # 第二优先级：谨慎修复字段命名
            content = self.fix_field_naming(content, file_path)
            
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
        print("🚀 开始保守的错误修复...")
        print(f"📂 目标目录: {self.backend_dir}")
        print("⚠️  采用极其谨慎的修复策略")
        
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
        
        print(f"\n✅ 保守修复完成!")
        print(f"📊 处理文件: {self.fix_report['total_files_processed']}个")
        print(f"🔧 应用修复: {self.fix_report['total_fixes_applied']}处")
        print(f"📝 修改文件: {len(self.fixed_files)}个")
        
        print(f"\n📋 修复统计:")
        print(f"  - req参数恢复: {self.fix_report['fixes_by_category']['req_parameter_restoration']}处")
        print(f"  - 字段命名修复: {self.fix_report['fixes_by_category']['field_naming_fixes']}处")
        
        if self.fixed_files:
            print("\n📋 修改的文件:")
            for file_path in self.fixed_files:
                print(f"  - {file_path}")
        
        print(f"\n📁 备份位置: {self.backup_dir}")
        print("\n🔍 建议运行 'npm run check' 验证修复效果")
        print("\n⚠️  如果错误数量没有显著减少，请检查备份并回滚")
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        report_file = os.path.join(self.backend_dir, 'conservative_fix_report_461.json')
        
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
    
    print("⚠️  警告：这是一个保守的修复脚本")
    print("📋 修复策略：")
    print("  1. 优先恢复req参数（解决大部分错误）")
    print("  2. 谨慎修复字段命名问题")
    print("  3. 不修改任何函数逻辑")
    print("  4. 不处理复杂的类型错误")
    
    # 创建修复器并运行
    fixer = ConservativeErrorFixer(backend_dir)
    return fixer.run()

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)