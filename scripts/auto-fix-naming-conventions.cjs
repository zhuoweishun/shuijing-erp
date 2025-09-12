/**
 * 自动修复命名规范脚本
 * 根据检查报告自动修复前端、后端、数据库的命名规范问题
 * 
 * 使用方法：
 * node scripts/auto-fix-naming-conventions.cjs
 * 
 * 作者：SOLO Coding
 * 日期：2025-01-10
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  projectRoot: path.resolve(__dirname, '..'),
  frontendSrc: path.resolve(__dirname, '../src'),
  backendSrc: path.resolve(__dirname, '../backend/src'),
  schemaFile: path.resolve(__dirname, '../backend/prisma/schema.prisma'),
  backupDir: path.resolve(__dirname, '../backups'),
  frontendExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  backendExtensions: ['.ts', '.js'],
  excludeDirs: ['node_modules', '.git', 'dist', 'build', 'coverage', '.trae']
};

// 字段映射表
const FIELD_MAPPINGS = {
  // 前端需要修复的字段（camelCase -> snake_case）
  frontend: {
    'totalQuantity': 'total_quantity',
    'sellingPrice': 'selling_price',
    'totalCost': 'total_cost',
    'materialCost': 'material_cost',
    'laborCost': 'labor_cost',
    'craftCost': 'craft_cost',
    'availableQuantity': 'available_quantity',
    'customerPhone': 'customer_phone',
    'customerAddress': 'customer_address',
    'lastSaleDate': 'last_sale_date'
  },
  
  // 后端需要修复的字段（snake_case -> camelCase）
  backend: {
    'available_quantity': 'availableQuantity',
    'customer_id': 'customerId',
    'customer_name': 'customerName',
    'purchase_id': 'purchaseId',
    'selling_price': 'sellingPrice',
    'unit_price': 'unitPrice',
    'total_price': 'totalPrice',
    'created_at': 'createdAt',
    'total_quantity': 'totalQuantity',
    'purchase_date': 'purchaseDate',
    'purchase_code': 'purchaseCode',
    'updated_at': 'updatedAt',
    'labor_cost': 'laborCost',
    'craft_cost': 'craftCost',
    'material_cost': 'materialCost',
    'total_cost': 'totalCost'
  }
};

// 需要特殊处理的文件（不进行自动修复）
const SKIP_FILES = [
  'fieldConverter.ts', // 字段转换器本身包含映射表
  'schema.prisma' // 数据库schema需要手动处理
];

/**
 * 创建备份目录
 */
function createBackupDir() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `backup-${timestamp}`);
  fs.mkdirSync(backupPath, { recursive: true });
  
  return backupPath;
}

/**
 * 备份文件
 */
function backupFile(filePath, backupDir) {
  const relativePath = path.relative(CONFIG.projectRoot, filePath);
  const backupPath = path.join(backupDir, relativePath);
  const backupDirPath = path.dirname(backupPath);
  
  if (!fs.existsSync(backupDirPath)) {
    fs.mkdirSync(backupDirPath, { recursive: true });
  }
  
  fs.copyFileSync(filePath, backupPath);
}

/**
 * 递归获取目录下的所有文件
 */
function getAllFiles(dir, extensions, excludeDirs = []) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        files.push(...getAllFiles(fullPath, extensions, excludeDirs));
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * 修复前端文件的命名规范
 */
function fixFrontendNaming(backupDir) {
  console.log('🔧 修复前端代码命名规范...');
  
  const files = getAllFiles(CONFIG.frontendSrc, CONFIG.frontendExtensions, CONFIG.excludeDirs);
  let fixedFiles = 0;
  let totalFixes = 0;
  
  for (const file of files) {
    const fileName = path.basename(file);
    
    // 跳过特殊文件
    if (SKIP_FILES.some(skipFile => fileName.includes(skipFile))) {
      console.log(`⏭️ 跳过文件：${path.relative(CONFIG.projectRoot, file)}`);
      continue;
    }
    
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    let fileFixCount = 0;
    
    // 替换字段名
    for (const [oldField, newField] of Object.entries(FIELD_MAPPINGS.frontend)) {
      // 使用正则表达式进行精确匹配，避免误替换
      const regex = new RegExp(`\\b${oldField}\\b`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        // 备份文件（只在第一次修改时备份）
        if (!modified) {
          backupFile(file, backupDir);
        }
        
        content = content.replace(regex, newField);
        modified = true;
        fileFixCount += matches.length;
        console.log(`   ✅ ${oldField} -> ${newField} (${matches.length}处)`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      fixedFiles++;
      totalFixes += fileFixCount;
      console.log(`📝 修复文件：${path.relative(CONFIG.projectRoot, file)} (${fileFixCount}处修复)`);
    }
  }
  
  console.log(`✅ 前端修复完成：${fixedFiles} 个文件，${totalFixes} 处修复`);
  return { files: fixedFiles, fixes: totalFixes };
}

/**
 * 修复后端文件的命名规范
 */
function fixBackendNaming(backupDir) {
  console.log('🔧 修复后端代码命名规范...');
  
  const files = getAllFiles(CONFIG.backendSrc, CONFIG.backendExtensions, CONFIG.excludeDirs);
  let fixedFiles = 0;
  let totalFixes = 0;
  
  for (const file of files) {
    const fileName = path.basename(file);
    
    // 跳过特殊文件
    if (SKIP_FILES.some(skipFile => fileName.includes(skipFile))) {
      console.log(`⏭️ 跳过文件：${path.relative(CONFIG.projectRoot, file)}`);
      continue;
    }
    
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    let fileFixCount = 0;
    
    // 替换字段名
    for (const [oldField, newField] of Object.entries(FIELD_MAPPINGS.backend)) {
      // 使用正则表达式进行精确匹配，避免误替换
      const regex = new RegExp(`\\b${oldField}\\b`, 'g');
      const matches = content.match(regex);
      
      if (matches) {
        // 备份文件（只在第一次修改时备份）
        if (!modified) {
          backupFile(file, backupDir);
        }
        
        content = content.replace(regex, newField);
        modified = true;
        fileFixCount += matches.length;
        console.log(`   ✅ ${oldField} -> ${newField} (${matches.length}处)`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      fixedFiles++;
      totalFixes += fileFixCount;
      console.log(`📝 修复文件：${path.relative(CONFIG.projectRoot, file)} (${fileFixCount}处修复)`);
    }
  }
  
  console.log(`✅ 后端修复完成：${fixedFiles} 个文件，${totalFixes} 处修复`);
  return { files: fixedFiles, fixes: totalFixes };
}

/**
 * 生成修复报告
 */
function generateFixReport(backupDir, frontendResult, backendResult) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(CONFIG.projectRoot, 'reports', `naming-fix-report-${timestamp}.md`);
  
  // 确保报告目录存在
  const reportDir = path.dirname(reportFile);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  let report = `# 命名规范修复报告\n\n`;
  report += `**修复时间：** ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  // 修复概览
  const totalFiles = frontendResult.files + backendResult.files;
  const totalFixes = frontendResult.fixes + backendResult.fixes;
  
  report += `## 📋 修复概览\n\n`;
  report += `- **修复文件总数：** ${totalFiles}\n`;
  report += `- **修复问题总数：** ${totalFixes}\n`;
  report += `- **前端修复：** ${frontendResult.files} 个文件，${frontendResult.fixes} 处修复\n`;
  report += `- **后端修复：** ${backendResult.files} 个文件，${backendResult.fixes} 处修复\n`;
  report += `- **备份位置：** ${path.relative(CONFIG.projectRoot, backupDir)}\n\n`;
  
  // 修复详情
  report += `## 🔧 修复详情\n\n`;
  
  report += `### 前端修复\n\n`;
  report += `以下字段已从 camelCase 修复为 snake_case：\n\n`;
  for (const [oldField, newField] of Object.entries(FIELD_MAPPINGS.frontend)) {
    report += `- \`${oldField}\` → \`${newField}\`\n`;
  }
  report += `\n`;
  
  report += `### 后端修复\n\n`;
  report += `以下字段已从 snake_case 修复为 camelCase：\n\n`;
  for (const [oldField, newField] of Object.entries(FIELD_MAPPINGS.backend)) {
    report += `- \`${oldField}\` → \`${newField}\`\n`;
  }
  report += `\n`;
  
  // 后续步骤
  report += `## 📋 后续步骤\n\n`;
  report += `1. **运行测试：** 确保修复没有破坏现有功能\n`;
  report += `2. **检查编译：** 运行 \`npm run build\` 检查是否有编译错误\n`;
  report += `3. **手动检查：** 检查 fieldConverter.ts 文件的映射表是否需要更新\n`;
  report += `4. **数据库Schema：** 手动检查并修复 Prisma schema 文件\n`;
  report += `5. **提交代码：** 确认修复无误后提交到版本控制\n\n`;
  
  // 回滚说明
  report += `## 🔄 回滚说明\n\n`;
  report += `如果修复出现问题，可以从备份目录恢复文件：\n`;
  report += `\`\`\`bash\n`;
  report += `# 恢复所有文件\n`;
  report += `cp -r ${path.relative(CONFIG.projectRoot, backupDir)}/* .\n`;
  report += `\`\`\`\n\n`;
  
  report += `---\n\n`;
  report += `**修复工具：** 自动命名规范修复器\n`;
  report += `**版本：** 1.0.0\n`;
  report += `**作者：** SOLO Coding\n`;
  
  fs.writeFileSync(reportFile, report, 'utf8');
  
  console.log(`📄 修复报告已生成：${reportFile}`);
  return reportFile;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 启动自动命名规范修复工具');
  console.log(`📁 项目根目录：${CONFIG.projectRoot}`);
  console.log('');
  
  try {
    // 创建备份
    console.log('💾 创建备份...');
    const backupDir = createBackupDir();
    console.log(`📦 备份目录：${backupDir}`);
    console.log('');
    
    // 修复前端
    const frontendResult = fixFrontendNaming(backupDir);
    console.log('');
    
    // 修复后端
    const backendResult = fixBackendNaming(backupDir);
    console.log('');
    
    // 生成报告
    console.log('📊 生成修复报告...');
    const reportFile = generateFixReport(backupDir, frontendResult, backendResult);
    
    // 输出总结
    const totalFiles = frontendResult.files + backendResult.files;
    const totalFixes = frontendResult.fixes + backendResult.fixes;
    
    console.log('');
    console.log('🎉 修复完成总结：');
    console.log(`   修复文件：${totalFiles} 个`);
    console.log(`   修复问题：${totalFixes} 处`);
    console.log(`   备份位置：${path.relative(CONFIG.projectRoot, backupDir)}`);
    console.log(`   修复报告：${path.relative(CONFIG.projectRoot, reportFile)}`);
    console.log('');
    
    if (totalFixes > 0) {
      console.log('⚠️ 重要提醒：');
      console.log('   1. 请运行测试确保修复没有破坏功能');
      console.log('   2. 请检查编译是否正常');
      console.log('   3. 请手动检查 fieldConverter.ts 和 schema.prisma');
      console.log('   4. 如有问题可从备份目录恢复文件');
    } else {
      console.log('✅ 没有发现需要修复的问题！');
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误：', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  fixFrontendNaming,
  fixBackendNaming,
  generateFixReport,
  CONFIG,
  FIELD_MAPPINGS
};