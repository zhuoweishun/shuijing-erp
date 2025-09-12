#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
回滚到稳定版本 - 1692个错误的状态
将src目录恢复到stage1_syntax_fixes备份
"""

import os
import shutil
import json
from datetime import datetime

def create_current_backup():
    """创建当前状态的备份"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = f'backups/before_rollback_{timestamp}'
    
    if os.path.exists('src'):
        os.makedirs(backup_dir, exist_ok=True)
        shutil.copytree('src', f'{backup_dir}/src')
        print(f"✅ 当前状态已备份到: {backup_dir}")
    
    return backup_dir

def rollback_to_stable():
    """回滚到稳定版本"""
    stable_backup = 'backups/stage1_syntax_fixes'
    
    if not os.path.exists(stable_backup):
        print(f"❌ 找不到稳定备份: {stable_backup}")
        return False
    
    # 创建当前备份
    current_backup = create_current_backup()
    
    # 删除当前src目录
    if os.path.exists('src'):
        shutil.rmtree('src')
        print("🗑️ 已删除当前src目录")
    
    # 恢复稳定版本
    shutil.copytree(f'{stable_backup}/src', 'src')
    print(f"✅ 已从 {stable_backup} 恢复src目录")
    
    # 记录回滚操作
    rollback_log = {
        'timestamp': datetime.now().isoformat(),
        'action': 'rollback_to_stable',
        'from_backup': current_backup,
        'to_backup': stable_backup,
        'reason': '回滚到1692个错误的稳定状态'
    }
    
    with open('rollback_log.json', 'w', encoding='utf-8') as f:
        json.dump(rollback_log, f, ensure_ascii=False, indent=2)
    
    return True

if __name__ == '__main__':
    print("🔄 开始回滚到稳定版本...")
    
    if rollback_to_stable():
        print("\n✅ 回滚完成！")
        print("📊 请运行 'npm run build' 检查错误数量")
        print("🎯 预期错误数量: 约1692个")
    else:
        print("\n❌ 回滚失败！")