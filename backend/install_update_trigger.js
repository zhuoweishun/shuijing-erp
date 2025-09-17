import mysql from 'mysql2/promise'

async function installUpdateTrigger() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  })

  try {
    console.log('🔧 安装purchase UPDATE触发器...')
    
    // 1. 删除现有的UPDATE触发器（如果存在）
    console.log('\n🗑️ 删除现有UPDATE触发器...')
    await connection.query('DROP TRIGGER IF EXISTS tr_purchase_update_material')
    console.log('✅ 现有UPDATE触发器已删除')
    
    // 2. 创建UPDATE触发器
    console.log('\n🔨 创建UPDATE触发器...')
    const updateTriggerSQL = `
      CREATE TRIGGER tr_purchase_update_material
      AFTER UPDATE ON purchases
      FOR EACH ROW
      BEGIN
        IF NEW.status = 'ACTIVE' AND OLD.status = 'ACTIVE' THEN
          UPDATE materials SET
            material_name = NEW.purchase_name,
            quality = COALESCE(NEW.quality, 'UNKNOWN'),
            bead_diameter = NEW.bead_diameter,
            min_stock_alert = NEW.min_stock_alert,
            photos = NEW.photos,
            notes = NEW.notes,
            updated_at = NEW.updated_at,
            
            -- 更新数量相关字段
            original_quantity = CASE 
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
                    ELSE 0
                  END
                )
              WHEN NEW.purchase_type = 'BRACELET' THEN 
                COALESCE(NEW.total_beads, NEW.piece_count,
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
              WHEN NEW.purchase_type = 'ACCESSORIES' THEN COALESCE(NEW.piece_count, 1)
              WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(NEW.piece_count, 1)
              ELSE COALESCE(NEW.piece_count, NEW.quantity, 1)
            END,
            
            -- 重新计算remaining_quantity
            remaining_quantity = (
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
                      ELSE 0
                    END
                  )
                WHEN NEW.purchase_type = 'BRACELET' THEN 
                  COALESCE(NEW.total_beads, NEW.piece_count,
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
                WHEN NEW.purchase_type = 'ACCESSORIES' THEN COALESCE(NEW.piece_count, 1)
                WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(NEW.piece_count, 1)
                ELSE COALESCE(NEW.piece_count, NEW.quantity, 1)
              END
            ) - used_quantity,
            
            -- 更新成本相关字段
            unit_cost = CASE 
              WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
                COALESCE(NEW.total_price, 0) / GREATEST(
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
                  ),
                  1
                )
              WHEN NEW.purchase_type = 'BRACELET' THEN 
                COALESCE(NEW.total_price, 0) / GREATEST(
                  COALESCE(NEW.total_beads, NEW.piece_count,
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
                  ),
                  1
                )
              ELSE COALESCE(NEW.total_price, 0) / GREATEST(COALESCE(NEW.piece_count, 1), 1)
            END,
            
            total_cost = COALESCE(NEW.total_price, 0)
            
          WHERE purchase_id = NEW.id;
        ELSEIF NEW.status = 'USED' AND OLD.status = 'ACTIVE' THEN
          -- purchase状态变为USED时，不删除material记录，保持库存数据完整性
          UPDATE materials SET
            notes = CONCAT(COALESCE(notes, ''), '\n[采购记录已标记为USED]'),
            updated_at = NEW.updated_at
          WHERE purchase_id = NEW.id;
        END IF;
      END
    `
    
    await connection.query(updateTriggerSQL)
    console.log('✅ UPDATE触发器创建成功')
    
    // 3. 验证触发器是否创建成功
    console.log('\n🔍 验证触发器安装状态...')
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev' 
      AND TRIGGER_NAME = 'tr_purchase_update_material'
    `)
    
    if (triggers.length > 0) {
      console.log('✅ UPDATE触发器验证成功')
      console.log('触发器名称:', triggers[0].TRIGGER_NAME)
      console.log('触发时机:', triggers[0].ACTION_TIMING)
      console.log('触发事件:', triggers[0].EVENT_MANIPULATION)
      console.log('目标表:', triggers[0].EVENT_OBJECT_TABLE)
    } else {
      console.log('❌ UPDATE触发器验证失败')
    }
    
    // 4. 测试触发器功能
    console.log('\n🧪 测试UPDATE触发器功能...')
    
    // 先获取当前的material数据
    const [beforeUpdate] = await connection.query(`
      SELECT m.original_quantity, m.total_cost, m.updated_at
      FROM materials m
      JOIN purchases p ON m.purchase_id = p.id
      WHERE p.purchase_code = 'CG20250917120816'
    `)
    
    if (beforeUpdate.length > 0) {
      console.log('更新前数量:', beforeUpdate[0].original_quantity)
      console.log('更新前总价:', beforeUpdate[0].total_cost)
      
      // 执行一个小的更新来测试触发器
      await connection.query(`
        UPDATE purchases 
        SET notes = CONCAT(COALESCE(notes, ''), ' [触发器测试]')
        WHERE purchase_code = 'CG20250917120816'
      `)
      
      // 检查material是否被更新
      const [afterUpdate] = await connection.query(`
        SELECT m.original_quantity, m.total_cost, m.updated_at
        FROM materials m
        JOIN purchases p ON m.purchase_id = p.id
        WHERE p.purchase_code = 'CG20250917120816'
      `)
      
      if (afterUpdate.length > 0) {
        console.log('更新后数量:', afterUpdate[0].original_quantity)
        console.log('更新后总价:', afterUpdate[0].total_cost)
        
        if (afterUpdate[0].updated_at > beforeUpdate[0].updated_at) {
          console.log('✅ UPDATE触发器工作正常！')
        } else {
          console.log('⚠️ UPDATE触发器可能没有正常工作')
        }
      }
    }
    
    console.log('\n✅ UPDATE触发器安装完成！')
    console.log('现在purchase表的修改将自动同步到material表')
    
  } catch (error) {
    console.error('❌ 安装UPDATE触发器时发生错误:', error)
  } finally {
    await connection.end()
  }
}

installUpdateTrigger()