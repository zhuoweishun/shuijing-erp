#!/usr/bin/env node

/**
 * API字段映射问题分析和修复建议工具
 * 基于检查报告提供详细的分析和修复方案
 */

const fs = require('fs');
const path = require('path');

// 读取检查报告
const reportPath = path.join(__dirname, 'api-mapping-report.json');

if (!fs.existsSync(reportPath)) {
  console.error('❌ 请先运行 check-api-mapping.cjs 生成检查报告');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

/**
 * 分析命名问题
 */
function analyzeNamingIssues() {
  const { naming } = report.issues;
  
  // 按类型分组
  const frontendIssues = naming.filter(issue => issue.type === 'frontend_naming');
  const backendIssues = naming.filter(issue => issue.type === 'backend_naming');
  
  // 按文件分组
  const fileGroups = {};
  naming.forEach(issue => {
    if (!fileGroups[issue.file]) {
      fileGroups[issue.file] = [];
    }
    fileGroups[issue.file].push(issue);
  });
  
  // 统计最常见的问题字段
  const fieldFrequency = {};
  naming.forEach(issue => {
    const field = issue.field;
    if (!fieldFrequency[field]) {
      fieldFrequency[field] = { count: 0, expected: issue.expected, files: new Set() };
    }
    fieldFrequency[field].count++;
    fieldFrequency[field].files.add(issue.file);
  });
  
  return {
    frontendIssues,
    backendIssues,
    fileGroups,
    fieldFrequency
  };
}

/**
 * 生成修复脚本
 */
function generateFixScript(analysis) {
  const { fieldFrequency } = analysis;
  
  // 按出现频率排序
  const sortedFields = Object.entries(fieldFrequency)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 20); // 取前20个最常见的问题
  
  let script = `#!/usr/bin/env node

/**
 * 自动修复API字段命名问题
 * 警告：请在运行前备份代码！
 */

const fs = require('fs');
const path = require('path');

// 字段映射表（从问题字段到正确字段）
const FIELD_MAPPINGS = {
`;
  
  sortedFields.forEach(([field, info]) => {
    script += `  '${field}': '${info.expected}',\n`;
  });
  
  script += `};

/**
 * 替换文件中的字段名
 */
function replaceFieldsInFile(filePath, mappings) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  Object.entries(mappings).forEach(([oldField, newField]) => {
    // 匹配字段定义模式
    const patterns = [
      new RegExp(\`\\b\${oldField}\\s*:\`, 'g'),
      new RegExp(\`\\b\${oldField}\\s*=\`, 'g'),
      new RegExp(\`\\.\${oldField}\\b\`, 'g'),
      new RegExp(\`\\[\${oldField}\\]\`, 'g')
    ];
    
    patterns.forEach(pattern => {
      const newContent = content.replace(pattern, (match) => {
        return match.replace(oldField, newField);
      });
      
      if (newContent !== content) {
        content = newContent;
        changed = true;
        console.log(\`  替换: \${oldField} -> \${newField}\`);
      }
    });
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(\`✅ 已更新: \${filePath}\`);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 开始自动修复字段命名问题...');
  console.log('⚠️  请确保已备份代码！');
  
  // 需要修复的文件列表
  const filesToFix = [
`;
  
  // 添加需要修复的文件
  const uniqueFiles = new Set();
  Object.values(fieldFrequency).forEach(info => {
    info.files.forEach(file => uniqueFiles.add(file));
  });
  
  Array.from(uniqueFiles).slice(0, 10).forEach(file => {
    script += `    '${file}',\n`;
  });
  
  script += `  ];
  
  filesToFix.forEach(file => {
    const fullPath = path.resolve(__dirname, '..', file);
    console.log(\`\n🔄 处理文件: \${file}\`);
    replaceFieldsInFile(fullPath, FIELD_MAPPINGS);
  });
  
  console.log('\n✅ 修复完成！请检查代码并测试功能。');
}

// 运行修复（需要 --fix 参数确认）
if (process.argv.includes('--fix')) {
  main();
} else {
  console.log('🔧 字段命名自动修复工具');
  console.log('使用方法: node api-mapping-fix.cjs --fix');
  console.log('⚠️  运行前请备份代码！');
}
`;
  
  return script;
}

/**
 * 生成详细分析报告
 */
function generateDetailedReport(analysis) {
  const { frontendIssues, backendIssues, fileGroups, fieldFrequency } = analysis;
  
  console.log('\n📊 API字段映射问题详细分析');
  console.log('=' .repeat(60));
  
  // 总体统计
  console.log('\n🎯 问题统计:');
  console.log(`总问题数: ${report.summary.namingIssues}`);
  console.log(`前端问题: ${frontendIssues.length}`);
  console.log(`后端问题: ${backendIssues.length}`);
  console.log(`涉及文件: ${Object.keys(fileGroups).length}`);
  
  // 最常见的问题字段
  console.log('\n🔥 最常见的问题字段 (前10个):');
  const topFields = Object.entries(fieldFrequency)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 10);
  
  topFields.forEach(([field, info], index) => {
    console.log(`  ${index + 1}. ${field} -> ${info.expected} (${info.count}次, ${info.files.size}个文件)`);
  });
  
  // 问题最多的文件
  console.log('\n📁 问题最多的文件 (前10个):');
  const topFiles = Object.entries(fileGroups)
    .sort(([,a], [,b]) => b.length - a.length)
    .slice(0, 10);
  
  topFiles.forEach(([file, issues], index) => {
    console.log(`  ${index + 1}. ${file} (${issues.length}个问题)`);
  });
  
  // 按模块分类
  console.log('\n🏗️  按模块分类:');
  const modules = {
    frontend_services: [],
    frontend_pages: [],
    frontend_components: [],
    backend_routes: [],
    backend_services: [],
    backend_utils: []
  };
  
  Object.entries(fileGroups).forEach(([file, issues]) => {
    if (file.includes('src\\services')) {
      modules.frontend_services.push(...issues);
    } else if (file.includes('src\\pages')) {
      modules.frontend_pages.push(...issues);
    } else if (file.includes('src\\components')) {
      modules.frontend_components.push(...issues);
    } else if (file.includes('backend\\src\\routes')) {
      modules.backend_routes.push(...issues);
    } else if (file.includes('backend\\src\\services')) {
      modules.backend_services.push(...issues);
    } else if (file.includes('backend\\src\\utils')) {
      modules.backend_utils.push(...issues);
    }
  });
  
  Object.entries(modules).forEach(([module, issues]) => {
    if (issues.length > 0) {
      console.log(`  ${module}: ${issues.length}个问题`);
    }
  });
  
  // 修复优先级建议
  console.log('\n🎯 修复优先级建议:');
  console.log('  1. 高优先级: API响应字段 (影响前后端通信)');
  console.log('  2. 中优先级: 数据库查询字段 (影响数据一致性)');
  console.log('  3. 低优先级: 内部变量名 (影响代码可读性)');
  
  // 具体修复建议
  console.log('\n💡 具体修复建议:');
  console.log('  1. 创建字段转换函数 convertToApiFormat');
  console.log('  2. 在API响应中统一使用snake_case');
  console.log('  3. 在数据库操作中统一使用camelCase');
  console.log('  4. 使用TypeScript接口约束字段命名');
  console.log('  5. 添加ESLint规则检查命名规范');
  
  return {
    topFields,
    topFiles,
    modules
  };
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始分析API字段映射问题...');
  
  try {
    // 分析命名问题
    const analysis = analyzeNamingIssues();
    
    // 生成详细报告
    const detailedReport = generateDetailedReport(analysis);
    
    // 生成修复脚本
    const fixScript = generateFixScript(analysis);
    const fixScriptPath = path.join(__dirname, 'api-mapping-fix.cjs');
    fs.writeFileSync(fixScriptPath, fixScript);
    console.log(`\n🔧 自动修复脚本已生成: ${fixScriptPath}`);
    
    // 保存详细分析结果
    const analysisPath = path.join(__dirname, 'api-mapping-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify({
      analysis,
      detailedReport,
      recommendations: {
        priority: 'high',
        actions: [
          '实现convertToApiFormat函数',
          '统一API响应字段命名为snake_case',
          '统一数据库字段命名为camelCase',
          '添加字段映射测试用例'
        ]
      }
    }, null, 2));
    
    console.log(`\n📄 详细分析结果已保存: ${analysisPath}`);
    console.log('\n✅ 分析完成!');
    
  } catch (error) {
    console.error('❌ 分析过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行分析
if (require.main === module) {
  main();
}

module.exports = {
  analyzeNamingIssues,
  generateFixScript,
  generateDetailedReport
};