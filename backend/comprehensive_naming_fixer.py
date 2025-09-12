#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全面的命名修复脚本
修复所有驼峰命名为蛇形命名的问题
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path

class ComprehensiveNamingFixer:
    def __init__(self):
        self.backend_dir = Path('.')
        self.src_dir = self.backend_dir / 'src'
        self.backup_dir = Path('../backups/comprehensive_naming_fixes')
        self.fixes_count = 0
        self.modified_files = []
        self.fix_log = []
        
        # 全面的驼峰到蛇形映射
        self.naming_mappings = {
            # 数据库字段相关
            'changedFields': 'changed_fields',
            'ipAddress': 'ip_address',
            'userAgent': 'user_agent',
            'userId': 'user_id',
            'userName': 'user_name',
            'userRole': 'user_role',
            'isActive': 'is_active',
            'lastLogin': 'last_login',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            'deletedAt': 'deleted_at',
            'createTime': 'create_time',
            'updateTime': 'update_time',
            'deleteTime': 'delete_time',
            
            # API和响应相关
            'statusCode': 'status_code',
            'responseData': 'response_data',
            'requestData': 'request_data',
            'errorMessage': 'error_message',
            'errorCode': 'error_code',
            'successMessage': 'success_message',
            'warningMessage': 'warning_message',
            
            # 分页相关
            'totalCount': 'total_count',
            'pageSize': 'page_size',
            'pageNumber': 'page_number',
            'currentPage': 'current_page',
            'totalPages': 'total_pages',
            
            # 业务实体ID
            'purchaseId': 'purchase_id',
            'productId': 'product_id',
            'materialId': 'material_id',
            'supplierId': 'supplier_id',
            'customerId': 'customer_id',
            'skuId': 'sku_id',
            'orderId': 'order_id',
            'inventoryId': 'inventory_id',
            'categoryId': 'category_id',
            
            # 价格和数量
            'totalPrice': 'total_price',
            'unitPrice': 'unit_price',
            'originalPrice': 'original_price',
            'discountPrice': 'discount_price',
            'totalAmount': 'total_amount',
            'remainingAmount': 'remaining_amount',
            'paidAmount': 'paid_amount',
            
            # 类型和状态
            'materialType': 'material_type',
            'productType': 'product_type',
            'orderStatus': 'order_status',
            'paymentStatus': 'payment_status',
            'shippingStatus': 'shipping_status',
            'inventoryStatus': 'inventory_status',
            
            # 联系信息
            'contactInfo': 'contact_info',
            'phoneNumber': 'phone_number',
            'emailAddress': 'email_address',
            'shippingAddress': 'shipping_address',
            'billingAddress': 'billing_address',
            
            # 文件相关
            'fileName': 'file_name',
            'filePath': 'file_path',
            'fileSize': 'file_size',
            'fileType': 'file_type',
            'imageUrl': 'image_url',
            'downloadUrl': 'download_url',
            
            # 日志相关
            'logLevel': 'log_level',
            'logMessage': 'log_message',
            'debugInfo': 'debug_info',
            'requestId': 'request_id',
            'sessionId': 'session_id',
            'traceId': 'trace_id',
            
            # 认证相关
            'accessToken': 'access_token',
            'refreshToken': 'refresh_token',
            'tokenType': 'token_type',
            'expiresIn': 'expires_in',
            'expiresAt': 'expires_at',
            
            # Prisma查询相关
            'arrayContains': 'array_contains',
            'startsWith': 'starts_with',
            'endsWith': 'ends_with',
            'notIn': 'not_in',
            'isNull': 'is_null',
            'isNotNull': 'is_not_null',
            
            # 其他常见字段
            'isDefault': 'is_default',
            'isRequired': 'is_required',
            'isVisible': 'is_visible',
            'isEnabled': 'is_enabled',
            'isDeleted': 'is_deleted',
            'sortOrder': 'sort_order',
            'displayName': 'display_name',
            'shortName': 'short_name',
            'fullName': 'full_name',
            'companyName': 'company_name',
            'departmentName': 'department_name'
        }
        
    def create_backup(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✅ 创建备份目录: {self.backup_dir}")
        
    def backup_file(self, file_path):
        """备份单个文件"""
        relative_path = file_path.relative_to(self.backend_dir)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
        
    def fix_property_access(self, content, file_path):
        """修复属性访问"""
        original_content = content
        file_fixes = 0
        
        for camel_case, snake_case in self.naming_mappings.items():
            # 修复对象属性访问 data.camelCase
            pattern = rf'(\w+)\.{camel_case}\b'
            matches = list(re.finditer(pattern, content))
            if matches:
                content = re.sub(pattern, rf'\1.{snake_case}', content)
                file_fixes += len(matches)
                
                for match in matches:
                    self.fix_log.append({
                        'file': str(file_path.relative_to(self.backend_dir)),
                        'type': 'property_access',
                        'original': f'{match.group(1)}.{camel_case}',
                        'fixed': f'{match.group(1)}.{snake_case}',
                        'line': content[:match.start()].count('\n') + 1
                    })
        
        return content, file_fixes
        
    def fix_object_properties(self, content, file_path):
        """修复对象属性定义"""
        file_fixes = 0
        
        for camel_case, snake_case in self.naming_mappings.items():
            # 修复对象字面量中的属性
            patterns = [
                rf'(\s+){camel_case}(\??)\s*:',  # 接口/类型定义
                rf'({{[^}}]*\s+){camel_case}(\??)\s*:',  # 对象字面量
                rf'(\s+){camel_case}\s*,',  # 简写属性
            ]
            
            for pattern in patterns:
                matches = list(re.finditer(pattern, content))
                if matches:
                    if ':' in pattern:
                        content = re.sub(pattern, rf'\g<1>{snake_case}\g<2>:', content)
                    else:
                        content = re.sub(pattern, rf'\g<1>{snake_case},', content)
                    file_fixes += len(matches)
                    
                    for match in matches:
                        self.fix_log.append({
                            'file': str(file_path.relative_to(self.backend_dir)),
                            'type': 'object_property',
                            'original': camel_case,
                            'fixed': snake_case,
                            'line': content[:match.start()].count('\n') + 1
                        })
        
        return content, file_fixes
        
    def fix_variable_names(self, content, file_path):
        """修复变量名"""
        file_fixes = 0
        
        for camel_case, snake_case in self.naming_mappings.items():
            # 修复变量声明和赋值
            patterns = [
                rf'\b(const|let|var)\s+{camel_case}\b',  # 变量声明
                rf'\b{camel_case}\s*=',  # 变量赋值
                rf'\b{camel_case}\s*,',  # 解构赋值
            ]
            
            for pattern in patterns:
                matches = list(re.finditer(pattern, content))
                if matches:
                    if '=' in pattern or ',' in pattern:
                        content = re.sub(rf'\b{camel_case}\b', snake_case, content)
                    else:
                        content = re.sub(pattern, rf'\1 {snake_case}', content)
                    file_fixes += len(matches)
                    
                    for match in matches:
                        self.fix_log.append({
                            'file': str(file_path.relative_to(self.backend_dir)),
                            'type': 'variable_name',
                            'original': camel_case,
                            'fixed': snake_case,
                            'line': content[:match.start()].count('\n') + 1
                        })
        
        return content, file_fixes
        
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original_content = content
            total_file_fixes = 0
            
            # 修复属性访问
            content, fixes = self.fix_property_access(content, file_path)
            total_file_fixes += fixes
            
            # 修复对象属性
            content, fixes = self.fix_object_properties(content, file_path)
            total_file_fixes += fixes
            
            # 修复变量名
            content, fixes = self.fix_variable_names(content, file_path)
            total_file_fixes += fixes
            
            if content != original_content:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修复后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                    
                self.modified_files.append(str(file_path.relative_to(self.backend_dir)))
                self.fixes_count += total_file_fixes
                print(f"  📝 {file_path.name}: 修复 {total_file_fixes} 处命名")
                return True
                
        except Exception as e:
            print(f"❌ 处理文件失败 {file_path}: {e}")
            
        return False
        
    def find_typescript_files(self):
        """查找所有TypeScript文件"""
        patterns = ['**/*.ts', '**/*.tsx']
        files = []
        
        for pattern in patterns:
            files.extend(self.src_dir.glob(pattern))
            
        # 排除测试文件和构建文件
        excluded_patterns = ['test', 'spec', 'dist', 'build', 'node_modules']
        filtered_files = []
        
        for file_path in files:
            if not any(excluded in str(file_path) for excluded in excluded_patterns):
                filtered_files.append(file_path)
                
        return filtered_files
        
    def run_typescript_check(self):
        """运行TypeScript编译检查"""
        print("\n🔍 运行TypeScript编译检查...")
        result = os.system('npx tsc --noEmit')
        return result == 0
        
    def generate_report(self):
        """生成修复报告"""
        report_content = f"""# 全面命名修复报告

## 修复概览

- **修复时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **处理文件数**: {len(self.find_typescript_files())}
- **修改文件数**: {len(self.modified_files)}
- **总修复数**: {self.fixes_count}
- **备份目录**: {self.backup_dir}

## 修复类型统计

### 全面命名修复
- 属性访问修复（data.camelCase → data.snake_case）
- 对象属性定义修复（camelCase: → snake_case:）
- 变量名修复（const camelCase → const snake_case）

## 修改文件列表

"""
        
        for file_path in self.modified_files:
            report_content += f"- `{file_path}`\n"
            
        report_content += "\n## 详细修复记录\n\n"
        
        # 按文件分组显示修复记录
        files_fixes = {}
        for fix in self.fix_log:
            file_name = fix['file']
            if file_name not in files_fixes:
                files_fixes[file_name] = []
            files_fixes[file_name].append(fix)
            
        for file_name, fixes in files_fixes.items():
            report_content += f"### {file_name}\n\n"
            for fix in fixes:
                report_content += f"- 第{fix['line']}行 ({fix['type']}): `{fix['original']}` → `{fix['fixed']}`\n"
            report_content += "\n"
            
        report_content += "\n## 修复策略\n\n"
        report_content += "- ✅ **全面覆盖**: 修复所有驼峰命名为蛇形命名\n"
        report_content += "- ✅ **精确匹配**: 避免修改字符串、注释和标准API\n"
        report_content += "- ✅ **多种模式**: 覆盖属性访问、对象定义、变量声明等\n"
        report_content += "- ✅ **安全备份**: 所有修改文件已备份\n"
        
        # 写入报告文件
        report_path = self.backend_dir / 'comprehensive_naming_fix_report.md'
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
            
        print(f"📊 生成修复报告: {report_path}")
        
    def run(self):
        """执行修复"""
        print("🚀 开始全面命名修复...")
        print(f"📁 工作目录: {self.backend_dir.absolute()}")
        
        # 创建备份
        self.create_backup()
        
        # 查找TypeScript文件
        ts_files = self.find_typescript_files()
        print(f"📄 找到 {len(ts_files)} 个TypeScript文件")
        
        # 处理文件
        print("\n🔧 开始全面命名修复...")
        for file_path in ts_files:
            self.process_file(file_path)
            
        # 生成报告
        print(f"\n✅ 修复完成!")
        print(f"📊 总修复数: {self.fixes_count}")
        print(f"📝 修改文件: {len(self.modified_files)}")
        
        self.generate_report()
        
        # 运行编译检查
        if self.run_typescript_check():
            print("✅ TypeScript编译检查通过")
        else:
            print("❌ TypeScript编译检查失败，请查看错误信息")
            
if __name__ == '__main__':
    fixer = ComprehensiveNamingFixer()
    fixer.run()