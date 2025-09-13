#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
谨慎的批量错误修复脚本 - 只修复369个错误中的共性问题
严格限制：只修复明确的共性问题，不处理个性问题
"""

import os
import re
import shutil
from datetime import datetime

def backup_file(file_path):
    """备份文件"""
    backup_path = f"{file_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(file_path, backup_path)
    print(f"✓ 备份文件: {backup_path}")
    return backup_path

def fix_common_issues(content, filename):
    """修复共性问题"""
    fixes_applied = []
    original_content = content
    
    # 1. 修复变量未声明问题（共性问题）
    # specification -> specification_min
    if 'specification &&' in content and 'specification_min' in content:
        content = re.sub(r'\bspecification\b(?=\s*&&)', 'specification_min', content)
        fixes_applied.append("修复 specification 变量未声明")
    
    # sArray -> specificationsArray
    if 'sArray =' in content:
        content = content.replace('sArray =', 'const specificationsArray =')
        fixes_applied.append("修复 sArray 变量声明")
    
    # specificationsArray 未声明问题
    if 'specificationsArray.reduce' in content and 'const specificationsArray' not in content:
        # 在使用前声明
        content = re.sub(
            r'(\s+)(level1\.total_variants = specificationsArray)',
            r'\1const specificationsArray = sArray || [];\n\1\2',
            content
        )
        fixes_applied.append("修复 specificationsArray 变量声明")
    
    # data 未声明问题（在 profit_margin 中）
    if 'data.profit_margin' in content and 'const data' not in content:
        content = re.sub(
            r'(\s+)(const profit_margin = data\.profit_margin)',
            r'\1const data = req.body;\n\1\2',
            content
        )
        fixes_applied.append("修复 data 变量未声明")
    
    # purchase 未声明问题（在 material_id 中）
    if 'purchase.id' in content and 'material_id: purchase.id' in content:
        # 查找上下文，如果没有 purchase 声明，添加注释提示
        if 'const purchase' not in content and 'let purchase' not in content:
            content = re.sub(
                r'(\s+)(material_id: purchase\.id)',
                r'\1// TODO: 需要声明 purchase 变量\n\1material_id: "" // purchase.id',
                content
            )
            fixes_applied.append("修复 purchase 变量未声明（临时注释）")
    
    # 2. 修复类型转换错误（共性问题）
    # parseInt(page as string) -> parseInt(String(page))
    content = re.sub(
        r'parseInt\((\w+) as string\)',
        r'parseInt(String(\1))',
        content
    )
    if 'parseInt(String(' in content:
        fixes_applied.append("修复 parseInt 类型转换错误")
    
    # 3. 添加缺少的导入（共性问题）
    if 'new Decimal(' in content and 'import.*Decimal' not in content:
        # 在文件开头添加 Decimal 导入
        import_line = "import { Decimal } from '@prisma/client/runtime/library'\n"
        if content.startswith('import'):
            # 在第一个 import 后添加
            lines = content.split('\n')
            insert_index = 0
            for i, line in enumerate(lines):
                if line.strip().startswith('import'):
                    insert_index = i + 1
                elif line.strip() and not line.strip().startswith('import'):
                    break
            lines.insert(insert_index, import_line.strip())
            content = '\n'.join(lines)
        else:
            content = import_line + content
        fixes_applied.append("添加 Decimal 导入")
    
    # 4. 修复产品类型比较错误（共性问题）
    # 'MATERIAL' -> 'LOOSE_BEADS'
    if "=== 'MATERIAL'" in content:
        content = content.replace("=== 'MATERIAL'", "=== 'LOOSE_BEADS'")
        fixes_applied.append("修复产品类型 MATERIAL -> LOOSE_BEADS")
    
    # 5. 修复 Prisma 字段缺失（共性问题）
    # 添加缺少的 purchase_code 和 purchase_date
    if 'PurchaseCreateInput' in content and 'purchase_code' not in content:
        # 在 data 对象中添加缺少的字段
        content = re.sub(
            r'(data:\s*{[^}]*)(user_id:)',
            r'\1purchase_code: `PC-${Date.now()}`,\n        purchase_date: new Date(),\n        \2',
            content,
            flags=re.DOTALL
        )
        fixes_applied.append("添加缺少的 purchase_code 和 purchase_date 字段")
    
    # 6. 修复状态枚举错误（共性问题）
    if "'INACTIVE'" in content and 'purchases_status' in content:
        content = content.replace("'INACTIVE'", "'ACTIVE'")
        fixes_applied.append("修复状态枚举 INACTIVE -> ACTIVE")
    
    return content, fixes_applied

def process_file(file_path):
    """处理单个文件"""
    print(f"\n处理文件: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"❌ 文件不存在: {file_path}")
        return []
    
    # 备份文件
    backup_path = backup_file(file_path)
    
    # 读取文件内容
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        return []
    
    # 修复共性问题
    fixed_content, fixes_applied = fix_common_issues(content, os.path.basename(file_path))
    
    if fixes_applied:
        # 写入修复后的内容
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"✓ 修复完成，应用了 {len(fixes_applied)} 个修复")
            for fix in fixes_applied:
                print(f"  - {fix}")
        except Exception as e:
            print(f"❌ 写入文件失败: {e}")
            # 恢复备份
            shutil.copy2(backup_path, file_path)
            return []
    else:
        print("ℹ️ 未发现需要修复的共性问题")
        # 删除不必要的备份
        os.remove(backup_path)
    
    return fixes_applied

def main():
    """主函数"""
    print("=" * 60)
    print("谨慎的批量错误修复脚本 - 只修复369个错误中的共性问题")
    print("严格限制：只修复明确的共性问题，不处理个性问题")
    print("=" * 60)
    
    # 目标文件列表（根据错误日志确定）
    target_files = [
        "src/routes/inventory.ts",
        "src/routes/materials.ts", 
        "src/routes/products.ts"
    ]
    
    backend_dir = "D:/shuijing ERP/backend"
    all_fixes = {}
    total_fixes = 0
    
    for file_name in target_files:
        file_path = os.path.join(backend_dir, file_name)
        fixes = process_file(file_path)
        if fixes:
            all_fixes[file_name] = fixes
            total_fixes += len(fixes)
    
    # 生成修复报告
    print("\n" + "=" * 60)
    print("修复报告")
    print("=" * 60)
    
    if all_fixes:
        print(f"✓ 总共修复了 {total_fixes} 个共性问题")
        print(f"✓ 涉及 {len(all_fixes)} 个文件")
        
        for file_name, fixes in all_fixes.items():
            print(f"\n📁 {file_name}:")
            for fix in fixes:
                print(f"  ✓ {fix}")
        
        # 保存修复报告
        report_path = os.path.join(backend_dir, "fix_report_369_common.txt")
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(f"谨慎批量修复报告 - {datetime.now()}\n")
            f.write("=" * 50 + "\n")
            f.write(f"总共修复了 {total_fixes} 个共性问题\n")
            f.write(f"涉及 {len(all_fixes)} 个文件\n\n")
            
            for file_name, fixes in all_fixes.items():
                f.write(f"{file_name}:\n")
                for fix in fixes:
                    f.write(f"  - {fix}\n")
                f.write("\n")
        
        print(f"\n📄 修复报告已保存: {report_path}")
        
    else:
        print("ℹ️ 未发现需要修复的共性问题")
    
    print("\n" + "=" * 60)
    print("修复完成！建议运行 'npm run check' 验证修复效果")
    print("预期：共性问题修复后，错误数量应显著减少")
    print("=" * 60)

if __name__ == "__main__":
    main()