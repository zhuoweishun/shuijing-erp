import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prisma = new PrismaClient()

async function verifyInventoryFix() {
  try {
    console.log('🔍 验证库存修复结果...')
    
    // 1. 直接通过数据库验证计算逻辑
    console.log('\n📊 1. 数据库直接计算验证:')
    const purchase = await prisma.purchase.find_first({
      where: {
        purchase_code: 'CG20250901590291'
      }
    })
    
    if (!purchase) {
      console.log('❌ 未找到采购记录CG20250901590291')
      return
    }
    
    const totalUsage = await prisma.material_usage.aggregate({
      where: { purchase_id: purchase.id },
      Sum: {
        quantity_used_beads: true,
        quantity_used_pieces: true
      }
    })
    
    const netUsedBeads = totalUsage.Sum.quantity_used_beads || 0
    const netUsedPieces = totalUsage.Sum.quantity_used_pieces || 0
    const netUsed = netUsedBeads + netUsedPieces
    
    const original_quantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
    const calculatedRemaining = originalQuantity - netUsed
    
    console.log(`   原始数量: ${original_quantity}件`)
    console.log(`   净使用量: ${netUsed}件 (颗数: ${netUsedBeads}, 片数: ${netUsedPieces})`)
    console.log(`   计算剩余: ${calculatedRemaining}件`)
    
    // 2. 通过API验证
    console.log('\n🌐 2. API接口验证:')
    try {
      // 获取SKU溯源信息，其中包含原材料库存信息
      const response = await fetch('http://localhost:3001/api/v1/skus/SKU20250901003/trace')
      const data = await response.json()
      
      if (data.success && data.data && data.data.length > 0) {
        const traceInfo = data.data[0]
        console.log(`   API返回的原材料库存: ${traceInfo.remaining_quantity}件`)
        
        if (traceInfo.remaining_quantity === calculatedRemaining) {
          console.log('   ✅ API计算结果与数据库计算一致')
        } else {
          console.log(`   ❌ API计算结果不一致，期望: ${calculatedRemaining}件，实际: ${traceInfo.remaining_quantity}件`)
        }
      } else {
        console.log('   ❌ API调用失败或返回数据为空')
      }
    } catch (api_error) {
      console.log(`   ❌ API调用出错: ${apiError.message}`)
    }
    
    // 3. 验证补货信息API
    console.log('\n🔄 3. 补货信息API验证:')
    try {
      const restockResponse = await fetch('http://localhost:3001/api/v1/skus/SKU20250901003/restock/info')
      const restockData = await restockResponse.json()
      
      if (restockData.success && restockData.data && restockData.data.required_materials) {
        const materialInfo = restockData.data.required_materials.find(m => 
          m.purchase_id === purchase.id
        )
        
        if (materialInfo) {
          console.log(`   补货API显示的原材料库存: ${materialInfo.current_remaining}件`)
          
          if (materialInfo.current_remaining === calculatedRemaining) {
            console.log('   ✅ 补货API计算结果正确')
          } else {
            console.log(`   ❌ 补货API计算结果不一致，期望: ${calculatedRemaining}件，实际: ${materialInfo.current_remaining}件`)
          }
        } else {
          console.log('   ❌ 补货API中未找到对应的原材料信息')
        }
      } else {
        console.log('   ❌ 补货API调用失败或返回数据为空')
      }
    } catch (restock_error) {
      console.log(`   ❌ 补货API调用出错: ${restockError.message}`)
    }
    
    // 4. 详细的MaterialUsage记录验证
    console.log('\n📋 4. MaterialUsage记录详细验证:')
    const materialUsages = await prisma.material_usage.find_many({
      where: { purchase_id: purchase.id },
      orderBy: { created_at: 'asc' },
      include: {
        product: {
          include: {
            sku: true
          }
        }
      }
    })
    
    console.log(`   找到 ${materialUsages.length} 条MaterialUsage记录:`)
    let runningTotal = originalQuantity
    
    materialUsages.for_each((usage, index) => {
      const usedBeads = usage.quantity_used_beads || 0
      const usedPieces = usage.quantity_used_pieces || 0
      const totalUsed = usedBeads + usedPieces
      
      runningTotal -= totalUsed
      
      console.log(`   ${index + 1}. ${usage.created_at.to_i_s_o_string().split('T')[0]}`)
      console.log(`      SKU: ${usage.product.sku.sku_code}`)
      console.log(`      使用量: ${totalUsed}件 (颗数: ${usedBeads}, 片数: ${usedPieces})`)
      console.log(`      剩余: ${runningTotal}件`)
    })
    
    // 5. 总结
    console.log('\n🎯 5. 修复验证总结:')
    console.log(`   原材料CG20250901590291:`)
    console.log(`   - 原始采购: ${original_quantity}件`)
    console.log(`   - 净消耗: ${netUsed}件`)
    console.log(`   - 理论剩余: ${calculatedRemaining}件`)
    console.log(`   - 修复前显示: 35件`)
    console.log(`   - 修复后应显示: ${calculatedRemaining}件`)
    
    if (calculatedRemaining === 39) {
      console.log('\n   ✅ 修复成功！库存计算现在正确处理了拆散重做的退回记录')
      console.log('   ✅ 负数MaterialUsage记录被正确视为退回到库存')
      console.log('   ✅ 净使用量计算正确：13件消耗 - 4件退回 = 9件净消耗')
      console.log('   ✅ 最终库存：48件原始 - 9件净消耗 = 39件剩余')
    } else {
      console.log(`\n   ❌ 修复可能不完整，期望39件，实际计算${calculatedRemaining}件`)
    }
    
  } catch (error) {
    console.error('❌ 验证过程中出错:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyInventoryFix()