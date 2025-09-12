/**
 * 字段命名规范检查工具
 * 检查前后端代码中的字段命名是否符合规范：
 * - 前端：snake_case
 * - 后端：camelCase  
 * - 数据库：snake_case
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  // 前端目录
  frontendDirs: [
    'src/components',
    'src/pages', 
    'src/hooks',
    'src/services',
    'src/utils',
    'src/types'
  ],
  // 后端目录
  backendDirs: [
    'backend/src/routes',
    'backend/src/services',
    'backend/src/utils',
    'backend/src/middleware'
  ],
  // 数据库文件
  schemaFile: 'backend/prisma/schema.prisma',
  // 字段转换工具
  fieldConverterFiles: [
    'src/utils/fieldConverter.ts',
    'backend/src/utils/fieldConverter.ts'
  ],
  // 核心业务模块关键字
  coreModules: ['sku', 'customer', 'purchase', 'product', 'financial'],
  // 文件扩展名
  frontendExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  backendExtensions: ['.ts', '.js']
};

// 字段命名模式
const PATTERNS = {
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  snakeCase: /^[a-z][a-z0-9_]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/
};

// 检查结果
const results = {
  frontend: {
    violations: [],
    mixedUsage: [],
    coreModuleIssues: [],
    coreModuleFields: []
  },
  backend: {
    violations: [],
    mixedUsage: [],
    coreModuleIssues: [],
    coreModuleFields: []
  },
  database: {
    violations: [],
    issues: []
  },
  fieldConverter: {
    missing: [],
    inconsistent: [],
    coverage: 0
  },
  summary: {
    totalFiles: 0,
    totalViolations: 0,
    criticalIssues: 0
  }
};

/**
 * 检查字段命名格式
 */
function checkFieldNaming(fieldName, expectedFormat) {
  switch (expectedFormat) {
    case 'camelCase':
      return PATTERNS.camelCase.test(fieldName);
    case 'snake_case':
      return PATTERNS.snakeCase.test(fieldName);
    case 'PascalCase':
      return PATTERNS.PascalCase.test(fieldName);
    default:
      return false;
  }
}

/**
 * 从文件内容中提取字段名
 */
function extractFields(content, fileType) {
  const fields = new Set();
  
  // TypeScript接口字段
  const interfaceFieldRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)[?]?:\s*[^;]+;?/gm;
  let match;
  while ((match = interfaceFieldRegex.exec(content)) !== null) {
    fields.add(match[1]);
  }
  
  // 对象属性
  const objectFieldRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  while ((match = objectFieldRegex.exec(content)) !== null) {
    // 排除函数名和一些特殊情况
    if (!match[1].includes('function') && !match[1].includes('const') && !match[1].includes('let')) {
      fields.add(match[1]);
    }
  }
  
  // API字段（特别是在API调用中）
  const apiFieldRegex = /['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]\s*:/g;
  while ((match = apiFieldRegex.exec(content)) !== null) {
    fields.add(match[1]);
  }
  
  // 点号访问的字段
  const dotFieldRegex = /\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  while ((match = dotFieldRegex.exec(content)) !== null) {
    // 排除方法调用
    if (!content.substring(match.index + match[0].length, match.index + match[0].length + 1).includes('(')) {
      fields.add(match[1]);
    }
  }
  
  return Array.from(fields);
}

/**
 * 检查单个文件
 */
function checkFile(filePath, expectedFormat, moduleType) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fields = extractFields(content, moduleType);
    const violations = [];
    const coreModuleFields = [];
    
    fields.forEach(field => {
      // 跳过一些特殊字段
      if (['id', 'key', 'ref', 'className', 'style', 'children', 'props'].includes(field)) {
        return;
      }
      
      if (!checkFieldNaming(field, expectedFormat)) {
        violations.push({
          field,
          file: filePath,
          expectedFormat,
          actualFormat: getFieldFormat(field)
        });
      }
      
      // 检查核心模块字段
      CONFIG.coreModules.forEach(module => {
        if (field.toLowerCase().includes(module)) {
          coreModuleFields.push({
            field,
            module,
            file: filePath,
            format: getFieldFormat(field)
          });
        }
      });
    });
    
    return { violations, coreModuleFields, totalFields: fields.length };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return { violations: [], coreModuleFields: [], totalFields: 0 };
  }
}

/**
 * 获取字段的实际格式
 */
function getFieldFormat(field) {
  if (PATTERNS.camelCase.test(field)) return 'camelCase';
  if (PATTERNS.snakeCase.test(field)) return 'snake_case';
  if (PATTERNS.PascalCase.test(field)) return 'PascalCase';
  return 'unknown';
}

/**
 * 递归扫描目录
 */
function scanDirectory(dir, extensions, expectedFormat, moduleType) {
  const violations = [];
  const coreModuleFields = [];
  let totalFields = 0;
  
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return { violations, coreModuleFields, totalFields };
  }
  
  function scanRecursive(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 跳过node_modules等目录
        if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
          scanRecursive(itemPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          const result = checkFile(itemPath, expectedFormat, moduleType);
          violations.push(...result.violations);
          coreModuleFields.push(...result.coreModuleFields);
          totalFields += result.totalFields;
          results.summary.totalFiles++;
        }
      }
    });
  }
  
  scanRecursive(dir);
  return { violations, coreModuleFields, totalFields };
}

/**
 * 检查数据库schema
 */
function checkDatabaseSchema() {
  const schemaPath = CONFIG.schemaFile;
  if (!fs.existsSync(schemaPath)) {
    console.warn(`Schema file not found: ${schemaPath}`);
    return;
  }
  
  const content = fs.readFileSync(schemaPath, 'utf8');
  
  // 提取模型字段
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let modelMatch;
  
  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const modelName = modelMatch[1];
    const modelContent = modelMatch[2];
    
    // 提取字段
    const fieldRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+/gm;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(modelContent)) !== null) {
      const fieldName = fieldMatch[1];
      
      // 跳过关系字段和特殊字段
      if (['id', 'createdAt', 'updatedAt'].includes(fieldName)) {
        continue;
      }
      
      if (!checkFieldNaming(fieldName, 'snake_case') && !checkFieldNaming(fieldName, 'camelCase')) {
        results.database.violations.push({
          model: modelName,
          field: fieldName,
          format: getFieldFormat(fieldName)
        });
      }
    }
  }
}

/**
 * 检查字段转换工具
 */
function checkFieldConverter() {
  CONFIG.fieldConverterFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.warn(`Field converter file not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 提取映射表
    const mappingRegex = /STANDARD_FIELD_MAPPINGS\s*=\s*{([^}]+)}/s;
    const match = mappingRegex.exec(content);
    
    if (match) {
      const mappingContent = match[1];
      const fieldMappings = {};
      
      // 提取映射关系
      const entryRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*['"`]([a-zA-Z_][a-zA-Z0-9_]*)['"`]/g;
      let entryMatch;
      
      while ((entryMatch = entryRegex.exec(mappingContent)) !== null) {
        const camelField = entryMatch[1];
        const snakeField = entryMatch[2];
        
        fieldMappings[camelField] = snakeField;
        
        // 检查映射是否正确
        if (!checkFieldNaming(camelField, 'camelCase')) {
          results.fieldConverter.inconsistent.push({
            field: camelField,
            issue: 'camelCase字段格式不正确',
            file: filePath
          });
        }
        
        if (!checkFieldNaming(snakeField, 'snake_case')) {
          results.fieldConverter.inconsistent.push({
            field: snakeField,
            issue: 'snake_case字段格式不正确',
            file: filePath
          });
        }
      }
      
      results.fieldConverter.coverage = Object.keys(fieldMappings).length;
    }
  });
}

/**
 * 生成报告
 */
function generateReport() {
  console.log('\n=== 字段命名规范检查报告 ===\n');
  
  // 统计总违规数
  results.summary.totalViolations = 
    results.frontend.violations.length +
    results.backend.violations.length +
    results.database.violations.length;
  
  // 前端检查结果
  console.log('📱 前端代码检查结果:');
  console.log(`  - 总违规数: ${results.frontend.violations.length}`);
  console.log(`  - 核心模块问题: ${results.frontend.coreModuleIssues.length}`);
  
  if (results.frontend.violations.length > 0) {
    console.log('\n  违规字段 (应使用 snake_case):');
    results.frontend.violations.slice(0, 10).forEach(v => {
      console.log(`    ❌ ${v.field} (${v.actualFormat}) in ${v.file}`);
    });
    if (results.frontend.violations.length > 10) {
      console.log(`    ... 还有 ${results.frontend.violations.length - 10} 个违规字段`);
    }
  }
  
  // 后端检查结果
  console.log('\n🔧 后端代码检查结果:');
  console.log(`  - 总违规数: ${results.backend.violations.length}`);
  console.log(`  - 核心模块问题: ${results.backend.coreModuleIssues.length}`);
  
  if (results.backend.violations.length > 0) {
    console.log('\n  违规字段 (应使用 camelCase):');
    results.backend.violations.slice(0, 10).forEach(v => {
      console.log(`    ❌ ${v.field} (${v.actualFormat}) in ${v.file}`);
    });
    if (results.backend.violations.length > 10) {
      console.log(`    ... 还有 ${results.backend.violations.length - 10} 个违规字段`);
    }
  }
  
  // 数据库检查结果
  console.log('\n🗄️ 数据库Schema检查结果:');
  console.log(`  - 总违规数: ${results.database.violations.length}`);
  
  if (results.database.violations.length > 0) {
    console.log('\n  违规字段:');
    results.database.violations.forEach(v => {
      console.log(`    ❌ ${v.model}.${v.field} (${v.format})`);
    });
  }
  
  // 字段转换工具检查结果
  console.log('\n🔄 字段转换工具检查结果:');
  console.log(`  - 映射表覆盖度: ${results.fieldConverter.coverage} 个字段`);
  console.log(`  - 不一致问题: ${results.fieldConverter.inconsistent.length}`);
  
  if (results.fieldConverter.inconsistent.length > 0) {
    console.log('\n  不一致问题:');
    results.fieldConverter.inconsistent.forEach(issue => {
      console.log(`    ⚠️ ${issue.field}: ${issue.issue}`);
    });
  }
  
  // 核心模块分析
  console.log('\n🎯 核心模块字段分析:');
  CONFIG.coreModules.forEach(module => {
    const frontendFields = results.frontend.coreModuleFields.filter(f => f.module === module);
    const backendFields = results.backend.coreModuleFields.filter(f => f.module === module);
    
    console.log(`\n  ${module.toUpperCase()} 模块:`);
    console.log(`    - 前端字段: ${frontendFields.length} 个`);
    console.log(`    - 后端字段: ${backendFields.length} 个`);
    
    // 检查是否有混合使用
    const frontendFormats = new Set(frontendFields.map(f => f.format));
    const backendFormats = new Set(backendFields.map(f => f.format));
    
    if (frontendFormats.size > 1) {
      console.log(`    ⚠️ 前端混合使用: ${Array.from(frontendFormats).join(', ')}`);
    }
    
    if (backendFormats.size > 1) {
      console.log(`    ⚠️ 后端混合使用: ${Array.from(backendFormats).join(', ')}`);
    }
  });
  
  // 总结
  console.log('\n📊 检查总结:');
  console.log(`  - 扫描文件数: ${results.summary.totalFiles}`);
  console.log(`  - 总违规数: ${results.summary.totalViolations}`);
  
  if (results.summary.totalViolations === 0) {
    console.log('\n✅ 恭喜！所有字段命名都符合规范！');
  } else {
    console.log('\n❌ 发现字段命名问题，建议修复后重新检查。');
    
    // 修复建议
    console.log('\n🔧 修复建议:');
    console.log('  1. 前端代码应统一使用 snake_case 命名');
    console.log('  2. 后端代码应统一使用 camelCase 命名');
    console.log('  3. 数据库字段应使用 snake_case 命名');
    console.log('  4. 使用 fieldConverter 工具进行自动转换');
    console.log('  5. 更新字段映射表以确保完整覆盖');
  }
}

/**
 * 主函数
 */
function main() {
  console.log('开始字段命名规范检查...');
  
  // 检查前端代码
  console.log('\n检查前端代码...');
  CONFIG.frontendDirs.forEach(dir => {
    const result = scanDirectory(dir, CONFIG.frontendExtensions, 'snake_case', 'frontend');
    results.frontend.violations.push(...result.violations);
    results.frontend.coreModuleFields.push(...result.coreModuleFields);
  });
  
  // 检查后端代码
  console.log('检查后端代码...');
  CONFIG.backendDirs.forEach(dir => {
    const result = scanDirectory(dir, CONFIG.backendExtensions, 'camelCase', 'backend');
    results.backend.violations.push(...result.violations);
    results.backend.coreModuleFields.push(...result.coreModuleFields);
  });
  
  // 检查数据库schema
  console.log('检查数据库Schema...');
  checkDatabaseSchema();
  
  // 检查字段转换工具
  console.log('检查字段转换工具...');
  checkFieldConverter();
  
  // 生成报告
  generateReport();
  
  // 保存详细报告到文件
  const reportPath = 'field-naming-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n详细报告已保存到: ${reportPath}`);
}

// 运行检查
if (require.main === module) {
  main();
}

module.exports = { main, results };