import mysql from 'mysql2/promise';

async function fixInsertTrigger() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('🔧 修复INSERT触发器，添加photos字段...');
    
    // 删除现有的INSERT触发器
    await connection.query('DROP TRIGGER IF EXISTS tr_purchase_insert_material');
    console.log('✅ 删除旧的INSERT触发器');
    
    // 创建新的INSERT触发器，包含完整字段列表
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
            
            -- 数量计算逻辑
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
            END,
            
            -- 已使用数量（初始为0）
            0,
            
            -- 剩余数量（初始等于原始数量）
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
      END
    `;
    
    await connection.query(insertTriggerSQL);
    console.log('✅ INSERT触发器修复成功');
    
    console.log('\n🔍 验证触发器修复...');
    const [triggers] = await connection.query(
      "SHOW TRIGGERS WHERE `Table` = 'purchases'"
    );
    
    console.log('当前purchase相关触发器:');
    triggers.forEach(t => {
      console.log(`- ${t.Trigger}: ${t.Timing} ${t.Event} ON ${t.Table}`);
    });
    
    console.log('\n✅ INSERT触发器已修复，现在包含photos字段同步！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixInsertTrigger();