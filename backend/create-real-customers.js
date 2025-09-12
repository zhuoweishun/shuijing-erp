import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 真实客户数据
const realCustomers = [
  { name: '张美丽', phone: '13812345678', address: '北京市朝阳区建国门外大街1号', type: 'vip' },
  { name: '李雅静', phone: '13923456789', address: '上海市浦东新区陆家嘴环路1000号', type: 'repeat' },
  { name: '王晓芳', phone: '13634567890', address: '广州市天河区珠江新城花城大道85号', type: 'new' },
  { name: '陈慧敏', phone: '13745678901', address: '深圳市南山区科技园南区深南大道9988号', type: 'active' },
  { name: '刘诗雨', phone: '13856789012', address: '杭州市西湖区文三路259号', type: 'repeat' },
  { name: '赵婉儿', phone: '13967890123', address: '成都市锦江区红星路三段1号', type: 'vip' },
  { name: '孙梦琪', phone: '15078901234', address: '武汉市江汉区中山大道818号', type: 'new' },
  { name: '周雅琳', phone: '15189012345', address: '南京市鼓楼区中山路321号', type: 'active' },
  { name: '吴佳怡', phone: '15290123456', address: '西安市雁塔区小寨东路126号', type: 'repeat' },
  { name: '郑思涵', phone: '15301234567', address: '青岛市市南区香港中路40号', type: 'new' },
  { name: '冯雨桐', phone: '15412345678', address: '大连市中山区人民路15号', type: 'active' },
  { name: '何静怡', phone: '15523456789', address: '厦门市思明区湖滨南路76号', type: 'vip' },
  { name: '许梦瑶', phone: '15634567890', address: '苏州市姑苏区观前街27号', type: 'repeat' },
  { name: '韩雅欣', phone: '15745678901', address: '长沙市芙蓉区五一大道389号', type: 'new' },
  { name: '曹诗婷', phone: '15856789012', address: '重庆市渝中区解放碑步行街88号', type: 'active' },
  { name: '邓美琳', phone: '15967890123', address: '天津市和平区南京路108号', type: 'repeat' },
  { name: '彭雅茹', phone: '17078901234', address: '济南市历下区泉城路180号', type: 'new' },
  { name: '丁思琪', phone: '17189012345', address: '福州市鼓楼区五四路158号', type: 'active' },
  { name: '薛梦娜', phone: '17290123456', address: '合肥市蜀山区长江西路130号', type: 'vip' },
  { name: '范雅丽', phone: '17301234567', address: '昆明市五华区东风西路99号', type: 'inactive' }
]

// 客户类型配置
const customerTypeConfig = {
  vip: { minOrders: 8, maxOrders: 15, minAmount: 5000, maxAmount: 12000, refund_rate: 0.1 },
  repeat: { minOrders: 3, maxOrders: 8, minAmount: 1500, maxAmount: 5000, refund_rate: 0.15 },
  active: { minOrders: 2, maxOrders: 5, minAmount: 800, maxAmount: 2500, refund_rate: 0.2 },
  new: { minOrders: 1, maxOrders: 3, minAmount: 200, maxAmount: 1200, refund_rate: 0.25 },
  inactive: { minOrders: 1, maxOrders: 2, minAmount: 300, maxAmount: 800, refund_rate: 0.3 }
}

// 备注分类数据
const noteCategories = {
  PREFERENCE: [
    '喜欢紫水晶手串，偏爱8mm规格',
    '钟爱粉水晶，认为有助于桃花运',
    '偏好天然石材，不喜欢人工处理',
    '喜欢简约款式，不要太复杂的设计',
    '偏爱暖色调宝石，如黄水晶、红玛瑙'
  ],
  BEHAVIOR: [
    '每月固定采购，通常周末下单',
    '喜欢批量购买，单次购买3-5件',
    '对价格敏感，经常询问优惠活动',
    '购买前会详细咨询产品信息',
    '复购率高，是忠实老客户'
  ],
  CONTACT: [
    '2025-01-06电话沟通，对新品很感兴趣',
    '微信联系频繁，响应速度快',
    '通过朋友介绍认识，信任度高',
    '参加过线下活动，印象深刻',
    '提供过产品建议，很有见解'
  ],
  OTHER: [
    '朋友推荐的客户，注重品质',
    '从事珠宝行业，专业知识丰富',
    '收藏爱好者，对稀有宝石感兴趣',
    '送礼需求较多，包装要求高',
    '地址偏远，需要特殊物流安排'
  ]
}

// 生成客户编码
function generateCustomerCode(date, sequence) {
  const dateStr = date.to_i_s_o_string().slice(0, 10).replace(/-/g, '')
  return `CUS${dateStr}${sequence.to_string().pad_start(3, '0')}`
}

// 随机选择数组元素
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// 随机数范围
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 随机价格（带优惠）
function randomPriceWithDiscount(original_price, hasDiscount = false) {
  if (!hasDiscount) return originalPrice
  const discountRate = 0.8 + Math.random() * 0.15 // 80%-95%折扣
  return Math.round(originalPrice * discountRate * 100) / 100
}

// 创建客户数据
async function createRealCustomers() {
  try {
    console.log('=== 开始创建真实客户数据 ===')
    
    // 获取可用的SKU
    const availableSkus = await prisma.product_sku.find_many({
      where: {
        status: 'ACTIVE',
        total_quantity: { gt: 0 }
      },
      select: {
        id: true,
        sku_code: true,
        sku_name: true,
        selling_price: true,
        total_quantity: true
      }
    })
    
    console.log(`找到 ${availableSkus.length} 个可用SKU`)
    
    if (availableSkus.length === 0) {
      throw new Error('没有可用的SKU数据，无法创建客户购买记录')
    }
    
    const createdCustomers = []
    const allPurchases = []
    const allNotes = []
    
    for (let i = 0; i < realCustomers.length; i++) {
      const customerData = realCustomers[i]
      const config = customerTypeConfig[customerData.type]
      
      console.log(`\n创建客户 ${i + 1}: ${customerData.name} (${customerData.type})`)
      
      // 1. 创建客户基本信息
      const customer = await prisma.customer.create({
        data: {
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          notes: `${customerData.type}客户，通过${randomChoice(['朋友介绍', '网络搜索', '线下活动', '老客户推荐'])}了解到我们`
        }
      })
      
      createdCustomers.push(customer)
      
      // 2. 创建购买记录
      const orderCount = randomBetween(config.minOrders, config.maxOrders)
      let totalAmount = 0
      let total_orders = 0
      let first_purchase_date = null
      let last_purchase_date = null
      
      for (let j = 0; j < orderCount; j++) {const sku = randomChoice(availableSkus)
        const quantity = randomBetween(1, 3)
        const hasDiscount = Math.random() < 0.3 // 30%概率有优惠
        const unit_price = randomPriceWithDiscount(parseFloat(sku.selling_price), hasDiscount)
        const total_price = unit_price * quantity
        
        // 随机购买日期（最近3个月内）
        const daysAgo = randomBetween(1, 90)
        const purchase_date = new Date()
        purchaseDate.set_date(purchase_date.get_date() - daysAgo)
        
        const purchase = await prisma.customer_purchase.create({
          data: {
            customer_id: customer.id,
            sku_id: sku.id,
            sku_name: sku.sku_name,
            quantity: quantity,
            unit_price: unit_price,
            original_price: hasDiscount ? parseFloat(sku.selling_price) : null,
            total_price: total_price,
            status: 'ACTIVE',
            sale_channel: randomChoice(['线上商城', '微信销售', '线下门店', '电话销售']),
            notes: hasDiscount ? `享受${Math.round((1 - unit_price / parseFloat(sku.selling_price)) * 100)}%优惠` : null,
            purchase_date: purchaseDate
          }
        })
        
        allPurchases.push(purchase)
        totalAmount += total_price
        totalOrders += 1
        
        if (!firstPurchaseDate || purchaseDate < firstPurchaseDate) {firstPurchaseDate = purchase_date
        }
        if (!lastPurchaseDate || purchaseDate > lastPurchaseDate) {lastPurchaseDate = purchase_date
        }
        
        console.log(`  购买记录 ${j + 1}: ${sku.sku_name} x${quantity} = ¥${total_price}${hasDiscount ? ' (优惠)' : ''}`)
      }
      
      // 3. 创建退货记录（根据退货率）
      if (Math.random() < config.refund_rate && allPurchases.length > 0) {
        const refundPurchase = randomChoice(allPurchases.filter(p => p.customer_id === customer.id && p.status === 'ACTIVE'))
        if (refundPurchase) {
          await prisma.customer_purchase.update({
            where: { id: refundPurchase.id },
            data: {
              status: 'REFUNDED',
              refund_date: new Date(),
              refund_reason: randomChoice(['客户不满意', '产品质量问题', '尺寸不合适', '颜色不符', '客户改变主意']),
              refund_notes: '客户主动申请退货，已处理'
            }
          })
          
          totalAmount -= refundPurchase.total_price
          totalOrders -= 1
          console.log(`  退货记录: ${refundPurchase.sku_name} - ¥${refundPurchase.total_price}`)
        }
      }
      
      // 4. 更新客户统计信息
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          total_purchases: totalAmount,
          total_orders: totalOrders,
          first_purchase_date: firstPurchaseDate,
          last_purchase_date: lastPurchaseDate
        }
      })
      
      // 5. 创建客户备注
      const noteCount = randomBetween(1, 3)
      for (let k = 0; k < noteCount; k++) {
        const categories = Object.keys(noteCategories)
        const category = randomChoice(categories)
        const content = randomChoice(noteCategories[category])
        
        const note = await prisma.customer_note.create({
          data: {
            customer_id: customer.id,
            category: category,
            content: content,
            created_by: 'cmf8h3g8p0000tupgq4gcrfw0' // 使用实际的用户ID
          }
        })
        
        allNotes.push(note)
        console.log(`  备注 ${k + 1}: [${category}] ${content}`)
      }
      
      console.log(`  客户统计: 总订单${ total_orders }个，总金额¥${totalAmount.to_fixed(2)}`)
    }
    
    // 6. 验证创建结果
    console.log('\n=== 创建结果统计 ===')
    console.log(`成功创建客户: ${createdCustomers.length}个`)
    console.log(`成功创建购买记录: ${allPurchases.length}条`)
    console.log(`成功创建备注记录: ${allNotes.length}条`)
    
    // 7. 客户类型统计
    const customerStats = {}
    for (const customer of realCustomers) {
      customerStats[customer.type] = (customerStats[customer.type] || 0) + 1
    }
    
    console.log('\n=== 客户类型分布 ===')
    Object.entries(customerStats).for_each(([type, count]) => {
      console.log(`${type}客户: ${count}个`)
    })
    
    console.log('\n✅ 真实客户数据创建完成！')
    
  } catch (error) {
    console.error('❌ 创建客户数据失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createRealCustomers()