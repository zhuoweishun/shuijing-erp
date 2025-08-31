#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 驼峰转下划线
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
}

// 检查是否为驼峰命名
function isCamelCase(str) {
  return /^[a-z][a-zA-Z]*[A-Z][a-zA-Z]*$/.test(str);
}

// 需要排除的特殊情况
const EXCLUDE_PATTERNS = [
  // React组件名
  /^[A-Z][a-zA-Z]*$/,
  // 函数名（以动词开头）
  /^(get|set|is|has|can|should|will|create|update|delete|fetch|load|save|handle|on|use)[A-Z]/,
  // 常见的React hooks
  /^use[A-Z]/,
  // 事件处理函数
  /^on[A-Z]/,
  // 常见的布尔值前缀
  /^(is|has|can|should|will)[A-Z]/,
  // TypeScript类型名
  /^[A-Z][a-zA-Z]*Type$/,
  /^[A-Z][a-zA-Z]*Interface$/,
  /^[A-Z][a-zA-Z]*Props$/,
  /^[A-Z][a-zA-Z]*State$/,
  // 常见的库名或组件名
  /^(React|Component|Element|Node|Window|Document|Event|Error|Promise|Array|Object|String|Number|Boolean|Date|RegExp|Function|Symbol|Map|Set|WeakMap|WeakSet)$/,
  // 常见的API相关名称
  /^(API|HTTP|URL|URI|JSON|XML|HTML|CSS|JS|TS|JSX|TSX)$/,
  // 常见的缩写
  /^(ID|UUID|URL|API|HTTP|HTTPS|TCP|UDP|IP|DNS|SSL|TLS|JWT|OAuth|CORS|CSRF|XSS|SQL|NoSQL|REST|GraphQL|WebSocket|WebRTC)$/i
];

// JavaScript内置方法和属性（不应该转换）
const JS_BUILTIN_METHODS = new Set([
  // String方法
  'charAt', 'charCodeAt', 'codePointAt', 'concat', 'endsWith', 'includes', 'indexOf', 'lastIndexOf',
  'localeCompare', 'match', 'normalize', 'padEnd', 'padStart', 'repeat', 'replace', 'replaceAll',
  'search', 'slice', 'split', 'startsWith', 'substring', 'toLocaleLowerCase', 'toLocaleUpperCase',
  'toLowerCase', 'toString', 'toUpperCase', 'trim', 'trimEnd', 'trimStart', 'valueOf',
  // Array方法
  'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'findLast',
  'findLastIndex', 'flat', 'flatMap', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf',
  'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some', 'sort',
  'splice', 'toLocaleString', 'toString', 'unshift', 'values',
  // Number方法
  'toExponential', 'toFixed', 'toPrecision', 'toString', 'valueOf',
  // Date方法
  'getDate', 'getDay', 'getFullYear', 'getHours', 'getMilliseconds', 'getMinutes', 'getMonth',
  'getSeconds', 'getTime', 'getTimezoneOffset', 'getUTCDate', 'getUTCDay', 'getUTCFullYear',
  'getUTCHours', 'getUTCMilliseconds', 'getUTCMinutes', 'getUTCMonth', 'getUTCSeconds',
  'setDate', 'setFullYear', 'setHours', 'setMilliseconds', 'setMinutes', 'setMonth', 'setSeconds',
  'setTime', 'setUTCDate', 'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes',
  'setUTCMonth', 'setUTCSeconds', 'toDateString', 'toISOString', 'toJSON', 'toLocaleDateString',
  'toLocaleString', 'toLocaleTimeString', 'toString', 'toTimeString', 'toUTCString', 'valueOf',
  // Object方法
  'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf',
  // Promise方法
  'then', 'catch', 'finally',
  // DOM方法
  'addEventListener', 'removeEventListener', 'appendChild', 'removeChild', 'insertBefore',
  'replaceChild', 'cloneNode', 'getAttribute', 'setAttribute', 'removeAttribute', 'hasAttribute',
  'getElementsByTagName', 'getElementsByClassName', 'getElementById', 'querySelector', 'querySelectorAll',
  'createElement', 'createTextNode', 'createDocumentFragment',
  // 其他常见方法
  'preventDefault', 'stopPropagation', 'stopImmediatePropagation'
]);

// 检查是否应该排除
function shouldExclude(str) {
  // 检查是否为JavaScript内置方法
  if (JS_BUILTIN_METHODS.has(str)) {
    return true;
  }
  
  // 检查其他排除模式
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(str));
}

// 扫描文件中的驼峰字段
function scanFile(filePath) {
  const results = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // 匹配接口定义、类型定义中的字段
      const fieldMatches = line.match(/^\s*([a-z][a-zA-Z]*[A-Z][a-zA-Z]*)\s*[?:]\s*/g);
      if (fieldMatches) {
        fieldMatches.forEach(match => {
          const field = match.replace(/\s*[?:]\s*$/, '').trim();
          if (isCamelCase(field) && !shouldExclude(field)) {
            results.push({
              file: filePath,
              line: index + 1,
              field: field,
              suggested: camelToSnake(field),
              context: line.trim(),
              type: 'field_definition'
            });
          }
        });
      }
      
      // 匹配对象属性访问
      const propertyMatches = line.match(/\.(\w+)/g);
      if (propertyMatches) {
        propertyMatches.forEach(match => {
          const property = match.substring(1); // 去掉点号
          if (isCamelCase(property) && !shouldExclude(property)) {
            results.push({
              file: filePath,
              line: index + 1,
              field: property,
              suggested: camelToSnake(property),
              context: line.trim(),
              type: 'property_access'
            });
          }
        });
      }
      
      // 匹配字符串字面量中的字段名（API相关）
      const stringMatches = line.match(/['"`]([a-z][a-zA-Z]*[A-Z][a-zA-Z]*)['"`]/g);
      if (stringMatches) {
        stringMatches.forEach(match => {
          const field = match.slice(1, -1); // 去掉引号
          if (isCamelCase(field) && !shouldExclude(field)) {
            results.push({
              file: filePath,
              line: index + 1,
              field: field,
              suggested: camelToSnake(field),
              context: line.trim(),
              type: 'string_literal'
            });
          }
        });
      }
    });
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
  }
  
  return results;
}

// 扫描目录
function scanDirectory(dir, extensions = ['.ts', '.tsx']) {
  const results = [];
  
  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 排除node_modules和其他不需要的目录
          if (!item.startsWith('.') && 
              item !== 'node_modules' && 
              item !== 'dist' && 
              item !== 'build' && 
              item !== 'coverage') {
            scan(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            const fileResults = scanFile(fullPath);
            results.push(...fileResults);
          }
        }
      });
    } catch (error) {
      console.error(`扫描目录失败: ${currentDir}`, error.message);
    }
  }
  
  scan(dir);
  return results;
}

// 生成报告
function generateReport(results) {
  console.log('\n=== 驼峰字段转换报告 ===\n');
  
  if (results.length === 0) {
    console.log('✅ 未发现需要转换的驼峰字段');
    return;
  }
  
  // 按类型分组
  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});
  
  Object.entries(grouped).forEach(([type, items]) => {
    const typeNames = {
      'field_definition': '字段定义',
      'property_access': '属性访问',
      'string_literal': '字符串字面量'
    };
    
    console.log(`\n📋 ${typeNames[type] || type} (${items.length}个):\n`);
    
    // 去重并排序
    const uniqueFields = [...new Set(items.map(item => item.field))];
    uniqueFields.sort().forEach(field => {
      const suggested = camelToSnake(field);
      const count = items.filter(item => item.field === field).length;
      console.log(`  ${field} -> ${suggested} (${count}处)`);
    });
  });
  
  console.log(`\n📊 总计: ${results.length}个驼峰字段需要转换`);
  
  // 显示详细信息（前20个）
  console.log('\n📝 详细信息 (前20个):');
  results.slice(0, 20).forEach((item, index) => {
    const relativePath = path.relative(process.cwd(), item.file);
    console.log(`\n${index + 1}. ${relativePath}:${item.line}`);
    console.log(`   字段: ${item.field} -> ${item.suggested}`);
    console.log(`   类型: ${item.type}`);
    console.log(`   上下文: ${item.context}`);
  });
  
  if (results.length > 20) {
    console.log(`\n... 还有 ${results.length - 20} 个结果未显示`);
  }
}

// 执行批量替换
async function performBatchReplace(results) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  try {
    console.log('\n⚠️  警告: 批量替换操作不可逆，请确保已备份代码！');
    const confirm = await question('是否继续执行批量替换？(y/N): ');
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ 操作已取消');
      return;
    }
    
    // 按文件分组
    const fileGroups = results.reduce((acc, item) => {
      if (!acc[item.file]) acc[item.file] = [];
      acc[item.file].push(item);
      return acc;
    }, {});
    
    let totalReplacements = 0;
    
    Object.entries(fileGroups).forEach(([filePath, items]) => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let replacements = 0;
        
        // 创建替换映射
        const replacementMap = new Map();
        items.forEach(item => {
          replacementMap.set(item.field, item.suggested);
        });
        
        // 执行替换
        replacementMap.forEach((newName, oldName) => {
          const regex = new RegExp(`\\b${oldName}\\b`, 'g');
          const newContent = content.replace(regex, newName);
          if (newContent !== content) {
            content = newContent;
            replacements++;
          }
        });
        
        if (replacements > 0) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${replacements}个替换`);
          totalReplacements += replacements;
        }
      } catch (error) {
        console.error(`❌ 处理文件失败: ${filePath}`, error.message);
      }
    });
    
    console.log(`\n🎉 批量替换完成! 总计: ${totalReplacements}个替换`);
    
  } finally {
    rl.close();
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const srcDir = path.join(process.cwd(), 'src');
  
  console.log('🔍 开始扫描驼峰字段...');
  console.log(`📁 扫描目录: ${srcDir}`);
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src目录不存在');
    process.exit(1);
  }
  
  const results = scanDirectory(srcDir);
  generateReport(results);
  
  if (results.length > 0) {
    if (args.includes('--replace') || args.includes('-r')) {
      await performBatchReplace(results);
    } else {
      console.log('\n💡 提示: 使用 --replace 或 -r 参数执行批量替换');
      console.log('   例如: node scripts/convert-camel-to-snake.js --replace');
    }
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  camelToSnake,
  isCamelCase,
  shouldExclude,
  scanFile,
  scanDirectory,
  generateReport
};