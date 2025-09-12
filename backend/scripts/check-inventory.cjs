const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkInventory() {
  // 从DATABASE_URL解析数据库配置
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:ZWSloveWCC123@localhost:3306/crystal_erp_dev';
  const url = new URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1)
  });

  try {
    console.log('🔍 检查当前库存情况...');
    
    // 检查原材料库存
    console.log('\n📦 原材料库存情况:');
    const [purchases] = await connection.execute(`
      SELECT 
        p.id,
        p.purchaseCode,
        p.productName,
        p.productType,
        p.quality,
        p.specification,
        p.quantity,
        p.status,
        s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplierId = s.id
      WHERE p.status = 'ACTIVE'
      ORDER BY p.productType, p.productName
    `);
    
    purchases.forEach((purchase, index) => {
      console.log(`${index + 1}. ${purchase.productName} (${purchase.productType})`);
      console.log(`   规格: ${purchase.specification}`);
      console.log(`   品质: ${purchase.quality || 'UNKNOWN'}`);
      console.log(`   库存数量: ${purchase.quantity}`);
      console.log(`   状态: ${purchase.status}`);
      console.log(`   供应商: ${purchase.supplier_name}`);
      console.log(`   采购编号: ${purchase.purchaseCode}`);
      console.log('');
    });
    
    // 检查现有SKU
    console.log('\n🎯 现有SKU情况:');
    const [skus] = await connection.execute(`
      SELECT 
        ps.id,
        ps.skuCode,
        ps.skuName,
        ps.totalQuantity,
        ps.availableQuantity,
        ps.sellingPrice,
        ps.materialCost,
        ps.createdAt
      FROM product_skus ps
      ORDER BY ps.createdAt DESC
    `);
    
    skus.forEach((sku, index) => {
      console.log(`${index + 1}. ${sku.skuName} (${sku.skuCode})`);
      console.log(`   库存: ${sku.availableQuantity}/${sku.totalQuantity}`);
      console.log(`   售价: ¥${sku.sellingPrice} | 成本: ¥${sku.materialCost}`);
      console.log(`   创建时间: ${sku.createdAt}`);
      console.log('');
    });
    
    // 检查客户数量
    console.log('\n👥 客户情况:');
    const [customerCount] = await connection.execute(`
      SELECT COUNT(*) as total_customers FROM customers
    `);
    console.log(`总客户数: ${customerCount[0].total_customers}`);
    
    // 检查购买记录
    const [purchaseCount] = await connection.execute(`
      SELECT COUNT(*) as total_purchases FROM customer_purchases
    `);
    console.log(`总购买记录: ${purchaseCount[0].total_purchases}`);
    
    console.log('\n✅ 库存检查完成');
    
  } catch (error) {
    console.error('❌ 检查库存时出错:', error);
  } finally {
    await connection.end();
  }
}

checkInventory();