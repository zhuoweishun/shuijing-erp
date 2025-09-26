import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test_purchase_history_fix() {
  try {
    console.log('🔍 测试客户购买历史字段修复效果...');
    
    // 查找测试客户
    const customer = await prisma.customers.findFirst({
      where: {
        phone: '13333333333'
      }
    });
    
    if (!customer) {
      console.log('❌ 未找到测试客户');
      return;
    }
    
    console.log('👤 找到测试客户:', customer.name);
    
    // 测试购买历史查询（模拟API调用）
    const purchases = await prisma.customerPurchases.findMany({
      where: { customer_id: customer.id },
      skip: 0,
      take: 10,
      orderBy: { purchase_date: 'desc' },
      include: {
        product_skus: {
          select: {
            sku_code: true,
            sku_name: true,
            specification: true
          }
        }
      }
    });
    
    console.log(`\n🛒 购买历史记录 (${purchases.length}条):`);
    
    purchases.forEach((purchase, index) => {
      console.log(`\n  ${index + 1}. 购买记录:`);
      console.log(`     - ID: ${purchase.id}`);
      console.log(`     - SKU名称: ${purchase.sku_name || '未设置'}`);
      console.log(`     - 关联SKU名称: ${purchase.product_skus?.sku_name || '未关联'}`);
      console.log(`     - SKU编码: ${purchase.product_skus?.sku_code || '未关联'}`);
      console.log(`     - 规格: ${purchase.product_skus?.specification || '无'}`);
      console.log(`     - 购买时间: ${purchase.purchase_date || '未设置'}`);
      console.log(`     - 销售渠道: ${purchase.sale_channel || '未设置'}`);
      console.log(`     - 数量: ${purchase.quantity}`);
      console.log(`     - 单价: ¥${purchase.unit_price}`);
      console.log(`     - 总价: ¥${purchase.total_price}`);
      console.log(`     - 原价: ¥${purchase.original_price || '未设置'}`);
      console.log(`     - 状态: ${purchase.status}`);
    });
    
    // 验证字段完整性
    console.log('\n📋 字段完整性检查:');
    const issues = [];
    
    purchases.forEach((purchase, index) => {
      if (!purchase.sku_name && !purchase.product_skus?.sku_name) {
        issues.push(`记录${index + 1}: 缺少SKU名称`);
      }
      if (!purchase.product_skus?.sku_code) {
        issues.push(`记录${index + 1}: 缺少SKU编码`);
      }
      if (!purchase.purchase_date) {
        issues.push(`记录${index + 1}: 缺少购买时间`);
      }
    });
    
    if (issues.length === 0) {
      console.log('✅ 所有字段完整，修复成功!');
    } else {
      console.log('❌ 发现问题:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // 测试前端字段访问逻辑
    console.log('\n🎯 前端字段访问测试:');
    purchases.forEach((purchase, index) => {
      console.log(`\n  记录${index + 1}前端显示效果:`);
      
      // 模拟前端字段访问
      const sku_name = purchase.sku_name || purchase.product_skus?.sku_name || '未知商品';
      const sku_code = purchase.product_skus?.sku_code || '暂无';
      const specification = purchase.product_skus?.specification || '无';
      const purchase_date = purchase.purchase_date ? purchase.purchase_date.toLocaleString() : '暂无';
      
      console.log(`     - 商品名称: ${sku_name}`);
      console.log(`     - SKU编号: #${sku_code}`);
      console.log(`     - 规格: ${specification}`);
      console.log(`     - 购买时间: ${purchase_date}`);
      console.log(`     - 销售渠道: ${purchase.sale_channel || '未知'}`);
      
      // 检查是否还有"未知商品"、"暂无"等问题
      if (sku_name === '未知商品') {
        console.log('     ⚠️  商品名称显示为"未知商品"');
      }
      if (sku_code === '暂无') {
        console.log('     ⚠️  SKU编号显示为"暂无"');
      }
      if (purchase_date === '暂无') {
        console.log('     ⚠️  购买时间显示为"暂无"');
      }
    });
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test_purchase_history_fix();