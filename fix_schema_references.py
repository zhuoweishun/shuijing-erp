#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复Schema和函数调用的剩余引用
"""

import os
import re
from pathlib import Path

class SchemaReferencesFixer:
    def __init__(self, project_root: str = "d:\\shuijing ERP"):
        self.project_root = Path(project_root)
        self.changes_log = []
        
        # Schema变量引用映射
        self.schema_references = {
            "createUserSchema": "create_user_schema",
            "updateUserSchema": "update_user_schema",
            "updateProfileSchema": "update_profile_schema",
            "createSupplierSchema": "create_supplier_schema",
            "deleteImagesSchema": "delete_images_schema",
            "adjustSchema": "adjust_schema",
            "sellSchema": "sell_schema",
        }
        
        # 函数调用引用映射
        self.function_call_references = {
            "convertToApiFormat": "convert_to_api_format",
            "convertFromApiFormat": "convert_from_api_format",
            "filterSensitiveFields": "filter_sensitive_fields",
            "createErrorResponse": "create_error_response",
            "createSuccessResponse": "create_success_response",
            "validateFieldNaming": "validate_field_naming",
            "batchConvertFields": "batch_convert_fields",
            "camelToSnake": "camel_to_snake",
            "snakeToCamel": "snake_to_camel",
        }
        
        # 需要处理的文件扩展名
        self.target_extensions = {'.ts', '.tsx', '.js', '.jsx'}
        
        # 排除的目录
        self.exclude_dirs = {
            'node_modules', '.git', 'dist', 'build', 'coverage',
            'backups', 'uploads', 'logs', '.trae', '__pycache__'
        }
    
    def log(self, message: str):
        """记录日志"""
        print(message)
        self.changes_log.append(message)
    
    def fix_file(self, file_path: Path) -> int:
        """修复单个文件中的引用"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes_count = 0
            
            # 修复Schema变量引用
            for old_name, new_name in self.schema_references.items():
                # 匹配变量使用（不是定义）
                patterns = [
                    rf'\b{re.escape(old_name)}(?=\s*\.)',  # schema.parse() 调用
                    rf'\b{re.escape(old_name)}(?=\s*\()',   # schema() 调用
                    rf'\b{re.escape(old_name)}(?=\s*;)',    # 语句结尾
                    rf'\b{re.escape(old_name)}(?=\s*,)',    # 逗号分隔
                    rf'\b{re.escape(old_name)}(?=\s*\))',   # 括号结尾
                ]
                
                for pattern in patterns:
                    if re.search(pattern, content):
                        new_content = re.sub(pattern, new_name, content)
                        if new_content != content:
                            count = len(re.findall(pattern, content))
                            changes_count += count
                            content = new_content
                            self.log(f"修复Schema引用 {old_name} -> {new_name} ({count}次) in {file_path}")
            
            # 修复函数调用引用
            for old_name, new_name in self.function_call_references.items():
                # 匹配函数调用和方法调用
                patterns = [
                    rf'\b{re.escape(old_name)}(?=\s*\()',     # 直接函数调用
                    rf'(?<=\.)map\s*\(\s*{re.escape(old_name)}\s*\)',  # .map(functionName)
                    rf'(?<=\.)filter\s*\(\s*{re.escape(old_name)}\s*\)',  # .filter(functionName)
                    rf'(?<=\.)forEach\s*\(\s*{re.escape(old_name)}\s*\)',  # .forEach(functionName)
                ]
                
                for pattern in patterns:
                    if re.search(pattern, content):
                        if 'map\s*\(' in pattern or 'filter\s*\(' in pattern or 'forEach\s*\(' in pattern:
                            # 特殊处理数组方法
                            new_content = re.sub(rf'({re.escape(old_name)})(?=\s*\))', new_name, content)
                        else:
                            new_content = re.sub(pattern, new_name, content)
                        
                        if new_content != content:
                            count = len(re.findall(pattern, content))
                            changes_count += count
                            content = new_content
                            self.log(f"修复函数调用 {old_name} -> {new_name} ({count}次) in {file_path}")
            
            # 特殊处理 .map(convertToApiFormat) 这种情况
            special_patterns = [
                (r'\.map\s*\(\s*convertToApiFormat\s*\)', '.map(convert_to_api_format)'),
                (r'\.filter\s*\(\s*convertToApiFormat\s*\)', '.filter(convert_to_api_format)'),
                (r'\.map\s*\(\s*convertFromApiFormat\s*\)', '.map(convert_from_api_format)'),
                (r'\.filter\s*\(\s*convertFromApiFormat\s*\)', '.filter(convert_from_api_format)'),
            ]
            
            for pattern, replacement in special_patterns:
                if re.search(pattern, content):
                    new_content = re.sub(pattern, replacement, content)
                    if new_content != content:
                        count = len(re.findall(pattern, content))
                        changes_count += count
                        content = new_content
                        self.log(f"修复特殊函数调用 {pattern} -> {replacement} ({count}次) in {file_path}")
            
            # 如果有变化，写入文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.log(f"文件已更新: {file_path}")
            
            return changes_count
            
        except Exception as e:
            self.log(f"处理文件失败 {file_path}: {str(e)}")
            return 0
    
    def get_target_files(self) -> list:
        """获取需要处理的文件列表"""
        target_files = []
        
        for root, dirs, files in os.walk(self.project_root):
            # 排除不需要的目录
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs]
            
            for file in files:
                file_path = Path(root) / file
                if file_path.suffix in self.target_extensions:
                    target_files.append(file_path)
        
        return target_files
    
    def run(self):
        """运行修复"""
        self.log("开始修复Schema和函数调用引用...")
        
        target_files = self.get_target_files()
        self.log(f"找到 {len(target_files)} 个目标文件")
        
        total_changes = 0
        processed_files = 0
        
        for file_path in target_files:
            changes = self.fix_file(file_path)
            if changes > 0:
                total_changes += changes
                processed_files += 1
        
        self.log(f"修复完成: {processed_files} 个文件被修改，共 {total_changes} 处引用被修复")
        
        return {
            "total_files_processed": len(target_files),
            "files_modified": processed_files,
            "total_changes": total_changes,
        }

if __name__ == "__main__":
    fixer = SchemaReferencesFixer()
    result = fixer.run()
    
    print(f"\n=== Schema引用修复完成 ===")
    print(f"共处理文件: {result['total_files_processed']}")
    print(f"修改文件: {result['files_modified']}")
    print(f"修复引用: {result['total_changes']} 处")
    
    if result['files_modified'] > 0:
        print("\n建议重新运行 TypeScript 编译检查:")
        print("cd backend && npx tsc --noEmit")