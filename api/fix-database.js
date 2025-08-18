const { query } = require('./config/database');
require('dotenv').config();

async function fixDatabaseTables() {
  try {
    console.log('开始修复数据库表结构...');
    
    // 检查并修复products表
    console.log('检查products表结构...');
    try {
      await query('SELECT user_id FROM products LIMIT 1');
      console.log('✅ products表已有user_id字段');
    } catch (error) {
      if (error.message.includes('Unknown column')) {
        console.log('添加user_id字段到products表...');
        await query('ALTER TABLE products ADD COLUMN user_id VARCHAR(36)');
        await query('ALTER TABLE products ADD INDEX idx_products_user_id (user_id)');
        console.log('✅ products表user_id字段添加成功');
      } else {
        throw error;
      }
    }
    
    // 检查并修复purchases表
    console.log('检查purchases表结构...');
    try {
      await query('SELECT user_id FROM purchases LIMIT 1');
      console.log('✅ purchases表已有user_id字段');
    } catch (error) {
      if (error.message.includes('Unknown column')) {
        console.log('添加user_id字段到purchases表...');
        await query('ALTER TABLE purchases ADD COLUMN user_id VARCHAR(36)');
        await query('ALTER TABLE purchases ADD INDEX idx_purchases_user_id (user_id)');
        console.log('✅ purchases表user_id字段添加成功');
      } else {
        throw error;
      }
    }
    
    // 检查并添加created_by字段到purchases表
    console.log('检查purchases表created_by字段...');
    try {
      await query('SELECT created_by FROM purchases LIMIT 1');
      console.log('✅ purchases表已有created_by字段');
    } catch (error) {
      if (error.message.includes('Unknown column')) {
        console.log('添加created_by字段到purchases表...');
        await query('ALTER TABLE purchases ADD COLUMN created_by VARCHAR(100)');
        console.log('✅ purchases表created_by字段添加成功');
      } else {
        throw error;
      }
    }
    
    // 确保products表有完整的字段结构
    console.log('检查products表完整结构...');
    const requiredProductFields = [
      { name: 'id', type: 'VARCHAR(36)' },
      { name: 'product_name', type: 'VARCHAR(255)' },
      { name: 'category', type: 'VARCHAR(100)' },
      { name: 'raw_material', type: 'VARCHAR(255)' },
      { name: 'weight', type: 'DECIMAL(10,2)' },
      { name: 'size', type: 'VARCHAR(100)' },
      { name: 'craft_time', type: 'INT' },
      { name: 'cost', type: 'DECIMAL(10,2)' },
      { name: 'selling_price', type: 'DECIMAL(10,2)' },
      { name: 'description', type: 'TEXT' },
      { name: 'photos', type: 'JSON' },
      { name: 'status', type: 'VARCHAR(50)' },
      { name: 'user_id', type: 'VARCHAR(36)' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];
    
    for (const field of requiredProductFields) {
      try {
        await query(`SELECT ${field.name} FROM products LIMIT 1`);
      } catch (error) {
        if (error.message.includes('Unknown column')) {
          console.log(`添加${field.name}字段到products表...`);
          if (field.name === 'created_at' || field.name === 'updated_at') {
            await query(`ALTER TABLE products ADD COLUMN ${field.name} ${field.type}`);
          } else {
            await query(`ALTER TABLE products ADD COLUMN ${field.name} ${field.type}`);
          }
          console.log(`✅ products表${field.name}字段添加成功`);
        }
      }
    }
    
    // 确保purchases表有完整的字段结构
    console.log('检查purchases表完整结构...');
    const requiredPurchaseFields = [
      { name: 'id', type: 'VARCHAR(36)' },
      { name: 'supplier', type: 'VARCHAR(255)' },
      { name: 'crystal_type', type: 'VARCHAR(100)' },
      { name: 'weight', type: 'DECIMAL(10,2)' },
      { name: 'price', type: 'DECIMAL(10,2)' },
      { name: 'quality', type: 'VARCHAR(50)' },
      { name: 'notes', type: 'TEXT' },
      { name: 'photos', type: 'JSON' },
      { name: 'quantity', type: 'INT' },
      { name: 'size', type: 'VARCHAR(100)' },
      { name: 'unit_price', type: 'DECIMAL(10,2)' },
      { name: 'bead_price', type: 'DECIMAL(10,2)' },
      { name: 'estimated_bead_count', type: 'INT' },
      { name: 'user_id', type: 'VARCHAR(36)' },
      { name: 'created_by', type: 'VARCHAR(100)' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];
    
    for (const field of requiredPurchaseFields) {
      try {
        await query(`SELECT ${field.name} FROM purchases LIMIT 1`);
      } catch (error) {
        if (error.message.includes('Unknown column')) {
          console.log(`添加${field.name}字段到purchases表...`);
          if (field.name === 'created_at' || field.name === 'updated_at') {
            await query(`ALTER TABLE purchases ADD COLUMN ${field.name} ${field.type}`);
          } else {
            await query(`ALTER TABLE purchases ADD COLUMN ${field.name} ${field.type}`);
          }
          console.log(`✅ purchases表${field.name}字段添加成功`);
        }
      }
    }
    
    console.log('\n🎉 数据库表结构修复完成!');
    console.log('现在可以正常使用API功能了。');
    
  } catch (error) {
    console.error('❌ 修复数据库表结构失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  fixDatabaseTables()
    .then(() => {
      console.log('数据库修复脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库修复脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { fixDatabaseTables };