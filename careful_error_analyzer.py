#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
谨慎的错误分析和修复脚本
目标：将857个错误减少到100个以下
策略：分析常见错误模式，谨慎修复
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

class CarefulErrorAnalyzer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        self.backup_created = False
        
    def create_backup(self):
        """创建备份"""
        if self.backup_created:
            return
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/careful_analysis_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
            self.backup_created = True
    
    def analyze_file_for_common_issues(self, file_path):
        """分析文件中的常见问题"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
            
            # 检查常见的JSX问题
            for i, line in enumerate(lines, 1):
                # 检查未闭合的JSX标签
                if '<' in line and '>' in line and not line.strip().startswith('//'):
                    # 检查自闭合标签格式
                    if re.search(r'<\w+[^>]*[^/]>', line) and not re.search(r'</\w+>', line):
                        if any(tag in line for tag in ['input', 'img', 'br', 'hr', 'meta', 'link']):
                            issues.append({
                                'type': 'jsx_self_closing',
                                'line': i,
                                'content': line.strip(),
                                'description': 'JSX自闭合标签格式问题'
                            })
                
                # 检查驼峰命名
                camel_matches = re.findall(r'\b[a-z]+[A-Z][a-zA-Z]*\b', line)
                for match in camel_matches:
                    # 排除React内置的驼峰命名
                    if match not in ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext', 'className', 'onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur']:
                        issues.append({
                            'type': 'camel_case',
                            'line': i,
                            'content': line.strip(),
                            'match': match,
                            'description': f'驼峰命名需要改为蛇形: {match}'
                        })
                
                # 检查类型定义问题
                if 'interface' in line and '{' in line:
                    # 检查interface属性定义
                    if ':' in line and not line.strip().endswith(';') and not line.strip().endswith(','):
                        issues.append({
                            'type': 'interface_syntax',
                            'line': i,
                            'content': line.strip(),
                            'description': 'interface属性定义缺少分号或逗号'
                        })
                
                # 检查导入语句问题
                if line.strip().startswith('import') and 'from' in line:
                    # 检查导入路径
                    if '../' in line or './' in line:
                        # 检查是否使用了错误的文件扩展名
                        if re.search(r'from\s+["\'][^"\']*(\.(js|jsx))["\']', line):
                            issues.append({
                                'type': 'import_extension',
                                'line': i,
                                'content': line.strip(),
                                'description': '导入语句使用了错误的文件扩展名'
                            })
        
        except Exception as e:
            self.errors_found.append(f"分析文件 {file_path} 时出错: {str(e)}")
        
        return issues
    
    def fix_jsx_self_closing_tags(self, content, file_path):
        """修复JSX自闭合标签"""
        original_content = content
        
        # 修复常见的自闭合标签
        self_closing_tags = ['input', 'img', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']
        
        for tag in self_closing_tags:
            # 修复 <tag ...> 为 <tag ... />
            pattern = f'<{tag}([^>]*[^/])>'
            replacement = f'<{tag}\\1 />'
            content = re.sub(pattern, replacement, content)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'jsx_self_closing_fix',
                'description': '修复JSX自闭合标签格式'
            })
        
        return content
    
    def fix_camel_case_naming(self, content, file_path):
        """修复驼峰命名为蛇形命名"""
        original_content = content
        
        # 常见的驼峰到蛇形转换
        camel_to_snake_patterns = [
            (r'\bisOpen\b', 'is_open'),
            (r'\bonClose\b', 'on_close'),
            (r'\bonSuccess\b', 'on_success'),
            (r'\bonError\b', 'on_error'),
            (r'\bonSubmit\b', 'on_submit'),
            (r'\bformData\b', 'form_data'),
            (r'\buserData\b', 'user_data'),
            (r'\bapiData\b', 'api_data'),
            (r'\bresponseData\b', 'response_data'),
            (r'\brequestData\b', 'request_data'),
            (r'\bisLoading\b', 'is_loading'),
            (r'\bisSubmitting\b', 'is_submitting'),
            (r'\bisValid\b', 'is_valid'),
            (r'\bisDisabled\b', 'is_disabled'),
            (r'\bisVisible\b', 'is_visible'),
            (r'\bshowModal\b', 'show_modal'),
            (r'\bhideModal\b', 'hide_modal'),
            (r'\bsetData\b', 'set_data'),
            (r'\bgetData\b', 'get_data'),
            (r'\bupdateData\b', 'update_data'),
            (r'\bdeleteData\b', 'delete_data'),
        ]
        
        for pattern, replacement in camel_to_snake_patterns:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                content = new_content
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'camel_to_snake_fix',
                    'description': f'修复驼峰命名: {pattern} -> {replacement}'
                })
        
        return content
    
    def fix_interface_syntax(self, content, file_path):
        """修复interface语法问题"""
        original_content = content
        lines = content.split('\n')
        
        in_interface = False
        brace_count = 0
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # 检测interface开始
            if re.match(r'^interface\s+\w+', stripped):
                in_interface = True
                brace_count = 0
            
            if in_interface:
                # 计算大括号深度
                brace_count += line.count('{') - line.count('}')
                
                # 在interface内部，修复属性定义
                if brace_count > 0 and ':' in stripped and not stripped.startswith('//'):
                    # 如果是属性定义且不以分号结尾，添加分号
                    if (not stripped.endswith(';') and 
                        not stripped.endswith(',') and 
                        not stripped.endswith('{') and 
                        not stripped.endswith('}') and
                        not stripped.endswith('*/')):
                        lines[i] = line.rstrip() + ';'
                
                # interface结束
                if brace_count <= 0 and '}' in line:
                    in_interface = False
        
        content = '\n'.join(lines)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'interface_syntax_fix',
                'description': '修复interface语法问题'
            })
        
        return content
    
    def fix_import_statements(self, content, file_path):
        """修复导入语句问题"""
        original_content = content
        
        # 移除导入语句中的.js/.jsx扩展名
        content = re.sub(r'from\s+(["\'][^"\']*)\.(js|jsx)(["\'])', r'from \1\3', content)
        
        # 修复相对路径导入
        content = re.sub(r'from\s+["\']\./([^"\']*)\.(ts|tsx)["\']', r"from './\1'", content)
        content = re.sub(r'from\s+["\']\.\.([^"\']*)\.(ts|tsx)["\']', r"from '..\1'", content)
        
        if content != original_content:
            self.fixes_applied.append({
                'file': file_path,
                'type': 'import_statement_fix',
                'description': '修复导入语句问题'
            })
        
        return content
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 应用各种修复
            content = self.fix_import_statements(content, file_path)
            content = self.fix_interface_syntax(content, file_path)
            content = self.fix_camel_case_naming(content, file_path)
            
            # 只对.tsx文件应用JSX修复
            if file_path.endswith('.tsx'):
                content = self.fix_jsx_self_closing_tags(content, file_path)
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 已修复: {file_path}")
            
        except Exception as e:
            error_msg = f"处理文件 {file_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def run_careful_analysis(self):
        """运行谨慎的错误分析和修复"""
        print("🔍 开始谨慎的错误分析和修复...")
        print("📊 当前错误数量: 857个")
        print("🎯 目标: 减少到100个以下")
        
        # 创建备份
        self.create_backup()
        
        # 处理所有TypeScript和TSX文件
        src_dir = Path('src')
        if not src_dir.exists():
            print("❌ src目录不存在")
            return False
        
        files_to_process = []
        for ext in ['*.ts', '*.tsx']:
            files_to_process.extend(src_dir.rglob(ext))
        
        print(f"📁 找到 {len(files_to_process)} 个文件需要处理")
        
        # 先分析所有文件的问题
        all_issues = []
        for file_path in files_to_process:
            issues = self.analyze_file_for_common_issues(str(file_path))
            all_issues.extend(issues)
        
        print(f"🔍 发现 {len(all_issues)} 个潜在问题")
        
        # 按类型统计问题
        issue_types = {}
        for issue in all_issues:
            issue_type = issue['type']
            if issue_type not in issue_types:
                issue_types[issue_type] = 0
            issue_types[issue_type] += 1
        
        print("📊 问题类型统计:")
        for issue_type, count in issue_types.items():
            print(f"   {issue_type}: {count}个")
        
        # 处理文件
        for file_path in files_to_process:
            self.process_file(str(file_path))
        
        # 生成报告
        self.generate_report()
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_fixes': len(self.fixes_applied),
            'total_errors': len(self.errors_found),
            'fixes_by_type': {},
            'fixes_applied': self.fixes_applied,
            'errors_found': self.errors_found
        }
        
        # 统计修复类型
        for fix in self.fixes_applied:
            fix_type = fix['type']
            if fix_type not in report['fixes_by_type']:
                report['fixes_by_type'][fix_type] = 0
            report['fixes_by_type'][fix_type] += 1
        
        # 保存报告
        with open('careful_error_analysis_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 谨慎修复完成统计:")
        print(f"   总修复数: {report['total_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        for fix_type, count in report['fixes_by_type'].items():
            print(f"   {fix_type}: {count}")
        
        print(f"\n📄 详细报告已保存到: careful_error_analysis_report.json")

if __name__ == '__main__':
    analyzer = CarefulErrorAnalyzer()
    
    if analyzer.run_careful_analysis():
        print("\n✅ 谨慎修复完成！")
        print("📊 请运行 'npm run build' 检查错误数量变化")
        print("🎯 目标：将857个错误减少到100个以下")
        print("\n⚠️ 请务必检查修复后的错误数量对比")
    else:
        print("\n❌ 修复过程中出现问题！")