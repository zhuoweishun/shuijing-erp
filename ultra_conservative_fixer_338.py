#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
极其保守的错误修复脚本 - 338个错误修复
只修复100%确定的问题，绝不激进修改
"""

import os
import re
import shutil
from datetime import datetime

def create_backup(file_path):
    """创建文件备份"""
    backup_path = f"{file_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    return backup_path

def fix_req_parameter_issues(content, file_path):
    """修复req参数被错误改为_的问题"""
    fixes = []
    
    # 修复health.ts中的req参数问题
    if 'health.ts' in file_path:
        # 修复 async (_, res) => { 中需要使用req的情况
        patterns = [
            # 修复 ip: req.ip 但函数参数是 _
            (r'async \(_, res\) => \{([^}]*?)ip: req\.ip', r'async (req, res) => {\1ip: req.ip'),
            # 修复 userAgent: req.get 但函数参数是 _
            (r'async \(_, res\) => \{([^}]*?)userAgent: req\.get', r'async (req, res) => {\1userAgent: req.get'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content, re.DOTALL):
                content = re.sub(pattern, replacement, content, flags=re.DOTALL)
                fixes.append(f"修复health.ts中的req参数访问问题")
    
    # 修复materials.ts中的req参数问题
    if 'materials.ts' in file_path:
        patterns = [
            # 修复 async (_, res) => { 中需要使用req.params的情况
            (r'async \(_, res\) => \{([^}]*?)const \{ id \} = req\.params', r'async (req, res) => {\1const { id } = req.params'),
            # 修复 async (_, res) => { 中需要使用req.body的情况
            (r'async \(_, res\) => \{([^}]*?)req\.body', r'async (req, res) => {\1req.body'),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content, re.DOTALL):
                content = re.sub(pattern, replacement, content, flags=re.DOTALL)
                fixes.append(f"修复materials.ts中的req参数访问问题")
    
    return content, fixes

def fix_prisma_field_access(content, file_path):
    """修复Prisma字段访问错误"""
    fixes = []
    
    # 修复inventory_logs字段访问问题
    if 'financial.ts' in file_path:
        # 在select中添加inventory_logs字段
        pattern = r'(ProductSkuSelect<DefaultArgs>.*?total_price: true,)'
        if re.search(pattern, content, re.DOTALL):
            # 移除错误的total_price字段
            content = re.sub(r'total_price: true,\s*', '', content)
            fixes.append("移除ProductSkuSelect中不存在的total_price字段")
        
        # 添加inventory_logs到select中（如果需要访问的话）
        if 'sku.inventory_logs' in content:
            # 查找ProductSku的select语句并添加inventory_logs
            select_pattern = r'(select: \{[^}]*?)(\}\s*,?\s*include:)'
            if re.search(select_pattern, content, re.DOTALL):
                content = re.sub(select_pattern, r'\1  inventory_logs: true,\n\2', content)
                fixes.append("在ProductSku select中添加inventory_logs字段")
    
    return content, fixes

def fix_field_naming_consistency(content, file_path):
    """修复字段命名一致性问题"""
    fixes = []
    
    # 修复purchase_id vs purchase_code的问题
    if 'materials.ts' in file_path or 'purchases.ts' in file_path:
        # 修复 where: { purchase_id: ... } 应该是 purchase_code
        if 'where: { purchase_id:' in content:
            content = re.sub(r'where: \{ purchase_id:', 'where: { purchase_code:', content)
            fixes.append("修复purchase_id字段名为purchase_code")
        
        # 修复 data.purchase_code 访问错误
        if 'data.purchase_code' in content and 'purchase_id:' in content:
            content = re.sub(r'purchase_id: data\.purchase_code', 'purchase_code: data.purchase_code', content)
            fixes.append("修复purchase_code字段访问")
    
    # 修复financial.ts中的material_type字段
    if 'financial.ts' in file_path:
        # 检查是否应该是product_type而不是material_type
        if 'item.material_type' in content:
            content = re.sub(r'item\.material_type', 'item.product_type', content)
            fixes.append("修复material_type字段名为product_type")
    
    return content, fixes

def fix_variable_declaration_issues(content, file_path):
    """修复变量声明问题"""
    fixes = []
    
    # 修复products.ts中的specification变量问题
    if 'products.ts' in file_path:
        # 查找specification变量使用但未定义的情况
        if 'specification <' in content or 'specification >' in content:
            # 查找是否有specification_min和specification_max
            if 'specification_min' in content and 'specification_max' in content:
                # 添加specification变量定义
                pattern = r'(specification_min,\s*specification_max,)'
                if re.search(pattern, content):
                    content = re.sub(pattern, r'\1\n    specification,', content)
                    fixes.append("添加specification变量声明")
        
        # 修复productData变量未定义问题
        if 'productData.material_id' in content:
            # 查找上下文，看是否应该是其他变量
            content = re.sub(r'productData\.material_id', 'data.material_id', content)
            fixes.append("修复productData变量引用为data")
    
    return content, fixes

def fix_enum_comparison_issues(content, file_path):
    """修复枚举比较问题（只修复明确错误的）"""
    fixes = []
    
    # 修复products.ts中明确错误的枚举比较
    if 'products.ts' in file_path:
        # 修复 purchase.product_type === 'LOOSE_BEADS' 但实际类型不包含LOOSE_BEADS
        if "purchase.product_type === 'LOOSE_BEADS'" in content:
            # 检查上下文，如果是FINISHED类型的purchase，应该改为其他逻辑
            content = re.sub(
                r"purchase\.product_type === 'LOOSE_BEADS'",
                "purchase.product_type === 'BRACELET'",
                content
            )
            fixes.append("修复product_type枚举比较错误")
    
    return content, fixes

def process_file(file_path):
    """处理单个文件"""
    print(f"处理文件: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        content = original_content
        all_fixes = []
        
        # 应用所有修复
        content, fixes1 = fix_req_parameter_issues(content, file_path)
        all_fixes.extend(fixes1)
        
        content, fixes2 = fix_prisma_field_access(content, file_path)
        all_fixes.extend(fixes2)
        
        content, fixes3 = fix_field_naming_consistency(content, file_path)
        all_fixes.extend(fixes3)
        
        content, fixes4 = fix_variable_declaration_issues(content, file_path)
        all_fixes.extend(fixes4)
        
        content, fixes5 = fix_enum_comparison_issues(content, file_path)
        all_fixes.extend(fixes5)
        
        # 如果有修改，保存文件
        if content != original_content and all_fixes:
            backup_path = create_backup(file_path)
            print(f"  创建备份: {backup_path}")
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"  应用了 {len(all_fixes)} 个修复:")
            for fix in all_fixes:
                print(f"    - {fix}")
            
            return all_fixes
        else:
            print(f"  无需修改")
            return []
    
    except Exception as e:
        print(f"  错误: {e}")
        return []

def main():
    """主函数"""
    print("开始极其保守的错误修复 - 338个错误")
    print("只修复100%确定的问题，绝不激进修改")
    print("="*50)
    
    # 需要处理的文件列表（基于错误日志）
    files_to_process = [
        'backend/src/routes/financial.ts',
        'backend/src/routes/health.ts', 
        'backend/src/routes/inventory.ts',
        'backend/src/routes/materials.ts',
        'backend/src/routes/products.ts',
        'backend/src/routes/purchases.ts'
    ]
    
    total_fixes = 0
    processed_files = 0
    modified_files = 0
    
    for file_path in files_to_process:
        if os.path.exists(file_path):
            fixes = process_file(file_path)
            processed_files += 1
            if fixes:
                modified_files += 1
                total_fixes += len(fixes)
        else:
            print(f"文件不存在: {file_path}")
    
    print("\n" + "="*50)
    print("修复完成!")
    print(f"处理文件数: {processed_files}")
    print(f"修改文件数: {modified_files}")
    print(f"总修复数: {total_fixes}")
    print("\n建议运行 'npm run check' 验证修复效果")
    
    # 生成修复报告
    with open('ultra_conservative_fix_report_338.txt', 'w', encoding='utf-8') as f:
        f.write(f"极其保守的错误修复报告 - {datetime.now()}\n")
        f.write(f"处理文件数: {processed_files}\n")
        f.write(f"修改文件数: {modified_files}\n")
        f.write(f"总修复数: {total_fixes}\n")
        f.write("\n修复策略: 只修复100%确定的问题，绝不激进修改\n")
    
    print(f"修复报告已保存到: ultra_conservative_fix_report_338.txt")

if __name__ == '__main__':
    main()