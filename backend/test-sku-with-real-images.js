import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 生成SKU编号
function generate_sku_code() {
  const timestamp = Date.now().to_string().slice(-6);
  const random = Math.floor(Math.random() * 1000).to_string().pad_start(3, '0');
  return `SKU${timestamp}${random}`;
}

// 解析图片数据
function parseImages(images) {
  if (!images) return [];
  
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      return Array.is_array(parsed) ? parsed : [parsed];
    } catch (e) {
      return [images];
    }
  }
  
  return Array.is_array(images) ? images : [];
}

async function testSkuCreationWithRealImages() {
  try {
    console.log('=== 使用真实图片测试SKU创建 ===\n');
    
    // 获取有真实图片的原材料（前3个）
    const products = await prisma.product.find_many({
      take: 3,
      select: {
        id: true,
        name: true,
        images: true,
        unit_price: true
      },
      where: {
        images: {
          contains: 'unsplash.com'
        }
      }
    });
    
    console.log(`找到 ${products.length} 个有真实图片的原材料\n`);
    
    if (products.length === 0) {
      console.log('❌ 没有找到有真实图片的原材料');
      return;
    }
    
    // 获取用户ID
    const user = await prisma.user.find_first();
    if (!user) {
      console.log('❌ 没有找到用户');
      return;
    }
    
    // 测试直接转化模式
    console.log('=== 测试直接转化模式 ===');
    const product1 = products[0];
    const product1Images = parseImages(product1.images);
    
    console.log(`原材料: ${product1.name}`);
    console.log(`原材料图片: ${JSON.stringify(product1Images)}`);
    
    const sku1 = await prisma.product_sku.create({
      data: {
        sku_code: generate_sku_code(),
        sku_name: `${product1.name} - 直接转化SKU`,
        material_signature_hash: 'test-hash-1',
        materialSignature: { mode: 'DIRECT_CONVERSION', materials: [product1.id] },
        total_quantity: 5,
        available_quantity: 5,
        unit_price: Number(product1.unit_price || 0) * 1.5 || 50,
        totalValue: (Number(product1.unit_price || 0) * 1.5 || 50) * 5,
        selling_price: Number(product1.unit_price || 0) * 1.5 || 50,
        profit_margin: 50.0,
        status: 'ACTIVE',
        creator: { connect: { id: user.id } },
        photos: product1Images // 继承原材料图片
      }
    });
    
    console.log(`✅ 创建SKU: ${sku1.sku_name}`);
    console.log(`SKU图片: ${sku1.photos}`);
    console.log('');
    
    // 测试组合制作模式
    if (products.length >= 2) {
      console.log('=== 测试组合制作模式 ===');
      const product2 = products[1];
      const product3 = products[2] || products[1];
      
      const product2Images = parseImages(product2.images);
      const product3Images = parseImages(product3.images);
      
      // 组合图片（去重）
      const combinedImages = [...new Set([...product2Images, ...product3Images])].slice(0, 3);
      
      console.log(`原材料1: ${product2.name}`);
      console.log(`原材料1图片: ${JSON.stringify(product2Images)}`);
      console.log(`原材料2: ${product3.name}`);
      console.log(`原材料2图片: ${JSON.stringify(product3Images)}`);
      console.log(`组合后图片: ${JSON.stringify(combinedImages)}`);
      
      // 计算价格（确保不是NaN）
      const basePrice = Number(product2.unit_price || 0) + Number(product3.unit_price || 0);
      const finalPrice = basePrice > 0 ? basePrice * 1.3 : 100; // 如果价格为0，设置默认价格
      
      const sku2 = await prisma.product_sku.create({
        data: {
          sku_code: generate_sku_code(),
          sku_name: `${product2.name} + ${product3.name} - 组合SKU`,
          material_signature_hash: 'test-hash-2',
          materialSignature: { mode: 'COMBINATION_CRAFTING', materials: [product2.id, product3.id] },
          total_quantity: 3,
          available_quantity: 3,
          unit_price: finalPrice,
          totalValue: finalPrice * 3,
          selling_price: finalPrice,
          profit_margin: 30.0,
          status: 'ACTIVE',
          creator: { connect: { id: user.id } },
          photos: combinedImages // 组合图片
        }
      });
      
      console.log(`✅ 创建SKU: ${sku2.sku_name}`);
      console.log(`SKU图片: ${sku2.photos}`);
      console.log('');
    }
    
    console.log('=== 测试完成 ===');
    console.log('现在可以在前端查看这些SKU的图片显示效果');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSkuCreationWithRealImages();