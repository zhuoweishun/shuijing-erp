import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function test_price_distribution_api() {
  console.log('🔍 测试单价区间分布API计算逻辑...')
  
  try {
    // 使用与API相同的SQL查询逻辑
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'localhost',
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'shuijing_erp'
    })
    
    // 模拟API中的单价区间分布查询
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
            WHEN material_type = 'BRACELET' THEN remaining_beads
            WHEN material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') THEN remaining_pieces
            ELSE 0
          END
        ) as count
      FROM (
        SELECT 
          p.purchase_type as material_type,
          CASE 
            WHEN p.purchase_type = 'LOOSE_BEADS' AND remaining_beads > 0 THEN p.total_price / p.total_beads
            WHEN p.purchase_type = 'BRACELET' AND remaining_beads > 0 THEN COALESCE(p.price_per_bead, p.total_price / NULLIF(p.total_beads, 0))
            WHEN p.purchase_type = 'ACCESSORIES' AND remaining_pieces > 0 THEN p.total_price / p.piece_count
            WHEN p.purchase_type = 'FINISHED_MATERIAL' AND remaining_pieces > 0 THEN p.total_price / p.piece_count
            ELSE NULL
          END as calculated_price,
          remaining_beads,
          remaining_quantity,
          remaining_pieces
        FROM (
          SELECT 
            p.*,
            CASE 
              WHEN p.purchase_type = 'LOOSE_BEADS' THEN p.total_beads - COALESCE(SUM(mu.quantity_used), 0)
              WHEN p.purchase_type = 'BRACELET' THEN p.total_beads - COALESCE(SUM(mu.quantity_used), 0)
              ELSE 0
            END as remaining_beads,
            CASE 
              WHEN p.purchase_type = 'BRACELET' THEN p.quantity - COALESCE(SUM(mu.quantity_used), 0)
              ELSE 0
            END as remaining_quantity,
            CASE 
              WHEN p.purchase_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') THEN p.piece_count - COALESCE(SUM(mu.quantity_used), 0)
              ELSE 0
            END as remaining_pieces
          FROM purchases p
          LEFT JOIN material_usage mu ON p.id = mu.purchase_id
          WHERE p.status IN ('ACTIVE', 'USED')
            AND p.total_price IS NOT NULL
            AND p.total_price > 0
            AND (
              (p.purchase_type = 'LOOSE_BEADS' AND p.total_beads IS NOT NULL AND p.total_beads > 0) OR
              (p.purchase_type = 'BRACELET' AND p.quantity IS NOT NULL AND p.quantity > 0) OR
              (p.purchase_type = 'ACCESSORIES' AND p.piece_count IS NOT NULL AND p.piece_count > 0) OR
              (p.purchase_type = 'FINISHED_MATERIAL' AND p.piece_count IS NOT NULL AND p.piece_count > 0)
            )
            AND p.purchase_type = 'LOOSE_BEADS'
          GROUP BY p.id, p.purchase_type, p.total_beads, p.quantity, p.piece_count, p.total_price
        ) p
      ) as price_data
      WHERE calculated_price IS NOT NULL
        AND (
          (material_type = 'LOOSE_BEADS' AND remaining_beads > 0) OR
          (material_type = 'BRACELET' AND remaining_beads > 0) OR
          (material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') AND remaining_pieces > 0)
        )
      GROUP BY price_range
      ORDER BY 
         CASE price_range
           WHEN '0-3元（含）' THEN 6
           WHEN '3-10元（含）' THEN 7
           WHEN '10-20元（含）' THEN 8
           WHEN '20-50元（含）' THEN 9
           WHEN '50元以上' THEN 10
           ELSE 11
         END
    `
    
    console.log('\n📊 执行单价区间分布查询...')
    const [rangeData] = await connection.execute(priceRangeQuery)
    
    console.log('单价区间分布结果:')
    let total_count = 0
    rangeData.forEach(row => {
      console.log(`- ${row.price_range}: ${row.count}颗`)
      total_count += Number(row.count)
    })
    
    console.log(`\n总计: ${total_count}颗`)
    
    // 详细查看中间计算步骤
    console.log('\n📊 详细查看中间计算步骤:')
    
    const detailQuery = `
      SELECT 
        p.purchase_code,
        p.purchase_name,
        p.purchase_type as material_type,
        p.total_beads,
        p.total_price,
        COALESCE(SUM(mu.quantity_used), 0) as used_quantity,
        p.total_beads - COALESCE(SUM(mu.quantity_used), 0) as remaining_beads,
        CASE 
          WHEN p.purchase_type = 'LOOSE_BEADS' AND (p.total_beads - COALESCE(SUM(mu.quantity_used), 0)) > 0 
          THEN p.total_price / p.total_beads
          ELSE NULL
        END as calculated_price
      FROM purchases p
      LEFT JOIN material_usage mu ON p.id = mu.purchase_id
      WHERE p.status IN ('ACTIVE', 'USED')
        AND p.total_price IS NOT NULL
        AND p.total_price > 0
        AND p.purchase_type = 'LOOSE_BEADS'
        AND p.total_beads IS NOT NULL 
        AND p.total_beads > 0
      GROUP BY p.id, p.purchase_code, p.purchase_name, p.purchase_type, p.total_beads, p.total_price
      HAVING remaining_beads > 0
      ORDER BY calculated_price
    `
    
    const [detailData] = await connection.execute(detailQuery)
    
    console.log('详细计算步骤:')
    detailData.forEach(row => {
      console.log(`- ${row.purchase_code}: ${row.purchase_name}`)
      console.log(`  总颗数: ${row.total_beads}, 已用: ${row.used_quantity}, 剩余: ${row.remaining_beads}`)
      console.log(`  总价: ${row.total_price}, 单价: ${Number(row.calculated_price).toFixed(4)}元/颗`)
      
      // 判断价格区间
      const price = Number(row.calculated_price)
      let range = '未知'
      if (price >= 0 && price <= 3) range = '0-3元（含）'
      else if (price > 3 && price <= 10) range = '3-10元（含）'
      else if (price > 10 && price <= 20) range = '10-20元（含）'
      else if (price > 20 && price <= 50) range = '20-50元（含）'
      else if (price > 50) range = '50元以上'
      
      console.log(`  价格区间: ${range}, 贡献数量: ${row.remaining_beads}颗`)
    })
    
    await connection.end()
    
    console.log('\n✅ 测试完成!')
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

test_price_distribution_api()