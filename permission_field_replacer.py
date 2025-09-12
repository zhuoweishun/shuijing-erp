#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
权限、角色相关功能字段蛇形命名转换脚本
批量处理权限、角色相关的28个字段的蛇形命名转换
"""

import os
import re
import json
import shutil
from datetime import datetime
from typing import Dict, List, Tuple

# 权限、角色相关字段映射表
FIELD_MAPPINGS = {
    # 用户认证相关
    'username': 'user_name',
    'userId': 'user_id', 
    'userAgent': 'user_agent',
    'loginRequest': 'login_request',
    'loginResponse': 'login_response',
    'lastEditedBy': 'last_edited_by',
    'authToken': 'auth_token',
    
    # 权限控制相关
    'canViewPrice': 'can_view_price',
    'canSell': 'can_sell',
    'canDestroy': 'can_destroy',
    'canAdjust': 'can_adjust',
    'canRefund': 'can_refund',
    'isBoss': 'is_boss',
    'isAuthenticated': 'is_authenticated',
    'isLoading': 'is_loading',
    
    # 认证状态相关
    'INSUFFICIENT_PERMISSIONS': 'insufficient_permissions',
    'INVALID_TOKEN': 'invalid_token',
    'TOKEN_EXPIRED': 'token_expired',
    'UNAUTHORIZED': 'unauthorized',
    'redirectOnAuth': 'redirect_on_auth',
    'AUTH_REDIRECT_ERRORS': 'auth_redirect_errors',
    
    # API认证相关
    'authApi': 'auth_api',
    'userApi': 'user_api',
    'updateProfile': 'update_profile',
    'UserManagement': 'user_management',
    'useAuth': 'use_auth',
    'useSkuPermissions': 'use_sku_permissions',
    'useSkuPermission': 'use_sku_permission',
    'checkSkuPermission': 'check_sku_permission',
    'getSkuPermissions': 'get_sku_permissions',
    'requireRole': 'require_role'
}

class PermissionFieldReplacer:
    def __init__(self, base_dir: str):
        self.base_dir = base_dir
        self.backup_dir = os.path.join(base_dir, f"backup_permission_fields_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        self.report = {
            'start_time': datetime.now().isoformat(),
            'total_files_processed': 0,
            'files_modified': 0,
            'total_replacements': 0,
            'field_replacements': {},
            'modified_files': [],
            'errors': []
        }
        
    def create_backup(self, file_path: str) -> str:
        """创建文件备份"""
        try:
            relative_path = os.path.relpath(file_path, self.base_dir)
            backup_path = os.path.join(self.backup_dir, relative_path)
            backup_folder = os.path.dirname(backup_path)
            
            os.makedirs(backup_folder, exist_ok=True)
            shutil.copy2(file_path, backup_path)
            return backup_path
        except Exception as e:
            self.report['errors'].append(f"备份文件失败 {file_path}: {str(e)}")
            return ""
    
    def should_process_file(self, file_path: str) -> bool:
        """判断是否需要处理该文件"""
        # 排除备份目录和node_modules
        if 'backup_' in file_path or 'node_modules' in file_path or '.git' in file_path:
            return False
        
        # 只处理.ts和.tsx文件
        return file_path.endswith(('.ts', '.tsx'))
    
    def create_replacement_patterns(self) -> List[Tuple[re.Pattern, str, str]]:
        """创建替换模式"""
        patterns = []
        
        for old_field, new_field in FIELD_MAPPINGS.items():
            # 1. 对象属性访问模式 (obj.field)
            patterns.append((
                re.compile(rf'\b(\w+)\.{re.escape(old_field)}\b'),
                rf'\1.{new_field}',
                f'{old_field} (属性访问)'
            ))
            
            # 2. 对象属性定义模式 ({ field: value })
            patterns.append((
                re.compile(rf'\b{re.escape(old_field)}:'),
                f'{new_field}:',
                f'{old_field} (属性定义)'
            ))
            
            # 3. 解构赋值模式 ({ field } = obj)
            patterns.append((
                re.compile(rf'\{{\s*{re.escape(old_field)}\s*\}}'),
                f'{{ {new_field} }}',
                f'{old_field} (解构赋值)'
            ))
            
            # 4. 函数名/变量名模式
            patterns.append((
                re.compile(rf'\b{re.escape(old_field)}\b(?=\s*[=:(,)]|\s*$)'),
                new_field,
                f'{old_field} (变量/函数名)'
            ))
            
            # 5. 导入/导出模式
            patterns.append((
                re.compile(rf'(import|export)\s+\{{[^}}]*\b{re.escape(old_field)}\b[^}}]*\}}'),
                lambda m: m.group(0).replace(old_field, new_field),
                f'{old_field} (导入/导出)'
            ))
            
            # 6. 字符串字面量中的字段名（谨慎处理）
            patterns.append((
                re.compile(rf"(['\"]){re.escape(old_field)}\1"),
                rf"\1{new_field}\1",
                f'{old_field} (字符串字面量)'
            ))
        
        return patterns
    
    def process_file_content(self, content: str, file_path: str) -> Tuple[str, int, Dict[str, int]]:
        """处理文件内容"""
        modified_content = content
        total_replacements = 0
        field_counts = {}
        
        patterns = self.create_replacement_patterns()
        
        for pattern, replacement, field_name in patterns:
            if callable(replacement):
                # 处理lambda函数替换
                matches = list(pattern.finditer(modified_content))
                for match in reversed(matches):  # 从后往前替换避免位置偏移
                    new_text = replacement(match)
                    modified_content = modified_content[:match.start()] + new_text + modified_content[match.end():]
                    count = 1
            else:
                # 处理字符串替换
                new_content, count = pattern.subn(replacement, modified_content)
                modified_content = new_content
            
            if count > 0:
                total_replacements += count
                base_field = field_name.split(' ')[0]
                field_counts[base_field] = field_counts.get(base_field, 0) + count
                print(f"  ✓ {field_name}: {count} 次替换")
        
        return modified_content, total_replacements, field_counts
    
    def process_file(self, file_path: str) -> bool:
        """处理单个文件"""
        try:
            print(f"\n处理文件: {file_path}")
            
            # 读取文件内容
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # 处理内容
            modified_content, replacements, field_counts = self.process_file_content(original_content, file_path)
            
            # 如果有修改，则备份并写入新内容
            if replacements > 0:
                # 创建备份
                backup_path = self.create_backup(file_path)
                
                # 写入修改后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                
                # 更新报告
                self.report['files_modified'] += 1
                self.report['total_replacements'] += replacements
                self.report['modified_files'].append({
                    'file': file_path,
                    'backup': backup_path,
                    'replacements': replacements,
                    'field_counts': field_counts
                })
                
                # 更新字段替换统计
                for field, count in field_counts.items():
                    self.report['field_replacements'][field] = self.report['field_replacements'].get(field, 0) + count
                
                print(f"  ✅ 文件已修改，共 {replacements} 次替换")
                return True
            else:
                print(f"  ⏭️  文件无需修改")
                return False
                
        except Exception as e:
            error_msg = f"处理文件失败 {file_path}: {str(e)}"
            print(f"  ❌ {error_msg}")
            self.report['errors'].append(error_msg)
            return False
    
    def scan_and_process(self) -> None:
        """扫描并处理所有文件"""
        print("🚀 开始权限、角色相关功能字段蛇形命名转换...")
        print(f"📁 工作目录: {self.base_dir}")
        print(f"💾 备份目录: {self.backup_dir}")
        print(f"🔄 需要转换的字段数量: {len(FIELD_MAPPINGS)}")
        
        # 扫描目标目录
        target_dirs = ['src', 'backend/src', 'shared']
        
        for target_dir in target_dirs:
            full_dir = os.path.join(self.base_dir, target_dir)
            if not os.path.exists(full_dir):
                print(f"⚠️  目录不存在，跳过: {full_dir}")
                continue
                
            print(f"\n📂 扫描目录: {full_dir}")
            
            for root, dirs, files in os.walk(full_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    if self.should_process_file(file_path):
                        self.report['total_files_processed'] += 1
                        self.process_file(file_path)
    
    def generate_report(self) -> None:
        """生成转换报告"""
        self.report['end_time'] = datetime.now().isoformat()
        self.report['duration'] = str(datetime.fromisoformat(self.report['end_time']) - datetime.fromisoformat(self.report['start_time']))
        
        # 保存详细报告
        report_file = os.path.join(self.base_dir, f"permission_field_conversion_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, ensure_ascii=False, indent=2)
        
        # 打印摘要报告
        print("\n" + "="*60)
        print("📊 权限、角色相关功能字段蛇形命名转换完成报告")
        print("="*60)
        print(f"⏱️  处理时间: {self.report['duration']}")
        print(f"📁 处理文件总数: {self.report['total_files_processed']}")
        print(f"✏️  修改文件数量: {self.report['files_modified']}")
        print(f"🔄 总替换次数: {self.report['total_replacements']}")
        print(f"📋 详细报告: {report_file}")
        
        if self.report['field_replacements']:
            print("\n🏷️  字段替换统计:")
            sorted_fields = sorted(self.report['field_replacements'].items(), key=lambda x: x[1], reverse=True)
            for field, count in sorted_fields:
                snake_field = FIELD_MAPPINGS.get(field, field)
                print(f"  • {field} → {snake_field}: {count} 次")
        
        if self.report['errors']:
            print(f"\n❌ 错误数量: {len(self.report['errors'])}")
            for error in self.report['errors'][:5]:  # 只显示前5个错误
                print(f"  • {error}")
            if len(self.report['errors']) > 5:
                print(f"  • ... 还有 {len(self.report['errors']) - 5} 个错误")
        
        print("\n✅ 权限、角色相关功能字段蛇形命名转换完成！")
        print(f"💾 原文件已备份到: {self.backup_dir}")

def main():
    """主函数"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("🔧 权限、角色相关功能字段蛇形命名转换工具")
    print(f"📍 当前目录: {base_dir}")
    
    # 确认执行
    response = input("\n⚠️  即将开始批量转换，是否继续？(y/N): ")
    if response.lower() != 'y':
        print("❌ 操作已取消")
        return
    
    # 执行转换
    replacer = PermissionFieldReplacer(base_dir)
    replacer.scan_and_process()
    replacer.generate_report()

if __name__ == "__main__":
    main()