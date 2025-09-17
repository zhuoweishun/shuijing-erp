import mysql from 'mysql2/promise'

async function installFixedTriggers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    })

    console.log('🔧 安装修复后的触发器...')
    
    // 1. 删除现有触发器
    console.log('1. 删除现有触发器...')
    try {
      await connection.query('DROP TRIGGER IF EXISTS tr_purchase_insert_material')
      await connection.query('DROP TRIGGER IF EXISTS tr_purchase_update_material')
      await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock')
      await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update')
      await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete')
      console.log('✅ 现有触发器已删除')
    } catch (error) {
      console.log('⚠️ 删除触发器时出现警告:', error.message)
    }
    
    // 2. 创建修复后的INSERT触发器（包含remaining_quantity设置）
    console.log('2. 创建修复后的INSERT触发器...')
    const insertTrigger = `
      CREATE TRIGGER tr_purchase_insert_material
      AFTER INSERT ON purchases
      FOR EACH ROW
      BEGIN
        IF NEW.status = 'ACTIVE' THEN
          INSERT INTO materials (
            id, material_code, material_name, material_type, quality,
            original_quantity, used_quantity, remaining_quantity,
            inventory_unit, unit_cost, total_cost,
            purchase_id, supplier_id, created_by, created_at, updated_at
          ) VALUES (
            CONCAT('mat_', SUBSTRING(UUID(), 1, 8), '_', UNIX_TIMESTAMP()),
            NEW.purchase_code,
            NEW.purchase_name,
            NEW.purchase_type,
            COALESCE(NEW.quality, 'UNKNOWN'),
            
            -- original_quantity计算
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
            
            -- used_quantity初始值为0
            0,
            
            -- remaining_quantity = original_quantity - used_quantity (初始时等于original_quantity)
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
            
            -- inventory_unit
            CASE 
              WHEN NEW.purchase_type IN ('LOOSE_BEADS', 'BRACELET') THEN 'PIECES'
              WHEN NEW.purchase_type = 'ACCESSORIES' THEN 'SLICES'
              WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN 'ITEMS'
              ELSE 'PIECES'
            END,
            
            -- unit_cost计算
            COALESCE(NEW.total_price, 0) / GREATEST(
              CASE 
                WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN COALESCE(NEW.piece_count, 1)
                WHEN NEW.purchase_type = 'BRACELET' THEN COALESCE(NEW.total_beads, NEW.piece_count, 1)
                ELSE COALESCE(NEW.piece_count, 1)
              END,
              1
            ),
            
            COALESCE(NEW.total_price, 0),
            NEW.id,
            NEW.supplier_id,
            NEW.user_id,
            NEW.created_at,
            NEW.updated_at
          );
        END IF;
      END
    `
    
    await connection.query(insertTrigger)
    console.log('✅ 修复后的INSERT触发器创建成功')
    
    // 3. 创建material_usage更新触发器
    console.log('3. 创建material_usage更新触发器...')
    
    const materialUsageInsertTrigger = `
      CREATE TRIGGER tr_material_usage_update_stock
      AFTER INSERT ON material_usage
      FOR EACH ROW
      BEGIN
        UPDATE materials SET
          used_quantity = (
            SELECT COALESCE(SUM(quantity_used), 0)
            FROM material_usage
            WHERE material_id = NEW.material_id
          ),
          remaining_quantity = original_quantity - (
            SELECT COALESCE(SUM(quantity_used), 0)
            FROM material_usage
            WHERE material_id = NEW.material_id
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.material_id;
      END
    `
    
    await connection.query(materialUsageInsertTrigger)
    console.log('✅ material_usage INSERT触发器创建成功')
    
    const materialUsageUpdateTrigger = `
      CREATE TRIGGER tr_material_usage_update_stock_after_update
      AFTER UPDATE ON material_usage
      FOR EACH ROW
      BEGIN
        UPDATE materials SET
          used_quantity = (
            SELECT COALESCE(SUM(quantity_used), 0)
            FROM material_usage
            WHERE material_id = NEW.material_id
          ),
          remaining_quantity = original_quantity - (
            SELECT COALESCE(SUM(quantity_used), 0)
            FROM material_usage
            WHERE material_id = NEW.material_id
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.material_id;
      END
    `
    
    await connection.query(materialUsageUpdateTrigger)
    console.log('✅ material_usage UPDATE触发器创建成功')
    
    const materialUsageDeleteTrigger = `
      CREATE TRIGGER tr_material_usage_update_stock_after_delete
      AFTER DELETE ON material_usage
      FOR EACH ROW
      BEGIN
        UPDATE materials SET
          used_quantity = (
            SELECT COALESCE(SUM(quantity_used), 0)
            FROM material_usage
            WHERE material_id = OLD.material_id
          ),
          remaining_quantity = original_quantity - (
            SELECT COALESCE(SUM(quantity_used), 0)
            FROM material_usage
            WHERE material_id = OLD.material_id
          ),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.material_id;
      END
    `
    
    await connection.query(materialUsageDeleteTrigger)
    console.log('✅ material_usage DELETE触发器创建成功')
    
    // 4. 验证触发器
    console.log('\n🔍 验证触发器安装情况...')
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
      ORDER BY TRIGGER_NAME
    `)
    
    console.log('已安装的触发器:')
    triggers.forEach(trigger => {
      console.log(`- ${trigger.TRIGGER_NAME}: ${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION} ON ${trigger.EVENT_OBJECT_TABLE}`)
    })
    
    // 5. 修复CG20250917120816记录
    console.log('\n🔧 修复CG20250917120816的remaining_quantity...')
    
    // 首先检查当前数据
    const [beforeFix] = await connection.query(
      'SELECT original_quantity, used_quantity, remaining_quantity FROM materials WHERE material_code = ?',
      ['CG20250917120816']
    )
    
    if (beforeFix.length > 0) {
      const before = beforeFix[0]
      console.log('修复前的数据:')
      console.log(`- Original: ${before.original_quantity}`)
      console.log(`- Used: ${before.used_quantity}`)
      console.log(`- Remaining: ${before.remaining_quantity}`)
      
      // 修复remaining_quantity
      await connection.query(`
        UPDATE materials 
        SET remaining_quantity = original_quantity - used_quantity
        WHERE material_code = 'CG20250917120816'
      `)
      
      // 验证修复结果
      const [afterFix] = await connection.query(
        'SELECT original_quantity, used_quantity, remaining_quantity FROM materials WHERE material_code = ?',
        ['CG20250917120816']
      )
      
      if (afterFix.length > 0) {
        const after = afterFix[0]
        console.log('\n修复后的数据:')
        console.log(`- Original: ${after.original_quantity}`)
        console.log(`- Used: ${after.used_quantity}`)
        console.log(`- Remaining: ${after.remaining_quantity}`)
        
        if (after.remaining_quantity === after.original_quantity - after.used_quantity) {
          console.log('\n✅ CG20250917120816记录已成功修复！')
        } else {
          console.log('\n❌ 修复失败，数据仍然不一致')
        }
      }
    } else {
      console.log('\n❌ 未找到CG20250917120816记录')
    }

    await connection.end()
    console.log('\n🎉 修复后的触发器安装和数据修正完成！')
    
  } catch (error) {
    console.error('❌ 安装触发器时发生错误:', error)
  }
}

installFixedTriggers()