#!/usr/bin/env node

/**
 * 自动修复API字段命名问题
 * 警告：请在运行前备份代码！
 */

const fs = require('fs');
const path = require('path');

// 字段映射表（从问题字段到正确字段）
const FIELD_MAPPINGS = {
  'product_type': 'productType',
  'price_per_gram': 'pricePerGram',
  'product_name': 'productName',
  'sort_by': 'sortBy',
  'has_low_stock': 'hasLowStock',
  'price_per_bead': 'pricePerBead',
  'total_variants': 'totalVariants',
  'is_low_stock': 'isLowStock',
  'bead_diameter': 'beadDiameter',
  'supplier_name': 'supplierName',
  'total_quantity': 'totalQuantity',
  'unit_price': 'unitPrice',
  'piece_count': 'pieceCount',
  'total_price': 'totalPrice',
  'purchase_id': 'purchaseId',
  'remaining_beads': 'remainingBeads',
  'natural_language_input': 'naturalLanguageInput',
  'ai_recognition_result': 'aiRecognitionResult',
  'max_tokens': 'maxTokens',
  'product_types': 'productTypes',
};

/**
 * 替换文件中的字段名
 */
function replaceFieldsInFile(filePath, mappings) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  Object.entries(mappings).forEach(([oldField, newField]) => {
    // 匹配字段定义模式
    const patterns = [
      new RegExp(`\b${oldField}\s*:`, 'g'),
      new RegExp(`\b${oldField}\s*=`, 'g'),
      new RegExp(`\.${oldField}\b`, 'g'),
      new RegExp(`\[${oldField}\]`, 'g')
    ];
    
    patterns.forEach(pattern => {
      const newContent = content.replace(pattern, (match) => {
        return match.replace(oldField, newField);
      });
      
      if (newContent !== content) {
        content = newContent;
        changed = true;
        console.log(`  替换: ${oldField} -> ${newField}`);
      }
    });
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ 已更新: ${filePath}`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 开始自动修复字段命名问题...');
  console.log('⚠️  请确保已备份代码！');
  
  // 需要修复的文件列表
  const filesToFix = [
    'src\services\api.ts',
    'backend\src\routes\inventory.ts',
    'backend\src\routes\purchases.ts',
    'backend\src\routes\products.ts',
    'backend\src\routes\users.ts',
    'backend\src\services\ai.ts',
    'backend\src\utils\updateImageUrls.ts',
  ];
  
  filesToFix.forEach(file => {
    const fullPath = path.resolve(__dirname, '..', file);
    console.log(`
🔄 处理文件: ${file}`);
    replaceFieldsInFile(fullPath, FIELD_MAPPINGS);
  });
  
  console.log('
✅ 修复完成！请检查代码并测试功能。');
}

// 运行修复（需要 --fix 参数确认）
if (process.argv.includes('--fix')) {
  main();
} else {
  console.log('🔧 字段命名自动修复工具');
  console.log('使用方法: node api-mapping-fix.cjs --fix');
  console.log('⚠️  运行前请备份代码！');
}
