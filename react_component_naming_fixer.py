#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
React组件命名修复脚本
专门修复批量处理时错误转换的React组件命名问题

关于PascalCase的重要说明：
- PascalCase：首字母大写的驼峰命名，如 UserProfile、LoginForm
- React组件**必须**使用PascalCase，这是React框架的强制要求
- 如果改为蛇形命名（如 user_profile），React会无法识别为组件
- JSX中的组件名也必须是PascalCase：<UserProfile /> 而不是 <user_profile />
"""

import os
import re
import shutil
from pathlib import Path
from datetime import datetime
import json

class ReactComponentNamingFixer:
    def __init__(self):
        self.project_root = Path("d:/shuijing ERP")
        self.backup_dir = self.project_root / "backups" / "camel_to_snake_fixes" / "20250912_192411"
        self.src_dir = self.project_root / "src"
        self.backend_dir = self.project_root / "backend" / "src"
        self.shared_dir = self.project_root / "shared"
        
        # React组件名映射表（小写 → PascalCase）
        self.component_mappings = {
            # 页面组件
            'login': 'Login',
            'home': 'Home',
            'settings': 'Settings',
            'financial': 'Financial',
            'product_entry': 'ProductEntry',
            'purchase_entry': 'PurchaseEntry',
            'purchase_list': 'PurchaseList',
            'sales_list': 'SalesList',
            'inventory_list': 'InventoryList',
            'customer_management': 'CustomerManagement',
            'supplier_management': 'SupplierManagement',
            'user_management': 'UserManagement',
            
            # 通用组件
            'layout': 'Layout',
            'portal': 'Portal',
            'protected_route': 'ProtectedRoute',
            'permission_wrapper': 'PermissionWrapper',
            'mobile_form': 'MobileForm',
            'mobile_table': 'MobileTable',
            'network_info': 'NetworkInfo',
            
            # 业务组件
            'sku_detail_modal': 'SkuDetailModal',
            'sku_sell_form': 'SkuSellForm',
            'sku_destroy_form': 'SkuDestroyForm',
            'sku_adjust_form': 'SkuAdjustForm',
            'sku_restock_form': 'SkuRestockForm',
            'sku_control_modal': 'SkuControlModal',
            'sku_trace_view': 'SkuTraceView',
            'sku_history_view': 'SkuHistoryView',
            
            'customer_create_modal': 'CustomerCreateModal',
            'customer_detail_modal': 'CustomerDetailModal',
            'customer_refund_modal': 'CustomerRefundModal',
            
            'purchase_detail_modal': 'PurchaseDetailModal',
            'sales_detail_modal': 'SalesDetailModal',
            'refund_confirm_modal': 'RefundConfirmModal',
            'reverse_sale_modal': 'ReverseSaleModal',
            
            'financial_charts': 'FinancialCharts',
            'financial_reports': 'FinancialReports',
            'financial_record_modal': 'FinancialRecordModal',
            'transaction_log': 'TransactionLog',
            
            'inventory_dashboard': 'InventoryDashboard',
            'inventory_status': 'InventoryStatus',
            'inventory_pie_chart': 'InventoryPieChart',
            'inventory_consumption_chart': 'InventoryConsumptionChart',
            
            'product_type_tab': 'ProductTypeTab',
            'product_distribution_pie_chart': 'ProductDistributionPieChart',
            'product_price_distribution_chart': 'ProductPriceDistributionChart',
            'accessories_product_grid': 'AccessoriesProductGrid',
            'finished_product_grid': 'FinishedProductGrid',
            'semi_finished_matrix_view': 'SemiFinishedMatrixView',
            'total_price_input': 'TotalPriceInput',
            
            # Hooks（保持camelCase）
            'use_auth': 'useAuth',
            'use_device_detection': 'useDeviceDetection',
            'use_sku_permissions': 'useSkuPermissions',
            
            # 服务和工具（保持原有命名或修正）
            'ai_service': 'aiService',
            'error_handler': 'errorHandler',
            'field_converter': 'fieldConverter',
            'pinyin_sort': 'pinyinSort',
            'refund_reasons': 'refundReasons',
            
            # 主要文件
            'app': 'App',
            'main': 'main'
        }
        
        # JSX属性映射（必须保持camelCase）
        self.jsx_attributes = {
            'required_role': 'requiredRole',
            'class_name': 'className',
            'on_click': 'onClick',
            'on_change': 'onChange',
            'on_submit': 'onSubmit',
            'on_focus': 'onFocus',
            'on_blur': 'onBlur',
            'on_key_down': 'onKeyDown',
            'on_key_up': 'onKeyUp',
            'on_mouse_enter': 'onMouseEnter',
            'on_mouse_leave': 'onMouseLeave',
            'auto_focus': 'autoFocus',
            'auto_complete': 'autoComplete',
            'read_only': 'readOnly',
            'tab_index': 'tabIndex',
            'max_length': 'maxLength',
            'min_length': 'minLength',
            'spell_check': 'spellCheck',
            'content_editable': 'contentEditable'
        }
        
        self.fixes_applied = []
        self.errors_found = []
    
    def explain_pascal_case(self):
        """解释PascalCase概念"""
        explanation = """
🎯 **关于PascalCase的重要说明**

**什么是PascalCase？**
- PascalCase：首字母大写的驼峰命名，如 `UserProfile`、`LoginForm`、`CustomerManagement`
- 每个单词的首字母都大写，单词之间没有分隔符

**为什么React组件必须使用PascalCase？**
1. **React框架要求**：React通过首字母大写来区分组件和普通HTML元素
   - `<UserProfile />` → React组件
   - `<div />` → HTML元素

2. **JSX语法规则**：如果组件名不是PascalCase，React会将其视为HTML标签
   - ✅ 正确：`<Login />` → 渲染Login组件
   - ❌ 错误：`<login />` → 寻找HTML的login标签（不存在）

3. **编译器识别**：TypeScript/Babel需要PascalCase来正确编译JSX

**什么可以用蛇形命名？**
✅ 业务逻辑函数：`handle_submit`、`fetch_user_data`
✅ 变量名：`user_info`、`api_response`
✅ 常量：`API_BASE_URL`、`MAX_RETRY_COUNT`
✅ 数据库字段：`user_id`、`created_at`
✅ 文件名（非组件）：`utils.ts`、`api_client.ts`

**什么不能用蛇形命名？**
❌ React组件名：必须PascalCase
❌ JSX属性：必须camelCase（如 `onClick`、`className`）
❌ React Hooks：必须camelCase（如 `useState`、`useEffect`）
❌ DOM事件：必须camelCase（如 `onClick`、`onChange`）
❌ CSS属性：必须camelCase（如 `backgroundColor`、`fontSize`）

**总结**：
我们的项目采用"混合命名规范"：
- React相关：遵循React规范（PascalCase组件 + camelCase属性）
- 业务逻辑：使用蛇形命名
- 这样既符合React框架要求，又保持业务代码的一致性
        """
        print(explanation)
        return explanation
    
    def check_backup_availability(self):
        """检查备份可用性"""
        if not self.backup_dir.exists():
            print(f"❌ 备份目录不存在: {self.backup_dir}")
            return False
        
        backup_src = self.backup_dir / "src"
        if not backup_src.exists():
            print(f"❌ 备份源码目录不存在: {backup_src}")
            return False
        
        print(f"✅ 发现可用备份: {self.backup_dir}")
        print(f"📁 备份时间: 2025-09-12 19:24:11")
        return True
    
    def restore_from_backup(self):
        """从备份恢复文件"""
        if not self.check_backup_availability():
            return False
        
        try:
            # 创建当前状态的备份
            current_backup = self.project_root / "backups" / "before_react_fix" / datetime.now().strftime("%Y%m%d_%H%M%S")
            current_backup.mkdir(parents=True, exist_ok=True)
            
            # 备份当前src目录
            if self.src_dir.exists():
                shutil.copytree(self.src_dir, current_backup / "src", dirs_exist_ok=True)
                print(f"✅ 当前状态已备份到: {current_backup}")
            
            # 从备份恢复src目录
            backup_src = self.backup_dir / "src"
            if backup_src.exists():
                if self.src_dir.exists():
                    shutil.rmtree(self.src_dir)
                shutil.copytree(backup_src, self.src_dir)
                print(f"✅ 已从备份恢复src目录")
            
            # 恢复shared目录
            backup_shared = self.backup_dir / "shared"
            if backup_shared.exists():
                if self.shared_dir.exists():
                    shutil.rmtree(self.shared_dir)
                shutil.copytree(backup_shared, self.shared_dir)
                print(f"✅ 已从备份恢复shared目录")
            
            # 恢复backend/src目录
            backup_backend = self.backup_dir / "backend" / "src"
            if backup_backend.exists():
                if self.backend_dir.exists():
                    shutil.rmtree(self.backend_dir)
                shutil.copytree(backup_backend, self.backend_dir)
                print(f"✅ 已从备份恢复backend/src目录")
            
            return True
            
        except Exception as e:
            print(f"❌ 恢复备份失败: {e}")
            return False
    
    def fix_jsx_syntax_errors(self):
        """修复JSX语法错误"""
        main_tsx = self.src_dir / "main.tsx"
        if main_tsx.exists():
            content = main_tsx.read_text(encoding='utf-8')
            
            # 修复多余的逗号和括号
            content = re.sub(r'</React\.StrictMode>,\)', '</React.StrictMode>', content)
            content = re.sub(r'\)\s*\)\s*$', ')', content, flags=re.MULTILINE)
            
            # 修复导入路径
            content = re.sub(r"import app from './app\.tsx'", "import App from './App.tsx'", content)
            
            main_tsx.write_text(content, encoding='utf-8')
            self.fixes_applied.append(f"修复 {main_tsx} 的JSX语法错误")
    
    def fix_component_imports_exports(self):
        """修复组件导入导出"""
        for tsx_file in self.src_dir.rglob("*.tsx"):
            if tsx_file.name.startswith('.'):
                continue
                
            try:
                content = tsx_file.read_text(encoding='utf-8')
                original_content = content
                
                # 修复导入语句
                for snake_name, pascal_name in self.component_mappings.items():
                    # 修复默认导入
                    pattern = rf"import {snake_name} from"
                    replacement = f"import {pascal_name} from"
                    content = re.sub(pattern, replacement, content)
                    
                    # 修复命名导入
                    pattern = rf"import \{{\s*{snake_name}\s*\}}"
                    replacement = f"import {{{pascal_name}}}"
                    content = re.sub(pattern, replacement, content)
                    
                    # 修复导出语句
                    pattern = rf"export default {snake_name}"
                    replacement = f"export default {pascal_name}"
                    content = re.sub(pattern, replacement, content)
                    
                    # 修复函数定义
                    pattern = rf"function {snake_name}\("
                    replacement = f"function {pascal_name}("
                    content = re.sub(pattern, replacement, content)
                
                # 修复JSX属性
                for snake_attr, camel_attr in self.jsx_attributes.items():
                    pattern = rf'{snake_attr}='
                    replacement = f'{camel_attr}='
                    content = re.sub(pattern, replacement, content)
                
                if content != original_content:
                    tsx_file.write_text(content, encoding='utf-8')
                    self.fixes_applied.append(f"修复 {tsx_file.relative_to(self.project_root)} 的组件命名")
                    
            except Exception as e:
                self.errors_found.append(f"处理 {tsx_file} 时出错: {e}")
    
    def generate_report(self):
        """生成修复报告"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "fixes_applied": len(self.fixes_applied),
            "errors_found": len(self.errors_found),
            "details": {
                "fixes": self.fixes_applied,
                "errors": self.errors_found
            },
            "component_mappings_used": self.component_mappings,
            "jsx_attributes_fixed": self.jsx_attributes
        }
        
        report_file = self.project_root / "react_component_fix_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📋 修复报告已生成: {report_file}")
        print(f"✅ 应用修复: {len(self.fixes_applied)}个")
        print(f"❌ 发现错误: {len(self.errors_found)}个")
        
        return report
    
    def run_fix(self):
        """执行完整的修复流程"""
        print("🚀 开始React组件命名修复...\n")
        
        # 1. 解释PascalCase概念
        self.explain_pascal_case()
        
        # 2. 检查并恢复备份
        print("\n🔍 检查备份可用性...")
        if self.check_backup_availability():
            print("\n📦 从备份恢复文件...")
            if self.restore_from_backup():
                print("✅ 备份恢复成功！")
            else:
                print("❌ 备份恢复失败，继续手动修复...")
        else:
            print("❌ 没有可用备份，执行手动修复...")
        
        # 3. 修复JSX语法错误
        print("\n🔧 修复JSX语法错误...")
        self.fix_jsx_syntax_errors()
        
        # 4. 修复组件导入导出
        print("\n🔧 修复组件导入导出...")
        self.fix_component_imports_exports()
        
        # 5. 生成报告
        print("\n📋 生成修复报告...")
        report = self.generate_report()
        
        print("\n🎉 React组件命名修复完成！")
        print("\n💡 重要提醒：")
        print("- React组件必须使用PascalCase（如 Login、UserProfile）")
        print("- JSX属性必须使用camelCase（如 onClick、className）")
        print("- 业务逻辑函数可以使用蛇形命名（如 handle_submit、fetch_data）")
        print("- 请运行 npm run dev 检查是否还有编译错误")
        
        return report

if __name__ == "__main__":
    fixer = ReactComponentNamingFixer()
    fixer.run_fix()