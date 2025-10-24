import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSuppliersTable() {
  try {
    console.log('=== 供应商表(suppliers)详细信息 ===\n');

    // 1. 查询表结构信息
    console.log('📋 1. 表结构信息:');
    const tableInfo = await prisma.$queryRaw`
      DESCRIBE suppliers
    `;
    
    console.log('字段详情:');
    console.table(tableInfo);

    // 2. 查询当前供应商记录数量
    console.log('\n📊 2. 数据统计:');
    const totalCount = await prisma.supplier.count();
    const activeCount = await prisma.supplier.count({
      where: { is_active: true }
    });
    const inactiveCount = await prisma.supplier.count({
      where: { is_active: false }
    });

    console.log(`总供应商数量: ${totalCount}`);
    console.log(`活跃供应商数量: ${activeCount}`);
    console.log(`非活跃供应商数量: ${inactiveCount}`);

    // 3. 查询索引信息
    console.log('\n🔍 3. 索引信息:');
    const indexInfo = await prisma.$queryRaw`
      SHOW INDEX FROM suppliers
    `;
    console.table(indexInfo);

    // 4. 查询外键关系
    console.log('\n🔗 4. 外键关系:');
    const foreignKeys = await prisma.$queryRaw`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'suppliers' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `;
    
    if (foreignKeys.length > 0) {
      console.table(foreignKeys);
    } else {
      console.log('该表没有外键约束');
    }

    // 5. 查询引用此表的外键
    console.log('\n📎 5. 被其他表引用的关系:');
    const referencingTables = await prisma.$queryRaw`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE REFERENCED_TABLE_NAME = 'suppliers'
    `;
    
    if (referencingTables.length > 0) {
      console.table(referencingTables);
    } else {
      console.log('没有其他表引用此表');
    }

    // 6. 查询一些示例数据
    console.log('\n📝 6. 示例数据 (前5条):');
    const sampleData = await prisma.supplier.findMany({
      take: 5,
      orderBy: { created_at: 'desc' }
    });
    
    if (sampleData.length > 0) {
      console.table(sampleData.map(supplier => ({
        ID: supplier.id,
        名称: supplier.name,
        联系人: supplier.contact || '无',
        电话: supplier.phone || '无',
        邮箱: supplier.email || '无',
        是否活跃: supplier.is_active ? '是' : '否',
        创建时间: supplier.created_at.toISOString().split('T')[0]
      })));
    } else {
      console.log('暂无供应商数据');
    }

    // 7. 查询供应商使用统计
    console.log('\n📈 7. 供应商使用统计:');
    const supplierUsage = await prisma.$queryRaw`
      SELECT 
        s.name as supplier_name,
        COUNT(p.id) as purchase_count,
        COUNT(m.id) as material_count
      FROM suppliers s
      LEFT JOIN purchases p ON s.id = p.supplier_id
      LEFT JOIN materials m ON s.id = m.supplier_id
      WHERE s.is_active = 1
      GROUP BY s.id, s.name
      ORDER BY purchase_count DESC, material_count DESC
      LIMIT 10
    `;
    
    if (supplierUsage.length > 0) {
      console.table(supplierUsage);
    } else {
      console.log('暂无使用统计数据');
    }

  } catch (error) {
    console.error('查询供应商表信息时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuppliersTable();