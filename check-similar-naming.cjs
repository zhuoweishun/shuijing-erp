/**
 * 检查项目中容易混淆的相似命名
 * 生成相似命名检查报告
 */

const fs = require('fs')
const path = require('path')

// 容易混淆的命名模式
const SIMILAR_PATTERNS = [
  // 产品相关
  { group: 'Product vs Purchase', patterns: ['product', 'purchase'] },
  { group: 'Customer vs Client', patterns: ['customer', 'client'] },
  { group: 'Supplier vs Provider', patterns: ['supplier', 'provider'] },
  { group: 'SKU vs Product', patterns: ['sku', 'product'] },
  { group: 'Inventory vs Stock', patterns: ['inventory', 'stock'] },
  { group: 'Order vs Purchase', patterns: ['order', 'purchase'] },
  { group: 'Sale vs Sell', patterns: ['sale', 'sell'] },
  { group: 'Price vs Cost', patterns: ['price', 'cost'] },
  { group: 'Quantity vs Amount', patterns: ['quantity', 'amount'] },
  { group: 'Total vs Sum', patterns: ['total', 'sum'] },
  { group: 'Create vs Add', patterns: ['create', 'add'] },
  { group: 'Update vs Edit', patterns: ['update', 'edit'] },
  { group: 'Delete vs Remove', patterns: ['delete', 'remove'] },
  { group: 'Get vs Fetch', patterns: ['get', 'fetch'] },
  { group: 'List vs Array', patterns: ['list', 'array'] },
  { group: 'Data vs Info', patterns: ['data', 'info'] },
  { group: 'Type vs Kind', patterns: ['type', 'kind'] },
  { group: 'Name vs Title', patterns: ['name', 'title'] },
  { group: 'Code vs Number', patterns: ['code', 'number'] },
  { group: 'Date vs Time', patterns: ['date', 'time'] },
  { group: 'User vs Person', patterns: ['user', 'person'] },
  { group: 'Material vs Item', patterns: ['material', 'item'] },
  { group: 'Specification vs Spec', patterns: ['specification', 'spec'] },
  { group: 'Available vs Remaining', patterns: ['available', 'remaining'] },
  { group: 'Used vs Consumed', patterns: ['used', 'consumed'] },
  { group: 'Batch vs Group', patterns: ['batch', 'group'] },
  { group: 'Quality vs Grade', patterns: ['quality', 'grade'] },
  { group: 'Diameter vs Size', patterns: ['diameter', 'size'] },
  { group: 'Weight vs Mass', patterns: ['weight', 'mass'] },
  { group: 'Count vs Number', patterns: ['count', 'number'] },
  { group: 'Min vs Minimum', patterns: ['min', 'minimum'] },
  { group: 'Max vs Maximum', patterns: ['max', 'maximum'] }
]

// 扫描文件的函数
function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const results = []
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(process.cwd(), filePath)
      
      // 提取所有标识符（变量名、函数名、属性名等）
      const identifiers = new Set()
      
      // 匹配各种标识符模式
      const patterns = [
        /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, // 对象属性
        /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, // 函数调用
        /\bconst\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // const声明
        /\blet\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // let声明
        /\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // var声明
        /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // 函数声明
        /\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // 类声明
        /\binterface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // 接口声明
        /\btype\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // 类型声明
        /\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, // 属性访问
        /\[(['"`])([a-zA-Z_$][a-zA-Z0-9_$]*)\1\]/g // 字符串属性访问
      ]
      
      patterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(content)) !== null) {
          const identifier = match[1] || match[2]
          if (identifier && identifier.length > 2) {
            identifiers.add(identifier.toLowerCase())
          }
        }
      })
      
      return {
        file: relativePath,
        identifiers: Array.from(identifiers)
      }
    } catch (error) {
      console.warn(`警告: 无法读取文件 ${filePath}: ${error.message}`)
      return null
    }
  }
  
  function walkDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir)
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          // 跳过node_modules、.git等目录
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(item)) {
            walkDirectory(fullPath)
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath)
          if (extensions.includes(ext)) {
            const result = scanFile(fullPath)
            if (result) {
              results.push(result)
            }
          }
        }
      }
    } catch (error) {
      console.warn(`警告: 无法扫描目录 ${currentDir}: ${error.message}`)
    }
  }
  
  walkDirectory(dir)
  return results
}

// 检查相似命名的函数
function checkSimilarNaming(scanResults) {
  const similarNamingIssues = []
  
  SIMILAR_PATTERNS.forEach(pattern => {
    const { group, patterns } = pattern
    const foundFiles = new Map()
    
    // 为每个模式收集使用该模式的文件
    patterns.forEach(p => {
      foundFiles.set(p, [])
    })
    
    scanResults.forEach(result => {
      const { file, identifiers } = result
      
      patterns.forEach(p => {
        const matchingIdentifiers = identifiers.filter(id => 
          id.includes(p) || 
          // 检查驼峰命名和蛇形命名
          id.replace(/_/g, '').includes(p) ||
          id.replace(/([A-Z])/g, '_$1').toLowerCase().includes(p)
        )
        
        if (matchingIdentifiers.length > 0) {
          foundFiles.get(p).push({
            file,
            identifiers: matchingIdentifiers
          })
        }
      })
    })
    
    // 检查是否有多个模式在同一项目中使用
    const usedPatterns = patterns.filter(p => foundFiles.get(p).length > 0)
    
    if (usedPatterns.length > 1) {
      similarNamingIssues.push({
        group,
        patterns: usedPatterns,
        files: Object.fromEntries(
          usedPatterns.map(p => [p, foundFiles.get(p)])
        )
      })
    }
  })
  
  return similarNamingIssues
}

// 生成报告的函数
function generateReport(similarNamingIssues) {
  const timestamp = new Date().toISOString().split('T')[0]
  
  let report = `# 相似命名检查报告\n\n`
  report += `**生成时间**: ${timestamp}\n`
  report += `**检查范围**: 前端和后端代码\n`
  report += `**发现问题**: ${similarNamingIssues.length}个相似命名组\n\n`
  
  if (similarNamingIssues.length === 0) {
    report += `## ✅ 检查结果\n\n`
    report += `恭喜！未发现明显的相似命名冲突问题。\n\n`
    report += `所有检查的命名模式都保持了一致性，没有在同一项目中混用容易混淆的相似命名。\n\n`
  } else {
    report += `## ⚠️ 发现的相似命名问题\n\n`
    
    similarNamingIssues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.group}\n\n`
      report += `**冲突模式**: ${issue.patterns.join(' vs ')}\n\n`
      
      issue.patterns.forEach(pattern => {
        const files = issue.files[pattern]
        if (files && files.length > 0) {
          report += `**使用 "${pattern}" 的文件**:\n`
          files.forEach(fileInfo => {
            report += `- \`${fileInfo.file}\`: ${fileInfo.identifiers.join(', ')}\n`
          })
          report += `\n`
        }
      })
      
      report += `**建议**: 统一使用其中一种命名模式，避免在同一项目中混用。\n\n`
      report += `---\n\n`
    })
  }
  
  report += `## 📋 检查的命名模式\n\n`
  report += `本次检查涵盖了以下容易混淆的命名模式：\n\n`
  
  SIMILAR_PATTERNS.forEach(pattern => {
    report += `- **${pattern.group}**: ${pattern.patterns.join(' vs ')}\n`
  })
  
  report += `\n## 🔧 修复建议\n\n`
  report += `1. **统一命名规范**: 在项目中选择一种命名模式并坚持使用\n`
  report += `2. **代码审查**: 在代码审查中重点检查命名一致性\n`
  report += `3. **文档规范**: 在开发文档中明确规定命名规范\n`
  report += `4. **工具辅助**: 使用ESLint等工具强制执行命名规范\n\n`
  
  return report
}

// 主函数
function main() {
  console.log('🔍 开始扫描项目文件...')
  
  // 扫描前端和后端代码
  const frontendResults = scanDirectory('./src')
  const backendResults = scanDirectory('./backend/src')
  const allResults = [...frontendResults, ...backendResults]
  
  console.log(`📊 扫描完成，共扫描 ${allResults.length} 个文件`)
  
  console.log('🔍 检查相似命名问题...')
  const similarNamingIssues = checkSimilarNaming(allResults)
  
  console.log('📝 生成报告...')
  const report = generateReport(similarNamingIssues)
  
  // 保存报告
  const reportPath = './相似命名检查报告.md'
  fs.writeFileSync(reportPath, report, 'utf8')
  
  console.log(`✅ 报告已生成: ${reportPath}`)
  console.log(`📊 发现 ${similarNamingIssues.length} 个相似命名问题`)
  
  if (similarNamingIssues.length > 0) {
    console.log('\n⚠️ 发现的问题:')
    similarNamingIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.group}: ${issue.patterns.join(' vs ')}`)
    })
  } else {
    console.log('\n✅ 未发现相似命名冲突问题')
  }
}

// 运行检查
if (require.main === module) {
  main()
}

module.exports = {
  scanDirectory,
  checkSimilarNaming,
  generateReport,
  SIMILAR_PATTERNS
}