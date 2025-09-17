import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('开始修复purchases表触发器...');
    
    // 1. 删除现有的触发器
    try {
      await connection.execute('DROP TRIGGER IF EXISTS tr_purchase_insert_material');
      await connection.execute('DROP TRIGGER IF EXISTS tr_purchase_update_material');
      console.log('✅ 删除了旧的purchases触发器');
    } catch (e) {
      console.log('旧触发器不存在，跳过删除');
    }
    
    // 2. 创建新的INSERT触发器，确保remaining_quantity正确设置
    const insertTriggerSQL = `
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
            -- 原始数量计算
            GREATEST(
              CASE
                WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN
                  COALESCE(NEW.piece_count, 1)
                WHEN NEW.purchase_type = 'BRACELET' THEN
                  COALESCE(NEW.total_beads, NEW.piece_count, 1)
                ELSE COALESCE(NEW.piece_count, 1)
              END,
              1
            ),
            -- 已使用数量，默认为0
            0,
            -- 剩余数量，等于原始数量
            GREATEST(
              CASE
                WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN
                  COALESCE(NEW.piece_count, 1)
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
                  COALESCE(NEW.piece_count, 1)
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
      END
    `;
    
    await connection.execute(insertTriggerSQL);
    console.log('✅ 创建了新的INSERT触发器');
    
    // 3. 创建UPDATE触发器
    const updateTriggerSQL = `
      CREATE TRIGGER tr_purchase_update_material
      AFTER UPDATE ON purchases
      FOR EACH ROW
      BEGIN
        IF NEW.status = 'ACTIVE' AND OLD.status != 'ACTIVE' THEN
          -- 如果状态从非ACTIVE变为ACTIVE，创建material记录
          INSERT INTO materials (
            id, material_code, material_name, material_type, quality,
            original_quantity, used_quantity, remaining_quantity,
            inventory_unit, unit_cost, total_cost,
            purchase_id, supplier_id, created_by, created_at, updated_at
          ) VALUES (
            CONCAT('mat_', SUBSTRING(UUID(), 1, 8), '_', UNIX_TIMESTAMP()),
            NEW.purchase_code, NEW.purchase_name, NEW.purchase_type,
            COALESCE(NEW.quality, 'UNKNOWN'),
            GREATEST(COALESCE(NEW.piece_count, 1), 1),
            0,
            GREATEST(COALESCE(NEW.piece_count, 1), 1),
            'PIECES',
            COALESCE(NEW.total_price, 0) / GREATEST(COALESCE(NEW.piece_count, 1), 1),
            COALESCE(NEW.total_price, 0),
            NEW.id, NEW.supplier_id, NEW.user_id, NEW.updated_at, NEW.updated_at
          );
        ELSEIF NEW.status != 'ACTIVE' AND OLD.status = 'ACTIVE' THEN
          -- 如果状态从ACTIVE变为非ACTIVE，删除material记录
          DELETE FROM materials WHERE purchase_id = NEW.id;
        END IF;
      END
    `;
    
    await connection.execute(updateTriggerSQL);
    console.log('✅ 创建了新的UPDATE触发器');
    
    console.log('\n✅ 触发器修复完成！');
    
    await connection.end();
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('详细错误:', error);
  }
})();