#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终错误修复脚本 - 修复剩余的149个TypeScript错误
目标：将错误数量降到0个
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

def create_backup():
    """创建备份"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = f'backups/final_fix_{timestamp}'
    
    if os.path.exists('src'):
        os.makedirs(backup_dir, exist_ok=True)
        shutil.copytree('src', f'{backup_dir}/src')
        print(f'✅ 已创建备份: {backup_dir}')
        return backup_dir
    return None

def fix_missing_imports(content, file_path):
    """修复缺失的导入"""
    fixes = 0
    
    # 修复use_device_detection导入
    if "../hooks/use_device_detection" in content:
        content = content.replace(
            "../hooks/use_device_detection",
            "../hooks/useDeviceDetection"
        )
        fixes += 1
    
    return content, fixes

def fix_jsx_props(content, file_path):
    """修复JSX属性命名"""
    fixes = 0
    
    # 修复表单属性
    patterns = [
        (r'on_submit=', 'onSubmit='),
        (r'on_blur=', 'onBlur='),
        (r'on_change=', 'onChange='),
        (r'on_click=', 'onClick='),
        (r'on_focus=', 'onFocus='),
        (r'current_target', 'currentTarget'),
    ]
    
    for pattern, replacement in patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes += 1
    
    return content, fixes

def fix_variable_naming(content, file_path):
    """修复变量命名不一致"""
    fixes = 0
    
    # 常见的变量命名修复
    variable_fixes = [
        # 基础方法名
        (r'\b(\w+)\.to_lower_case\(\)', r'\1.toLowerCase()'),
        (r'\b(\w+)\.index_of\(', r'\1.indexOf('),
        (r'\b(\w+)\.get_date\(\)', r'\1.getDate()'),
        (r'Number\.is_integer\(', 'Number.isInteger('),
        
        # 变量名修复
        (r'\bpiece_count_value\b', 'pieceCountValue'),
        (r'\btemp_search_keyword\b', 'tempSearchKeyword'),
        (r'\btemp_selected_products\b', 'tempSelectedProducts'),
        (r'\bsearch_keyword\b', 'searchKeyword'),
        (r'\bselected_products\b', 'selectedProducts'),
        (r'\bfilter_index\b', 'filterIndex'),
        (r'\bheader_index\b', 'headerIndex'),
        (r'\brow_index\b', 'rowIndex'),
        (r'\bcell_index\b', 'cellIndex'),
        (r'\bdist_index\b', 'distIndex'),
        (r'\bunit_cost\b', 'unitCost'),
        (r'\bnew_quantity\b', 'newQuantity'),
        (r'\bprice_form\b', 'priceForm'),
        (r'\bstatus_form\b', 'statusForm'),
        (r'\blogs_loading\b', 'logsLoading'),
        (r'\blogs_error\b', 'logsError'),
        (r'\boperation_type\b', 'operationType'),
        (r'\bhistory_data\b', 'historyData'),
        (r'\bset_current_page\b', 'setCurrentPage'),
        (r'\bnetwork_config\b', 'networkConfig'),
        (r'\bform_data\b', 'formData'),
        (r'\bmaterial_cost\b', 'materialCost'),
        (r'\bexpanded_materials\b', 'expandedMaterials'),
        (r'\bis_loading\b', 'isLoading'),
    ]
    
    for pattern, replacement in variable_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes += 1
    
    return content, fixes

def fix_property_access(content, file_path):
    """修复属性访问错误"""
    fixes = 0
    
    # 属性名修复
    property_fixes = [
        (r'\.cost_adjustment\b', '.costAdjustment'),
        (r'\.customer_address\b', '.customerAddress'),
        (r'\.quantity_needed_per_sku\b', '.quantityNeededPerSku'),
        (r'\.is_sufficient\b', '.isSufficient'),
        (r'\.unit_cost\b', '.unitCost'),
        (r'\.can_view_trace\b', '.canViewTrace'),
    ]
    
    for pattern, replacement in property_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes += 1
    
    return content, fixes

def fix_specific_issues(content, file_path):
    """修复特定文件的问题"""
    fixes = 0
    
    # ProductPriceDistributionChart.tsx 的价格类型问题
    if 'ProductPriceDistributionChart.tsx' in file_path:
        # 修复price_type比较问题
        content = re.sub(r'price_type === ["\']unit_price["\']', 'priceType === "unit_price"', content)
        content = re.sub(r'price_type === ["\']total_price["\']', 'priceType === "total_price"', content)
        fixes += 1
    
    # SkuDestroyForm.tsx 的特定问题
    if 'SkuDestroyForm.tsx' in file_path:
        # 修复returnToMaterial问题
        content = re.sub(r'"returnToMaterial"', '"return_to_material"', content)
        content = re.sub(r'field === "returnToMaterial"', 'field === "return_to_material"', content)
        fixes += 1
    
    # 修复未使用变量声明
    unused_vars = [
        r'const\s+(\w+)\s*=\s*[^;]+;\s*//\s*TS6133',
        r'const\s+{[^}]*\b(\w+)[^}]*}\s*=\s*[^;]+;\s*//.*TS6133'
    ]
    
    for pattern in unused_vars:
        if re.search(pattern, content):
            # 简单删除未使用的变量声明
            content = re.sub(pattern, '', content)
            fixes += 1
    
    return content, fixes

def process_file(file_path):
    """处理单个文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        total_fixes = 0
        
        # 应用各种修复
        content, fixes1 = fix_missing_imports(content, file_path)
        total_fixes += fixes1
        
        content, fixes2 = fix_jsx_props(content, file_path)
        total_fixes += fixes2
        
        content, fixes3 = fix_variable_naming(content, file_path)
        total_fixes += fixes3
        
        content, fixes4 = fix_property_access(content, file_path)
        total_fixes += fixes4
        
        content, fixes5 = fix_specific_issues(content, file_path)
        total_fixes += fixes5
        
        # 如果有修改，写回文件
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'✅ 已修复: {file_path}')
            return total_fixes
        
        return 0
        
    except Exception as e:
        print(f'❌ 处理文件失败 {file_path}: {e}')
        return 0

def main():
    print('🔧 最终错误修复...')
    print('📊 当前错误数量: 149个')
    print('🎯 目标: 减少到0个')
    
    # 创建备份
    backup_dir = create_backup()
    
    # 统计信息
    stats = {
        'total_fixes': 0,
        'files_processed': 0,
        'import_fixes': 0,
        'jsx_fixes': 0,
        'variable_fixes': 0,
        'property_fixes': 0,
        'specific_fixes': 0
    }
    
    # 处理所有TypeScript文件
    src_dir = Path('src')
    if src_dir.exists():
        for file_path in src_dir.rglob('*.tsx'):
            if file_path.is_file():
                fixes = process_file(str(file_path))
                if fixes > 0:
                    stats['files_processed'] += 1
                    stats['total_fixes'] += fixes
        
        for file_path in src_dir.rglob('*.ts'):
            if file_path.is_file() and not str(file_path).endswith('.d.ts'):
                fixes = process_file(str(file_path))
                if fixes > 0:
                    stats['files_processed'] += 1
                    stats['total_fixes'] += fixes
    
    # 生成报告
    report = {
        'timestamp': datetime.now().isoformat(),
        'backup_dir': backup_dir,
        'stats': stats,
        'target': '将149个错误减少到0个'
    }
    
    with open('final_error_fix_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f'\n📊 最终修复完成统计:')
    print(f'   总修复数: {stats["total_fixes"]}')
    print(f'   处理文件数: {stats["files_processed"]}')
    
    print(f'\n📄 详细报告已保存到: final_error_fix_report.json')
    
    print('\n✅ 最终修复完成！')
    print('📊 请运行 \'npm run build\' 检查错误数量变化')
    print('🎯 目标：将149个错误减少到0个')

if __name__ == '__main__':
    main()