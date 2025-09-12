import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllTables() {
  try {
    console.log('=== 数据库表结构检查 ===\n');
    
    // 检查purchases表
    console.log('📋 purchases表结构:');
    const purchasesColumns = await prisma.$queryRaw`DESCRIBE purchases`;
    console.table(purchasesColumns);
    
    // 检查products表
    console.log('\n📦 products表结构:');
    const productsColumns = await prisma.$queryRaw`DESCRIBE products`;
    console.table(productsColumns);
    
    // 检查users表
    console.log('\n👤 users表结构:');
    const usersColumns = await prisma.$queryRaw`DESCRIBE users`;
    console.table(usersColumns);
    
    // 检查customers表
    console.log('\n🛒 customers表结构:');
    const customersColumns = await prisma.$queryRaw`DESCRIBE customers`;
    console.table(customersColumns);
    
    // 检查customer_purchases表
    console.log('\n🛍️ customer_purchases表结构:');
    const customerPurchasesColumns = await prisma.$queryRaw`DESCRIBE customer_purchases`;
    console.table(customerPurchasesColumns);
    
  } catch (error) {
    console.error('查询数据库表结构失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTables();