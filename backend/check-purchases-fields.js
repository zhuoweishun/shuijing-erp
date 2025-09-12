import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPurchasesFields() {
  try {
    console.log('=== 检查purchases表字段命名规范 ===\n');
    
    // 查询purchases表的所有字段
    const columns = await prisma.$queryRaw`DESCRIBE purchases`;
    
    console.log('purchases表所有字段:');
    columns.for_each((col, index) => {
      const isSnakeCase = col.Field.includes('_');
      const isCamelCase = /[a-z][A-Z]/.test(col.Field);
      let naming = 'unknown';
      
      if (isSnakeCase) naming = 'snake_case';
      else if (isCamelCase) naming = 'camelCase';
      else naming = 'simple';
      
      console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${naming}`);
    });
    
    // 统计命名规范
    const snakeCaseFields = columns.filter(col => col.Field.includes('_'));
    const camelCaseFields = columns.filter(col => /[a-z][A-Z]/.test(col.Field));
    const simpleFields = columns.filter(col => !col.Field.includes('_') && !/[a-z][A-Z]/.test(col.Field));
    
    console.log('\n=== 字段命名统计 ===');
    console.log(`蛇形命名 (snake_case): ${snakeCaseFields.length}个`);
    snakeCaseFields.for_each(col => console.log(`  - ${col.Field}`));
    
    console.log(`\n驼峰命名 (camel_case): ${camelCaseFields.length}个`);
    camelCaseFields.for_each(col => console.log(`  - ${col.Field}`));
    
    console.log(`\n简单命名: ${simpleFields.length}个`);
    simpleFields.for_each(col => console.log(`  - ${col.Field}`));
    
    // 检查materialType字段
    const materialField = columns.find(col => 
      col.Field === 'material_type' || col.Field === 'material_type'
    );
    
    console.log('\n=== 材料类型字段检查 ===');
    if (materialField) {
      console.log(`✅ 找到材料类型字段: ${materialField.Field} (${materialField.Type})`);
    } else {
      console.log('❌ 未找到materialType或material_type字段');
    }
    
    console.log('\n=== 国际数据库命名规范 ===');
    console.log('📚 SQL标准推荐: snake_case (蛇形命名)');
    console.log('  - 字段名全小写');
    console.log('  - 单词间用下划线分隔');
    console.log('  - 例如: user_id, created_at, material_type');
    console.log('\n🏢 各数据库系统:');
    console.log('  - Postgre_s_q_l: 推荐 snake_case');
    console.log('  - My_s_q_l: 推荐 snake_case');
    console.log('  - Oracle: 传统使用 UPPER_CASE');
    console.log('  - SQL Server: 支持多种，但推荐 snake_case');
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPurchasesFields();