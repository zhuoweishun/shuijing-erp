import mysql from 'mysql2/promise'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../backend/.env') })

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev'
}

// 真实产品数据（基于用户提供的名称）
const realProductData = [
  // 紫水晶系列
  { name: '紫水晶手串', diameter: 6, quality: 'AA', beads: 180, pricePerBead: 0.85, weight: 15.2 },
  { name: '紫水晶手串', diameter: 8, quality: 'A', beads: 150, pricePerBead: 1.20, weight: 22.5 },
  { name: '紫水晶手串', diameter: 10, quality: 'AB', beads: 120, pricePerBead: 1.80, weight: 35.8 },
  { name: '玻利维亚紫手串', diameter: 8, quality: 'AA', beads: 100, pricePerBead: 2.50, weight: 18.9 },
  { name: '玻利维亚紫手串', diameter: 10, quality: 'A', beads: 80, pricePerBead: 3.20, weight: 28.4 },
  
  // 发晶系列
  { name: '银发晶手串', diameter: 8, quality: 'AA', beads: 90, pricePerBead: 4.50, weight: 20.1 },
  { name: '银发晶手串', diameter: 10, quality: 'A', beads: 75, pricePerBead: 6.80, weight: 32.5 },
  { name: '白发晶手串', diameter: 8, quality: 'AA', beads: 85, pricePerBead: 3.80, weight: 19.2 },
  { name: '白发晶圆珠', diameter: 6, quality: 'A', beads: 200, pricePerBead: 2.20, weight: 12.8 },
  { name: '白发晶圆珠', diameter: 10, quality: 'AB', beads: 120, pricePerBead: 4.50, weight: 38.6 },
  
  // 草莓晶系列
  { name: '草莓晶圆珠', diameter: 6, quality: 'AA', beads: 160, pricePerBead: 1.80, weight: 14.5 },
  { name: '草莓晶圆珠', diameter: 8, quality: 'A', beads: 140, pricePerBead: 2.60, weight: 24.8 },
  { name: '草莓晶手串', diameter: 8, quality: 'AA', beads: 110, pricePerBead: 3.20, weight: 21.2 },
  { name: '鸽血红草莓晶手串', diameter: 10, quality: 'AA', beads: 80, pricePerBead: 8.50, weight: 35.2 },
  
  // 青金石系列
  { name: '青金石手串', diameter: 8, quality: 'A', beads: 130, pricePerBead: 2.80, weight: 26.4 },
  { name: '青金石手串', diameter: 10, quality: 'AA', beads: 100, pricePerBead: 4.20, weight: 42.1 },
  
  // 蓝晶系列
  { name: '蓝晶手串', diameter: 8, quality: 'A', beads: 120, pricePerBead: 3.50, weight: 22.8 },
  { name: '蓝晶手串', diameter: 10, quality: 'AA', beads: 95, pricePerBead: 5.20, weight: 38.9 },
  { name: '猫眼蓝晶手串', diameter: 8, quality: 'AA', beads: 85, pricePerBead: 6.80, weight: 20.5 },
  
  // 萤石系列
  { name: '绿萤石手串', diameter: 8, quality: 'A', beads: 140, pricePerBead: 1.80, weight: 25.6 },
  { name: '绿萤石手串', diameter: 10, quality: 'AA', beads: 110, pricePerBead: 2.50, weight: 41.2 },
  { name: '紫萤石手串', diameter: 8, quality: 'A', beads: 125, pricePerBead: 2.20, weight: 23.8 },
  { name: '蓝萤石手串', diameter: 8, quality: 'AA', beads: 105, pricePerBead: 3.80, weight: 21.9 },
  { name: '黄萤石随形', diameter: null, quality: 'A', beads: 200, pricePerBead: 1.20, weight: 45.8 },
  { name: '羽毛绿萤石圆珠', diameter: 6, quality: 'AA', beads: 180, pricePerBead: 2.80, weight: 16.2 },
  
  // 月光石系列
  { name: '灰月光长串', diameter: 6, quality: 'A', beads: 300, pricePerBead: 1.50, weight: 28.5 },
  { name: '奶茶月光手串', diameter: 8, quality: 'AA', beads: 110, pricePerBead: 4.20, weight: 22.1 },
  
  // 特殊水晶系列
  { name: '紫龙晶手串', diameter: 8, quality: 'A', beads: 120, pricePerBead: 3.80, weight: 24.6 },
  { name: '金箔锦鲤手串', diameter: 10, quality: 'AA', beads: 90, pricePerBead: 12.50, weight: 45.2 },
  { name: '魔鬼蓝海蓝宝手串', diameter: 8, quality: 'AA', beads: 75, pricePerBead: 15.80, weight: 28.9 },
  
  // 茶晶系列
  { name: '茶晶手串', diameter: 8, quality: 'A', beads: 135, pricePerBead: 1.80, weight: 26.8 },
  { name: '茶晶手串', diameter: 10, quality: 'AA', beads: 105, pricePerBead: 2.60, weight: 42.5 },
  
  // 随形水晶系列
  { name: '随形水晶', diameter: null, quality: 'A', beads: 250, pricePerBead: 0.80, weight: 52.3 },
  { name: '花胶水晶随形', diameter: null, quality: 'AA', beads: 180, pricePerBead: 2.20, weight: 38.9 },
  
  // 白水晶系列
  { name: '白水晶手串', diameter: 8, quality: 'A', beads: 150, pricePerBead: 1.20, weight: 24.5 },
  { name: '雪花白幽灵手串', diameter: 8, quality: 'AA', beads: 120, pricePerBead: 3.50, weight: 22.8 },
  { name: '雪花白幽灵手串', diameter: 10, quality: 'A', beads: 95, pricePerBead: 4.80, weight: 38.2 },
  
  // 兔毛系列
  { name: '彩兔毛手串', diameter: 8, quality: 'A', beads: 110, pricePerBead: 2.80, weight: 21.5 },
  { name: '彩兔毛手串', diameter: 10, quality: 'AA', beads: 85, pricePerBead: 4.20, weight: 34.8 },
  
  // 黑金超七系列
  { name: '黑金超手串', diameter: 8, quality: 'AA', beads: 95, pricePerBead: 8.50, weight: 28.9 },
  { name: '黑金超七随形', diameter: null, quality: 'A', beads: 150, pricePerBead: 5.20, weight: 48.6 },
  
  // 特殊形状
  { name: '黑晶方糖', diameter: 8, quality: 'A', beads: 200, pricePerBead: 1.50, weight: 65.2 },
  
  // 胶花系列
  { name: '黄胶花手串', diameter: 8, quality: 'A', beads: 125, pricePerBead: 2.20, weight: 23.8 },
  { name: '黄胶花手串', diameter: 10, quality: 'AA', beads: 100, pricePerBead: 3.50, weight: 38.5 },
  { name: '胶花手串', diameter: 8, quality: 'A', beads: 130, pricePerBead: 1.80, weight: 24.2 },
  { name: '油画胶花手串', diameter: 8, quality: 'AA', beads: 105, pricePerBead: 4.80, weight: 22.1 },
  
  // 粉水晶系列
  { name: '粉水晶手串', diameter: 6, quality: 'A', beads: 180, pricePerBead: 1.20, weight: 16.8 },
  { name: '粉水晶手串', diameter: 8, quality: 'AA', beads: 140, pricePerBead: 2.20, weight: 26.5 },
  { name: '粉水晶手串', diameter: 10, quality: 'A', beads: 110, pricePerBead: 3.50, weight: 42.8 },
  { name: '西柚粉晶手串', diameter: 8, quality: 'AA', beads: 95, pricePerBead: 4.80, weight: 21.9 },
  
  // 闪灵系列
  { name: '黑闪灵手串', diameter: 8, quality: 'A', beads: 115, pricePerBead: 3.20, weight: 25.8 },
  { name: '黑闪灵手串', diameter: 10, quality: 'AA', beads: 90, pricePerBead: 5.50, weight: 41.2 },
  
  // 阿塞系列
  { name: '白阿塞手串', diameter: 8, quality: 'A', beads: 125, pricePerBead: 2.80, weight: 24.6 },
  
  // 岫玉系列
  { name: '岫玉手串', diameter: 8, quality: 'A', beads: 135, pricePerBead: 1.50, weight: 32.5 },
  { name: '岫玉手串', diameter: 10, quality: 'AA', beads: 105, pricePerBead: 2.20, weight: 52.8 },
  
  // 其他宝石系列
  { name: '绿银石手串', diameter: 8, quality: 'A', beads: 120, pricePerBead: 3.50, weight: 28.9 },
  { name: '蓝纹石珠子', diameter: 6, quality: 'AA', beads: 200, pricePerBead: 2.80, weight: 18.5 },
  { name: '红色虎纹石', diameter: 8, quality: 'A', beads: 140, pricePerBead: 2.20, weight: 35.8 },
  { name: '蓝虎眼手串', diameter: 8, quality: 'A', beads: 130, pricePerBead: 2.50, weight: 32.1 },
  
  // 玛瑙系列
  { name: '红玛瑙', diameter: 8, quality: 'A', beads: 150, pricePerBead: 1.80, weight: 38.5 },
  { name: '茶龙纹玛瑙散珠', diameter: 6, quality: 'A', beads: 250, pricePerBead: 1.20, weight: 28.9 },
  { name: '红龙纹玛瑙散珠', diameter: 6, quality: 'AA', beads: 220, pricePerBead: 1.50, weight: 26.8 },
  { name: '茶色龙纹玛瑙散珠', diameter: 8, quality: 'A', beads: 180, pricePerBead: 1.80, weight: 42.5 },
  
  // 南红系列
  { name: '天然冰飘南红老型珠', diameter: 8, quality: 'AA', beads: 80, pricePerBead: 12.50, weight: 28.9 },
  { name: '南红老型珠', diameter: 6, quality: 'A', beads: 120, pricePerBead: 8.50, weight: 18.5 },
  
  // 绿松石系列
  { name: '天然绿松石圆珠', diameter: 6, quality: 'AA', beads: 150, pricePerBead: 6.80, weight: 22.5 },
  { name: '天然绿松石圆珠', diameter: 8, quality: 'A', beads: 110, pricePerBead: 9.50, weight: 35.8 },
  
  // 银曜石系列
  { name: '天然银曜石陨石', diameter: 8, quality: 'A', beads: 125, pricePerBead: 3.80, weight: 42.1 },
  { name: '天然银耀石陨石圆珠', diameter: 6, quality: 'AA', beads: 180, pricePerBead: 2.50, weight: 28.5 },
  { name: '天然银耀石陨石圆珠', diameter: 8, quality: 'A', beads: 140, pricePerBead: 3.20, weight: 45.2 }
]

// 配饰数据
const accessoryData = [
  { name: '镀金随行隔片', diameter: null, quality: null, beads: 500, pricePerBead: 0.15, weight: 2.5 },
  { name: '镀金正方形隔珠', diameter: 4, quality: null, beads: 300, pricePerBead: 0.25, weight: 1.8 },
  { name: '银隔珠', diameter: 3, quality: null, beads: 400, pricePerBead: 0.35, weight: 2.2 },
  { name: '金隔珠', diameter: 3, quality: null, beads: 200, pricePerBead: 0.85, weight: 1.5 },
  { name: '镀金瓜子隔珠', diameter: null, quality: null, beads: 250, pricePerBead: 0.20, weight: 1.2 },
  { name: '银色瓜子隔珠', diameter: null, quality: null, beads: 280, pricePerBead: 0.18, weight: 1.4 },
  { name: '金色螺旋隔珠', diameter: 4, quality: null, beads: 180, pricePerBead: 0.45, weight: 1.8 },
  { name: '镀金隔珠', diameter: 3, quality: null, beads: 350, pricePerBead: 0.28, weight: 2.1 },
  { name: '镀金小隔珠', diameter: 2, quality: null, beads: 500, pricePerBead: 0.12, weight: 1.5 },
  { name: '镀金圆形隔片', diameter: 6, quality: null, beads: 200, pricePerBead: 0.35, weight: 2.8 },
  { name: '银色圆形隔片', diameter: 6, quality: null, beads: 220, pricePerBead: 0.32, weight: 2.5 },
  { name: '贝母隔珠', diameter: 4, quality: null, beads: 150, pricePerBead: 0.65, weight: 1.2 },
  { name: '老银六字真言隔珠', diameter: 8, quality: null, beads: 80, pricePerBead: 2.50, weight: 3.5 },
  { name: '银色叶子圆圈隔珠', diameter: 5, quality: null, beads: 120, pricePerBead: 0.85, weight: 1.8 },
  { name: '银色正方形隔珠', diameter: 4, quality: null, beads: 180, pricePerBead: 0.45, weight: 2.1 },
  { name: '银色长方形隔珠', diameter: null, quality: null, beads: 160, pricePerBead: 0.55, weight: 2.8 },
  { name: '南红隔珠', diameter: 4, quality: 'A', beads: 100, pricePerBead: 3.50, weight: 1.5 },
  { name: '银色蝴蝶结配饰', diameter: null, quality: null, beads: 50, pricePerBead: 5.80, weight: 2.2 },
  { name: '银色带钻隔片', diameter: 6, quality: null, beads: 80, pricePerBead: 8.50, weight: 1.8 },
  { name: '绿松石隔珠', diameter: 4, quality: 'A', beads: 120, pricePerBead: 2.80, weight: 1.2 },
  { name: '绿松石隔片', diameter: 6, quality: 'A', beads: 90, pricePerBead: 4.20, weight: 2.5 },
  { name: '黄色玉髓隔片', diameter: 6, quality: 'A', beads: 110, pricePerBead: 1.80, weight: 2.1 },
  { name: '玛瑙红无相隔珠', diameter: 4, quality: 'A', beads: 150, pricePerBead: 1.50, weight: 1.8 },
  { name: '铜管DIY饰品', diameter: null, quality: null, beads: 200, pricePerBead: 0.25, weight: 0.8 },
  { name: 'k金DIY饰品', diameter: null, quality: null, beads: 100, pricePerBead: 1.20, weight: 0.5 },
  { name: 'K金DIY饰品', diameter: null, quality: null, beads: 80, pricePerBead: 1.50, weight: 0.6 },
  { name: '各色跑环', diameter: null, quality: null, beads: 300, pricePerBead: 0.08, weight: 0.3 }
]

// 供应商数据
const suppliers = [
  { name: '大宝珠宝', contact: '王大宝', phone: '13800138001', address: '广州市荔湾区华林玉器街' },
  { name: '丽人珠宝', contact: '李丽人', phone: '13800138002', address: '深圳市罗湖区水贝珠宝城' },
  { name: '阿月水晶', contact: '张阿月', phone: '13800138003', address: '东海县水晶城' },
  { name: '阿牛水晶', contact: '牛阿牛', phone: '13800138004', address: '东海县水晶批发市场' },
  { name: '市集淘货', contact: '陈淘货', phone: '13800138005', address: '义乌国际商贸城' }
]

// 生成随机日期（最近6个月内）
function getRandomDate() {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
  const randomTime = sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime())
  return new Date(randomTime)
}

// 生成随机供应商ID
function getRandomSupplierId(supplierIds) {
  return supplierIds[Math.floor(Math.random() * supplierIds.length)]
}

// 生成图片URL
function generateImageUrl(productName) {
  const encodedName = encodeURIComponent(productName)
  return `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodedName}%20crystal%20beads%20jewelry%20high%20quality%20natural%20gemstone&image_size=square`
}

async function createRealisticTestData() {
  let connection
  
  try {
    console.log('🔗 连接数据库...')
    console.log('数据库配置:', dbConfig)
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ 数据库连接成功')
    
    console.log('🧹 清理现有测试数据...')
    // 删除现有的采购记录（保留用户创建的真实数据）
    await connection.execute(`
      DELETE FROM purchases 
      WHERE productName IN (
        ${[...realProductData, ...accessoryData].map(() => '?').join(',')}
      )
    `, [...realProductData, ...accessoryData].map(item => item.name))
    
    console.log('👤 创建默认用户...')
    // 创建默认用户
    await connection.execute(`
      INSERT IGNORE INTO users (id, username, password, role, name, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, true, NOW(), NOW())
    `, ['admin_user_id', 'admin', '$2b$10$defaultpasswordhash', 'BOSS', '系统管理员'])
    
    console.log('👥 创建供应商...')
    // 创建供应商并获取ID
    const supplierIds = []
    for (const supplier of suppliers) {
      const supplierId = `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await connection.execute(`
        INSERT IGNORE INTO suppliers (id, name, contact, phone, address, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, true, NOW(), NOW())
      `, [supplierId, supplier.name, supplier.contact, supplier.phone, supplier.address])
      supplierIds.push(supplierId)
    }
    
    console.log('💎 创建真实产品采购记录...')
    // 创建真实产品采购记录
    for (const product of realProductData) {
      const supplierId = getRandomSupplierId(supplierIds)
      const purchaseDate = getRandomDate()
      const imageUrl = generateImageUrl(product.name)
      
      // 计算总价
      const totalPrice = product.pricePerBead * product.beads
      const pricePerGram = product.weight > 0 ? totalPrice / product.weight : 0
      
      // 随机使用一些库存
      const usedBeads = Math.floor(Math.random() * product.beads * 0.3) // 最多使用30%
      
      // 生成采购编号
      const purchaseCode = `CG${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`
      
      await connection.execute(`
        INSERT INTO purchases (
          id, purchaseCode, productName, beadDiameter, quality, totalBeads, pricePerBead, pricePerGram,
          totalPrice, weight, supplierId, purchaseDate, photos, notes,
          minStockAlert, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        purchaseCode,
        product.name,
        product.diameter || 1, // 如果没有直径，默认设为1mm
        product.quality,
        product.beads,
        product.pricePerBead,
        pricePerGram,
        totalPrice,
        product.weight,
        supplierId,
        purchaseDate,
        JSON.stringify([imageUrl]),
        `真实业务产品 - ${product.name}`,
        Math.floor(product.beads * 0.1), // 10%作为低库存预警
        'admin_user_id' // 默认用户ID
      ])
      
      // 注释：暂时不创建使用记录，因为需要先有成品记录
      // 实际业务中，使用记录会在制作成品时创建
    }
    
    console.log('🎨 创建配饰采购记录...')
    // 创建配饰采购记录
    for (const accessory of accessoryData) {
      const supplierId = getRandomSupplierId(supplierIds)
      const purchaseDate = getRandomDate()
      const imageUrl = generateImageUrl(accessory.name)
      
      // 计算总价
      const totalPrice = accessory.pricePerBead * accessory.beads
      const pricePerGram = accessory.weight > 0 ? totalPrice / accessory.weight : 0
      
      // 随机使用一些库存
      const usedBeads = Math.floor(Math.random() * accessory.beads * 0.2) // 最多使用20%
      
      // 生成采购编号
      const purchaseCode = `CG${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`
      
      await connection.execute(`
        INSERT INTO purchases (
          id, purchaseCode, productName, beadDiameter, quality, totalBeads, pricePerBead, pricePerGram,
          totalPrice, weight, supplierId, purchaseDate, photos, notes,
          minStockAlert, userId, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        `accessory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        purchaseCode,
        accessory.name,
        accessory.diameter || 1, // 如果没有直径，默认设为1mm
        accessory.quality,
        accessory.beads,
        accessory.pricePerBead,
        pricePerGram,
        totalPrice,
        accessory.weight,
        supplierId,
        purchaseDate,
        JSON.stringify([imageUrl]),
        `配饰产品 - ${accessory.name}`,
        Math.floor(accessory.beads * 0.05), // 5%作为低库存预警
        'admin_user_id' // 默认用户ID
      ])
      
      // 注释：暂时不创建使用记录，因为需要先有成品记录
      // 实际业务中，使用记录会在制作成品时创建
    }
    
    console.log('✅ 真实测试数据创建完成！')
    console.log(`📊 统计信息:`)
    console.log(`   - 供应商: ${suppliers.length} 个`)
    console.log(`   - 水晶产品: ${realProductData.length} 种`)
    console.log(`   - 配饰产品: ${accessoryData.length} 种`)
    console.log(`   - 总采购记录: ${realProductData.length + accessoryData.length} 条`)
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// 执行脚本
console.log('🚀 脚本开始执行...')

// 直接执行主函数
createRealisticTestData()
  .then(() => {
    console.log('🎉 脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 脚本执行失败:', error)
    process.exit(1)
  })

export { createRealisticTestData }