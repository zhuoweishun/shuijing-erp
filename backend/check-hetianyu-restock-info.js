const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkHetianYuRestockInfo() {
  try {
    console.log('=== 检查和田玉挂件SKU补货信息 ===')
    
    // 查找和田玉挂件SKU
    const sku = await prisma.product_sku.find_first({
      where: {
        sku_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: {
                  include: {
                    supplier: true
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
      console.log('❌ 未找到和田玉挂件SKU')
      return
    }
    
    console.log(`✅ 找到SKU: ${sku.sku_name} (${sku.sku_code})`)
    console.log(`📦 SKU总数量: ${sku.total_quantity}`)
    console.log(`📦 可用数量: ${sku.available_quantity}`)
    
    // 模拟补货信息API的逻辑
    const required_materials = []
    const processedPurchaseIds = new Set()
    
    // 获取第一条MaterialUsage记录
    const firstMaterialUsage = await prisma.material_usage.find_first({
      where: { 
        product: { sku_id: sku.id
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    let singleSkuConsumption = 1 // 默认值
    if (firstMaterialUsage) {
      const firstUsageBeads = firstMaterialUsage.quantity_used_beads || 0
      const firstUsagePieces = firstMaterialUsage.quantity_used_pieces || 0
      const firstUsageTotal = firstUsageBeads + firstUsagePieces
      
      console.log(`\n=== 第一条MaterialUsage记录分析 ===`)
      console.log(`🔍 第一条记录ID: ${firstMaterialUsage.id}`)
      console.log(`📊 使用颗数: ${firstUsageBeads}`)
      console.log(`📊 使用片数: ${firstUsagePieces}`)
      console.log(`📊 总使用量: ${firstUsageTotal}`)
      
      // 修复后的计算逻辑：直接使用第一次制作时的消耗量
      singleSkuConsumption = firstUsageTotal > 0 ? firstUsageTotal : 1
      
      console.log(`\n=== 修复后的计算逻辑 ===`)
      console.log(`💡 单个SKU消耗量 = 第一次制作时的消耗量 = ${singleSkuConsumption}件`)
    }
    
    // 收集所需原材料信息
    for (const product of sku.products) {
      for (const materialUsage of product.materialUsages) {
        const purchase = materialUsage.purchase
        
        if (!processedPurchaseIds.has(purchase.id)) {
          processedPurchaseIds.add(purchase.id)
          
          // 计算剩余库存
          const allUsages = await prisma.material_usage.find_many({
            where: { purchase_id: purchase.id }
          })
          
          const totalUsedBeads = allUsages.reduce((sum, usage) => sum + (usage.quantity_used_beads || 0), 0)
          const totalUsedPieces = allUsages.reduce((sum, usage) => sum + (usage.quantity_used_pieces || 0), 0)
          const totalUsed = totalUsedBeads + totalUsedPieces
          const remaining_quantity = purchase.quantity - totalUsed
          
          // 使用修复后的计算逻辑
          const quantityNeeded = singleSkuConsumption
          
          requiredMaterials.push({purchase_id: purchase.id,
            product_name: purchase.product_name,
            supplier_name: purchase.supplier?.name || '未知供应商',
            quantityNeeded: quantityNeeded,
            currentRemaining: remaining_quantity,
            unitCost: parseFloat(purchase.unit_price?.to_string() || '0')
          })
        }
      }
    }
    
    console.log(`\n=== 补货信息结果 ===`)
    if (required_materials.length > 0) {
      requiredMaterials.for_each((material, index) => {
        console.log(`\n📦 原材料 ${index + 1}:`)
        console.log(`   名称: ${material.product_name}`)
        console.log(`   供应商: ${material.supplier_name}`)
        console.log(`   🎯 需要数量: ${material.quantityNeeded}件 (修复后)`)
        console.log(`   📊 当前库存: ${material.currentRemaining}件`)
        console.log(`   💰 单价: ¥${material.unitCost}`)
        
        if (material.quantityNeeded === 1) {
          console.log(`   ✅ 显示正确！需要数量为1件`)
        } else {
          console.log(`   ❌ 显示错误！需要数量应为1件，实际显示${material.quantityNeeded}件`)
        }
      })
    } else {
      console.log('❌ 未找到所需原材料信息')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkHetianYuRestockInfo()