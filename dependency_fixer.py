#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
依赖问题修复脚本
目标：修复 recharts 和 es-toolkit 的依赖解析问题
策略：更新 vite.config.ts 配置来处理依赖解析
"""

import os
import json
from datetime import datetime

class DependencyFixer:
    def __init__(self):
        self.fixes_applied = []
        self.errors_found = []
        
    def create_backup(self):
        """创建备份"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_dir = f'backups/dependency_fix_{timestamp}'
        
        import shutil
        if os.path.exists('vite.config.ts'):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copy2('vite.config.ts', f'{backup_dir}/vite.config.ts')
            print(f"✅ 已创建备份: {backup_dir}")
    
    def fix_vite_config(self):
        """修复 vite.config.ts 配置"""
        config_path = 'vite.config.ts'
        
        if not os.path.exists(config_path):
            print(f"❌ 找不到 {config_path} 文件")
            return False
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # 检查是否已经有 build.rollupOptions 配置
            if 'rollupOptions' not in content:
                # 添加 rollupOptions 配置来处理依赖问题
                
                # 找到 export default defineConfig 的位置
                import re
                
                # 查找配置对象的结构
                if 'export default defineConfig({' in content:
                    # 在配置对象中添加 build 选项
                    pattern = r'(export default defineConfig\(\{[^}]*)(\}\))'  
                    
                    build_config = '''
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts']
        }
      }
    },
    commonjsOptions: {
      include: [/node_modules/]
    }
  },'''
                    
                    # 在最后一个配置项后添加 build 配置
                    if ',\n}' in content:
                        content = content.replace(',\n}', f',{build_config}\n}}')
                    elif '\n}' in content:
                        content = content.replace('\n}', f',{build_config}\n}}')
                    
                    self.fixes_applied.append({
                        'file': config_path,
                        'type': 'add_build_config',
                        'description': '添加 build.rollupOptions 配置'
                    })
            
            # 检查是否需要添加 optimizeDeps 配置
            if 'optimizeDeps' not in content:
                # 添加依赖优化配置
                optimize_config = '''
  optimizeDeps: {
    include: ['recharts', 'es-toolkit'],
    exclude: []
  },'''
                
                if 'build: {' in content:
                    content = content.replace('build: {', 'optimizeDeps: {\n    include: ["recharts", "es-toolkit"],\n    exclude: []\n  },\n  build: {')
                else:
                    # 在配置对象中添加
                    if ',\n}' in content:
                        content = content.replace(',\n}', f',{optimize_config}\n}}')
                    elif '\n}' in content:
                        content = content.replace('\n}', f',{optimize_config}\n}}')
                
                self.fixes_applied.append({
                    'file': config_path,
                    'type': 'add_optimize_deps',
                    'description': '添加 optimizeDeps 配置'
                })
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(config_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"✅ 已更新 {config_path} 配置")
                return True
            else:
                print(f"ℹ️ {config_path} 配置已是最新")
                return True
                
        except Exception as e:
            error_msg = f"修复 {config_path} 时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
            return False
    
    def install_missing_dependencies(self):
        """安装缺失的依赖"""
        try:
            print("📦 检查并安装缺失的依赖...")
            
            # 检查 es-toolkit 是否已安装
            import subprocess
            result = subprocess.run(['npm', 'list', 'es-toolkit'], 
                                  capture_output=True, text=True, cwd='.')
            
            if result.returncode != 0:
                print("📦 安装 es-toolkit...")
                install_result = subprocess.run(['npm', 'install', 'es-toolkit'], 
                                              capture_output=True, text=True, cwd='.')
                
                if install_result.returncode == 0:
                    print("✅ es-toolkit 安装成功")
                    self.fixes_applied.append({
                        'type': 'install_dependency',
                        'description': '安装 es-toolkit 依赖'
                    })
                else:
                    error_msg = f"安装 es-toolkit 失败: {install_result.stderr}"
                    print(f"❌ {error_msg}")
                    self.errors_found.append(error_msg)
            else:
                print("✅ es-toolkit 已安装")
                
        except Exception as e:
            error_msg = f"检查依赖时出错: {str(e)}"
            print(f"❌ {error_msg}")
            self.errors_found.append(error_msg)
    
    def run_dependency_fixes(self):
        """运行依赖修复"""
        print("🔧 开始依赖问题修复...")
        print("🎯 目标：修复 recharts 和 es-toolkit 依赖问题")
        
        # 创建备份
        self.create_backup()
        
        # 安装缺失的依赖
        self.install_missing_dependencies()
        
        # 修复 Vite 配置
        success = self.fix_vite_config()
        
        # 生成报告
        self.generate_report()
        
        return success
    
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
        with open('dependency_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n📊 依赖修复完成统计:")
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
        
        print(f"\n📄 详细报告已保存到: dependency_fix_report.json")

if __name__ == '__main__':
    fixer = DependencyFixer()
    
    if fixer.run_dependency_fixes():
        print("\n✅ 依赖修复完成！")
        print("📦 请运行 'npm run build' 检查构建状态")
        print("🎯 目标：解决依赖解析问题")
    else:
        print("\n❌ 修复过程中出现问题！")