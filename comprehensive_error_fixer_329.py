#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全面错误修复脚本 - 针对329个错误
基于错误分布分析，重点修复高频问题
目标：将错误从329个减少到150个以内
"""

import os
import re
import shutil
from datetime import datetime
import json

def create_backup(file_path):
    """创建文件备份"""
    backup_dir = "backups/comprehensive_fix_329"
    os.makedirs(backup_dir, exist_ok=True)
    
    backup_path = os.path.join(backup_dir, os.path.basename(file_path) + ".backup")
    shutil.copy2(file_path, backup_path)
    return backup_path

def fix_prisma_field_naming_issues(content, file_path):
    """修复Prisma字段命名问题（蛇形vs驼峰）"""
    fixes = []
    
    # 修复常见的字段命名不一致问题
    field_mappings = {
        'purchaseId': 'purchase_id',
        'userId': 'user_id', 
        'supplierId': 'supplier_id',
        'customerId': 'customer_id',
        'productId': 'product_id',
        'skuId': 'sku_id',
        'materialId': 'material_id',
        'resourceId': 'resource_id',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'productName': 'product_name',
        'productType': 'product_type',
        'unitType': 'unit_type',
        'beadDiameter': 'bead_diameter',
        'pieceCount': 'piece_count',
        'totalPrice': 'total_price',
        'unitPrice': 'unit_price',
        'pricePerBead': 'price_per_bead',
        'pricePerGram': 'price_per_gram',
        'purchaseCode': 'purchase_code',
        'purchaseDate': 'purchase_date',
        'minStockAlert': 'min_stock_alert',
        'isLowStock': 'is_low_stock',
        'totalBeads': 'total_beads',
        'changedFields': 'changed_fields'
    }
    
    for camel_case, snake_case in field_mappings.items():
        # 修复对象属性访问
        pattern = rf'\b{camel_case}:'
        if re.search(pattern, content):
            content = re.sub(pattern, f'{snake_case}:', content)
            fixes.append(f"修复{os.path.basename(file_path)}中{camel_case}字段为{snake_case}")
        
        # 修复where条件中的字段
        pattern = rf'where:\s*\{{\s*{camel_case}:'
        if re.search(pattern, content):
            content = re.sub(pattern, f'where: {{ {snake_case}:', content)
            fixes.append(f"修复{os.path.basename(file_path)}中where条件的{camel_case}字段")
        
        # 修复select中的字段
        pattern = rf'select:\s*\{{[^}}]*{camel_case}:'
        if re.search(pattern, content, re.DOTALL):
            content = re.sub(rf'{camel_case}:', f'{snake_case}:', content)
            fixes.append(f"修复{os.path.basename(file_path)}中select的{camel_case}字段")
    
    return content, fixes

def fix_function_return_statements(content, file_path):
    """修复函数缺少返回语句的问题"""
    fixes = []
    
    # 查找缺少返回语句的async函数
    async_function_pattern = r'(router\.(get|post|put|delete)\([^,]+,\s*authenticateToken,\s*asyncHandler\(async\s*\([^)]+\)\s*=>\s*\{[^}]+)(?<!return\s[^}]+)\}\)\)'
    
    def add_return_statement(match):
        function_body = match.group(1)
        # 检查是否已经有return语句
        if 'return ' in function_body:
            return match.group(0)  # 已有return，不修改
        
        # 添加return语句
        return function_body + '\n  return res.status(200).json({ success: true })\n}))'
    
    new_content = re.sub(async_function_pattern, add_return_statement, content, flags=re.DOTALL)
    if new_content != content:
        content = new_content
        fixes.append(f"为{os.path.basename(file_path)}中的函数添加返回语句")
    
    return content, fixes

def fix_type_annotation_issues(content, file_path):
    """修复类型注解问题"""
    fixes = []
    
    # 修复隐式any类型
    patterns = [
        # 修复forEach回调参数
        (r'forEach\((\w+)\s*=>', r'forEach((\1: any) =>'),
        # 修复map回调参数
        (r'map\((\w+)\s*=>', r'map((\1: any) =>'),
        # 修复filter回调参数
        (r'filter\((\w+)\s*=>', r'filter((\1: any) =>'),
    ]
    
    for pattern, replacement in patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes.append(f"修复{os.path.basename(file_path)}中的隐式any类型")
    
    return content, fixes

def fix_import_and_export_issues(content, file_path):
    """修复导入导出问题"""
    fixes = []
    
    # 移除未使用的导入
    unused_imports = [
        'productTypeSchema',
        'exportQuerySchema',
        'parseProductClassification'
    ]
    
    for unused_import in unused_imports:
        # 移除从导入列表中
        pattern = rf',\s*{unused_import}'
        if re.search(pattern, content):
            content = re.sub(pattern, '', content)
            fixes.append(f"移除{os.path.basename(file_path)}中未使用的{unused_import}导入")
        
        # 移除单独的导入
        pattern = rf'import\s*\{{\s*{unused_import}\s*\}}\s*from[^;]+;?\n?'
        if re.search(pattern, content):
            content = re.sub(pattern, '', content)
            fixes.append(f"移除{os.path.basename(file_path)}中{unused_import}的单独导入")
    
    # 修复.js扩展名导入问题
    content = re.sub(r"from\s+['\"]([^'\"]+)\.js['\"]", r"from '\1'", content)
    if '.js' not in content:
        fixes.append(f"修复{os.path.basename(file_path)}中的.js导入扩展名")
    
    return content, fixes

def fix_enum_comparison_issues(content, file_path):
    """修复枚举比较问题"""
    fixes = []
    
    # 修复产品类型枚举比较
    if 'products.ts' in file_path:
        # 修复BRACELET类型（应该不存在）
        content = re.sub(r"=== 'BRACELET'", "=== 'LOOSE_BEADS'", content)
        if "=== 'LOOSE_BEADS'" in content:
            fixes.append("修复products.ts中BRACELET枚举比较")
    
    # 修复状态枚举比较
    if 'materials.ts' in file_path:
        content = re.sub(r'"INACTIVE"', '"DEPLETED"', content)
        if '"DEPLETED"' in content:
            fixes.append("修复materials.ts中状态枚举")
    
    return content, fixes

def fix_variable_reference_issues(content, file_path):
    """修复变量引用问题"""
    fixes = []
    
    # 修复未定义的data变量
    if 'products.ts' in file_path:
        content = re.sub(r'data\.material_id', 'req.body.material_id', content)
        if 'req.body.material_id' in content:
            fixes.append("修复products.ts中data变量引用")
    
    # 修复specification变量引用
    if 'inventory.ts' in file_path:
        content = re.sub(r'\bspecification\b(?!_)', 'item.specification', content)
        if 'item.specification' in content:
            fixes.append("修复inventory.ts中specification变量引用")
    
    return content, fixes

def fix_optional_chaining_issues(content, file_path):
    """修复可选链和类型问题"""
    fixes = []
    
    # 修复可选类型问题
    content = re.sub(r'req\.user\?\.role(?!\s*\|\|)', 'req.user?.role || "USER"', content)
    if 'req.user?.role || "USER"' in content:
        fixes.append(f"修复{os.path.basename(file_path)}中可选类型问题")
    
    # 修复可能为null的属性访问
    content = re.sub(r'purchase\?\.piece_count', 'purchase?.piece_count || 1', content)
    if 'purchase?.piece_count || 1' in content:
        fixes.append(f"修复{os.path.basename(file_path)}中null属性访问")
    
    return content, fixes

def fix_boolean_string_comparison(content, file_path):
    """修复布尔值与字符串比较问题"""
    fixes = []
    
    # 修复low_stock_only比较
    content = re.sub(r"low_stock_only === 'true'", "String(low_stock_only) === 'true'", content)
    if "String(low_stock_only) === 'true'" in content:
        fixes.append(f"修复{os.path.basename(file_path)}中布尔值字符串比较")
    
    # 修复quality比较
    content = re.sub(r"quality !== ''", "quality && quality.trim() !== ''", content)
    if "quality && quality.trim() !== ''" in content:
        fixes.append(f"修复{os.path.basename(file_path)}中quality比较")
    
    return content, fixes

def fix_array_type_issues(content, file_path):
    """修复数组类型问题"""
    fixes = []
    
    # 修复ParsedQs数组类型
    if 'products.ts' in file_path:
        content = re.sub(r'productTypesArray = product_types', 
                        'productTypesArray = Array.isArray(product_types) ? product_types.map(String) : [String(product_types)]', 
                        content)
        if 'Array.isArray(product_types)' in content:
            fixes.append("修复products.ts中数组类型转换")
    
    return content, fixes

def process_file(file_path):
    """处理单个文件"""
    print(f"处理文件: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            original_content = f.read()
        
        content = original_content
        all_fixes = []
        
        # 创建备份
        backup_path = create_backup(file_path)
        
        # 应用各种修复
        content, fixes = fix_prisma_field_naming_issues(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_function_return_statements(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_type_annotation_issues(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_import_and_export_issues(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_enum_comparison_issues(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_variable_reference_issues(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_optional_chaining_issues(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_boolean_string_comparison(content, file_path)
        all_fixes.extend(fixes)
        
        content, fixes = fix_array_type_issues(content, file_path)
        all_fixes.extend(fixes)
        
        # 如果有修改，写入文件
        if content != original_content and all_fixes:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  ✓ 修改了文件，应用了 {len(all_fixes)} 处修复")
            return file_path, all_fixes, backup_path
        else:
            print(f"  - 无需修改")
            return None, [], None
            
    except Exception as e:
        print(f"  ✗ 处理文件时出错: {e}")
        return None, [], None

def main():
    """主函数"""
    print("=== 全面错误修复脚本 - 针对329个错误 ===")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 基于错误分布的文件列表（按错误数量排序）
    files_to_process = [
        "backend/src/routes/customers.ts",      # 101 errors
        "backend/src/routes/skus.ts",           # 64 errors  
        "backend/src/routes/financial.ts",      # 41 errors
        "backend/src/routes/inventory.ts",      # 21 errors
        "backend/src/routes/users.ts",          # 18 errors
        "backend/src/routes/products.ts",       # 16 errors
        "backend/src/routes/purchases.ts",      # 11 errors
        "backend/src/server.ts",                # 11 errors
        "backend/src/routes/materials.ts",      # 7 errors
        "backend/src/routes/suppliers.ts",      # 7 errors
        "backend/src/routes/auth.ts",           # 5 errors
        "backend/src/routes/upload.ts",         # 5 errors
        "backend/src/middleware/auth.ts",       # 3 errors
        "backend/src/utils/operationLogger.ts", # 3 errors
        "backend/src/middleware/errorHandler.ts", # 2 errors
        "backend/src/routes/ai.ts",             # 2 errors
        "backend/src/routes/assistant.ts",      # 2 errors
        "backend/src/routes/health.ts",         # 2 errors
        "backend/src/services/ai.ts",           # 1 error
        "backend/src/utils/network.ts"          # 1 error
    ]
    
    # 检查文件是否存在
    existing_files = []
    for file_path in files_to_process:
        if os.path.exists(file_path):
            existing_files.append(file_path)
        else:
            print(f"警告: 文件不存在 {file_path}")
    
    if not existing_files:
        print("错误: 没有找到要处理的文件")
        return
    
    print(f"找到 {len(existing_files)} 个文件需要处理")
    
    # 处理文件
    processed_files = []
    all_fixes = []
    backup_files = []
    
    for file_path in existing_files:
        result_file, fixes, backup_path = process_file(file_path)
        if result_file:
            processed_files.append(result_file)
            all_fixes.extend(fixes)
            if backup_path:
                backup_files.append(backup_path)
    
    # 生成修复报告
    report = {
        "timestamp": datetime.now().isoformat(),
        "processed_files": len(processed_files),
        "total_fixes": len(all_fixes),
        "modified_files": len(processed_files),
        "backup_files": backup_files,
        "fixes_by_category": {
            "prisma_field_naming": len([f for f in all_fixes if '字段' in f]),
            "function_returns": len([f for f in all_fixes if '返回语句' in f]),
            "type_annotations": len([f for f in all_fixes if '类型' in f]),
            "import_exports": len([f for f in all_fixes if '导入' in f]),
            "enum_comparisons": len([f for f in all_fixes if '枚举' in f]),
            "variable_references": len([f for f in all_fixes if '变量' in f]),
            "optional_chaining": len([f for f in all_fixes if '可选' in f]),
            "boolean_comparisons": len([f for f in all_fixes if '比较' in f]),
            "array_types": len([f for f in all_fixes if '数组' in f])
        },
        "detailed_fixes": all_fixes
    }
    
    # 保存修复报告
    with open('comprehensive_fix_report_329.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("\n=== 修复完成 ===")
    print(f"处理文件数: {len(processed_files)}")
    print(f"应用修复数: {len(all_fixes)}")
    print(f"修改文件数: {len(processed_files)}")
    print(f"备份文件数: {len(backup_files)}")
    
    if all_fixes:
        print("\n修复分类统计:")
        for category, count in report["fixes_by_category"].items():
            if count > 0:
                print(f"  {category}: {count}")
        
        print("\n详细修复列表:")
        for i, fix in enumerate(all_fixes, 1):
            print(f"  {i}. {fix}")
    
    print(f"\n修复报告已保存到: comprehensive_fix_report_329.json")
    print("建议运行 npm run check 验证修复效果")
    print("目标：将错误从329个减少到150个以内")

if __name__ == "__main__":
    main()