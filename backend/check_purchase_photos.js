import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'

const prisma = new PrismaClient()

async function check_purchase_photos() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔍 检查purchase表中的图片数据')
    console.log('=' * 50)

    // 1. 检查purchase表中的photos字段
    console.log('\n📊 检查purchase表中的photos字段:')
    
    const [purchases] = await connection.query(`
      SELECT 
        id,
        purchase_name,
        purchase_type,
        photos,
        LENGTH(photos) as photos_length,
        status
      FROM purchases 
      WHERE purchase_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
      ORDER BY purchase_type, purchase_name
    `)
    
    console.log(`找到 ${purchases.length} 条配件和成品采购记录`)
    
    let has_photos_count = 0
    let empty_photos_count = 0
    let invalid_photos_count = 0
    
    purchases.forEach((purchase, index) => {
      console.log(`\n${index + 1}. ${purchase.purchase_name} (${purchase.purchase_type}) - ${purchase.status}:`)
      console.log(`   - photos字段长度: ${purchase.photos_length || 0}`)
      console.log(`   - photos原始数据: ${purchase.photos ? String(purchase.photos).substring(0, 100) + '...' : 'NULL'}`)
      
      if (!purchase.photos) {
        console.log(`   - 状态: ❌ 无图片数据`)
        empty_photos_count++
        return
      }
      
      try {
        let photos_array
        if (typeof purchase.photos === 'string') {
          photos_array = JSON.parse(purchase.photos)
        } else if (Array.isArray(purchase.photos)) {
          photos_array = purchase.photos
        } else {
          throw new Error('photos字段格式不正确')
        }
        
        if (Array.isArray(photos_array) && photos_array.length > 0) {
          console.log(`   - 状态: ✅ 有效图片数据，包含 ${photos_array.length} 张图片`)
          console.log(`   - 图片路径: ${photos_array.slice(0, 2).join(', ')}${photos_array.length > 2 ? '...' : ''}`)
          has_photos_count++
        } else {
          console.log(`   - 状态: ⚠️  空图片数组`)
          empty_photos_count++
        }
      } catch (error) {
        console.log(`   - 状态: ❌ JSON解析失败: ${error.message}`)
        invalid_photos_count++
      }
    })
    
    console.log(`\n📈 Purchase表统计结果:`)
    console.log(`- 有图片数据: ${has_photos_count}/${purchases.length}`)
    console.log(`- 无图片数据: ${empty_photos_count}/${purchases.length}`)
    console.log(`- 无效图片数据: ${invalid_photos_count}/${purchases.length}`)

    // 2. 检查materials表与purchase表的关联
    console.log('\n🔗 检查materials表与purchase表的关联:')
    
    const [material_purchase_mapping] = await connection.query(`
      SELECT 
        m.id as material_id,
        m.material_name,
        m.material_type,
        m.photos as material_photos,
        m.purchase_id,
        p.id as purchase_table_id,
        p.purchase_name,
        p.purchase_type,
        p.photos as purchase_photos,
        p.status as purchase_status
      FROM materials m
      LEFT JOIN purchases p ON m.purchase_id = p.id
      WHERE m.material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
      ORDER BY m.material_type, m.material_name
    `)
    
    console.log(`找到 ${material_purchase_mapping.length} 条materials-purchase关联记录`)
    
    let needs_photo_migration = 0
    let already_has_photos = 0
    let no_source_photos = 0
    
    material_purchase_mapping.forEach((mapping, index) => {
      console.log(`\n${index + 1}. ${mapping.material_name} (${mapping.material_type}):`)
      console.log(`   - Material ID: ${mapping.material_id}`)
      console.log(`   - Purchase ID: ${mapping.purchase_id}`)
      console.log(`   - Purchase状态: ${mapping.purchase_status || 'N/A'}`)
      
      const has_material_photos = mapping.material_photos && mapping.material_photos !== 'null'
      const has_purchase_photos = mapping.purchase_photos && mapping.purchase_photos !== 'null'
      
      console.log(`   - Material有图片: ${has_material_photos ? '✅' : '❌'}`)
      console.log(`   - Purchase有图片: ${has_purchase_photos ? '✅' : '❌'}`)
      
      if (has_material_photos) {
        console.log(`   - 状态: ✅ Material已有图片数据`)
        already_has_photos++
      } else if (has_purchase_photos) {
        console.log(`   - 状态: 🔄 需要从Purchase迁移图片数据`)
        console.log(`   - Purchase图片: ${String(mapping.purchase_photos).substring(0, 50)}...`)
        needs_photo_migration++
      } else {
        console.log(`   - 状态: ❌ 两个表都没有图片数据`)
        no_source_photos++
      }
    })
    
    console.log(`\n📊 关联检查结果:`)
    console.log(`- 已有图片的materials: ${already_has_photos}`)
    console.log(`- 需要迁移图片的materials: ${needs_photo_migration}`)
    console.log(`- 无图片源的materials: ${no_source_photos}`)

    // 3. 生成修复脚本
    if (needs_photo_migration > 0) {
      console.log('\n🔧 生成图片数据迁移脚本:')
      
      const migration_records = material_purchase_mapping.filter(mapping => {
        const has_material_photos = mapping.material_photos && mapping.material_photos !== 'null'
        const has_purchase_photos = mapping.purchase_photos && mapping.purchase_photos !== 'null'
        return !has_material_photos && has_purchase_photos
      })
      
      console.log(`需要迁移 ${migration_records.length} 条记录的图片数据:`)
      
      migration_records.forEach((record, index) => {
        console.log(`\n${index + 1}. 迁移 ${record.material_name}:`)
        console.log(`   UPDATE materials SET photos = '${record.purchase_photos}' WHERE id = ${record.material_id};`)
      })
      
      // 生成完整的迁移SQL
      const migration_sql = migration_records.map(record => 
        `UPDATE materials SET photos = '${record.purchase_photos}' WHERE id = ${record.material_id};`
      ).join('\n')
      
      console.log('\n📝 完整迁移SQL:')
      console.log(migration_sql)
      
      // 执行迁移
      console.log('\n🚀 执行图片数据迁移:')
      
      for (const record of migration_records) {
        try {
          await connection.query(
            'UPDATE materials SET photos = ? WHERE id = ?',
            [record.purchase_photos, record.material_id]
          )
          console.log(`✅ 成功迁移 ${record.material_name} 的图片数据`)
        } catch (error) {
          console.log(`❌ 迁移 ${record.material_name} 失败: ${error.message}`)
        }
      }
      
      console.log(`\n🎉 图片数据迁移完成！迁移了 ${migration_records.length} 条记录`)
    } else {
      console.log('\n✅ 无需迁移图片数据')
    }

    // 4. 验证迁移结果
    console.log('\n🔍 验证迁移结果:')
    
    const [updated_materials] = await connection.query(`
      SELECT 
        id,
        material_name,
        material_type,
        photos,
        LENGTH(photos) as photos_length
      FROM materials 
      WHERE material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL')
      ORDER BY material_type, material_name
    `)
    
    let final_has_photos = 0
    let final_no_photos = 0
    
    updated_materials.forEach((material) => {
      if (material.photos && material.photos !== 'null') {
        final_has_photos++
      } else {
        final_no_photos++
      }
    })
    
    console.log(`\n📊 最终结果:`)
    console.log(`- 有图片数据的materials: ${final_has_photos}/${updated_materials.length}`)
    console.log(`- 无图片数据的materials: ${final_no_photos}/${updated_materials.length}`)
    
    if (final_has_photos > 0) {
      console.log('\n✅ 图片数据迁移成功！现在materials表中有图片数据了')
      console.log('建议：刷新前端页面查看图片显示效果')
    } else {
      console.log('\n❌ 仍然没有图片数据，可能需要检查purchase表中的数据')
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
    await prisma.$disconnect()
  }
}

// 运行检查
check_purchase_photos().catch(error => {
  console.error('检查失败:', error)
  process.exit(1)
})