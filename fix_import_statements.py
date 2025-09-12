#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复导入语句中的驼峰命名
"""

import os
import re
from pathlib import Path

class ImportStatementsFixer:
    def __init__(self, project_root: str = "d:\\shuijing ERP"):
        self.project_root = Path(project_root)
        self.changes_log = []
        
        # 导入语句中需要修复的函数名映射
        self.import_mappings = {
            "createSuccessResponse": "create_success_response",
            "createErrorResponse": "create_error_response",
            "convertFromApiFormat": "convert_from_api_format",
            "convertToApiFormat": "convert_to_api_format",
            "filterSensitiveFields": "filter_sensitive_fields",
            "validateFieldNaming": "validate_field_naming",
            "batchConvertFields": "batch_convert_fields",
            "camelToSnake": "camel_to_snake",
            "snakeToCamel": "snake_to_camel",
            "checkAIHealth": "check_ai_health",
            "parseCrystalPurchaseDescription": "parse_crystal_purchase_description",
            "parsePurchaseDescription": "parse_purchase_description",
            "chatWithAssistant": "chat_with_assistant",
            "getBusinessInsights": "get_business_insights",
            "testDatabaseConnection": "test_database_connection",
            "closeDatabaseConnection": "close_database_connection",
            "checkDatabaseHealth": "check_database_health",
            "isPrismaDecimal": "is_prisma_decimal",
            "convertPrismaDecimal": "convert_prisma_decimal",
            "convertNumericField": "convert_numeric_field",
            "isPortAvailable": "is_port_available",
            "getAvailablePort": "get_available_port",
            "checkNetworkHealth": "check_network_health",
            "generateMaterialSignature": "generate_material_signature",
            "generateSkuHash": "generate_sku_hash",
            "generateSkuCode": "generate_sku_code",
            "generateSkuName": "generate_sku_name",
            "findOrCreateSku": "find_or_create_sku",
            "createSkuInventoryLog": "create_sku_inventory_log",
            "decreaseSkuQuantity": "decrease_sku_quantity",
            "adjustSkuQuantity": "adjust_sku_quantity",
            "getSkuDetails": "get_sku_details",
            "getSkuList": "get_sku_list",
            "calculateRemainingQuantity": "calculate_remaining_quantity",
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
        """修复单个文件中的导入语句"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes_count = 0
            
            # 修复导入语句中的函数名
            for old_name, new_name in self.import_mappings.items():
                # 匹配导入语句中的函数名
                patterns = [
                    # import { functionName } from '...'
                    rf'(import\s*{{[^}}]*?)\b{re.escape(old_name)}\b([^}}]*}}\s*from)',
                    # import { ..., functionName, ... } from '...'
                    rf'(import\s*{{[^}}]*,\s*)\b{re.escape(old_name)}\b(\s*[,}}][^}}]*}}\s*from)',
                    # import { functionName, ... } from '...'
                    rf'(import\s*{{\s*)\b{re.escape(old_name)}\b(\s*,[^}}]*}}\s*from)',
                ]
                
                for pattern in patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        # 替换匹配的函数名
                        old_match = match.group(0)
                        new_match = old_match.replace(old_name, new_name)
                        content = content.replace(old_match, new_match)
                        changes_count += 1
                        self.log(f"修复导入语句 {old_name} -> {new_name} in {file_path}")
            
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
        self.log("开始修复导入语句中的驼峰命名...")
        
        target_files = self.get_target_files()
        self.log(f"找到 {len(target_files)} 个目标文件")
        
        total_changes = 0
        processed_files = 0
        
        for file_path in target_files:
            changes = self.fix_file(file_path)
            if changes > 0:
                total_changes += changes
                processed_files += 1
        
        self.log(f"修复完成: {processed_files} 个文件被修改，共 {total_changes} 处导入语句被修复")
        
        return {
            "total_files_processed": len(target_files),
            "files_modified": processed_files,
            "total_changes": total_changes,
        }

if __name__ == "__main__":
    fixer = ImportStatementsFixer()
    result = fixer.run()
    
    print(f"\n=== 导入语句修复完成 ===")
    print(f"共处理文件: {result['total_files_processed']}")
    print(f"修改文件: {result['files_modified']}")
    print(f"修复导入: {result['total_changes']} 处")
    
    if result['files_modified'] > 0:
        print("\n建议重新运行 TypeScript 编译检查:")
        print("cd backend && npx tsc --noEmit")