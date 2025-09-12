import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 生成SKU编号
function generate_sku_code() {
  const today = new Date();
  const dateStr = today.to_i_s_o_string().slice(0, 10).replace(/-/g, '');
  const timestamp = Date.now().to_string().slice(-6); // 使用时间戳后6位确保唯一性
  const randomNum = Math.floor(Math.random() * 100).to_string().pad_start(2, '0');
  return `SKU${dateStr}${timestamp}${randomNum}`;
}

// 生成测试图片URL
function generateTestImageUrl() {
  const colors = ['purple', 'white', 'black', 'green', 'pink', 'blue', 'red', 'yellow'];
  const shapes = ['round', 'oval', 'square', 'heart'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${color}"/><text x="100" y="100" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="white">${shape} 珠子</text></svg>`).to_string('base64')}`;
}

// 生成组合风格图片URL
function generateComboImageUrl(materialNames) {
  const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
  const selectedColors = colors.slice(0, Math.min(materialNames.length, 3));
  
  // 创建渐变色的组合图片
  const gradientStops = selectedColors.map((color, index) => {
    const percent = (index / (selectedColors.length - 1)) * 100;
    return `<stop offset="${percent}%" style="stop-color:${color};stop-opacity:1" />`;
  }).join('');
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <defs>
        <linearGradient id="comboGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          ${gradientStops}
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#comboGrad)"/>
      <text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">组合手串</text>
      <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="10" fill="white">${materialNames.slice(0, 2).join('+')}</text>
      <text x="100" y="125" text-anchor="middle" font-family="Arial" font-size="10" fill="white">${materialNames.length}种原材料</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).to_string('base64')}`;
}

// 生成原材料标识签名
function generate_material_signature(materialUsages) {
  return materialUsages.map(usage => ({
    purchase_id: usage.purchase_id,
    quantity_used_beads: usage.quantity_used_beads || 0,
    quantity_used_pieces: usage.quantity_used_pieces || 0
  })).sort((a, b) => a.purchase_id.locale_compare(b.purchase_id));
}

// 生成原材料标识哈希
function generateMaterialSignatureHash(signature) {
  const signatureString = JSON.stringify(signature);
  return crypto.create_hash('md5').update(signatureString).digest('hex');
}

// 直接转化模式：1:1对应成品原材料
async function createDirectTransformSku(purchase, quantity, tx) {
  console.log(`\n🔄 直接转化模式 - ${purchase.purchase_code} ${purchase.product_name}`);
  
  // 计算成本
  const material_cost = (purchase.unit_price || 0) * quantity;
  const labor_cost = 15.00; // 固定人工成本
  const craft_cost = 8.00;  // 固定工艺成本
  const total_cost = materialCost + laborCost + craftCost;
  
  // 设置合理的销售价格（成本的1.5-2.5倍）
  const profitMultiplier = 1.5 + Math.random(); // 1.5-2.5倍
  const selling_price = Math.round(totalCost * profitMultiplier * 100) / 100;
  
  // 生成SKU编号
  const sku_code = generate_sku_code();
  
  // 处理图片继承逻辑
  let productImages = null;
  if (purchase.photos) {
    try {
      // 如果原材料有图片，直接继承
      if (typeof purchase.photos === 'string') {
        // 如果是字符串，尝试解析为JSON
        try {
          const parsed = JSON.parse(purchase.photos);
          if (Array.is_array(parsed) && parsed.length > 0) {
            productImages = JSON.stringify(parsed);
            console.log(`   📸 继承原材料图片: ${parsed.length}张`);
          }
        } catch (e) {
          // 如果解析失败，可能是单个URL字符串
          if (purchase.photos.startsWith('http') || purchase.photos.startsWith('data:')) {
            productImages = JSON.stringify([purchase.photos]);
            console.log(`   📸 继承原材料图片: 1张`);
          }
        }
      } else if (Array.is_array(purchase.photos) && purchase.photos.length > 0) {
        productImages = JSON.stringify(purchase.photos);
        console.log(`   📸 继承原材料图片: ${purchase.photos.length}张`);
      }
    } catch (error) {
      console.log(`   ⚠️  图片处理失败: ${error.message}`);
    }
  }
  
  // 如果没有原材料图片，使用占位图
  if (!productImages) {
    productImages = JSON.stringify([generateTestImageUrl()]);
    console.log(`   🖼️  使用占位图片`);
  }
  
  // 创建MaterialUsage记录
  const materialUsageData = {
    id: crypto.random_u_u_i_d(),
    purchase_id: purchase.id,
    quantity_used_beads: purchase.product_type === 'LOOSE_BEADS' || purchase.product_type === 'BRACELET' ? quantity : 0,
    quantity_used_pieces: purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED' ? quantity : 0,
    unitCost: purchase.unit_price || 0,
    total_cost: material_cost
  };
  
  // 生成原材料标识
  const materialSignature = generate_material_signature([materialUsageData]);
  const material_signature_hash = generateMaterialSignatureHash(materialSignature);
  
  // 检查是否已存在相同配方的SKU
  const existingSku = await tx.product_sku.find_first({
    where: { material_signature_hash }
  });
  
  if (existingSku) {
    console.log(`   ⚠️  相同配方SKU已存在: ${existingSku.sku_code}，跳过创建`);
    return null;
  }
  
  // 创建Product记录
  const product = await tx.product.create({
    data: {
      id: crypto.random_u_u_i_d(),
      name: `${purchase.product_name}成品`,
      description: `直接转化自${purchase.product_name}的精美成品`,
      unit: '件',
      quantity: quantity,
      unit_price: sellingPrice,
      totalValue: sellingPrice * quantity,
      images: productImages,
      userId: 'cmf8h3g8p0000tupgq4gcrfw0' // 默认用户ID
    }
  });
  
  // 创建MaterialUsage记录
  await tx.material_usage.create({
    data: {
      ...materialUsageData,
      productId: product.id
    }
  });
  
  // 创建SKU记录
  const sku = await tx.product_sku.create({
    data: {
      id: crypto.random_u_u_i_d(),
      sku_code,
      sku_name: `${purchase.product_name}成品`,
      materialSignatureHash,
      materialSignature: JSON.stringify(materialSignature),
      total_quantity: quantity,
      available_quantity: quantity,
      unit_price: sellingPrice,
      totalValue: sellingPrice * quantity,
      photos: productImages,
      description: `直接转化自${purchase.product_name}，图片和规格自动继承`,
      specification: `${purchase.bead_diameter || purchase.specification || '标准'}mm`,
      materialCost,
      laborCost,
      craftCost,
      totalCost,
      sellingPrice,
      profit_margin: ((selling_price - totalCost) / sellingPrice * 100),
      status: 'ACTIVE',
      created_by: 'cmf8h3g8p0000tupgq4gcrfw0'
    }
  });
  
  // 关联Product到SKU
  await tx.product.update({
    where: { id: product.id },
    data: { sku_id: sku.id }
  });
  
  console.log(`   ✅ SKU创建成功: ${ sku_code } - 数量: ${quantity} - 售价: ¥${ selling_price }`);
  return sku;
}

// 组合制作模式：可选择散珠、手串、配件三种产品类型
async function createComboSku(materials, quantity, tx) {
  console.log(`\n🧩 组合制作模式 - 使用${materials.length}种原材料`);
  
  let totalMaterialCost = 0;
  const materialUsages = [];
  const materialNames = [];
  
  // 计算每种原材料的使用量和成本
  for (const material of materials) {
    const needQuantity = Math.floor(Math.random() * 3) + 1; // 1-3个单位
    const cost = (material.unit_price || 0) * needQuantity;
    totalMaterialCost += cost;
    
    materialNames.push(material.product_name);
    
    const materialUsageData = {
      id: crypto.random_u_u_i_d(),
      purchase_id: material.id,
      quantity_used_beads: material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? needQuantity : 0,
      quantity_used_pieces: material.product_type === 'ACCESSORIES' || material.product_type === 'FINISHED' ? needQuantity : 0,
      unitCost: material.unit_price || 0,
      total_cost: cost
    };
    
    materialUsages.push(materialUsageData);
    console.log(`   📦 ${material.product_name}: ${needQuantity}个单位, 成本: ¥${cost.to_fixed(2)}`);
  }
  
  // 计算总成本
  const labor_cost = 25.00; // 组合制作人工成本更高
  const craft_cost = 15.00; // 组合制作工艺成本更高
  const total_cost = totalMaterialCost + laborCost + craftCost;
  
  // 设置合理的销售价格
  const profitMultiplier = 1.8 + Math.random() * 0.7; // 1.8-2.5倍
  const selling_price = Math.round(totalCost * profitMultiplier * 100) / 100;
  
  // 生成SKU编号
  const sku_code = generate_sku_code();
  
  // 生成原材料标识
  const materialSignature = generate_material_signature(materialUsages);
  const material_signature_hash = generateMaterialSignatureHash(materialSignature);
  
  // 检查是否已存在相同配方的SKU
  const existingSku = await tx.product_sku.find_first({
    where: { material_signature_hash }
  });
  
  if (existingSku) {
    console.log(`   ⚠️  相同配方SKU已存在: ${existingSku.sku_code}，跳过创建`);
    return null;
  }
  
  // 处理组合模式的图片逻辑
  let productImages = null;
  const collectedImages = [];
  
  // 从所有原材料中收集图片
  for (const material of materials) {
    if (material.photos) {
      try {
        if (typeof material.photos === 'string') {
          // 如果是字符串，尝试解析为JSON
          try {
            const parsed = JSON.parse(material.photos);
            if (Array.is_array(parsed)) {
              collectedImages.push(...parsed.filter(url => url && (url.startsWith('http') || url.startsWith('data:'))));
            }
          } catch (e) {
            // 如果解析失败，可能是单个URL字符串
            if (material.photos.startsWith('http') || material.photos.startsWith('data:')) {
              collectedImages.push(material.photos);
            }
          }
        } else if (Array.is_array(material.photos)) {
          collectedImages.push(...material.photos.filter(url => url && (url.startsWith('http') || url.startsWith('data:'))));
        }
      } catch (error) {
        console.log(`   ⚠️  处理${material.product_name}图片失败: ${error.message}`);
      }
    }
  }
  
  // 选择图片策略
  if (collectedImages.length > 0) {
    // 去重并最多选择3张图片
    const uniqueImages = [...new Set(collectedImages)];
    const selectedImages = uniqueImages.slice(0, 3);
    productImages = JSON.stringify(selectedImages);
    console.log(`   📸 组合原材料图片: 从${materials.length}种原材料收集到${uniqueImages.length}张图片，选择${selectedImages.length}张`);
  } else {
    // 如果没有原材料图片，生成组合风格的占位图
    const comboImageUrl = generateComboImageUrl(materialNames);
    productImages = JSON.stringify([comboImageUrl]);
    console.log(`   🎨 生成组合风格图片`);
  }
  
  // 创建Product记录
  const product = await tx.product.create({
    data: {
      id: crypto.random_u_u_i_d(),
      name: `${materialNames.slice(0, 2).join('+')}组合手串`,
      description: `由${materialNames.join('、')}等${materials.length}种原材料组合制作的精美手串`,
      unit: '件',
      quantity: quantity,
      unit_price: sellingPrice,
      totalValue: sellingPrice * quantity,
      images: productImages,
      userId: 'cmf8h3g8p0000tupgq4gcrfw0'
    }
  });
  
  // 创建MaterialUsage记录
  for (const materialUsage of materialUsages) {
    await tx.material_usage.create({
      data: {
        ...material_usage,
        productId: product.id
      }
    });
  }
  
  // 创建SKU记录
  const sku = await tx.product_sku.create({
    data: {
      id: crypto.random_u_u_i_d(),
      sku_code,
      sku_name: `${materialNames.slice(0, 2).join('+')}组合手串`,
      materialSignatureHash,
      materialSignature: JSON.stringify(materialSignature),
      total_quantity: quantity,
      available_quantity: quantity,
      unit_price: sellingPrice,
      totalValue: sellingPrice * quantity,
      photos: productImages,
      description: `由${materials.length}种原材料组合制作，配比随意设定`,
      specification: '8-14mm混合',
      material_cost: totalMaterialCost,
      laborCost,
      craftCost,
      totalCost,
      sellingPrice,
      profit_margin: ((selling_price - totalCost) / sellingPrice * 100),
      status: 'ACTIVE',
      created_by: 'cmf8h3g8p0000tupgq4gcrfw0'
    }
  });
  
  // 关联Product到SKU
  await tx.product.update({
    where: { id: product.id },
    data: { sku_id: sku.id }
  });
  
  console.log(`   ✅ SKU创建成功: ${ sku_code } - 数量: ${quantity} - 售价: ¥${ selling_price }`);
  console.log(`   💰 总成本: ¥${totalCost.to_fixed(2)}, 利润率: ${((selling_price - totalCost) / sellingPrice * 100).to_fixed(1)}%`);
  return sku;
}

async function create50Skus() {
  try {
    console.log('🎯 开始创建50种不同数量的SKU...');
    
    // 获取可用的采购记录
    const purchases = await prisma.purchase.find_many({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        product_type: true,
        total_beads: true,
        piece_count: true,
        unit_price: true,
        bead_diameter: true,
        specification: true
      }
    });
    
    if (purchases.length === 0) {
      console.log('❌ 没有找到可用的采购记录');
      return;
    }
    
    console.log(`📦 找到 ${purchases.length} 条可用采购记录`);
    
    const createdSkus = [];
    const stats = {
      directTransform: 0,
      combo: 0,
      skipped: 0,
      total_cost: 0,
      totalRevenue: 0
    };
    
    // 创建50个SKU
    for (let i = 0; i < 50; i++) {
      await prisma.$transaction(async (tx) => {
        const quantity = Math.floor(Math.random() * 20) + 1; // 1-20件
        const useDirectTransform = Math.random() < 0.6; // 60%概率使用直接转化模式
        
        let sku = null;
        
        if (useDirectTransform) {
          // 直接转化模式：随机选择一个采购记录
          const randomPurchase = purchases[Math.floor(Math.random() * purchases.length)];
          sku = await createDirectTransformSku(randomPurchase, quantity, tx);
          if (sku) stats.directTransform++;
        } else {
          // 组合制作模式：随机选择2-4种原材料
          const materialCount = Math.floor(Math.random() * 3) + 2; // 2-4种原材料
          const selected_materials = [];
          const usedIndices = new Set();
          
          for (let j = 0; j < materialCount && j < purchases.length; j++) {
            let randomIndex;
            do {
              randomIndex = Math.floor(Math.random() * purchases.length);
            } while (usedIndices.has(random_index));
            
            usedIndices.add(random_index);
            selectedMaterials.push(purchases[randomIndex]);
          }
          
          sku = await createComboSku(selected_materials, quantity, tx);
          if (sku) stats.combo++;
        }
        
        if (sku) {
          createdSkus.push(sku);
          stats.total_cost += Number(sku.total_cost || 0);
          stats.totalRevenue += Number(sku.totalValue || 0);
        } else {
          stats.skipped++;
        }
      });
      
      // 添加小延迟避免重复的随机数
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // 输出统计报告
    console.log('\n📊 SKU制作完成统计报告:');
    console.log('=' .repeat(50));
    console.log(`✅ 成功创建SKU: ${createdSkus.length} 个`);
    console.log(`🔄 直接转化模式: ${stats.directTransform} 个`);
    console.log(`🧩 组合制作模式: ${stats.combo} 个`);
    console.log(`⚠️  跳过重复配方: ${stats.skipped} 个`);
    console.log(`💰 总成本: ¥${stats.total_cost.to_fixed(2)}`);
    console.log(`💵 总价值: ¥${stats.totalRevenue.to_fixed(2)}`);
    console.log(`📈 预期利润: ¥${(stats.totalRevenue - stats.total_cost).to_fixed(2)}`);
    console.log(`📊 平均利润率: ${((stats.totalRevenue - stats.total_cost) / stats.totalRevenue * 100).to_fixed(1)}%`);
    
    console.log('\n🎯 制作模式使用情况:');
    console.log(`直接转化模式: ${(stats.directTransform / createdSkus.length * 100).to_fixed(1)}%`);
    console.log(`组合制作模式: ${(stats.combo / createdSkus.length * 100).to_fixed(1)}%`);
    
    console.log('\n📋 创建的SKU列表:');
    createdSkus.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_code} - ${sku.sku_name} - 数量: ${sku.total_quantity} - 售价: ¥${sku.selling_price}`);
    });
    
    console.log('\n✅ 50种SKU制作任务完成！');
    
  } catch (error) {
    console.error('❌ SKU制作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

create50Skus();