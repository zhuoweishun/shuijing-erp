const fs = require('fs')
const path = require('path')

// 修复后端API中的product_type相关错误（使用驼峰命名）
const fixBackendProductType = () => {
  console.log('🔧 开始修复后端product_type相关错误（驼峰命名）...')
  
  const backendDir = path.join(__dirname, 'backend', 'src')
  const fixes = []
  
  // 需要替换的模式
  const replacements = [
    {
      pattern: /material_type = 'LOOSE_BEADS'/g,
      replacement: "materialType = 'LOOSE_BEADS'",
      description: '参数解构修复（改回驼峰）'
    },
    {
      pattern: /material_type,/g,
      replacement: 'materialType,',
      description: '变量引用修复（改回驼峰）'
    },
    {
      pattern: /material_type:/g,
      replacement: 'materialType:',
      description: '对象属性修复（改回驼峰）'
    },
    {
      pattern: /\bmaterial_type\b(?!:)/g,
      replacement: 'materialType',
      description: '变量名修复（改回驼峰）'
    },
    {
      pattern: /productType/g,
      replacement: 'materialType',
      description: 'productType改为materialType'
    },
    {
      pattern: /product_type/g,
      replacement: 'materialType',
      description: 'product_type改为materialType'
    }
  ]
  
  // 递归处理文件
  const processDirectory = (dir) => {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  目录不存在: ${dir}`)
      return
    }
    
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        processDirectory(filePath)
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
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
  processDirectory(backendDir)
  
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
    path.join(__dirname, 'backend-product-type-fix-report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  )
  
  console.log('\n📊 后端修复完成统计:')
  console.log(`   - 修复文件数: ${report.total_files}`)
  console.log(`   - 总替换次数: ${report.total_changes}`)
  console.log('   - 报告文件: backend-product-type-fix-report.json')
  
  return report
}

// 执行修复
if (require.main === module) {
  fixBackendProductType()
}

module.exports = { fixBackendProductType }