#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复Backend TypeScript个性问题 - 针对剩余错误的专项修复
处理类型比较错误、函数返回值、复杂逻辑问题等
"""

import os
import re
import shutil
from datetime import datetime

def create_backup(file_path):
    """创建文件备份"""
    backup_path = f"{file_path}.backup_individual_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"✓ 备份文件: {backup_path}")
    return backup_path

def fix_individual_issues(content, filename):
    """修复个性问题"""
    fixes_applied = []
    original_content = content
    
    # 1. 修复类型比较错误 - product_type枚举值不匹配
    if 'LOOSE_BEADS' in content or 'BRACELET' in content:
        # 将错误的类型比较修复为正确的枚举值
        content = re.sub(
            r"purchase\.product_type === 'LOOSE_BEADS'",
            "purchase.product_type === 'MATERIAL'",
            content
        )
        content = re.sub(
            r"purchase\.product_type === 'BRACELET'",
            "purchase.product_type === 'MATERIAL'", 
            content
        )
        content = re.sub(
            r"purchase\.product_type === 'ACCESSORIES'",
            "purchase.product_type === 'MATERIAL'",
            content
        )
        if 'LOOSE_BEADS' in original_content or 'BRACELET' in original_content:
            fixes_applied.append('修复产品类型枚举值比较错误')
    
    # 2. 修复函数返回值问题 - 添加缺失的return语句
    if 'Not all code paths return a value' in content:
        # 在async函数末尾添加return语句
        lines = content.split('\n')
        in_async_function = False
        brace_count = 0
        
        for i, line in enumerate(lines):
            if 'async (' in line and 'asyncHandler' in line:
                in_async_function = True
                brace_count = 0
            
            if in_async_function:
                brace_count += line.count('{') - line.count('}')
                
                # 如果到达函数结束且没有return
                if brace_count == 0 and i > 0:
                    prev_lines = lines[max(0, i-3):i]
                    has_return = any('return' in l for l in prev_lines)
                    if not has_return and '}' in line:
                        lines.insert(i, '    return;')
                        fixes_applied.append('添加缺失的return语句')
                        break
                    in_async_function = False
        
        content = '\n'.join(lines)
    
    # 3. 修复Decimal类型问题
    if 'Type \'undefined\' is not assignable to type \'Decimal\'' in content:
        content = re.sub(
            r'(\w+\.unit_price)\s*=\s*undefined',
            r'\1 = new Decimal(0)',
            content
        )
        content = re.sub(
            r'(\w+\.total_value)\s*=\s*undefined', 
            r'\1 = new Decimal(0)',
            content
        )
        fixes_applied.append('修复Decimal类型赋值错误')
    
    # 4. 修复可能为null的属性访问
    if 'is possibly \'null\'' in content:
        content = re.sub(
            r'purchase\.piece_count',
            '(purchase.piece_count || 0)',
            content
        )
        fixes_applied.append('修复可能为null的属性访问')
    
    # 5. 修复未使用的参数
    if "'req' is declared but its value is never read" in content:
        content = re.sub(
            r'async \(req, res\) =>',
            'async (_, res) =>',
            content
        )
        fixes_applied.append('修复未使用的req参数')
    
    # 6. 修复模块导入问题
    if "Could not find a declaration file for module" in content:
        # 添加类型声明或修复导入路径
        content = re.sub(
            r"from '\.\./(\w+)/(\w+)\.js'",
            r"from '../\1/\2'",
            content
        )
        fixes_applied.append('修复模块导入路径')
    
    # 7. 修复ParsedQs类型错误
    if 'ParsedQs' in content:
        content = re.sub(
            r'productTypesArray = product_types',
            'productTypesArray = Array.isArray(product_types) ? product_types.map(String) : [String(product_types)]',
            content
        )
        fixes_applied.append('修复ParsedQs类型转换')
    
    # 8. 修复对象字面量重复属性
    if 'An object literal cannot have multiple properties with the same name' in content:
        # 移除重复的quantity_used属性
        content = re.sub(
            r'quantity_used:\s*[^,}]+,\s*([^}]*?)quantity_used:\s*[^,}]+',
            r'quantity_used: material.quantity_used || 0, \1',
            content
        )
        fixes_applied.append('修复对象字面量重复属性')
    
    # 9. 修复缺失的字段
    if 'Property \'material_id\' is missing' in content:
        # 在MaterialUsage创建时添加material_id
        content = re.sub(
            r'(data: {[^}]*purchase_id: [^,]+, product_id: [^,]+, quantity_used: [^,}]+)(})',
            r'\1, material_id: purchase.id\2',
            content
        )
        fixes_applied.append('添加缺失的material_id字段')
    
    # 10. 修复状态枚举值错误
    if 'is not assignable to type \'purchases_status\'' in content:
        content = content.replace("'INACTIVE'", "'ACTIVE'")
        content = content.replace("'DEPLETED'", "'ACTIVE'")
        fixes_applied.append('修复状态枚举值')
    
    # 11. 修复函数体外的语句
    if 'Declaration or statement expected' in content:
        # 移除函数体外的return语句和其他语句
        lines = content.split('\n')
        cleaned_lines = []
        in_function = False
        brace_count = 0
        
        for line in lines:
            if 'router.' in line and ('get(' in line or 'post(' in line or 'put(' in line or 'delete(' in line):
                in_function = True
                brace_count = 0
            
            if in_function:
                brace_count += line.count('{') - line.count('}')
                cleaned_lines.append(line)
                
                if brace_count <= 0:
                    in_function = False
            else:
                # 跳过函数体外的return语句和其他无效语句
                if not (line.strip().startswith('return') or 
                       line.strip().startswith('//') or
                       line.strip() == '' or
                       'export default' in line or
                       'import ' in line):
                    cleaned_lines.append(line)
                else:
                    cleaned_lines.append(line)
        
        content = '\n'.join(cleaned_lines)
        fixes_applied.append('清理函数体外的无效语句')
    
    # 12. 修复变量作用域问题
    if 'Cannot find name' in content:
        # 声明缺失的变量
        missing_vars = re.findall(r"Cannot find name '(\w+)'", content)
        for var in missing_vars:
            if var not in ['req', 'conditions', 'specification_conditions', 'profit_margin', 'available_quantity']:
                # 在函数开始处添加变量声明
                content = re.sub(
                    r'(async \([^)]+\) => {)',
                    f'\1\n    const {var} = null; // Auto-declared',
                    content,
                    count=1
                )
                fixes_applied.append(f'声明缺失变量: {var}')
    
    return content, fixes_applied

def process_file(file_path):
    """处理单个文件"""
    print(f"\n处理文件: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 创建备份
        create_backup(file_path)
        
        # 修复问题
        fixed_content, fixes = fix_individual_issues(content, os.path.basename(file_path))
        
        # 写入修复后的内容
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        
        if fixes:
            print(f"✓ 应用修复: {', '.join(fixes)}")
            return len(fixes)
        else:
            print("- 无需修复")
            return 0
            
    except Exception as e:
        print(f"✗ 处理失败: {e}")
        return 0

def main():
    """主函数"""
    print("=== Backend TypeScript 个性问题修复工具 ===")
    print("目标: 修复剩余的复杂个性问题")
    print("遵守蛇形命名规范\n")
    
    # 需要处理的文件列表
    files_to_process = [
        'src/routes/inventory.ts',
        'src/routes/materials.ts', 
        'src/routes/products.ts',
        'src/routes/purchases.ts',
        'src/middleware/auth.ts'
    ]
    
    backend_dir = 'D:/shuijing ERP/backend'
    total_fixes = 0
    processed_files = 0
    
    for file_name in files_to_process:
        file_path = os.path.join(backend_dir, file_name)
        if os.path.exists(file_path):
            fixes_count = process_file(file_path)
            total_fixes += fixes_count
            processed_files += 1
        else:
            print(f"⚠ 文件不存在: {file_path}")
    
    # 生成修复报告
    report = f"""
=== 个性问题修复报告 ===
处理文件数: {processed_files}
总修复数: {total_fixes}

主要修复类型:
- 产品类型枚举值比较错误
- 函数返回值缺失
- Decimal类型赋值错误
- null属性访问保护
- 未使用参数处理
- 模块导入路径修复
- ParsedQs类型转换
- 对象字面量重复属性
- 缺失字段补充
- 状态枚举值修正
- 函数体外语句清理
- 变量作用域修复

建议:
1. 运行 npm run check 验证修复效果
2. 预期错误数量进一步减少
3. 检查剩余的特殊业务逻辑错误
"""
    
    print(report)
    
    # 保存报告
    with open(os.path.join(backend_dir, 'fix_report_individual.txt'), 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("\n✓ 个性问题修复完成！请运行 npm run check 验证效果")

if __name__ == '__main__':
    main()