#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量修复TypeScript错误脚本 - 针对391个错误的共性问题
主要修复：
1. 函数参数 async (_, res) => 改为 async (req, res) =>
2. 变量命名不一致问题
3. 未声明变量问题
4. 函数体外的return语句
5. 类型问题
"""

import os
import re
import shutil
from datetime import datetime

def backup_files(files):
    """备份文件"""
    backup_dir = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(backup_dir, exist_ok=True)
    
    for file_path in files:
        if os.path.exists(file_path):
            backup_path = os.path.join(backup_dir, os.path.basename(file_path))
            shutil.copy2(file_path, backup_path)
            print(f"备份文件: {file_path} -> {backup_path}")
    
    return backup_dir

def fix_function_parameters(content):
    """修复函数参数问题：async (_, res) => 改为 async (req, res) =>"""
    fixes = 0
    
    # 修复 async (_, res) => 为 async (req, res) =>
    pattern = r'async\s*\(\s*_\s*,\s*res\s*\)\s*=>'
    replacement = 'async (req, res) =>'
    new_content, count = re.subn(pattern, replacement, content)
    fixes += count
    
    return new_content, fixes

def fix_variable_naming(content):
    """修复变量命名不一致问题"""
    fixes = 0
    
    # 变量名映射：驼峰 -> 蛇形
    variable_mappings = {
        'purchaseCode': 'purchase_code',
        'pricePerBead': 'price_per_bead',
        'pricePerPiece': 'price_per_piece',
        'unitPrice': 'unit_price',
        'supplierId': 'supplier_id',
        'userName': 'user_name'
    }
    
    new_content = content
    for camel_case, snake_case in variable_mappings.items():
        # 替换变量声明
        pattern = rf'\b{camel_case}\b'
        count = len(re.findall(pattern, new_content))
        if count > 0:
            new_content = re.sub(pattern, snake_case, new_content)
            fixes += count
    
    return new_content, fixes

def fix_undeclared_variables(content):
    """修复未声明变量问题"""
    fixes = 0
    new_content = content
    
    # 在函数开始处添加变量声明
    # 查找需要声明 conditions 的位置
    if 'conditions = [];' in content and 'let conditions' not in content:
        # 在函数开始处添加声明
        pattern = r'(async \(req, res\) => {[^}]*?)(\s+)(conditions = \[\];)'
        replacement = r'\1\2let conditions: any[] = [];\2// \3'
        new_content, count = re.subn(pattern, replacement, new_content, flags=re.DOTALL)
        fixes += count
    
    # 声明 specification_conditions
    if 'specification_conditions.push' in content and 'let specification_conditions' not in content:
        pattern = r'(async \(req, res\) => {[^}]*?)(\s+)(specification_conditions\.push)'
        replacement = r'\1\2let specification_conditions: any[] = [];\2\3'
        new_content, count = re.subn(pattern, replacement, new_content, flags=re.DOTALL)
        fixes += count
    
    return new_content, fixes

def fix_return_statements(content):
    """修复函数体外的return语句"""
    fixes = 0
    
    # 查找并移除函数体外的return语句
    lines = content.split('\n')
    new_lines = []
    in_function = False
    brace_count = 0
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # 检测函数开始
        if 'async (' in line and '=>' in line:
            in_function = True
            brace_count = 0
        
        # 计算大括号
        brace_count += line.count('{')
        brace_count -= line.count('}')
        
        # 如果在函数外且是return语句，则注释掉
        if not in_function and stripped.startswith('return res.status('):
            new_lines.append(f'  // {line}  // 移除函数体外的return语句')
            fixes += 1
        else:
            new_lines.append(line)
        
        # 函数结束
        if in_function and brace_count == 0 and '}' in line:
            in_function = False
    
    return '\n'.join(new_lines), fixes

def fix_type_issues(content):
    """修复类型问题"""
    fixes = 0
    new_content = content
    
    # 修复 req.user?.role || "EMPLOYEE" !== 'BOSS' 逻辑错误
    pattern = r'req\.user\?\.role \|\| "EMPLOYEE" !== \'BOSS\''
    replacement = '(req.user?.role || "EMPLOYEE") !== \'BOSS\''
    new_content, count = re.subn(pattern, replacement, new_content)
    fixes += count
    
    # 修复 null 赋值给 string | undefined 类型
    pattern = r'(let \w+: string \| undefined = [^;]+)\.supplier_id'
    replacement = r'\1.supplier_id || undefined'
    new_content, count = re.subn(pattern, replacement, new_content)
    fixes += count
    
    return new_content, fixes

def fix_missing_returns(content):
    """修复缺少返回值的函数"""
    fixes = 0
    new_content = content
    
    # 在函数末尾添加默认返回
    pattern = r'(router\.[a-z]+\([^}]+asyncHandler\(async \(req, res\) => {[^}]+)(}\)\)?)'
    
    def add_return(match):
        function_body = match.group(1)
        ending = match.group(2)
        
        # 如果函数体没有return语句，添加一个
        if 'return ' not in function_body:
            return function_body + '\n  return res.status(200).json({ success: true });\n' + ending
        return match.group(0)
    
    new_content, count = re.subn(pattern, add_return, new_content, flags=re.DOTALL)
    fixes += count
    
    return new_content, fixes

def process_file(file_path):
    """处理单个文件"""
    if not os.path.exists(file_path):
        print(f"文件不存在: {file_path}")
        return 0
    
    print(f"\n处理文件: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    total_fixes = 0
    
    # 应用各种修复
    content, fixes = fix_function_parameters(content)
    total_fixes += fixes
    print(f"  修复函数参数: {fixes}")
    
    content, fixes = fix_variable_naming(content)
    total_fixes += fixes
    print(f"  修复变量命名: {fixes}")
    
    content, fixes = fix_undeclared_variables(content)
    total_fixes += fixes
    print(f"  修复未声明变量: {fixes}")
    
    content, fixes = fix_return_statements(content)
    total_fixes += fixes
    print(f"  修复return语句: {fixes}")
    
    content, fixes = fix_type_issues(content)
    total_fixes += fixes
    print(f"  修复类型问题: {fixes}")
    
    content, fixes = fix_missing_returns(content)
    total_fixes += fixes
    print(f"  修复缺少返回值: {fixes}")
    
    # 写入修复后的内容
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  总计修复: {total_fixes} 个问题")
    else:
        print(f"  无需修复")
    
    return total_fixes

def main():
    """主函数"""
    print("开始批量修复TypeScript错误...")
    
    # 需要处理的文件
    files_to_fix = [
        'backend/src/routes/purchases.ts',
        'backend/src/routes/skus.ts',
        'backend/src/routes/products.ts',
        'backend/src/routes/financial.ts',
        'backend/src/routes/suppliers.ts',
        'backend/src/routes/users.ts'
    ]
    
    # 备份文件
    backup_dir = backup_files(files_to_fix)
    print(f"\n文件已备份到: {backup_dir}")
    
    # 处理每个文件
    total_fixes = 0
    for file_path in files_to_fix:
        fixes = process_file(file_path)
        total_fixes += fixes
    
    # 生成报告
    report = f"""
批量修复报告
=============
修复时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
备份目录: {backup_dir}
处理文件数: {len(files_to_fix)}
总修复数: {total_fixes}

修复类型:
- 函数参数问题 (async (_, res) => 改为 async (req, res) =>)
- 变量命名不一致 (驼峰改蛇形)
- 未声明变量问题
- 函数体外return语句
- 类型问题
- 缺少返回值

建议:
1. 运行 npm run check 验证修复效果
2. 如有问题，可从备份目录恢复文件
3. 预期错误数量应大幅减少
"""
    
    with open('fix_report_391_v2.txt', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(report)
    print(f"\n修复完成！总计修复 {total_fixes} 个问题")
    print("请运行 'npm run check' 验证修复效果")

if __name__ == '__main__':
    main()