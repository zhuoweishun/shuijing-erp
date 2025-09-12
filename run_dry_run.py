#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from camel_to_snake_batch_processor import CamelToSnakeBatchProcessor

if __name__ == "__main__":
    print("=== 开始干运行预览 ===")
    processor = CamelToSnakeBatchProcessor()
    report = processor.run(dry_run=True)
    
    print(f"\n=== 干运行完成 ===")
    print(f"共扫描文件: {report['total_files_processed']}")
    print(f"需要修改文件: {report['files_modified']}")
    print(f"详细报告已保存")
    
    if report['files_modified'] > 0:
        print("\n发现的主要修改:")
        for file_path, changes in list(report['changes'].items())[:5]:  # 显示前5个文件的修改
            print(f"\n文件: {file_path}")
            for old_name, new_name, count in changes:
                print(f"  {old_name} -> {new_name} ({count}次)")
        
        if len(report['changes']) > 5:
            print(f"\n... 还有 {len(report['changes']) - 5} 个文件需要修改")
    
    print("\n如果预览结果正确，可以运行实际修改:")
    print("python run_actual_fix.py")