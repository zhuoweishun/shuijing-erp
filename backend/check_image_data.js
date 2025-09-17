import { PrismaClient } from '@prisma/client'
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

async function check_image_data() {
  let connection
  
  try {
    // 创建直接数据库连接
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    })

    console.log('🔍 检查配件和成品库存图片数据问题')
    console.log('=' * 50)

    // 1. 检查materials表中的photos字段数据
    console.log('\n📊 检查materials表中的photos字段:')
    
    const [materials] = await connection.query(`
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
    
    console.log(`找到 ${materials.length} 条配件和成品记录`)
    
    let has_photos_count = 0
    let empty_photos_count = 0
    let invalid_photos_count = 0
    
    materials.forEach((material, index) => {
      console.log(`\n${index + 1}. ${material.material_name} (${material.material_type}):`)
      console.log(`   - photos字段长度: ${material.photos_length || 0}`)
      console.log(`   - photos原始数据: ${material.photos ? String(material.photos).substring(0, 100) + '...' : 'NULL'}`)
      
      if (!material.photos) {
        console.log(`   - 状态: ❌ 无图片数据`)
        empty_photos_count++
        return
      }
      
      try {
        let photos_array
        if (typeof material.photos === 'string') {
          photos_array = JSON.parse(material.photos)
        } else if (Array.isArray(material.photos)) {
          photos_array = material.photos
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
    
    console.log(`\n📈 统计结果:`)
    console.log(`- 有图片数据: ${has_photos_count}/${materials.length}`)
    console.log(`- 无图片数据: ${empty_photos_count}/${materials.length}`)
    console.log(`- 无效图片数据: ${invalid_photos_count}/${materials.length}`)

    // 2. 检查图片文件是否存在
    console.log('\n📁 检查图片文件存在性:')
    
    const uploads_dir = path.join(__dirname, 'uploads')
    const purchases_dir = path.join(uploads_dir, 'purchases')
    
    console.log(`上传目录: ${uploads_dir}`)
    console.log(`采购图片目录: ${purchases_dir}`)
    
    // 检查目录是否存在
    if (!fs.existsSync(uploads_dir)) {
      console.log('❌ uploads目录不存在')
    } else {
      console.log('✅ uploads目录存在')
    }
    
    if (!fs.existsSync(purchases_dir)) {
      console.log('❌ purchases目录不存在')
    } else {
      console.log('✅ purchases目录存在')
      
      // 列出purchases目录中的文件
      const files = fs.readdirSync(purchases_dir)
      console.log(`purchases目录中有 ${files.length} 个文件`)
      
      if (files.length > 0) {
        console.log('前10个文件:')
        files.slice(0, 10).forEach((file, index) => {
          const file_path = path.join(purchases_dir, file)
          const stats = fs.statSync(file_path)
          console.log(`  ${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)}KB)`)
        })
      }
    }

    // 3. 检查具体图片路径的有效性
    console.log('\n🔗 检查具体图片路径:')
    
    let valid_image_paths = 0
    let invalid_image_paths = 0
    
    for (const material of materials) {
      if (!material.photos) continue
      
      try {
        let photos_array
        if (typeof material.photos === 'string') {
          photos_array = JSON.parse(material.photos)
        } else if (Array.isArray(material.photos)) {
          photos_array = material.photos
        } else {
          continue
        }
        
        if (Array.isArray(photos_array)) {
          for (const photo_path of photos_array) {
            if (typeof photo_path === 'string') {
              // 处理相对路径
              let full_path
              if (photo_path.startsWith('/uploads/')) {
                full_path = path.join(__dirname, photo_path.substring(1))
              } else if (photo_path.startsWith('uploads/')) {
                full_path = path.join(__dirname, photo_path)
              } else {
                full_path = path.join(__dirname, 'uploads', 'purchases', path.basename(photo_path))
              }
              
              if (fs.existsSync(full_path)) {
                console.log(`✅ ${photo_path} -> 文件存在`)
                valid_image_paths++
              } else {
                console.log(`❌ ${photo_path} -> 文件不存在 (检查路径: ${full_path})`)
                invalid_image_paths++
              }
            }
          }
        }
      } catch (error) {
        console.log(`❌ 处理 ${material.material_name} 的图片路径时出错: ${error.message}`)
      }
    }
    
    console.log(`\n📊 图片文件检查结果:`)
    console.log(`- 有效图片路径: ${valid_image_paths}`)
    console.log(`- 无效图片路径: ${invalid_image_paths}`)

    // 4. 检查API返回的图片数据格式
    console.log('\n🔌 模拟API返回格式检查:')
    
    // 模拟库存API的数据处理逻辑
    const sample_materials = materials.slice(0, 3)
    
    sample_materials.forEach((material, index) => {
      console.log(`\n${index + 1}. API数据格式检查 - ${material.material_name}:`)
      
      // 模拟API中的photos处理逻辑
      let photos = []
      if (material.photos) {
        try {
          photos = typeof material.photos === 'string' ? JSON.parse(material.photos) : material.photos
          if (!Array.isArray(photos)) {
            photos = []
          }
        } catch (error) {
          console.log(`   ❌ API解析photos失败: ${error.message}`)
          photos = []
        }
      }
      
      console.log(`   - 原始photos: ${material.photos ? String(material.photos).substring(0, 50) + '...' : 'NULL'}`)
      console.log(`   - 解析后photos: ${JSON.stringify(photos)}`)
      console.log(`   - photos类型: ${Array.isArray(photos) ? 'Array' : typeof photos}`)
      console.log(`   - photos长度: ${Array.isArray(photos) ? photos.length : 'N/A'}`)
      
      if (Array.isArray(photos) && photos.length > 0) {
        console.log(`   ✅ API格式正确，包含 ${photos.length} 张图片`)
      } else {
        console.log(`   ❌ API格式问题或无图片数据`)
      }
    })

    // 5. 问题诊断和建议
    console.log('\n💡 问题诊断和修复建议:')
    
    if (empty_photos_count === materials.length) {
      console.log('❌ 所有记录都没有图片数据')
      console.log('建议：')
      console.log('1. 检查采购录入时是否正确上传了图片')
      console.log('2. 检查数据迁移脚本是否正确处理了photos字段')
      console.log('3. 检查purchase表中是否有图片数据需要迁移到materials表')
    } else if (empty_photos_count > materials.length * 0.5) {
      console.log('⚠️  超过一半的记录没有图片数据')
      console.log('建议：')
      console.log('1. 检查部分记录的图片上传流程')
      console.log('2. 验证数据迁移的完整性')
    }
    
    if (invalid_image_paths > 0) {
      console.log('❌ 存在无效的图片路径')
      console.log('建议：')
      console.log('1. 检查图片文件是否被意外删除')
      console.log('2. 验证图片路径格式是否正确')
      console.log('3. 检查uploads目录的权限设置')
    }
    
    if (invalid_photos_count > 0) {
      console.log('❌ 存在无效的photos JSON数据')
      console.log('建议：')
      console.log('1. 修复数据库中的JSON格式错误')
      console.log('2. 重新运行数据迁移脚本')
    }
    
    // 6. 检查前端fixImageUrl函数的处理
    console.log('\n🌐 前端图片URL处理检查:')
    
    const sample_paths = [
      '/uploads/purchases/sample.jpg',
      'uploads/purchases/sample.jpg',
      'http://localhost:3001/uploads/purchases/sample.jpg',
      'https://api.dorblecapital.com/uploads/purchases/sample.jpg'
    ]
    
    console.log('模拟fixImageUrl函数处理结果:')
    sample_paths.forEach((path, index) => {
      console.log(`${index + 1}. 输入: ${path}`)
      // 这里只是模拟，实际的fixImageUrl函数在前端
      if (path.startsWith('/uploads/')) {
        console.log(`   输出: http://localhost:3001${path} (相对路径转换)`)
      } else if (path.includes('api.dorblecapital.com')) {
        console.log(`   输出: http://localhost:3001/uploads/purchases/sample.jpg (生产环境转换)`)
      } else {
        console.log(`   输出: ${path} (无需转换)`)
      }
    })
    
    console.log('\n🎯 总结:')
    console.log(`- 配件和成品记录总数: ${materials.length}`)
    console.log(`- 有图片数据的记录: ${has_photos_count}`)
    console.log(`- 有效图片文件: ${valid_image_paths}`)
    console.log(`- 无效图片文件: ${invalid_image_paths}`)
    
    if (has_photos_count === 0) {
      console.log('\n🚨 主要问题: 数据库中没有图片数据')
      console.log('需要检查数据迁移过程中photos字段的处理')
    } else if (invalid_image_paths > 0) {
      console.log('\n🚨 主要问题: 图片文件缺失或路径错误')
      console.log('需要检查文件系统和路径映射')
    } else {
      console.log('\n✅ 图片数据检查完成，请根据上述信息进行相应修复')
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
check_image_data().catch(error => {
  console.error('检查失败:', error)
  process.exit(1)
})