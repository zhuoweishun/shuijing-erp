-- 创建purchase到material数据同步触发器
-- 这些触发器确保当purchase记录创建或更新时，自动同步到materials表

DELIMITER //

-- 采购记录创建时自动创建material记录
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

-- 注释说明
-- 这些触发器实现了以下功能：
-- 1. 当创建新的purchase记录时，自动创建对应的material记录
-- 2. 当更新purchase记录时，同步更新material记录的相关字段
-- 3. 当purchase状态变为USED时，在material记录中添加备注但不删除记录
-- 4. 当material_usage表发生变化时，自动更新materials表的used_quantity字段
-- 5. 通过计算字段自动维护remaining_quantity = original_quantity - used_quantity