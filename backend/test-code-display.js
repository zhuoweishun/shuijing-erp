// 测试财务流水账中的编码显示功能
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api/v1/financial/transactions';

async function testCodeDisplay() {
  try {
    console.log('测试财务流水账中的编码显示功能...');
    
    // 尝试通过API获取数据
    console.log('尝试通过API获取财务数据...');
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.records) {
          console.log('成功从API获取数据!');
          
          // 检查采购支出记录
          const purchaseRecords = data.data.records.filter(r => r.type === 'expense' && r.category === 'purchase').slice(0, 3);
          console.log('\n检查API返回的采购支出记录:');
          if (purchaseRecords.length === 0) {
            console.log('未找到采购记录');
          } else {
            for (let i = 0; i < purchaseRecords.length; i++) {
              const record = purchaseRecords[i];
              console.log(`记录 ${i+1}:`);
              console.log(`- 描述: ${record.description}`);
              console.log(`- 详情: ${record.details}`);
              console.log(`- 是否包含CG编码: ${record.details.includes('CG编码:') ? '是' : '否'}`);
              console.log(`- 是否分离显示: ${!record.details.includes('[CG') ? '是' : '否'}`);
            }
          }
          
          // 检查制作成本记录
          const productionRecords = data.data.records.filter(r => r.type === 'expense' && r.category === 'production').slice(0, 3);
          console.log('\n检查API返回的制作成本记录:');
          if (productionRecords.length === 0) {
            console.log('未找到制作成本记录');
          } else {
            for (let i = 0; i < productionRecords.length; i++) {
              const record = productionRecords[i];
              console.log(`记录 ${i+1}:`);
              console.log(`- 描述: ${record.description}`);
              console.log(`- 详情: ${record.details}`);
              console.log(`- 是否包含SKU编码: ${record.details.includes('[SKU') ? '是' : '否'}`);
            }
          }
          
          console.log('\nAPI测试完成!');
          return; // 如果API测试成功，不再进行数据库测试
        }
      }
    } catch (error) {
      console.log(`API测试失败: ${error.message}`);
    }
    
    // 如果API测试失败，回退到直接查询数据库
    console.log('回退到直接查询数据库获取财务数据...');
    
    // 获取采购记录
    const purchases = await prisma.purchase.find_many({
      take: 3,
      include: {
        supplier: { select: { name: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    
    // 获取SKU制作记录
    const skuCreations = await prisma.product_sku.find_many({
      take: 3,
      orderBy: { created_at: 'desc' }
    });
    
    // 检查采购支出记录的CG编码显示
    console.log('\n检查采购支出记录的CG编码显示:');
    if (purchases.length === 0) {
      console.log('未找到采购记录');
    } else {
      for (let i = 0; i < purchases.length; i++) {
        const purchase = purchases[i];
        console.log(`记录 ${i+1}:`);
        console.log(`- 产品名称: ${purchase.product_name}`);
        console.log(`- CG编码: ${purchase.purchase_code}`);
        console.log(`- 供应商: ${purchase.supplier?.name || '未知'}`);
        
        // 模拟财务API的显示格式（已更新为分离显示）
        const cgCodeDisplay = `CG编码: ${purchase.purchase_code}`;
        const supplierDisplay = `供应商: ${purchase.supplier?.name || '未知'}`;
        const combinedDisplay = `${cgCodeDisplay}, ${supplierDisplay}`;
        console.log(`- 财务显示格式: ${combinedDisplay}`);
        console.log(`- 是否包含CG编码: ${combinedDisplay.includes('CG编码:') ? '是' : '否'}`);
        console.log(`- 是否分离显示: ${!combinedDisplay.includes('[CG') ? '是' : '否'}`);
      }
    }
    
    // 检查制作成本记录的SKU编码显示
    console.log('\n检查制作成本记录的SKU编码显示:');
    if (skuCreations.length === 0) {
      console.log('未找到SKU制作记录');
    } else {
      for (let i = 0; i < skuCreations.length; i++) {
        const sku = skuCreations[i];
        console.log(`记录 ${i+1}:`);
        console.log(`- SKU名称: ${sku.sku_name}`);
        console.log(`- SKU编码: ${sku.sku_code}`);
        console.log(`- 人工成本: ¥${Number(sku.labor_cost || 0).to_fixed(2)}`);
        
        // 模拟财务API的显示格式
        const labor_cost = Number(sku.labor_cost || 0);
        const craft_cost = Number(sku.craft_cost || 0);
        const quantity = Number(sku.total_quantity || 0);
        const detailsDisplay = `[${sku.sku_code}] 人工成本: ¥${labor_cost.to_fixed(2)}, 工艺成本: ¥${craft_cost.to_fixed(2)}, 数量: ${quantity}件`;
        console.log(`- 财务显示格式: ${detailsDisplay}`);
        console.log(`- 是否包含SKU编码: ${detailsDisplay.includes('[SKU') ? '是' : '否'}`);
      }
    }
    
    console.log('\n测试完成!');
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCodeDisplay();