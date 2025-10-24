import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 生成供应商编号函数（与routes/suppliers.ts中的函数相同）
async function generateSupplierCode(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `GYS${currentYear}`
  
  // 查找当前年份最大的序号
  const lastSupplier = await prisma.supplier.findFirst({
    where: {
      supplier_code: {
        startsWith: prefix
      }
    },
    orderBy: {
      supplier_code: 'desc'
    }
  })
  
  let nextSequence = 1
  if (lastSupplier && lastSupplier.supplier_code) {
    // 提取序号部分（最后4位）
    const sequencePart = lastSupplier.supplier_code.slice(-4)
    const lastSequence = parseInt(sequencePart, 10)
    nextSequence = lastSequence + 1
  }
  
  // 格式化为4位数字
  const sequenceStr = nextSequence.toString().padStart(4, '0')
  return `${prefix}${sequenceStr}`
}

async function backfillSupplierCodes() {
  try {
    console.log('🔄 开始为现有供应商补充编号...')
    
    // 查找所有没有编号的供应商
    const suppliersWithoutCode = await prisma.supplier.findMany({
      where: {
        supplier_code: null
      },
      orderBy: {
        created_at: 'asc' // 按创建时间排序，确保编号顺序
      }
    })
    
    console.log(`📊 找到 ${suppliersWithoutCode.length} 个需要补充编号的供应商`)
    
    if (suppliersWithoutCode.length === 0) {
      console.log('✅ 所有供应商都已有编号，无需处理')
      return
    }
    
    let successCount = 0
    let errorCount = 0
    
    for (const supplier of suppliersWithoutCode) {
      try {
        const supplier_code = await generateSupplierCode()
        
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: { supplier_code }
        })
        
        console.log(`✅ 供应商 "${supplier.name}" (ID: ${supplier.id}) 已分配编号: ${supplier_code}`)
        successCount++
      } catch (error) {
        console.error(`❌ 为供应商 "${supplier.name}" (ID: ${supplier.id}) 分配编号失败:`, error)
        errorCount++
      }
    }
    
    console.log(`\n📊 补充编号完成:`)
    console.log(`   ✅ 成功: ${successCount} 个`)
    console.log(`   ❌ 失败: ${errorCount} 个`)
    
  } catch (error) {
    console.error('❌ 补充供应商编号过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行脚本
backfillSupplierCodes()