/**
 * SKU系统工具函数
 * 处理SKU生成、查找、更新等逻辑
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * 生成原材料标识签名
 * @param {Array} material_usages - 原材料使用记录
 * @returns {Array} 标准化的原材料标识
 */
export function generate_material_signature(material_usages) {
  return material_usages
    .map(usage => ({
      product_name: usage.purchase.product_name,
      material_type: usage.purchase.material_type,
      quality: usage.purchase.quality || null,
      bead_diameter: usage.purchase.bead_diameter || null,
      specification: usage.purchase.specification || null,
      quantity_used: usage.quantity_used || 0
    }))
    .sort((a, b) => a.product_name.locale_compare(b.product_name));
}

/**
 * 生成SKU哈希值
 * @param {Array} material_signature - 原材料标识
 * @returns {string} 8位哈希值
 */
export function generate_sku_hash(material_signature) {
  const signatureString = JSON.stringify(material_signature);
  return crypto.create_hash('md5').update(signatureString).digest('hex').substring(0, 8);
}

/**
 * 生成SKU编号
 * @param {Date} date - 创建日期
 * @param {number} sequence - 序号
 * @returns {string} SKU编号
 */
export function generate_sku_code(date, sequence) {
  const date_str = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `SKU${date_str}${String(sequence).padStart(3, '0')}`;
}

/**
 * 生成SKU名称（移除编号后缀）
 * @param {string} product_name - 原成品名称
 * @returns {string} SKU名称
 */
export function generate_sku_name(product_name) {
  return product_name.replace(/\s*#\d+\s*$/, '').trim();
}

/**
 * 查找或创建SKU
 * @param {Object} params - 参数对象
 * @param {Array} params.material_usages - 原材料使用记录
 * @param {string} params.product_name - 成品名称
 * @param {number} params.selling_price - 销售价格
 * @param {string} params.user_id - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 * @param {Object} params.additional_data - 额外数据（图片、描述等）
 * @returns {Object} SKU信息和是否为新创建
 */
export async function find_or_create_sku({
  material_usages,
  product_name,
  selling_price,
  user_id,
  tx,
  additional_data = {}
}) {
  // 生成原材料标识
  const material_signature = generate_material_signature(material_usages);
  const material_signature_hash = generate_sku_hash(material_signature);
  
  // 查找现有SKU
  let existingSku = await tx.product_sku.find_first({
    where: {
      material_signature_hash: material_signature_hash
    }
  });
  
  if (existingSku) {
    // 检查价格差异
    const price_difference = Math.abs(existingSku.selling_price - selling_price) / existingSku.selling_price;
    
    if (price_difference > 0.05) { // 5%以上差异
      console.log(`⚠️  价格差异较大: 现有SKU价格 ${existingSku.selling_price}, 新价格 ${ selling_price }`);
      // 这里可以根据业务需求决定是否创建新SKU或更新价格
      // 暂时使用现有SKU价格
    }
    
    // 更新SKU数量
    const updated_sku = await tx.product_sku.update({
      where: { id: existingSku.id },
      data: {
        total_quantity: existingSku.total_quantity + 1,
        available_quantity: existingSku.available_quantity + 1,
        totalValue: (existingSku.total_quantity + 1) * existingSku.unit_price
      }
    });
    
    return {
      sku: updated_sku,
      is_new_sku: false
    };
  }
  
  // 创建新SKU
  const today = new Date();
  const date_key = today.toISOString().slice(0, 10);
  
  // 获取当日SKU序号
  const existing_sku_count = await tx.product_sku.count({
    where: {
      created_at: {
        gte: new Date(today.get_full_year(), today.get_month(), today.get_date()),
        lt: new Date(today.get_full_year(), today.get_month(), today.get_date() + 1)
      }
    }
  });
  
  const sku_code = generate_sku_code(today, existing_sku_count + 1);
  const sku_name = generate_sku_name(product_name);
  
  const new_sku = await tx.product_sku.create({
    data: {
      sku_code: sku_code,
      sku_name: sku_name,
      material_signature_hash: material_signature_hash,
      material_signature: JSON.stringify(material_signature),
      total_quantity: 1,
      available_quantity: 1,
      unit_price: selling_price,
      totalValue: selling_price,
      selling_price: selling_price,
      photos: additional_data.photos || null,
      description: additional_data.description || null,
      specification: additional_data.specification || null,
      material_cost: additional_data.material_cost || null,
      labor_cost: additional_data.labor_cost || null,
      craft_cost: additional_data.craft_cost || null,
      total_cost: additional_data.total_cost || null,
      profit_margin: additional_data.profit_margin || null,
      created_by: user_id
    }
  });
  
  return {
    sku: new_sku,
    is_new_sku: true
  };
}

/**
 * 创建SKU库存变更日志
 * @param {Object} params - 参数对象
 * @param {string} params.sku_id - SKU ID
 * @param {string} params.action - 操作类型
 * @param {number} params.quantity_change - 数量变化
 * @param {number} params.quantity_before - 变更前数量
 * @param {number} params.quantity_after - 变更后数量
 * @param {string} params.reference_type - 引用类型
 * @param {string} params.reference_id - 引用ID
 * @param {string} params.notes - 备注
 * @param {string} params.user_id - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 */
export async function create_sku_inventory_log({
  sku_id,
  action,
  quantity_change,
  quantity_before,
  quantity_after,
  reference_type,
  reference_id,
  notes,
  user_id,
  tx
}) {
  // 验证action参数，确保是有效的枚举值
  const valid_actions = ['CREATE', 'SELL', 'ADJUST', 'DESTROY'];
  const clean_action = String(action).trim().to_upper_case();
  
  if (!valid_actions.includes(clean_action)) {
    throw new Error(`Invalid action: ${action}. Valid actions are: ${valid_actions.join(', ')}`);
  }
  
  // 验证referenceType参数
  const valid_reference_types = ['PRODUCT', 'SALE', 'MANUAL', 'DESTROY'];
  const clean_reference_type = String(reference_type).trim().to_upper_case();
  
  if (!valid_reference_types.includes(clean_reference_type)) {
    throw new Error(`Invalid reference_type: ${reference_type}. Valid types are: ${valid_reference_types.join(', ')}`);
  }
  
  await tx.sku_inventory_log.create({
    data: { sku_id: String(sku_id).trim(),
      action: clean_action,
      quantity_change: Number(quantity_change),
      quantity_before: Number(quantity_before),
      quantity_after: Number(quantity_after),
      reference_type: clean_reference_type,
      reference_id: reference_id ? String(reference_id).trim() : null,
      notes: notes ? String(notes).trim() : null,
      user_id: String(user_id).trim()
    }
  });
}

/**
 * 减少SKU可售数量（销售时调用）
 * @param {Object} params - 参数对象
 * @param {string} params.sku_id - SKU ID
 * @param {number} params.quantity - 减少数量
 * @param {string} params.reference_id - 引用ID（如订单ID）
 * @param {string} params.notes - 备注
 * @param {string} params.user_id - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 */
export async function decrease_sku_quantity({
  sku_id,
  quantity,
  reference_id,
  notes,
  user_id,
  tx
}) {
  const sku = await tx.product_sku.find_unique({
    where: { id: sku_id }
  });
  
  if (!sku) {
    throw new Error('SKU不存在');
  }
  
  if (sku.available_quantity < quantity) {
    throw new Error(`SKU ${sku.sku_code} 可售数量不足，可售：${sku.available_quantity}，需要：${quantity}`);
  }
  
  const quantity_before = sku.available_quantity;
  const quantity_after = quantity_before - quantity;
  
  // 更新SKU数量
  const updated_sku = await tx.product_sku.update({
    where: { id: sku_id },
    data: {
      available_quantity: quantity_after,
      totalValue: quantity_after * sku.unit_price
    }
  });
  
  // 创建库存变更日志
  await create_sku_inventory_log({ sku_id: sku_id,
    action: 'SELL',
    quantity_change: -quantity,
    quantity_before: quantity_before,
    quantity_after: quantity_after,
    reference_type: 'SALE',
    reference_id: reference_id,
    notes: notes,
    user_id: user_id,
    tx: tx
  });
  
  return updated_sku;
}

/**
 * 调整SKU库存数量（业务操作专用）
 * @param {Object} params - 参数对象
 * @param {string} params.sku_id - SKU ID
 * @param {number} params.new_quantity - 新的可售数量
 * @param {string} params.notes - 调整原因
 * @param {string} params.user_id - 用户ID
 * @param {string} params.reference_type - 引用类型 (PRODUCT/SALE/DESTROY)
 * @param {string} params.reference_id - 引用ID
 * @param {Object} params.tx - 数据库事务对象
 */
export async function adjust_sku_quantity({
  sku_id,
  new_quantity,
  notes,
  user_id,
  reference_type = 'PRODUCT', // 默认为PRODUCT类型
  reference_id = null,
  tx
}) {
  const sku = await tx.product_sku.find_unique({
    where: { id: sku_id }
  });
  
  if (!sku) {
    throw new Error('SKU不存在');
  }
  
  // 验证referenceType是否合法（不允许MANUAL）
  const valid_reference_types = ['PRODUCT', 'SALE', 'DESTROY'];
  if (!valid_reference_types.includes(reference_type)) {
    throw new Error(`不支持的引用类型: ${reference_type}，只允许: ${valid_reference_types.join(', ')}`);
  }
  
  const quantity_before = sku.available_quantity;
  const quantity_change = new_quantity - quantity_before;
  
  // 更新SKU数量
  const updated_sku = await tx.product_sku.update({
    where: { id: sku_id },
    data: {
      available_quantity: new_quantity,
      totalValue: new_quantity * sku.unit_price
    }
  });
  
  // 创建库存变更日志
  await create_sku_inventory_log({ sku_id: sku_id,
    action: 'ADJUST',
    quantity_change: quantity_change,
    quantity_before: quantity_before,
    quantity_after: new_quantity,
    reference_type: reference_type,
    reference_id: reference_id,
    notes: notes,
    user_id: user_id,
    tx: tx
  });
  
  return updated_sku;
}

/**
 * 获取SKU详细信息（包括关联的成品）
 * @param {string} sku_id - SKU ID
 * @returns {Object} SKU详细信息
 */
export async function get_sku_details(sku_id) {
  const sku = await prisma.product_sku.find_unique({
    where: { id: sku_id },
    include: {
      products: {
        include: {
          material_usages: {
            include: {
              purchase: true
            }
          }
        }
      },
      inventoryLogs: {
        orderBy: { created_at: 'desc' },
        take: 10
      }
    }
  });
  
  if (!sku) {
    return null;
  }
  
  // 查询该SKU相关的所有库存增加记录（CREATE和正数ADJUST操作）
  const inventoryLogs = await prisma.sku_inventory_log.find_many({
    where: { sku_id: sku.id,
      OR: [
        { action: 'CREATE' },
        { 
          action: 'ADJUST',
          quantity_change: { gt: 0 } // 只包含增加库存的调整（补货）
        }
      ]
    }
  });
  
  // 计算累计制作数量 = CREATE操作数量 + 所有正数ADJUST操作数量
  const totalProducedQuantity = inventoryLogs.reduce((sum, log) => {
    if (log.action === 'CREATE') {
      return sum + Math.abs(log.quantity_change);
    } else if (log.action === 'ADJUST' && log.quantity_change > 0) {
      return sum + log.quantity_change;
    }
    return sum;
  }, 0);
  
  return {
    ...sku,
    total_quantity: totalProducedQuantity, // 使用基于MaterialUsage记录计算的累计制作数量
    cumulativeProductionQuantity: totalProducedQuantity // 添加新字段供前端使用
  };
}

/**
 * 获取SKU列表（支持分页和筛选）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.limit - 每页数量
 * @param {string} params.search - 搜索关键词
 * @param {string} params.status - 状态筛选
 * @returns {Object} SKU列表和分页信息
 */
export async function get_sku_list({
  page = 1,
  limit = 20,
  search = '',
  status = 'ACTIVE'
} = {}) {
  const skip = (page - 1) * limit;
  
  // 处理status参数，支持单个值或数组
  let status_filter;
  if (Array.isArray(status)) {
    status_filter = { in: status };
  } else if (typeof status === 'string' && status.includes(',')) {
    // 处理逗号分隔的字符串
    const statusArray = status.split(',').map(s => s.trim());
    status_filter = { in: statusArray };
  } else {
    status_filter = status;
  }
  
  const where = {
    status: status_filter,
    ...(search && {
      OR: [
        { sku_code: { contains: search } },
        { sku_name: { contains: search } }
      ]
    })
  };
  
  const [skus, total] = await Promise.all([
    prisma.product_sku.find_many({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        Count: {
          select: { products: true }
        },
        inventoryLogs: {
          where: {
            OR: [
              { action: 'CREATE' },
              { 
                action: 'ADJUST',
                quantity_change: { gt: 0 } // 只包含增加库存的调整（补货）
              }
            ]
          },
          select: {
            action: true,
            quantity_change: true
          }
        }
      }
    }),
    prisma.product_sku.count({ where })
  ]);
  
  // 计算每个SKU的正确累计制作数量（基于SkuInventoryLog记录）
  const skusWithCorrectTotalQuantity = await Promise.all(skus.map(async sku => {
    // 查询该SKU相关的所有库存增加记录（CREATE和正数ADJUST操作）
    const inventoryLogs = await prisma.sku_inventory_log.find_many({
      where: { sku_id: sku.id,
        OR: [
          { action: 'CREATE' },
          { 
            action: 'ADJUST',
            quantity_change: { gt: 0 } // 只包含增加库存的调整（补货）
          }
        ]
      }
    });
    
    // 计算累计制作数量 = CREATE操作数量 + 所有正数ADJUST操作数量
    const totalProducedQuantity = inventoryLogs.reduce((sum, log) => {
      if (log.action === 'CREATE') {
        return sum + Math.abs(log.quantity_change);
      } else if (log.action === 'ADJUST' && log.quantity_change > 0) {
        return sum + log.quantity_change;
      }
      return sum;
    }, 0);
    
    // 移除inventoryLogs字段，避免返回给前端
    const { inventoryLogs: _, ...sku_without_logs } = sku;
    
    return {
      ...sku_without_logs,
      total_quantity: totalProducedQuantity, // 使用基于SkuInventoryLog记录计算的累计制作数量
      cumulativeProductionQuantity: totalProducedQuantity // 添加新字段供前端使用
    };
  }));
  
  return {
    skus: skusWithCorrectTotalQuantity,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
}