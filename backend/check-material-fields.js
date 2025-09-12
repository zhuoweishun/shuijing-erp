import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMaterialFields() {
  try {
    console.log('=== 检查purchases表中的material/product相关字段 ===\n');
    
    // 查询purchases表的所有字段
    const allColumns = await prisma.$queryRaw`DESCRIBE purchases`;
    
    // 过滤出包含material或product的字段
    const materialFields = allColumns.filter(col => 
      col.Field.to_lower_case().includes('material') || 
      col.Field.to_lower_case().includes('product')
    );
    
    console.log('purchases表中material/product相关字段:');
    console.table(materialFields);
    
    // 显示所有字段名
    console.log('\n所有字段名:');
    allColumns.for_each((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMaterialFields();