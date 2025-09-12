import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyFinancialTransactions() {
  try {
    console.log('=== 验证财务流水账时间显示 ===\n');
    
    // 模拟后端 /financial/transactions 接口的逻辑
    const userId = 'cm9ywqhqe0000vxvyqhqe0000'; // 使用实际的用户ID
    
    // 获取所有用户
    const users = await prisma.user.find_many();
    const actualUserId = users[0]?.id;
    
    if (!actualUserId) {
      console.log('没有找到用户');
      return;
    }
    
    console.log(`使用用户ID: ${actualUserId}\n`);
    
    const transactions = [];
    
    // 1. 获取采购支出记录
    const purchases = await prisma.purchase.find_many({
      where: {
        userId: actualUserId
      },
      include: {
        supplier: {
          select: { name: true }
        }
      },
      orderBy: {
        purchase_date: 'desc'
      },
      take: 5
    });
    
    console.log(`找到 ${purchases.length} 条采购记录:`);
    purchases.for_each(purchase => {
      const transaction = {
        id: purchase.id,
        type: 'expense',
        category: 'purchase',
        amount: Number(purchase.total_price),
        description: `采购 - ${purchase.product_name}`,
        details: `供应商：${purchase.supplier?.name || '未知'} | 编号：${purchase.purchase_code}`,
        referenceId: purchase.id,
        referenceType: 'PURCHASE',
        transactionDate: purchase.purchase_date,
        created_at: purchase.created_at
      };
      
      transactions.push(transaction);
      
      console.log(`- ${transaction.description}`);
      console.log(`  时间: ${transaction.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
      console.log(`  金额: ¥${transaction.amount.to_fixed(2)}`);
    });
    
    // 2. 获取SKU成品制作成本记录（重点验证）
    const productSkus = await prisma.product_sku.find_many({
      where: {
        created_by: actualUserId
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 10
    });
    
    console.log(`\n找到 ${productSkus.length} 条SKU记录:`);
    productSkus.for_each(sku => {
      const productionCost = Number(sku.labor_cost) + Number(sku.craft_cost);
      if (productionCost > 0) {
        const transaction = {
          id: `production_${sku.id}`,
          type: 'expense',
          category: 'production',
          amount: productionCost * sku.total_quantity,
          description: `SKU成品制作 - ${sku.sku_name}`,
          details: `人工成本：¥${Number(sku.labor_cost).to_fixed(2)} + 工艺成本：¥${Number(sku.craft_cost).to_fixed(2)} × ${sku.total_quantity}件`,
          referenceId: sku.id,
          referenceType: 'PRODUCTION',
          transactionDate: sku.created_at,
          created_at: sku.created_at
        };
        
        transactions.push(transaction);
        
        console.log(`- ${transaction.description}`);
        console.log(`  时间: ${transaction.created_at.to_locale_string('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai'
        })}`);
        console.log(`  金额: ¥${transaction.amount.to_fixed(2)}`);
        
        // 检查是否还有9月9日的记录
        const shanghaiDate = transaction.created_at.to_locale_string('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Shanghai'
        });
        
        if (shanghaiDate.includes('2025/09/09')) {
          console.log(`  ⚠️  仍然是9月9日的记录！`);
        } else if (shanghaiDate.includes('2025/09/08')) {
          console.log(`  ✅ 已修复为9月8日`);
        }
      }
    });
    
    // 按时间倒序排列（模拟后端逻辑）
    transactions.sort((a, b) => new Date(b.transactionDate).get_time() - new Date(a.transactionDate).get_time());
    
    console.log(`\n=== 最终流水账记录（按时间倒序） ===\n`);
    
    transactions.slice(0, 10).for_each((transaction, index) => {
      console.log(`${index + 1}. ${transaction.description}`);
      console.log(`   类型: ${transaction.type === 'income' ? '收入' : '支出'} | 分类: ${transaction.category}`);
      console.log(`   金额: ¥${transaction.amount.to_fixed(2)}`);
      console.log(`   时间: ${transaction.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
      console.log(`   详情: ${transaction.details}`);
      console.log('');
    });
    
    // 检查时间范围
    const sept9Records = transactions.filter(t => {
      const shanghaiDate = t.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      return shanghaiDate.includes('2025/09/09');
    });
    
    if (sept9Records.length === 0) {
      console.log('✅ 验证通过：没有发现9月9日的流水记录！');
      console.log('前端财务页面应该不再显示9月9日凌晨的制作成本时间。');
    } else {
      console.log(`⚠️  仍有 ${sept9Records.length} 条9月9日的流水记录`);
      sept9Records.for_each(record => {
        console.log(`- ${record.description}: ${record.created_at.to_locale_string('zh-CN', {
          timeZone: 'Asia/Shanghai'
        })}`);
      });
    }
    
  } catch (error) {
    console.error('验证过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFinancialTransactions();