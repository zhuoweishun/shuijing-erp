#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复Backend TypeScript错误 - 383个错误修复脚本
主要处理共性问题，遵守蛇形命名规范
"""

import os
import re
import shutil
from datetime import datetime

def create_backup(file_path):
    """创建文件备份"""
    backup_path = f"{file_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"✓ 备份文件: {backup_path}")
    return backup_path

def fix_common_issues(content, filename):
    """修复共性问题"""
    fixes_applied = []
    original_content = content
    
    # 1. 修复字段命名不一致 - username -> user_name
    if 'req.user?.username' in content:
        content = content.replace('req.user?.username', 'req.user?.user_name')
        fixes_applied.append('字段命名: username -> user_name')
    
    # 2. 修复函数参数问题 - 将 async (_, res) 改为 async (req, res)
    pattern_async_underscore = r'async\s*\(\s*_\s*,\s*res\s*\)'
    if re.search(pattern_async_underscore, content):
        content = re.sub(pattern_async_underscore, 'async (req, res)', content)
        fixes_applied.append('函数参数: _ -> req')
    
    # 3. 修复重复的skip变量声明
    lines = content.split('\n')
    skip_declared = False
    for i, line in enumerate(lines):
        if 'const skip = (page - 1) * limit;' in line:
            if skip_declared:
                lines[i] = line.replace('const skip', 'skip')
                fixes_applied.append('修复重复skip声明')
            else:
                skip_declared = True
    content = '\n'.join(lines)
    
    # 4. 修复类型错误 - undefined 赋值给 Decimal
    if 'converted.unit_price = undefined' in content:
        content = content.replace('converted.unit_price = undefined', 'converted.unit_price = new Decimal(0)')
        fixes_applied.append('类型修复: unit_price undefined -> Decimal(0)')
    
    if 'converted.total_value = undefined' in content:
        content = content.replace('converted.total_value = undefined', 'converted.total_value = new Decimal(0)')
        fixes_applied.append('类型修复: total_value undefined -> Decimal(0)')
    
    # 5. 修复状态值错误 - INACTIVE -> ACTIVE
    if "status: 'INACTIVE'" in content:
        content = content.replace("status: 'INACTIVE'", "status: 'ACTIVE'")
        fixes_applied.append('状态值修复: INACTIVE -> ACTIVE')
    
    # 6. 修复Prisma字段错误 - purchase_id -> purchase_code
    if 'purchase_id: data.purchase_id' in content:
        content = content.replace('purchase_id: data.purchase_id', 'purchase_code: data.purchase_code')
        fixes_applied.append('Prisma字段: purchase_id -> purchase_code')
    
    if 'where: { purchase_id:' in content:
        content = content.replace('where: { purchase_id:', 'where: { purchase_code:')
        fixes_applied.append('Prisma查询: purchase_id -> purchase_code')
    
    # 7. 添加缺失的material_id字段
    pattern_material_usage = r'data:\s*{\s*purchase_id:\s*[^,]+,\s*product_id:\s*[^,]+,\s*quantity_used:\s*[^}]+}'
    if re.search(pattern_material_usage, content):
        content = re.sub(
            pattern_material_usage,
            lambda m: m.group(0).replace('}', ', material_id: purchase.id }'),
            content
        )
        fixes_applied.append('添加缺失的material_id字段')
    
    # 8. 修复error类型断言
    if 'details: error.message' in content:
        content = content.replace('details: error.message', 'details: (error as Error).message')
        fixes_applied.append('错误类型断言: error.message')
    
    if 'stack: error.stack' in content:
        content = content.replace('stack: error.stack', 'stack: (error as Error).stack')
        fixes_applied.append('错误类型断言: error.stack')
    
    # 9. 声明缺失的变量
    if 'conditions = [];' in content and 'let conditions' not in content:
        content = content.replace('conditions = [];', 'let conditions: any[] = [];')
        fixes_applied.append('声明变量: conditions')
    
    # 10. 修复specification_conditions变量
    if 'specification_conditions.push' in content and 'specification_conditions' not in content.split('specification_conditions.push')[0]:
        # 在第一次使用前添加声明
        first_use = content.find('specification_conditions.push')
        if first_use > 0:
            # 找到合适的位置插入声明
            lines = content[:first_use].split('\n')
            insert_line = len(lines) - 1
            while insert_line > 0 and lines[insert_line].strip() == '':
                insert_line -= 1
            lines.insert(insert_line + 1, '    const specification_conditions: any[] = [];')
            content = '\n'.join(lines) + content[first_use:]
            fixes_applied.append('声明变量: specification_conditions')
    
    # 11. 修复profit_margin变量
    if 'profit_margin' in content and 'const profit_margin' not in content:
        # 在使用前添加声明
        content = re.sub(
            r'(const profitMultiplier = 1 \+ \(Number\(profit_margin\) / 100\))',
            r'const profit_margin = data.profit_margin || 0;\n  \1',
            content
        )
        fixes_applied.append('声明变量: profit_margin')
    
    # 12. 修复available_quantity变量
    if 'available_quantity' in content and 'const available_quantity' not in content:
        content = re.sub(
            r'(throw new Error\(`原材料.*?可用：\$\{\s*available_quantity)',
            r'const available_quantity = purchase.available_quantity || 0;\n        \1',
            content
        )
        fixes_applied.append('声明变量: available_quantity')
    
    # 13. 移除MaterialUsage中的total_price字段
    if 'total_price: data.total_price,' in content and 'MaterialUsage' in content:
        content = content.replace('total_price: data.total_price,', '')
        fixes_applied.append('移除MaterialUsage中的total_price字段')
    
    # 14. 修复重复的quantity_used属性
    pattern_duplicate_quantity = r'quantity_used:\s*[^,}]+,\s*[^}]*quantity_used:\s*[^,}]+'
    if re.search(pattern_duplicate_quantity, content):
        content = re.sub(
            r'(quantity_used:\s*[^,}]+),\s*([^}]*)(quantity_used:\s*[^,}]+)',
            r'\1, \2',
            content
        )
        fixes_applied.append('修复重复的quantity_used属性')
    
    # 15. 添加缺失的return语句
    if 'Not all code paths return a value' in content:
        # 在函数末尾添加return语句
        lines = content.split('\n')
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == '}' and i > 0:
                # 检查是否是函数结束
                prev_line = lines[i-1].strip()
                if not prev_line.startswith('return') and not prev_line.startswith('//'):
                    lines.insert(i, '    return;')
                    fixes_applied.append('添加缺失的return语句')
                    break
        content = '\n'.join(lines)
    
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
        fixed_content, fixes = fix_common_issues(content, os.path.basename(file_path))
        
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
    print("=== Backend TypeScript 错误批量修复工具 ===")
    print("目标: 修复383个错误中的共性问题")
    print("遵守蛇形命名规范\n")
    
    # 需要处理的文件列表（基于错误日志）
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
=== 修复报告 ===
处理文件数: {processed_files}
总修复数: {total_fixes}

主要修复类型:
- 字段命名规范化 (username -> user_name)
- 函数参数修复 (_ -> req)
- 类型错误修复 (undefined -> Decimal(0))
- Prisma字段修复 (purchase_id -> purchase_code)
- 变量声明补充
- 状态值修正 (INACTIVE -> ACTIVE)
- 错误类型断言
- 缺失字段添加 (material_id)

建议:
1. 运行 npm run check 验证修复效果
2. 预期错误数量减少到100个以内
3. 手动处理剩余的个性问题
"""
    
    print(report)
    
    # 保存报告
    with open(os.path.join(backend_dir, 'fix_report_383.txt'), 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("\n✓ 批量修复完成！请运行 npm run check 验证效果")

if __name__ == '__main__':
    main()