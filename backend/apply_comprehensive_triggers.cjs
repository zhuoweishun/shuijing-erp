const mysql = require('mysql2/promise');
const fs = require('fs');

async function applyComprehensiveTriggers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'ZWSloveWCC123',
    database: 'crystal_erp_dev'
  });

  try {
    console.log('🔧 开始应用全面的purchase-material同步触发器...');
    
    // 删除现有触发器
    console.log('🗑️ 删除现有触发器...');
    await connection.query('DROP TRIGGER IF EXISTS tr_purchase_insert_material');
    await connection.query('DROP TRIGGER IF EXISTS tr_purchase_update_material');
    await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock');
    await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update');
    await connection.query('DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete');
    
    // 创建INSERT触发器
    console.log('📝 创建INSERT触发器...');
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
    END`;
    
    await connection.query(insertTrigger);
    
    // 创建UPDATE触发器
    console.log('🔄 创建UPDATE触发器...');
    const updateTrigger = `
    CREATE TRIGGER tr_purchase_update_material
    AFTER UPDATE ON purchases
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'ACTIVE' AND OLD.status = 'ACTIVE' THEN
        UPDATE materials SET
          -- 基础信息同步
          material_code = NEW.purchase_code,
          material_name = NEW.purchase_name,
          material_type = NEW.purchase_type,
          quality = COALESCE(NEW.quality, 'UNKNOWN'),
          
          -- 规格信息同步
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
          
          -- 数量和成本信息同步
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
          
          total_cost = COALESCE(NEW.total_price, 0),
          
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
          
          -- 库存管理字段同步
          min_stock_alert = NEW.min_stock_alert,
          
          -- 关联信息同步
          supplier_id = NEW.supplier_id,
          
          -- 附加信息同步
          photos = NEW.photos,
          material_date = DATE(NEW.purchase_date),
          notes = NEW.notes,
          
          -- 更新时间戳
          updated_at = NEW.updated_at
          
        WHERE purchase_id = NEW.id;
        
      ELSEIF NEW.status = 'USED' AND OLD.status = 'ACTIVE' THEN
        -- purchase状态变为USED时，不删除material记录，保持库存数据完整性
        UPDATE materials SET
          notes = CONCAT(COALESCE(notes, ''), '\n[采购记录已标记为USED]'),
          updated_at = NEW.updated_at
        WHERE purchase_id = NEW.id;
      END IF;
    END`;
    
    await connection.query(updateTrigger);
    
    // 创建material_usage相关触发器
    console.log('📊 创建material_usage触发器...');
    
    const usageInsertTrigger = `
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
    END`;
    
    await connection.query(usageInsertTrigger);
    
    const usageUpdateTrigger = `
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
    END`;
    
    await connection.query(usageUpdateTrigger);
    
    const usageDeleteTrigger = `
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
    END`;
    
    await connection.query(usageDeleteTrigger);
    
    // 创建索引（如果不存在）
    console.log('🔍 创建优化索引...');
    try {
      await connection.query('CREATE INDEX idx_materials_purchase_id ON materials(purchase_id)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        console.log('索引idx_materials_purchase_id已存在，跳过创建');
      }
    }
    
    try {
      await connection.query('CREATE INDEX idx_material_usage_material_id ON material_usage(material_id)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        console.log('索引idx_material_usage_material_id已存在，跳过创建');
      }
    }
    
    console.log('✅ 全面触发器应用成功！');
    console.log('📋 触发器功能说明：');
    console.log('- INSERT触发器：创建purchase时自动创建material记录，包含remaining_quantity初始值');
    console.log('- UPDATE触发器：同步所有可修改字段到material表');
    console.log('- 支持字段：purchase_name, quality, bead_diameter, weight, piece_count, total_price, specification, photos, notes, supplier_id, min_stock_alert等');
    console.log('- 支持所有产品类型：LOOSE_BEADS, BRACELET, ACCESSORIES, FINISHED_MATERIAL');
    console.log('- material_usage触发器：自动更新库存数量');
    
  } catch (error) {
    console.error('❌ 触发器应用失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

applyComprehensiveTriggers().catch(console.error);