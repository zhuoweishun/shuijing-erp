import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkExistingRecords() {
  try {
    console.log('=== 检查现有财务记录 ===\n');
    
    // 查找所有财务记录
    const allRecords = await prisma.financial_record.find_many({
      orderBy: {
        created_at: 'desc'
      },
      take: 20
    });
    
    console.log(`找到 ${allRecords.length} 条财务记录:\n`);
    
    if (allRecords.length === 0) {
      console.log('没有找到任何财务记录');
      return;
    }
    
    allRecords.for_each((record, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`- ID: ${record.id}`);
      console.log(`- 描述: ${record.description}`);
      console.log(`- 类型: ${record.record_type}`);
      console.log(`- 金额: ${record.amount}`);
      console.log(`- 创建时间 (原始): ${record.created_at}`);
      console.log(`- 创建时间 (ISO): ${record.created_at.to_i_s_o_string()}`);
      console.log(`- 创建时间 (上海时区): ${record.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
      
      // 检查是否是9月9日的记录
      const shanghaiDate = record.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      
      if (shanghaiDate.includes('2025/09/09')) {
        console.log(`⚠️  发现9月9日记录！`);
      }
      
      console.log('\n' + '-'.repeat(50) + '\n');
    });
    
    // 专门查找9月9日的记录
    console.log('=== 查找9月9日的记录 ===\n');
    
    const sept9Records = allRecords.filter(record => {
      const shanghaiDate = record.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      return shanghaiDate.includes('2025/09/09');
    });
    
    if (sept9Records.length > 0) {
      console.log(`找到 ${sept9Records.length} 条9月9日的记录:`);
      sept9Records.for_each((record, index) => {
        console.log(`${index + 1}. ${record.description} - ${record.created_at.to_locale_string('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai'
        })}`);
      });
    } else {
      console.log('没有找到9月9日的记录');
    }
    
    // 检查MaterialUsage表
    console.log('\n=== 检查MaterialUsage表 ===\n');
    const materialUsages = await prisma.material_usage.find_many({
      orderBy: {
        created_at: 'desc'
      },
      take: 10,
      include: {
        purchase: true,
        product: true
      }
    });
    
    console.log(`找到 ${materialUsages.length} 条原材料使用记录:`);
    materialUsages.for_each((usage, index) => {
      console.log(`${index + 1}. 产品: ${usage.product?.name || 'N/A'}, 创建时间: ${usage.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
    });
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingRecords();