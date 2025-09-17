import mysql from 'mysql2/promise'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debug_price_distribution() {
  console.log('🔍 调试库存仪表盘单价区间分布问题...')
  
  try {
    // 1. 检查散珠类型的原始数据
    console.log('\n📊 1. 检查散珠类型的原始数据:')
    const loose_beads_purchases = await prisma.purchase.findMany({
      where: {
        purchase_type: 'LOOSE_BEADS',
        status: { in: ['ACTIVE', 'USED'] },
        total_price: { not: null, gt: 0 },
        total_beads: { not: null, gt: 0 }
      },
      include: {
        material_usages: true
      }
    })
    
    console.log(`找到 ${loose_beads_purchases.length} 条散珠采购记录`)
    
    loose_beads_purchases.forEach(purchase => {
      const used_quantity = purchase.material_usages.reduce((sum, usage) => sum + (usage.quantity_used || 0), 0)
      const remaining_beads = (purchase.total_beads || 0) - used_quantity
      const unit_price = purchase.total_beads > 0 ? (purchase.total_price || 0) / purchase.total_beads : 0
      
      console.log(`- ${purchase.purchase_code}: ${purchase.purchase_name}`)
      console.log(`  总颗数: ${purchase.total_beads}, 已用: ${used_quantity}, 剩余: ${remaining_beads}`)
      console.log(`  总价: ${purchase.total_price}, 单价: ${unit_price.toFixed(4)}元/颗`)
    })
    
    // 2. 检查materials表中的散珠数据
    console.log('\n📊 2. 检查materials表中的散珠数据:')
    const loose_beads_materials = await prisma.material.findMany({
      where: {
        material_type: 'LOOSE_BEADS',
        remaining_quantity: { gt: 0 }
      }
    })
    
    console.log(`找到 ${loose_beads_materials.length} 条散珠材料记录`)
    
    loose_beads_materials.forEach(material => {
      const unit_cost = material.original_quantity > 0 ? (material.total_cost || 0) / material.original_quantity : 0
      console.log(`- ${material.material_code}: ${material.material_name}`)
      console.log(`  原始数量: ${material.original_quantity}, 已用: ${material.used_quantity}, 剩余: ${material.remaining_quantity}`)
      console.log(`  总成本: ${material.total_cost}, 单价: ${unit_cost.toFixed(4)}元/颗`)
    })
    
    // 3. 模拟单价区间分布的SQL查询
    console.log('\n📊 3. 模拟单价区间分布的SQL查询:')
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'shuijing_erp'
    })
    
    const priceRangeQuery = `
      SELECT 
         CASE 
           WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price >= 0 AND calculated_price <= 3 THEN '0-3元（含）'
           WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 3 AND calculated_price <= 10 THEN '3-10元（含）'
           WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 10 AND calculated_price <= 20 THEN '10-20元（含）'
           WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 20 AND calculated_price <= 50 THEN '20-50元（含）'
           WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 50 THEN '50元以上'
           ELSE '未知'
         END as price_range,
        SUM(
          CASE 
            WHEN material_type = 'LOOSE_BEADS' THEN remaining_beads
            ELSE 0
          END
        ) as count,
        GROUP_CONCAT(CONCAT(purchase_code, ':', remaining_beads, '颗')) as details
      FROM (
        SELECT 
          p.purchase_code,
          p.purchase_type as material_type,
          CASE 
            WHEN p.purchase_type = 'LOOSE_BEADS' AND remaining_beads > 0 THEN p.total_price / p.total_beads
            ELSE NULL
          END as calculated_price,
          remaining_beads
        FROM (
          SELECT 
            p.*,
            CASE 
              WHEN p.purchase_type = 'LOOSE_BEADS' THEN p.total_beads - COALESCE(SUM(mu.quantity_used), 0)
              ELSE 0
            END as remaining_beads
          FROM purchases p
          LEFT JOIN material_usage mu ON p.id = mu.purchase_id
          WHERE p.status IN ('ACTIVE', 'USED')
            AND p.total_price IS NOT NULL
            AND p.total_price > 0
            AND p.purchase_type = 'LOOSE_BEADS'
            AND p.total_beads IS NOT NULL 
            AND p.total_beads > 0
          GROUP BY p.id, p.purchase_code, p.purchase_type, p.total_beads, p.total_price
        ) p
      ) as price_data
      WHERE calculated_price IS NOT NULL
        AND material_type = 'LOOSE_BEADS' 
        AND remaining_beads > 0
      GROUP BY price_range
      ORDER BY 
         CASE price_range
           WHEN '0-3元（含）' THEN 1
           WHEN '3-10元（含）' THEN 2
           WHEN '10-20元（含）' THEN 3
           WHEN '20-50元（含）' THEN 4
           WHEN '50元以上' THEN 5
           ELSE 6
         END
    `
    
    console.log('执行单价区间分布查询...')
    const [rangeData] = await connection.execute(priceRangeQuery)
    
    console.log('单价区间分布结果:')
    rangeData.forEach(row => {
      console.log(`- ${row.price_range}: ${row.count}颗`)
      console.log(`  详情: ${row.details}`)
    })
    
    // 4. 检查具体的计算逻辑
    console.log('\n📊 4. 检查具体的计算逻辑:')
    
    const detailQuery = `
      SELECT 
        p.purchase_code,
        p.purchase_name,
        p.total_beads,
        p.total_price,
        COALESCE(SUM(mu.quantity_used), 0) as used_quantity,
        p.total_beads - COALESCE(SUM(mu.quantity_used), 0) as remaining_beads,
        CASE 
          WHEN p.total_beads > 0 THEN p.total_price / p.total_beads
          ELSE 0
        END as unit_price
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      WHERE p.purchase_type = 'LOOSE_BEADS'
        AND p.status IN ('ACTIVE', 'USED')
        AND p.total_price IS NOT NULL
        AND p.total_price > 0
        AND p.total_beads IS NOT NULL 
        AND p.total_beads > 0
      GROUP BY p.id, p.purchase_code, p.purchase_name, p.total_beads, p.total_price
      HAVING remaining_beads > 0
      ORDER BY unit_price
    `
    
    const [detailData] = await connection.execute(detailQuery)
    
    console.log('散珠详细数据:')
    detailData.forEach(row => {
      console.log(`- ${row.purchase_code}: ${row.purchase_name}`)
      console.log(`  总颗数: ${row.total_beads}, 已用: ${row.used_quantity}, 剩余: ${row.remaining_beads}`)
      console.log(`  总价: ${row.total_price}, 单价: ${Number(row.unit_price).toFixed(4)}元/颗`)
    })
    
    await connection.end()
    
    console.log('\n✅ 调试完成!')
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debug_price_distribution()