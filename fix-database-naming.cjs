const mysql = require('mysql2/promise');

async function fixDatabaseNaming() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ZWSloveWCC123',
      database: 'crystal_erp_dev'
    });
    
    console.log('开始修复数据库字段命名，统一使用蛇形命名..