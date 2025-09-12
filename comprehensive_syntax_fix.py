#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全面的React语法错误修复脚本
修复所有常见的语法错误
"""

import os
import re
import json
from datetime import datetime

def comprehensive_syntax_fix():
    """全面修复React组件中的语法错误"""
    
    print("🔧 开始全面修复React语法错误...")
    
    # 项目根目录
    project_root = os.getcwd()
    src_dir = os.path.join(project_root, 'src')
    
    if not os.path.exists(src_dir):
        print("❌ 未找到src目录")
        return
    
    # 统计信息
    fixed_files = []
    total_fixes = 0
    
    # 修复规则
    fix_rules = [
        # 修复 use_state 为 useState
        (r'\buse_state\b', 'useState'),
        # 修复 use_effect 为 useEffect
        (r'\buse_effect\b', 'useEffect'),
        # 修复 use_memo 为 useMemo
        (r'\buse_memo\b', 'useMemo'),
        # 修复 use_callback 为 useCallback
        (r'\buse_callback\b', 'useCallback'),
        # 修复 use_ref 为 useRef
        (r'\buse_ref\b', 'useRef'),
        # 修复 use_context 为 useContext
        (r'\buse_context\b', 'useContext'),
        # 修复多余的分号在函数定义后
        (r'= \(\) => \{;', '= () => {'),
        # 修复多余的分号在箭头函数参数后
        (r'\) => \{;', ') => {'),
        # 修复错误的return语法
        (r'return\(\)', 'return ('),
        # 修复多余的右括号
        (r'\}\)\)\)', '}))'),
        # 修复错误的事件监听器语法
        (r"addEventListener\('([^']+)'\), ", r"addEventListener('\1', "),
        (r"removeEventListener\('([^']+)'\), ", r"removeEventListener('\1', "),
        # 修复FormData.append语法
        (r"append\('([^']+)'\), ", r"append('\1', "),
        # 修复API调用语法
        (r"api_client\.post\('([^']+)'\), ", r"api_client.post('\1', "),
        (r"api_client\.get\('([^']+)'\), ", r"api_client.get('\1', "),
        (r"api_client\.put\('([^']+)'\), ", r"api_client.put('\1', "),
        (r"api_client\.delete\('([^']+)'\), ", r"api_client.delete('\1', "),
        # 修复console.log语法
        (r"console\.error\('([^']+)'\), ", r"console.error('\1', "),
        (r"console\.log\('([^']+)'\), ", r"console.log('\1', "),
        # 修复Object.fromEntries语法
        (r"Object\.from_entries\(Object\.entries\(([^)]+)\)\.slice\(0\), ([0-9]+)\)\)", r"Object.fromEntries(Object.entries(\1).slice(0, \2))"),
        # 修复onClick等事件处理器后的分号
        (r'onClick=\{([^}]+)\};', r'onClick={\1}'),
        (r'onChange=\{([^}]+)\};', r'onChange={\1}'),
        (r'onSubmit=\{([^}]+)\};', r'onSubmit={\1}'),
        (r'disabled=\{([^}]+)\};', r'disabled={\1}'),
        # 修复key属性后的分号
        (r'key=\{([^}]+)\};', r'key={\1}'),
        # 修复className后的分号
        (r'className="([^"]+)";', r'className="\1"'),
        # 修复JSX中的多余分号
        (r'>\s*;\s*<', '><'),
        # 修复模板字符串中的错误语法
        (r'\$\{;', '${'),
        # 修复多余的右括号在JSX中
        (r'\}\)\s*>', '}}>'),
    ]
    
    # 组件名映射（小写到PascalCase）
    component_mappings = {
        'inventory_status': 'InventoryStatus',
        'financial_charts': 'FinancialCharts',
        'transaction_log': 'TransactionLog',
        'customer_create_modal': 'CustomerCreateModal',
        'customer_detail_modal': 'CustomerDetailModal',
        'customer_refund_modal': 'CustomerRefundModal',
        'sales_detail_modal': 'SalesDetailModal',
        'purchase_detail_modal': 'PurchaseDetailModal',
        'sku_control_modal': 'SkuControlModal',
        'sku_detail_modal': 'SkuDetailModal',
        'sku_sell_form': 'SkuSellForm',
        'sku_adjust_form': 'SkuAdjustForm',
        'sku_destroy_form': 'SkuDestroyForm',
        'sku_restock_form': 'SkuRestockForm',
        'sku_history_view': 'SkuHistoryView',
        'sku_trace_view': 'SkuTraceView',
        'total_price_input': 'TotalPriceInput',
        'mobile_table': 'MobileTable',
        'mobile_form': 'MobileForm',
        'network_info': 'NetworkInfo',
        'protected_route': 'ProtectedRoute',
        'refund_confirm_modal': 'RefundConfirmModal',
        'reverse_sale_modal': 'ReverseSaleModal',
        'financial_record_modal': 'FinancialRecordModal',
        'financial_reports': 'FinancialReports',
        'product_type_tab': 'ProductTypeTab',
        'inventory_dashboard': 'InventoryDashboard',
        'inventory_pie_chart': 'InventoryPieChart',
        'inventory_consumption_chart': 'InventoryConsumptionChart',
        'product_distribution_pie_chart': 'ProductDistributionPieChart',
        'product_price_distribution_chart': 'ProductPriceDistributionChart',
        'finished_product_grid': 'FinishedProductGrid',
        'accessories_product_grid': 'AccessoriesProductGrid',
        'semi_finished_matrix_view': 'SemiFinishedMatrixView',
    }
    
    # 遍历所有tsx/jsx/ts文件
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.tsx', '.jsx', '.ts')):
                file_path = os.path.join(root, file)
                
                try:
                    # 读取文件内容
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original_content = content
                    file_fixes = 0
                    
                    # 应用修复规则
                    for pattern, replacement in fix_rules:
                        matches = re.findall(pattern, content)
                        if matches:
                            content = re.sub(pattern, replacement, content)
                            file_fixes += len(matches)
                    
                    # 修复组件名称
                    for snake_case, pascal_case in component_mappings.items():
                        # 修复JSX标签
                        pattern = f'<{snake_case}\s*([^>]*)>'
                        matches = re.findall(pattern, content)
                        if matches:
                            content = re.sub(pattern, f'<{pascal_case} \\1>', content)
                            file_fixes += len(matches)
                        
                        # 修复自闭合标签
                        pattern = f'<{snake_case}\s*([^>]*)/?>'
                        matches = re.findall(pattern, content)
                        if matches:
                            content = re.sub(pattern, f'<{pascal_case} \\1/>', content)
                            file_fixes += len(matches)
                        
                        # 修复结束标签
                        pattern = f'</{snake_case}>'
                        matches = re.findall(pattern, content)
                        if matches:
                            content = re.sub(pattern, f'</{pascal_case}>', content)
                            file_fixes += len(matches)
                    
                    # 如果有修改，写回文件
                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        fixed_files.append({
                            'file': os.path.relpath(file_path, project_root),
                            'fixes': file_fixes
                        })
                        total_fixes += file_fixes
                        print(f"✅ 修复 {os.path.relpath(file_path, project_root)}: {file_fixes}处")
                
                except Exception as e:
                    print(f"❌ 处理文件 {file_path} 时出错: {e}")
    
    # 生成修复报告
    report = {
        'timestamp': datetime.now().isoformat(),
        'total_fixes': total_fixes,
        'fixed_files_count': len(fixed_files),
        'fixed_files': fixed_files,
        'summary': f"成功修复 {len(fixed_files)} 个文件中的 {total_fixes} 处语法错误"
    }
    
    # 保存报告
    report_path = os.path.join(project_root, 'comprehensive_syntax_fix_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\n📊 修复完成!")
    print(f"   - 修复文件数: {len(fixed_files)}")
    print(f"   - 修复总数: {total_fixes}")
    print(f"   - 报告文件: {report_path}")
    
    if total_fixes > 0:
        print("\n🎉 所有语法错误已修复!")
    else:
        print("\n✨ 未发现需要修复的语法错误")

if __name__ == '__main__':
    comprehensive_syntax_fix()