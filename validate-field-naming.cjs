/**
 * 字段命名验证脚本
 * 验证前后端字段命名是否符合规范
 */

const fs = require('fs');
const path = require('path');

// 验证结果统计
let validationResults = {
  frontend: { total: 0, violations: 0, files: [] },
  backend: { total: 0, violations: 0, files: [] },
  summary: { totalFiles: 0, totalViolations: 0 }
};

// 字段命名规则
const NAMING_PATTERNS = {
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  snake_case: /^[a-z][a-z0-9_]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/
};

// 核心字段列表（需要重点检查的字段）
const CORE_FIELDS = [
  'availableQuantity', 'available_quantity',
  'skuCode', 'sku_code',
  'skuName', 'sku_name',
  'totalQuantity', 'total_quantity',
  'customerName', 'customer_name',
  'totalPurchases', 'total_purchases',
  'purchaseCode', 'purchase_code',
  'productName', 'product_name',
  'totalCost', 'total_cost',
  'staleCost', 'stale_cost',
  'staleCount', 'stale_count',
  'totalCount', 'total_count'
];

/**
 * 检查文件中的字段命名
 */
function checkFileFieldNaming(filePath, expectedFormat) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];
    
    // 提取字段名（简化版本，匹配常见模式）
    const fieldPatterns = [
      /\.(\w+)\s*[=:]/g,  // obj.field = 或 obj.field:
      /['"`](\w+)['"`]\s*:/g,  // "field":
      /\{\s*(\w+)\s*[,}]/g,  // { field }
      /(\w+)\s*:\s*['"`]/g   // field: "value"
    ];
    
    fieldPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const fieldName = match[1];
        
        // 跳过明显的非字段名
        if (fieldName.length < 2 || /^(if|for|while|const|let|var|function|return|import|export|from|as|type|interface|class|enum)$/.test(fieldName)) {
          continue;
        }
        
        // 检查是否符合期望格式
        const isValid = NAMING_PATTERNS[expectedFormat].test(fieldName);
        if (!isValid && CORE_FIELDS.includes(fieldName)) {
          violations.push({
            field: fieldName,
            expected: expectedFormat,
            line: content.substring(0, match.index).split('\n').length
          });
        }
      }
    });
    
    return violations;
  } catch (error) {
    console.warn(`无法读取文件 ${filePath}: ${error.message}`);
    return [];
  }
}

/**
 * 扫描目录中的文件
 */
function scanDirectory(dirPath, extensions, expectedFormat, category) {
  const files = [];
  
  function walkDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      items.forEach(item => {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    } catch (error) {
      console.warn(`无法扫描目录 ${currentPath}: ${error.message}`);
    }
  }
  
  walkDir(dirPath);
  
  // 检查每个文件
  files.forEach(filePath => {
    const violations = checkFileFieldNaming(filePath, expectedFormat);
    validationResults[category].total++;
    
    if (violations.length > 0) {
      validationResults[category].violations += violations.length;
      validationResults[category].files.push({
        path: path.relative(process.cwd(), filePath),
        violations: violations
      });
    }
  });
}

/**
 * 主验证函数
 */
function validateFieldNaming() {
  console.log('🔍 开始字段命名验证...');
  console.log('=' .repeat(60));
  
  // 检查前端文件（应使用 snake_case）
  console.log('📱 检查前端文件...');
  scanDirectory('./src', ['.tsx', '.ts'], 'snake_case', 'frontend');
  
  // 检查后端文件（应使用 camelCase）
  console.log('🖥️  检查后端文件...');
  scanDirectory('./backend/src', ['.ts', '.js'], 'camelCase', 'backend');
  
  // 生成报告
  generateReport();
}

/**
 * 生成验证报告
 */
function generateReport() {
  console.log('\n📊 字段命名验证报告');
  console.log('=' .repeat(60));
  
  // 前端结果
  console.log(`\n📱 前端验证结果:`);
  console.log(`   检查文件数: ${validationResults.frontend.total}`);
  console.log(`   违规字段数: ${validationResults.frontend.violations}`);
  console.log(`   状态: ${validationResults.frontend.violations === 0 ? '✅ 通过' : '❌ 有问题'}`);
  
  if (validationResults.frontend.files.length > 0) {
    console.log('\n   问题文件:');
    validationResults.frontend.files.slice(0, 5).forEach(file => {
      console.log(`   - ${file.path} (${file.violations.length}个违规)`);
    });
    if (validationResults.frontend.files.length > 5) {
      console.log(`   ... 还有 ${validationResults.frontend.files.length - 5} 个文件`);
    }
  }
  
  // 后端结果
  console.log(`\n🖥️  后端验证结果:`);
  console.log(`   检查文件数: ${validationResults.backend.total}`);
  console.log(`   违规字段数: ${validationResults.backend.violations}`);
  console.log(`   状态: ${validationResults.backend.violations === 0 ? '✅ 通过' : '❌ 有问题'}`);
  
  if (validationResults.backend.files.length > 0) {
    console.log('\n   问题文件:');
    validationResults.backend.files.slice(0, 5).forEach(file => {
      console.log(`   - ${file.path} (${file.violations.length}个违规)`);
    });
    if (validationResults.backend.files.length > 5) {
      console.log(`   ... 还有 ${validationResults.backend.files.length - 5} 个文件`);
    }
  }
  
  // 总结
  const totalViolations = validationResults.frontend.violations + validationResults.backend.violations;
  const totalFiles = validationResults.frontend.total + validationResults.backend.total;
  
  console.log(`\n📋 总结:`);
  console.log(`   总检查文件数: ${totalFiles}`);
  console.log(`   总违规字段数: ${totalViolations}`);
  console.log(`   整体状态: ${totalViolations === 0 ? '✅ 全部通过' : '❌ 需要修复'}`);
  
  // 保存详细报告
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles,
      totalViolations,
      status: totalViolations === 0 ? 'PASS' : 'FAIL'
    },
    frontend: validationResults.frontend,
    backend: validationResults.backend
  };
  
  fs.writeFileSync('field-naming-validation-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 详细报告已保存到: field-naming-validation-report.json');
  
  return totalViolations === 0;
}

// 执行验证
if (require.main === module) {
  const success = validateFieldNaming();
  process.exit(success ? 0 : 1);
}

module.exports = { validateFieldNaming };