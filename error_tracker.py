#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
错误追踪和对比脚本
统计构建错误数量，执行修复，然后对比结果
"""

import os
import re
import glob
import subprocess
from typing import List, Tuple, Dict

class ErrorTracker:
    def __init__(self, project_root: str):
        self.project_root = project_root
        
    def count_build_errors(self) -> int:
        """统计构建错误数量"""
        try:
            # 在Windows PowerShell中运行构建命令
            result = subprocess.run(
                ['powershell', '-Command', 'npx vite build'], 
                cwd=self.project_root,
                capture_output=True, 
                text=True,
                timeout=60,
                shell=True
            )
            
            error_output = result.stderr if result.stderr else ""
            
            # 统计ERROR行数
            error_lines = [line for line in error_output.split('\n') if 'ERROR:' in line]
            
            print(f"构建输出分析:")
            print(f"   - 退出码: {result.returncode}")
            print(f"   - 错误行数: {len(error_lines)}")
            
            if error_lines:
                print(f"   - 错误示例:")
                for i, line in enumerate(error_lines[:3]):  # 显示前3个错误
                    print(f"     {i+1}. {line.strip()}")
                if len(error_lines) > 3:
                    print(f"     ... 还有 {len(error_lines) - 3} 个错误")
            
            return len(error_lines)
            
        except subprocess.TimeoutExpired:
            print("构建超时")
            return -1
        except Exception as e:
            print(f"构建失败: {e}")
            return -1
    
    def apply_targeted_fixes(self, content: str) -> Tuple[str, int]:
        """应用针对性修复"""
        total_fixes = 0
        
        # 1. 修复函数名错误（最安全）
        function_fixes = [
            ('setmessages(', 'set_messages('),
            ('setinput_message(', 'set_input_message('),
            ('setis_loading(', 'set_is_loading('),
            ('setError(', 'set_error('),
            ('setstats(', 'set_stats('),
            ('setuser(', 'set_user('),
            ('settoken(', 'set_token('),
        ]
        
        for old, new in function_fixes:
            if old in content:
                content = content.replace(old, new)
                total_fixes += 1
        
        # 2. 修复API方法名
        if '.to_locale_date_string(' in content:
            content = content.replace('.to_locale_date_string(', '.toLocaleDateString(')
            total_fixes += 1
        
        # 3. 修复变量名
        if re.search(r'\bisActive\b', content):
            content = re.sub(r'\bisActive\b', 'is_active', content)
            total_fixes += 1
        
        # 4. 修复明确的括号错误
        # localStorage.getItem('key' } -> localStorage.getItem('key')
        if re.search(r"localStorage\.getItem\('[^']+' \}", content):
            content = re.sub(r"(localStorage\.getItem\('[^']+') \}", r'\1)', content)
            total_fixes += 1
        
        # 5. 修复JSX自闭合标签
        # <Navigate ... />) -> <Navigate ... />}
        if re.search(r'<\w+[^>]*/>\)', content):
            content = re.sub(r'(<\w+[^>]*/>)\)', r'\1}', content)
            total_fixes += 1
        
        # 6. 修复render调用
        if '.render()\n' in content and '<' in content:
            content = re.sub(r'\.render\(\)\n(\s*)(<)', r'.render(\n\1\2', content)
            total_fixes += 1
        
        # 7. 修复console.log对象
        if re.search(r'console\.log\([^)]*\{[^}]*\);', content):
            content = re.sub(r'(console\.log\([^)]*\{[^}]*)\);', r'\1 });', content)
            total_fixes += 1
        
        # 8. 修复导航函数调用
        if re.search(r"navigate\('[^']+',\s*\n", content):
            content = re.sub(r"(navigate\('[^']+'),\s*\n", r'\1\n', content)
            total_fixes += 1
        
        return content, total_fixes
    
    def fix_file(self, file_path: str) -> int:
        """修复单个文件，返回修复数量"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
                
            content, fixes = self.apply_targeted_fixes(original_content)
            
            if fixes > 0 and content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return fixes
                
        except Exception as e:
            print(f"修复 {file_path} 时出错: {e}")
            
        return 0
    
    def run_fix_cycle(self) -> Dict[str, int]:
        """运行一轮修复循环"""
        print("\n" + "="*50)
        print("开始错误追踪和修复循环")
        print("="*50)
        
        # 1. 统计修复前的错误
        print("\n🔍 步骤1: 统计修复前的错误数量...")
        before_errors = self.count_build_errors()
        
        if before_errors == -1:
            print("❌ 无法统计错误，跳过修复")
            return {'before': -1, 'after': -1, 'fixed_files': 0, 'total_fixes': 0}
        
        print(f"📊 修复前错误数量: {before_errors}")
        
        # 2. 执行修复
        print("\n🔧 步骤2: 执行针对性修复...")
        
        patterns = ['src/**/*.tsx', 'src/**/*.ts', 'src/**/*.jsx', 'src/**/*.js']
        files_to_fix = []
        for pattern in patterns:
            files_to_fix.extend(glob.glob(
                os.path.join(self.project_root, pattern), 
                recursive=True
            ))
        
        total_fixes = 0
        fixed_files = 0
        
        for file_path in files_to_fix:
            fixes = self.fix_file(file_path)
            if fixes > 0:
                total_fixes += fixes
                fixed_files += 1
                print(f"✅ 修复 {os.path.basename(file_path)}: {fixes} 个问题")
        
        print(f"\n📊 修复统计: {fixed_files} 个文件，{total_fixes} 个问题")
        
        # 3. 统计修复后的错误
        print("\n🔍 步骤3: 统计修复后的错误数量...")
        after_errors = self.count_build_errors()
        
        # 4. 对比结果
        print("\n📊 修复效果对比:")
        print(f"   - 修复前错误: {before_errors}")
        print(f"   - 修复后错误: {after_errors}")
        
        if before_errors >= 0 and after_errors >= 0:
            diff = before_errors - after_errors
            if diff > 0:
                print(f"   ✅ 减少了 {diff} 个错误 ({diff/before_errors*100:.1f}%)")
            elif diff < 0:
                print(f"   ❌ 增加了 {abs(diff)} 个错误")
            else:
                print(f"   ➖ 错误数量没有变化")
        
        return {
            'before': before_errors,
            'after': after_errors, 
            'fixed_files': fixed_files,
            'total_fixes': total_fixes
        }

def main():
    project_root = os.getcwd()
    print(f"🚀 错误追踪和修复系统")
    print(f"📁 项目根目录: {project_root}")
    
    tracker = ErrorTracker(project_root)
    result = tracker.run_fix_cycle()
    
    print("\n" + "="*50)
    print("修复循环完成")
    print("="*50)
    
    if result['before'] >= 0 and result['after'] >= 0:
        improvement = result['before'] - result['after']
        if improvement > 0:
            print(f"🎉 成功减少 {improvement} 个错误！")
        elif improvement < 0:
            print(f"⚠️  增加了 {abs(improvement)} 个错误，需要调整策略")
        else:
            print(f"📊 错误数量保持不变")
    
    print(f"💡 建议: 如果错误数量减少，可以继续运行此脚本")

if __name__ == '__main__':
    main()