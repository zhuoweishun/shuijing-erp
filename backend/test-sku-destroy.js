import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function destroyTestSku() {
  try {
    console.log('🔥 开始SKU销毁测试...')
    
    // 查找刚创建的SKU
    const sku = await prisma.product_sku.find_first({
      where: {
        sku_code: { startsWith: 'SKU20250905' }
      },
      include: {
        products: {
          include: {
            materialUsages: {
              include: {
                purchase: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })
    
    if (!sku) {
      console.log('❌ 未找到测试SKU');
      return
    }
    
    console.log(`\n🎯 找到测试SKU: ${sku.sku_code}`);
    console.log(`📊 当前库存: ${sku.available_quantity} 个`);
    
    if (sku.available_quantity < 1) {
      console.log('❌ SKU库存不足，无法销毁');
      return
    }
    
    // 获取用户ID
    const user = await prisma.user.find_first()
    if (!user) {
      console.log('❌ 未找到用户');
      return
    }
    
    // 获取原材料使用记录
    const product = sku.products[0]
    if (!product) {
      console.log('❌ 未找到关联的Product记录');
      return
    }
    
    console.log(`\n📋 原材料使用记录 (${product.materialUsages.length} 条):`);
    product.materialUsages.for_each((usage, index) => {
      const usedBeads = usage.quantity_used_beads || 0
      const usedPieces = usage.quantity_used_pieces || 0
      const totalUsed = usedBeads + usedPieces
      console.log(`  ${index + 1}. ${usage.purchase.product_name}`);
      console.log(`     采购编号: ${usage.purchase.purchase_code}`);
      console.log(`     使用数量: ${totalUsed} ${usedBeads > 0 ? '颗' : '件'}`);
      console.log(`     单位成本: ¥${usage.unitCost}`);
    });
    
    // 计算退还比例（销毁1个，总共制作了2个，所以退还50%）
    const destroyQuantity = 1
    const returnRatio = destroyQuantity / sku.total_quantity
    
    console.log(`\n🔄 销毁计划:`);
    console.log(`   销毁数量: ${destroyQuantity} 个`);
    console.log(`   退还比例: ${(returnRatio * 100).to_fixed(1)}%`);
    
    // 开始事务销毁SKU
    console.log('\n🚀 开始销毁SKU...');
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新SKU库存
      const updatedSku = await tx.product_sku.update({
        where: { id: sku.id },
        data: {
          available_quantity: sku.available_quantity - destroyQuantity,
          totalValue: sku.unit_price * (sku.available_quantity - destroyQuantity)
        }
      })
      
      console.log(`✅ SKU库存更新: ${sku.available_quantity} → ${updatedSku.available_quantity}`);
      
      // 2. 更新Product库存
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          quantity: product.quantity - destroyQuantity,
          totalValue: product.unit_price * (product.quantity - destroyQuantity)
        }
      })
      
      console.log(`✅ Product库存更新: ${product.quantity} → ${updatedProduct.quantity}`);
      
      // 3. 创建退回的MaterialUsage记录（负数表示退回）
      const returnUsages = []
      
      for (const usage of product.materialUsages) {
        const usedBeads = usage.quantity_used_beads || 0
        const usedPieces = usage.quantity_used_pieces || 0
        
        // 计算退回数量（按比例退回）
        const returnBeads = Math.floor(usedBeads * returnRatio)
        const returnPieces = Math.floor(usedPieces * returnRatio)
        
        if (returnBeads > 0 || returnPieces > 0) {
          const returnUsage = await tx.material_usage.create({
            data: {
              purchase_id: usage.purchase_id,
              productId: product.id,
              quantity_used_beads: -returnBeads, // 负数表示退回
              quantity_used_pieces: -returnPieces, // 负数表示退回
              unitCost: usage.unitCost,
              total_cost: -(usage.unitCost * (returnBeads + returnPieces)) // 负数表示成本退回
            }
          })
          
          returnUsages.push(returnUsage)
          
          const returnTotal = returnBeads + returnPieces
          const unit = returnBeads > 0 ? '颗' : '件'
          console.log(`✅ 退回原材料: ${usage.purchase.product_name} ${returnTotal}${unit}`);
        }
      }
      
      // 4. 创建SKU库存变更日志
      const inventoryLog = await tx.sku_inventory_log.create({
        data: { sku_id: sku.id,
          action: 'DESTROY',
          quantityChange: -destroyQuantity,
          quantityBefore: sku.available_quantity,
          quantityAfter: sku.available_quantity - destroyQuantity,
          referenceType: 'DESTROY',
          referenceId: product.id,
          notes: `销毁${destroyQuantity}个SKU，退回${(returnRatio * 100).to_fixed(1)}%原材料`,
          userId: user.id
        }
      })
      
      console.log(`✅ 库存日志创建成功: ${inventoryLog.id}`);
      
      return {
        updatedSku,
        updatedProduct,
        returnUsages,
        inventoryLog
      }
    })
    
    console.log('\n🎉 SKU销毁测试完成！');
    console.log(`📦 SKU: ${sku.sku_code}`);
    console.log(`📊 剩余库存: ${result.updatedSku.available_quantity} 个`);
    console.log(`🔄 退回原材料记录: ${result.returnUsages.length} 条`);
    
    // 验证库存计算
    console.log('\n🧮 验证库存计算...');
    
    for (const usage of product.materialUsages) {
      // 计算该采购记录的剩余库存
      const totalUsage = await prisma.material_usage.aggregate({
        where: { purchase_id: usage.purchase_id },
        Sum: {
          quantity_used_beads: true,
          quantity_used_pieces: true
        }
      })
      
      const purchase = usage.purchase
      const netUsedBeads = totalUsage.Sum.quantity_used_beads || 0
      const netUsedPieces = totalUsage.Sum.quantity_used_pieces || 0
      const netUsed = netUsedBeads + netUsedPieces
      
      const initialQuantity = purchase.total_beads || purchase.piece_count || purchase.quantity || 0
      const remaining_quantity = Math.max(0, initialQuantity - netUsed)
      
      console.log(`📊 ${purchase.product_name} (${purchase.purchase_code}):`);
      console.log(`   初始数量: ${initialQuantity}`);
      console.log(`   净使用量: ${netUsed} (包含退回)`);
      console.log(`   剩余库存: ${remaining_quantity}`);
    }
    
    return result
    
  } catch (error) {
    console.error('❌ SKU销毁测试失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

destroyTestSku().catch(console.error)