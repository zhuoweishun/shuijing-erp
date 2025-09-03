import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function analyzeCurrentProducts() {
  try {
    console.log('=== 分析当前成品表结构和业务逻辑 ===')
    
    // 1. 查看所有成品的基本信息
    const allProducts = await prisma.product.findMany({
      include: {
        materialUsages: {
          include: {
            purchase: {
              select: {
                id: true,
                productName: true,
                productType: true,
                quality: true,
                beadDiameter: true,
                specification: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📊 成品总数: ${allProducts.length}`)
    
    // 2. 分析成品的数量分布
    const quantityDistribution = {}
    allProducts.forEach(product => {
      const qty = product.quantity
      quantityDistribution[qty] = (quantityDistribution[qty] || 0) + 1
    })
    
    console.log('\n📈 数量分布:')
    Object.entries(quantityDistribution)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([qty, count]) => {
        console.log(`  数量 ${qty}: ${count} 个成品`)
      })
    
    // 3. 分析原材料使用情况
    console.log('\n🔍 原材料使用分析:')
    
    const materialUsageAnalysis = new Map()
    
    allProducts.forEach(product => {
      console.log(`\n📦 成品: ${product.name} (${product.productCode || '无编号'})`)
      console.log(`   数量: ${product.quantity}, 单价: ¥${product.unitPrice}, 总价值: ¥${product.totalValue}`)
      console.log(`   创建时间: ${product.createdAt.toLocaleString()}`)
      
      if (product.materialUsages.length > 0) {
        console.log(`   使用的原材料:`)
        
        // 生成原材料组合的唯一标识
        const materialSignature = product.materialUsages
          .map(usage => {
            const purchase = usage.purchase
            return {
              productName: purchase.productName,
              productType: purchase.productType,
              quality: purchase.quality,
              beadDiameter: purchase.beadDiameter,
              specification: purchase.specification,
              quantityUsedBeads: usage.quantityUsedBeads,
              quantityUsedPieces: usage.quantityUsedPieces
            }
          })
          .sort((a, b) => a.productName.localeCompare(b.productName))
        
        const signatureKey = JSON.stringify(materialSignature)
        
        if (!materialUsageAnalysis.has(signatureKey)) {
          materialUsageAnalysis.set(signatureKey, {
            signature: materialSignature,
            products: [],
            totalQuantity: 0
          })
        }
        
        const group = materialUsageAnalysis.get(signatureKey)
        group.products.push({
          id: product.id,
          name: product.name,
          productCode: product.productCode,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          createdAt: product.createdAt
        })
        group.totalQuantity += product.quantity
        
        product.materialUsages.forEach((usage, index) => {
          const purchase = usage.purchase
          console.log(`     ${index + 1}. ${purchase.productName} (${purchase.productType})`)
          console.log(`        品质: ${purchase.quality || '未设置'}`)
          if (purchase.beadDiameter) {
            console.log(`        珠径: ${purchase.beadDiameter}mm`)
          }
          if (purchase.specification) {
            console.log(`        规格: ${purchase.specification}mm`)
          }
          console.log(`        使用: ${usage.quantityUsedBeads}颗 + ${usage.quantityUsedPieces}件`)
        })
      } else {
        console.log(`   ❌ 无原材料使用记录`)
      }
    })
    
    // 4. 分析相同原材料组合的成品
    console.log('\n🎯 相同原材料组合分析（SKU候选）:')
    
    let skuCandidateCount = 0
    let totalProductsInGroups = 0
    
    materialUsageAnalysis.forEach((group, signature) => {
      if (group.products.length > 1 || group.totalQuantity > 1) {
        skuCandidateCount++
        totalProductsInGroups += group.products.length
        
        console.log(`\n🏷️ SKU候选组 ${skuCandidateCount}:`)
        console.log(`   原材料组合:`)
        group.signature.forEach((material, index) => {
          console.log(`     ${index + 1}. ${material.productName} (${material.productType})`)
          console.log(`        品质: ${material.quality || '未设置'}`)
          if (material.beadDiameter) {
            console.log(`        珠径: ${material.beadDiameter}mm`)
          }
          if (material.specification) {
            console.log(`        规格: ${material.specification}mm`)
          }
          console.log(`        用量: ${material.quantityUsedBeads}颗 + ${material.quantityUsedPieces}件`)
        })
        
        console.log(`   包含的成品 (共${group.products.length}个，总数量${group.totalQuantity}):`)
        group.products.forEach((product, index) => {
          console.log(`     ${index + 1}. ${product.name} (${product.productCode || '无编号'})`)
          console.log(`        数量: ${product.quantity}, 单价: ¥${product.unitPrice}`)
          console.log(`        创建时间: ${product.createdAt.toLocaleString()}`)
        })
        
        // 建议的SKU信息
        const avgPrice = group.products.reduce((sum, p) => sum + Number(p.unitPrice), 0) / group.products.length
        const suggestedName = group.products[0].name.replace(/ #\d+$/, '') // 移除编号后缀
        
        console.log(`   💡 建议SKU信息:`)
        console.log(`     SKU名称: ${suggestedName}`)
        console.log(`     总数量: ${group.totalQuantity}`)
        console.log(`     平均单价: ¥${avgPrice.toFixed(2)}`)
      }
    })
    
    // 5. 统计总结
    console.log('\n📋 分析总结:')
    console.log(`总成品数: ${allProducts.length}`)
    console.log(`SKU候选组数: ${skuCandidateCount}`)
    console.log(`可合并的成品数: ${totalProductsInGroups}`)
    console.log(`独立成品数: ${allProducts.length - totalProductsInGroups}`)
    
    const potentialSavings = allProducts.length - (skuCandidateCount + (allProducts.length - totalProductsInGroups))
    console.log(`\n💰 SKU化后的优化:`)
    console.log(`当前成品记录数: ${allProducts.length}`)
    console.log(`SKU化后记录数: ${skuCandidateCount + (allProducts.length - totalProductsInGroups)}`)
    console.log(`可减少记录数: ${potentialSavings}`)
    
    // 6. 检查数量为1的成品（当前逻辑下的标准情况）
    const singleQuantityProducts = allProducts.filter(p => p.quantity === 1)
    console.log(`\n🔢 数量为1的成品: ${singleQuantityProducts.length}个 (${(singleQuantityProducts.length/allProducts.length*100).toFixed(1)}%)`)
    
    if (singleQuantityProducts.length === allProducts.length) {
      console.log('✅ 所有成品数量都为1，符合当前的"一个成品记录对应一个实物"逻辑')
    } else {
      console.log('⚠️ 存在数量大于1的成品，需要特别处理')
    }
    
  } catch (error) {
    console.error('❌ 分析失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeCurrentProducts()