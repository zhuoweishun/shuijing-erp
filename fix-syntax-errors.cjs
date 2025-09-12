const fs = require('fs');
const path = require('path');

const srcDir = './src';

function fixSyntaxErrors(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixSyntaxErrors(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      const originalContent = content;
      
      // 修复各种语法错误
      const fixes = [
        // 修复export default函数声明中的语法错误
        [/export\s+default\s+function\s+([^(]+)\(([^)]*?)\)\}\s*:\s*([^)]+)\)\s*\{/g, 'export default function $1($2): $3 {'],
        [/export\s+default\s+function\s+([^(]+)\(([^)]*?)\)\s*\{\;/g, 'export default function $1($2) {'],
        [/export\s+default\s+function\s+([^(]+)\(([^)]*?)\)\;\s*\{/g, 'export default function $1($2) {'],
        
        // 修复JSX属性中的语法错误
        [/onClick\s*=\s*\{([^}]+)\}\;/g, 'onClick={$1}'],
        [/value\s*=\s*\{([^}]+)\}\;/g, 'value={$1}'],
        [/onChange\s*=\s*\{([^}]+)\}\;/g, 'onChange={$1}'],
        [/className\s*=\s*\{([^}]+)\}\;/g, 'className={$1}'],
        [/placeholder\s*=\s*\{([^}]+)\}\;/g, 'placeholder={$1}'],
        [/disabled\s*=\s*\{([^}]+)\}\;/g, 'disabled={$1}'],
        [/type\s*=\s*\{([^}]+)\}\;/g, 'type={$1}'],
        [/maxLength\s*=\s*\{([^}]+)\}\;/g, 'maxLength={$1}'],
        [/rows\s*=\s*\{([^}]+)\}\;/g, 'rows={$1}'],
        
        // 修复方法名错误
        [/localStorage\.get_item/g, 'localStorage.getItem'],
        [/localStorage\.set_item/g, 'localStorage.setItem'],
        [/localStorage\.remove_item/g, 'localStorage.removeItem'],
        [/\.get_full_year\(/g, '.getFullYear('],
        [/\.get_month\(/g, '.getMonth('],
        [/\.get_date\(/g, '.getDate('],
        [/\.starts_with\(/g, '.startsWith('],
        [/\.ends_with\(/g, '.endsWith('],
        [/\.to_lower_case\(/g, '.toLowerCase('],
        [/\.to_upper_case\(/g, '.toUpperCase('],
        
        // 修复函数调用中的语法错误
        [/\(\{([^}]+)\)\}/g, '({$1})'],
        [/\{([^}]+)\)\}/g, '{$1}'],
        [/\{([^}]+)\;\}/g, '{$1}'],
        [/\{\)\}/g, '{}'],
        [/\(\)\}/g, '()'],
        
        // 修复对象和数组语法错误
        [/\{([^}]+)\,\s*\)/g, '{$1}'],
        [/\(([^)]+)\,\s*\}/g, '($1)'],
        [/\{([^}]+)\,\s*\;/g, '{$1'],
        
        // 修复箭头函数语法错误
        [/=>\s*\{\;/g, '=> {'],
        [/\}\)\)\s*\{/g, '}) {'],
        [/\)\s*\;\s*\{/g, ') {'],
        [/\,\s*\)\s*\{/g, ') {'],
        
        // 修复模板字符串错误
        [/\$\{([^}]+)\,\s*\}/g, '${$1}'],
        [/\$\{([^}]+)\)\s*\}/g, '${$1}'],
        
        // 修复条件表达式错误
        [/\?\s*([^:]+)\s*\,\s*:/g, '? $1 :'],
        [/\?\s*([^:]+)\s*\)\s*:/g, '? $1 :'],
        
        // 修复数组map函数错误
        [/\.map\(([^)]+)\,\s*\)/g, '.map($1)'],
        [/\.filter\(([^)]+)\,\s*\)/g, '.filter($1)'],
        [/\.forEach\(([^)]+)\,\s*\)/g, '.forEach($1)'],
        
        // 修复try-catch语法错误
        [/try\s*\{\;/g, 'try {'],
        [/catch\s*\(([^)]+)\)\s*\{\;/g, 'catch ($1) {'],
        [/finally\s*\{\;/g, 'finally {'],
        
        // 修复useState和其他hooks错误
        [/use_state</g, 'useState<'],
        [/use_effect\(/g, 'useEffect('],
        [/use_callback\(/g, 'useCallback('],
        [/use_memo\(/g, 'useMemo('],
        [/set_([a-zA-Z_]+)\(/g, 'set$1('],
        
        // 修复console.log语法错误
        [/console\.log\(([^)]+)\)\}/g, 'console.log($1)'],
        [/console\.error\(([^)]+)\)\}/g, 'console.error($1)'],
        
        // 修复JSX中的语法错误
        [/\{([^}]+)\}\;\s*>/g, '{$1}>'],
        [/<([^>]+)\;\s*>/g, '<$1>'],
        [/\{([^}]+)\;\s*\}/g, '{$1}'],
        
        // 修复函数参数中的语法错误
        [/\(([^)]+)\)\}\s*:\s*([^)]+)\)\s*=>/g, '($1): $2 =>'],
        [/\(([^)]+)\)\s*\{\s*:/g, '($1) => {'],
        
        // 修复其他常见语法错误
        [/\;\s*\}/g, '}'],
        [/\{\s*\;/g, '{'],
        [/\)\s*\;\s*\{/g, ') {'],
        [/\,\s*\)\s*\{/g, ') {'],
        [/\}\s*\;\s*\)/g, '})'],
        [/\{\s*\;\s*\}/g, '{}'],
        
        // 修复特殊的语法错误模式
        [/\}\)\s*\{/g, '}) {'],
        [/\)\}\s*\{/g, '}) {'],
        [/\{\s*\)\s*\}/g, '{}'],
        [/\(\s*\{\s*\)/g, '({})'],
        
        // 修复JSX组件闭合错误
        [/<([A-Z][^>]*?)\s*\}\s*>/g, '<$1>'],
        [/<\/([A-Z][^>]*?)\s*\}\s*>/g, '</$1>'],
        
        // 修复import/export语法错误
        [/import\s*\{([^}]+)\}\s*\;\s*from/g, 'import {$1} from'],
        [/export\s*\{([^}]+)\}\s*\;/g, 'export {$1}'],
        
        // 修复特定的错误模式
        [/\)\s*\}\s*\)/g, '})'],
        [/\{\s*\)\s*\{/g, '() => {'],
        [/\}\s*\)\s*\{/g, '}) => {'],
      ];
      
      fixes.forEach(([regex, replacement]) => {
        const newContent = content.replace(regex, replacement);
        if (newContent !== content) {
          content = newContent;
          changed = true;
        }
      });
      
      // 特殊处理：修复复杂的语法错误
      if (content.includes(')}')) {
        // 修复多余的括号组合
        content = content.replace(/\)\}\s*\)/g, '})');
        content = content.replace(/\{\s*\)\s*\}/g, '{}');
        content = content.replace(/\(\s*\}\s*\)/g, '()');
        changed = true;
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed:', filePath);
      }
    }
  });
}

fixSyntaxErrors(srcDir);
console.log('Advanced syntax fixes completed');