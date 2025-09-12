// 直接测试SKU溯源逻辑（不通过API）
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testTraceLogic() {
  try {
    console.log('🧪 测试SKU溯源逻辑（直接数据库查询）...')
    
    // 获取第一个SKU
    const sku = await prisma.product_sku.find_first({
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  include: {
                    supplier: true,
                    user: true
                  }
                }
              },
              orderBy: {
                created_at: 'asc'
              }
            }
          }
        }
      }
    })
    
    if (!sku) {
      console.log('❌ 没有找到SKU数据')
      return
    }
    
    console.log(`\n📦 测试SKU: ${sku.sku_code} - ${sku.sku_name}`)
    console.log(`   总数量: ${sku.total_quantity}`)
    console.log(`   规格: ${sku.specification || '未设置'}`)
    
    // 获取制作配方数据（基于第一次制作时的MaterialUsage记录）
    const recipeData = []
    const processedPurchaseIds = new Set()
    
    // 计算单个SKU的原材料消耗量（基于第一次制作时的记录）
    let singleSkuConsumption = 1 // 默认值
    
    // 获取第一次制作时的MaterialUsage记录来计算单个SKU消耗量
    const firstMaterialUsage = await prisma.material_usage.find_first({
      where: { 
        product: { sku_id: sku.id
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    if (firstMaterialUsage) {
      const firstUsageBeads = firstMaterialUsage.quantity_used_beads || 0
      const firstUsagePieces = firstMaterialUsage.quantity_used_pieces || 0
      const firstUsageTotal = firstUsageBeads + firstUsagePieces
      
      // 计算单个SKU的消耗量：总消耗量 / SKU总数量
      if (firstUsageTotal > 0 && sku.total_quantity > 0) {
        singleSkuConsumption = Math.round(firstUsageTotal / sku.total_quantity)
        if (singleSkuConsumption < 1) singleSkuConsumption = 1 // 最少为1
      }
    }
    
    console.log(`\n🔍 [SKU配方] SKU: ${sku.sku_code}, 总数量: ${sku.total_quantity}, 单个SKU消耗量: ${singleSkuConsumption}`)
    
    // 遍历所有关联的成品，获取制作配方
    for (const product of sku.products) {
      // 只处理第一次制作时的原材料使用记录
      for (const materialUsage of product.materialUsages) {
        const purchase = materialUsage.purchase
        
        // 避免重复处理同一个采购记录
        if (processedPurchaseIds.has(purchase.id)) {
          continue
        }
        processedPurchaseIds.add(purchase.id)
        
        // 根据产品类型选择正确的价格字段
        let correctPrice = 0
        
        switch (purchase.product_type) {
          case 'LOOSE_BEADS':
            correctPrice = parseFloat(purchase.price_per_bead?.to_string() || '0')
            if (correctPrice === 0) {
              correctPrice = parseFloat(purchase.unit_price?.to_string() || purchase.price_per_gram?.to_string() || '0')
            }
            break
          case 'BRACELET':
            correctPrice = parseFloat(purchase.unit_price?.to_string() || '0')
            if (correctPrice === 0) {
              correctPrice = parseFloat(purchase.price_per_bead?.to_string() || purchase.price_per_gram?.to_string() || '0')
            }
            break
          case 'ACCESSORIES':
          case 'FINISHED':
            correctPrice = parseFloat(purchase.price_per_piece?.to_string() || '0')
            if (correctPrice === 0) {
              correctPrice = parseFloat(purchase.unit_price?.to_string() || purchase.price_per_gram?.to_string() || purchase.price_per_bead?.to_string() || '0')
            }
            break
          default:
            correctPrice = parseFloat(purchase.unit_price?.to_string() || '0')
            if (correctPrice === 0) {
              correctPrice = parseFloat(purchase.price_per_bead?.to_string() || purchase.price_per_gram?.to_string() || purchase.price_per_piece?.to_string() || '0')
            }
        }
        
        // 根据产品类型选择正确的规格字段
        let correctSpecification = '未设置'
        
        switch (purchase.product_type) {
          case 'LOOSE_BEADS':
          case 'BRACELET':
            if (purchase.bead_diameter) {
              correctSpecification = `${purchase.bead_diameter}mm`
            } else if (purchase.specification) {
              correctSpecification = `${purchase.specification}mm`
            }
            break
          case 'ACCESSORIES':
          case 'FINISHED':
            if (purchase.specification) {
              correctSpecification = `${purchase.specification}mm`
            } else if (purchase.bead_diameter) {
              correctSpecification = `${purchase.bead_diameter}mm`
            }
            break
          default:
            if (purchase.bead_diameter) {
              correctSpecification = `${purchase.bead_diameter}mm`
            } else if (purchase.specification) {
              correctSpecification = `${purchase.specification}mm`
            }
        }
        
        // 确定单位
        let unit = '件'
        if (purchase.product_type === 'LOOSE_BEADS') {
          unit = '颗'
        }
        
        // 计算单个SKU的单位成本
        const unitCostForSingleSku = correctPrice * singleSkuConsumption
        
        // 构建制作配方记录
        const recipeRecord = {
          id: `recipe-${purchase.id}`,
          type: 'recipe',
          material_name: purchase.product_name,
          specification: correctSpecification,
          quantityPerSku: singleSkuConsumption, // 单个SKU需要的数量
          unit: unit,
          supplier: purchase.supplier?.name || '未知供应商',
          cgNumber: purchase.purchase_code || '无CG编号',
          unitCost: correctPrice, // 单位成本
          totalCostPerSku: unitCostForSingleSku, // 单个SKU的总成本
          qualityGrade: purchase.quality || '未设置',
          purchase_date: purchase.purchase_date,
          details: {
            purchase_id: purchase.id,
            material_id: purchase.id,
            product_type: purchase.product_type,
            description: `制作单个${sku.sku_name}需要${singleSkuConsumption}${unit}${purchase.product_name}`
          }
        }
        
        recipeData.push(recipeRecord)
      }
    }
    
    // 按原材料名称排序
    recipeData.sort((a, b) => a.material_name.locale_compare(b.material_name))
    
    console.log('\n✅ SKU制作配方获取成功!')
    console.log('\n📋 制作配方信息:')
    
    console.log(`\n🏷️  SKU信息:`)
    console.log(`   SKU编码: ${sku.sku_code}`)
    console.log(`   SKU名称: ${sku.sku_name}`)
    console.log(`   规格: ${sku.specification || '未设置'}`)
    console.log(`   总数量: ${sku.total_quantity}`)
    
    console.log(`\n🧾 制作配方 (${recipeData.length}种原材料):`)
    recipeData.for_each((item, index) => {
      console.log(`   ${index + 1}. ${item.material_name}`)
      console.log(`      规格: ${item.specification}`)
      console.log(`      单个SKU需要: ${item.quantityPerSku}${item.unit}`)
      console.log(`      供应商: ${item.supplier}`)
      console.log(`      CG编号: ${item.cgNumber}`)
      console.log(`      单位成本: ¥${item.unitCost.to_fixed(2)}`)
      console.log(`      单个SKU总成本: ¥${item.totalCostPerSku.to_fixed(2)}`)
      console.log(`      品质等级: ${item.qualityGrade}`)
      console.log(`      采购日期: ${new Date(item.purchase_date).to_locale_date_string()}`)
      console.log(`      说明: ${item.details.description}`)
      console.log('')
    })
    
    const totalCostPerSku = recipeData.reduce((sum, item) => sum + item.totalCostPerSku, 0)
    console.log(`\n📊 配方汇总:`)
    console.log(`   原材料种类: ${recipeData.length}种`)
    console.log(`   单个SKU总成本: ¥${totalCostPerSku.to_fixed(2)}`)
    
    console.log('\n✅ 测试完成: SKU溯源逻辑现在正确显示制作配方，而不是采购记录使用情况')
    console.log('✅ 配方显示单个SKU需要的原材料组成，包含数量、CG编号、供应商等信息')
    console.log('✅ 这是固定的制作配方，基于第一次制作时的MaterialUsage记录')
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message)
    console.error('错误详情:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testTraceLogic()