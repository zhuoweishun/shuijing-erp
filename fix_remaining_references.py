#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复剩余的驼峰命名引用
主要处理常量引用和函数调用的遗漏
"""

import os
import re
from pathlib import Path
from typing import Dict, List

class RemainingReferencesFixer:
    def __init__(self, project_root: str = "d:\\shuijing ERP"):
        self.project_root = Path(project_root)
        self.changes_log = []
        
        # 需要修复的常量引用
        self.constant_references = {
            "DIAMETER_CONFIG": "diameter_config",
            "SPECIFICATION_CONFIG": "specification_config",
            "COMPLETE_FIELD_MAPPINGS": "complete_field_mappings",
            "REVERSE_FIELD_MAPPINGS": "reverse_field_mappings",
            "REFUND_REASON_LABELS": "refund_reason_labels",
            "FINANCIAL_RECORD_TYPE_LABELS": "financial_record_type_labels",
            "FINANCIAL_REFERENCE_TYPE_LABELS": "financial_reference_type_labels",
            "FINANCIAL_RECORD_TYPE_COLORS": "financial_record_type_colors",
            "FINANCIAL_RECORD_TYPE_BG_COLORS": "financial_record_type_bg_colors",
            "TRANSACTION_CATEGORY_LABELS": "transaction_category_labels",
            "TRANSACTION_CATEGORY_COLORS": "transaction_category_colors",
            "STALE_PERIOD_LABELS": "stale_period_labels",
            "DOUBAO_CONFIG": "doubao_config",
            "ErrorResponses": "error_responses",
            "NUMERIC_FIELDS": "numeric_fields",
        }
        
        # 需要修复的函数调用引用
        self.function_references = {
            "camelToSnake": "camel_to_snake",
            "snakeToCamel": "snake_to_camel",
            "formatAIParseResult": "format_ai_parse_result",
            "validateAIParseResult": "validate_ai_parse_result",
            "validateFieldNaming": "validate_field_naming",
            "batchConvertFields": "batch_convert_fields",
            "convertToApiFormat": "convert_to_api_format",
            "convertFromApiFormat": "convert_from_api_format",
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
            "testDatabaseConnection": "test_database_connection",
            "closeDatabaseConnection": "close_database_connection",
            "checkDatabaseHealth": "check_database_health",
            "checkAIHealth": "check_ai_health",
            "parseCrystalPurchaseDescription": "parse_crystal_purchase_description",
            "parsePurchaseDescription": "parse_purchase_description",
            "chatWithAssistant": "chat_with_assistant",
            "getBusinessInsights": "get_business_insights",
            "createErrorResponse": "create_error_response",
            "createSuccessResponse": "create_success_response",
            "isPrismaDecimal": "is_prisma_decimal",
            "convertPrismaDecimal": "convert_prisma_decimal",
            "convertNumericField": "convert_numeric_field",
            "filterSensitiveFields": "filter_sensitive_fields",
            "isPortAvailable": "is_port_available",
            "getAvailablePort": "get_available_port",
            "checkNetworkHealth": "check_network_health",
        }
        
        # 需要修复的类型引用
        self.type_references = {
            "ErrorResponse": "error_response",
            "ErrorHandlerConfig": "error_handler_config",
            "RequestConfig": "request_config",
            "AIParseRequest": "ai_parse_request",
            "AIParseResponse": "ai_parse_response",
            "AssistantMessage": "assistant_message",
            "AssistantRequest": "assistant_request",
            "AssistantResponse": "assistant_response",
            "UploadResponse": "upload_response",
            "ApiResponse": "api_response",
            "PaginatedResponse": "paginated_response",
            "QueryParams": "query_params",
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
            
            # 修复常量引用
            for old_name, new_name in self.constant_references.items():
                # 匹配常量使用（不是定义）
                pattern = rf'\b{re.escape(old_name)}\b(?!\s*[=:])'  # 不匹配定义
                if re.search(pattern, content):
                    new_content = re.sub(pattern, new_name, content)
                    if new_content != content:
                        count = len(re.findall(pattern, content))
                        changes_count += count
                        content = new_content
                        self.log(f"修复常量引用 {old_name} -> {new_name} ({count}次) in {file_path}")
            
            # 修复函数调用引用
            for old_name, new_name in self.function_references.items():
                # 匹配函数调用（不是定义）
                pattern = rf'\b{re.escape(old_name)}\s*\('  # 函数调用
                if re.search(pattern, content):
                    new_content = re.sub(pattern, f'{new_name}(', content)
                    if new_content != content:
                        count = len(re.findall(pattern, content))
                        changes_count += count
                        content = new_content
                        self.log(f"修复函数调用 {old_name} -> {new_name} ({count}次) in {file_path}")
            
            # 修复类型引用
            for old_name, new_name in self.type_references.items():
                # 匹配类型使用（不是定义）
                patterns = [
                    rf':\s*{re.escape(old_name)}\b',  # 类型注解
                    rf'<{re.escape(old_name)}\b',     # 泛型
                    rf'\bas\s+{re.escape(old_name)}\b',  # 类型断言
                ]
                
                for pattern in patterns:
                    if re.search(pattern, content):
                        replacement = pattern.replace(re.escape(old_name), new_name)
                        new_content = re.sub(pattern, replacement, content)
                        if new_content != content:
                            count = len(re.findall(pattern, content))
                            changes_count += count
                            content = new_content
                            self.log(f"修复类型引用 {old_name} -> {new_name} ({count}次) in {file_path}")
            
            # 如果有变化，写入文件
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.log(f"文件已更新: {file_path}")
            
            return changes_count
            
        except Exception as e:
            self.log(f"处理文件失败 {file_path}: {str(e)}")
            return 0
    
    def get_target_files(self) -> List[Path]:
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
    
    def run(self) -> Dict:
        """运行修复"""
        self.log("开始修复剩余的驼峰命名引用...")
        
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
            "log": self.changes_log
        }

if __name__ == "__main__":
    fixer = RemainingReferencesFixer()
    result = fixer.run()
    
    print(f"\n=== 修复完成 ===")
    print(f"共处理文件: {result['total_files_processed']}")
    print(f"修改文件: {result['files_modified']}")
    print(f"修复引用: {result['total_changes']} 处")
    
    if result['files_modified'] > 0:
        print("\n建议重新运行 TypeScript 编译检查:")
        print("cd backend && npx tsc --noEmit")