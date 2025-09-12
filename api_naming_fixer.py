#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API命名智能修复脚本
解决过度蛇形命名转换导致的6444个TypeScript错误
采用分层命名策略，恢复标准API命名，保持业务代码蛇形命名
"""

import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple

class APINameFixer:
    def __init__(self, src_dir: str = "src"):
        self.src_dir = Path(src_dir)
        self.backup_dir = Path("backups/api_naming_fixes")
        self.log_file = "api_naming_fix_report.md"
        self.stats = {
            "files_processed": 0,
            "files_modified": 0,
            "react_hooks_fixed": 0,
            "dom_api_fixed": 0,
            "js_builtin_fixed": 0,
            "third_party_fixed": 0,
            "total_fixes": 0
        }
        
        # React Hooks白名单
        self.react_hooks = {
            'use_state': 'useState',
            'use_effect': 'useEffect',
            'use_context': 'useContext',
            'use_reducer': 'useReducer',
            'use_callback': 'useCallback',
            'use_memo': 'useMemo',
            'use_ref': 'useRef',
            'use_imperative_handle': 'useImperativeHandle',
            'use_layout_effect': 'useLayoutEffect',
            'use_debug_value': 'useDebugValue',
            'use_id': 'useId',
            'use_transition': 'useTransition',
            'use_deferred_value': 'useDeferredValue',
            'use_sync_external_store': 'useSyncExternalStore'
        }
        
        # DOM API白名单
        self.dom_api = {
            'add_event_listener': 'addEventListener',
            'remove_event_listener': 'removeEventListener',
            'query_selector': 'querySelector',
            'query_selector_all': 'querySelectorAll',
            'get_element_by_id': 'getElementById',
            'get_elements_by_class_name': 'getElementsByClassName',
            'get_elements_by_tag_name': 'getElementsByTagName',
            'create_element': 'createElement',
            'append_child': 'appendChild',
            'remove_child': 'removeChild',
            'insert_before': 'insertBefore',
            'replace_child': 'replaceChild',
            'get_attribute': 'getAttribute',
            'set_attribute': 'setAttribute',
            'remove_attribute': 'removeAttribute',
            'has_attribute': 'hasAttribute',
            'get_bounding_client_rect': 'getBoundingClientRect',
            'scroll_into_view': 'scrollIntoView',
            'prevent_default': 'preventDefault',
            'stop_propagation': 'stopPropagation'
        }
        
        # JavaScript内置方法白名单
        self.js_builtin = {
            'for_each': 'forEach',
            'find_index': 'findIndex',
            'includes': 'includes',
            'index_of': 'indexOf',
            'last_index_of': 'lastIndexOf',
            'to_string': 'toString',
            'to_lower_case': 'toLowerCase',
            'to_upper_case': 'toUpperCase',
            'trim': 'trim',
            'split': 'split',
            'slice': 'slice',
            'substring': 'substring',
            'substr': 'substr',
            'replace': 'replace',
            'replace_all': 'replaceAll',
            'match': 'match',
            'search': 'search',
            'test': 'test',
            'exec': 'exec',
            'push': 'push',
            'pop': 'pop',
            'shift': 'shift',
            'unshift': 'unshift',
            'splice': 'splice',
            'concat': 'concat',
            'join': 'join',
            'reverse': 'reverse',
            'sort': 'sort',
            'filter': 'filter',
            'map': 'map',
            'reduce': 'reduce',
            'reduce_right': 'reduceRight',
            'some': 'some',
            'every': 'every',
            'find': 'find',
            'flat': 'flat',
            'flat_map': 'flatMap'
        }
        
        # Object方法白名单
        self.object_methods = {
            'Object.keys': 'Object.keys',
            'Object.values': 'Object.values',
            'Object.entries': 'Object.entries',
            'Object.assign': 'Object.assign',
            'Object.create': 'Object.create',
            'Object.freeze': 'Object.freeze',
            'Object.seal': 'Object.seal',
            'Object.is': 'Object.is',
            'Object.has_own_property': 'Object.hasOwnProperty',
            'Object.property_is_enumerable': 'Object.propertyIsEnumerable'
        }
        
        # 第三方库API白名单
        self.third_party_api = {
            # React相关
            'create_context': 'createContext',
            'create_ref': 'createRef',
            'forward_ref': 'forwardRef',
            'lazy': 'lazy',
            'memo': 'memo',
            'suspense': 'Suspense',
            'strict_mode': 'StrictMode',
            'fragment': 'Fragment',
            
            # TypeScript相关
            'partial': 'Partial',
            'required': 'Required',
            'readonly': 'Readonly',
            'pick': 'Pick',
            'omit': 'Omit',
            'exclude': 'Exclude',
            'extract': 'Extract',
            'non_nullable': 'NonNullable',
            'return_type': 'ReturnType',
            'instance_type': 'InstanceType'
        }
        
        # 合并所有白名单
        self.all_api_mappings = {
            **self.react_hooks,
            **self.dom_api,
            **self.js_builtin,
            **self.object_methods,
            **self.third_party_api
        }
    
    def create_backup(self):
        """创建备份目录"""
        if self.backup_dir.exists():
            shutil.rmtree(self.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        print(f"✓ 创建备份目录: {self.backup_dir}")
    
    def backup_file(self, file_path: Path):
        """备份单个文件"""
        relative_path = file_path.relative_to(self.src_dir.parent)
        backup_path = self.backup_dir / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file_path, backup_path)
    
    def fix_api_naming(self, content: str, file_path: Path) -> Tuple[str, Dict[str, int]]:
        """修复API命名"""
        original_content = content
        fixes = {
            "react_hooks": 0,
            "dom_api": 0,
            "js_builtin": 0,
            "third_party": 0
        }
        
        # 1. 修复React Hooks
        for snake_name, camel_name in self.react_hooks.items():
            # 匹配函数调用和导入
            patterns = [
                rf'\b{snake_name}\b(?=\s*\()',  # 函数调用
                rf'\b{snake_name}\b(?=\s*,)',   # 导入列表中
                rf'\b{snake_name}\b(?=\s*}})',  # 解构导入结尾
                rf'{{\s*{snake_name}\b',        # 解构导入开始
                rf',\s*{snake_name}\b',         # 导入列表中间
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    content = re.sub(pattern, camel_name, content)
                    fixes["react_hooks"] += len(matches)
        
        # 2. 修复DOM API
        for snake_name, camel_name in self.dom_api.items():
            # 匹配方法调用
            pattern = rf'\.{snake_name}\b(?=\s*\()'  # .method_name(
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, f'.{camel_name}', content)
                fixes["dom_api"] += len(matches)
        
        # 3. 修复JavaScript内置方法
        for snake_name, camel_name in self.js_builtin.items():
            # 匹配方法调用
            pattern = rf'\.{snake_name}\b(?=\s*\()'  # .method_name(
            matches = re.findall(pattern, content)
            if matches:
                content = re.sub(pattern, f'.{camel_name}', content)
                fixes["js_builtin"] += len(matches)
        
        # 4. 修复第三方库API
        for snake_name, camel_name in self.third_party_api.items():
            # 匹配函数调用和类型引用
            patterns = [
                rf'\b{snake_name}\b(?=\s*\()',  # 函数调用
                rf'\b{snake_name}\b(?=\s*<)',   # 泛型类型
                rf'\b{snake_name}\b(?=\s*,)',   # 导入列表中
                rf'\b{snake_name}\b(?=\s*}})',  # 解构导入结尾
                rf'{{\s*{snake_name}\b',        # 解构导入开始
                rf',\s*{snake_name}\b',         # 导入列表中间
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, content)
                if matches:
                    content = re.sub(pattern, camel_name, content)
                    fixes["third_party"] += len(matches)
        
        # 5. 特殊处理Object方法
        for snake_name, camel_name in self.object_methods.items():
            if 'Object.' in snake_name:
                # Object.method_name -> Object.methodName
                snake_method = snake_name.replace('Object.', '')
                camel_method = camel_name.replace('Object.', '')
                pattern = rf'Object\.{snake_method}\b'
                matches = re.findall(pattern, content)
                if matches:
                    content = re.sub(pattern, f'Object.{camel_method}', content)
                    fixes["js_builtin"] += len(matches)
        
        return content, fixes
    
    def process_file(self, file_path: Path) -> bool:
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            fixed_content, fixes = self.fix_api_naming(content, file_path)
            
            # 统计修复数量
            total_file_fixes = sum(fixes.values())
            
            if total_file_fixes > 0:
                # 备份原文件
                self.backup_file(file_path)
                
                # 写入修复后的内容
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                
                # 更新统计
                self.stats["files_modified"] += 1
                self.stats["react_hooks_fixed"] += fixes["react_hooks"]
                self.stats["dom_api_fixed"] += fixes["dom_api"]
                self.stats["js_builtin_fixed"] += fixes["js_builtin"]
                self.stats["third_party_fixed"] += fixes["third_party"]
                self.stats["total_fixes"] += total_file_fixes
                
                print(f"✓ 修复 {file_path.name}: {total_file_fixes}处")
                return True
            
            return False
            
        except Exception as e:
            print(f"✗ 处理文件失败 {file_path}: {e}")
            return False
    
    def process_directory(self) -> List[Path]:
        """处理目录中的所有TypeScript文件"""
        ts_files = []
        
        # 查找所有.ts和.tsx文件
        for pattern in ['**/*.ts', '**/*.tsx']:
            ts_files.extend(self.src_dir.glob(pattern))
        
        # 排除node_modules和dist目录
        ts_files = [
            f for f in ts_files 
            if 'node_modules' not in str(f) and 'dist' not in str(f)
        ]
        
        print(f"找到 {len(ts_files)} 个TypeScript文件")
        
        modified_files = []
        for file_path in ts_files:
            self.stats["files_processed"] += 1
            if self.process_file(file_path):
                modified_files.append(file_path)
        
        return modified_files
    
    def generate_report(self, modified_files: List[Path]):
        """生成修复报告"""
        report = f"""# API命名修复报告

## 修复概览
- **修复时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- **处理文件**: {self.stats['files_processed']} 个
- **修改文件**: {self.stats['files_modified']} 个
- **总修复数**: {self.stats['total_fixes']} 处

## 修复分类
- **React Hooks**: {self.stats['react_hooks_fixed']} 处
- **DOM API**: {self.stats['dom_api_fixed']} 处
- **JavaScript内置方法**: {self.stats['js_builtin_fixed']} 处
- **第三方库API**: {self.stats['third_party_fixed']} 处

## 修复策略

### 1. React Hooks恢复
恢复以下Hooks的标准命名：
"""
        
        # 添加React Hooks列表
        for snake, camel in self.react_hooks.items():
            report += f"- `{snake}` → `{camel}`\n"
        
        report += f"""

### 2. DOM API恢复
恢复以下DOM方法的标准命名：
"""
        
        # 添加DOM API列表
        for snake, camel in list(self.dom_api.items())[:10]:  # 只显示前10个
            report += f"- `.{snake}()` → `.{camel}()`\n"
        report += f"- ... 等共 {len(self.dom_api)} 个DOM方法\n"
        
        report += f"""

### 3. JavaScript内置方法恢复
恢复以下内置方法的标准命名：
"""
        
        # 添加JS内置方法列表
        for snake, camel in list(self.js_builtin.items())[:10]:  # 只显示前10个
            report += f"- `.{snake}()` → `.{camel}()`\n"
        report += f"- ... 等共 {len(self.js_builtin)} 个内置方法\n"
        
        if modified_files:
            report += f"""

## 修改的文件列表
"""
            for file_path in modified_files:
                relative_path = file_path.relative_to(self.src_dir.parent)
                report += f"- `{relative_path}`\n"
        
        report += f"""

## 备份信息
- **备份目录**: `{self.backup_dir}`
- **备份文件数**: {len(modified_files)} 个

## 验证建议
1. 运行 `npx tsc --noEmit` 检查TypeScript编译错误
2. 运行 `npm run dev` 确保项目正常启动
3. 检查React组件是否正常渲染
4. 验证DOM操作功能是否正常

---
*修复完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n✓ 修复报告已生成: {self.log_file}")
    
    def run(self):
        """执行修复流程"""
        print("=== API命名智能修复开始 ===")
        print(f"目标目录: {self.src_dir}")
        
        # 创建备份
        self.create_backup()
        
        # 处理文件
        modified_files = self.process_directory()
        
        # 生成报告
        self.generate_report(modified_files)
        
        print(f"\n=== 修复完成 ===")
        print(f"处理文件: {self.stats['files_processed']} 个")
        print(f"修改文件: {self.stats['files_modified']} 个")
        print(f"总修复数: {self.stats['total_fixes']} 处")
        print(f"备份目录: {self.backup_dir}")
        
        if self.stats['total_fixes'] > 0:
            print("\n建议执行以下验证步骤:")
            print("1. npx tsc --noEmit  # 检查TypeScript编译")
            print("2. npm run dev       # 启动开发服务器")
            print("3. 测试应用功能是否正常")

def main():
    """主函数"""
    fixer = APINameFixer()
    fixer.run()

if __name__ == "__main__":
    main()