-- 删除可能存在的触发器
DROP TRIGGER IF EXISTS tr_materials_update_remaining_quantity;
DROP TRIGGER IF EXISTS tr_materials_update_remaining_quantity_update;

-- 创建INSERT触发器
DELIMITER //
CREATE TRIGGER tr_materials_update_remaining_quantity
BEFORE INSERT ON materials
FOR EACH ROW
BEGIN
  SET NEW.remaining_quantity = NEW.original_quantity - COALESCE(NEW.used_quantity, 0);
END//
DELIMITER ;

-- 创建UPDATE触发器
DELIMITER //
CREATE TRIGGER tr_materials_update_remaining_quantity_update
BEFORE UPDATE ON materials
FOR EACH ROW
BEGIN
  SET NEW.remaining_quantity = NEW.original_quantity - COALESCE(NEW.used_quantity, 0);
END//
DELIMITER ;