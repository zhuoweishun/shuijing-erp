/**
 * 智能编译错误修复脚本
 * 根据TypeScript编译错误自动修复常见的字段命名和语法问题
 * 
 * 使用方法：
 * node scripts/smart-fix-compilation-errors.cjs
 * 
 * 作者：SOLO Coding
 * 日期：2025-01-10
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  projectRoot: path.resolve(__dirname, '..'),
  backupDir: path.resolve(__dirname, '../backups'),
  maxRetries: 3
};

// 常见错误模式和修复规则
const ERROR_PATTERNS = [
  // 未使用的变量
  {
    pattern: /error TS6133: '([^']+)' is declared but its value is never read\./,
    type: 'unused_variable',
    fix: (match, content, filePath) => {
      const varName = match[1];
      // 在变量名前添加下划线表示故意未使用
      return content.replace(
        new RegExp(`\\b(const|let|var)\\s+${varName}\\b`, 'g'),
        `$1 _${varName}`
      );
    }
  },
  
  // 缺少参数
  {
    pattern: /Expected (\d+) arguments, but got (\d+)\./,
    type: 'missing_arguments',
    fix: (match, content, filePath, line) => {
      // 这种错误需要根据具体上下文修复，暂时跳过
      return content;
    }
  },
  
  // 属性不存在错误（字段命名问题）
  {
    pattern: /Property '([^']+)' does not exist on type.*Did you mean '([^']+)'\?/,
    type: 'property_not_exist',
    fix: (match, content, filePath) => {
      const wrongProp = match[1];
      const correctProp = match[2];
      // 替换错误的属性名
      return content.replace(
        new RegExp(`\\.${wrongProp}\\b`, 'g'),
        `.${correctProp}`
      );
    }
  },
  
  // 重复标识符
  {
    pattern: /Duplicate identifier '([^']+)'\./,
    type: 'duplicate_identifier',
    fix: (match, content, filePath) => {
      const identifier = match[1];
      // 对于重复的字段，保留第一个，注释掉后续的
      const lines = content.split('\n');
      let foundFirst = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`${identifier}:`)) {
          if (foundFirst) {
            // 注释掉重复的行
            lines[i] = `  // ${lines[i].trim()} // 重复字段，已注释`;
          } else {
            foundFirst = true;
          }
        }
      }
      
      return lines.join('\n');
    }
  },
  
  // 找不到名称
  {
    pattern: /Cannot find name '([^']+)'\./,
    type: 'cannot_find_name',
    fix: (match, content, filePath, lineNumber, fullLine) => {
      const varName = match[1];
      
      // 常见的变量名修复映射
      const commonFixes = {
        'search_term': 'searchTerm',
        'current_page': 'currentPage',
        'total_price': 'totalPrice',
        'unit_price': 'unitPrice',
        'material_cost': 'materialCost',
        'labor_cost': 'laborCost',
        'craft_cost': 'craftCost'
      };
      
      if (commonFixes[varName]) {
        return content.replace(
          new RegExp(`\\b${varName}\\b`, 'g'),
          commonFixes[varName]
        );
      }
      
      // 如果是在函数参数中使用，尝试从上下文推断
      if (fullLine && fullLine.includes('toLowerCase()')) {
        // 可能是搜索相关的变量
        return content.replace(
          new RegExp(`\\b${varName}\\b`, 'g'),
          'searchValue'
        );
      }
      
      return content;
    }
  }
];

/**
 * 获取TypeScript编译错误
 */
function getCompilationErrors() {
  try {
    execSync('npm run build', { 
      cwd: CONFIG.projectRoot, 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    return []; // 没有错误
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    return parseCompilationErrors(output);
  }
}

/**
 * 解析编译错误输出
 */
function parseCompilationErrors(output) {
  const errors = [];
  const lines = output.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 匹配错误行格式：src/file.ts:line:col - error TSxxxx: message
    const errorMatch = line.match(/^(.+?):(\d+):(\d+) - error (TS\d+): (.+)$/);
    if (errorMatch) {
      const [, filePath, lineNum, colNum, errorCode, message] = errorMatch;
      
      // 获取错误的具体代码行
      let codeLine = '';
      if (i + 2 < lines.length && lines[i + 2].trim()) {
        codeLine = lines[i + 2].trim();
      }
      
      errors.push({
        filePath: path.resolve(CONFIG.projectRoot, filePath),
        lineNumber: parseInt(lineNum),
        columnNumber: parseInt(colNum),
        errorCode,
        message,
        codeLine,
        fullLine: line
      });
    }
  }
  
  return errors;
}

/**
 * 修复单个文件的错误
 */
function fixFileErrors(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ 文件不存在：${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fixCount = 0;
  
  // 按行号倒序处理，避免行号偏移问题
  const sortedErrors = errors.sort((a, b) => b.lineNumber - a.lineNumber);
  
  for (const error of sortedErrors) {
    for (const pattern of ERROR_PATTERNS) {
      const match = error.message.match(pattern.pattern);
      if (match) {
        console.log(`🔧 修复 ${pattern.type}: ${error.message}`);
        
        const newContent = pattern.fix(
          match, 
          content, 
          filePath, 
          error.lineNumber, 
          error.codeLine
        );
        
        if (newContent !== content) {
          content = newContent;
          modified = true;
          fixCount++;
        }
        break;
      }
    }
  }
  
  if (modified) {
    // 备份原文件
    const backupPath = path.join(
      CONFIG.backupDir, 
      'smart-fix-' + Date.now(),
      path.relative(CONFIG.projectRoot, filePath)
    );
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, backupPath);
    
    // 写入修复后的内容
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ 修复文件：${path.relative(CONFIG.projectRoot, filePath)} (${fixCount}处修复)`);
    return true;
  }
  
  return false;
}

/**
 * 按文件分组错误
 */
function groupErrorsByFile(errors) {
  const grouped = {};
  
  for (const error of errors) {
    if (!grouped[error.filePath]) {
      grouped[error.filePath] = [];
    }
    grouped[error.filePath].push(error);
  }
  
  return grouped;
}

/**
 * 主修复函数
 */
function main() {
  console.log('🚀 启动智能编译错误修复工具');
  console.log(`📁 项目根目录：${CONFIG.projectRoot}`);
  console.log('');
  
  let retryCount = 0;
  let totalFixed = 0;
  
  while (retryCount < CONFIG.maxRetries) {
    console.log(`🔍 第${retryCount + 1}轮检查编译错误...`);
    
    const errors = getCompilationErrors();
    
    if (errors.length === 0) {
      console.log('🎉 没有发现编译错误！');
      break;
    }
    
    console.log(`📋 发现 ${errors.length} 个编译错误`);
    
    // 按文件分组错误
    const groupedErrors = groupErrorsByFile(errors);
    const fileCount = Object.keys(groupedErrors).length;
    
    console.log(`📂 涉及 ${fileCount} 个文件`);
    console.log('');
    
    let roundFixed = 0;
    
    // 修复每个文件的错误
    for (const [filePath, fileErrors] of Object.entries(groupedErrors)) {
      console.log(`📝 处理文件：${path.relative(CONFIG.projectRoot, filePath)}`);
      console.log(`   错误数量：${fileErrors.length}`);
      
      const fixed = fixFileErrors(filePath, fileErrors);
      if (fixed) {
        roundFixed++;
      }
    }
    
    if (roundFixed === 0) {
      console.log('⚠️ 本轮没有修复任何错误，可能需要手动处理');
      break;
    }
    
    totalFixed += roundFixed;
    retryCount++;
    
    console.log('');
    console.log(`✅ 第${retryCount}轮修复完成：${roundFixed} 个文件`);
    console.log('');
  }
  
  // 最终检查
  console.log('🔍 最终编译检查...');
  const finalErrors = getCompilationErrors();
  
  console.log('');
  console.log('📊 修复完成总结：');
  console.log(`   修复轮数：${retryCount}`);
  console.log(`   修复文件：${totalFixed} 个`);
  console.log(`   剩余错误：${finalErrors.length} 个`);
  
  if (finalErrors.length > 0) {
    console.log('');
    console.log('⚠️ 剩余错误需要手动处理：');
    
    const remainingGrouped = groupErrorsByFile(finalErrors);
    for (const [filePath, fileErrors] of Object.entries(remainingGrouped)) {
      console.log(`📂 ${path.relative(CONFIG.projectRoot, filePath)}:`);
      for (const error of fileErrors.slice(0, 3)) { // 只显示前3个错误
        console.log(`   - 行${error.lineNumber}: ${error.message}`);
      }
      if (fileErrors.length > 3) {
        console.log(`   - ... 还有 ${fileErrors.length - 3} 个错误`);
      }
    }
  } else {
    console.log('');
    console.log('🎉 所有编译错误已修复！');
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  getCompilationErrors,
  parseCompilationErrors,
  fixFileErrors,
  groupErrorsByFile,
  ERROR_PATTERNS,
  CONFIG
};