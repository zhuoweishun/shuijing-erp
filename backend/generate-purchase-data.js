import mysql from 'mysql2/promise';
import path from 'path';
import { file_u_r_l_to_path } from 'url';
import dotenv from 'dotenv';

const _Filename = fileURLToPath(import.meta.url);
const _Dirname = path.dirname(_Filename);
dotenv.config({ path: path.join(_Dirname, '.env') });

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'ZWSloveWCC123',
  database: 'crystal_erp_dev',
  port: 3306
};

// 产品类型配置
const product_types = [
  { type: '散珠', category: 'loose_beads' },
  { type: '手串', category: 'bracelets' },
  { type: '饰品配件', category: 'accessories' },
  { type: '成品', category: 'finished_products' }
];

// 品相等级
const qualities = ['极品', '优品', '良品', '普品'];

// 材质类型
const materials = [
  '南红', '绿松石', '蜜蜡', '琥珀', '翡翠', '和田玉', 
  '紫檀', '沉香', '黄花梨', '小叶紫檀', '金刚菩提', '星月菩提'
];

// 供应商信息
const suppliers = [
  { name: '云南南红批发商', contact: '13888888888' },
  { name: '湖北绿松石厂家', contact: '13999999999' },
  { name: '辽宁琥珀供应商', contact: '13777777777' },
  { name: '新疆和田玉商家', contact: '13666666666' },
  { name: '海南沉香批发', contact: '13555555555' }
];

// 生成随机CG码
function generateCGCode() {
  const timestamp = Date.now().to_string().slice(-6);
  const random = Math.random().to_string(36).substring(2, 6).to_upper_case();
  return `CG${timestamp}${random}`;
}

// 生成随机价格
function generatePrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机重量
function generateWeight() {
  return (Math.random() * 50 + 1).to_fixed(2); // 1-50克
}

// 生成随机数量
function generateQuantity(type) {
  if (type === '散珠') {
    return Math.floor(Math.random() * 100) + 10; // 10-110颗
  } else if (type === '手串') {
    return Math.floor(Math.random() * 5) + 1; // 1-5条
  } else {
    return Math.floor(Math.random() * 20) + 1; // 1-20件
  }
}

// 生成采购记录
function generatePurchaseRecord() {
  const product_type = product_types[Math.floor(Math.random() * product_types.length)];
  const quality = qualities[Math.floor(Math.random() * qualities.length)];
  const material = materials[Math.floor(Math.random() * materials.length)];
  const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
  
  const quantity = generateQuantity(product_type.type);
  const weight = generateWeight();
  const unit_price = generatePrice(10, 1000);
  const total_price = unit_price * quantity;
  
  // 映射产品类型到数据库枚举值
  const productTypeMapping = {
    '散珠': 'LOOSE_BEADS',
    '手串': 'BRACELET', 
    '饰品配件': 'ACCESSORIES',
    '成品': 'FINISHED'
  };
  
  // 映射品相到数据库枚举值
  const qualityMapping = {
    '极品': 'AA',
    '优品': 'A',
    '良品': 'AB',
    '普品': 'B'
  };
  
  return {
    id: generateCGCode(), // 使用CG码作为ID
    purchase_code: generateCGCode(),
    product_name: `${quality}${material}${product_type.type}`,
    product_type: productTypeMapping[product_type.type] || 'LOOSE_BEADS',
    quality: qualityMapping[quality] || 'B',
    quantity: quantity,
    weight: parseFloat(weight),
    unit_price: unit_price,
    total_price: total_price,
    purchase_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 最近30天内
    notes: `${quality}品质${material}${product_type.type}，重量${weight}克，数量${quantity}${product_type.type === '散珠' ? '颗' : product_type.type === '手串' ? '条' : '件'}`,
    photos: JSON.stringify([`https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(material + product_type.type)}&image_size=square`]),
    status: 'ACTIVE',
    userId: 'cmf8h3g8p0000tupgq4gcrfw0' // 系统管理员用户ID
  };
}

async function generatePurchaseData() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.create_connection(dbConfig);
    
    console.log('开始生成100个采购记录...');
    
    const purchaseRecords = [];
    for (let i = 0; i < 100; i++) {
      purchaseRecords.push(generatePurchaseRecord());
    }
    
    // 批量插入采购记录
    const insertQuery = `
      INSERT INTO purchases (
        id, purchase_code, product_name, product_type, quantity, weight, 
        unit_price, total_price, quality, purchase_date, notes, photos, 
        status, createdAt, updatedAt, userId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
    `;
    
    let success_count = 0;
    let errorCount = 0;
    
    for (const record of purchaseRecords) {
        try {
          await connection.execute(insertQuery, [
            record.id,
            record.purchase_code,
            record.product_name,
            record.product_type,
            record.quantity,
            record.weight,
            record.unit_price,
            record.total_price,
            record.quality,
            record.purchase_date,
            record.notes,
            record.photos,
            record.status,
            record.userId
          ]);
          successCount++;
          
          console.log(`✅ 成功创建采购记录: ${record.product_name}`);
        
        if (success_count % 20 === 0) {
          console.log(`已生成 ${ success_count } 条采购记录...`);
        }
        
      } catch (error) {
        console.error(`生成第 ${success_count + errorCount + 1} 条记录时出错:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n✅ 采购数据生成完成！`);
    console.log(`成功: ${ success_count } 条`);
    console.log(`失败: ${errorCount} 条`);
    
    // 显示生成的数据统计
    console.log('\n📊 生成数据统计:');
    const [typeStats] = await connection.execute(`
      SELECT product_type, COUNT(*) as count, SUM(total_price) as total_value
      FROM purchases 
      WHERE createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY product_type
    `);
    
    typeStats.for_each(stat => {
      console.log(`${stat.product_type}: ${stat.count}条, 总价值: ¥${stat.total_value}`);
    });
    
    const [qualityStats] = await connection.execute(`
      SELECT quality, COUNT(*) as count
      FROM purchases 
      WHERE createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY quality
    `);
    
    console.log('\n品相分布:');
    qualityStats.for_each(stat => {
      console.log(`${stat.quality}: ${stat.count}条`);
    });
    
    return { success_count, errorCount };
    
  } catch (error) {
    console.error('❌ 生成采购数据时出错:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePurchaseData()
    .then((result) => {
      console.log('\n🎉 采购数据生成脚本执行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

export { generatePurchaseData };