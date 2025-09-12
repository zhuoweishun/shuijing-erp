const fs = require('fs');
const path = require('path');

// 超级语法修复器 - 一次性解决大量语法错误
class MegaSyntaxFixer {
  constructor() {
    this.fixCount = 0;
    this.fileCount = 0;
    this.errors = [];
  }

  // 主要修复规则
  getFixRules() {
    return [
      // 1. 修复 export default 函数声明后的分号
      {
        pattern: /export\s+default\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{[\s\S]*?\}\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after export default function'
      },
      
      // 2. 修复函数声明后的分号
      {
        pattern: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{[\s\S]*?\}\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after function declaration'
      },
      
      // 3. 修复 JSX 属性后的分号
      {
        pattern: /(\w+)\s*;\s*(?=\w+\s*=|\})/g,
        replacement: '$1',
        description: 'Remove semicolon after JSX attribute name'
      },
      
      // 4. 修复注释后的分号
      {
        pattern: /\/\*[\s\S]*?\*\/\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after comment'
      },
      
      // 5. 修复单行注释后的分号
      {
        pattern: /\/\/.*?;\s*$/gm,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after single line comment'
      },
      
      // 6. 修复 JSX 闭合标签前的分号
      {
        pattern: /;\s*(?=<\/)/g,
        replacement: '',
        description: 'Remove semicolon before JSX closing tag'
      },
      
      // 7. 修复 return 语句中的多余分号
      {
        pattern: /return\s*\([\s\S]*?\)\s*;\s*;/g,
        replacement: (match) => match.replace(/;\s*;/, ';'),
        description: 'Fix double semicolon in return statement'
      },
      
      // 8. 修复 if 语句后的分号
      {
        pattern: /if\s*\([^)]*\)\s*\{[\s\S]*?\}\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after if statement'
      },
      
      // 9. 修复 useEffect 后的分号
      {
        pattern: /useEffect\s*\([\s\S]*?\)\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after useEffect'
      },
      
      // 10. 修复 JSX 元素后的多余分号
      {
        pattern: /<\/\w+>\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after JSX element'
      },
      
      // 11. 修复对象字面量后的分号（在 JSX 中）
      {
        pattern: /\{[\s\S]*?\}\s*;\s*(?=\/>|>)/g,
        replacement: (match) => match.replace(/;\s*(?=\/>|>)/, ''),
        description: 'Remove semicolon after object literal in JSX'
      },
      
      // 12. 修复箭头函数后的分号
      {
        pattern: /=>\s*\{[\s\S]*?\}\s*;\s*(?=\)|,|\})/g,
        replacement: (match) => match.replace(/;\s*(?=\)|,|\})/, ''),
        description: 'Remove semicolon after arrow function'
      },
      
      // 13. 修复 className 中的多余分号
      {
        pattern: /className\s*=\s*\{[^}]*\}\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after className'
      },
      
      // 14. 修复 onClick 等事件处理器后的分号
      {
        pattern: /on\w+\s*=\s*\{[^}]*\}\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after event handler'
      },
      
      // 15. 修复 JSX 属性值后的分号
      {
        pattern: /=\s*"[^"]*"\s*;/g,
        replacement: (match) => match.replace(/;\s*$/, ''),
        description: 'Remove semicolon after JSX attribute value'
      },
      
      // 16. 修复多余的右括号和分号组合
      {
        pattern: /\)\s*;\s*\)/g,
        replacement: '))',
        description: 'Fix extra parenthesis and semicolon'
      },
      
      // 17. 修复 fieldConverter.ts 中的特定错误
      {
        pattern: /return\s+converter\(data\s+as\s+any\)\s+as\s+T\}\s*;/g,
        replacement: 'return converter(data as any) as T',
        description: 'Fix fieldConverter return statement'
      },
      
      // 18. 修复缺少的右括号
      {
        pattern: /return\s+converter\(data\s+as\s+any\)\s+as\s+T\}/g,
        replacement: 'return converter(data as any) as T',
        description: 'Fix missing parenthesis in return statement'
      },
      
      // 19. 修复 JSX 中的分号问题
      {
        pattern: /position\s*;\s*duration/g,
        replacement: 'position="bottom-right"\n          duration',
        description: 'Fix JSX position attribute'
      },
      
      // 20. 修复 toastOptions 分号问题
      {
        pattern: /toastOptions\s*;\s*\}\s*\}/g,
        replacement: 'toastOptions={{\n            style: {\n              background: "#363636",\n              color: "#fff",\n            },\n          }}',
        description: 'Fix toastOptions attribute'
      }
    ];
  }

  // 应用修复规则到文件内容
  applyFixes(content, filePath) {
    let fixedContent = content;
    let localFixCount = 0;
    
    const rules = this.getFixRules();
    
    for (const rule of rules) {
      const matches = fixedContent.match(rule.pattern);
      if (matches) {
        console.log(`  应用规则: ${rule.description} (${matches.length} 处)`);
        fixedContent = fixedContent.replace(rule.pattern, rule.replacement);
        localFixCount += matches.length;
      }
    }
    
    this.fixCount += localFixCount;
    return { content: fixedContent, fixes: localFixCount };
  }

  // 处理单个文件
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const result = this.applyFixes(content, filePath);
      
      if (result.fixes > 0) {
        fs.writeFileSync(filePath, result.content, 'utf8');
        console.log(`✅ 修复 ${filePath}: ${result.fixes} 个问题`);
        this.fileCount++;
      }
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
      this.errors.push({ file: filePath, error: error.message });
    }
  }

  // 递归处理目录
  processDirectory(dirPath, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过 node_modules 和其他不需要的目录
        if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
          this.processDirectory(fullPath, extensions);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          this.processFile(fullPath);
        }
      }
    }
  }

  // 运行修复
  run() {
    console.log('🚀 启动超级语法修复器...');
    console.log('📁 处理目录: src/');
    
    const startTime = Date.now();
    
    // 处理 src 目录
    this.processDirectory('./src');
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📊 修复完成统计:');
    console.log(`✅ 修复文件数: ${this.fileCount}`);
    console.log(`🔧 修复问题数: ${this.fixCount}`);
    console.log(`⏱️  耗时: ${duration.toFixed(2)} 秒`);
    
    if (this.errors.length > 0) {
      console.log(`\n❌ 错误文件数: ${this.errors.length}`);
      this.errors.forEach(err => {
        console.log(`  ${err.file}: ${err.error}`);
      });
    }
    
    console.log('\n🎉 超级语法修复器运行完成!');
  }
}

// 运行修复器
const fixer = new MegaSyntaxFixer();
fixer.run();