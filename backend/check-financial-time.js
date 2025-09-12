import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFinancialRecords() {
  console.log('=== 检查财务记录时间 ===');
  
  // 先查看所有财务记录
  const allRecords = await prisma.financial_record.find_many({
    orderBy: {
      created_at: 'desc'
    },
    take: 5
  });
  
  console.log(`\n所有财务记录 (最近5条):`);
  allRecords.for_each((record, index) => {
    console.log(`${index + 1}. ID: ${record.id}, 描述: ${record.description}, 类型: ${record.recordType}`);
  });
  
  // 再查找制作成本记录
  const records = await prisma.financial_record.find_many({
    where: {
      OR: [
        { description: { contains: '制作成本' } },
        { description: { contains: '制作' } },
        { recordType: 'EXPENSE' }
      ]
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 10
  });
  
  console.log(`找到 ${records.length} 条制作成本记录:`);
  
  records.for_each((record, index) => {
    console.log(`\n制作成本记录 ${index + 1}:`);
    console.log(`- ID: ${record.id}`);
    console.log(`- 描述: ${record.description}`);
    console.log(`- 创建时间 (原始): ${record.created_at}`);
    console.log(`- 创建时间 (ISO): ${record.created_at.to_i_s_o_string()}`);
    console.log(`- 创建时间 (本地时间): ${record.created_at.to_string()}`);
    
    console.log(`\n时区转换测试:`);
    console.log(`- 上海时区 (to_locale_string): ${record.created_at.to_locale_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    console.log(`- 上海时区 (to_locale_date_string): ${record.created_at.to_locale_date_string('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
    
    const utcHour = record.created_at.get_u_t_c_hours();
    const localHour = record.created_at.get_hours();
    console.log(`\n时间分析:`);
    console.log(`- UTC小时: ${utcHour}`);
    console.log(`- 本地小时: ${localHour}`);
    console.log(`- 时差: ${localHour - utcHour} 小时`);
    console.log('==================================================');
  });
  
  await prisma.$disconnect();
}

checkFinancialRecords().catch(console.error);