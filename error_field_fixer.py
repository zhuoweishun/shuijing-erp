#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
驼峰命名错误修复脚本
修复代码检查中发现的字段引用不一致问题
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

class ErrorFieldFixer:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / f"backups/error_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'total_files_scanned': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_replacements': {},
            'modified_files': [],
            'errors': []
        }
        
        # 需要修复的字段映射
        self.field_mappings = {
            'supplierId': 'supplier_id',
            'purchaseDate': 'purchase_date', 
            'totalPurchases': 'total_purchases',
            'usedBeads': 'used_beads',
            'fileURLToPath': 'file_u_r_l_to_path'
        }
        
        # 扫描目录
        self.scan_dirs = ['src', 'backend/src', 'shared']
        
        # 文件扩展名
        self.file_extensions = ['.ts', '.tsx', '.js', '.jsx']
        
        # 创建备份目录
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"🔧 驼峰命名错误修复脚本启动")
        print(f"📁 项目根目录: {self.project_root}")
        print(f"💾 备份目录: {self.backup_dir}")
        print(f"🎯 需要修复的字段: {list(self.field_mappings.keys())}")
    
    def should_process_file(self, file_path):
        """判断是否应该处理该文件"""
        # 跳过备份文件
        if '_backup' in str(file_path) or 'backup' in str(file_path).lower():
            return False
        
        # 跳过node_modules
        if 'node_modules' in str(file_path):
            return False
            
        # 跳过测试覆盖率文件
        if 'coverage' in str(file_path):
            return False
            
        # 检查文件扩展名
        return file_path.suffix in self.file_extensions
    
    def backup_file(self, file_path):
        """备份文件"""
        try:
            relative_path = file_path.relative_to(self.project_root)
            backup_path = self.backup_dir / relative_path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, backup_path)
            return True
        except Exception as e:
            self.report['errors'].append(f"备份文件失败 {file_path}: {str(e)}")
            return False
    
    def fix_field_references(self, content, file_path):
        """修复字段引用"""
        modified = False
        file_replacements = {}
        
        for camel_field, snake_field in self.field_mappings.items():
            # 匹配模式：
            # 1. 对象属性访问: obj.supplierId
            # 2. 对象解构: { supplierId }
            # 3. 变量赋值: const supplierId = 
            # 4. 函数参数: function(supplierId)
            # 5. 对象键值: supplierId: value
            
            patterns = [
                # 对象属性访问
                (rf'\b([a-zA-Z_$][a-zA-Z0-9_$]*)\.{camel_field}\b', rf'\1.{snake_field}'),
                # 对象解构和对象字面量
                (rf'\{{\s*{camel_field}\s*\}}', rf'{{ {snake_field} }}'),
                (rf'\{{\s*([^}}]+,\s*)?{camel_field}(\s*[,}}])', rf'{{\1{snake_field}\2'),
                # 变量声明和赋值
                (rf'\b(const|let|var)\s+{camel_field}\b', rf'\1 {snake_field}'),
                (rf'\b{camel_field}\s*=', rf'{snake_field} ='),
                # 函数参数
                (rf'\(([^)]*,\s*)?{camel_field}(\s*[,)])', rf'(\1{snake_field}\2'),
                # 对象键值对
                (rf'\b{camel_field}\s*:', rf'{snake_field}:'),
                # 单独的变量引用（最后处理，避免误替换）
                (rf'\b{camel_field}\b(?![a-zA-Z0-9_])', snake_field)
            ]
            
            for pattern, replacement in patterns:
                matches = list(re.finditer(pattern, content))
                if matches:
                    # 检查是否在字符串或注释中
                    valid_matches = []
                    for match in matches:
                        if not self.is_in_string_or_comment(content, match.start()):
                            valid_matches.append(match)
                    
                    if valid_matches:
                        content = re.sub(pattern, replacement, content)
                        count = len(valid_matches)
                        file_replacements[camel_field] = file_replacements.get(camel_field, 0) + count
                        modified = True
                        print(f"  ✅ {camel_field} → {snake_field}: {count}次")
        
        return content, modified, file_replacements
    
    def is_in_string_or_comment(self, content, position):
        """检查位置是否在字符串或注释中"""
        # 简单检查：查找位置前的引号和注释标记
        before_pos = content[:position]
        
        # 检查单行注释
        last_line_start = before_pos.rfind('\n')
        current_line = before_pos[last_line_start:]
        if '//' in current_line:
            comment_pos = current_line.find('//')
            if comment_pos < len(current_line) - (len(before_pos) - last_line_start):
                return True
        
        # 检查多行注释
        if '/*' in before_pos:
            last_comment_start = before_pos.rfind('/*')
            last_comment_end = before_pos.rfind('*/', last_comment_start)
            if last_comment_end == -1 or last_comment_end < last_comment_start:
                return True
        
        # 检查字符串（简单版本）
        single_quotes = before_pos.count("'") - before_pos.count("\\'")
        double_quotes = before_pos.count('"') - before_pos.count('\\"')
        template_quotes = before_pos.count('`') - before_pos.count('\\`')
        
        return (single_quotes % 2 == 1) or (double_quotes % 2 == 1) or (template_quotes % 2 == 1)
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            print(f"📄 处理文件: {file_path.relative_to(self.project_root)}")
            
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # 修复字段引用
            modified_content, is_modified, file_replacements = self.fix_field_references(original_content, file_path)
            
            if is_modified:
                # 备份原文件
                if self.backup_file(file_path):
                    # 写入修改后的内容
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(modified_content)
                    
                    # 更新报告
                    self.report['files_modified'] += 1
                    self.report['modified_files'].append(str(file_path.relative_to(self.project_root)))
                    
                    for field, count in file_replacements.items():
                        self.report['field_replacements'][field] = self.report['field_replacements'].get(field, 0) + count
                        self.report['total_replacements'] += count
                    
                    print(f"  ✅ 文件已修改，替换 {sum(file_replacements.values())} 处")
                else:
                    print(f"  ❌ 备份失败，跳过修改")
            else:
                print(f"  ⏭️  无需修改")
                
        except Exception as e:
            error_msg = f"处理文件失败 {file_path}: {str(e)}"
            print(f"  ❌ {error_msg}")
            self.report['errors'].append(error_msg)
    
    def scan_and_fix(self):
        """扫描并修复所有文件"""
        print(f"\n🔍 开始扫描和修复...")
        
        for scan_dir in self.scan_dirs:
            dir_path = self.project_root / scan_dir
            if not dir_path.exists():
                print(f"⚠️  目录不存在: {dir_path}")
                continue
            
            print(f"\n📁 扫描目录: {scan_dir}")
            
            for file_path in dir_path.rglob('*'):
                if file_path.is_file() and self.should_process_file(file_path):
                    self.report['total_files_scanned'] += 1
                    self.process_file(file_path)
    
    def generate_report(self):
        """生成修复报告"""
        report_file = self.project_root / 'error_fix_report.json'
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        
        # 生成执行日志
        log_file = self.project_root / 'error_fix_log.txt'
        with open(log_file, 'w', encoding='utf-8') as f:
            f.write(f"驼峰命名错误修复执行日志\n")
            f.write(f"执行时间: {self.report['timestamp']}\n")
            f.write(f"扫描文件数: {self.report['total_files_scanned']}\n")
            f.write(f"修改文件数: {self.report['files_modified']}\n")
            f.write(f"总替换次数: {self.report['total_replacements']}\n\n")
            
            f.write("字段替换统计:\n")
            for field, count in self.report['field_replacements'].items():
                f.write(f"  {field}: {count}次\n")
            
            f.write("\n修改的文件:\n")
            for file_path in self.report['modified_files']:
                f.write(f"  {file_path}\n")
            
            if self.report['errors']:
                f.write("\n错误信息:\n")
                for error in self.report['errors']:
                    f.write(f"  {error}\n")
        
        print(f"\n📊 修复报告已生成: {report_file}")
        print(f"📝 执行日志已生成: {log_file}")
    
    def print_summary(self):
        """打印修复摘要"""
        print(f"\n" + "="*60)
        print(f"🎉 驼峰命名错误修复完成")
        print(f"="*60)
        print(f"📊 扫描文件数: {self.report['total_files_scanned']}")
        print(f"📝 修改文件数: {self.report['files_modified']}")
        print(f"🔄 总替换次数: {self.report['total_replacements']}")
        
        if self.report['field_replacements']:
            print(f"\n🎯 字段替换统计:")
            for field, count in self.report['field_replacements'].items():
                snake_field = self.field_mappings[field]
                print(f"  {field} → {snake_field}: {count}次")
        
        if self.report['errors']:
            print(f"\n⚠️  错误数量: {len(self.report['errors'])}")
        
        print(f"\n💾 备份目录: {self.backup_dir}")
        print(f"="*60)

def main():
    # 获取项目根目录
    project_root = Path(__file__).parent
    
    # 创建修复器实例
    fixer = ErrorFieldFixer(project_root)
    
    try:
        # 执行扫描和修复
        fixer.scan_and_fix()
        
        # 生成报告
        fixer.generate_report()
        
        # 打印摘要
        fixer.print_summary()
        
    except KeyboardInterrupt:
        print(f"\n⚠️  用户中断操作")
    except Exception as e:
        print(f"\n❌ 执行失败: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()