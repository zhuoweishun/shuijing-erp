const fs = require('fs')
const path = require('path')

// 批量修复product_type相关错误的脚本
const fixProductTypeErrors = () => {
  console.log('🔧 开始批量修复product_type相关错误...')
  
  const srcDir = path.join(__dirname, 'src')
  const fixes = []
  
  // 需要替换的模式
  const replacements = [
    {
      pattern: /getProductDistribution/g,
      replacement: 'getMaterialDistribution',
      description: 'API方法名修复'
    },
    {
      pattern: /product_type:/g,
      replacement: 'material_type:',
      description: '对象属性名修复'
    },
    {
      pattern: /product_type\s*\?/g,
      replacement: 'material_type?',
      description: '可选属性名修复'
    },
    {
      pattern: /product_type\s*=/g,
      replacement: 'material_type =',
      description: '变量赋值修复'
    },
    {
      pattern: /\.product_type/g,
      replacement: '.material_type',
      description: '属性访问修复'
    },
    {
      pattern: /\bproduct_type\b(?!:)/g,
      replacement: 'material_type',
      description: '变量名修复'
    }
  ]
  
  // 需要跳过的文件（这些文件中的product_type是正确的）
  const skipFiles = [
    'SemiFinishedMatrixView.tsx', // 这个文件中的product_type是API返回的字段
    'PurchaseDetailModal.tsx', // 这个文件中的product_type是从API获取的
    'validation.ts' // 验证文件中的product_type可能是正确的
  ]
  
  // 递归处理文件
  const processDirectory = (dir) => {
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        processDirectory(filePath)
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        // 检查是否需要跳过
        if (skipFiles.some(skipFile => file.includes(skipFile))) {
          console.log(`⏭️  跳过文件: ${file}`)
          return
        }
        
        processFile(filePath)
      }
    })
  }
  
  // 处理单个文件
  const processFile = (filePath) => {
    try {
      let content = fs.readFileSync(filePath, 'utf8')
      let modified = false
      let fileChanges = []
      
      replacements.forEach(({ pattern, replacement, description }) => {
        const matches = content.match(pattern)
        if (matches) {
          content = content.replace(pattern, replacement)
          modified = true
          fileChanges.push({
            description,
            count: matches.length
          })
        }
      })
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8')
        const relativePath = path.relative(__dirname, filePath)
        fixes.push({
          file: relativePath,
          changes: fileChanges
        })
        console.log(`✅ 修复文件: ${relativePath}`)
        fileChanges.forEach(change => {
          console.log(`   - ${change.description}: ${change.count}处`)
        })
      }
    } catch (error) {
      console.error(`❌ 处理文件失败: ${filePath}`, error.message)
    }
  }
  
  // 开始处理
  processDirectory(srcDir)
  
  // 生成修复报告
  const report = {
    timestamp: new Date().toISOString(),
    total_files: fixes.length,
    total_changes: fixes.reduce((sum, fix) => 
      sum + fix.changes.reduce((changeSum, change) => changeSum + change.count, 0), 0
    ),
    fixes
  }
  
  // 保存报告
  fs.writeFileSync(
    path.join(__dirname, 'product-type-fix-report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  )
  
  console.log('\n📊 修复完成统计:')
  console.log(`   - 修复文件数: ${report.total_files}`)
  console.log(`   - 总替换次数: ${report.total_changes}`)
  console.log('   - 报告文件: product-type-fix-report.json')
  
  return report
}

// 执行修复
if (require.main === module) {
  fixProductTypeErrors()
}

module.exports = { fixProductTypeErrors }