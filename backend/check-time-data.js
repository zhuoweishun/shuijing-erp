import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('🔍 检查采购记录的时间...');
    const [purchases] = await connection.execute(`
      SELECT id, product_name, purchase_date, createdAt 
      FROM purchases 
      ORDER BY purchaseDate DESC 
      LIMIT 10
    `);
    
    purchases.for_each((p, i) => {
      const purchase_date = new Date(p.purchase_date);
      const created_at = new Date(p.created_at);
      const now = new Date();
      
      console.log(`${i+1}. ${p.product_name}`);
      console.log(`   采购时间: ${purchase_date.to_locale_string('zh-CN')} ${purchase_date > now ? '⚠️ 未来时间!' : ''}`);
      console.log(`   创建时间: ${created_at.to_locale_string('zh-CN')} ${created_at > now ? '⚠️ 未来时间!' : ''}`);
      console.log('');
    });

    console.log('🔍 检查SKU制作记录的时间...');
    const [skus] = await connection.execute(`
      SELECT id, sku_name, createdAt 
      FROM product_skus 
      ORDER BY createdAt DESC 
      LIMIT 10
    `);
    
    skus.for_each((s, i) => {
      const created_at = new Date(s.created_at);
      const now = new Date();
      
      console.log(`${i+1}. ${s.sku_name}`);
      console.log(`   制作时间: ${created_at.to_locale_string('zh-CN')} ${created_at > now ? '⚠️ 未来时间!' : ''}`);
      console.log('');
    });

    console.log('🔍 当前系统时间:');
    console.log(`   ${new Date().to_locale_string('zh-CN')}`);

    await connection.end();
  } catch (error) {
    console.error('错误:', error);
  }
})();