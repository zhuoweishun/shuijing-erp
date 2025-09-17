import mysql from 'mysql2/promise'

async function recreate_triggers() {
  let connection
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔧 重新创建触发器...')
    
    // 先删除现有触发器
    console.log('🗑️ 删除现有触发器...')
    const drop_triggers = [
      'DROP TRIGGER IF EXISTS tr_purchase_insert_material',
      'DROP TRIGGER IF EXISTS tr_purchase_update_material', 
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete'
    ]
    
    for (const sql of drop_triggers) {
      await connection.query(sql)
    }
    
    console.log('✅ 现有触发器已删除')
    
    // 创建新触发器
    console.log('📄 创建新触发器...')
    
    // 触发器1: 采购记录创建时自动创建material记录
    const trigger1 = `
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
          used_quantity,
          remaining_quantity,
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
          
          -- 转换后的数量计算
          CASE 
            WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
              CASE 
                WHEN NEW.bead_diameter = 4.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 25)
                WHEN NEW.bead_diameter = 6.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 11)
                WHEN NEW.bead_diameter = 8.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 6)
                WHEN NEW.bead_diameter = 10.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 4)
                WHEN NEW.bead_diameter = 12.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 3)
                ELSE FLOOR(COALESCE(NEW.weight, 0) * 5)
              END
            WHEN NEW.purchase_type = 'BRACELET' THEN 
              COALESCE(NEW.total_beads, 
                CASE 
                  WHEN NEW.bead_diameter = 4.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 25)
                  WHEN NEW.bead_diameter = 6.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 11)
                  WHEN NEW.bead_diameter = 8.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 6)
                  WHEN NEW.bead_diameter = 10.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 4)
                  WHEN NEW.bead_diameter = 12.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 3)
                  ELSE FLOOR(COALESCE(NEW.weight, 0) * 5)
                END,
                1
              )
            WHEN NEW.purchase_type = 'ACCESSORIES' THEN COALESCE(NEW.piece_count, 1)
            WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(NEW.piece_count, 1)
            ELSE 1
          END,
          
          -- 初始used_quantity为0
          0,
          
          -- remaining_quantity = original_quantity - used_quantity
          CASE 
            WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
              CASE 
                WHEN NEW.bead_diameter = 4.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 25)
                WHEN NEW.bead_diameter = 6.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 11)
                WHEN NEW.bead_diameter = 8.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 6)
                WHEN NEW.bead_diameter = 10.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 4)
                WHEN NEW.bead_diameter = 12.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 3)
                ELSE FLOOR(COALESCE(NEW.weight, 0) * 5)
              END
            WHEN NEW.purchase_type = 'BRACELET' THEN 
              COALESCE(NEW.total_beads, 
                CASE 
                  WHEN NEW.bead_diameter = 4.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 25)
                  WHEN NEW.bead_diameter = 6.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 11)
                  WHEN NEW.bead_diameter = 8.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 6)
                  WHEN NEW.bead_diameter = 10.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 4)
                  WHEN NEW.bead_diameter = 12.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 3)
                  ELSE FLOOR(COALESCE(NEW.weight, 0) * 5)
                END,
                1
              )
            WHEN NEW.purchase_type = 'ACCESSORIES' THEN COALESCE(NEW.piece_count, 1)
            WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN COALESCE(NEW.piece_count, 1)
            ELSE 1
          END,
          
          -- 库存单位
          CASE 
            WHEN NEW.purchase_type IN ('LOOSE_BEADS', 'BRACELET') THEN 'PIECES'
            WHEN NEW.purchase_type = 'ACCESSORIES' THEN 'SLICES'
            WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN 'ITEMS'
            ELSE 'PIECES'
          END,
          
          -- 单位成本计算
          CASE 
            WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
              COALESCE(NEW.total_price, 0) / GREATEST(
                CASE 
                  WHEN NEW.bead_diameter = 4.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 25)
                  WHEN NEW.bead_diameter = 6.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 11)
                  WHEN NEW.bead_diameter = 8.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 6)
                  WHEN NEW.bead_diameter = 10.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 4)
                  WHEN NEW.bead_diameter = 12.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 3)
                  ELSE FLOOR(COALESCE(NEW.weight, 0) * 5)
                END,
                1
              )
            WHEN NEW.purchase_type = 'BRACELET' THEN 
              COALESCE(NEW.total_price, 0) / GREATEST(
                COALESCE(NEW.total_beads, 
                  CASE 
                    WHEN NEW.bead_diameter = 4.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 25)
                    WHEN NEW.bead_diameter = 6.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 11)
                    WHEN NEW.bead_diameter = 8.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 6)
                    WHEN NEW.bead_diameter = 10.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 4)
                    WHEN NEW.bead_diameter = 12.0 THEN FLOOR(COALESCE(NEW.weight, 0) * 3)
                    ELSE FLOOR(COALESCE(NEW.weight, 0) * 5)
                  END,
                  1
                ),
                1
              )
            ELSE COALESCE(NEW.total_price, 0) / GREATEST(COALESCE(NEW.piece_count, 1), 1)
          END,
          
          COALESCE(NEW.total_price, 0),
          NEW.min_stock_alert,
          NEW.id,
          NEW.supplier_id,
          NEW.photos,
          DATE(NEW.purchase_date),
          NEW.notes,
          NEW.user_id,
          NEW.created_at,
          NEW.updated_at
        );
      END IF;
    END`
    
    await connection.query(trigger1)
    console.log('✅ 触发器1创建成功: tr_purchase_insert_material')
    
    // 触发器2: 采购记录更新时同步更新material记录
    const trigger2 = `
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
          updated_at = NEW.updated_at
        WHERE purchase_id = NEW.id;
      ELSEIF NEW.status = 'USED' AND OLD.status = 'ACTIVE' THEN
        UPDATE materials SET
          notes = CONCAT(COALESCE(notes, ''), '\n[采购记录已标记为USED]'),
          updated_at = NEW.updated_at
        WHERE purchase_id = NEW.id;
      END IF;
    END`
    
    await connection.query(trigger2)
    console.log('✅ 触发器2创建成功: tr_purchase_update_material')
    
    // 触发器3: material使用量更新触发器 - INSERT
    const trigger3 = `
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
    END`
    
    await connection.query(trigger3)
    console.log('✅ 触发器3创建成功: tr_material_usage_update_stock')
    
    // 触发器4: material使用量更新触发器 - UPDATE
    const trigger4 = `
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
    END`
    
    await connection.query(trigger4)
    console.log('✅ 触发器4创建成功: tr_material_usage_update_stock_after_update')
    
    // 触发器5: material使用量更新触发器 - DELETE
    const trigger5 = `
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
    END`
    
    await connection.query(trigger5)
    console.log('✅ 触发器5创建成功: tr_material_usage_update_stock_after_delete')
    
    // 创建索引
    console.log('📊 创建索引...')
    try {
      await connection.query('CREATE INDEX idx_materials_purchase_id ON materials(purchase_id)')
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error
      }
      console.log('索引 idx_materials_purchase_id 已存在')
    }
    
    try {
      await connection.query('CREATE INDEX idx_material_usage_material_id ON material_usage(material_id)')
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error
      }
      console.log('索引 idx_material_usage_material_id 已存在')
    }
    console.log('✅ 索引创建完成')
    
    // 验证触发器是否存在
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE 
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'crystal_erp_dev'
      ORDER BY TRIGGER_NAME
    `)
    
    console.log('\n📋 当前数据库中的触发器:')
    triggers.forEach(trigger => {
      console.log(`- ${trigger.TRIGGER_NAME}: ${trigger.EVENT_MANIPULATION} on ${trigger.EVENT_OBJECT_TABLE}`)
    })
    
    console.log('\n🎉 所有触发器重新创建完成！')
    
  } catch (error) {
    console.error('❌ 重新创建触发器时发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 运行脚本
recreate_triggers().catch(error => {
  console.error('重新创建触发器失败:', error)
  process.exit(1)
})