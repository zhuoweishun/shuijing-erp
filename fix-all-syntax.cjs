const fs = require('fs');
const path = require('path');

function fixSyntaxErrors(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      fixSyntaxErrors(path.join(dir, file.name));
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      const filePath = path.join(dir, file.name);
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;
        
        // 修复常见的语法错误
        const fixes = [
          // 修复缺少分号的return语句
          { pattern: /return obj}/g, replacement: 'return obj;' },
          { pattern: /return converted}/g, replacement: 'return converted;' },
          
          // 修复缺少分号的if语句结尾
          { pattern: /\}\s*$(?!\s*[;}])/gm, replacement: '};' },
          
          // 修复函数参数类型注解错误
          { pattern: /\}\)\s*:\s*(\w+)\s*\)\s*\{/g, replacement: '}): $1) {' },
          { pattern: /\)\s*:\s*(\w+)\s*\)\s*\{/g, replacement: '): $1) {' },
          
          // 修复缺少右括号的函数调用
          { pattern: /convertToApiFormat\(value}/g, replacement: 'convertToApiFormat(value)' },
          { pattern: /convertFromApiFormat\(value}/g, replacement: 'convertFromApiFormat(value)' },
          { pattern: /convertToApiFormat\(item}/g, replacement: 'convertToApiFormat(item)' },
          { pattern: /convertFromApiFormat\(item}/g, replacement: 'convertFromApiFormat(item)' },
          
          // 修复缺少右括号的其他函数调用
          { pattern: /trim\(\s*,/g, replacement: 'trim(),' },
          { pattern: /localStorage\.getItem\('auth_token'}/g, replacement: "localStorage.getItem('auth_token')" },
          
          // 修复JSON.stringify缺少右括号
          { pattern: /JSON\.stringify\(form_data}/g, replacement: 'JSON.stringify(form_data)' },
          
          // 修复setFormData调用
          { pattern: /setform_data\(/g, replacement: 'setFormData(' },
          { pattern: /setFormData\(\{\s*quantity:\s*1\s*\}\)\)/g, replacement: 'setFormData({ quantity: 1 })' },
          
          // 修复seterror调用
          { pattern: /seterror\(/g, replacement: 'setError(' },
          
          // 修复其他常见错误
          { pattern: /\}\s*\)\s*\{\s*$/gm, replacement: '}) {' },
          { pattern: /\}\s*else\s*if\s*\(/g, replacement: '} else if (' },
          
          // 修复缺少分号的语句
          { pattern: /^(\s*)(\w+)\s*=\s*[^;]+(?<!;)$/gm, replacement: '$1$2;' },
        ];
        
        fixes.forEach(fix => {
          const newContent = content.replace(fix.pattern, fix.replacement);
          if (newContent !== content) {
            content = newContent;
            changed = true;
          }
        });
        
        if (changed) {
          fs.writeFileSync(filePath, content);
          console.log('Fixed syntax errors in:', filePath);
        }
        
      } catch (e) {
        console.error('Error processing', filePath, e.message);
      }
    }
  });
}

console.log('Starting comprehensive syntax fix...');
fixSyntaxErrors('src');
console.log('Syntax fix completed.');