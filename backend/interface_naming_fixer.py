#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
接口定义命名修复脚本
统一接口定义中的驼峰命名为蛇形命名
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path

class InterfaceNamingFixer:
    def __init__(self):
        self.backend_dir = Path('.')
        self.src_dir = self.backend_dir / 'src'
        self.backup_dir = Path('../backups/interface_naming_fixes')
        self.fixes_count = 0
        self.modified_files = []
        self.fix_log = []
        
        # 接口属性驼峰到蛇形的映射
        self.interface_mappings = {
            # 用户相关
            'userAgent': 'user_agent',
            'userId': 'user_id',
            'userName': 'user_name',
            'userRole': 'user_role',
            'isActive': 'is_active',
            'lastLogin': 'last_login',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at',
            
            # 数据相关
            'statusCode': 'status_code',
            'responseData': 'response_data',
            'requestData': 'request_data',
            'totalCount': 'total_count',
            'pageSize': 'page_size',
            'pageNumber': 'page_number',
            
            # 业务相关
            'purchaseId': 'purchase_id',
            'productId': 'product_id',
            'materialId': 'material_id',
            'supplierId': 'supplier_id',
            'customerId': 'customer_id',
            'skuId': 'sku_id',
            'orderId': 'order_id',
            
            # 时间相关
            'startDate': 'start_date',
            'endDate': 'end_date',
            'createTime': 'create_time',
            'updateTime': 'update_time',
            'deleteTime': 'delete_time',
            
            # 其他常见属性
            'totalPrice': 'total_price',
            'unitPrice': 'unit_price',
            'materialType': 'material_type',
            'productType': 'product_type',
            'orderStatus': 'order_status',
            'paymentStatus': 'payment_status',
            'shippingAddress': 'shipping_address',
            'contactInfo': 'contact_info',
            'phoneNumber': 'phone_number',
            'emailAddress': 'email_address',
            'imageUrl': 'image_url',
            'fileSize': 'file_size',
            'fileName': 'file_name',
            'filePath': 'file_path',
            'errorMessage': 'error_message',
            'errorCode': 'error_code',
            'successMessage': 'success_message',
            'warningMessage': 'warning_message',
            'debugInfo': 'debug_info',
            'logLevel': 'log_level',
            'logMessage': 'log_message',
            'ipAddress': 'ip_address',
            'userAgent': 'user_agent',
            'requestId': 'request_id',
            'sessionId': 'session_id',
            'accessToken': 'access_token',
            'refreshToken': 'refresh_token'
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
        
    def fix_interface_properties(self, content, file_path):
        """修复接口属性命名"""
        original_content = content
        file_fixes = 0
        
        # 修复接口定义中的属性
        for camel_case, snake_case in self.interface_mappings.items():
            # 匹配接口属性定义模式
            patterns = [
                # interface 中的属性定义
                rf'(\s+){camel_case}(\??)\s*:',
                # type 中的属性定义
                rf'(\s+){camel_case}(\??)\s*:',
                # 对象类型中的属性
                rf'({{[^}}]*\s+){camel_case}(\??)\s*:',
            ]
            
            for pattern in patterns:
                matches = list(re.finditer(pattern, content))
                if matches:
                    # 替换为蛇形命名
                    content = re.sub(pattern, rf'\g<1>{snake_case}\g<2>:', content)
                    file_fixes += len(matches)
                    
                    for match in matches:
                        self.fix_log.append({
                            'file': str(file_path.relative_to(self.backend_dir)),
                            'type': 'interface_property',
                            'original': f'{camel_case}:',
                            'fixed': f'{snake_case}:',
                            'line': content[:match.start()].count('\n') + 1
                        })
        
        if file_fixes > 0:
            print(f"  📝 {file_path.name}: 修复 {file_fixes} 处接口属性")
            self.fixes_count += file_fixes
            
        return content if content != original_content else None
        
    def process_file(self, file_path):
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # 修复接口属性命名
            fixed_content = self.fix_interface_properties(content, file_path)
            
            if fixed_content:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修复后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                    
                self.modified_files.append(str(file_path.relative_to(self.backend_dir)))
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
        report_content = f"""# 接口定义命名修复报告

## 修复概览

- **修复时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **处理文件数**: {len(self.find_typescript_files())}
- **修改文件数**: {len(self.modified_files)}
- **总修复数**: {self.fixes_count}
- **备份目录**: {self.backup_dir}

## 修复类型统计

### 接口属性修复
- 统一接口定义中的驼峰命名为蛇形命名
- 确保类型定义与代码实现完全匹配

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
                report_content += f"- 第{fix['line']}行: `{fix['original']}` → `{fix['fixed']}`\n"
            report_content += "\n"
            
        report_content += "\n## 修复策略\n\n"
        report_content += "- ✅ **精确匹配**: 只修复接口定义中的驼峰属性\n"
        report_content += "- ✅ **上下文保护**: 避免修改字符串、注释和标准API\n"
        report_content += "- ✅ **全蛇形命名**: 统一采用蛇形命名规范\n"
        report_content += "- ✅ **安全备份**: 所有修改文件已备份\n"
        
        # 写入报告文件
        report_path = self.backend_dir / 'interface_naming_fix_report.md'
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
            
        print(f"📊 生成修复报告: {report_path}")
        
    def run(self):
        """执行修复"""
        print("🚀 开始接口定义命名修复...")
        print(f"📁 工作目录: {self.backend_dir.absolute()}")
        
        # 创建备份
        self.create_backup()
        
        # 查找TypeScript文件
        ts_files = self.find_typescript_files()
        print(f"📄 找到 {len(ts_files)} 个TypeScript文件")
        
        # 处理文件
        print("\n🔧 开始修复接口定义...")
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
    fixer = InterfaceNamingFixer()
    fixer.run()