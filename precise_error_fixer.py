#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精确错误修复脚本
只修复构建输出中明确显示的55个错误
避免引入新问题
"""

import os
import re
import json
from datetime import datetime

class PreciseErrorFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        
    def create_backup(self):
        """创建备份"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/precise_fix_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
    
    def fix_specific_errors(self):
        """修复具体的错误"""
        # 根据构建输出中的具体错误进行修复
        error_fixes = [
            # ProductEntry.tsx 中的 } 0) 错误
            {
                'file': 'src/pages/ProductEntry.tsx',
                'pattern': r'}\s+0\)',
                'replacement': '}, 0)',
                'description': '修复 } 0) 语法错误'
            },
            # PurchaseEntry.tsx 中的 } [依赖数组] 错误
            {
                'file': 'src/pages/PurchaseEntry.tsx', 
                'pattern': r'}\s+\[([^\]]+)\]\)',
                'replacement': r'}, [\1])',
                'description': '修复 useEffect 依赖数组语法'
            },
            # PurchaseList.tsx 中的 } 300) 错误
            {
                'file': 'src/pages/PurchaseList.tsx',
                'pattern': r'}\s+(\d+)\)',
                'replacement': r'}, \1)',
                'description': '修复 setTimeout 语法'
            },
            # SalesList.tsx 中的对象属性语法
            {
                'file': 'src/pages/SalesList.tsx',
                'pattern': r'(selected_sku):\s+(\w+)\s*$',
                'replacement': r'\1: \2,',
                'description': '修复对象属性语法'
            },
            # api.ts 中的 } 数字) 错误
            {
                'file': 'src/services/api.ts',
                'pattern': r'}\s+(\d+)\)',
                'replacement': r'}, \1)',
                'description': '修复 setTimeout 语法'
            }
        ]
        
        for fix in error_fixes:
            self.apply_fix(fix)
    
    def apply_fix(self, fix_config):
        """应用单个修复"""
        file_path = fix_config['file']
        
        if not os.path.exists(file_path):
            print(f"⚠️ 文件不存在: {file_path}")
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用正则替换
            content = re.sub(
                fix_config['pattern'], 
                fix_config['replacement'], 
                content, 
                flags=re.MULTILINE
            )
            
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                self.fixes_applied.append({
                    'file': file_path,
                    'description': fix_config['description'],
                    'pattern': fix_config['pattern']
                })
                
                print(f"✅ 已修复: {file_path} - {fix_config['description']}")
            
        except Exception as e:
            error_msg = f"修复文件 {file_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def fix_array_syntax_errors(self):
        """修复数组语法错误"""
        files_to_check = [
            'src/pages/ProductEntry.tsx',
            'src/pages/PurchaseEntry.tsx', 
            'src/pages/PurchaseList.tsx'
        ]
        
        for file_path in files_to_check:
            if not os.path.exists(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original_content = content
                
                # 修复特定的数组语法错误
                # 修复 { value: 'AA', label: 'AA级' } 中缺少逗号的问题
                content = re.sub(
                    r"(\{\s*value:\s*'[^']+',\s*label:\s*'[^']+'\s*)\},",
                    r'\1 },',
                    content
                )
                
                if content != original_content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    self.fixes_applied.append({
                        'file': file_path,
                        'description': '修复数组对象语法',
                        'type': 'array_syntax_fix'
                    })
                    
                    print(f"✅ 已修复数组语法: {file_path}")
                    
            except Exception as e:
                error_msg = f"修复数组语法 {file_path} 时出错: {str(e)}"
                print(f"❌ {error_msg}")
                self.errors_found.append(error_msg)
    
    def fix_object_property_syntax(self):
        """修复对象属性语法错误"""
        files_to_check = [
            'src/pages/SalesList.tsx',
            'src/pages/PurchaseList.tsx'
        ]
        
        for file_path in files_to_check:
            if not os.path.exists(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                modified = False
                
                for i, line in enumerate(lines):
                    # 修复 selected_sku: sku 后缺少逗号
                    if 'selected_sku:' in line and not line.strip().endswith(','):
                        if i < len(lines) - 1 and lines[i + 1].strip() and not lines[i + 1].strip().startswith('}'):
                            lines[i] = line.rstrip() + ',\n'
                            modified = True
                    
                    # 修复 sorting: { ... } 语法
                    if 'sorting:' in line and '{' in line and '}' in line:
                        if not line.strip().endswith(','):
                            lines[i] = line.rstrip() + ',\n'
                            modified = True
                    
                    # 修复 filters: state.filters 语法
                    if 'filters:' in line and 'state.filters' in line:
                        if not line.strip().endswith(','):
                            lines[i] = line.rstrip() + ',\n'
                            modified = True
                
                if modified:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.writelines(lines)
                    
                    self.fixes_applied.append({
                        'file': file_path,
                        'description': '修复对象属性语法',
                        'type': 'object_property_fix'
                    })
                    
                    print(f"✅ 已修复对象属性语法: {file_path}")
                    
            except Exception as e:
                error_msg = f"修复对象属性语法 {file_path} 时出错: {str(e)}"
                print(f"❌ {error_msg}")
                self.errors_found.append(error_msg)
    
    def run_precise_fixes(self):
        """运行精确修复"""
        print("🎯 开始精确错误修复...")
        print("📊 目标：修复55个具体的语法错误")
        
        # 创建备份
        self.create_backup()
        
        # 修复具体错误
        self.fix_specific_errors()
        
        # 修复数组语法错误
        self.fix_array_syntax_errors()
        
        # 修复对象属性语法错误
        self.fix_object_property_syntax()
        
        # 生成报告
        self.generate_report()
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_fixes': len(self.fixes_applied),
            'total_errors': len(self.errors_found),
            'fixes_applied': self.fixes_applied,
            'errors_found': self.errors_found
        }
        
        # 保存报告
        with open('precise_error_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 精确修复完成统计:")
        print(f"   总修复数: {report['total_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        print(f"\n📄 详细报告已保存到: precise_error_fix_report.json")

if __name__ == '__main__':
    fixer = PreciseErrorFixer()
    
    if fixer.run_precise_fixes():
        print("\n✅ 精确修复完成！")
        print("📊 请运行 'npm run build' 检查错误数量")
        print("🎯 目标：将55个错误减少到更少")
    else:
        print("\n❌ 修复过程中出现问题！")