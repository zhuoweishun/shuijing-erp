import mysql from 'mysql2/promise'

async function fix_trigger_and_sync() {
  let connection
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔧 修复触发器和数据同步问题...')
    
    // 1. 检查所有original_quantity为0的material记录
    console.log('\n🔍 查找所有original_quantity为0的material记录...')
    const [zeroQuantityMaterials] = await connection.query(`
      SELECT m.id, m.material_code, m.material_name, m.original_quantity, 
             p.piece_count, p.weight, p.total_price, p.purchase_type, p.bead_diameter
      FROM materials m
      JOIN purchases p ON m.purchase_id = p.id
      WHERE m.original_quantity = 0 AND p.status = 'ACTIVE'
    `)
    
    console.log(`找到 ${zeroQuantityMaterials.length} 条需要修复的记录：`)
    
    // 2. 批量修复这些记录
    for (const material of zeroQuantityMaterials) {
      console.log(`\n修复记录: ${material.material_code} (${material.material_name})`)
      console.log(`  采购数量: ${material.piece_count}, 重量: ${material.weight}, 类型: ${material.purchase_type}`)
      
      // 计算正确的数量
      let correctQuantity = 1 // 默认值
      
      if (material.purchase_type === 'LOOSE_BEADS') {
        if (material.piece_count && material.piece_count > 0) {
          correctQuantity = material.piece_count
        } else if (material.weight && material.weight > 0) {
          // 根据珠子直径计算数量
          switch (material.bead_diameter) {
            case 4.0: correctQuantity = Math.floor(material.weight * 25); break
            case 6.0: correctQuantity = Math.floor(material.weight * 11); break
            case 8.0: correctQuantity = Math.floor(material.weight * 6); break
            case 10.0: correctQuantity = Math.floor(material.weight * 4); break
            case 12.0: correctQuantity = Math.floor(material.weight * 3); break
            default: correctQuantity = Math.floor(material.weight * 5); break
          }
        }
      } else if (material.purchase_type === 'BRACELET') {
        correctQuantity = material.piece_count || 1
      } else {
        correctQuantity = material.piece_count || 1
      }
      
      // 确保数量至少为1
      correctQuantity = Math.max(correctQuantity, 1)
      
      // 计算正确的单位成本
      const correctUnitCost = material.total_price / correctQuantity
      
      console.log(`  修复后数量: ${correctQuantity}, 单位成本: ${correctUnitCost.toFixed(4)}`)
      
      // 更新记录
      await connection.query(`
        UPDATE materials 
        SET original_quantity = ?, 
            remaining_quantity = ? - used_quantity,
            unit_cost = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [correctQuantity, correctQuantity, correctUnitCost, material.id])
      
      console.log(`  ✅ 修复完成`)
    }
    
    // 3. 重新创建触发器以确保逻辑正确
    console.log('\n🔧 重新创建触发器...')
    
    // 删除现有触发器
    await connection.query('DROP TRIGGER IF EXISTS tr_purchase_insert_material')
    console.log('✅ 删除旧的插入触发器')
    
    // 创建新的插入触发器
    const insertTrigger = `
    CREATE TRIGGER tr_purchase_insert_material
    AFTER INSERT ON purchases
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'ACTIVE' THEN
        INSERT INTO materials (
          id,
          material_code, 
          material_name, 
          material_type, 
          quality,
          bead_diameter, 
          bracelet_inner_diameter,
          bracelet_bead_count,
          accessory_specification, 
          finished_material_specification,
          original_quantity, 
          inventory_unit, 
          unit_cost, 
          total_cost,
          min_stock_alert, 
          purchase_id, 
          supplier_id, 
          photos, 
          material_date, 
          notes, 
          created_by,
          created_at,
          updated_at
        ) VALUES (
          CONCAT('mat_', SUBSTRING(UUID(), 1, 8), '_', UNIX_TIMESTAMP()),
          NEW.purchase_code,
          NEW.purchase_name,
          NEW.purchase_type,
          COALESCE(NEW.quality, 'UNKNOWN'),
          NEW.bead_diameter,
          CASE 
            WHEN NEW.purchase_type = 'BRACELET' THEN NEW.specification
            ELSE NULL
          END,
          NEW.beads_per_string,
          CASE 
            WHEN NEW.purchase_type = 'ACCESSORIES' THEN CAST(NEW.specification AS CHAR)
            ELSE NULL
          END,
          CASE 
            WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN CAST(NEW.specification AS CHAR)
            ELSE NULL
          END,
          
          -- 修复后的数量计算逻辑，确保至少为1
          GREATEST(
            CASE 
              WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
                COALESCE(NEW.piece_count, 
                  CASE 
                    WHEN COALESCE(NEW.weight, 0) > 0 THEN
                      CASE 
                        WHEN NEW.bead_diameter = 4.0 THEN FLOOR(NEW.weight * 25)
                        WHEN NEW.bead_diameter = 6.0 THEN FLOOR(NEW.weight * 11)
                        WHEN NEW.bead_diameter = 8.0 THEN FLOOR(NEW.weight * 6)
                        WHEN NEW.bead_diameter = 10.0 THEN FLOOR(NEW.weight * 4)
                        WHEN NEW.bead_diameter = 12.0 THEN FLOOR(NEW.weight * 3)
                        ELSE FLOOR(NEW.weight * 5)
                      END
                    ELSE 1
                  END
                )
              WHEN NEW.purchase_type = 'BRACELET' THEN 
                COALESCE(NEW.total_beads, NEW.piece_count, 1)
              ELSE COALESCE(NEW.piece_count, 1)
            END,
            1
          ),
          
          -- 库存单位
          CASE 
            WHEN NEW.purchase_type IN ('LOOSE_BEADS', 'BRACELET') THEN 'PIECES'
            WHEN NEW.purchase_type = 'ACCESSORIES' THEN 'SLICES'
            WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN 'ITEMS'
            ELSE 'PIECES'
          END,
          
          -- 单位成本计算
          COALESCE(NEW.total_price, 0) / GREATEST(
            CASE 
              WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
                COALESCE(NEW.piece_count, 
                  CASE 
                    WHEN COALESCE(NEW.weight, 0) > 0 THEN
                      CASE 
                        WHEN NEW.bead_diameter = 4.0 THEN FLOOR(NEW.weight * 25)
                        WHEN NEW.bead_diameter = 6.0 THEN FLOOR(NEW.weight * 11)
                        WHEN NEW.bead_diameter = 8.0 THEN FLOOR(NEW.weight * 6)
                        WHEN NEW.bead_diameter = 10.0 THEN FLOOR(NEW.weight * 4)
                        WHEN NEW.bead_diameter = 12.0 THEN FLOOR(NEW.weight * 3)
                        ELSE FLOOR(NEW.weight * 5)
                      END
                    ELSE 1
                  END
                )
              WHEN NEW.purchase_type = 'BRACELET' THEN 
                COALESCE(NEW.total_beads, NEW.piece_count, 1)
              ELSE COALESCE(NEW.piece_count, 1)
            END,
            1
          ),
          
          COALESCE(NEW.total_price, 0),
          NEW.min_stock_alert,
          NEW.id,
          NEW.supplier_id,
          COALESCE(NEW.photos, '[]'),
          DATE(NEW.purchase_date),
          NEW.notes,
          NEW.user_id,
          NEW.created_at,
          NEW.updated_at
        );
      END IF;
    END`
    
    await connection.query(insertTrigger)
    console.log('✅ 创建新的插入触发器成功')
    
    // 4. 验证修复结果
    console.log('\n🧪 验证修复结果...')
    const [verifyResults] = await connection.query(`
      SELECT COUNT(*) as zero_count FROM materials 
      WHERE original_quantity = 0 AND id IN (
        SELECT m.id FROM materials m
        JOIN purchases p ON m.purchase_id = p.id
        WHERE p.status = 'ACTIVE'
      )
    `)
    
    console.log(`剩余original_quantity为0的记录数: ${verifyResults[0].zero_count}`)
    
    if (verifyResults[0].zero_count === 0) {
      console.log('✅ 所有记录修复完成！')
    } else {
      console.log('⚠️  仍有部分记录需要手动检查')
    }
    
    // 5. 生成修复报告
    console.log('\n📊 生成修复报告...')
    const [reportData] = await connection.query(`
      SELECT 
        m.material_type,
        COUNT(*) as total_count,
        SUM(m.original_quantity) as total_quantity,
        AVG(m.unit_cost) as avg_unit_cost
      FROM materials m
      JOIN purchases p ON m.purchase_id = p.id
      WHERE p.status = 'ACTIVE'
      GROUP BY m.material_type
      ORDER BY total_count DESC
    `)
    
    console.log('\n材料类型统计：')
    reportData.forEach(row => {
      console.log(`${row.material_type}: ${row.total_count}条记录, 总数量: ${row.total_quantity}, 平均单价: ${row.avg_unit_cost?.toFixed(2) || 0}`)
    })
    
  } catch (error) {
    console.error('❌ 修复过程中出错：', error)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

fix_trigger_and_sync()