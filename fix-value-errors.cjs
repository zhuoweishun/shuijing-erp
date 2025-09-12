const fs = require('fs');
const path = require('path');

// 需要修复的文件列表和对应的正确变量名
const filesToFix = [
  {
    file: 'src/components/SkuDetailModal.tsx',
    correctVar: 'is_open'
  },
  {
    file: 'src/components/SalesDetailModal.tsx',
    correctVar: 'is_open'
  },
  {
    file: 'src/components/CustomerRefundModal.tsx',
    correctVar: 'is_open'
  },
  {
    file: 'src/components/RefundConfirmModal.tsx',
    correctVar: 'is_open'
  },
  {
    file: 'src/components/SkuControlModal.tsx',
    correctVar: 'is_open'
  },
  {
    file: 'src/components/CustomerDetailModal.tsx',
    correctVar: 'is_open'
  },
  {
    file: 'src/components/ReverseSaleModal.tsx',
    correctVar: 'is_open'
  }
];

let totalFixed = 0;
const fixReport = [];

console.log('🔧 开始批量修复组件中的 value 错误...');

filesToFix.forEach(({ file, correctVar }) => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${file}`);
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // 修复 if (!value) return null 错误
    const regex = /if \(!value\) return null/g;
    const replacement = `if (!${correctVar}) return null`;
    
    content = content.replace(regex, replacement);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFixed++;
      fixReport.push({
        file,
        fixed: true,
        change: `if (!value) return null → if (!${correctVar}) return null`
      });
      console.log(`✅ 修复: ${file}`);
    } else {
      fixReport.push({
        file,
        fixed: false,
        reason: '未找到需要修复的内容'
      });
      console.log(`ℹ️  跳过: ${file} (未找到需要修复的内容)`);
    }
  } catch (error) {
    console.error(`❌ 处理文件失败: ${file}`, error.message);
    fixReport.push({
      file,
      fixed: false,
      reason: `处理失败: ${error.message}`
    });
  }
});

console.log('\n📊 修复完成统计:');
console.log(`✅ 成功修复: ${totalFixed} 个文件`);
console.log(`⚠️  跳过文件: ${filesToFix.length - totalFixed} 个`);

// 生成修复报告
const reportPath = path.join(__dirname, 'value-error-fix-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalFiles: filesToFix.length,
  fixedFiles: totalFixed,
  skippedFiles: filesToFix.length - totalFixed,
  details: fixReport
}, null, 2));

console.log(`\n📄 详细报告已保存到: ${reportPath}`);
console.log('\n🎉 批量修复完成！');