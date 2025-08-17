const mysql = require('mysql2/promise');

// 测试远程MySQL服务器连接
const testConnections = async () => {
  const testConfigs = [
    // 测试远程服务器连接
    {
      name: '远程服务器 47.115.230.178:3307',
      config: {
        host: '47.115.230.178',
        port: 3307,
        user: 'erp_user',
        password: 'Aa123456',
        database: 'shuijing_erp',
        connectTimeout: 10000,
        acquireTimeout: 10000
      }
    }
  ];

  console.log('🔍 开始测试不同的MySQL连接地址...');
  console.log('=' .repeat(50));

  for (const test of testConfigs) {
    console.log(`\n📡 测试连接: ${test.name}`);
    console.log(`   地址: ${test.config.host}:${test.config.port}`);
    
    try {
      const connection = await mysql.createConnection(test.config);
      console.log(`✅ 连接成功!`);
      
      // 测试查询
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`   数据库查询成功，用户表记录数: ${rows[0].count}`);
      
      await connection.end();
      console.log(`   连接已关闭`);
      
    } catch (error) {
      console.log(`❌ 连接失败: ${error.message}`);
      if (error.code) {
        console.log(`   错误代码: ${error.code}`);
      }
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🏁 测试完成');
};

// 运行测试
testConnections().catch(console.error);