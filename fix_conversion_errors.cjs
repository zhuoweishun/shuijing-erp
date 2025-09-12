#!/usr/bin/env node

/**
 * 修复蛇形命名转换过程中的错误
 * 解决变量名不一致等问题
 */

const fs = require('fs')
const path = require('path')

// 需要修复的文件扩展名
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx']

// 需要排除的目录
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.trae',
  'uploads',
  'backups',
  'backup_before_snake_conversion'
]

// 常见的转换错误映射（从错误的蛇形命名到正确的驼峰命名）
const ERROR_FIXES = {
  // API相关错误
  'handle_api_error': 'handleApiError',
  'ip_match': 'ipMatch',
  'cached_local_i_p': 'cachedLocalIP',
  'ip_detection_promise': 'ipDetectionPromise',
  'ensure_local_i_p': 'ensureLocalIP',
  'get_local_network_i_p': 'getLocalNetworkIP',
  'fix_image_url': 'fixImageUrl',
  'current_hostname': 'currentHostname',
  'cached_i_p': 'cachedIP',
  'new_url': 'newUrl',
  'url_match': 'urlMatch',
  'url_i_p': 'urlIP',
  'new_i_p': 'newIP',
  'debug_a_p_i': 'debugAPI',
  'backend_url': 'backendUrl',
  'full_url': 'fullUrl',
  
  // DOM API相关（这些应该保持原样）
  'ice_servers': 'iceServers',
  'create_data_channel': 'createDataChannel',
  'create_offer': 'createOffer',
  'set_local_description': 'setLocalDescription',
  'starts_with': 'startsWith',
  'set_item': 'setItem',
  'get_item': 'getItem',
  'remove_item': 'removeItem',
  
  // 常见的变量名错误
  'validation_results': 'validationResults',
  'total_violations': 'totalViolations',
  'validate_field_naming': 'validateFieldNaming',
  'quality_distribution': 'qualityDistribution',
  'distinct_qualities': 'distinctQualities',
  'has_b': 'hasB',
  'has_null': 'hasNull',
  'complete_qualities': 'completeQualities',
  'missing_qualities': 'missingQualities',
  'check_quality_distribution': 'checkQualityDistribution',
  'login_response': 'loginResponse',
  'get_test_token': 'getTestToken',
  'test_login': 'testLogin',
  'api_url': 'apiUrl',
  'base_url': 'baseUrl',
  'test_data': 'testData',
  'test_user': 'testUser',
  'user_data': 'userData',
  'response_data': 'responseData',
  'error_message': 'errorMessage',
  'status_code': 'statusCode',
  'content_type': 'contentType',
  'request_body': 'requestBody',
  'request_headers': 'requestHeaders',
  'response_headers': 'responseHeaders'
}

// 驼峰转蛇形的函数
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

// 蛇形转驼峰的函数
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
}

// 获取所有需要处理的文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        getAllFiles(filePath, fileList)
      }
    } else {
      const ext = path.extname(file)
      if (TARGET_EXTENSIONS.includes(ext)) {
        fileList.push(filePath)
      }
    }
  })
  
  return fileList
}

// 分析文件中的变量声明和使用
function analyzeVariables(content) {
  const variables = new Set()
  
  // 匹配变量声明
  const declarationPatterns = [
    /(const|let|var)\s+([a-z_][a-zA-Z0-9_]*)\s*[=:]/g,
    /function\s+([a-z_][a-zA-Z0-9_]*)\s*\(/g,
    /([a-z_][a-zA-Z0-9_]*)\s*=\s*\(/g,
    /([a-z_][a-zA-Z0-9_]*)\s*:/g
  ]
  
  declarationPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const varName = match[match.length - 1]
      if (varName && varName.includes('_')) {
        variables.add(varName)
      }
    }
  })
  
  return Array.from(variables)
}

// 修复文件内容
function fixFileContent(content, filePath) {
  let fixedContent = content
  let fixCount = 0
  const fixes = []
  
  // 分析文件中的变量
  const snakeVars = analyzeVariables(content)
  
  // 为每个蛇形变量创建对应的驼峰版本
  const localFixes = {}
  snakeVars.forEach(snakeVar => {
    const camelVar = snakeToCamel(snakeVar)
    if (camelVar !== snakeVar) {
      localFixes[snakeVar] = camelVar
    }
  })
  
  // 合并全局修复和本地修复
  const allFixes = { ...ERROR_FIXES, ...localFixes }
  
  // 应用修复
  Object.entries(allFixes).forEach(([wrongName, correctName]) => {
    const regex = new RegExp(`\\b${wrongName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
    const matches = content.match(regex)
    
    if (matches) {
      fixedContent = fixedContent.replace(regex, correctName)
      fixCount += matches.length
      fixes.push({
        wrong: wrongName,
        correct: correctName,
        count: matches.length
      })
    }
  })
  
  return { content: fixedContent, fixCount, fixes }
}

// 修复项目
function fixProject(projectPath) {
  console.log('🔧 开始修复转换错误...')
  console.log(`📁 项目路径: ${projectPath}`)
  
  const files = getAllFiles(projectPath)
  console.log(`📄 找到 ${files.length} 个文件需要检查`)
  
  let totalFixes = 0
  let fixedFiles = 0
  const allFixes = []
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const { content: fixedContent, fixCount, fixes } = fixFileContent(content, filePath)
      
      if (fixCount > 0) {
        fs.writeFileSync(filePath, fixedContent, 'utf8')
        const relativePath = path.relative(projectPath, filePath)
        console.log(`✏️  ${relativePath}: ${fixCount} 处修复`)
        
        if (fixes.length <= 10) {
          fixes.forEach(fix => {
            console.log(`     - ${fix.wrong} → ${fix.correct} (${fix.count}次)`)
          })
        } else {
          fixes.slice(0, 5).forEach(fix => {
            console.log(`     - ${fix.wrong} → ${fix.correct} (${fix.count}次)`)
          })
          console.log(`     ... 还有 ${fixes.length - 5} 处修复`)
        }
        
        totalFixes += fixCount
        fixedFiles++
        allFixes.push({ file: relativePath, fixes })
      }
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message)
    }
  })
  
  console.log('\n🎉 修复完成!')
  console.log(`📊 统计信息:`)
  console.log(`   - 修复文件数: ${fixedFiles}`)
  console.log(`   - 总修复数: ${totalFixes}`)
  
  if (totalFixes > 0) {
    console.log('\n⚠️  重要提醒:')
    console.log('   1. 请检查修复结果是否正确')
    console.log('   2. 运行测试确保功能正常')
  }
  
  return { fixedFiles, totalFixes, allFixes }
}

// 命令行执行
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd()
  fixProject(projectPath)
}

module.exports = {
  fixProject,
  fixFileContent,
  ERROR_FIXES,
  analyzeVariables,
  snakeToCamel,
  camelToSnake
}