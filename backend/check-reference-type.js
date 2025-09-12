import mysql from 'mysql2/promise';

async function checkReferenceType() {
  try {
    const connection = await mysql.create_connection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });

    console.log('连接数据库成功');

    // 查看referenceType字段的详细信息
    const [referenceTypeField] = await connection.execute(
      "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'crystal_erp_dev' AND TABLE_NAME = 'sku_inventory_logs' AND COLUMN_NAME = 'referenceType'"
    );
    console.log('\n=== referenceType字段详细信息 ===');
    console.table(reference_type_field);

    // 查看当前表中的referenceType值
    const [referenceTypeValues] = await connection.execute(
      'SELECT DISTINCT referenceType FROM sku_inventory_logs ORDER BY referenceType'
    );
    console.log('\n=== 当前表中的referenceType值 ===');
    console.table(reference_type_values);

    await connection.end();
  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

checkReferenceType();