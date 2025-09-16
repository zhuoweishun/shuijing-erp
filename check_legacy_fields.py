#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查项目中遗留的product和material废弃字段
这些字段已被彻底抛弃，需要全部替换为purchase相关字段
"""

import os
import re
from pathlib import Path
from collections import defaultdict

# 要检查的废弃字段模式
LEGACY_PATTERNS = {
    'product_fields': [
        r'\bproduct_name\b',
        r'\bproduct_type\b', 
        r'\bproduct_types\b',
        r'\bproductName\b',
        r'\bproductType\b',
        r'\bproductTypes\b'
    ],
    'material_fields': [
        r'\bmaterial_name\b',
        r'\bmaterial_type\b',
        r'\bmaterial_types\b', 
        r'\bmaterialName\b',
        r'\bmaterialType\b',
        r'\bmaterialTypes\b'
    ]
}

# 要扫描的文件扩展名
FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json', '.sql', '.md']

# 排除的目录
EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', 'build', '.next', 
    'coverage', '.nyc_output', 'logs', 'tmp', 'temp'
}

def should_scan_file(file_path):
    """判断是否应该扫描该文件"""
    # 检查文件扩展名
    if not any(file_path.suffix == ext for ext in FILE_EXTENSIONS):
        return False
    
    # 检查是否在排除目录中
    for part in file_path.parts:
        if part in EXCLUDE_DIRS:
            return False
    
    return True

def scan_file_for_legacy_fields(file_path):
    """扫描单个文件中的废弃字段"""
    results = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            lines = content.split('\n')
            
            # 检查每种类型的废弃字段
            for category, patterns in LEGACY_PATTERNS.items():
                for pattern in patterns:
                    for line_num, line in enumerate(lines, 1):
                        matches = re.finditer(pattern, line)
                        for match in matches:
                            results.append({
                                'file': str(file_path),
                                'line': line_num,
                                'column': match.start() + 1,
                                'category': category,
                                'field': match.group(),
                                'context': line.strip(),
                                'suggested_replacement': get_replacement_suggestion(match.group())
                            })
    except Exception as e:
        print(f"❌ 扫描文件失败: {file_path} - {e}")
    
    return results

def get_replacement_suggestion(field):
    """获取字段的替换建议"""
    replacements = {
        'product_name': 'purchase_name',
        'product_type': 'purchase_type',
        'product_types': 'purchase_types',
        'productName': 'purchase_name',
        'productType': 'purchase_type', 
        'productTypes': 'purchase_types',
        'material_name': 'purchase_name',
        'material_type': 'purchase_type',
        'material_types': 'purchase_types',
        'materialName': 'purchase_name',
        'materialType': 'purchase_type',
        'materialTypes': 'purchase_types'
    }
    return replacements.get(field, f'purchase_{field.replace("product_", "").replace("material_", "")}')

def scan_project(project_root):
    """扫描整个项目"""
    project_path = Path(project_root)
    all_results = []
    file_count = 0
    
    print(f"🔍 开始扫描项目: {project_path}")
    print(f"📁 排除目录: {', '.join(EXCLUDE_DIRS)}")
    print(f"📄 扫描文件类型: {', '.join(FILE_EXTENSIONS)}")
    print("="*80)
    
    # 递归扫描所有文件
    for file_path in project_path.rglob('*'):
        if file_path.is_file() and should_scan_file(file_path):
            file_count += 1
            results = scan_file_for_legacy_fields(file_path)
            all_results.extend(results)
            
            if results:
                print(f"⚠️  发现废弃字段: {file_path.relative_to(project_path)} ({len(results)}个)")
    
    return all_results, file_count

def generate_report(results, file_count):
    """生成详细报告"""
    print("\n" + "="*80)
    print("📊 扫描结果统计")
    print("="*80)
    
    if not results:
        print("✅ 恭喜！没有发现任何废弃的product和material字段！")
        print(f"📄 总共扫描了 {file_count} 个文件")
        return
    
    # 按类别统计
    category_stats = defaultdict(int)
    field_stats = defaultdict(int)
    file_stats = defaultdict(int)
    
    for result in results:
        category_stats[result['category']] += 1
        field_stats[result['field']] += 1
        file_stats[result['file']] += 1
    
    print(f"❌ 发现 {len(results)} 个废弃字段，分布在 {len(file_stats)} 个文件中")
    print(f"📄 总共扫描了 {file_count} 个文件")
    
    print("\n📈 按类别统计:")
    for category, count in category_stats.items():
        print(f"  {category}: {count} 个")
    
    print("\n🏷️  按字段统计:")
    for field, count in sorted(field_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"  {field}: {count} 次")
    
    print("\n📁 按文件统计 (前20个):")
    for file_path, count in sorted(file_stats.items(), key=lambda x: x[1], reverse=True)[:20]:
        rel_path = Path(file_path).relative_to(Path.cwd()) if Path(file_path).is_absolute() else file_path
        print(f"  {rel_path}: {count} 个")
    
    print("\n" + "="*80)
    print("📋 详细清理清单")
    print("="*80)
    
    # 按文件分组显示详细结果
    results_by_file = defaultdict(list)
    for result in results:
        results_by_file[result['file']].append(result)
    
    for file_path, file_results in sorted(results_by_file.items()):
        rel_path = Path(file_path).relative_to(Path.cwd()) if Path(file_path).is_absolute() else file_path
        print(f"\n📄 {rel_path} ({len(file_results)}个废弃字段):")
        
        for result in sorted(file_results, key=lambda x: x['line']):
            print(f"  第{result['line']}行: {result['field']} → {result['suggested_replacement']}")
            print(f"    上下文: {result['context'][:100]}{'...' if len(result['context']) > 100 else ''}")
    
    print("\n" + "="*80)
    print("🛠️  修复建议")
    print("="*80)
    print("1. 使用IDE的全局搜索替换功能，按以下映射进行替换:")
    
    unique_replacements = {}
    for result in results:
        unique_replacements[result['field']] = result['suggested_replacement']
    
    for old_field, new_field in sorted(unique_replacements.items()):
        print(f"   {old_field} → {new_field}")
    
    print("\n2. 重点关注以下高频文件:")
    for file_path, count in sorted(file_stats.items(), key=lambda x: x[1], reverse=True)[:10]:
        rel_path = Path(file_path).relative_to(Path.cwd()) if Path(file_path).is_absolute() else file_path
        print(f"   {rel_path} ({count}个字段)")
    
    print("\n3. 替换完成后，请确保:")
    print("   - 前后端字段映射一致")
    print("   - 数据库查询字段正确")
    print("   - 类型定义已更新")
    print("   - API接口参数和响应字段统一")
    print("   - 重新运行测试确保功能正常")

def main():
    """主函数"""
    project_root = Path.cwd()
    
    print("🚀 水晶ERP项目废弃字段检查工具")
    print(f"📂 项目根目录: {project_root}")
    print("🎯 目标: 检查遗留的product和material字段")
    print("💡 这些字段已被彻底抛弃，需要全部替换为purchase相关字段")
    
    try:
        results, file_count = scan_project(project_root)
        generate_report(results, file_count)
        
        # 保存结果到文件
        if results:
            report_file = project_root / 'legacy_fields_report.txt'
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(f"水晶ERP项目废弃字段检查报告\n")
                f.write(f"生成时间: {__import__('datetime').datetime.now()}\n")
                f.write(f"发现 {len(results)} 个废弃字段\n\n")
                
                for result in results:
                    f.write(f"{result['file']}:{result['line']}:{result['column']} ")
                    f.write(f"{result['field']} → {result['suggested_replacement']}\n")
                    f.write(f"  {result['context']}\n\n")
            
            print(f"\n📄 详细报告已保存到: {report_file}")
        
    except KeyboardInterrupt:
        print("\n⏹️  扫描已取消")
    except Exception as e:
        print(f"\n❌ 扫描过程中发生错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()