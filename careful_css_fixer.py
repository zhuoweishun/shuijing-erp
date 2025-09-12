#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
谨慎的CSS引用修复脚本
目标：修复 src/index.css 中对不存在文件的引用
策略：移除错误的 @import 语句或创建缺失的文件
"""

import os
import json
from datetime import datetime
from pathlib import Path

class CarefulCSSFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        self.backup_created = False
        
    def create_backup(self):
        """创建备份"""
        if self.backup_created:
            return
            
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/css_fix_{timestamp}'
        
        import shutil
        if os.path.exists('src'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copytree('src', f'{backup_dir}/src')
            print(f"✅ 已创建备份: {backup_dir}")
            self.backup_created = True
    
    def check_missing_files(self):
        """检查缺失的文件"""
        missing_files = []
        
        # 检查 src/index.css 中引用的文件
        index_css_path = 'src/index.css'
        if os.path.exists(index_css_path):
            with open(index_css_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 查找 @import 语句
            import re
            import_matches = re.findall(r"@import\s+['\"]([^'\"]+)['\"];", content)
            
            for import_path in import_matches:
                # 解析相对路径
                if import_path.startswith('./'):
                    full_path = os.path.join('src', import_path[2:])
                else:
                    full_path = os.path.join('src', import_path)
                
                if not os.path.exists(full_path):
                    missing_files.append({
                        'import_statement': f"@import '{import_path}';",
                        'expected_path': full_path,
                        'relative_path': import_path
                    })
        
        return missing_files
    
    def fix_missing_css_imports(self):
        """修复缺失的CSS导入"""
        missing_files = self.check_missing_files()
        
        if not missing_files:
            print("✅ 没有发现缺失的CSS文件引用")
            return
        
        print(f"🔍 发现 {len(missing_files)} 个缺失的CSS文件引用:")
        for file_info in missing_files:
            print(f"   - {file_info['import_statement']} -> {file_info['expected_path']}")
        
        # 策略1：移除错误的 @import 语句（更安全）
        self.remove_invalid_imports(missing_files)
        
        # 策略2：如果需要，创建基本的mobile.css文件
        # self.create_missing_files(missing_files)
    
    def remove_invalid_imports(self, missing_files):
        """移除无效的@import语句"""
        index_css_path = 'src/index.css'
        
        if not os.path.exists(index_css_path):
            return
        
        try:
            with open(index_css_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 移除每个无效的@import语句
            for file_info in missing_files:
                import_statement = file_info['import_statement']
                # 移除整行，包括注释
                lines = content.split('\n')
                new_lines = []
                
                for line in lines:
                    # 如果这一行包含无效的@import，跳过它
                    if import_statement.strip() in line.strip():
                        # 添加注释说明
                        new_lines.append(f"/* 已移除无效的导入: {import_statement} */")
                        self.fixes_applied.append({
                            'file': index_css_path,
                            'type': 'remove_invalid_import',
                            'description': f'移除无效的@import: {import_statement}',
                            'original_line': line.strip()
                        })
                    else:
                        new_lines.append(line)
                
                content = '\n'.join(new_lines)
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(index_css_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ 已修复 {index_css_path} 中的无效@import语句")
            
        except Exception as e:
            error_msg = f"修复 {index_css_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def create_missing_files(self, missing_files):
        """创建缺失的CSS文件（备选方案）"""
        for file_info in missing_files:
            file_path = file_info['expected_path']
            
            # 确保目录存在
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # 创建基本的CSS文件
            if 'mobile.css' in file_path:
                css_content = '''/* 移动端优化样式 */

/* 响应式设计 */
@media (max-width: 768px) {
  /* 移动端特定样式 */
  .container {
    padding: 0.5rem;
  }
  
  .card {
    margin: 0.5rem;
    padding: 1rem;
  }
  
  /* 触摸友好的按钮 */
  .btn {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* 表格在移动端的优化 */
  .table-responsive {
    overflow-x: auto;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .hover\\:bg-gray-100:hover {
    background-color: transparent;
  }
}
'''
            else:
                css_content = f'''/* 自动生成的CSS文件 */
/* 文件路径: {file_path} */

/* 在这里添加样式 */
'''
            
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(css_content)
                
                self.fixes_applied.append({
                    'file': file_path,
                    'type': 'create_missing_file',
                    'description': f'创建缺失的CSS文件: {file_path}'
                })
                
                print(f"✅ 已创建缺失的文件: {file_path}")
                
            except Exception as e:
                error_msg = f"创建文件 {file_path} 时出错: {str(e)}"
                print(f"❌ {error_msg}")
                self.errors_found.append(error_msg)
    
    def run_careful_fixes(self):
        """运行谨慎的修复"""
        print("🔧 开始谨慎的CSS修复...")
        print("🎯 目标：修复CSS文件引用问题")
        
        # 创建备份
        self.create_backup()
        
        # 修复缺失的CSS导入
        self.fix_missing_css_imports()
        
        # 生成报告
        self.generate_report()
        
        return True
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_fixes': len(self.fixes_applied),
            'total_errors': len(self.errors_found),
            'fixes_applied': self.fixes_applied,
            'errors_found': self.errors_found
        }
        
        # 保存报告
        with open('css_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 CSS修复完成统计:")
        print(f"   总修复数: {report['total_fixes']}")
        print(f"   错误数: {report['total_errors']}")
        
        if self.fixes_applied:
            print("\n🔧 应用的修复:")
            for fix in self.fixes_applied:
                print(f"   - {fix['description']}")
        
        if self.errors_found:
            print("\n❌ 发现的错误:")
            for error in self.errors_found:
                print(f"   - {error}")
        
        print(f"\n📄 详细报告已保存到: css_fix_report.json")

if __name__ == '__main__':
    fixer = CarefulCSSFixer()
    
    if fixer.run_careful_fixes():
        print("\n✅ CSS修复完成！")
        print("📊 请运行 'npm run build' 检查构建状态")
        print("🎯 目标：解决CSS文件引用问题")
    else:
        print("\n❌ 修复过程中出现问题！")