// 检查和田玉挂件采购记录与SKU关联关系的脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkHetianyuPurchaseSkuRelation() {
  try {
    console.log('🔍 检查和田玉挂件采购记录与SKU关联关系...')
    
    // 1. 查找和田玉挂件的采购记录
    console.log('\n📦 1. 查找和田玉挂件采购记录:')
    const hetianyuPurchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '和田玉挂件'
        }
      },
      include: {
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
        created_at: 'asc'
      }
    })
    
    console.log(`   找到 ${hetianyuPurchases.length} 条采购记录`)
    let totalPurchased = 0
    let totalUsed = 0
    
    hetianyuPurchases.for_each((purchase, index) => {
      console.log(`\n   ${index + 1}. 采购记录详情:`)
      console.log(`      ID: ${purchase.id}`)
      console.log(`      数量: ${purchase.quantity || purchase.piece_count || '未知'}`)
      console.log(`      状态: ${purchase.status}`)
      console.log(`      创建时间: ${purchase.created_at.to_locale_string()}`)
      
      if (purchase.quantity) totalPurchased += purchase.quantity
      if (purchase.piece_count) totalPurchased += purchase.piece_count
      
      if (purchase.materialUsages.length > 0) {
        console.log(`      关联的成品:`)
        purchase.materialUsages.for_each(usage => {
          console.log(`        - 成品: ${usage.product.name}`)
          console.log(`        - 成品ID: ${usage.product.id}`)
          console.log(`        - SKU: ${usage.product.sku ? usage.product.sku.sku_name : '无SKU'}`)
          console.log(`        - 使用颗数: ${usage.quantity_used_beads}`)
          console.log(`        - 使用片数: ${usage.quantity_used_pieces}`)
          totalUsed += usage.quantity_used_beads + usage.quantity_used_pieces
        })
      } else {
        console.log(`      ⚠️  未关联任何成品`)
      }
    })
    
    console.log(`\n   📊 采购总数量: ${totalPurchased} 件`)
    console.log(`   📊 已使用数量: ${totalUsed} 件`)
    console.log(`   📊 剩余数量: ${totalPurchased - totalUsed} 件`)
    
    // 2. 查找和田玉挂件SKU
    console.log('\n🏷️ 2. 查找和田玉挂件SKU:')
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
              }
            }
          }
        }
      }
    })
    
    if (!hetianyuSku) {
      console.log('   ❌ 未找到和田玉挂件SKU')
      return
    }
    
    console.log(`   ✅ 找到SKU: ${hetianyuSku.sku_name}`)
    console.log(`   📊 当前库存: 总量=${hetianyuSku.total_quantity}, 可售=${hetianyuSku.available_quantity}`)
    console.log(`   📊 关联成品数量: ${hetianyuSku.products.length}`)
    
    // 3. 分析SKU与采购记录的关联
    console.log('\n🔗 3. 分析SKU与采购记录的关联:')
    const skuRelatedPurchases = new Set()
    let skuTotalMaterialUsed = 0
    
    hetianyuSku.products.for_each((product, index) => {
      console.log(`\n   成品 ${index + 1}: ${product.name}`)
      console.log(`      成品ID: ${product.id}`)
      console.log(`      数量: ${product.quantity}`)
      
      product.materialUsages.for_each(usage => {
        skuRelatedPurchases.add(usage.purchase.id)
        skuTotalMaterialUsed += usage.quantity_used_beads + usage.quantity_used_pieces
        console.log(`      使用采购记录: ${usage.purchase.id} (${usage.purchase.product_name})`)
        console.log(`      使用数量: 颗数=${usage.quantity_used_beads}, 片数=${usage.quantity_used_pieces}`)
      })
    })
    
    console.log(`\n   📊 SKU关联的采购记录数: ${skuRelatedPurchases.size}`)
    console.log(`   📊 SKU使用的原材料总数: ${skuTotalMaterialUsed}`)
    
    // 4. 问题分析
    console.log('\n🔍 4. 问题分析:')
    console.log('\n   用户期望的逻辑:')
    console.log('   - 采购48件和田玉挂件原材料')
    console.log('   - 制作1件SKU，剩余47件原材料')
    console.log('   - 补货5件SKU，剩余42件原材料')
    console.log('   - 销毁1件SKU(退回原材料)，剩余42件原材料')
    console.log('   - 拆散重做1件SKU，剩余43件原材料')
    
    console.log('\n   实际情况:')
    console.log(`   - 采购记录显示: ${totalPurchased} 件`)
    console.log(`   - SKU当前库存: ${hetianyuSku.available_quantity} 件`)
    console.log(`   - 库存变更日志显示: 制作1件 + 补货5件 - 销毁2件 = 4件`)
    
    console.log('\n   🚨 发现的问题:')
    if (totalPurchased !== 48) {
      console.log(`   1. 采购数量不匹配: 期望48件，实际${totalPurchased}件`)
    }
    
    if (hetianyuSku.available_quantity !== 43) {
      console.log(`   2. 最终库存不匹配: 期望43件，实际${hetianyuSku.available_quantity}件`)
    }
    
    console.log('\n   💡 可能的原因:')
    console.log('   1. 采购记录数据不完整或不正确')
    console.log('   2. SKU制作时没有正确关联采购记录')
    console.log('   3. 补货操作的逻辑可能有问题')
    console.log('   4. 销毁操作的退回原材料逻辑可能有问题')
    console.log('   5. 拆散重做操作可能没有正确记录')
    
    // 5. 检查是否有其他和田玉相关的采购记录
    console.log('\n🔍 5. 检查其他和田玉相关的采购记录:')
    const allHetianyuPurchases = await prisma.purchase.find_many({
      where: {
        OR: [
          { product_name: { contains: '和田玉' } },
          { product_name: { contains: '挂件' } }
        ]
      },
      orderBy: {
        created_at: 'asc'
      }
    })
    
    console.log(`   找到 ${allHetianyuPurchases.length} 条相关采购记录:`)
    allHetianyuPurchases.for_each((purchase, index) => {
      console.log(`   ${index + 1}. ${purchase.product_name} - 数量: ${purchase.quantity || purchase.piece_count || '未知'} - 状态: ${purchase.status}`)
    })
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkHetianyuPurchaseSkuRelation()