#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终轮错误修复脚本 - 处理剩余的144个TypeScript错误
专门处理HTML表单属性、组件属性不匹配等问题
"""

import os
import re
import json
import shutil
from datetime import datetime
from pathlib import Path

class FinalRoundFixer:
    def __init__(self):
        self.src_dir = Path('src')
        self.backup_dir = Path('backups') / f'final_round_fix_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        self.fixes_applied = []
        
        # HTML表单属性修复 - 蛇形改为驼峰（HTML标准）
        self.html_form_fixes = {
            'on_submit': 'onSubmit',  # HTML form属性必须是驼峰
        }
        
        # 组件属性修复 - 驼峰改为蛇形（自定义组件）
        self.component_prop_fixes = {
            'onCancel': 'on_cancel',
            'onChange': 'on_change',
            'onClick': 'on_click'
        }
        
        # DOM API修复
        self.dom_api_fixes = {
            'user_agent': 'userAgent',
            'get_user_media': 'getUserMedia',
            'get_supported_constraints': 'getSupportedConstraints',
            'is_valid': 'isValid',
            'define_property': 'defineProperty',
            'to_string': 'toString',
            'status_text': 'statusText',
            'query_selector': 'querySelector',
            'get_input_props': 'getInputProps'
        }
        
        # 变量名修复
        self.variable_fixes = {
            'piece_count_value': 'piece_count',
            'category': 'item.category',
            'custom_status': 'item.custom_status',
            'selected_product_type': 'selectedProductTypes',
            'is_authenticated': 'isAuthenticated',
            'is_boss': 'isBoss',
            'dropzone_upload': 'DropzoneUpload',
            'Dropzone_upload': 'DropzoneUpload',
            'get_user_media': 'getUserMedia',
            'renderError': 'render_error',
            'use_navigate': 'useNavigate'
        }
        
        # 导入修复
        self.import_fixes = {
            'use_navigate': 'useNavigate'
        }
    
    def create_backup(self):
        """创建源代码备份"""
        if self.src_dir.exists():
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            shutil.copytree(self.src_dir, self.backup_dir / 'src')
            print(f"✅ 备份已创建: {self.backup_dir}")
    
    def fix_html_form_attributes(self, content, file_path):
        """修复HTML表单属性"""
        fixes = 0
        
        # 只在HTML form元素上修复
        for snake_attr, camel_attr in self.html_form_fixes.items():
            # 匹配 <form ... on_submit=... >
            pattern = rf'(<form[^>]*?)\b{snake_attr}='
            if re.search(pattern, content):
                content = re.sub(pattern, rf'\1{camel_attr}=', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'html_form_attribute',
                    'from': snake_attr,
                    'to': camel_attr
                })
        
        return content, fixes
    
    def fix_component_props(self, content, file_path):
        """修复自定义组件属性"""
        fixes = 0
        
        # 自定义组件使用蛇形命名
        component_patterns = [
            r'<SkuSellForm[^>]*',
            r'<SkuDestroyForm[^>]*',
            r'<SkuAdjustForm[^>]*',
            r'<MobileInput[^>]*',
            r'<MobileSelect[^>]*',
            r'<MobileButton[^>]*'
        ]
        
        for camel_prop, snake_prop in self.component_prop_fixes.items():
            for pattern in component_patterns:
                # 在组件标签内查找驼峰属性并替换为蛇形
                component_match = re.search(pattern, content)
                if component_match:
                    component_content = component_match.group(0)
                    if f'{camel_prop}=' in component_content:
                        content = content.replace(f'{camel_prop}=', f'{snake_prop}=')
                        fixes += 1
                        self.fixes_applied.append({
                            'file': str(file_path),
                            'type': 'component_prop',
                            'from': camel_prop,
                            'to': snake_prop
                        })
        
        return content, fixes
    
    def fix_dom_api_calls(self, content, file_path):
        """修复DOM API调用"""
        fixes = 0
        
        for snake_api, camel_api in self.dom_api_fixes.items():
            # 修复属性访问
            pattern = rf'\.{re.escape(snake_api)}\b'
            if re.search(pattern, content):
                content = re.sub(pattern, f'.{camel_api}', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'dom_api',
                    'from': snake_api,
                    'to': camel_api
                })
        
        return content, fixes
    
    def fix_variable_references(self, content, file_path):
        """修复变量引用"""
        fixes = 0
        
        for wrong_var, correct_var in self.variable_fixes.items():
            # 修复变量引用
            pattern = rf'\b{re.escape(wrong_var)}\b'
            if re.search(pattern, content):
                content = re.sub(pattern, correct_var, content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'variable_reference',
                    'from': wrong_var,
                    'to': correct_var
                })
        
        return content, fixes
    
    def fix_import_statements(self, content, file_path):
        """修复导入语句"""
        fixes = 0
        
        # 修复错误的导入
        for snake_import, camel_import in self.import_fixes.items():
            pattern = rf'import.*{snake_import}.*from'
            if re.search(pattern, content):
                content = re.sub(rf'\b{snake_import}\b', camel_import, content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'import_fix',
                    'from': snake_import,
                    'to': camel_import
                })
        
        return content, fixes
    
    def fix_unused_variables(self, content, file_path):
        """移除未使用的变量"""
        fixes = 0
        
        # 移除未使用的变量声明
        unused_patterns = [
            r'const\s+base_color\s*=.*?;',
            r'const\s+total\s*=.*?;',
            r'const\s+Label\s*=.*?;',
            r'const\s+loading\s*=.*?;',
            r'const\s+inventory_status\s*=.*?;',
            r'const\s+isAuthenticated\s*=.*?;',
            r'const\s+isBoss\s*=.*?;',
            r'const\s+dropzone_upload\s*=.*?;',
            r'const\s+Dropzone_upload\s*=.*?;',
            r'const\s+get_user_media\s*=.*?;',
            r'const\s+use_navigate\s*=.*?;'
        ]
        
        for pattern in unused_patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, '', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'unused_variable',
                    'pattern': pattern
                })
        
        return content, fixes
    
    def fix_jsx_elements(self, content, file_path):
        """修复JSX元素问题"""
        fixes = 0
        
        # 移除不存在的JSX元素
        jsx_fixes = [
            r'<inventory_status[^>]*>[^<]*</inventory_status>',
            r'<dropzone_upload[^>]*>[^<]*</dropzone_upload>',
            r'<dropzone_upload[^>]*/?>'
        ]
        
        for pattern in jsx_fixes:
            if re.search(pattern, content):
                content = re.sub(pattern, '', content)
                fixes += 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'jsx_element_fix',
                    'pattern': pattern
                })
        
        return content, fixes
    
    def fix_usedevice_detection(self, content, file_path):
        """专门修复useDeviceDetection文件的问题"""
        fixes = 0
        
        if 'useDeviceDetection.tsx' in str(file_path):
            # 完全重写这个文件来解决重复声明问题
            new_content = '''import { useState, useEffect } from 'react';

interface DeviceInfo {
  is_mobile: boolean;
  is_tablet: boolean;
  is_desktop: boolean;
  screen_width: number;
  screen_height: number;
  user_agent: string;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [device_info, set_device_info] = useState<DeviceInfo>({
    is_mobile: false,
    is_tablet: false,
    is_desktop: true,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    user_agent: navigator.userAgent
  });

  useEffect(() => {
    const detect_device = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const user_agent = navigator.userAgent;
      
      const is_mobile = width <= 768;
      const is_tablet = width > 768 && width <= 1024;
      const is_desktop = width > 1024;
      
      set_device_info({
        is_mobile,
        is_tablet,
        is_desktop,
        screen_width: width,
        screen_height: height,
        user_agent
      });
    };

    detect_device();
    window.addEventListener('resize', detect_device);
    
    return () => {
      window.removeEventListener('resize', detect_device);
    };
  }, []);

  return device_info;
};

export default useDeviceDetection;
'''
            
            if content != new_content:
                content = new_content
                fixes = 1
                self.fixes_applied.append({
                    'file': str(file_path),
                    'type': 'complete_rewrite',
                    'description': 'Rewrote useDeviceDetection to fix duplicate declarations'
                })
        
        return content, fixes
    
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            total_fixes = 0
            
            # 应用各种修复
            content, fixes = self.fix_usedevice_detection(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_html_form_attributes(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_component_props(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_dom_api_calls(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_variable_references(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_import_statements(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_unused_variables(content, file_path)
            total_fixes += fixes
            
            content, fixes = self.fix_jsx_elements(content, file_path)
            total_fixes += fixes
            
            # 如果有修改，写回文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 修复文件: {file_path} ({total_fixes} 个问题)")
            
            return total_fixes
            
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            return 0
    
    def run(self):
        """运行修复程序"""
        print("🔧 开始最终轮错误修复...")
        
        # 创建备份
        self.create_backup()
        
        # 处理所有TypeScript/TSX文件
        total_fixes = 0
        file_count = 0
        
        for file_path in self.src_dir.rglob('*.ts*'):
            if file_path.is_file():
                fixes = self.process_file(file_path)
                total_fixes += fixes
                if fixes > 0:
                    file_count += 1
        
        # 生成报告
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_fixes': total_fixes,
            'files_modified': file_count,
            'backup_location': str(self.backup_dir),
            'fixes_applied': self.fixes_applied
        }
        
        with open('final_round_fix_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📊 最终轮修复完成!")
        print(f"   总修复数: {total_fixes}")
        print(f"   修改文件: {file_count}")
        print(f"   备份位置: {self.backup_dir}")
        print(f"   详细报告: final_round_fix_report.json")
        print(f"\n🔍 请运行 'npm run build' 检查最终错误数量")

if __name__ == '__main__':
    fixer = FinalRoundFixer()
    fixer.run()