// 检查特定的和田玉挂件采购记录（东海水晶，18mm，品质C）
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSpecificHetianyuRecords() {
  try {
    console.log('🔍 检查东海水晶的和田玉挂件采购记录（18mm，品质C）...')
    
    // 查找东海水晶供应商的和田玉挂件记录
    const specificPurchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '和田玉挂件'
        },
        supplier: {
          name: '东海水晶'
        },
        specification: '18',
        quality: 'C'
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
    
    console.log(`\n📋 找到 ${specificPurchases.length} 个匹配的采购记录`)
    
    for (const purchase of specificPurchases) {
      console.log(`\n=== 采购记录详情 ===`)
      console.log(`采购编号: ${purchase.purchase_code}`)
      console.log(`产品名称: ${purchase.product_name}`)
      console.log(`供应商: ${purchase.supplier?.name}`)
      console.log(`规格: ${purchase.specification}mm`)
      console.log(`品质: ${purchase.quality}`)
      console.log(`采购数量: ${purchase.quantity} ${purchase.unit}`)
      console.log(`单价: ¥${purchase.unit_price}`)
      console.log(`总价: ¥${purchase.total_price}`)
      console.log(`状态: ${purchase.status}`)
      console.log(`剩余数量: ${purchase.remaining_quantity || '未设置'}`)
      console.log(`创建时间: ${purchase.created_at}`)
      
      // 详细分析MaterialUsage记录
      console.log(`\n📊 使用情况分析:`)
      if (purchase.materialUsages.length === 0) {
        console.log(`❌ 状态: 未被使用`)
        console.log(`原因: 没有任何MaterialUsage记录`)
        console.log(`说明: 这个采购记录还没有被用于制作任何SKU产品`)
      } else {
        console.log(`✅ 状态: 已被使用`)
        console.log(`使用记录数量: ${purchase.materialUsages.length} 条`)
        
        let totalUsedPieces = 0
        let totalUsedBeads = 0
        let total_cost = 0
        
        purchase.materialUsages.for_each((usage, index) => {
          console.log(`\n   📝 使用记录 ${index + 1}:`)
          console.log(`   - 使用量: ${usage.quantity_used_beads || 0} 颗, ${usage.quantity_used_pieces || 0} 片`)
          console.log(`   - 单位成本: ¥${usage.unit_cost}`)
          console.log(`   - 总成本: ¥${usage.total_cost}`)
          console.log(`   - 使用时间: ${usage.created_at}`)
          
          totalUsedPieces += usage.quantity_used_pieces || 0
          totalUsedBeads += usage.quantity_used_beads || 0
          totalCost += parseFloat(usage.total_cost || 0)
          
          if (usage.product?.sku) {
            console.log(`   - 关联SKU: ${usage.product.sku.sku_code}`)
            console.log(`   - SKU名称: ${usage.product.sku.sku_name}`)
            console.log(`   - SKU状态: 总量${usage.product.sku.total_quantity}, 可售${usage.product.sku.available_quantity}`)
          }
        })
        
        console.log(`\n   📈 使用汇总:`)
        console.log(`   - 总使用量: ${totalUsedBeads} 颗, ${totalUsedPieces} 片`)
        console.log(`   - 总使用成本: ¥${totalCost.to_fixed(2)}`)
        
        // 计算使用率
        const usageRate = ((totalUsedPieces / purchase.quantity) * 100).to_fixed(2)
        console.log(`   - 使用率: ${usageRate}% (${totalUsedPieces}/${purchase.quantity})`)
      }
      
      // 检查相关的SKU制作记录
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
          },
          inventoryLogs: {
            orderBy: {
              created_at: 'desc'
            },
            take: 5
          }
        }
      })
      
      if (relatedSkus.length > 0) {
        console.log(`\n🔗 相关SKU制作记录:`)
        for (const sku of relatedSkus) {
          console.log(`   - SKU编号: ${sku.sku_code}`)
          console.log(`   - SKU名称: ${sku.sku_name}`)
          console.log(`   - 制作时间: ${sku.created_at}`)
          console.log(`   - 当前库存: 总量${sku.total_quantity}, 可售${sku.available_quantity}`)
          
          if (sku.inventoryLogs.length > 0) {
            console.log(`   - 最近库存变动:`)
            sku.inventoryLogs.for_each(log => {
              console.log(`     ${log.created_at}: ${log.action} ${log.quantity_change} (${log.notes || '无备注'})`)
            })
          }
        }
      }
      
      console.log(`\n${'='.repeat(60)}`)
    }
    
    // 如果没有找到匹配的记录，尝试更宽泛的搜索
    if (specificPurchases.length === 0) {
      console.log(`\n🔍 未找到完全匹配的记录，尝试更宽泛的搜索...`)
      
      const broaderSearch = await prisma.purchase.find_many({
        where: {
          OR: [
            {
              product_name: {
                contains: '和田玉挂件'
              },
              supplier: {
                name: '东海水晶'
              }
            },
            {
              product_name: {
                contains: '和田玉挂件'
              },
              specification: '18'
            },
            {
              product_name: {
                contains: '和田玉挂件'
              },
              quality: 'C'
            }
          ]
        },
        include: {
          supplier: true,
          materialUsages: true
        },
        orderBy: {
          created_at: 'desc'
        }
      })
      
      console.log(`\n📋 更宽泛搜索找到 ${broaderSearch.length} 个相关记录:`)
      broaderSearch.for_each(purchase => {
        console.log(`- ${purchase.purchase_code}: ${purchase.product_name}`)
        console.log(`  供应商: ${purchase.supplier?.name}, 规格: ${purchase.specification}, 品质: ${purchase.quality}`)
        console.log(`  使用状态: ${purchase.materialUsages.length > 0 ? '已使用' : '未使用'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行检查
checkSpecificHetianyuRecords()