import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseTime() {
  try {
    console.log('=== 检查数据库时间数据 ===\n');
    
    // 检查所有采购记录
    const purchases = await prisma.purchase.find_many({
      orderBy: {
        purchase_date: 'desc'
      },
      take: 3
    });
    
    if (purchases.length > 0) {
      console.log(`找到 ${purchases.length} 条采购记录:\n`);
      
      purchases.for_each((purchase, index) => {
        console.log(`采购记录 ${index + 1}:`);
        console.log('- ID:', purchase.id);
        console.log('- 产品名称:', purchase.product_name);
        console.log('- 采购日期 (原始):', purchase.purchase_date);
        console.log('- 采购日期 (ISO):', purchase.purchase_date.to_i_s_o_string());
        console.log('- 采购日期 (本地时间):', purchase.purchase_date.to_string());
        
        console.log('\n时区转换测试:');
        console.log('- 上海时区 (to_locale_string):', purchase.purchase_date.to_locale_string('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai'
        }));
        
        console.log('- 上海时区 (to_locale_date_string):', purchase.purchase_date.to_locale_date_string('zh-CN', {
          timeZone: 'Asia/Shanghai'
        }));
        
        // 检查是否是UTC时间存储
        const utcHour = purchase.purchase_date.get_u_t_c_hours();
        const localHour = purchase.purchase_date.get_hours();
        console.log('\n时间分析:');
        console.log('- UTC小时:', utcHour);
        console.log('- 本地小时:', localHour);
        console.log('- 时差:', localHour - utcHour, '小时');
        console.log('\n' + '='.repeat(50) + '\n');
      });
      
      // 分析时间存储模式
      const firstRecord = purchases[0];
      const utcHour = firstRecord.purchase_date.get_u_t_c_hours();
      const localHour = firstRecord.purchase_date.get_hours();
      
      if (Math.abs(localHour - utcHour) === 8) {
        console.log('\n✅ 确认: 数据库存储的是UTC时间，本地时间比UTC时间晚8小时');
        console.log('这意味着如果用户在15:52录入数据，存储为UTC 07:52，显示时转换为15:52');
        console.log('但如果存储为UTC 15:52，显示时会转换为23:52');
        console.log('\n问题分析: 数据录入时可能没有正确处理时区转换');
      }
    } else {
      console.log('没有找到任何采购记录');
    }
    
    // 检查财务记录
    console.log('\n=== 检查财务记录时间 ===\n');
    const financialRecords = await prisma.financial_record.find_many({
      orderBy: {
        created_at: 'desc'
      },
      take: 2
    });
    
    if (financialRecords.length > 0) {
      financialRecords.for_each((record, index) => {
        console.log(`财务记录 ${index + 1}:`);
        console.log('- 描述:', record.description);
        console.log('- 创建时间 (原始):', record.created_at);
        console.log('- 上海时区格式化:', record.created_at.to_locale_string('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai'
        }));
        console.log('');
      });
    } else {
      console.log('没有找到财务记录');
    }
    
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseTime();