import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 生成测试图片URL
const generateTestImageUrl = () => {
  const prompt = encodeURIComponent('beautiful crystal jewelry bracelet with purple amethyst beads and gold spacers, elegant design, high quality product photo')
  return `https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=square_hd`
}

// 生成SKU编号
const generate_sku_code = () => {
  const today = new Date()
  const dateStr = today.to_i_s_o_string().slice(0, 10).replace(/-/g, '')
  const randomNum = Math.floor(Math.random() * 1000).to_string().pad_start(3, '0')
  return `SKU${dateStr}${randomNum}`
}

async function createTestSku() {
  try {
    console.log('🎯 开始SKU制作测试...')
    
    // 选定的原材料（从之前的查看结果）
    const selected_materials = {
      scatteredBeads: [
        { id: 'cmf0mlzh6005rxwjxuxicmx0i', name: '紫水晶散珠', purchase_code: 'CG20250901858497', needQuantity: 2 },
        { id: 'cmf0mlzh6005sxwjxuxicmx0j', name: '紫水晶散珠', purchase_code: 'CG20250901489487', needQuantity: 2 }
      ],
      bracelets: [
        { id: 'cmf0mlzh6005txwjxuxicmx0k', name: '草莓晶手串', purchase_code: 'CG20250901862329', needQuantity: 6 }
      ],
      accessories: [
        { id: 'cmf0mlzh6005uxwjxuxicmx0l', name: '银隔珠', purchase_code: 'CG20250901502337', needQuantity: 1 },
        { id: 'cmf0mlzh6005vxwjxuxicmx0m', name: '金隔珠', purchase_code: 'CG20250901537757', needQuantity: 1 },
        { id: 'cmf0mlzh6005wxwjxuxicmx0n', name: '南红隔珠', purchase_code: 'CG20250901872225', needQuantity: 1 },
        { id: 'cmf0mlzh6005xxwjxuxicmx0o', name: '绿松石隔片', purchase_code: 'CG20250901161221', needQuantity: 1 },
        { id: 'cmf0mlzh6005yxwjxuxicmx0p', name: '镀金隔片', purchase_code: 'CG20250901345919', needQuantity: 1 }
      ]
    }
    
    // 首先获取实际的采购记录ID
    console.log('\n🔍 获取实际的采购记录...')
    const actualMaterials = {
      scatteredBeads: [],
      bracelets: [],
      accessories: []
    }
    
    // 获取散珠
    for (const material of selected_materials.scatteredBeads) {
      const purchase = await prisma.purchase.find_first({
        where: { purchase_code: material.purchase_code }
      })
      if (purchase) {
        actualMaterials.scatteredBeads.push({
          ...material,
          id: purchase.id,
          unit_price: purchase.price_per_bead
        })
        console.log(`✅ 找到散珠: ${material.name} (${material.purchase_code})`);
      } else {
        console.log(`❌ 未找到散珠: ${material.purchase_code}`);
      }
    }
    
    // 获取手串
    for (const material of selected_materials.bracelets) {
      const purchase = await prisma.purchase.find_first({
        where: { purchase_code: material.purchase_code }
      })
      if (purchase) {
        actualMaterials.bracelets.push({
          ...material,
          id: purchase.id,
          unit_price: purchase.price_per_bead
        })
        console.log(`✅ 找到手串: ${material.name} (${material.purchase_code})`);
      } else {
        console.log(`❌ 未找到手串: ${material.purchase_code}`);
      }
    }
    
    // 获取配件
    for (const material of selected_materials.accessories) {
      const purchase = await prisma.purchase.find_first({
        where: { purchase_code: material.purchase_code }
      })
      if (purchase) {
        actualMaterials.accessories.push({
          ...material,
          id: purchase.id,
          unit_price: purchase.price_per_piece
        })
        console.log(`✅ 找到配件: ${material.name} (${material.purchase_code})`);
      } else {
        console.log(`❌ 未找到配件: ${material.purchase_code}`);
      }
    }
    
    // 检查是否所有材料都找到了
    const total_materials = actualMaterials.scatteredBeads.length + 
                          actualMaterials.bracelets.length + 
                          actualMaterials.accessories.length
    
    if (totalMaterials < 8) {
      console.log(`❌ 只找到 ${ total_materials }/8 个原材料，无法继续测试`);
      return
    }
    
    console.log(`\n✅ 成功找到所有 ${ total_materials } 个原材料`);
    
    // 计算总成本
    let total_cost = 0
    const materialSignature = []
    
    actualMaterials.scatteredBeads.for_each(material => {
      const cost = (material.unit_price || 0) * material.needQuantity
      totalCost += cost
      materialSignature.push({
        purchase_id: material.id,
        product_name: material.name,
        quantity: material.needQuantity,
        unit_price: material.unit_price,
        total_cost: cost
      })
    })
    
    actualMaterials.bracelets.for_each(material => {
      const cost = (material.unit_price || 0) * material.needQuantity
      totalCost += cost
      materialSignature.push({
        purchase_id: material.id,
        product_name: material.name,
        quantity: material.needQuantity,
        unit_price: material.unit_price,
        total_cost: cost
      })
    })
    
    actualMaterials.accessories.for_each(material => {
      const cost = (material.unit_price || 0) * material.needQuantity
      totalCost += cost
      materialSignature.push({
        purchase_id: material.id,
        product_name: material.name,
        quantity: material.needQuantity,
        unit_price: material.unit_price,
        total_cost: cost
      })
    })
    
    console.log(`\n💰 总成本计算: ¥${totalCost.to_fixed(2)}`);
    
    // 生成SKU信息
    const sku_code = generate_sku_code()
    const sku_name = '紫水晶草莓晶组合手串'
    const selling_price = totalCost * 2.5 // 2.5倍利润率
    const initialQuantity = 2 // 初始生成2个库存
    
    console.log(`\n🎯 SKU信息:`);
    console.log(`   SKU编号: ${ sku_code }`);
    console.log(`   SKU名称: ${ sku_name }`);
    console.log(`   原材料成本: ¥${totalCost.to_fixed(2)}`);
    console.log(`   销售价格: ¥${selling_price.to_fixed(2)}`);
    console.log(`   初始库存: ${initialQuantity} 个`);
    
    // 获取用户ID（假设使用第一个用户）
    const user = await prisma.user.find_first()
    if (!user) {
      console.log('❌ 未找到用户，无法创建SKU');
      return
    }
    
    // 开始事务创建SKU
    console.log('\n🚀 开始创建SKU...');
    
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建SKU记录
      const sku = await tx.product_sku.create({
        data: {
          skuCode,
          sku_name,
          material_signature_hash: sku_code, // 简化处理
          materialSignature: materialSignature,
          total_quantity: initialQuantity,
          available_quantity: initialQuantity,
          unit_price: sellingPrice,
          totalValue: selling_price * initialQuantity,
          photos: [generateTestImageUrl()],
          description: `由${materialSignature.length}种原材料组合制作的精美手串`,
          specification: '8-12mm混合', // 组合制作模式的规格描述
          material_cost: totalCost,
          labor_cost: 20.00, // 固定人工成本
          craft_cost: 10.00, // 固定工艺成本
          total_cost: totalCost + 30.00,
          sellingPrice,
          profit_margin: ((selling_price - totalCost - 30.00) / sellingPrice * 100),
          status: 'ACTIVE',
          created_by: user.id
        }
      })
      
      console.log(`✅ SKU创建成功: ${sku.sku_code}`);
      
      // 2. 创建Product记录
      const product = await tx.product.create({
        data: {
          name: sku_name,
          description: `SKU: ${ sku_code }`,
          category: '组合手串',
          quantity: initialQuantity,
          unit: '件',
          unit_price: sellingPrice,
          totalValue: selling_price * initialQuantity,
          status: 'AVAILABLE',
          images: JSON.stringify([generateTestImageUrl()]),
          userId: user.id,
          sku_id: sku.id
        }
      })
      
      console.log(`✅ Product创建成功: ${product.id}`);
      
      // 3. 创建MaterialUsage记录（消耗原材料）
      const materialUsages = []
      
      for (const material of actualMaterials.scatteredBeads) {
        const usage = await tx.material_usage.create({
          data: {
            purchase_id: material.id,
            productId: product.id,
            quantity_used_beads: material.needQuantity * initialQuantity, // 制作2个SKU需要的总量
            quantity_used_pieces: 0,
            unitCost: material.unit_price,
            total_cost: material.unit_price * material.needQuantity * initialQuantity
          }
        })
        materialUsages.push(usage)
        console.log(`✅ 消耗散珠: ${material.name} ${material.needQuantity * initialQuantity}颗`);
      }
      
      for (const material of actualMaterials.bracelets) {
        const usage = await tx.material_usage.create({
          data: {
            purchase_id: material.id,
            productId: product.id,
            quantity_used_beads: material.needQuantity * initialQuantity,
            quantity_used_pieces: 0,
            unitCost: material.unit_price,
            total_cost: material.unit_price * material.needQuantity * initialQuantity
          }
        })
        materialUsages.push(usage)
        console.log(`✅ 消耗手串: ${material.name} ${material.needQuantity * initialQuantity}颗`);
      }
      
      for (const material of actualMaterials.accessories) {
        const usage = await tx.material_usage.create({
          data: {
            purchase_id: material.id,
            productId: product.id,
            quantity_used_beads: 0,
            quantity_used_pieces: material.needQuantity * initialQuantity,
            unitCost: material.unit_price,
            total_cost: material.unit_price * material.needQuantity * initialQuantity
          }
        })
        materialUsages.push(usage)
        console.log(`✅ 消耗配件: ${material.name} ${material.needQuantity * initialQuantity}件`);
      }
      
      // 4. 创建SKU库存变更日志
      const inventoryLog = await tx.sku_inventory_log.create({
        data: { sku_id: sku.id,
          action: 'CREATE',
          quantityChange: initialQuantity,
          quantityBefore: 0,
          quantityAfter: initialQuantity,
          referenceType: 'PRODUCT',
          referenceId: product.id,
          notes: `初始创建SKU，生成${initialQuantity}个库存`,
          userId: user.id
        }
      })
      
      console.log(`✅ 库存日志创建成功: ${inventoryLog.id}`);
      
      return {
        sku,
        product,
        materialUsages,
        inventoryLog
      }
    })
    
    console.log('\n🎉 SKU制作测试完成！');
    console.log(`📦 创建的SKU: ${result.sku.sku_code}`);
    console.log(`🏷️ SKU名称: ${result.sku.sku_name}`);
    console.log(`📊 初始库存: ${result.sku.total_quantity} 个`);
    console.log(`💰 销售价格: ¥${result.sku.selling_price}`);
    console.log(`🧾 消耗原材料记录: ${result.materialUsages.length} 条`);
    
    return result
    
  } catch (error) {
    console.error('❌ SKU制作测试失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createTestSku().catch(console.error)