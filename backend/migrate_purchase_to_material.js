import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function migratePurchaseToMaterial() {
  let connection
  
  try {
    // 创建直接数据库连接用于复杂查询
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🚀 开始数据迁移：将采购记录同步到material表')
    console.log('=' * 60)

    // 1. 检查当前数据状况
    console.log('\n📊 检查当前数据状况...')
    
    const total_purchases = await prisma.purchase.count({
      where: {
        status: {
          in: ['ACTIVE', 'USED']
        }
      }
    })
    
    const total_materials = await prisma.material.count()
    
    console.log(`总有效采购记录数: ${total_purchases}`)
    console.log(`总material记录数: ${total_materials}`)
    console.log(`需要迁移的记录数: ${total_purchases - total_materials}`)

    // 2. 按类型统计采购记录
    console.log('\n📈 按类型统计有效采购记录:')
    const purchases_by_type = await prisma.purchase.groupBy({
      by: ['purchase_type'],
      _count: {
        id: true
      },
      where: {
        status: {
          in: ['ACTIVE', 'USED']
        }
      }
    })
    
    purchases_by_type.forEach(item => {
      console.log(`  ${item.purchase_type}: ${item._count.id}条`)
    })

    // 3. 找出没有对应material记录的purchase记录
    console.log('\n🔍 查找需要迁移的采购记录...')
    
    const [missing_materials] = await connection.query(`
      SELECT p.* 
      FROM purchases p
      LEFT JOIN materials m ON p.purchase_code = m.material_code
      WHERE m.id IS NULL 
        AND p.status IN ('ACTIVE', 'USED')
        AND p.total_price > 0
      ORDER BY p.created_at ASC
    `)
    
    console.log(`找到 ${missing_materials.length} 条需要迁移的采购记录`)
    
    if (missing_materials.length === 0) {
      console.log('✅ 所有采购记录都已有对应的material记录，无需迁移')
      return
    }

    // 4. 开始迁移数据
    console.log('\n🔄 开始迁移数据...')
    let migrated_count = 0
    let error_count = 0
    const errors = []

    for (const purchase of missing_materials) {
      try {
        // 计算库存单位和数量
        let inventory_unit = 'PIECES'
        let original_quantity = purchase.piece_count || 1
        
        if (purchase.purchase_type === 'LOOSE_BEADS') {
          inventory_unit = 'STRINGS'
          original_quantity = purchase.total_beads || purchase.piece_count || 1
        } else if (purchase.purchase_type === 'BRACELET') {
          // 手串类型：如果有total_beads就用total_beads，否则用piece_count或默认1
          inventory_unit = 'PIECES'
          original_quantity = purchase.total_beads || purchase.piece_count || 1
        }
        
        // 计算单位成本
        const unit_cost = original_quantity > 0 ? 
          (purchase.total_price / original_quantity) : purchase.total_price

        // 根据purchase_type映射规格字段
        const material_data = {
          material_code: purchase.purchase_code,
          material_name: purchase.purchase_name,
          material_type: purchase.purchase_type,
          quality: purchase.quality || 'A',
          original_quantity: original_quantity,
          used_quantity: 0,
          inventory_unit: inventory_unit,
          unit_cost: unit_cost,
          total_cost: purchase.total_price,
          purchase_id: purchase.id,
          supplier_id: purchase.supplier_id,
          created_by: purchase.user_id,
          material_date: purchase.purchase_date || purchase.created_at,
          created_at: purchase.created_at,
          updated_at: new Date()
        }
        
        // 根据类型设置对应的规格字段
        switch (purchase.purchase_type) {
          case 'LOOSE_BEADS':
            // 散珠使用bead_diameter字段
            if (purchase.bead_diameter) {
              material_data.bead_diameter = purchase.bead_diameter
            }
            break
          case 'BRACELET':
            // 手串使用bracelet_inner_diameter字段
            if (purchase.specification) {
              material_data.bracelet_inner_diameter = purchase.specification
            }
            break
          case 'ACCESSORIES':
            // 配件使用accessory_specification字段
            if (purchase.specification) {
              material_data.accessory_specification = purchase.specification.toString()
            }
            break
          case 'FINISHED_MATERIAL':
            // 成品使用finished_material_specification字段
            if (purchase.specification) {
              material_data.finished_material_specification = purchase.specification.toString()
            }
            break
        }

        await prisma.material.create({
          data: material_data
        })

        migrated_count++
        
        if (migrated_count % 10 === 0) {
          console.log(`  已迁移 ${migrated_count}/${missing_materials.length} 条记录...`)
        }
        
      } catch (error) {
        error_count++
        errors.push({
          purchase_id: purchase.id,
          purchase_code: purchase.purchase_code,
          error: error.message
        })
        console.error(`❌ 迁移失败 - 采购记录 ${purchase.purchase_code}: ${error.message}`)
      }
    }

    // 5. 迁移完成报告
    console.log('\n📋 迁移完成报告:')
    console.log('=' * 40)
    console.log(`✅ 成功迁移: ${migrated_count} 条记录`)
    console.log(`❌ 迁移失败: ${error_count} 条记录`)
    
    if (errors.length > 0) {
      console.log('\n❌ 失败记录详情:')
      errors.forEach(err => {
        console.log(`  ${err.purchase_code}: ${err.error}`)
      })
    }

    // 6. 验证迁移结果
    console.log('\n🔍 验证迁移结果...')
    
    const final_materials = await prisma.material.count()
    const final_purchases = await prisma.purchase.count({
      where: {
        status: {
          in: ['ACTIVE', 'USED']
        }
      }
    })
    
    console.log(`迁移后material记录数: ${final_materials}`)
    console.log(`有效采购记录数: ${final_purchases}`)
    
    if (final_materials >= final_purchases) {
      console.log('✅ 迁移验证通过：material记录数量正常')
    } else {
      console.log('⚠️  迁移验证警告：仍有部分采购记录未同步')
    }

    // 7. 按类型统计迁移后的material记录
    console.log('\n📊 迁移后按类型统计material记录:')
    const materials_by_type = await prisma.material.groupBy({
      by: ['material_type'],
      _count: {
        id: true
      },
      _sum: {
        original_quantity: true,
        used_quantity: true
      }
    })
    
    materials_by_type.forEach(item => {
      const available = (item._sum.original_quantity || 0) - (item._sum.used_quantity || 0)
      console.log(`  ${item.material_type}: ${item._count.id}条记录, 可用库存: ${available}`)
    })

    // 8. 测试触发器是否正常工作
    console.log('\n🧪 测试触发器功能...')
    
    const test_purchase_code = `MIGRATE_TEST_${Date.now()}`
    const test_user = await prisma.user.findFirst()
    
    if (test_user) {
      try {
        // 创建测试采购记录
        const test_purchase = await prisma.purchase.create({
          data: {
            id: test_purchase_code.replace('MIGRATE_TEST_', 'pur_'),
            purchase_code: test_purchase_code,
            purchase_name: '触发器测试记录',
            purchase_type: 'ACCESSORIES',
            quality: 'A',
            piece_count: 5,
            total_price: 50.00,
            purchase_date: new Date(),
            photos: '[]',
            user_id: test_user.id,
            status: 'ACTIVE'
          }
        })
        
        // 等待触发器执行
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 检查是否自动创建了material记录
        const test_material = await prisma.material.findFirst({
          where: {
            material_code: test_purchase_code
          }
        })
        
        if (test_material) {
          console.log('✅ 触发器工作正常：自动创建了material记录')
          
          // 清理测试数据
          await prisma.material.delete({ where: { id: test_material.id } })
          await prisma.purchase.delete({ where: { id: test_purchase.id } })
          console.log('🧹 测试数据已清理')
        } else {
          console.log('❌ 触发器异常：未能自动创建material记录')
        }
        
      } catch (error) {
        console.error('❌ 触发器测试失败:', error.message)
      }
    } else {
      console.log('⚠️  没有用户数据，跳过触发器测试')
    }

    console.log('\n🎉 数据迁移完成！')
    console.log('\n💡 建议：')
    console.log('1. 检查前端库存页面是否正常显示数据')
    console.log('2. 测试新的采购记录是否能自动创建material记录')
    console.log('3. 验证库存使用功能是否正常工作')
    
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
    await prisma.$disconnect()
  }
}

// 运行迁移
migratePurchaseToMaterial().catch(error => {
  console.error('迁移失败:', error)
  process.exit(1)
})