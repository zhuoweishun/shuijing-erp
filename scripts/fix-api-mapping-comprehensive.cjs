#!/usr/bin/env node

/**
 * 综合API字段映射修复工具
 * 结合检查、分析和自动修复功能
 */

const fs = require('fs');
const path = require('path');

// 字段转换函数
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// 标准字段映射表（扩展版）
const STANDARD_MAPPINGS = {
  // 产品相关
  'product_type': 'productType',
  'product_name': 'productName',
  'product_id': 'productId',
  'bead_diameter': 'beadDiameter',
  'piece_count': 'pieceCount',
  'product_types': 'productTypes',
  
  // 价格相关
  'price_per_gram': 'pricePerGram',
  'price_per_bead': 'pricePerBead',
  'unit_price': 'unitPrice',
  'total_price': 'totalPrice',
  
  // 供应商相关
  'supplier_name': 'supplierName',
  'supplier_code': 'supplierCode',
  'supplier_id': 'supplierId',
  
  // 采购相关
  'purchase_id': 'purchaseId',
  'purchase_date': 'purchaseDate',
  'total_quantity': 'totalQuantity',
  'remaining_beads': 'remainingBeads',
  
  // 库存相关
  'is_low_stock': 'isLowStock',
  'has_low_stock': 'hasLowStock',
  'total_variants': 'totalVariants',
  'low_stock_only': 'lowStockOnly',
  'specification_value': 'specificationValue',
  'specification_unit': 'specificationUnit',
  
  // 用户相关
  'user_id': 'userId',
  'user_name': 'userName',
  'real_name': 'realName',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  
  // 查询相关
  'sort_by': 'sortBy',
  'order_by': 'orderBy',
  'page_size': 'pageSize',
  'page_number': 'pageNumber',
  
  // AI相关
  'natural_language_input': 'naturalLanguageInput',
  'ai_recognition_result': 'aiRecognitionResult',
  'max_tokens': 'maxTokens'
};

// 反向映射
const REVERSE_MAPPINGS = Object.fromEntries(
  Object.entries(STANDARD_MAPPINGS).map(([snake, camel]) => [camel, snake])
);

/**
 * 智能字段替换
 * 根据文件类型和上下文智能选择替换策略
 */
function smartFieldReplace(content, filePath, mappings) {
  let newContent = content;
  let changes = [];
  
  const isBackendFile = filePath.includes('backend');
  const isFrontendFile = filePath.includes('src') && !filePath.includes('backend');
  
  Object.entries(mappings).forEach(([oldField, newField]) => {
    // 根据文件类型选择替换方向
    let searchField, replaceField;
    
    if (isBackendFile) {
      // 后端文件：snake_case -> camelCase
      searchField = oldField;
      replaceField = newField;
    } else if (isFrontendFile) {
      // 前端文件：camelCase -> snake_case（仅在API响应中）
      searchField = newField;
      replaceField = oldField;
    } else {
      return; // 跳过未知文件类型
    }
    
    // 定义替换模式
    const patterns = [
      // 对象属性定义
      {
        pattern: new RegExp(`(\\s+)${searchField}(\\s*:)`, 'g'),
        replacement: `$1${replaceField}$2`,
        description: '对象属性定义'
      },
      // 对象属性访问
      {
        pattern: new RegExp(`(\\.${searchField})(\\b)`, 'g'),
        replacement: `.${replaceField}$2`,
        description: '对象属性访问'
      },
      // 数组索引访问
      {
        pattern: new RegExp(`(\\['${searchField}'\\])`, 'g'),
        replacement: `['${replaceField}']`,
        description: '数组索引访问'
      },
      // 字符串字面量（在特定上下文中）
      {
        pattern: new RegExp(`(['"]${searchField}['"])`, 'g'),
        replacement: `'${replaceField}'`,
        description: '字符串字面量'
      },
      // SQL查询字段（仅后端）
      ...(isBackendFile ? [{
        pattern: new RegExp(`(SELECT|select)([^;]*\\b)${searchField}(\\b[^;]*)`, 'g'),
        replacement: `$1$2${replaceField}$3`,
        description: 'SQL查询字段'
      }] : [])
    ];
    
    patterns.forEach(({ pattern, replacement, description }) => {
      const matches = newContent.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        changes.push({
          field: `${searchField} -> ${replaceField}`,
          type: description,
          count: matches.length
        });
      }
    });
  });
  
  return { content: newContent, changes };
}

/**
 * 修复单个文件
 */
function fixFile(filePath, dryRun = true) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 文件不存在: ${filePath}`);
    return { success: false, changes: [] };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const { content: newContent, changes } = smartFieldReplace(content, filePath, STANDARD_MAPPINGS);
  
  if (changes.length === 0) {
    console.log(`✅ ${filePath} - 无需修复`);
    return { success: true, changes: [] };
  }
  
  console.log(`🔧 ${filePath} - 发现 ${changes.length} 种类型的字段需要修复:`);
  changes.forEach(change => {
    console.log(`  • ${change.field} (${change.type}, ${change.count}处)`);
  });
  
  if (!dryRun) {
    // 备份原文件
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, content);
    console.log(`  📄 已备份原文件: ${backupPath}`);
    
    // 写入修复后的内容
    fs.writeFileSync(filePath, newContent);
    console.log(`  ✅ 已修复文件: ${filePath}`);
  } else {
    console.log(`  🔍 预览模式 - 未实际修改文件`);
  }
  
  return { success: true, changes };
}

/**
 * 批量修复文件
 */
function batchFix(fileList, dryRun = true) {
  console.log(`🚀 开始批量修复 ${fileList.length} 个文件...`);
  console.log(`📋 模式: ${dryRun ? '预览模式（不会实际修改文件）' : '修复模式（会修改文件）'}`);
  
  const results = {
    total: fileList.length,
    fixed: 0,
    skipped: 0,
    failed: 0,
    totalChanges: 0,
    details: []
  };
  
  fileList.forEach((file, index) => {
    console.log(`\n[${index + 1}/${fileList.length}] 处理文件: ${file}`);
    
    try {
      const result = fixFile(file, dryRun);
      
      if (result.success) {
        if (result.changes.length > 0) {
          results.fixed++;
          results.totalChanges += result.changes.reduce((sum, change) => sum + change.count, 0);
        } else {
          results.skipped++;
        }
      } else {
        results.failed++;
      }
      
      results.details.push({
        file,
        success: result.success,
        changes: result.changes
      });
      
    } catch (error) {
      console.error(`❌ 处理文件失败: ${file}`, error.message);
      results.failed++;
      results.details.push({
        file,
        success: false,
        error: error.message
      });
    }
  });
  
  return results;
}

/**
 * 生成修复报告
 */
function generateReport(results, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.total,
      fixedFiles: results.fixed,
      skippedFiles: results.skipped,
      failedFiles: results.failed,
      totalChanges: results.totalChanges
    },
    details: results.details,
    fieldMappings: STANDARD_MAPPINGS,
    recommendations: [
      '在修复后运行测试确保功能正常',
      '检查API接口是否正常工作',
      '验证前后端数据传输是否正确',
      '更新相关文档和类型定义'
    ]
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 修复报告已保存: ${outputPath}`);
  
  return report;
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 综合API字段映射修复工具');
  console.log('=' .repeat(60));
  
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--fix');
  const forceAll = args.includes('--all');
  
  if (dryRun) {
    console.log('⚠️  当前为预览模式，不会实际修改文件');
    console.log('💡 使用 --fix 参数执行实际修复');
    console.log('💡 使用 --all 参数处理所有相关文件');
  } else {
    console.log('🚨 修复模式：将实际修改文件！');
    console.log('⚠️  请确保已备份重要文件！');
  }
  
  // 读取之前的检查报告
  const reportPath = path.join(__dirname, 'api-mapping-report.json');
  let filesToFix = [];
  
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    // 从报告中提取需要修复的文件
    const filesWithIssues = new Set();
    report.issues.naming.forEach(issue => {
      filesWithIssues.add(issue.file);
    });
    
    filesToFix = Array.from(filesWithIssues).map(file => 
      path.resolve(__dirname, '..', file)
    );
    
    console.log(`\n📋 从检查报告中发现 ${filesToFix.length} 个需要修复的文件`);
  } else {
    console.log('⚠️ 未找到检查报告，使用默认文件列表');
    
    // 默认文件列表
    filesToFix = [
      'src/services/api.ts',
      'backend/src/routes/inventory.ts',
      'backend/src/routes/purchases.ts',
      'backend/src/routes/products.ts',
      'backend/src/routes/users.ts',
      'backend/src/services/ai.ts'
    ].map(file => path.resolve(__dirname, '..', file));
  }
  
  if (forceAll) {
    // 扫描所有相关文件
    console.log('🔍 扫描所有相关文件...');
    // 这里可以添加文件扫描逻辑
  }
  
  console.log(`\n📁 将处理以下文件:`);
  filesToFix.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });
  
  if (!dryRun) {
    console.log('\n⏳ 等待 3 秒后开始修复...');
    // 在实际环境中这里应该有延迟
  }
  
  // 执行批量修复
  const results = batchFix(filesToFix, dryRun);
  
  // 生成报告
  const reportOutputPath = path.join(__dirname, 
    `api-mapping-fix-report-${Date.now()}.json`
  );
  generateReport(results, reportOutputPath);
  
  // 输出汇总
  console.log('\n' + '=' .repeat(60));
  console.log('📊 修复结果汇总:');
  console.log(`总文件数: ${results.total}`);
  console.log(`已修复: ${results.fixed}`);
  console.log(`已跳过: ${results.skipped}`);
  console.log(`失败: ${results.failed}`);
  console.log(`总修改数: ${results.totalChanges}`);
  
  if (dryRun && results.fixed > 0) {
    console.log('\n💡 预览完成！使用以下命令执行实际修复:');
    console.log('   node scripts/fix-api-mapping-comprehensive.cjs --fix');
  } else if (!dryRun && results.fixed > 0) {
    console.log('\n✅ 修复完成！建议执行以下操作:');
    console.log('   1. 运行 npm run check 检查语法错误');
    console.log('   2. 运行 npm run dev 测试应用');
    console.log('   3. 测试API接口功能');
    console.log('   4. 检查前后端数据传输');
  }
  
  console.log('\n🔧 如需更多帮助，请查看生成的报告文件');
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  smartFieldReplace,
  fixFile,
  batchFix,
  generateReport,
  STANDARD_MAPPINGS,
  REVERSE_MAPPINGS
};