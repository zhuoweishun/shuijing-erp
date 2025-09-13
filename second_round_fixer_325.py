#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第二轮错误修复脚本 - 处理剩余325个TypeScript错误
主要修复：userId/user_id命名不一致、resourceId/resource_id问题、其他蛇形命名问题
"""

import os
import re
import shutil
from datetime import datetime

def create_backup(file_path):
    """创建文件备份"""
    backup_dir = os.path.join(os.path.dirname(file_path), 'backups', 'second_round_325')
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = os.path.basename(file_path)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(backup_dir, f"{filename}.{timestamp}.bak")
    
    shutil.copy2(file_path, backup_path)
    return backup_path

def fix_operation_logger(content, file_path):
    """修复operationLogger.ts中的命名问题"""
    fixes = []
    
    if 'operationLogger.ts' not in file_path:
        return content, fixes
    
    # 1. 修复userId -> user_id
    if 'userId,' in content:
        content = re.sub(r'\buserId,', 'user_id,', content)
        fixes.append("userId -> user_id (参数)")
    
    # 2. 修复对象属性中的userId
    if 'userId:' in content:
        content = re.sub(r'\buserId:', 'user_id:', content)
        fixes.append("userId -> user_id (对象属性)")
    
    # 3. 修复resourceId -> resource_id
    if 'resourceId' in content:
        content = re.sub(r'\bresourceId\b', 'resource_id', content)
        fixes.append("resourceId -> resource_id")
    
    # 4. 修复函数参数声明
    content = re.sub(
        r'function logOperation\(\s*user_id: string,\s*action: string,\s*resource_type: string,\s*resource_id: string,',
        'function logOperation(\n    user_id: string,\n    action: string,\n    resource_type: string,\n    resource_id: string,',
        content
    )
    
    # 5. 修复未使用参数的警告
    if 'user_id: string,' in content and 'user_id' not in content.replace('user_id: string,', ''):
        content = re.sub(r'user_id: string,', '_user_id: string,', content)
        fixes.append("未使用的user_id -> _user_id")
    
    if 'resource_id: string,' in content and 'resource_id' not in content.replace('resource_id: string,', ''):
        content = re.sub(r'resource_id: string,', '_resource_id: string,', content)
        fixes.append("未使用的resource_id -> _resource_id")
    
    return content, fixes

def fix_snake_case_naming(content, file_path):
    """修复其他蛇形命名问题"""
    fixes = []
    
    # 常见的驼峰转蛇形命名修复
    naming_fixes = [
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
    ]
    
    for pattern, replacement in naming_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes.append(f"{pattern} -> {replacement}")
    
    return content, fixes

def fix_import_issues(content, file_path):
    """修复导入问题"""
    fixes = []
    
    # 修复skuUtils导入问题
    if "from '../utils/skuUtils'" in content:
        content = re.sub(
            r"from '\.\./utils/skuUtils'",
            "from '../utils/skuUtils.js'",
            content
        )
        fixes.append("修复skuUtils导入路径")
    
    return content, fixes

def fix_type_declarations(content, file_path):
    """修复类型声明问题"""
    fixes = []
    
    # 修复OperationLogData接口
    if 'interface OperationLogData' in content:
        # 确保接口使用蛇形命名
        interface_pattern = r'interface OperationLogData \{[^}]+\}'
        match = re.search(interface_pattern, content, re.DOTALL)
        if match:
            interface_content = match.group(0)
            # 替换驼峰命名为蛇形命名
            new_interface = re.sub(r'\buserId:', 'user_id:', interface_content)
            new_interface = re.sub(r'\bresourceId:', 'resource_id:', new_interface)
            content = content.replace(interface_content, new_interface)
            fixes.append("修复OperationLogData接口命名")
    
    return content, fixes

def fix_function_signatures(content, file_path):
    """修复函数签名问题"""
    fixes = []
    
    # 修复函数参数命名不一致
    patterns = [
        # 修复logOperation函数
        (r'function logOperation\([^)]+\)', lambda m: re.sub(r'\buserId\b', 'user_id', m.group(0))),
        (r'async function logOperation\([^)]+\)', lambda m: re.sub(r'\buserId\b', 'user_id', m.group(0))),
        
        # 修复其他函数
        (r'function [^(]+\([^)]*userId[^)]*\)', lambda m: re.sub(r'\buserId\b', 'user_id', m.group(0))),
        (r'async function [^(]+\([^)]*userId[^)]*\)', lambda m: re.sub(r'\buserId\b', 'user_id', m.group(0))),
    ]
    
    for pattern, replacement in patterns:
        matches = re.finditer(pattern, content)
        for match in matches:
            old_text = match.group(0)
            new_text = replacement(match)
            if old_text != new_text:
                content = content.replace(old_text, new_text)
                fixes.append(f"修复函数签名: {old_text[:50]}...")
    
    return content, fixes

def fix_object_properties(content, file_path):
    """修复对象属性命名"""
    fixes = []
    
    # 修复对象字面量中的属性名
    property_fixes = [
        (r'\{\s*userId:', '{ user_id:'),
        (r',\s*userId:', ', user_id:'),
        (r'\{\s*resourceId:', '{ resource_id:'),
        (r',\s*resourceId:', ', resource_id:'),
    ]
    
    for pattern, replacement in property_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes.append(f"修复对象属性: {pattern} -> {replacement}")
    
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
    content, fixes = fix_operation_logger(content, file_path)
    all_fixes.extend([f"操作日志: {fix}" for fix in fixes])
    
    content, fixes = fix_snake_case_naming(content, file_path)
    all_fixes.extend([f"蛇形命名: {fix}" for fix in fixes])
    
    content, fixes = fix_import_issues(content, file_path)
    all_fixes.extend([f"导入修复: {fix}" for fix in fixes])
    
    content, fixes = fix_type_declarations(content, file_path)
    all_fixes.extend([f"类型声明: {fix}" for fix in fixes])
    
    content, fixes = fix_function_signatures(content, file_path)
    all_fixes.extend([f"函数签名: {fix}" for fix in fixes])
    
    content, fixes = fix_object_properties(content, file_path)
    all_fixes.extend([f"对象属性: {fix}" for fix in fixes])
    
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
    print("=== 第二轮错误修复脚本 - 处理剩余325个TypeScript错误 ===")
    print(f"开始时间: {datetime.now()}")
    
    # 需要处理的文件列表（根据错误报告）
    files_to_process = [
        'backend/src/utils/operationLogger.ts',
        'backend/src/routes/skus.ts',
        'backend/src/routes/customers.ts',
        'backend/src/routes/financial.ts',
        'backend/src/routes/inventory.ts',
        'backend/src/routes/materials.ts',
        'backend/src/routes/products.ts',
        'backend/src/routes/purchases.ts',
        'backend/src/routes/suppliers.ts',
        'backend/src/routes/users.ts',
        'backend/src/middleware/auth.ts',
        'backend/src/middleware/errorHandler.ts',
        'backend/src/middleware/responseValidator.ts',
    ]
    
    total_fixes = 0
    processed_files = 0
    
    for file_path in files_to_process:
        full_path = os.path.join(os.getcwd(), file_path)
        fixes = process_file(full_path)
        if fixes:
            total_fixes += len(fixes)
            processed_files += 1
    
    print(f"\n=== 第二轮修复完成 ===")
    print(f"处理文件数: {processed_files}")
    print(f"总修复数: {total_fixes}")
    print(f"完成时间: {datetime.now()}")
    print("\n建议运行 'npm run check' 验证修复效果")

if __name__ == '__main__':
    main()