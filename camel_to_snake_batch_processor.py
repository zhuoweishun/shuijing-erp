#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
谨慎的驼峰命名批量转换为蛇形命名处理脚本
用于将项目中确认的业务逻辑驼峰定义统一转换为蛇形命名

特点：
1. 极度谨慎：只修改白名单中确认的业务逻辑定义
2. 精确匹配：使用精确的正则表达式避免误修改
3. 安全备份：处理前自动备份所有文件
4. 详细日志：记录每一个修改操作
5. 干运行模式：支持预览修改而不实际执行
"""

import os
import re
import json
import shutil
from datetime import datetime
from typing import Dict, List, Tuple, Set
from pathlib import Path

class CamelToSnakeBatchProcessor:
    def __init__(self, project_root: str = "d:\\shuijing ERP"):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / "backups" / "camel_to_snake_fixes"
        self.log_file = self.project_root / "camel_to_snake_conversion_log.txt"
        self.changes_log = []
        
        # 确认可以修改的业务逻辑定义白名单
        self.function_mappings = {
            # 工具函数
            "camelToSnake": "camel_to_snake",
            "snakeToCamel": "snake_to_camel",
            "formatAIParseResult": "format_ai_parse_result",
            "validateAIParseResult": "validate_ai_parse_result",
            "validateFieldNaming": "validate_field_naming",
            "batchConvertFields": "batch_convert_fields",
            "convertToApiFormat": "convert_to_api_format",
            "convertFromApiFormat": "convert_from_api_format",
            
            # SKU相关函数
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
            
            # 数据库相关函数
            "testDatabaseConnection": "test_database_connection",
            "closeDatabaseConnection": "close_database_connection",
            "checkDatabaseHealth": "check_database_health",
            
            # AI相关函数
            "checkAIHealth": "check_ai_health",
            "parseCrystalPurchaseDescription": "parse_crystal_purchase_description",
            "parsePurchaseDescription": "parse_purchase_description",
            "chatWithAssistant": "chat_with_assistant",
            "getBusinessInsights": "get_business_insights",
            
            # 错误处理函数
            "createErrorResponse": "create_error_response",
            "createSuccessResponse": "create_success_response",
            
            # 数据转换函数
            "isPrismaDecimal": "is_prisma_decimal",
            "convertPrismaDecimal": "convert_prisma_decimal",
            "convertNumericField": "convert_numeric_field",
            "filterSensitiveFields": "filter_sensitive_fields",
            
            # 网络相关函数
            "isPortAvailable": "is_port_available",
            "getAvailablePort": "get_available_port",
            "checkNetworkHealth": "check_network_health",
        }
        
        # 接口/类型定义映射
        self.interface_mappings = {
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
            "FinishedProduct": "finished_product",
            "FinishedProductMaterialUsage": "finished_product_material_usage",
            "MaterialUsageRequest": "material_usage_request",
            "CostCalculationRequest": "cost_calculation_request",
            "CostCalculationResponse": "cost_calculation_response",
            "AvailableMaterial": "available_material",
            "FinishedProductCreateRequest": "finished_product_create_request",
            "ProductionFormData": "production_form_data",
            "BatchProductInfo": "batch_product_info",
            "BatchProductCreateRequest": "batch_product_create_request",
            "BatchProductCreateResponse": "batch_product_create_response",
            "SkuItem": "sku_item",
            "MaterialTrace": "material_trace",
            "TraceNode": "trace_node",
            "SkuTraceResponse": "sku_trace_response",
            "SkuInventoryLog": "sku_inventory_log",
            "SkuListParams": "sku_list_params",
            "SellData": "sell_data",
            "DestroyData": "destroy_data",
            "SkuMaterialInfo": "sku_material_info",
            "AdjustData": "adjust_data",
            "RestockData": "restock_data",
            "RestockInfo": "restock_info",
            "RestockMaterial": "restock_material",
            "RestockInfoResponse": "restock_info_response",
            "RestockResponse": "restock_response",
            "HistoryParams": "history_params",
            "SkuPermissions": "sku_permissions",
            "SkuListResponse": "sku_list_response",
            "SkuDetailResponse": "sku_detail_response",
            "SkuHistoryResponse": "sku_history_response",
            "CustomerNote": "customer_note",
            "CustomerPurchase": "customer_purchase",
            "CustomerCreateRequest": "customer_create_request",
            "CustomerListParams": "customer_list_params",
            "CustomerListResponse": "customer_list_response",
            "CustomerAnalytics": "customer_analytics",
            "CustomerAnalyticsParams": "customer_analytics_params",
            "DashboardStats": "dashboard_stats",
            "RecentPurchase": "recent_purchase",
            "RecentMaterial": "recent_material",
            "SupplierStat": "supplier_stat",
            "DashboardResponse": "dashboard_response",
        }
        
        # 类定义映射
        self.class_mappings = {
            "AIService": "ai_service",
            "ErrorHandler": "error_handler",
            "ApiClient": "api_client",
        }
        
        # 常量定义映射
        self.constant_mappings = {
            "COMPLETE_FIELD_MAPPINGS": "complete_field_mappings",
            "REVERSE_FIELD_MAPPINGS": "reverse_field_mappings",
            "REFUND_REASON_LABELS": "refund_reason_labels",
            "DIAMETER_CONFIG": "diameter_config",
            "SPECIFICATION_CONFIG": "specification_config",
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
        
        # Schema定义映射
        self.schema_mappings = {
            "createUserSchema": "create_user_schema",
            "updateUserSchema": "update_user_schema",
            "updateProfileSchema": "update_profile_schema",
            "createSupplierSchema": "create_supplier_schema",
            "deleteImagesSchema": "delete_images_schema",
            "adjustSchema": "adjust_schema",
            "sellSchema": "sell_schema",
        }
        
        # 绝对不能修改的标准API黑名单
        self.blacklist_patterns = {
            # JavaScript标准方法
            r'\blocaleCompare\b', r'\bgetTime\b', r'\btoString\b', r'\bvalueOf\b',
            r'\bsetTimeout\b', r'\bclearTimeout\b', r'\bsetInterval\b', r'\bclearInterval\b',
            r'\bparseInt\b', r'\bparseFloat\b', r'\bisNaN\b', r'\bisFinite\b',
            r'\bencodeURI\b', r'\bdecodeURI\b', r'\bencodeURIComponent\b', r'\bdecodeURIComponent\b',
            
            # Object方法
            r'\bObject\.keys\b', r'\bObject\.values\b', r'\bObject\.entries\b',
            r'\bObject\.assign\b', r'\bObject\.create\b', r'\bObject\.freeze\b',
            r'\bObject\.seal\b', r'\bObject\.defineProperty\b', r'\bObject\.getOwnPropertyNames\b',
            
            # Array方法
            r'\bArray\.isArray\b', r'\bArray\.from\b', r'\bArray\.of\b',
            r'\b\.push\b', r'\b\.pop\b', r'\b\.shift\b', r'\b\.unshift\b',
            r'\b\.slice\b', r'\b\.splice\b', r'\b\.concat\b', r'\b\.join\b',
            r'\b\.reverse\b', r'\b\.sort\b', r'\b\.indexOf\b', r'\b\.lastIndexOf\b',
            r'\b\.includes\b', r'\b\.find\b', r'\b\.findIndex\b', r'\b\.filter\b',
            r'\b\.map\b', r'\b\.reduce\b', r'\b\.reduceRight\b', r'\b\.forEach\b',
            r'\b\.some\b', r'\b\.every\b',
            
            # String方法
            r'\b\.charAt\b', r'\b\.charCodeAt\b', r'\b\.substring\b', r'\b\.substr\b',
            r'\b\.toLowerCase\b', r'\b\.toUpperCase\b', r'\b\.trim\b', r'\b\.trimStart\b',
            r'\b\.trimEnd\b', r'\b\.split\b', r'\b\.replace\b', r'\b\.match\b',
            r'\b\.search\b', r'\b\.startsWith\b', r'\b\.endsWith\b', r'\b\.padStart\b',
            r'\b\.padEnd\b', r'\b\.repeat\b',
            
            # Date方法
            r'\bDate\.now\b', r'\bDate\.parse\b', r'\bDate\.UTC\b',
            r'\b\.getFullYear\b', r'\b\.getMonth\b', r'\b\.getDate\b', r'\b\.getDay\b',
            r'\b\.getHours\b', r'\b\.getMinutes\b', r'\b\.getSeconds\b', r'\b\.getMilliseconds\b',
            r'\b\.setFullYear\b', r'\b\.setMonth\b', r'\b\.setDate\b', r'\b\.setHours\b',
            r'\b\.setMinutes\b', r'\b\.setSeconds\b', r'\b\.setMilliseconds\b',
            r'\b\.toISOString\b', r'\b\.toDateString\b', r'\b\.toTimeString\b',
            r'\b\.toLocaleDateString\b', r'\b\.toLocaleTimeString\b', r'\b\.toLocaleString\b',
            
            # Math方法
            r'\bMath\.abs\b', r'\bMath\.ceil\b', r'\bMath\.floor\b', r'\bMath\.round\b',
            r'\bMath\.max\b', r'\bMath\.min\b', r'\bMath\.random\b', r'\bMath\.sqrt\b',
            r'\bMath\.pow\b', r'\bMath\.sin\b', r'\bMath\.cos\b', r'\bMath\.tan\b',
            
            # JSON方法
            r'\bJSON\.parse\b', r'\bJSON\.stringify\b',
            
            # Promise方法
            r'\bPromise\.all\b', r'\bPromise\.race\b', r'\bPromise\.resolve\b',
            r'\bPromise\.reject\b', r'\bPromise\.allSettled\b',
            r'\b\.then\b', r'\b\.catch\b', r'\b\.finally\b',
            
            # DOM API
            r'\bdocument\.getElementById\b', r'\bdocument\.querySelector\b',
            r'\bdocument\.querySelectorAll\b', r'\bdocument\.createElement\b',
            r'\b\.addEventListener\b', r'\b\.removeEventListener\b',
            r'\b\.appendChild\b', r'\b\.removeChild\b', r'\b\.insertBefore\b',
            r'\b\.getAttribute\b', r'\b\.setAttribute\b', r'\b\.removeAttribute\b',
            r'\b\.classList\.add\b', r'\b\.classList\.remove\b', r'\b\.classList\.toggle\b',
            
            # Window/Global API
            r'\bwindow\.location\b', r'\bwindow\.history\b', r'\bwindow\.navigator\b',
            r'\blocalStorage\.getItem\b', r'\blocalStorage\.setItem\b',
            r'\bsessionStorage\.getItem\b', r'\bsessionStorage\.setItem\b',
            
            # Node.js API
            r'\brequire\b', r'\bmodule\.exports\b', r'\bprocess\.env\b',
            r'\b__dirname\b', r'\b__filename\b',
            
            # React API
            r'\buseState\b', r'\buseEffect\b', r'\buseContext\b', r'\buseReducer\b',
            r'\buseCallback\b', r'\buseMemo\b', r'\buseRef\b', r'\buseImperativeHandle\b',
            r'\buseLayoutEffect\b', r'\buseDebugValue\b',
            r'\bReact\.createElement\b', r'\bReact\.Component\b', r'\bReact\.PureComponent\b',
            
            # 第三方库常见API
            r'\baxios\.get\b', r'\baxios\.post\b', r'\baxios\.put\b', r'\baxios\.delete\b',
            r'\blodash\b', r'\bmoment\b', r'\bdayjs\b',
        }
        
        # 需要处理的文件扩展名
        self.target_extensions = {'.ts', '.tsx', '.js', '.jsx'}
        
        # 排除的目录
        self.exclude_dirs = {
            'node_modules', '.git', 'dist', 'build', 'coverage',
            'backups', 'uploads', 'logs', '.trae'
        }
    
    def create_backup(self) -> str:
        """创建项目备份"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / timestamp
        backup_path.mkdir(parents=True, exist_ok=True)
        
        self.log(f"创建备份到: {backup_path}")
        
        # 备份src和backend/src目录
        src_dirs = [
            self.project_root / "src",
            self.project_root / "backend" / "src",
            self.project_root / "shared"
        ]
        
        for src_dir in src_dirs:
            if src_dir.exists():
                dest_dir = backup_path / src_dir.relative_to(self.project_root)
                shutil.copytree(src_dir, dest_dir, ignore=shutil.ignore_patterns('node_modules'))
                self.log(f"备份完成: {src_dir} -> {dest_dir}")
        
        return str(backup_path)
    
    def log(self, message: str):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        self.changes_log.append(log_entry)
    
    def save_log(self):
        """保存日志到文件"""
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(self.changes_log))
    
    def is_blacklisted(self, content: str, old_name: str) -> bool:
        """检查是否在黑名单中"""
        for pattern in self.blacklist_patterns:
            if re.search(pattern, content):
                # 如果内容包含黑名单模式，进一步检查是否是我们要修改的名称
                if old_name in content:
                    # 检查上下文，确保不是标准API调用
                    context_patterns = [
                        rf'\b{re.escape(old_name)}\s*\(',  # 函数调用
                        rf'\binterface\s+{re.escape(old_name)}\b',  # 接口定义
                        rf'\btype\s+{re.escape(old_name)}\b',  # 类型定义
                        rf'\bclass\s+{re.escape(old_name)}\b',  # 类定义
                        rf'\bconst\s+{re.escape(old_name)}\b',  # 常量定义
                        rf'\bfunction\s+{re.escape(old_name)}\b',  # 函数定义
                        rf'\bexport\s+.*{re.escape(old_name)}\b',  # 导出定义
                    ]
                    
                    for ctx_pattern in context_patterns:
                        if re.search(ctx_pattern, content):
                            return False  # 这是我们的业务逻辑定义，不是标准API
                    
                    return True  # 可能是标准API调用，跳过
        return False
    
    def process_file(self, file_path: Path, dry_run: bool = True) -> List[Tuple[str, str, int]]:
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            changes = []
            
            # 合并所有映射
            all_mappings = {
                **self.function_mappings,
                **self.interface_mappings,
                **self.class_mappings,
                **self.constant_mappings,
                **self.schema_mappings
            }
            
            for old_name, new_name in all_mappings.items():
                if old_name in content:
                    # 检查是否在黑名单中
                    if self.is_blacklisted(content, old_name):
                        self.log(f"跳过黑名单项: {old_name} in {file_path}")
                        continue
                    
                    # 精确匹配模式
                    patterns = [
                        # 函数定义: function functionName( 或 export function functionName(
                        (rf'\b(export\s+)?function\s+{re.escape(old_name)}\b', rf'\1function {new_name}'),
                        # 箭头函数: const functionName = ( 或 export const functionName = (
                        (rf'\b(export\s+)?const\s+{re.escape(old_name)}\s*=', rf'\1const {new_name} ='),
                        # 接口定义: interface InterfaceName 或 export interface InterfaceName
                        (rf'\b(export\s+)?interface\s+{re.escape(old_name)}\b', rf'\1interface {new_name}'),
                        # 类型定义: type TypeName 或 export type TypeName
                        (rf'\b(export\s+)?type\s+{re.escape(old_name)}\b', rf'\1type {new_name}'),
                        # 类定义: class ClassName 或 export class ClassName
                        (rf'\b(export\s+)?class\s+{re.escape(old_name)}\b', rf'\1class {new_name}'),
                        # 常量定义: const CONSTANT_NAME 或 export const CONSTANT_NAME
                        (rf'\b(export\s+)?const\s+{re.escape(old_name)}\b', rf'\1const {new_name}'),
                        # 变量定义: let/var variableName
                        (rf'\b(let|var)\s+{re.escape(old_name)}\b', rf'\1 {new_name}'),
                        # 对象属性: { functionName: ... } 或 { functionName, ... }
                        (rf'\{{\s*{re.escape(old_name)}\s*[,:}}]', lambda m: m.group(0).replace(old_name, new_name)),
                        # 导入/导出: import { functionName } 或 export { functionName }
                        (rf'\{{\s*([^}}]*\s+)?{re.escape(old_name)}(\s+[^}}]*)?\s*\}}', 
                         lambda m: m.group(0).replace(old_name, new_name)),
                        # 函数调用: functionName( - 只在确定是我们的函数时
                        (rf'\b{re.escape(old_name)}\s*\(', rf'{new_name}('),
                        # 类型注解: : InterfaceName 或 <TypeName>
                        (rf':\s*{re.escape(old_name)}\b', rf': {new_name}'),
                        (rf'<{re.escape(old_name)}\b', rf'<{new_name}'),
                        # 泛型约束: extends InterfaceName
                        (rf'\bextends\s+{re.escape(old_name)}\b', rf'extends {new_name}'),
                        # 实现接口: implements InterfaceName
                        (rf'\bimplements\s+{re.escape(old_name)}\b', rf'implements {new_name}'),
                    ]
                    
                    for pattern, replacement in patterns:
                        if callable(replacement):
                            new_content = re.sub(pattern, replacement, content)
                        else:
                            new_content = re.sub(pattern, replacement, content)
                        
                        if new_content != content:
                            count = len(re.findall(pattern, content))
                            changes.append((old_name, new_name, count))
                            content = new_content
                            self.log(f"替换 {old_name} -> {new_name} ({count}次) in {file_path}")
            
            # 如果有变化且不是干运行，写入文件
            if content != original_content and not dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.log(f"文件已更新: {file_path}")
            
            return changes
            
        except Exception as e:
            self.log(f"处理文件失败 {file_path}: {str(e)}")
            return []
    
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
    
    def run(self, dry_run: bool = True) -> Dict:
        """运行批量处理"""
        self.log(f"开始批量处理 (干运行: {dry_run})")
        
        if not dry_run:
            backup_path = self.create_backup()
            self.log(f"备份创建完成: {backup_path}")
        
        target_files = self.get_target_files()
        self.log(f"找到 {len(target_files)} 个目标文件")
        
        total_changes = {}
        processed_files = 0
        
        for file_path in target_files:
            changes = self.process_file(file_path, dry_run)
            if changes:
                total_changes[str(file_path)] = changes
                processed_files += 1
        
        self.log(f"处理完成: {processed_files} 个文件被修改")
        
        # 保存详细报告
        report = {
            "timestamp": datetime.now().isoformat(),
            "dry_run": dry_run,
            "total_files_processed": len(target_files),
            "files_modified": processed_files,
            "changes": total_changes,
            "log": self.changes_log
        }
        
        report_file = self.project_root / f"camel_to_snake_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.save_log()
        
        return report

def main():
    """主函数"""
    processor = CamelToSnakeBatchProcessor()
    
    print("=== 谨慎的驼峰转蛇形批量处理工具 ===")
    print("1. 干运行 (预览修改)")
    print("2. 实际执行修改")
    print("3. 退出")
    
    choice = input("请选择操作 (1-3): ").strip()
    
    if choice == "1":
        print("\n开始干运行...")
        report = processor.run(dry_run=True)
        print(f"\n预览完成！共发现 {report['files_modified']} 个文件需要修改")
        print(f"详细报告已保存")
        
    elif choice == "2":
        confirm = input("确认要执行实际修改吗？这将修改源代码文件 (y/N): ").strip().lower()
        if confirm == 'y':
            print("\n开始实际修改...")
            report = processor.run(dry_run=False)
            print(f"\n修改完成！共修改了 {report['files_modified']} 个文件")
            print(f"备份和详细报告已保存")
        else:
            print("操作已取消")
            
    elif choice == "3":
        print("退出")
        
    else:
        print("无效选择")

if __name__ == "__main__":
    main()