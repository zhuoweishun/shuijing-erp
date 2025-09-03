import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMaterialUsage() {
  try {
    console.log('=== 检查 material_usage 表数据 ===')
    
    // 查询所有material_usage记录
    const allUsages = await prisma.materialUsage.findMany({
      include: {
        purchase: {
          select: {
            productName: true,
            productType: true
          }
        },
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n总共找到 ${allUsages.length} 条material_usage记录`)
    
    // 统计不同类型的消耗
    let totalBeadsUsed = 0
    let totalPiecesUsed = 0
    let finishedProductUsages = []
    
    allUsages.forEach((usage, index) => {
      console.log(`\n记录 ${index + 1}:`)
      console.log(`  产品名称: ${usage.purchase.productName}`)
      console.log(`  产品类型: ${usage.purchase.productType}`)
      console.log(`  成品名称: ${usage.product.name}`)
      console.log(`  使用颗数: ${usage.quantityUsedBeads}`)
      console.log(`  使用件数: ${usage.quantityUsedPieces}`)
      console.log(`  创建时间: ${usage.createdAt}`)
      
      totalBeadsUsed += usage.quantityUsedBeads
      totalPiecesUsed += usage.quantityUsedPieces
      
      // 收集成品类型的使用记录
      if (usage.purchase.productType === 'FINISHED') {
        finishedProductUsages.push({
          productName: usage.purchase.productName,
          productName_finished: usage.product.name,
          quantityUsedPieces: usage.quantityUsedPieces,
          createdAt: usage.createdAt
        })
      }
    })
    
    console.log(`\n=== 统计汇总 ===`)
    console.log(`总使用颗数: ${totalBeadsUsed}`)
    console.log(`总使用件数: ${totalPiecesUsed}`)
    console.log(`成品类型使用记录数: ${finishedProductUsages.length}`)
    
    console.log(`\n=== 成品类型详细统计 ===`)
    finishedProductUsages.forEach((usage, index) => {
      console.log(`${index + 1}. ${usage.productName} -> ${usage.productName_finished}: ${usage.quantityUsedPieces} 件`)
    })
    
    // 按原材料分组统计
    const groupedByMaterial = {}
    allUsages.forEach(usage => {
      const key = usage.purchase.productName
      if (!groupedByMaterial[key]) {
        groupedByMaterial[key] = {
          productType: usage.purchase.productType,
          totalBeads: 0,
          totalPieces: 0,
          count: 0
        }
      }
      groupedByMaterial[key].totalBeads += usage.quantityUsedBeads
      groupedByMaterial[key].totalPieces += usage.quantityUsedPieces
      groupedByMaterial[key].count += 1
    })
    
    console.log(`\n=== 按原材料分组统计 ===`)
    Object.entries(groupedByMaterial).forEach(([materialName, stats]) => {
      console.log(`${materialName} (${stats.productType}):`)
      console.log(`  使用次数: ${stats.count}`)
      console.log(`  总颗数: ${stats.totalBeads}`)
      console.log(`  总件数: ${stats.totalPieces}`)
      
      // 根据产品类型计算应该显示的消耗量
      let displayConsumption = 0
      if (stats.productType === 'LOOSE_BEADS' || stats.productType === 'BRACELET') {
        displayConsumption = stats.totalBeads
      } else if (stats.productType === 'ACCESSORIES' || stats.productType === 'FINISHED') {
        displayConsumption = stats.totalPieces
      }
      console.log(`  显示消耗量: ${displayConsumption}`)
    })
    
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMaterialUsage()