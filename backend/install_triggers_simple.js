import mysql from 'mysql2/promise';

async function installTriggers() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    });
    
    console.log('🔧 开始安装触发器...');
    
    // 1. 删除现有触发器
    console.log('1. 删除现有触发器...');
    try {
      await connection.query('DROP TRIGGER IF EXISTS tr_purchase_insert_material');
      await connection.query('DROP TRIGGER IF EXISTS tr_purchase_update_material');
      console.log('✅ 现有触发器已删除');
    } catch (error) {
      console.log('⚠️ 删除触发器时出现警告:', error.message);
    }
    
    // 2. 创建INSERT触发器（简化版本）
    console.log('2. 创建INSERT触发器...');
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
            CASE 
              WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN COALESCE(NEW.piece_count, 1)
              WHEN NEW.purchase_type = 'BRACELET' THEN COALESCE(NEW.total_beads, NEW.piece_count, 1)
              ELSE COALESCE(NEW.piece_count, 1)
            END,
            0,
            CASE 
              WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN COALESCE(NEW.piece_count, 1)
              WHEN NEW.purchase_type = 'BRACELET' THEN COALESCE(NEW.total_beads, NEW.piece_count, 1)
              ELSE COALESCE(NEW.piece_count, 1)
            END,
            CASE 
              WHEN NEW.purchase_type IN ('LOOSE_BEADS', 'BRACELET') THEN 'PIECES'
              WHEN NEW.purchase_type = 'ACCESSORIES' THEN 'SLICES'
              ELSE 'ITEMS'
            END,
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
    `;
    
    await connection.query(insertTrigger);
    console.log('✅ INSERT触发器创建成功');
    
    // 3. 创建material_usage更新触发器
    console.log('3. 创建material_usage更新触发器...');
    
    // 删除现有的material_usage触发器
    try {
      await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock');
      await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update');
      await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete');
    } catch (error) {
      console.log('⚠️ 删除material_usage触发器时出现警告:', error.message);
    }
    
    // 创建material_usage INSERT触发器
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
    `;
    
    await connection.query(materialUsageInsertTrigger);
    console.log('✅ material_usage INSERT触发器创建成功');
    
    // 创建material_usage UPDATE触发器
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
    `;
    
    await connection.query(materialUsageUpdateTrigger);
    console.log('✅ material_usage UPDATE触发器创建成功');
    
    // 创建material_usage DELETE触发器
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
    `;
    
    await connection.query(materialUsageDeleteTrigger);
    console.log('✅ material_usage DELETE触发器创建成功');
    
    console.log('\n🎉 所有触发器安装完成！');
    
    // 4. 验证触发器
    console.log('\n🔍 验证触发器安装情况...');
    const [triggers] = await connection.query('SHOW TRIGGERS LIKE \'tr_%\'');
    console.log('已安装的触发器:');
    triggers.forEach(t => {
      console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
    });
    
    // 5. 修复现有的CG20250917120816记录
    console.log('\n🔧 修复CG20250917120816的remaining_quantity...');
    await connection.query(`
      UPDATE materials 
      SET remaining_quantity = original_quantity - used_quantity
      WHERE material_code = 'CG20250917120816'
    `);
    
    // 验证修复结果
    const [fixedMaterial] = await connection.query(
      'SELECT original_quantity, used_quantity, remaining_quantity FROM materials WHERE material_code = ?',
      ['CG20250917120816']
    );
    
    if (fixedMaterial.length > 0) {
      const material = fixedMaterial[0];
      console.log('修复后的数据:');
      console.log(`- Original: ${material.original_quantity}`);
      console.log(`- Used: ${material.used_quantity}`);
      console.log(`- Remaining: ${material.remaining_quantity}`);
      
      if (material.remaining_quantity === material.original_quantity) {
        console.log('✅ remaining_quantity修复成功！');
      } else {
        console.log('❌ remaining_quantity仍然不正确');
      }
    }
    
  } catch (error) {
    console.error('❌ 安装触发器时发生错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

installTriggers();