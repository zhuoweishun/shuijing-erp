import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTriggers() {
  try {
    // 创建数据库连接
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev',
      multipleStatements: true
    });

    console.log('数据库连接成功');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../sql/material_sync_triggers.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // 先删除可能存在的触发器
    const dropTriggers = [
      'DROP TRIGGER IF EXISTS tr_purchase_insert_material',
      'DROP TRIGGER IF EXISTS tr_purchase_update_material',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete'
    ];

    for (const dropSql of dropTriggers) {
      try {
        await connection.query(dropSql);
        console.log(`✓ 删除触发器: ${dropSql}`);
      } catch (error) {
        console.log(`- 触发器不存在或删除失败: ${dropSql}`);
      }
    }

    // 创建触发器（简化版本）
    const triggers = [
      `CREATE TRIGGER tr_purchase_insert_material
       AFTER INSERT ON purchases
       FOR EACH ROW
       BEGIN
         IF NEW.status = 'ACTIVE' THEN
           INSERT INTO materials (
              id, material_code, material_name, material_type, quality,
              bead_diameter, original_quantity, inventory_unit, unit_cost, total_cost,
              purchase_id, supplier_id, photos, material_date, notes, created_by, created_at, updated_at
            ) VALUES (
              CONCAT('mat_', SUBSTRING(UUID(), 1, 8)),
              NEW.purchase_code, NEW.purchase_name, NEW.purchase_type, COALESCE(NEW.quality, 'UNKNOWN'),
              NEW.bead_diameter,
              CASE 
                WHEN NEW.purchase_type = 'LOOSE_BEADS' THEN COALESCE(NEW.total_beads, NEW.piece_count, 1)
                WHEN NEW.purchase_type = 'BRACELET' THEN COALESCE(NEW.total_beads, NEW.piece_count, 1)
                ELSE COALESCE(NEW.piece_count, 1)
              END,
              CASE 
                WHEN NEW.purchase_type IN ('LOOSE_BEADS', 'BRACELET') THEN 'PIECES'
                WHEN NEW.purchase_type = 'ACCESSORIES' THEN 'SLICES'
                ELSE 'ITEMS'
              END,
              COALESCE(NEW.total_price, 0) / GREATEST(COALESCE(NEW.piece_count, NEW.total_beads, 1), 1),
              COALESCE(NEW.total_price, 0),
              NEW.id, NEW.supplier_id, NEW.photos, DATE(NEW.purchase_date), NEW.notes, NEW.user_id, NOW(), NOW()
            );
         END IF;
       END`,
       
      `CREATE TRIGGER tr_material_usage_update_stock
       AFTER INSERT ON material_usage
       FOR EACH ROW
       BEGIN
         UPDATE materials SET
           used_quantity = (
             SELECT COALESCE(SUM(quantity_used), 0)
             FROM material_usage
             WHERE material_id = NEW.material_id
           )
         WHERE id = NEW.material_id;
       END`
    ];

    // 执行触发器创建
    for (let i = 0; i < triggers.length; i++) {
      try {
        console.log(`创建触发器 ${i + 1}/${triggers.length}`);
        await connection.query(triggers[i]);
        console.log(`✓ 触发器 ${i + 1} 创建成功`);
      } catch (error) {
        console.error(`✗ 触发器 ${i + 1} 创建失败:`, error.message);
      }
    }

    await connection.end();
    console.log('所有触发器创建完成');

  } catch (error) {
    console.error('创建触发器失败:', error.message);
    process.exit(1);
  }
}

createTriggers();