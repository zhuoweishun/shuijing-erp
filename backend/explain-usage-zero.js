// 解释"使用0"的含义和前端显示逻辑
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function explainUsageZero() {
  try {
    console.log('🔍 分析"使用0"的含义...')
    
    // 查找所有和田玉挂件采购记录
    const purchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
        supplier: true,
        materialUsages: {
          include: {
            product: {
              include: {
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    console.log(`\n📋 分析 ${purchases.length} 个和田玉挂件采购记录的使用情况:`)
    
    purchases.for_each((purchase, index) => {
      console.log(`\n${index + 1}. 采购记录: ${purchase.purchase_code}`)
      console.log(`   供应商: ${purchase.supplier?.name}`)
      console.log(`   规格: ${purchase.specification}mm`)
      console.log(`   品质: ${purchase.quality}`)
      console.log(`   价格: ¥${purchase.total_price}`)
      
      // 分析使用情况
      if (purchase.materialUsages.length === 0) {
        console.log(`   ❌ 前端显示: "使用0"`)
        console.log(`   📝 含义: 这个采购记录还没有被用于制作任何SKU产品`)
        console.log(`   🔍 原因: 没有MaterialUsage记录，表示原材料还在库存中，未被消耗`)
        console.log(`   💡 状态: 可用于未来的SKU制作`)
      } else {
        // 计算实际使用量
        let totalUsedPieces = 0
        let totalUsedBeads = 0
        
        purchase.materialUsages.for_each(usage => {
          totalUsedPieces += usage.quantity_used_pieces || 0
          totalUsedBeads += usage.quantity_used_beads || 0
        })
        
        console.log(`   ✅ 前端显示: "使用${totalUsedPieces}" (如果按片计算)`)
        console.log(`   📝 含义: 这个采购记录已被用于制作SKU产品`)
        console.log(`   🔍 详情: 使用了 ${totalUsedPieces} 片, ${totalUsedBeads} 颗`)
        console.log(`   💡 状态: 已消耗，用于制作 ${purchase.materialUsages[0]?.product?.sku?.sku_name || '未知SKU'}`)
      }
    })
    
    console.log(`\n\n📖 "使用0" 的完整解释:`)
    console.log(`\n1. 📊 数据含义:`)
    console.log(`   - "使用0" = 该采购记录的原材料使用量为0`)
    console.log(`   - 表示这批原材料还没有被用于制作任何SKU产品`)
    console.log(`   - 原材料仍然在库存中，处于可用状态`)
    
    console.log(`\n2. 🔍 技术原理:`)
    console.log(`   - 系统通过MaterialUsage表记录原材料的使用情况`)
    console.log(`   - 如果Purchase记录没有对应的MaterialUsage记录，使用量就是0`)
    console.log(`   - 前端通过计算MaterialUsage中的quantityUsedPieces来显示使用量`)
    
    console.log(`\n3. 💼 业务场景:`)
    console.log(`   - 采购了原材料但还没有开始制作产品`)
    console.log(`   - 原材料质量不符合要求，暂时不使用`)
    console.log(`   - 库存充足，暂时不需要使用这批原材料`)
    console.log(`   - 等待合适的订单或设计方案`)
    
    console.log(`\n4. ⚠️ 注意事项:`)
    console.log(`   - "使用0"不代表有问题，这是正常的库存状态`)
    console.log(`   - 这些原材料可以随时用于制作新的SKU产品`)
    console.log(`   - 系统会在制作SKU时自动创建MaterialUsage记录`)
    
    // 统计汇总
    const unusedCount = purchases.filter(p => p.materialUsages.length === 0).length
    const usedCount = purchases.filter(p => p.materialUsages.length > 0).length
    
    console.log(`\n📈 统计汇总:`)
    console.log(`   - 总采购记录: ${purchases.length} 个`)
    console.log(`   - 显示"使用0"的记录: ${unusedCount} 个 (${((unusedCount/purchases.length)*100).to_fixed(1)}%)`)
    console.log(`   - 已使用的记录: ${usedCount} 个 (${((usedCount/purchases.length)*100).to_fixed(1)}%)`)
    
    console.log(`\n✅ 结论: "使用0"是正常的库存状态，表示原材料还未被使用，可用于未来的产品制作。`)
    
  } catch (error) {
    console.error('❌ 分析过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行分析
explainUsageZero()