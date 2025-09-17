// 简化版触发器应用脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function applyTriggersSimple() {
  try {
    console.log('🔧 开始应用修复后的触发器（简化版）...')
    
    // 1. 删除现有触发器
    const dropStatements = [
      'DROP TRIGGER IF EXISTS tr_purchase_insert_material',
      'DROP TRIGGER IF EXISTS tr_purchase_update_material',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_update',
      'DROP TRIGGER IF EXISTS tr_material_usage_update_stock_after_delete'
    ]
    
    for (const statement of dropStatements) {
      try {
        await prisma.$executeRawUnsafe(statement)
        console.log(`✅ 成功执行: ${statement}`)
      } catch (error) {
        console.log(`⚠️ 删除触发器失败（可能不存在）: ${error.message}`)
      }
    }
    
    // 2. 创建修复后的INSERT触发器
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
            
            CASE 
              WHEN NEW.purchase_type IN ('LOOSE_BEADS', 'BRACELET') THEN 'PIECES'
              WHEN NEW.purchase_type = 'ACCESSORIES' THEN 'SLICES'
              WHEN NEW.purchase_type = 'FINISHED_MATERIAL' THEN 'ITEMS'
              ELSE 'PIECES'
            END,
            
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
    `
    
    await prisma.$executeRawUnsafe(insertTrigger)
    console.log('✅ 成功创建 tr_purchase_insert_material 触发器')
    
    // 3. 创建其他必要的触发器
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
      END
    `
    
    await prisma.$executeRawUnsafe(usageInsertTrigger)
    console.log('✅ 成功创建 tr_material_usage_update_stock 触发器')
    
    console.log('🎉 关键触发器应用完成！')
    
    // 4. 验证触发器创建情况
    const triggers = await prisma.$queryRawUnsafe(`
      SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE 
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = DATABASE() 
      AND TRIGGER_NAME LIKE 'tr_%material%'
      ORDER BY TRIGGER_NAME
    `)
    
    console.log('\n📋 当前材料相关触发器:')
    triggers.forEach(trigger => {
      console.log(`   - ${trigger.TRIGGER_NAME}: ${trigger.EVENT_MANIPULATION} on ${trigger.EVENT_OBJECT_TABLE}`)
    })
    
  } catch (error) {
    console.error('❌ 应用触发器过程中发生错误:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行应用触发器
applyTriggersSimple()
  .then(() => {
    console.log('\n🏁 触发器应用脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 触发器应用脚本执行失败:', error)
    process.exit(1)
  })