const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'src/App.tsx',
  'src/pages/Financial.tsx',
  'src/pages/Home.tsx',
  'src/pages/Login.tsx',
  'src/pages/ProductEntry.tsx',
  'src/pages/InventoryList.tsx',
  'src/pages/SalesList.tsx',
  'src/pages/PurchaseEntry.tsx',
  'src/pages/SupplierManagement.tsx',
  'src/pages/PurchaseList.tsx',
  'src/pages/Settings.tsx',
  'src/pages/UserManagement.tsx',
  'src/pages/CustomerManagement.tsx',
  'src/hooks/useAuth.tsx',
  'src/components/Layout.tsx',
  'src/components/ProtectedRoute.tsx'
];

// 语法修复规则
const fixRules = [
  // 修复注释后的分号
  { pattern: /\/\*[^*]*\*\/;/g, replacement: (match) => match.replace(/;$/, '') },
  
  // 修复JSX属性后的分号
  { pattern: /(\w+)=\{[^}]+\};/g, replacement: (match) => match.replace(/;$/, '') },
  
  // 修复单独的属性名后的分号
  { pattern: /(\s+)(\w+);(\s*)/g, replacement: '$1$2$3' },
  
  // 修复className模板字符串中的问题
  { pattern: /className=\{`([^`]*)`\};/g, replacement: 'className={`$1`}' },
  
  // 修复onClick等事件处理器后的分号
  { pattern: /(onClick=\{[^}]+\});/g, replacement: (match) => match.replace(/;$/, '') },
  
  // 修复disabled等布尔属性后的分号
  { pattern: /(disabled=\{[^}]+\});/g, replacement: (match) => match.replace(/;$/, '') },
  
  // 修复JSX表达式后的分号
  { pattern: /\{[^}]+\};(?=\s*[<>}])/g, replacement: (match) => match.replace(/;$/, '') },
  
  // 修复数组map后缺少的括号
  { pattern: /\.map\(\([^)]+\) => \(/g, replacement: (match) => match },
  
  // 修复驼峰命名为蛇形命名
  { pattern: /\bsetState\b/g, replacement: 'set_state' },
  { pattern: /\bisLoading\b/g, replacement: 'is_loading' },
  { pattern: /\bactiveTab\b/g, replacement: 'active_tab' },
  { pattern: /\bsetActiveTab\b/g, replacement: 'set_active_tab' },
  { pattern: /\bfetchOverview\b/g, replacement: 'fetch_overview' },
  { pattern: /\bformatAmount\b/g, replacement: 'format_amount' },
];

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`文件不存在: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 应用所有修复规则
    fixRules.forEach(rule => {
      content = content.replace(rule.pattern, rule.replacement);
    });
    
    // 如果内容有变化，写回文件
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 修复完成: ${filePath}`);
    } else {
      console.log(`⏭️  无需修复: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ 修复失败: ${filePath}`, error.message);
  }
}

console.log('🚀 开始全面语法修复...');

filesToFix.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  fixFile(fullPath);
});

console.log('✨ 全面语法修复完成！');
console.log('💡 建议重新启动开发服务器以确保所有更改生效。');