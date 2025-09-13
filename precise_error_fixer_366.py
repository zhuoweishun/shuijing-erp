#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精准错误修复脚本 - 处理366个TypeScript错误
重点修复：变量命名、字段名、类型检查、函数返回值
"""

import os
import re
import shutil
from datetime import datetime

def create_backup(file_path):
    """创建文件备份"""
    if os.path.exists(file_path):
        backup_dir = os.path.join(os.path.dirname(file_path), 'backups', 'precise_fix_366')
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, f"{os.path.basename(file_path)}.backup")
        shutil.copy2(file_path, backup_path)
        return backup_path
    return None

def fix_variable_naming_errors(content):
    """修复变量命名错误"""
    fixes = []
    
    # 修复 totalBeads -> total_beads
    if 'totalBeads' in content:
        content = re.sub(r'\btotalBeads\b', 'total_beads', content)
        fixes.append("totalBeads -> total_beads")
    
    # 修复 skuName -> sku_name
    if 'skuName:' in content:
        content = re.sub(r'\bskuName:', 'sku_name:', content)
        fixes.append("skuName -> sku_name")
    
    # 修复 beadDiameter -> bead_diameter
    if 'beadDiameter' in content:
        content = re.sub(r'\bbeadDiameter\b', 'bead_diameter', content)
        fixes.append("beadDiameter -> bead_diameter")
    
    # 修复 productName -> product_name
    if 'productName' in content:
        content = re.sub(r'\bproductName\b', 'product_name', content)
        fixes.append("productName -> product_name")
    
    # 修复 username -> user_name
    if 'username' in content and 'user_name' in content:
        content = re.sub(r'\busername\b', 'user_name', content)
        fixes.append("username -> user_name")
    
    return content, fixes

def fix_product_type_enum_errors(content):
    """修复产品类型枚举比较错误"""
    fixes = []
    
    # 修复重复的 LOOSE_BEADS 比较
    pattern = r"(product_type === 'LOOSE_BEADS')\s*\|\|\s*(\w+\.product_type === 'LOOSE_BEADS')"
    if re.search(pattern, content):
        content = re.sub(pattern, r"\1 || \2.product_type === 'ACCESSORIES'", content)
        fixes.append("修复重复的LOOSE_BEADS比较")
    
    # 修复 FINISHED 与 LOOSE_BEADS 的错误比较
    # 当类型是 FINISHED 时，不应该与 LOOSE_BEADS 比较
    pattern = r"if\s*\(\s*(\w+)\.product_type\s*===\s*'LOOSE_BEADS'\s*\)\s*{([^}]+)}\s*else\s*if\s*\(\s*\1\.product_type\s*===\s*'LOOSE_BEADS'"
    if re.search(pattern, content):
        content = re.sub(pattern, r"if (\1.product_type === 'LOOSE_BEADS') {\2} else if (\1.product_type === 'ACCESSORIES'", content)
        fixes.append("修复FINISHED与LOOSE_BEADS的错误比较")
    
    return content, fixes

def fix_null_check_errors(content):
    """修复null检查错误"""
    fixes = []
    
    # 为 purchase 添加 null 检查
    pattern = r"switch\s*\(\s*purchase\.product_type\s*\)"
    if re.search(pattern, content):
        content = re.sub(pattern, "switch (purchase?.product_type)", content)
        fixes.append("为purchase添加null检查")
    
    # 修复 purchase 可能为 null 的访问
    patterns = [
        (r"purchase\.price_per_bead", "purchase?.price_per_bead"),
        (r"purchase\.unit_price", "purchase?.unit_price"),
        (r"purchase\.price_per_gram", "purchase?.price_per_gram"),
        (r"purchase\.price_per_piece", "purchase?.price_per_piece"),
        (r"purchase\.specification", "purchase?.specification"),
        (r"purchase\.bead_diameter", "purchase?.bead_diameter"),
        (r"purchase\.user", "purchase?.user"),
        (r"purchase\.product_name", "purchase?.product_name")
    ]
    
    for old_pattern, new_pattern in patterns:
        if re.search(old_pattern, content) and not re.search(new_pattern.replace('?', '\\?'), content):
            content = re.sub(old_pattern, new_pattern, content)
            fixes.append(f"添加null检查: {old_pattern} -> {new_pattern}")
    
    return content, fixes

def fix_function_return_errors(content):
    """修复函数返回值错误"""
    fixes = []
    
    # 为缺少返回值的异步函数添加返回语句
    patterns = [
        # 匹配 asyncHandler 函数但没有明确返回值的情况
        (r"(router\.(get|post|put|delete)\([^,]+,\s*authenticateToken,\s*asyncHandler\(async\s*\([^)]+\)\s*=>\s*{[^}]*})\s*}\)\)", 
         r"\1\n  return res.status(200).json({ success: true })\n}))")
    ]
    
    for pattern, replacement in patterns:
        if re.search(pattern, content, re.DOTALL):
            # 只在没有明确返回语句的情况下添加
            if not re.search(r"return\s+res\.", content):
                content = re.sub(pattern, replacement, content, flags=re.DOTALL)
                fixes.append("添加缺失的函数返回值")
    
    return content, fixes

def fix_unused_variable_errors(content):
    """修复未使用变量错误"""
    fixes = []
    
    # 移除未使用的 req 参数
    pattern = r"async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*{"
    if re.search(pattern, content):
        # 检查 req 是否在函数体中被使用
        function_bodies = re.findall(r"async\s*\(\s*req\s*,\s*res\s*\)\s*=>\s*{([^}]*)}", content, re.DOTALL)
        for body in function_bodies:
            if 'req.' not in body and 'req[' not in body:
                content = re.sub(r