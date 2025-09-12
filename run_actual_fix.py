#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from camel_to_snake_batch_processor import CamelToSnakeBatchProcessor

if __name__ == "__main__":
    print("=== 开始实际修改 ===")
    print("⚠️  警告：这将修改源代码文件！")
    print("✅ 已自动创建备份")
    
    processor = CamelToSnakeBatchProcessor()
    report = processor.run(dry_run=False)
    
    print(f"\n=== 修改完成 ===")
    print(f"共扫描文件: {report['total_files_processed']}")
    print(f"实际修改文件: {report['files_modified']}")
    print(f"备份和详细报告已保存")
    
    if report['files_modified'] > 0:
        print("\n主要修改内容:")
        total_changes = 0
        for file_path, changes in report['changes'].items():
            file_changes = sum(count for _, _, count in changes)
            total_changes += file_changes
            print(f"  {file_path}: {file_changes} 处修改")
        
        print(f"\n总计: {total_changes} 处驼峰命名已转换为蛇形命名")
        
        print("\n建议下一步操作:")
        print("1. 运行 TypeScript 编译检查: cd backend && npx tsc --noEmit")
        print("2. 运行前端编译检查: npm run build")
        print("3. 如有错误，检查修改日志进行调整")
    
    print("\n✅ 全蛇形命名改造批量处理完成！")