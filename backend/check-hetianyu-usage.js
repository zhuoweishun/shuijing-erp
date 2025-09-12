// 检查和田玉挂件采购记录的使用情况和溯源信息
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkHetianyuUsage() {
  try {
    console.log('🔍 开始检查和田玉挂件采购记录的使用情况...')
    
    // 1. 查找所有和田玉挂件的采购记录
    const hetianyuPurchases = await prisma.purchase.find_many({
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
    
    console.log(`\n📋 找到 ${hetianyuPurchases.length} 个和田玉挂件采购记录`)
    
    // 2. 分析每个采购记录的使用情况
    for (const purchase of hetianyuPurchases) {
      console.log(`\n=== 采购记录 ${purchase.purchase_code} ===`)
      console.log(`产品名称: ${purchase.product_name}`)
      console.log(`供应商: ${purchase.supplier?.name || '未知'}`)
      console.log(`规格: ${purchase.specification || 'N/A'}`)
      console.log(`品质: ${purchase.quality || 'N/A'}`)
      console.log(`总价: ¥${purchase.total_price}`)
      console.log(`状态: ${purchase.status}`)
      console.log(`剩余数量: ${purchase.remaining_quantity}`)
      console.log(`创建时间: ${purchase.created_at}`)
      
      // 检查MaterialUsage记录
      if (purchase.materialUsages.length === 0) {
        console.log(`❌ 使用情况: 未被使用 (无MaterialUsage记录)`)
      } else {
        console.log(`✅ 使用情况: 已被使用 (${purchase.materialUsages.length} 条MaterialUsage记录)`)
        
        for (const usage of purchase.materialUsages) {
          console.log(`   - 使用量: ${usage.quantity_used_beads || 0} 颗, ${usage.quantity_used_pieces || 0} 片`)
          console.log(`   - 单位成本: ¥${usage.unit_cost}`)
          console.log(`   - 总成本: ¥${usage.total_cost}`)
          
          if (usage.product?.sku) {
            console.log(`   - 关联SKU: ${usage.product.sku.sku_code} (${usage.product.sku.sku_name})`)
            console.log(`   - SKU状态: 总量${usage.product.sku.total_quantity}, 可售${usage.product.sku.available_quantity}`)
          } else {
            console.log(`   - 关联产品: ${usage.product?.name || '未知'}`)
          }
        }
      }
      
      // 3. 检查是否有相关的SKU制作记录
      const relatedSkus = await prisma.product_sku.find_many({
        where: {
          products: {
            some: {
              materialUsages: {
                some: {
                  purchase_id: purchase.id
                }
              }
            }
          }
        },
        include: {
          products: {
            include: {
              materialUsages: {
                where: {
                  purchase_id: purchase.id
                }
              }
            }
          }
        }
      })
      
      if (relatedSkus.length > 0) {
        console.log(`\n🔗 相关SKU制作记录:`)
        for (const sku of relatedSkus) {
          console.log(`   - SKU: ${sku.sku_code} (${sku.sku_name})`)
          console.log(`   - 制作时间: ${sku.created_at}`)
          console.log(`   - 当前状态: 总量${sku.total_quantity}, 可售${sku.available_quantity}`)
        }
      }
      
      // 4. 检查是否有销毁记录
      const destroyLogs = await prisma.sku_inventory_log.find_many({
        where: {
          action: 'DESTROY',
          sku: {
            products: {
              some: {
                materialUsages: {
                  some: {
                    purchase_id: purchase.id
                  }
                }
              }
            }
          }
        },
        include: {
          sku: true
        }
      })
      
      if (destroyLogs.length > 0) {
        console.log(`\n🗑️ 相关销毁记录:`)
        for (const log of destroyLogs) {
          console.log(`   - SKU: ${log.sku?.sku_code}`)
          console.log(`   - 销毁数量: ${Math.abs(log.quantity_change)}`)
          console.log(`   - 销毁时间: ${log.created_at}`)
          console.log(`   - 销毁原因: ${log.notes}`)
        }
      }
      
      console.log(`\n${'='.repeat(50)}`)
    }
    
    // 5. 总结分析
    const unusedPurchases = hetianyuPurchases.filter(p => p.materialUsages.length === 0)
    const usedPurchases = hetianyuPurchases.filter(p => p.materialUsages.length > 0)
    
    console.log(`\n📊 使用情况统计:`)
    console.log(`总采购记录: ${hetianyuPurchases.length}`)
    console.log(`未使用记录: ${unusedPurchases.length}`)
    console.log(`已使用记录: ${usedPurchases.length}`)
    
    if (unusedPurchases.length > 0) {
      console.log(`\n❓ 未使用的采购记录:`)
      for (const purchase of unusedPurchases) {
        console.log(`   - ${purchase.purchase_code}: ${purchase.product_name} (${purchase.supplier?.name})`)
        console.log(`     状态: ${purchase.status}, 剩余: ${purchase.remaining_quantity}`)
      }
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkHetianyuUsage()