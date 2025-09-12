#!/usr/bin/env node

/**
 * 水晶ERP项目蛇形命名转换器
 * 专门为水晶ERP项目设计的驼峰转蛇形命名转换工具
 */

const fs = require('fs')
const path = require('path')

// 需要转换的文件扩展名
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

// 需要排除的文件
const EXCLUDE_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'snake_case_converter.js'
]

// 第三方库的API调用，不应该转换
const PRESERVE_IDENTIFIERS = [
  // React相关
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
  'useReducer', 'useLayoutEffect', 'useImperativeHandle', 'useDebugValue',
  'createElement', 'createContext', 'forwardRef', 'memo', 'lazy', 'Suspense',
  'Fragment', 'StrictMode', 'Component', 'PureComponent',
  
  // DOM相关
  'addEventListener', 'removeEventListener', 'querySelector', 'querySelectorAll',
  'getElementById', 'getElementsByClassName', 'getElementsByTagName',
  'appendChild', 'removeChild', 'insertBefore', 'replaceChild',
  'setAttribute', 'getAttribute', 'removeAttribute', 'hasAttribute',
  'classList', 'className', 'innerHTML', 'textContent', 'innerText',
  'offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight',
  'scrollTop', 'scrollLeft', 'scrollWidth', 'scrollHeight',
  
  // 浏览器API
  'localStorage', 'sessionStorage', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'XMLHttpRequest',
  
  // 第三方库
  'Router', 'Request', 'Response', 'NextFunction',
  'asyncHandler', 'authenticateToken',
  
  // 常见的保留字段
  'createdAt', 'updatedAt', 'deletedAt', 'isActive', 'isDeleted',
  
  // HTTP方法
  'get', 'post', 'put', 'delete', 'patch',
  
  // 特殊标识符
  'req', 'res', 'next', 'err', 'error',
  
  // 组件名（大写开头的保持不变）
  'App', 'Router', 'Route', 'Link', 'Navigate'
]

// 驼峰转蛇形的函数
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

// 检查是否应该保留的标识符
function shouldPreserve(identifier) {
  // 保留列表中的标识符
  if (PRESERVE_IDENTIFIERS.includes(identifier)) {
    return true
  }
  
  // React组件名（大写开头）
  if (/^[A-Z][a-zA-Z0-9]*$/.test(identifier)) {
    return true
  }
  
  // 常量（全大写）
  if (/^[A-Z][A-Z0-9_]*$/.test(identifier)) {
    return true
  }
  
  // 已经是蛇形命名
  if (identifier.includes('_')) {
    return true
  }
  
  // 单个字母或数字
  if (identifier.length <= 2) {
    return true
  }
  
  return false
}

// 检查是否为驼峰命名
function isCamelCase(identifier) {
  return /^[a-z][a-zA-Z0-9]*$/.test(identifier) && /[A-Z]/.test(identifier)
}

// 转换文件内容
function convertFileContent(content, filePath) {
  let convertedContent = content
  let changeCount = 0
  const changes = []
  
  // 匹配各种驼峰命名模式
  const patterns = [
    // 变量声明: const/let/var variableName
    {
      pattern: /(const|let|var)\s+([a-z][a-zA-Z0-9]*)(?=\s*[=:])/g,
      group: 2,
      description: '变量声明'
    },
    // 函数声明: function functionName
    {
      pattern: /function\s+([a-z][a-zA-Z0-9]*)(?=\s*\()/g,
      group: 1,
      description: '函数声明'
    },
    // 箭头函数: const functionName = 
    {
      pattern: /const\s+([a-z][a-zA-Z0-9]*)\s*=\s*\(/g,
      group: 1,
      description: '箭头函数'
    },
    // 对象属性: { propertyName: }
    {
      pattern: /([a-z][a-zA-Z0-9]*)\s*:/g,
      group: 1,
      description: '对象属性'
    },
    // 解构赋值: { propertyName }
    {
      pattern: /{\s*([a-z][a-zA-Z0-9]*)(?=\s*[,}])/g,
      group: 1,
      description: '解构赋值'
    },
    // 函数参数
    {
      pattern: /\(\s*([a-z][a-zA-Z0-9]*)(?=\s*[,:)])/g,
      group: 1,
      description: '函数参数'
    },
    // 点号访问: .propertyName
    {
      pattern: /\.([a-z][a-zA-Z0-9]*)(?=[^a-zA-Z0-9_])/g,
      group: 1,
      description: '属性访问'
    }
  ]
  
  patterns.forEach(({ pattern, group, description }) => {
    convertedContent = convertedContent.replace(pattern, (match, ...groups) => {
      const identifier = groups[group - 1]
      
      if (identifier && isCamelCase(identifier) && !shouldPreserve(identifier)) {
        const converted = camelToSnake(identifier)
        changes.push({
          type: description,
          original: identifier,
          converted: converted,
          line: (content.substring(0, content.indexOf(match)).match(/\n/g) || []).length + 1
        })
        changeCount++
        return match.replace(identifier, converted)
      }
      
      return match
    })
  })
  
  return { content: convertedContent, changeCount, changes }
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
      if (TARGET_EXTENSIONS.includes(ext) && !EXCLUDE_FILES.includes(file)) {
        fileList.push(filePath)
      }
    }
  })
  
  return fileList
}

// 分析项目中的驼峰命名
function analyzeProject(projectPath) {
  console.log('🔍 分析项目中的驼峰命名...')
  
  const files = getAllFiles(projectPath)
  const analysis = {
    totalFiles: files.length,
    filesWithCamelCase: 0,
    totalCamelCaseIdentifiers: 0,
    fileDetails: []
  }
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const { changeCount, changes } = convertFileContent(content, filePath)
      
      if (changeCount > 0) {
        analysis.filesWithCamelCase++
        analysis.totalCamelCaseIdentifiers += changeCount
        analysis.fileDetails.push({
          file: path.relative(projectPath, filePath),
          count: changeCount,
          changes: changes
        })
      }
    } catch (error) {
      console.error(`❌ 分析文件失败 ${filePath}:`, error.message)
    }
  })
  
  return analysis
}

// 执行转换
function convertProject(projectPath, dryRun = false) {
  console.log('🚀 开始蛇形命名转换...')
  console.log(`📁 项目路径: ${projectPath}`)
  console.log(`🔧 模式: ${dryRun ? '预览模式（不修改文件）' : '实际转换模式'}`)
  
  // 先分析项目
  const analysis = analyzeProject(projectPath)
  
  console.log('\n📊 分析结果:')
  console.log(`   - 总文件数: ${analysis.totalFiles}`)
  console.log(`   - 包含驼峰命名的文件: ${analysis.filesWithCamelCase}`)
  console.log(`   - 总驼峰标识符数: ${analysis.totalCamelCaseIdentifiers}`)
  
  if (analysis.filesWithCamelCase === 0) {
    console.log('✅ 项目中没有发现驼峰命名，无需转换')
    return
  }
  
  // 显示详细信息
  console.log('\n📄 文件详情:')
  analysis.fileDetails.forEach(({ file, count, changes }) => {
    console.log(`   ${file}: ${count} 处驼峰命名`)
    if (changes.length <= 5) {
      changes.forEach(change => {
        console.log(`     - ${change.original} → ${change.converted} (${change.type})`)
      })
    } else {
      changes.slice(0, 3).forEach(change => {
        console.log(`     - ${change.original} → ${change.converted} (${change.type})`)
      })
      console.log(`     ... 还有 ${changes.length - 3} 处修改`)
    }
  })
  
  if (dryRun) {
    console.log('\n💡 这是预览模式，没有修改任何文件')
    console.log('   如需实际转换，请运行: node snake_case_converter.js convert')
    return
  }
  
  // 创建备份
  const backupPath = path.join(projectPath, 'backup_before_snake_conversion')
  if (!fs.existsSync(backupPath)) {
    console.log('\n📦 创建备份...')
    try {
      fs.mkdirSync(backupPath, { recursive: true })
      // 复制重要文件
      const importantDirs = ['src', 'backend/src']
      importantDirs.forEach(dir => {
        const srcPath = path.join(projectPath, dir)
        const destPath = path.join(backupPath, dir)
        if (fs.existsSync(srcPath)) {
          copyDirectory(srcPath, destPath)
        }
      })
      console.log('✅ 备份创建成功')
    } catch (error) {
      console.error('❌ 备份创建失败:', error.message)
      return
    }
  }
  
  // 执行转换
  console.log('\n🔄 开始转换...')
  let totalChanges = 0
  let processedFiles = 0
  
  analysis.fileDetails.forEach(({ file }) => {
    const filePath = path.join(projectPath, file)
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const { content: convertedContent, changeCount } = convertFileContent(content, filePath)
      
      if (changeCount > 0) {
        fs.writeFileSync(filePath, convertedContent, 'utf8')
        console.log(`✏️  ${file}: ${changeCount} 处修改`)
        totalChanges += changeCount
        processedFiles++
      }
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message)
    }
  })
  
  console.log('\n🎉 转换完成!')
  console.log(`📊 统计信息:`)
  console.log(`   - 处理文件数: ${processedFiles}`)
  console.log(`   - 总修改数: ${totalChanges}`)
  console.log(`   - 备份位置: ${backupPath}`)
  
  console.log('\n⚠️  重要提醒:')
  console.log('   1. 请检查转换结果是否正确')
  console.log('   2. 运行测试确保功能正常')
  console.log('   3. 如有问题可从备份恢复')
}

// 复制目录
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  
  const files = fs.readdirSync(src)
  files.forEach(file => {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    const stat = fs.statSync(srcPath)
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  })
}

// 命令行执行
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0] || 'analyze'
  const projectPath = args[1] || process.cwd()
  
  switch (command) {
    case 'analyze':
      const analysis = analyzeProject(projectPath)
      console.log('\n📊 分析完成!')
      break
    case 'preview':
      convertProject(projectPath, true)
      break
    case 'convert':
      convertProject(projectPath, false)
      break
    default:
      console.log('用法:')
      console.log('  node snake_case_converter.js analyze [项目路径]  - 分析驼峰命名')
      console.log('  node snake_case_converter.js preview [项目路径]  - 预览转换结果')
      console.log('  node snake_case_converter.js convert [项目路径]  - 执行转换')
  }
}

module.exports = {
  analyzeProject,
  convertProject,
  camelToSnake,
  convertFileContent
}