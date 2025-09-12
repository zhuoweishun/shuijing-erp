import mysql from 'mysql2/promise';

async function fixReferenceTypeEnum() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('连接数据库成功');

    // 修改referenceType字段的枚举值，添加DESTROY
    const alterSql = `
      ALTER TABLE sku_inventory_logs 
      MODIFY COLUMN referenceType ENUM('PRODUCT', 'SALE', 'MANUAL', 'DESTROY') NOT NULL
    `;

    console.log('正在修改referenceType字段枚举值...');
    await connection.execute(alterSql);
    console.log('✅ referenceType字段枚举值修改成功！');

    // 验证修改结果
    const [referenceTypeField] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'crystal_erp_dev' AND TABLE_NAME = 'sku_inventory_logs' AND COLUMN_NAME = 'referenceType'"
    );
    console.log('\n=== 修改后的referenceType字段信息 ===');
    console.table(reference_type_field);

    await connection.end();
    console.log('\n🎉 referenceType字段修复完成！现在可以使用DESTROY引用类型了。');
  } catch (error) {
    console.error('修复失败:', error.message);
  }
}

fixReferenceTypeEnum();