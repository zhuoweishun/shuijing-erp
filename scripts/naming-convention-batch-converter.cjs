/**
 * 命名规范批量转换工具
 * 用于系统性检查和修复前端、后端、数据库的命名规范问题
 * 
 * 功能：
 * 1. 检查前端代码中的字段命名，确保统一使用snake_case
 * 2. 检查后端代码中的字段命名，确保统一使用camelCase
 * 3. 检查数据库schema中的字段命名，确保统一使用snake_case
 * 4. 生成详细的检查报告
 * 5. 提供自动修复建议
 * 
 * 使用方法：
 * node scripts/naming-convention-batch-converter.js [--fix] [--dry-run]
 * 
 * 参数：
 * --fix: 自动修复发现的问题
 * --dry-run: 只检查不修复，生成报告
 * 
 * 作者：SOLO Coding
 * 日期：2025-01-10
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  // 项目根目录
  projectRoot: path.resolve(__dirname, '..'),
  
  // 前端源码目录
  frontendSrc: path.resolve(__dirname, '../src'),
  
  // 后端源码目录
  backendSrc: path.resolve(__dirname, '../backend/src'),
  
  // 数据库schema文件
  schemaFile: path.resolve(__dirname, '../backend/prisma/schema.prisma'),
  
  // 报告输出目录
  reportDir: path.resolve(__dirname, '../reports'),
  
  // 需要检查的文件扩展名
  frontendExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  backendExtensions: ['.ts', '.js'],
  
  // 排除的目录
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '.trae']
};

// 命名规范模式
const NAMING_PATTERNS = {
  // 蛇形命名（前端和数据库）
  snake_case: /^[a-z][a-z0-9_]*$/,
  
  // 驼峰命名（后端）
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  
  // 常见的业务字段模式
  businessFields: {
    // SKU相关字段
    sku: /\b(sku_code|skuCode|sku_name|skuName|available_quantity|availableQuantity|total_quantity|totalQuantity)\b/g,
    
    // 客户相关字段
    customer: /\b(customer_id|customerId|customer_name|customerName|customer_phone|customerPhone|customer_address|customerAddress)\b/g,
    
    // 采购相关字段
    purchase: /\b(purchase_id|purchaseId|purchase_code|purchaseCode|purchase_date|purchaseDate)\b/g,
    
    // 价格相关字段
    price: /\b(unit_price|unitPrice|selling_price|sellingPrice|total_price|totalPrice|material_cost|materialCost|labor_cost|laborCost|craft_cost|craftCost|total_cost|totalCost)\b/g,
    
    // 时间相关字段
    time: /\b(created_at|createdAt|updated_at|updatedAt|last_sale_date|lastSaleDate)\b/g
  }
};

// 字段映射表（用于转换建议）
const FIELD_MAPPINGS = {
  // 前端 snake_case -> 后端 camelCase
  toBackend: {
    'sku_code': 'skuCode',
    'sku_name': 'skuName',
    'available_quantity': 'availableQuantity',
    'total_quantity': 'totalQuantity',
    'unit_price': 'unitPrice',
    'selling_price': 'sellingPrice',
    'material_cost': 'materialCost',
    'labor_cost': 'laborCost',
    'craft_cost': 'craftCost',
    'total_cost': 'totalCost',
    'last_sale_date': 'lastSaleDate',
    'customer_id': 'customerId',
    'customer_name': 'customerName',
    'customer_phone': 'customerPhone',
    'customer_address': 'customerAddress',
    'purchase_id': 'purchaseId',
    'purchase_code': 'purchaseCode',
    'purchase_date': 'purchaseDate',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt'
  },
  
  // 后端 camelCase -> 前端 snake_case
  toFrontend: {
    'skuCode': 'sku_code',
    'skuName': 'sku_name',
    'availableQuantity': 'available_quantity',
    'totalQuantity': 'total_quantity',
    'unitPrice': 'unit_price',
    'sellingPrice': 'selling_price',
    'materialCost': 'material_cost',
    'laborCost': 'labor_cost',
    'craftCost': 'craft_cost',
    'totalCost': 'total_cost',
    'lastSaleDate': 'last_sale_date',
    'customerId': 'customer_id',
    'customerName': 'customer_name',
    'customerPhone': 'customer_phone',
    'customerAddress': 'customer_address',
    'purchaseId': 'purchase_id',
    'purchaseCode': 'purchase_code',
    'purchaseDate': 'purchase_date',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
  }
};

// 检查结果存储
const checkResults = {
  frontend: {
    files: [],
    issues: [],
    summary: { total: 0, violations: 0, suggestions: 0 }
  },
  backend: {
    files: [],
    issues: [],
    summary: { total: 0, violations: 0, suggestions: 0 }
  },
  database: {
    files: [],
    issues: [],
    summary: { total: 0, violations: 0, suggestions: 0 }
  }
};

/**
 * 工具函数：转换命名格式
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 递归获取目录下的所有文件
 */
function getAllFiles(dir, extensions, excludeDirs = []) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        files.push(...getAllFiles(fullPath, extensions, excludeDirs));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * 检查前端代码命名规范
 */
function checkFrontendNaming() {
  console.log('🔍 检查前端代码命名规范...');
  
  const files = getAllFiles(CONFIG.frontendSrc, CONFIG.frontendExtensions, CONFIG.excludeDirs);
  checkResults.frontend.files = files;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(CONFIG.projectRoot, file);
    
    // 检查各种业务字段的命名
    for (const [category, pattern] of Object.entries(NAMING_PATTERNS.businessFields)) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // 检查是否为驼峰命名（在前端应该使用蛇形命名）
          if (NAMING_PATTERNS.camelCase.test(match)) {
            const suggestion = FIELD_MAPPINGS.toFrontend[match] || camelToSnake(match);
            checkResults.frontend.issues.push({
              file: relativePath,
              line: getLineNumber(content, match),
              field: match,
              category,
              issue: 'camelCase in frontend',
              suggestion,
              severity: 'warning'
            });
            checkResults.frontend.summary.violations++;
          }
        }
      }
    }
    
    checkResults.frontend.summary.total++;
  }
  
  console.log(`✅ 前端检查完成：${files.length} 个文件，${checkResults.frontend.summary.violations} 个问题`);
}

/**
 * 检查后端代码命名规范
 */
function checkBackendNaming() {
  console.log('🔍 检查后端代码命名规范...');
  
  const files = getAllFiles(CONFIG.backendSrc, CONFIG.backendExtensions, CONFIG.excludeDirs);
  checkResults.backend.files = files;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(CONFIG.projectRoot, file);
    
    // 检查各种业务字段的命名
    for (const [category, pattern] of Object.entries(NAMING_PATTERNS.businessFields)) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // 检查是否为蛇形命名（在后端应该使用驼峰命名）
          if (NAMING_PATTERNS.snake_case.test(match)) {
            const suggestion = FIELD_MAPPINGS.toBackend[match] || snakeToCamel(match);
            checkResults.backend.issues.push({
              file: relativePath,
              line: getLineNumber(content, match),
              field: match,
              category,
              issue: 'snake_case in backend',
              suggestion,
              severity: 'warning'
            });
            checkResults.backend.summary.violations++;
          }
        }
      }
    }
    
    checkResults.backend.summary.total++;
  }
  
  console.log(`✅ 后端检查完成：${files.length} 个文件，${checkResults.backend.summary.violations} 个问题`);
}

/**
 * 检查数据库schema命名规范
 */
function checkDatabaseNaming() {
  console.log('🔍 检查数据库schema命名规范...');
  
  if (!fs.existsSync(CONFIG.schemaFile)) {
    console.log('⚠️ 未找到Prisma schema文件');
    return;
  }
  
  const content = fs.readFileSync(CONFIG.schemaFile, 'utf8');
  const relativePath = path.relative(CONFIG.projectRoot, CONFIG.schemaFile);
  
  checkResults.database.files = [CONFIG.schemaFile];
  
  // 检查model字段定义
  const modelFieldPattern = /^\s*(\w+)\s+\w+/gm;
  let match;
  
  while ((match = modelFieldPattern.exec(content)) !== null) {
    const fieldName = match[1];
    
    // 跳过关键字和特殊字段
    if (['model', 'enum', 'id', 'map', 'default', 'unique', 'index'].includes(fieldName)) {
      continue;
    }
    
    // 检查是否为驼峰命名（在数据库应该使用蛇形命名）
    if (NAMING_PATTERNS.camelCase.test(fieldName)) {
      const suggestion = camelToSnake(fieldName);
      checkResults.database.issues.push({
        file: relativePath,
        line: getLineNumber(content, fieldName),
        field: fieldName,
        category: 'database_field',
        issue: 'camelCase in database schema',
        suggestion,
        severity: 'error'
      });
      checkResults.database.summary.violations++;
    }
  }
  
  checkResults.database.summary.total = 1;
  
  console.log(`✅ 数据库检查完成：1 个文件，${checkResults.database.summary.violations} 个问题`);
}

/**
 * 获取字符串在文件中的行号
 */
function getLineNumber(content, searchString) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * 生成检查报告
 */
function generateReport() {
  console.log('📊 生成检查报告...');
  
  // 确保报告目录存在
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(CONFIG.reportDir, `naming-convention-report-${timestamp}.md`);
  
  let report = `# 命名规范检查报告\n\n`;
  report += `**生成时间：** ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  // 总体概览
  const totalFiles = checkResults.frontend.summary.total + checkResults.backend.summary.total + checkResults.database.summary.total;
  const totalIssues = checkResults.frontend.summary.violations + checkResults.backend.summary.violations + checkResults.database.summary.violations;
  
  report += `## 📋 总体概览\n\n`;
  report += `- **检查文件总数：** ${totalFiles}\n`;
  report += `- **发现问题总数：** ${totalIssues}\n`;
  report += `- **前端问题：** ${checkResults.frontend.summary.violations}\n`;
  report += `- **后端问题：** ${checkResults.backend.summary.violations}\n`;
  report += `- **数据库问题：** ${checkResults.database.summary.violations}\n\n`;
  
  // 前端检查结果
  report += `## 🎨 前端代码检查结果\n\n`;
  report += `**检查文件数：** ${checkResults.frontend.summary.total}\n`;
  report += `**发现问题数：** ${checkResults.frontend.summary.violations}\n\n`;
  
  if (checkResults.frontend.issues.length > 0) {
    report += `### 问题详情\n\n`;
    report += `| 文件 | 行号 | 字段 | 类别 | 问题 | 建议修复 |\n`;
    report += `|------|------|------|------|------|----------|\n`;
    
    for (const issue of checkResults.frontend.issues) {
      report += `| ${issue.file} | ${issue.line} | \`${issue.field}\` | ${issue.category} | ${issue.issue} | \`${issue.suggestion}\` |\n`;
    }
    report += `\n`;
  } else {
    report += `✅ 前端代码命名规范符合要求\n\n`;
  }
  
  // 后端检查结果
  report += `## ⚙️ 后端代码检查结果\n\n`;
  report += `**检查文件数：** ${checkResults.backend.summary.total}\n`;
  report += `**发现问题数：** ${checkResults.backend.summary.violations}\n\n`;
  
  if (checkResults.backend.issues.length > 0) {
    report += `### 问题详情\n\n`;
    report += `| 文件 | 行号 | 字段 | 类别 | 问题 | 建议修复 |\n`;
    report += `|------|------|------|------|------|----------|\n`;
    
    for (const issue of checkResults.backend.issues) {
      report += `| ${issue.file} | ${issue.line} | \`${issue.field}\` | ${issue.category} | ${issue.issue} | \`${issue.suggestion}\` |\n`;
    }
    report += `\n`;
  } else {
    report += `✅ 后端代码命名规范符合要求\n\n`;
  }
  
  // 数据库检查结果
  report += `## 🗄️ 数据库Schema检查结果\n\n`;
  report += `**检查文件数：** ${checkResults.database.summary.total}\n`;
  report += `**发现问题数：** ${checkResults.database.summary.violations}\n\n`;
  
  if (checkResults.database.issues.length > 0) {
    report += `### 问题详情\n\n`;
    report += `| 文件 | 行号 | 字段 | 类别 | 问题 | 建议修复 |\n`;
    report += `|------|------|------|------|------|----------|\n`;
    
    for (const issue of checkResults.database.issues) {
      report += `| ${issue.file} | ${issue.line} | \`${issue.field}\` | ${issue.category} | ${issue.issue} | \`${issue.suggestion}\` |\n`;
    }
    report += `\n`;
  } else {
    report += `✅ 数据库Schema命名规范符合要求\n\n`;
  }
  
  // 修复建议
  report += `## 🔧 修复建议\n\n`;
  report += `### 命名规范要求\n\n`;
  report += `1. **前端代码：** 统一使用 \`snake_case\` 命名（如：\`sku_code\`、\`customer_name\`）\n`;
  report += `2. **后端代码：** 统一使用 \`camelCase\` 命名（如：\`skuCode\`、\`customerName\`）\n`;
  report += `3. **数据库字段：** 统一使用 \`snake_case\` 命名（如：\`sku_code\`、\`customer_name\`）\n\n`;
  
  report += `### 自动修复\n\n`;
  report += `运行以下命令进行自动修复：\n`;
  report += `\`\`\`bash\n`;
  report += `node scripts/naming-convention-batch-converter.js --fix\n`;
  report += `\`\`\`\n\n`;
  
  report += `### 手动修复\n\n`;
  report += `对于无法自动修复的问题，请根据上述问题详情进行手动修复。\n\n`;
  
  // 字段转换参考
  report += `## 📚 字段转换参考\n\n`;
  report += `### 常用字段映射表\n\n`;
  report += `| 前端 (snake_case) | 后端 (camelCase) | 数据库 (snake_case) |\n`;
  report += `|-------------------|------------------|---------------------|\n`;
  
  const commonFields = [
    ['sku_code', 'skuCode', 'sku_code'],
    ['sku_name', 'skuName', 'sku_name'],
    ['available_quantity', 'availableQuantity', 'available_quantity'],
    ['total_quantity', 'totalQuantity', 'total_quantity'],
    ['unit_price', 'unitPrice', 'unit_price'],
    ['selling_price', 'sellingPrice', 'selling_price'],
    ['customer_id', 'customerId', 'customer_id'],
    ['customer_name', 'customerName', 'customer_name'],
    ['purchase_id', 'purchaseId', 'purchase_id'],
    ['purchase_code', 'purchaseCode', 'purchase_code'],
    ['created_at', 'createdAt', 'created_at'],
    ['updated_at', 'updatedAt', 'updated_at']
  ];
  
  for (const [frontend, backend, database] of commonFields) {
    report += `| \`${frontend}\` | \`${backend}\` | \`${database}\` |\n`;
  }
  
  report += `\n---\n\n`;
  report += `**报告生成工具：** 命名规范批量转换器\n`;
  report += `**版本：** 1.0.0\n`;
  report += `**作者：** SOLO Coding\n`;
  
  fs.writeFileSync(reportFile, report, 'utf8');
  
  console.log(`📄 报告已生成：${reportFile}`);
  return reportFile;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const isDryRun = args.includes('--dry-run');
  
  console.log('🚀 启动命名规范批量转换工具');
  console.log(`📁 项目根目录：${CONFIG.projectRoot}`);
  console.log(`🎯 模式：${shouldFix ? '修复模式' : isDryRun ? '预览模式' : '检查模式'}`);
  console.log('');
  
  try {
    // 执行检查
    checkFrontendNaming();
    checkBackendNaming();
    checkDatabaseNaming();
    
    // 生成报告
    const reportFile = generateReport();
    
    // 输出总结
    const totalIssues = checkResults.frontend.summary.violations + 
                       checkResults.backend.summary.violations + 
                       checkResults.database.summary.violations;
    
    console.log('');
    console.log('📊 检查完成总结：');
    console.log(`   总问题数：${totalIssues}`);
    console.log(`   前端问题：${checkResults.frontend.summary.violations}`);
    console.log(`   后端问题：${checkResults.backend.summary.violations}`);
    console.log(`   数据库问题：${checkResults.database.summary.violations}`);
    console.log('');
    
    if (totalIssues > 0) {
      console.log('⚠️ 发现命名规范问题，请查看详细报告进行修复');
      console.log(`📄 详细报告：${reportFile}`);
      
      if (shouldFix) {
        console.log('🔧 自动修复功能开发中，请先手动修复');
      }
    } else {
      console.log('✅ 所有代码命名规范符合要求！');
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误：', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  checkFrontendNaming,
  checkBackendNaming,
  checkDatabaseNaming,
  generateReport,
  CONFIG,
  NAMING_PATTERNS,
  FIELD_MAPPINGS
};