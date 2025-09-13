#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
超保守的错误修复脚本 - 修复354个TypeScript错误
只修复100%确定的共性问题，绝不激进
"""

import os
import re
import shutil
from datetime import datetime
import json

class UltraConservativeErrorFixer:
    def __init__(self, backend_dir):
        self.backend_dir = backend_dir
        self.backup_dir = os.path.join(backend_dir, 'backups', f'ultra_conservative_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        self.fixed_files = []
        self.fix_report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_processed': 0,
            'total_fixes_applied': 0,
            'fixes_by_category': {
                'req_parameter_fixes': 0,
                'prisma_model_fixes': 0,
                'field_naming_fixes': 0
            },
            'files_modified': [],
            'detailed_changes': [],
            'errors': []
        }
        
        # 需要处理的文件列表
        self.target_files = [
            'src/routes/health.ts',
            'src/routes/materials.ts',
            'src/routes/financial.ts',
            'src/routes/inventory.ts',
            'src/routes/products.ts',
            'src/routes/purchases.ts'
        ]
        
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
    
    def fix_remaining_req_parameters(self, content, file_path):
        """修复剩余的req参数问题（极其谨慎）"""
        fixes_count = 0
        changes = []
        
        # 只修复明确的模式：async (_, res) => { ... req.xxx
        # 这种情况下，参数被错误改为_但函数体中仍在使用req
        
        # 查找函数定义中的_参数，但函数体中使用了req的情况
        pattern = r'(async\s*\()(_)(,\s*res\)\s*=>\s*\{[^}]*?\breq\.)'
        
        def replace_underscore_when_req_used(match):
            nonlocal fixes_count, changes
            prefix = match.group(1)
            underscore = match.group(2)
            suffix_with_req = match.group(3)
            
            if underscore == '_':
                fixes_count += 1
                change_detail = {
                    'type': 'req_parameter_restoration',
                    'description': '函数参数_改为req（因为函数体中使用了req）'
                }
                changes.append(change_detail)
                return f'{prefix}req{suffix_with_req}'
            return match.group(0)
        
        new_content = re.sub(pattern, replace_underscore_when_req_used, content, flags=re.DOTALL)
        
        # 记录修改详情
        if fixes_count > 0:
            self.fix_report['detailed_changes'].append({
                'file': file_path,
                'category': 'req_parameter_fixes',
                'count': fixes_count,
                'changes': changes
            })
            print(f"  🔧 修复req参数: {fixes_count}处")
        
        self.fix_report['fixes_by_category']['req_parameter_fixes'] += fixes_count
        return new_content
    
    def fix_prisma_model_access(self, content, file_path):
        """修复Prisma模型访问错误（100%确定的）"""
        fixes_count = 0
        changes = []
        
        # 只修复明确的Prisma模型访问错误
        prisma_fixes = {
            'prisma.product_sku': 'prisma.productSku',
            # 可以添加其他确定的Prisma模型访问错误
        }
        
        for wrong_access, correct_access in prisma_fixes.items():
            if wrong_access in content:
                new_content = content.replace(wrong_access, correct_access)
                count = content.count(wrong_access)
                if count > 0:
                    content = new_content
                    fixes_count += count
                    change_detail = {
                        'type': 'prisma_model_access',
                        'from': wrong_access,
                        'to': correct_access,
                        'count': count
                    }
                    changes.append(change_detail)
                    print(f"  🔧 修复Prisma模型访问: {wrong_access} -> {correct_access} ({count}处)")
        
        # 记录修改详情
        if fixes_count > 0:
            self.fix_report['detailed_changes'].append({
                'file': file_path,
                'category': 'prisma_model_fixes',
                'count': fixes_count,
                'changes': changes
            })
        
        self.fix_report['fixes_by_category']['prisma_model_fixes'] += fixes_count
        return content
    
    def fix_specific_field_naming(self, content, file_path):
        """修复特定的字段命名错误（极其谨慎）"""
        fixes_count = 0
        changes = []
        
        # 只修复100%确定的字段命名错误
        # 基于错误日志中的具体错误
        
        # 修复 purchase_code 应该是 purchase_id 的情况（在特定上下文中）
        # 只在 where 子句中修复，因为错误日志明确指出这个问题
        pattern1 = r'where:\s*\{\s*purchase_code:'
        replacement1 = 'where: { purchase_id:'
        
        matches = list(re.finditer(pattern1, content))
        if matches:
            new_content = re.sub(pattern1, replacement1, content)
            count = len(matches)
            if count > 0:
                content = new_content
                fixes_count += count
                change_detail = {
                    'type': 'field_naming',
                    'description': 'where子句中purchase_code改为purchase_id',
                    'count': count
                }
                changes.append(change_detail)
                print(f"  🔧 修复字段命名: purchase_code -> purchase_id in where clause ({count}处)")
        
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
            
            # 第一优先级：修复剩余的req参数问题
            content = self.fix_remaining_req_parameters(content, file_path)
            
            # 第二优先级：修复Prisma模型访问错误
            content = self.fix_prisma_model_access(content, file_path)
            
            # 第三优先级：修复特定的字段命名错误
            content = self.fix_specific_field_naming(content, file_path)
            
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
        print("🚀 开始超保守的错误修复...")
        print(f"📂 目标目录: {self.backend_dir}")
        print("⚠️  采用极其谨慎的修复策略，只修复100%确定的问题")
        
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
        
        print(f"\n✅ 超保守修复完成!")
        print(f"📊 处理文件: {self.fix_report['total_files_processed']}个")
        print(f"🔧 应用修复: {self.fix_report['total_fixes_applied']}处")
        print(f"📝 修改文件: {len(self.fixed_files)}个")
        
        print(f"\n📋 修复统计:")
        print(f"  - req参数修复: {self.fix_report['fixes_by_category']['req_parameter_fixes']}处")
        print(f"  - Prisma模型修复: {self.fix_report['fixes_by_category']['prisma_model_fixes']}处")
        print(f"  - 字段命名修复: {self.fix_report['fixes_by_category']['field_naming_fixes']}处")
        
        if self.fixed_files:
            print("\n📋 修改的文件:")
            for file_path in self.fixed_files:
                print(f"  - {file_path}")
        
        print(f"\n📁 备份位置: {self.backup_dir}")
        print("\n🔍 建议运行 'npm run check' 验证修复效果")
        print("\n⚠️  如果错误数量没有显著减少，请检查备份并回滚")
        print("\n📝 修复原则：宁可不修改，也不要引入新问题")
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        report_file = os.path.join(self.backend_dir, 'ultra_conservative_fix_report_354.json')
        
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
    
    print("⚠️  警告：这是一个超保守的修复脚本")
    print("📋 修复策略：")
    print("  1. 只修复100%确定的req参数问题")
    print("  2. 只修复明确的Prisma模型访问错误")
    print("  3. 只修复特定的字段命名错误")
    print("  4. 绝不修改复杂的类型错误")
    print("  5. 绝不修改业务逻辑")
    print("  6. 宁可不修改，也不引入新问题")
    
    # 创建修复器并运行
    fixer = UltraConservativeErrorFixer(backend_dir)
    return fixer.run()

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)