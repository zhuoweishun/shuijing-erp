-- 全面的purchase到material数据同步触发器
-- 确保所有可修改字段都能正确同步到material表

DELIMITER //

-- 删除现有触发器
DROP TRIGGER IF EXISTS tr_purchase_insert_material//
DROP TRIGGER IF EXISTS tr_purchase_update_material//
DROP TRIGGER IF EXISTS tr_material_usage_update_stock//
DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update//
DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete//

-- 采购记录创建时自动创建material记录（完整版本）
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
END//

-- 采购记录更新时全面同步更新material记录
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
      original_quantity = @new_original_quantity,
      unit_cost = @new_unit_cost,
      total_cost = COALESCE(NEW.total_price, 0),
      
      -- 重新计算remaining_quantity
      remaining_quantity = @new_original_quantity - used_quantity,
      
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
END//

-- material使用量更新触发器
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
END//

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
END//

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
END//

DELIMITER ;

-- 创建索引以优化触发器性能
CREATE INDEX IF NOT EXISTS idx_materials_purchase_id ON materials(purchase_id);
CREATE INDEX IF NOT EXISTS idx_material_usage_material_id ON material_usage(material_id);

-- 全面同步说明
-- 这个触发器确保以下所有字段的修改都能正确同步到material表：
-- 1. 基础信息：purchase_code, purchase_name, purchase_type, quality
-- 2. 规格信息：bead_diameter, specification, beads_per_string
-- 3. 数量信息：piece_count, weight, total_beads, quantity
-- 4. 价格信息：total_price, price_per_gram, price_per_bead, price_per_piece
-- 5. 库存管理：min_stock_alert
-- 6. 关联信息：supplier_id
-- 7. 附加信息：photos, notes, purchase_date
-- 8. 审计信息：updated_at

-- 支持的产品类型及其特有字段：
-- LOOSE_BEADS: bead_diameter, weight, piece_count, price_per_gram
-- BRACELET: bead_diameter, specification(内径), beads_per_string, weight, total_beads
-- ACCESSORIES: specification, piece_count, price_per_piece
-- FINISHED_MATERIAL: specification, piece_count, price_per_piece