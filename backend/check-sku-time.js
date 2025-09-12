import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSkuTime() {
  try {
    console.log('=== 检查ProductSku表时间数据 ===\n');
    
    // 查找所有SKU记录
    const skus = await prisma.product_sku.find_many({
      orderBy: {
        created_at: 'desc'
      },
      take: 10
    });
    
    console.log(`找到 ${skus.length} 条SKU记录:\n`);
    
    if (skus.length === 0) {
      console.log('没有找到任何SKU记录');
      return;
    }
    
    skus.for_each((sku, index) => {
      console.log(`SKU记录 ${index + 1}:`);
      console.log(`- ID: ${sku.id}`);
      console.log(`- SKU名称: ${sku.sku_name}`);
      console.log(`- SKU编号: ${sku.sku_code}`);
      console.log(`- 创建时间 (原始): ${sku.created_at}`);
      console.log(`- 创建时间 (ISO): ${sku.created_at.to_i_s_o_string()}`);
      console.log(`- 创建时间 (上海时区): ${sku.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
      
      // 检查是否是9月9日的记录
      const shanghaiDate = sku.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      
      if (shanghaiDate.includes('2025/09/09')) {
        console.log(`⚠️  发现9月9日SKU记录！`);
      }
      
      // 计算制作成本
      const productionCost = Number(sku.labor_cost) + Number(sku.craft_cost);
      if (productionCost > 0) {
        const total_cost = productionCost * sku.total_quantity;
        console.log(`- 制作成本: 人工¥${Number(sku.labor_cost).to_fixed(2)} + 工艺¥${Number(sku.craft_cost).to_fixed(2)} × ${sku.total_quantity}件 = ¥${totalCost.to_fixed(2)}`);
      }
      
      console.log('\n' + '-'.repeat(50) + '\n');
    });
    
    // 专门查找9月9日的SKU记录
    console.log('=== 查找9月9日的SKU记录 ===\n');
    
    const sept9Skus = skus.filter(sku => {
      const shanghaiDate = sku.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      return shanghaiDate.includes('2025/09/09');
    });
    
    if (sept9Skus.length > 0) {
      console.log(`找到 ${sept9Skus.length} 条9月9日的SKU记录:`);
      sept9Skus.for_each((sku, index) => {
        console.log(`${index + 1}. ${sku.sku_name} (${sku.sku_code}) - ${sku.created_at.to_locale_string('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai'
        })}`);
      });
      
      console.log('\n⚠️  这些9月9日的SKU记录会在财务流水账中显示为制作成本！');
      console.log('需要将这些记录的时间修改为9月8日18点前。');
    } else {
      console.log('没有找到9月9日的SKU记录');
    }
    
    // 模拟财务流水账中的制作成本记录
    console.log('\n=== 模拟财务流水账中的制作成本记录 ===\n');
    
    const productionTransactions = [];
    skus.for_each(sku => {
      const productionCost = Number(sku.labor_cost) + Number(sku.craft_cost);
      if (productionCost > 0) {
        productionTransactions.push({
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
        });
      }
    });
    
    console.log(`生成 ${productionTransactions.length} 条制作成本流水记录:`);
    productionTransactions.for_each((transaction, index) => {
      console.log(`${index + 1}. ${transaction.description} - ¥${transaction.amount.to_fixed(2)} - ${transaction.created_at.to_locale_string('zh-CN', {
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

checkSkuTime();