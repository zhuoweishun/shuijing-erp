import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testTimezone() {
  try {
    console.log('=== 时区测试 ===\n');
    
    // 1. 测试当前时间
    const now = new Date();
    console.log('当前时间测试:');
    console.log('- 系统时间 (本地):', now.to_string());
    console.log('- 系统时间 (ISO):', now.to_i_s_o_string());
    console.log('- 上海时区格式化:', now.to_locale_string('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    }));
    
    // 2. 创建一个测试财务记录
    console.log('\n=== 创建测试财务记录 ===');
    
    // 获取第一个用户ID
    const user = await prisma.user.find_first();
    if (!user) {
      console.log('没有找到用户，无法创建测试记录');
      return;
    }
    
    // 创建一个制作成本记录
    const testRecord = await prisma.financial_record.create({
      data: {
        recordType: 'EXPENSE',
        amount: 100.50,
        description: '制作成本 - 时区测试记录',
        referenceType: 'MANUAL',
        category: 'manufacturing',
        transactionDate: now,
        notes: '这是一个时区测试记录',
        userId: user.id
      }
    });
    
    console.log('创建的测试记录:');
    console.log('- ID:', testRecord.id);
    console.log('- 描述:', testRecord.description);
    console.log('- 创建时间 (原始):', testRecord.created_at);
    console.log('- 创建时间 (ISO):', testRecord.created_at.to_i_s_o_string());
    console.log('- 创建时间 (上海时区):', testRecord.created_at.to_locale_string('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit', 
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    }));
    
    console.log('- 交易时间 (原始):', testRecord.transactionDate);
    console.log('- 交易时间 (ISO):', testRecord.transactionDate.to_i_s_o_string());
    console.log('- 交易时间 (上海时区):', testRecord.transactionDate.to_locale_string('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Shanghai'
    }));
    
    // 3. 模拟前端formatDate函数
    console.log('\n=== 模拟前端formatDate函数 ===');
    const format_date = (date_string) => {
      const date = new Date(date_string);
      return date.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
    };
    
    console.log('前端formatDate结果:');
    console.log('- created_at:', format_date(testRecord.created_at));
    console.log('- transactionDate:', format_date(testRecord.transactionDate));
    
    // 4. 检查时区偏移
    console.log('\n=== 时区偏移分析 ===');
    const utcHour = testRecord.created_at.get_u_t_c_hours();
    const localHour = testRecord.created_at.get_hours();
    console.log('- UTC小时:', utcHour);
    console.log('- 本地小时:', localHour);
    console.log('- 时差:', localHour - utcHour, '小时');
    
    // 5. 清理测试数据
    console.log('\n=== 清理测试数据 ===');
    await prisma.financial_record.delete({
      where: { id: testRecord.id }
    });
    console.log('测试记录已删除');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTimezone();