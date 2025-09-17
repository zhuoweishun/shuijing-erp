-- 修复后的purchase到material数据同步触发器
-- 修复问题：对于LOOSE_BEADS类型，优先使用piece_count，只有在piece_count为空时才使用weight计算

DELIMITER //

-- 删除现有触发器
DROP TRIGGER IF EXISTS tr_purchase_insert_material//
DROP TRIGGER IF EXISTS tr_purchase_update_material//
DROP TRIGGER IF EXISTS tr_material_usage_update_stock//
DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update//
DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete//

-- 采购记录创建时自动创建material记录（修复版本）
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
      
      -- 修复后的数量计算逻辑
      CASE 
        WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN 
          -- 优先使用piece_count，如果为空或0才使用weight计算
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
          -- 优先使用total_beads，然后piece_count，最后才是weight计算
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
      
      -- 修复后的单位成本计算
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

-- 采购记录更新时同步更新material记录
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
      
      -- 同时更新original_quantity以防数量字段发生变化
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
      ) - used_quantity
      
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

-- 修复说明
-- 主要修复内容：
-- 1. 对于LOOSE_BEADS类型，优先使用piece_count字段，只有在piece_count为空或0时才使用weight计算
-- 2. 对于BRACELET类型，优先使用total_beads，然后piece_count，最后才是weight计算
-- 3. 在UPDATE触发器中也同步更新original_quantity和remaining_quantity
-- 4. 确保所有计算都有合理的默认值，避免出现0数量的情况