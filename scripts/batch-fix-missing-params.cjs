const fs = require('fs');
const path = require('path');

/**
 * 批量修复参数名缺失问题
 * 这些问题是由于批量字段重命名时导致的语法错误
 */

// 常见的参数名映射
const PARAM_MAPPINGS = {
  // 函数参数模式匹配和修复
  patterns: [
    {
      // 匹配 (: string) 模式
      regex: /\(\s*:\s*string/g,
      getReplacements: (filePath, match, context) => {
        // 根据上下文推断参数名
        if (context.includes('material')) return '(material_id: string';
        if (context.includes('customer')) return '(customer_id: string';
        if (context.includes('supplier')) return '(supplier_id: string';
        if (context.includes('purchase')) return '(purchase_id: string';
        if (context.includes('product')) return '(product_id: string';
        if (context.includes('sku')) return '(sku_id: string';
        if (context.includes('sale')) return '(sale_id: string';
        if (context.includes('user')) return '(user_id: string';
        if (context.includes('note')) return '(note_id: string';
        if (context.includes('code') || context.includes('Code')) return '(code: string';
        if (context.includes('search') || context.includes('Search')) return '(search_term: string';
        if (context.includes('query') || context.includes('Query')) return '(query: string';
        if (context.includes('field') || context.includes('Field')) return '(field_name: string';
        if (context.includes('key') || context.includes('Key')) return '(key: string';
        if (context.includes('id') || context.includes('Id') || context.includes('ID')) return '(id: string';
        return '(param: string'; // 默认参数名
      }
    },
    {
      // 匹配 (: string, : string) 模式
      regex: /\(\s*:\s*string\s*,\s*:\s*string/g,
      getReplacements: (filePath, match, context) => {
        if (context.includes('customer') && context.includes('purchase')) {
          return '(customer_id: string, purchase_id: string';
        }
        if (context.includes('customer') && context.includes('note')) {
          return '(customer_id: string, note_id: string';
        }
        return '(param1: string, param2: string';
      }
    },
    {
      // 匹配 validation. && 模式
      regex: /validation\.\s*&&/g,
      getReplacements: () => 'validation.isValid &&'
    },
    {
      // 匹配 newExpanded.has() 模式
      regex: /newExpanded\.has\(\)/g,
      getReplacements: (filePath, match, context) => {
        if (context.includes('material')) return 'newExpanded.has(material_id)';
        if (context.includes('purchase')) return 'newExpanded.has(purchase_id)';
        return 'newExpanded.has(id)';
      }
    },
    {
      // 匹配 newExpanded.delete() 模式
      regex: /newExpanded\.delete\(\)/g,
      getReplacements: (filePath, match, context) => {
        if (context.includes('material')) return 'newExpanded.delete(material_id)';
        if (context.includes('purchase')) return 'newExpanded.delete(purchase_id)';
        return 'newExpanded.delete(id)';
      }
    },
    {
      // 匹配 newExpanded.add() 模式
      regex: /newExpanded\.add\(\)/g,
      getReplacements: (filePath, match, context) => {
        if (context.includes('material')) return 'newExpanded.add(material_id)';
        if (context.includes('purchase')) return 'newExpanded.add(purchase_id)';
        return 'newExpanded.add(id)';
      }
    },
    {
      // 匹配 if (!) 模式
      regex: /if\s*\(\s*!\s*\)/g,
      getReplacements: (filePath, match, context) => {
        if (context.includes('user_role')) return 'if (!user_role)';
        if (context.includes('code')) return 'if (!code)';
        if (context.includes('param')) return 'if (!param)';
        return 'if (!value)';
      }
    }
  ]
};

// 需要处理的文件扩展名
const TARGET_EXTENSIONS = ['.ts', '.tsx'];

// 排除的目录
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];

/**
 * 获取文件的上下文信息（前后几行）
 */
function getContext(content, matchIndex, contextLines = 3) {
  const lines = content.split('\n');
  const matchLine = content.substring(0, matchIndex).split('\n').length - 1;
  
  const startLine = Math.max(0, matchLine - contextLines);
  const endLine = Math.min(lines.length - 1, matchLine + contextLines);
  
  return lines.slice(startLine, endLine + 1).join('\n');
}

/**
 * 递归获取所有目标文件
 */
function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(item)) {
        getAllFiles(fullPath, files);
      }
    } else if (TARGET_EXTENSIONS.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modifiedContent = content;
  let hasChanges = false;
  const changes = [];
  
  // 应用所有修复模式
  for (const pattern of PARAM_MAPPINGS.patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    
    while ((match = regex.exec(content)) !== null) {
      const context = getContext(content, match.index);
      const replacement = pattern.getReplacements(filePath, match[0], context);
      
      if (replacement !== match[0]) {
        modifiedContent = modifiedContent.replace(match[0], replacement);
        hasChanges = true;
        changes.push({
          line: content.substring(0, match.index).split('\n').length,
          original: match[0],
          replacement: replacement,
          context: context.split('\n')[Math.floor(context.split('\n').length / 2)]
        });
      }
    }
  }
  
  // 如果有修改，写入文件
  if (hasChanges) {
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    console.log(`✅ 修复文件: ${path.relative(process.cwd(), filePath)}`);
    changes.forEach(change => {
      console.log(`   第${change.line}行: ${change.original} → ${change.replacement}`);
    });
    return changes.length;
  }
  
  return 0;
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 开始批量修复参数名缺失问题...');
  
  const srcDir = path.join(process.cwd(), 'src');
  const files = getAllFiles(srcDir);
  
  console.log(`📁 找到 ${files.length} 个文件需要检查`);
  
  let totalFiles = 0;
  let totalChanges = 0;
  
  for (const file of files) {
    const changes = fixFile(file);
    if (changes > 0) {
      totalFiles++;
      totalChanges += changes;
    }
  }
  
  console.log('\n📊 修复完成统计:');
  console.log(`   修复文件数: ${totalFiles}`);
  console.log(`   修复问题数: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n✨ 建议重启前端开发服务器以应用修复');
  } else {
    console.log('\n✅ 没有发现需要修复的问题');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main, fixFile, getAllFiles };