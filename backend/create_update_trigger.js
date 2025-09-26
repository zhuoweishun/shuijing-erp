import mysql from 'mysql2/promise';

async function createUpdateTrigger() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🔧 创建UPDATE触发器...');
    
    // 删除现有的UPDATE触发器
    try {
      await connection.query('DROP TRIGGER IF EXISTS tr_purchase_update_material');
      console.log('✅ 删除旧的UPDATE触发器');
    } catch (error) {
      console.log('⚠️ 删除触发器警告:', error.message);
    }
    
    // 创建新的UPDATE触发器，包含photos字段同步
    const updateTriggerSQL = `
      CREATE TRIGGER tr_purchase_update_material
      AFTER UPDATE ON purchases
      FOR EACH ROW
      BEGIN
        IF NEW.status = 'ACTIVE' AND OLD.status = 'ACTIVE' THEN
          -- 计算新的数量
          SET @new_original_quantity = CASE 
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
          END;
          
          -- 计算新的单位成本
          SET @new_unit_cost = CASE 
            WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
              COALESCE(NEW.total_price, 0) / GREATEST(@new_original_quantity, 1)
            WHEN NEW.purchase_type = 'BRACELET' THEN 
              COALESCE(NEW.total_price, 0) / GREATEST(@new_original_quantity, 1)
            ELSE COALESCE(NEW.total_price, 0) / GREATEST(COALESCE(NEW.piece_count, 1), 1)
          END;
          
          UPDATE materials SET
            material_code = NEW.purchase_code,
            material_name = NEW.purchase_name,
            material_type = NEW.purchase_type,
            quality = COALESCE(NEW.quality, 'UNKNOWN'),
            bead_diameter = NEW.bead_diameter,
            bracelet_inner_diameter = CASE 
              WHEN NEW.purchase_type = 'BRACELET' THEN NEW.specification
              ELSE bracelet_inner_diameter
            END,
            bracelet_bead_count = NEW.beads_per_string,
            accessory_specification = CASE 
              WHEN NEW.purchase_type = 'ACCESSORIES' THEN CAST(NEW.specification AS CHAR)
              ELSE accessory_specification
            END,
            finished_material_specification = CASE 
              WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN CAST(NEW.specification AS CHAR)
              ELSE finished_material_specification
            END,
            original_quantity = @new_original_quantity,
            unit_cost = @new_unit_cost,
            total_cost = COALESCE(NEW.total_price, 0),
            remaining_quantity = @new_original_quantity - used_quantity,
            min_stock_alert = NEW.min_stock_alert,
            supplier_id = NEW.supplier_id,
            photos = NEW.photos,
            material_date = DATE(NEW.purchase_date),
            notes = NEW.notes,
            updated_at = NEW.updated_at
          WHERE purchase_id = NEW.id;
          
        ELSEIF NEW.status = 'USED' AND OLD.status = 'ACTIVE' THEN
          UPDATE materials SET
            notes = CONCAT(COALESCE(notes, ''), '\\n[采购记录已标记为USED]'),
            updated_at = NEW.updated_at
          WHERE purchase_id = NEW.id;
        END IF;
      END
    `;
    
    await connection.query(updateTriggerSQL);
    console.log('✅ UPDATE触发器创建成功');
    
    console.log('\n🔍 验证触发器安装...');
    const [triggers] = await connection.query(
      "SHOW TRIGGERS WHERE `Table` = 'purchases'"
    );
    
    console.log('当前purchase相关触发器:');
    triggers.forEach(t => {
      console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
    });
    
    if (triggers.length >= 2) {
      console.log('\n✅ 触发器安装完成！包含以下功能:');
      console.log('  - INSERT触发器：新建采购记录时自动创建原材料记录');
      console.log('  - UPDATE触发器：更新采购记录时同步更新原材料记录');
      console.log('  - 📸 photos字段会自动同步到material表');
      console.log('\n🎯 现在您可以测试采购记录录入，图片应该会正确同步到原材料库存！');
    } else {
      console.log('❌ 触发器安装仍不完整');
    }
    
  } catch (error) {
    console.error('❌ 创建触发器失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createUpdateTrigger();