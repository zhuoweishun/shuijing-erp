const { query } = require('./config/database');
require('dotenv').config();

async function checkDatabaseData() {
  try {
    console.log('🔍 检查数据库中的数据...');
    console.log('================================\n');
    
    // 检查purchases表
    console.log('📦 检查采购数据 (purchases表):');
    const purchasesCount = await query('SELECT COUNT(*) as count FROM purchases');
    console.log(`总记录数: ${purchasesCount[0].count}`);
    
    if (purchasesCount[0].count > 0) {
      console.log('\n最近的5条采购记录:');
      const recentPurchases = await query(`
        SELECT id, supplier, crystal_type, weight, price, quality, 
               DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
               user_id, created_by
        FROM purchases 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      recentPurchases.forEach((purchase, index) => {
        console.log(`${index + 1}. ID: ${purchase.id}`);
        console.log(`   供应商: ${purchase.supplier || '未设置'}`);
        console.log(`   水晶类型: ${purchase.crystal_type || '未设置'}`);
        console.log(`   重量: ${purchase.weight || 0}g`);
        console.log(`   价格: ¥${purchase.price || 0}`);
        console.log(`   质量: ${purchase.quality || '未设置'}`);
        console.log(`   创建时间: ${purchase.created_at || '未设置'}`);
        console.log(`   用户ID: ${purchase.user_id || '未设置'}`);
        console.log(`   创建者: ${purchase.created_by || '未设置'}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ 采购表中没有数据');
    }
    
    console.log('\n================================\n');
    
    // 检查products表
    console.log('🎨 检查产品数据 (products表):');
    const productsCount = await query('SELECT COUNT(*) as count FROM products');
    console.log(`总记录数: ${productsCount[0].count}`);
    
    if (productsCount[0].count > 0) {
      console.log('\n最近的5条产品记录:');
      const recentProducts = await query(`
        SELECT id, product_name, category, raw_material, weight, 
               cost, selling_price, status,
               DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
               user_id
        FROM products 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      recentProducts.forEach((product, index) => {
        console.log(`${index + 1}. ID: ${product.id}`);
        console.log(`   产品名称: ${product.product_name || '未设置'}`);
        console.log(`   分类: ${product.category || '未设置'}`);
        console.log(`   原材料: ${product.raw_material || '未设置'}`);
        console.log(`   重量: ${product.weight || 0}g`);
        console.log(`   成本: ¥${product.cost || 0}`);
        console.log(`   售价: ¥${product.selling_price || 0}`);
        console.log(`   状态: ${product.status || '未设置'}`);
        console.log(`   创建时间: ${product.created_at || '未设置'}`);
        console.log(`   用户ID: ${product.user_id || '未设置'}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ 产品表中没有数据');
    }
    
    console.log('\n================================\n');
    
    // 检查用户表
    console.log('👥 检查用户数据 (user_profiles表):');
    const usersCount = await query('SELECT COUNT(*) as count FROM user_profiles');
    console.log(`总用户数: ${usersCount[0].count}`);
    
    if (usersCount[0].count > 0) {
      const users = await query(`
        SELECT id, username, email, full_name, role,
               DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
        FROM user_profiles 
        ORDER BY created_at DESC
      `);
      
      console.log('\n用户列表:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. 用户名: ${user.username}`);
        console.log(`   邮箱: ${user.email}`);
        console.log(`   姓名: ${user.full_name}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   创建时间: ${user.created_at}`);
        console.log('   ---');
      });
    }
    
    console.log('\n================================\n');
    
    // 数据统计总结
    console.log('📊 数据统计总结:');
    console.log(`- 采购记录: ${purchasesCount[0].count} 条`);
    console.log(`- 产品记录: ${productsCount[0].count} 条`);
    console.log(`- 用户记录: ${usersCount[0].count} 条`);
    
    if (purchasesCount[0].count === 0 && productsCount[0].count === 0) {
      console.log('\n🤔 分析结果:');
      console.log('数据库中没有采购和产品数据，这可能是因为:');
      console.log('1. 之前的测试数据在表结构修复时丢失了');
      console.log('2. 数据存储在不同的表中');
      console.log('3. 需要重新录入测试数据');
      console.log('\n建议: 可以重新录入一些测试数据来验证系统功能。');
    } else {
      console.log('\n✅ 数据库中有数据，如果前端显示为空，可能是权限或查询条件问题。');
    }
    
  } catch (error) {
    console.error('❌ 检查数据库数据失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDatabaseData()
    .then(() => {
      console.log('\n数据检查完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据检查失败:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseData };