#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级错误修复脚本 - 修复剩余的532个TypeScript错误
目标：将错误数量降到100个以下
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
    backup_dir = f'backups/advanced_fix_{timestamp}'
    
    if os.path.exists('src'):
        os.makedirs(backup_dir, exist_ok=True)
        shutil.copytree('src', f'{backup_dir}/src')
        print(f'✅ 已创建备份: {backup_dir}')
        return backup_dir
    return None

def fix_device_detection_props(content, file_path):
    """修复设备检测属性"""
    fixes = 0
    
    # 修复is_mobile为isMobile
    if re.search(r'\bis_mobile\b', content):
        content = re.sub(r'\bis_mobile\b', 'isMobile', content)
        fixes += 1
    
    return content, fixes

def fix_jsx_attributes(content, file_path):
    """修复JSX属性"""
    fixes = 0
    
    # 修复HTML属性
    jsx_fixes = [
        (r'auto_complete=', 'autoComplete='),
        (r'onSubmit=', 'on_submit='),  # 组件props应该是蛇形
        (r'onCancel=', 'on_cancel='),  # 组件props应该是蛇形
    ]
    
    for pattern, replacement in jsx_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes += 1
    
    return content, fixes

def fix_property_naming_issues(content, file_path):
    """修复属性命名问题"""
    fixes = 0
    
    # 修复属性访问错误
    property_fixes = [
        # FormState相关
        (r'\.costAdjustment\b', '.cost_adjustment'),
        (r'\.customerAddress\b', '.customer_address'),
        
        # SellData相关
        (r'customerAddress(?=\s*:)', 'customer_address'),
        
        # 其他属性
        (r'"costAdjustment"', '"cost_adjustment"'),
        (r'"customerAddress"', '"customer_address"'),
        (r'"returnToMaterial"', '"return_to_material"'),
    ]
    
    for pattern, replacement in property_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes += 1
    
    return content, fixes

def fix_variable_declarations(content, file_path):
    """修复变量声明问题"""
    fixes = 0
    
    # 修复未定义变量
    variable_fixes = [
        (r'\bpieceCountValue\b', 'piece_count_value'),
        (r'\bset_show_filters\b', 'setShowFilters'),
        (r'\bshow_filters\b', 'showFilters'),
    ]
    
    for pattern, replacement in variable_fixes:
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            fixes += 1
    
    return content, fixes

def fix_jest_methods(content, file_path):
    """修复Jest测试方法"""
    fixes = 0
    
    if '__tests__' in file_path:
        # Jest方法修复
        jest_fixes = [
            (r'render_hook', 'renderHook'),
            (r'define_property', 'defineProperty'),
            (r'clear_all_mocks', 'clearAllMocks'),
            (r'mock_return_value', 'mockReturnValue'),
            (r'mock_resolved_value', 'mockResolvedValue'),
            (r'mock_rejected_value', 'mockRejectedValue'),
            (r'to_be_null', 'toBeNull'),
            (r'to_be\b', 'toBe'),
            (r'to_equal', 'toEqual'),
            (r'to_have_been_called_with', 'toHaveBeenCalledWith'),
            (r'to_have_been_called', 'toHaveBeenCalled'),
        ]
        
        for pattern, replacement in jest_fixes:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                fixes += 1
    
    return content, fixes

def fix_unused_variables(content, file_path):
    """修复未使用变量"""
    fixes = 0
    
    # 删除未使用的变量声明
    unused_patterns = [
        r'const\s+base_color\s*=\s*[^;]+;\s*',
        r'const\s+total\s*=\s*[^;]+;\s*',
        r'const\s+Label\s*=\s*[^;]+;\s*',
        r'const\s+loading\s*=\s*[^;]+;\s*',
        r'const\s+showFilters\s*=\s*[^;]+;\s*',
        r'const\s+setShowFilters\s*=\s*[^;]+;\s*',
    ]
    
    for pattern in unused_patterns:
        if re.search(pattern, content):
            content = re.sub(pattern, '', content)
            fixes += 1
    
    return content, fixes

def fix_component_props(content, file_path):
    """修复组件属性传递"""
    fixes = 0
    
    # 修复组件属性名
    if 'SkuSellForm' in content or 'SkuDestroyForm' in content or 'SkuAdjustForm' in content:
        # 组件使用蛇形命名
        content = re.sub(r'onSubmit=', 'on_submit=', content)
        content = re.sub(r'onCancel=', 'on_cancel=', content)
        fixes += 1
    
    return content, fixes

def fix_type_issues(content, file_path):
    """修复类型问题"""
    fixes = 0
    
    # 修复参数类型
    if re.search(r'Parameter .* implicitly has an .any. type', content):
        # 添加类型注解
        content = re.sub(r'\(data\)\s*=>', '(data: any) =>', content)
        content = re.sub(r'\(prev\)\s*=>', '(prev: any) =>', content)
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
        content, fixes1 = fix_device_detection_props(content, file_path)
        total_fixes += fixes1
        
        content, fixes2 = fix_jsx_attributes(content, file_path)
        total_fixes += fixes2
        
        content, fixes3 = fix_property_naming_issues(content, file_path)
        total_fixes += fixes3
        
        content, fixes4 = fix_variable_declarations(content, file_path)
        total_fixes += fixes4
        
        content, fixes5 = fix_jest_methods(content, file_path)
        total_fixes += fixes5
        
        content, fixes6 = fix_unused_variables(content, file_path)
        total_fixes += fixes6
        
        content, fixes7 = fix_component_props(content, file_path)
        total_fixes += fixes7
        
        content, fixes8 = fix_type_issues(content, file_path)
        total_fixes += fixes8
        
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
    print('🔧 高级错误修复...')
    print('📊 当前错误数量: 532个')
    print('🎯 目标: 减少到100个以下')
    
    # 创建备份
    backup_dir = create_backup()
    
    # 统计信息
    stats = {
        'total_fixes': 0,
        'files_processed': 0,
        'device_detection_fixes': 0,
        'jsx_fixes': 0,
        'property_fixes': 0,
        'variable_fixes': 0,
        'jest_fixes': 0,
        'unused_var_fixes': 0,
        'component_prop_fixes': 0,
        'type_fixes': 0
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
        'target': '将532个错误减少到100个以下'
    }
    
    with open('advanced_error_fix_report.json', 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f'\n📊 高级修复完成统计:')
    print(f'   总修复数: {stats["total_fixes"]}')
    print(f'   处理文件数: {stats["files_processed"]}')
    
    print(f'\n📄 详细报告已保存到: advanced_error_fix_report.json')
    
    print('\n✅ 高级修复完成！')
    print('📊 请运行 \'npm run build\' 检查错误数量变化')
    print('🎯 目标：将532个错误减少到100个以下')

if __name__ == '__main__':
    main()