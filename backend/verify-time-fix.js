import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTimeFix() {
  try {
    console.log('=== 验证时间显示修复 ===\n');
    
    // 1. 检查数据库中的原始时间数据
    console.log('1. 检查数据库原始时间数据:');
    const purchases = await prisma.purchase.find_many({
      where: {
        product_name: {
          contains: '草莓晶'
        }
      },
      orderBy: {
        purchase_date: 'desc'
      },
      take: 3
    });
    
    purchases.for_each((purchase, index) => {
      console.log(`   采购记录 ${index + 1}:`);
      console.log(`   - 产品: ${purchase.product_name}`);
      console.log(`   - 数据库时间: ${purchase.purchase_date}`);
      console.log(`   - JavaScript Date: ${new Date(purchase.purchase_date)}`);
      console.log(`   - 上海时区格式化: ${new Date(purchase.purchase_date).to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
      console.log('');
    });
    
    // 2. 检查财务记录时间
    console.log('2. 检查财务记录时间:');
    const financialRecords = await prisma.financial_record.find_many({
      where: {
        description: {
          contains: '草莓晶'
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 3
    });
    
    if (financialRecords.length > 0) {
      financialRecords.for_each((record, index) => {
        console.log(`   财务记录 ${index + 1}:`);
        console.log(`   - 描述: ${record.description}`);
        console.log(`   - 数据库时间: ${record.created_at}`);
        console.log(`   - JavaScript Date: ${new Date(record.created_at)}`);
        console.log(`   - 上海时区格式化: ${new Date(record.created_at).to_locale_string('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai'
        })}`);
        console.log('');
      });
    } else {
      console.log('   没有找到相关财务记录');
    }
    
    // 3. 验证时区转换
    console.log('3. 时区转换验证:');
    const testDate = new Date('2025-09-08T15:52:50.000Z'); // UTC时间
    console.log(`   UTC时间: ${testDate.to_i_s_o_string()}`);
    console.log(`   本地时间: ${testDate.to_string()}`);
    console.log(`   上海时区 (to_locale_string): ${testDate.to_locale_string('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    })}`);
    console.log(`   上海时区 (to_locale_date_string): ${testDate.to_locale_date_string('zh-CN', {
      timeZone: 'Asia/Shanghai'
    })}`);
    
    console.log('\n=== 修复验证完成 ===');
    console.log('如果上海时区格式化显示 "2025/09/08 23:52"，说明修复成功');
    console.log('如果仍显示其他时间，说明还需要进一步调试');
    
  } catch (error) {
    console.error('验证过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTimeFix();