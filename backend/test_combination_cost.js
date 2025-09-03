const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crystal_erp',
  port: process.env.DB_PORT || 3306
};

async function testCombinationCostCalculation() {
  let connection;
  
  try {
    console.log('🔗 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    // 1. 查询可用的原材料（用于组合制作）
    console.log('\n📋 查询可用原材料...');
    const [materials] = await connection.execute(`
      SELECT 
        p.id as purchase_id,
        p.productName,
        p.productType,
        p.pricePerBead,
        p.pricePerPiece,
        p.unitPrice,
        p.totalPrice,
        p.totalBeads,
        p.pieceCount,
        COALESCE(SUM(mu.quantityUsedBeads), 0) as usedBeads,
        COALESCE(SUM(mu.quantityUsedPieces), 0) as usedPieces,
        CASE 
          WHEN p.productType IN ('LOOSE_BEADS', 'BRACELET') THEN 
            GREATEST(0, COALESCE(p.totalBeads, 0) - COALESCE(SUM(mu.quantityUsedBeads), 0))
          WHEN p.productType IN ('ACCESSORIES', 'FINISHED') THEN 
            GREATEST(0, COALESCE(p.pieceCount, 0) - COALESCE(SUM(mu.quantityUsedPieces), 0))
          ELSE 0
        END as available_quantity
      FROM purchases p
      LEFT JOIN material_usages mu ON p.id = mu.purchaseId
      WHERE p.productType IN ('LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED')
      GROUP BY p.id
      HAVING available_quantity > 0
      ORDER BY p.productName
      LIMIT 5
    `);
    
    console.log(`找到 ${materials.length} 个可用原材料:`);
    materials.forEach((material, index) => {
      console.log(`${index + 1}. ${material.productName} (${material.productType})`);
      console.log(`   - 可用数量: ${material.available_quantity}`);
      console.log(`   - 每颗价格: ${material.pricePerBead || 'N/A'}`);
      console.log(`   - 每片价格: ${material.pricePerPiece || 'N/A'}`);
      console.log(`   - 单价: ${material.unitPrice || 'N/A'}`);
    });
    
    if (materials.length < 2) {
      console.log('❌ 需要至少2个可用原材料来测试组合制作模式');
      return;
    }
    
    // 2. 模拟组合制作成本计算
    console.log('\n🧮 模拟组合制作成本计算...');
    
    // 选择前两个原材料进行组合
    const material1 = materials[0];
    const material2 = materials[1];
    
    // 模拟使用数量
    const usedQuantity1 = material1.productType === 'LOOSE_BEADS' || material1.productType === 'BRACELET' ? 10 : 1;
    const usedQuantity2 = material2.productType === 'LOOSE_BEADS' || material2.productType === 'BRACELET' ? 5 : 1;
    
    console.log(`\n📦 组合材料:`);
    console.log(`1. ${material1.productName}: 使用 ${usedQuantity1} ${material1.productType === 'LOOSE_BEADS' || material1.productType === 'BRACELET' ? '颗' : '片/件'}`);
    console.log(`2. ${material2.productName}: 使用 ${usedQuantity2} ${material2.productType === 'LOOSE_BEADS' || material2.productType === 'BRACELET' ? '颗' : '片/件'}`);
    
    // 计算材料成本
    let materialCost1 = 0;
    let materialCost2 = 0;
    
    // 材料1成本计算
    if (material1.productType === 'LOOSE_BEADS' || material1.productType === 'BRACELET') {
      materialCost1 = usedQuantity1 * (Number(material1.pricePerBead) || 0);
    } else {
      materialCost1 = usedQuantity2 * (Number(material1.pricePerPiece) || 0);
    }
    
    // 如果价格为0，尝试其他字段
    if (materialCost1 === 0) {
      materialCost1 = usedQuantity1 * (Number(material1.unitPrice) || Number(material1.totalPrice) || 0);
    }
    
    // 材料2成本计算
    if (material2.productType === 'LOOSE_BEADS' || material2.productType === 'BRACELET') {
      materialCost2 = usedQuantity2 * (Number(material2.pricePerBead) || 0);
    } else {
      materialCost2 = usedQuantity2 * (Number(material2.pricePerPiece) || 0);
    }
    
    // 如果价格为0，尝试其他字段
    if (materialCost2 === 0) {
      materialCost2 = usedQuantity2 * (Number(material2.unitPrice) || Number(material2.totalPrice) || 0);
    }
    
    const totalMaterialCost = materialCost1 + materialCost2;
    const laborCost = 50; // 人工成本
    const craftCost = 100; // 工艺成本
    const totalCost = totalMaterialCost + laborCost + craftCost;
    const sellingPrice = 500; // 销售价格
    
    console.log(`\n💰 成本计算结果:`);
    console.log(`材料1成本: ¥${materialCost1.toFixed(2)}`);
    console.log(`材料2成本: ¥${materialCost2.toFixed(2)}`);
    console.log(`总材料成本: ¥${totalMaterialCost.toFixed(2)}`);
    console.log(`人工成本: ¥${laborCost.toFixed(2)}`);
    console.log(`工艺成本: ¥${craftCost.toFixed(2)}`);
    console.log(`总成本: ¥${totalCost.toFixed(2)}`);
    console.log(`销售价格: ¥${sellingPrice.toFixed(2)}`);
    
    // 3. 测试利润率计算公式
    console.log('\n📊 利润率计算测试...');
    
    // 正确的利润率公式
    const correctProfitMargin = sellingPrice > 0 
      ? ((sellingPrice - totalCost) / sellingPrice * 100)
      : 0;
    
    // 错误的利润率公式（之前的错误）
    const incorrectProfitMargin = totalCost > 0 
      ? ((sellingPrice - totalCost) / totalCost * 100)
      : 0;
    
    console.log(`正确的利润率公式: ((${sellingPrice} - ${totalCost}) / ${sellingPrice}) * 100 = ${correctProfitMargin.toFixed(2)}%`);
    console.log(`错误的利润率公式: ((${sellingPrice} - ${totalCost}) / ${totalCost}) * 100 = ${incorrectProfitMargin.toFixed(2)}%`);
    console.log(`差异: ${Math.abs(correctProfitMargin - incorrectProfitMargin).toFixed(2)}%`);
    
    // 4. 验证数据库中现有的SKU利润率
    console.log('\n🔍 检查数据库中现有SKU的利润率...');
    const [skus] = await connection.execute(`
      SELECT 
        skuCode,
        productName,
        sellingPrice,
        materialCost,
        laborCost,
        craftCost,
        totalCost,
        profitMargin,
        ((sellingPrice - totalCost) / sellingPrice * 100) as correct_profit_margin
      FROM product_skus 
      WHERE sellingPrice > 0 AND totalCost > 0
      ORDER BY createdAt DESC
      LIMIT 5
    `);
    
    console.log(`\n📋 最近5个SKU的利润率验证:`);
    skus.forEach((sku, index) => {
      const storedMargin = Number(sku.profitMargin);
      const calculatedMargin = Number(sku.correct_profit_margin);
      const difference = Math.abs(storedMargin - calculatedMargin);
      const isCorrect = difference < 0.1; // 允许0.1%的误差
      
      console.log(`${index + 1}. ${sku.productName} (${sku.skuCode})`);
      console.log(`   销售价格: ¥${sku.sellingPrice}`);
      console.log(`   总成本: ¥${sku.totalCost}`);
      console.log(`   存储的利润率: ${storedMargin.toFixed(2)}%`);
      console.log(`   正确的利润率: ${calculatedMargin.toFixed(2)}%`);
      console.log(`   差异: ${difference.toFixed(2)}% ${isCorrect ? '✅' : '❌'}`);
    });
    
    // 5. 测试制作数量大于1的情况
    console.log('\n🔢 测试制作数量大于1的成本计算...');
    const productionQuantity = 3;
    const scaledMaterialCost = totalMaterialCost * productionQuantity;
    const scaledLaborCost = laborCost * productionQuantity;
    const scaledCraftCost = craftCost * productionQuantity;
    const scaledTotalCost = scaledMaterialCost + scaledLaborCost + scaledCraftCost;
    const scaledSellingPrice = sellingPrice * productionQuantity;
    const scaledProfitMargin = scaledSellingPrice > 0 
      ? ((scaledSellingPrice - scaledTotalCost) / scaledSellingPrice * 100)
      : 0;
    
    console.log(`制作数量: ${productionQuantity} 个`);
    console.log(`总材料成本: ¥${scaledMaterialCost.toFixed(2)}`);
    console.log(`总人工成本: ¥${scaledLaborCost.toFixed(2)}`);
    console.log(`总工艺成本: ¥${scaledCraftCost.toFixed(2)}`);
    console.log(`总成本: ¥${scaledTotalCost.toFixed(2)}`);
    console.log(`总销售价格: ¥${scaledSellingPrice.toFixed(2)}`);
    console.log(`利润率: ${scaledProfitMargin.toFixed(2)}%`);
    
    console.log('\n✅ 组合制作模式成本和利润率计算测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行测试
testCombinationCostCalculation();