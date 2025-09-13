#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第三轮错误修复脚本 - 处理剩余287个TypeScript错误
主要修复：changedFields/changed_fields命名不一致、其他遗漏的蛇形命名问题
"""

import os
import re
import shutil
from datetime import datetime

def create_backup(file_path):
    """创建文件备份"""
    backup_dir = os.path.join(os.path.dirname(file_path), 'backups', 'third_round_287')
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = os.path.basename(file_path)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(backup_dir, f"{filename}.{timestamp}.bak")
    
    shutil.copy2(file_path, backup_path)
    return backup_path

def fix_operation_logger_fields(content, file_path):
    """修复operationLogger.ts中的字段命名问题"""
    fixes = []
    
    if 'operationLogger.ts' not in file_path:
        return content, fixes
    
    # 1. 修复changedFields -> changed_fields
    if 'changedFields' in content:
        content = re.sub(r'\bchangedFields\b', 'changed_fields', content)
        fixes.append("changedFields -> changed_fields")
    
    # 2. 修复其他可能的字段命名问题
    field_fixes = [
        (r'\bfieldsChanged\b', 'fields_changed'),
        (r'\bchangeCount\b', 'change_count'),
        (r'\bresourceType\b', 'resource_type'),
        (r'\bactionType\b', 'action_type'),
        (r'\btimestamp\b', 'timestamp'),  # 这个可能不需要改，但检查一下
    ]
    
    for pattern, replacement in field_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes.append(f"{pattern} -> {replacement}")
    
    return content, fixes

def fix_comprehensive_snake_case(content, file_path):
    """全面修复蛇形命名问题"""
    fixes = []
    
    # 更全面的驼峰转蛇形命名修复
    comprehensive_fixes = [
        # ID相关
        (r'\buserId\b', 'user_id'),
        (r'\bresourceId\b', 'resource_id'),
        (r'\bproductId\b', 'product_id'),
        (r'\bcustomerId\b', 'customer_id'),
        (r'\bsupplierId\b', 'supplier_id'),
        (r'\bpurchaseId\b', 'purchase_id'),
        (r'\bskuId\b', 'sku_id'),
        (r'\bmaterialId\b', 'material_id'),
        (r'\boperationId\b', 'operation_id'),
        (r'\bfileId\b', 'file_id'),
        (r'\btokenId\b', 'token_id'),
        (r'\bsessionId\b', 'session_id'),
        (r'\brequestId\b', 'request_id'),
        (r'\bresponseId\b', 'response_id'),
        
        # Name相关
        (r'\buserName\b', 'user_name'),
        (r'\bproductName\b', 'product_name'),
        (r'\bcustomerName\b', 'customer_name'),
        (r'\bsupplierName\b', 'supplier_name'),
        (r'\bskuName\b', 'sku_name'),
        (r'\bmaterialName\b', 'material_name'),
        (r'\bfileName\b', 'file_name'),
        
        # Type相关
        (r'\bproductType\b', 'product_type'),
        (r'\bmaterialType\b', 'material_type'),
        (r'\bcontentType\b', 'content_type'),
        (r'\bresourceType\b', 'resource_type'),
        (r'\bactionType\b', 'action_type'),
        
        # Code相关
        (r'\bproductCode\b', 'product_code'),
        (r'\bpurchaseCode\b', 'purchase_code'),
        (r'\bskuCode\b', 'sku_code'),
        (r'\bmaterialCode\b', 'material_code'),
        
        # Date/Time相关
        (r'\bcreatedAt\b', 'created_at'),
        (r'\bupdatedAt\b', 'updated_at'),
        (r'\bdeletedAt\b', 'deleted_at'),
        (r'\bstartDate\b', 'start_date'),
        (r'\bendDate\b', 'end_date'),
        (r'\bpurchaseDate\b', 'purchase_date'),
        
        # Price相关
        (r'\bunitPrice\b', 'unit_price'),
        (r'\btotalPrice\b', 'total_price'),
        (r'\bpricePerGram\b', 'price_per_gram'),
        (r'\bpricePerBead\b', 'price_per_bead'),
        (r'\bpricePerPiece\b', 'price_per_piece'),
        
        # Count/Quantity相关
        (r'\btotalCount\b', 'total_count'),
        (r'\bitemCount\b', 'item_count'),
        (r'\bpieceCount\b', 'piece_count'),
        (r'\bbeadCount\b', 'bead_count'),
        (r'\bavailableQuantity\b', 'available_quantity'),
        (r'\btotalQuantity\b', 'total_quantity'),
        (r'\busedQuantity\b', 'used_quantity'),
        
        # Status相关
        (r'\bisActive\b', 'is_active'),
        (r'\bisDeleted\b', 'is_deleted'),
        (r'\bisLowStock\b', 'is_low_stock'),
        (r'\bisAvailable\b', 'is_available'),
        
        # Other common patterns
        (r'\bbeadDiameter\b', 'bead_diameter'),
        (r'\bminStock\b', 'min_stock'),
        (r'\bmaxStock\b', 'max_stock'),
        (r'\bstockAlert\b', 'stock_alert'),
        (r'\bminStockAlert\b', 'min_stock_alert'),
        (r'\bchangedFields\b', 'changed_fields'),
        (r'\bfieldsChanged\b', 'fields_changed'),
        (r'\bchangeCount\b', 'change_count'),
    ]
    
    for pattern, replacement in comprehensive_fixes:
        if re.search(pattern, content):
            old_count = len(re.findall(pattern, content))
            content = re.sub(pattern, replacement, content)
            fixes.append(f"{pattern} -> {replacement} ({old_count}处)")
    
    return content, fixes

def fix_object_literal_properties(content, file_path):
    """修复对象字面量中的属性命名"""
    fixes = []
    
    # 修复对象字面量中的驼峰属性名
    property_patterns = [
        (r'(\{\s*)userId(\s*:)', r'\1user_id\2'),
        (r'(,\s*)userId(\s*:)', r'\1user_id\2'),
        (r'(\{\s*)resourceId(\s*:)', r'\1resource_id\2'),
        (r'(,\s*)resourceId(\s*:)', r'\1resource_id\2'),
        (r'(\{\s*)productId(\s*:)', r'\1product_id\2'),
        (r'(,\s*)productId(\s*:)', r'\1product_id\2'),
        (r'(\{\s*)customerId(\s*:)', r'\1customer_id\2'),
        (r'(,\s*)customerId(\s*:)', r'\1customer_id\2'),
        (r'(\{\s*)supplierId(\s*:)', r'\1supplier_id\2'),
        (r'(,\s*)supplierId(\s*:)', r'\1supplier_id\2'),
        (r'(\{\s*)changedFields(\s*:)', r'\1changed_fields\2'),
        (r'(,\s*)changedFields(\s*:)', r'\1changed_fields\2'),
        (r'(\{\s*)fieldsChanged(\s*:)', r'\1fields_changed\2'),
        (r'(,\s*)fieldsChanged(\s*:)', r'\1fields_changed\2'),
    ]
    
    for pattern, replacement in property_patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes.append(f"修复对象属性: {pattern[:30]}...")
    
    return content, fixes

def fix_function_parameters(content, file_path):
    """修复函数参数命名"""
    fixes = []
    
    # 修复函数参数中的驼峰命名
    param_patterns = [
        (r'\(([^)]*?)userId([^)]*?)\)', r'(\1user_id\2)'),
        (r'\(([^)]*?)resourceId([^)]*?)\)', r'(\1resource_id\2)'),
        (r'\(([^)]*?)productId([^)]*?)\)', r'(\1product_id\2)'),
        (r'\(([^)]*?)customerId([^)]*?)\)', r'(\1customer_id\2)'),
        (r'\(([^)]*?)supplierId([^)]*?)\)', r'(\1supplier_id\2)'),
        (r'\(([^)]*?)changedFields([^)]*?)\)', r'(\1changed_fields\2)'),
    ]
    
    for pattern, replacement in param_patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes.append(f"修复函数参数: {pattern[:30]}...")
    
    return content, fixes

def process_file(file_path):
    """处理单个文件"""
    print(f"\n处理文件: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return []
    
    # 创建备份
    backup_path = create_backup(file_path)
    print(f"备份创建: {backup_path}")
    
    # 读取文件内容
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    all_fixes = []
    
    # 应用各种修复
    content, fixes = fix_operation_logger_fields(content, file_path)
    all_fixes.extend([f"操作日志字段: {fix}" for fix in fixes])
    
    content, fixes = fix_comprehensive_snake_case(content, file_path)
    all_fixes.extend([f"蛇形命名: {fix}" for fix in fixes])
    
    content, fixes = fix_object_literal_properties(content, file_path)
    all_fixes.extend([f"对象属性: {fix}" for fix in fixes])
    
    content, fixes = fix_function_parameters(content, file_path)
    all_fixes.extend([f"函数参数: {fix}" for fix in fixes])
    
    # 如果有修改，写入文件
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"文件已修改，应用了 {len(all_fixes)} 处修复")
        for fix in all_fixes:
            print(f"  - {fix}")
    else:
        print("文件无需修改")
    
    return all_fixes

def main():
    """主函数"""
    print("=== 第三轮错误修复脚本 - 处理剩余287个TypeScript错误 ===")
    print(f"开始时间: {datetime.now()}")
    
    # 重点处理有错误的文件
    files_to_process = [
        'backend/src/utils/operationLogger.ts',  # 4个错误
        'backend/src/routes/customers.ts',       # 82个错误
        'backend/src/routes/financial.ts',       # 41个错误
        'backend/src/routes/skus.ts',           # 31个错误
        'backend/src/routes/inventory.ts',       # 25个错误
        'backend/src/routes/suppliers.ts',       # 16个错误
        'backend/src/routes/products.ts',        # 15个错误
        'backend/src/routes/users.ts',          # 15个错误
        'backend/src/routes/purchases.ts',       # 11个错误
        'backend/src/server.ts',                # 11个错误
        'backend/src/routes/materials.ts',       # 7个错误
        'backend/src/middleware/responseValidator.ts', # 6个错误
        'backend/src/routes/auth.ts',           # 5个错误
        'backend/src/routes/upload.ts',         # 5个错误
    ]
    
    total_fixes = 0
    processed_files = 0
    
    for file_path in files_to_process:
        full_path = os.path.join(os.getcwd(), file_path)
        fixes = process_file(full_path)
        if fixes:
            total_fixes += len(fixes)
            processed_files += 1
    
    print(f"\n=== 第三轮修复完成 ===")
    print(f"处理文件数: {processed_files}")
    print(f"总修复数: {total_fixes}")
    print(f"完成时间: {datetime.now()}")
    print("\n建议运行 'npm run check' 验证修复效果")

if __name__ == '__main__':
    main()