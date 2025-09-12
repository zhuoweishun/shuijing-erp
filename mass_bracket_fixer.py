#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大规模括号修复脚本
专门批量修复 "Expected "}" but found ")"" 类型的错误
目标：从6000+错误降到1000以下
"""

import os
import re
import glob
from typing import List, Tuple

class MassBracketFixer:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.fixed_files = []
        self.total_fixes = 0
        
    def fix_bracket_mismatches(self, content: str) -> Tuple[str, int]:
        """批量修复括号不匹配问题"""
        total_fixes = 0
        
        # 1. 修复对象字面量中的括号错误
        # { prop: value, prop2: value2 )) -> { prop: value, prop2: value2 }
        pattern = r'\{[^{}]*\)\)'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match)
            new_replacement = match[:-2] + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 2. 修复函数调用中的括号错误
        # function(param1, param2 )) -> function(param1, param2 }
        pattern = r'\w+\([^()]*\)\)'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match)
            new_replacement = match[:-2] + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 3. 修复数组中的括号错误
        # [item1, item2 )) -> [item1, item2 }
        pattern = r'\[[^\[\]]*\)\)'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match)
            new_replacement = match[:-2] + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 4. 修复JSX属性中的括号错误
        # <Component prop={value )) -> <Component prop={value }
        pattern = r'\{[^{}]*\)\)'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match)
            new_replacement = match[:-2] + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 5. 修复console.log中的括号错误
        # console.log('text', { data )) -> console.log('text', { data })
        pattern = r'console\.log\([^)]*\{[^}]*\)\)'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match)
            new_replacement = match[:-2] + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 6. 修复setState调用中的括号错误
        # setState({ data )) -> setState({ data })
        pattern = r'set\w+\(\{[^}]*\)\)'
        matches = re.findall(pattern, content)
        for match in matches:
            old_pattern = re.escape(match)
            new_replacement = match[:-2] + '}'
            content = re.sub(old_pattern, new_replacement, content)
            total_fixes += 1
        
        # 7. 修复条件表达式中的括号错误
        # (condition && value