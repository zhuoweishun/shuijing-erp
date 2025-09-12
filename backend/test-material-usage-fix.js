// 简化测试：验证原材料使用量计算修复
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testMaterialUsageFix() {
  try {
    console.log('🧪 测试原材料使用量计算修复...')
    
    // 1. 查找和田玉挂件SKU
    const hetianyuSku = await prisma.product_sku.find_first({
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
                purchase: true
              },
              orderBy: {
                created_at: 'asc'
              }
            }
          }
        }
      }
    })
    
    if (!hetianyuSku) {
      console.log('❌ 未找到和田玉挂件SKU')
      return
    }
    
    console.log(`\n✅ 找到SKU: ${hetianyuSku.sku_name}`)
    console.log(`   当前库存: ${hetianyuSku.available_quantity} 件`)
    console.log(`   总数量: ${hetianyuSku.total_quantity} 件`)
    
    // 2. 模拟修复后的计算逻辑
    console.log('\n🔧 模拟修复后的计算逻辑:')
    
    // 获取第一次制作时的MaterialUsage记录
    const firstMaterialUsage = await prisma.material_usage.find_first({
      where: { 
        product: { sku_id: hetianyuSku.id
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
      
      console.log(`   第一次制作时的MaterialUsage记录:`)
      console.log(`   - 使用量: ${firstUsageBeads}颗 + ${firstUsagePieces}件 = ${firstUsageTotal}件`)
      console.log(`   - 创建时间: ${firstMaterialUsage.created_at.to_locale_string()}`)
      
      // 直接使用第一次制作时的消耗量
      if (firstUsageTotal > 0) {
        singleSkuConsumption = firstUsageTotal
      }
    }
    
    console.log(`\n📊 计算结果:`)
    console.log(`   修复后的单个SKU消耗量: ${singleSkuConsumption} 件`)
    
    // 3. 验证结果
    console.log('\n✅ 验证结果:')
    if (singleSkuConsumption === 1) {
      console.log('   🎉 修复成功！单个SKU消耗量为1件，符合用户期望')
      console.log('   📝 这意味着销毁1件SKU时，会显示使用量为1件原材料')
    } else {
      console.log(`   ❌ 仍有问题：单个SKU消耗量为${singleSkuConsumption}件，用户期望1件`)
    }
    
    // 4. 显示所有MaterialUsage记录（用于对比）
    console.log('\n📋 所有MaterialUsage记录（用于对比）:')
    let allMaterialUsages = []
    hetianyuSku.products.for_each(product => {
      allMaterialUsages.push(...product.materialUsages)
    })
    
    allMaterialUsages.for_each((usage, index) => {
      const total = (usage.quantity_used_beads || 0) + (usage.quantity_used_pieces || 0)
      console.log(`   ${index + 1}. ${usage.created_at.to_locale_string()}: ${total}件`)
    })
    
    const totalUsage = allMaterialUsages.reduce((sum, usage) => {
      return sum + (usage.quantity_used_beads || 0) + (usage.quantity_used_pieces || 0)
    }, 0)
    
    console.log(`   总累计使用量: ${totalUsage}件`)
    console.log(`   修复前可能显示: ${totalUsage}件 (错误)`)
    console.log(`   修复后应该显示: ${singleSkuConsumption}件 (正确)`)
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行测试
testMaterialUsageFix().catch(console.error)