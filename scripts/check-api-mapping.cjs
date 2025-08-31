#!/usr/bin/env node

/**
 * 前后端API字段映射检查工具
 * 检查前后端接口字段命名规范和映射一致性
 */

const fs = require('fs');
const path = require('path');

// 项目路径配置
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRONTEND_SRC = path.join(PROJECT_ROOT, 'src');
const BACKEND_SRC = path.join(PROJECT_ROOT, 'backend', 'src');

// 字段命名规范
const NAMING_RULES = {
  frontend: 'snake_case', // 前端API响应应使用下划线命名
  backend: 'camelCase',   // 后端数据库字段使用驼峰命名
  database: 'camelCase'   // 数据库字段使用驼峰命名
};

// 核心模块API路径
const CORE_MODULES = {
  purchases: '/api/v1/purchases',
  suppliers: '/api/v1/suppliers', 
  users: '/api/v1/users',
  products: '/api/v1/products',
  inventory: '/api/v1/inventory',
  ai: '/api/v1/ai',
  assistant: '/api/v1/assistant'
};

// 字段映射检查结果
const mappingIssues = {
  inconsistentNaming: [],
  missingMapping: [],
  incorrectTransform: [],
  undocumentedFields: []
};

/**
 * 工具函数：检查字符串是否为驼峰命名
 */
function isCamelCase(str) {
  return /^[a-z][a-zA-Z0-9]*$/.test(str) && /[A-Z]/.test(str);
}

/**
 * 工具函数：检查字符串是否为下划线命名
 */
function isSnakeCase(str) {
  return /^[a-z][a-z0-9_]*$/.test(str) && /_/.test(str);
}

/**
 * 工具函数：驼峰转下划线
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
}

/**
 * 工具函数：下划线转驼峰
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * 扫描前端API调用代码
 */
function scanFrontendApiCalls() {
  const apiCalls = [];
  
  function scanFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // 查找API调用
        const apiCallMatch = line.match(/(?:apiClient\.|fetch\(|axios\.)(?:get|post|put|delete)\s*\(\s*['"`]([^'"` ]+)['"`]/);
        if (apiCallMatch) {
          const endpoint = apiCallMatch[1];
          
          // 查找字段使用
          const fieldMatches = line.match(/\b([a-z][a-zA-Z0-9_]*)[\s]*[:=]/g);
          if (fieldMatches) {
            fieldMatches.forEach(match => {
              const field = match.replace(/[\s:=]/g, '');
              apiCalls.push({
                file: path.relative(PROJECT_ROOT, filePath),
                line: index + 1,
                endpoint,
                field,
                context: line.trim(),
                type: 'frontend'
              });
            });
          }
        }
        
        // 查找字段访问模式
        const fieldAccessMatches = line.match(/\b(data|response|result)\.([a-z][a-zA-Z0-9_]*)/g);
        if (fieldAccessMatches) {
          fieldAccessMatches.forEach(match => {
            const field = match.split('.')[1];
            apiCalls.push({
              file: path.relative(PROJECT_ROOT, filePath),
              line: index + 1,
              endpoint: 'unknown',
              field,
              context: line.trim(),
              type: 'frontend_access'
            });
          });
        }
      });
    } catch (error) {
      console.warn(`警告: 无法读取文件 ${filePath}:`, error.message);
    }
  }
  
  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          scanFile(fullPath);
        }
      });
    } catch (error) {
      console.warn(`警告: 无法扫描目录 ${dir}:`, error.message);
    }
  }
  
  if (fs.existsSync(FRONTEND_SRC)) {
    scanDirectory(FRONTEND_SRC);
  }
  
  return apiCalls;
}

/**
 * 扫描后端路由和服务代码
 */
function scanBackendApiDefinitions() {
  const apiDefinitions = [];
  
  function scanFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // 查找路由定义
        const routeMatch = line.match(/router\.(get|post|put|delete)\s*\(\s*['"`]([^'"` ]+)['"`]/);
        if (routeMatch) {
          const method = routeMatch[1];
          const endpoint = routeMatch[2];
          
          apiDefinitions.push({
            file: path.relative(PROJECT_ROOT, filePath),
            line: index + 1,
            method,
            endpoint,
            context: line.trim(),
            type: 'backend_route'
          });
        }
        
        // 查找字段定义和返回
        const fieldMatches = line.match(/\b([a-z][a-zA-Z0-9_]*)[\s]*[:=]/g);
        if (fieldMatches) {
          fieldMatches.forEach(match => {
            const field = match.replace(/[\s:=]/g, '');
            apiDefinitions.push({
              file: path.relative(PROJECT_ROOT, filePath),
              line: index + 1,
              field,
              context: line.trim(),
              type: 'backend_field'
            });
          });
        }
      });
    } catch (error) {
      console.warn(`警告: 无法读取文件 ${filePath}:`, error.message);
    }
  }
  
  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          scanFile(fullPath);
        }
      });
    } catch (error) {
      console.warn(`警告: 无法扫描目录 ${dir}:`, error.message);
    }
  }
  
  if (fs.existsSync(BACKEND_SRC)) {
    scanDirectory(BACKEND_SRC);
  }
  
  return apiDefinitions;
}

/**
 * 检查字段命名规范
 */
function checkNamingConventions(frontendFields, backendFields) {
  const issues = [];
  
  // 检查前端字段是否符合snake_case规范
  frontendFields.forEach(item => {
    if (item.field && !isSnakeCase(item.field) && isCamelCase(item.field)) {
      issues.push({
        type: 'frontend_naming',
        severity: 'warning',
        file: item.file,
        line: item.line,
        field: item.field,
        expected: camelToSnake(item.field),
        message: `前端字段应使用snake_case命名: ${item.field} -> ${camelToSnake(item.field)}`,
        context: item.context
      });
    }
  });
  
  // 检查后端字段是否符合camelCase规范
  backendFields.forEach(item => {
    if (item.field && isSnakeCase(item.field)) {
      issues.push({
        type: 'backend_naming',
        severity: 'warning', 
        file: item.file,
        line: item.line,
        field: item.field,
        expected: snakeToCamel(item.field),
        message: `后端字段应使用camelCase命名: ${item.field} -> ${snakeToCamel(item.field)}`,
        context: item.context
      });
    }
  });
  
  return issues;
}

/**
 * 检查字段映射转换函数
 */
function checkMappingFunctions() {
  const issues = [];
  const mappingFiles = [
    path.join(FRONTEND_SRC, 'services', 'api.ts'),
    path.join(FRONTEND_SRC, 'utils', 'fieldMapping.ts'),
    path.join(BACKEND_SRC, 'utils', 'fieldMapping.ts')
  ];
  
  mappingFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 查找convertToApiFormat函数
        if (content.includes('convertToApiFormat')) {
          console.log(`✅ 找到字段转换函数: ${path.relative(PROJECT_ROOT, filePath)}`);
        } else {
          issues.push({
            type: 'missing_mapping',
            severity: 'error',
            file: path.relative(PROJECT_ROOT, filePath),
            message: '缺少convertToApiFormat字段转换函数'
          });
        }
      } catch (error) {
        console.warn(`警告: 无法检查映射文件 ${filePath}:`, error.message);
      }
    }
  });
  
  return issues;
}

/**
 * 生成检查报告
 */
function generateReport(frontendFields, backendFields, namingIssues, mappingIssues) {
  console.log('\n🔍 前后端API字段映射检查报告');
  console.log('=' .repeat(50));
  
  // 统计信息
  console.log('\n📊 统计信息:');
  console.log(`前端字段数量: ${frontendFields.length}`);
  console.log(`后端字段数量: ${backendFields.length}`);
  console.log(`命名规范问题: ${namingIssues.length}`);
  console.log(`映射函数问题: ${mappingIssues.length}`);
  
  // 命名规范问题
  if (namingIssues.length > 0) {
    console.log('\n⚠️  命名规范问题:');
    namingIssues.slice(0, 20).forEach(issue => {
      console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
      console.log(`    上下文: ${issue.context}`);
      console.log('');
    });
    
    if (namingIssues.length > 20) {
      console.log(`  ... 还有 ${namingIssues.length - 20} 个问题`);
    }
  }
  
  // 映射函数问题
  if (mappingIssues.length > 0) {
    console.log('\n❌ 映射函数问题:');
    mappingIssues.forEach(issue => {
      console.log(`  ${issue.file} - ${issue.message}`);
    });
  }
  
  // 核心模块检查
  console.log('\n🎯 核心模块API检查:');
  Object.entries(CORE_MODULES).forEach(([module, apiPath]) => {
    const frontendUsage = frontendFields.filter(f => f.endpoint && f.endpoint.includes(apiPath));
    const backendDefinition = backendFields.filter(b => b.endpoint && b.endpoint.includes(apiPath));
    
    console.log(`  ${module} (${apiPath}):`);
    console.log(`    前端调用: ${frontendUsage.length} 处`);
    console.log(`    后端定义: ${backendDefinition.length} 处`);
  });
  
  // 建议
  console.log('\n💡 修复建议:');
  console.log('  1. 前端API响应字段应使用snake_case命名');
  console.log('  2. 后端数据库字段应使用camelCase命名');
  console.log('  3. 使用convertToApiFormat函数进行字段转换');
  console.log('  4. 确保前后端字段映射一致性');
  console.log('  5. 参考《API接口统一规范文档》5.4节要求');
  
  return {
    summary: {
      frontendFields: frontendFields.length,
      backendFields: backendFields.length,
      namingIssues: namingIssues.length,
      mappingIssues: mappingIssues.length
    },
    issues: {
      naming: namingIssues,
      mapping: mappingIssues
    }
  };
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始检查前后端API字段映射...');
  
  try {
    // 扫描前端代码
    console.log('\n📱 扫描前端API调用...');
    const frontendFields = scanFrontendApiCalls();
    console.log(`找到 ${frontendFields.length} 个前端字段使用`);
    
    // 扫描后端代码
    console.log('\n🖥️  扫描后端API定义...');
    const backendFields = scanBackendApiDefinitions();
    console.log(`找到 ${backendFields.length} 个后端字段定义`);
    
    // 检查命名规范
    console.log('\n📝 检查字段命名规范...');
    const namingIssues = checkNamingConventions(frontendFields, backendFields);
    
    // 检查映射函数
    console.log('\n🔄 检查字段映射函数...');
    const mappingIssues = checkMappingFunctions();
    
    // 生成报告
    const report = generateReport(frontendFields, backendFields, namingIssues, mappingIssues);
    
    // 保存报告到文件
    const reportPath = path.join(PROJECT_ROOT, 'scripts', 'api-mapping-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    
    console.log('\n✅ 检查完成!');
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  main();
}

module.exports = {
  scanFrontendApiCalls,
  scanBackendApiDefinitions,
  checkNamingConventions,
  checkMappingFunctions,
  generateReport
};