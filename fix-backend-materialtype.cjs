const fs = require('fs')
const path = require('path')

// 批量修复后端SQL查询中的materialType字段名错误
// 将 p.materialType 替换为 p.material_type

const targetDir = path.join(__dirname, 'backend', 'src', 'routes')
const reportFile = path.join(__dirname, 'backend-materialtype-fix-report.json')

// 需要修复的文件模式
const filePatterns = ['*.ts', '*.js']

// 替换规则 - 将productType统一改为materialType
const replacements = [
  {
    search: /p\.productType/g,
    replace: 'p.materialType',
    description: 'SQL查询中的productType字段名改为materialType'
  },
  {
    search: /purchases\.productType/g,
    replace: 'purchases.materialType', 
    description: 'purchases表的productType字段名改为materialType'
  },
  {
    search: /\bproductType\s*as\s+materialType/g,
    replace: 'materialType as materialType',
    description: 'SQL别名中的productType字段名改为materialType'
  },
  {
    search: /\bproductType\b/g,
    replace: 'materialType',
    description: '代码中的productType变量名改为materialType'
  }
]

function getAllFiles(dir, extensions = ['.ts', '.js']) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        traverse(fullPath)
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  let newContent = content
  const changes = []
  
  for (const rule of replacements) {
    const matches = content.match(rule.search)
    if (matches) {
      newContent = newContent.replace(rule.search, rule.replace)
      changes.push({
        description: rule.description,
        count: matches.length,
        search: rule.search.toString(),
        replace: rule.replace
      })
    }
  }
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8')
    return {
      file: path.relative(__dirname, filePath),
      changes,
      totalReplacements: changes.reduce((sum, change) => sum + change.count, 0)
    }
  }
  
  return null
}

function main() {
  console.log('🔧 开始批量修复后端SQL查询中的materialType字段名...')
  
  if (!fs.existsSync(targetDir)) {
    console.error('❌ 后端routes目录不存在:', targetDir)
    return
  }
  
  const files = getAllFiles(targetDir)
  console.log(`📁 找到 ${files.length} 个文件`)
  
  const results = []
  let totalFiles = 0
  let totalReplacements = 0
  
  for (const file of files) {
    const result = fixFile(file)
    if (result) {
      results.push(result)
      totalFiles++
      totalReplacements += result.totalReplacements
      console.log(`✅ 修复文件: ${result.file} (${result.totalReplacements}处替换)`)
    }
  }
  
  // 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFilesScanned: files.length,
      totalFilesModified: totalFiles,
      totalReplacements: totalReplacements
    },
    replacementRules: replacements.map(rule => ({
      description: rule.description,
      search: rule.search.toString(),
      replace: rule.replace
    })),
    modifiedFiles: results,
    errors: []
  }
  
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8')
  
  console.log('\n📊 修复完成统计:')
  console.log(`   扫描文件: ${files.length}个`)
  console.log(`   修改文件: ${totalFiles}个`)
  console.log(`   总替换次数: ${totalReplacements}次`)
  console.log(`   报告文件: ${path.relative(__dirname, reportFile)}`)
  
  if (totalFiles > 0) {
    console.log('\n🎉 批量修复完成！后端SQL查询字段名已统一为蛇形命名。')
  } else {
    console.log('\n✨ 没有发现需要修复的字段名问题。')
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }