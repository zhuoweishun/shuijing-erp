/**
 * SKU系统工具函数
 * 处理SKU生成、查找、更新等逻辑
 */

import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

/**
 * 生成原材料标识签名
 * @param {Array} materialUsages - 原材料使用记录
 * @returns {Array} 标准化的原材料标识
 */
export function generateMaterialSignature(materialUsages) {
  return materialUsages
    .map(usage => {
      // 处理不同的数据结构：组合制作模式 vs 直接转化模式
      let materialInfo;
      
      if (usage.material) {
        // 组合制作模式：数据来自materials表
        materialInfo = {
          material_name: usage.material.material_name,
          material_type: usage.material.material_type,
          quality: usage.material.quality || null,
          bead_diameter: usage.material.bead_diameter || null,
          specification: usage.material.specification || usage.material.accessory_specification || usage.material.finished_material_specification || null
        };
      } else if (usage.purchase) {
        // 直接转化模式：数据来自purchase表
        materialInfo = {
          material_name: usage.purchase.material_name || usage.purchase.product_name || usage.purchase.productName,
          material_type: usage.purchase.material_type || usage.purchase.product_type || usage.purchase.productType,
          quality: usage.purchase.quality || null,
          bead_diameter: usage.purchase.bead_diameter || usage.purchase.beadDiameter || null,
          specification: usage.purchase.specification || null
        };
      } else {
        // 兼容性处理：直接从usage对象获取
        materialInfo = {
          material_name: usage.material_name || '未知材料',
          material_type: usage.material_type || 'UNKNOWN',
          quality: usage.quality || null,
          bead_diameter: usage.bead_diameter || null,
          specification: usage.specification || null
        };
      }
      
      return {
        ...materialInfo,
        quantity_used_beads: usage.quantity_used_beads || usage.quantityUsedBeads || 0,
        quantity_used_pieces: usage.quantity_used_pieces || usage.quantityUsedPieces || 0
      };
    })
    .sort((a, b) => a.material_name.localeCompare(b.material_name));
}

/**
 * 生成SKU哈希值
 * @param {Array} materialSignature - 原材料标识
 * @returns {string} 8位哈希值
 */
export function generateSkuHash(materialSignature) {
  const signatureString = JSON.stringify(materialSignature);
  return crypto.createHash('md5').update(signatureString).digest('hex').substring(0, 8);
}

/**
 * 生成SKU编号
 * @param {Date} date - 创建日期
 * @param {number} sequence - 序号
 * @returns {string} SKU编号
 */
export function generateSkuCode(date, sequence) {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `SKU${dateStr}${String(sequence).padStart(3, '0')}`;
}

/**
 * 生成SKU名称（移除编号后缀）
 * @param {string} skuName - SKU名称
 * @returns {string} SKU名称
 */
export function generateSkuName(skuName) {
  return skuName.replace(/\s*#\d+\s*$/, '').trim();
}

/**
 * 查找或创建SKU
 * @param {Object} params - 参数对象
 * @param {Array} params.materialUsages - 原材料使用记录
 * @param {string} params.skuName - SKU名称
 * @param {number} params.sellingPrice - 销售价格
 * @param {string} params.userId - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 * @param {Object} params.additionalData - 额外数据（图片、描述等）
 * @returns {Object} SKU信息和是否为新创建
 */
export async function findOrCreateSku({
  material_usages,
  sku_name,
  selling_price,
  user_id,
  tx,
  additional_data = {}
}) {
  // 生成原材料标识
  const material_signature = generateMaterialSignature(material_usages);
  const material_signature_hash = generateSkuHash(material_signature);
  
  // 查找现有SKU
  let existing_sku = await tx.productSku.findFirst({
    where: {
      material_signature_hash: material_signature_hash
    }
  });
  
  if (existing_sku) {
    // 检查价格差异
    const price_difference = Math.abs(existing_sku.selling_price - selling_price) / existing_sku.selling_price;
    
    if (price_difference > 0.05) { // 5%以上差异
      console.log(`⚠️  价格差异较大: 现有SKU价格 ${existing_sku.selling_price}, 新价格 ${selling_price}`);
      // 这里可以根据业务需求决定是否创建新SKU或更新价格
      // 暂时使用现有SKU价格
    }
    
    // 记录更新前的数量
    const quantity_before = existing_sku.total_quantity;
    const quantity_after = quantity_before + 1;
    
    // 更新SKU数量
    const updated_sku = await tx.productSku.update({
      where: { id: existing_sku.id },
      data: {
        total_quantity: quantity_after,
        available_quantity: existing_sku.available_quantity + 1,
        total_value: (existing_sku.available_quantity + 1) * existing_sku.unit_price
      }
    });
    
    // 在findOrCreateSku中创建库存变动日志，避免在外部重复创建
    await createSkuInventoryLog({
      sku_id: existing_sku.id,
      action: 'CREATE',
      quantity_change: 1,
      quantity_before: quantity_before,
      quantity_after: quantity_after,
      reference_type: additional_data.reference_type || 'PRODUCT',
      reference_id: additional_data.reference_id || null,
      notes: additional_data.notes || `创建成品，SKU数量增加`,
      user_id: user_id,
      tx: tx
    });
    
    return {
      sku: updated_sku,
      is_new_sku: false,
      log_created: true // 标记已创建日志
    };
  }
  
  // 创建新SKU
  const today = new Date();
  const date_key = today.toISOString().slice(0, 10);
  
  // 获取当日SKU序号
  const existing_sku_count = await tx.productSku.count({
    where: {
      created_at: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    }
  });
  
  const sku_code = generateSkuCode(today, existing_sku_count + 1);
  const generated_sku_name = generateSkuName(sku_name);
  
  const new_sku = await tx.productSku.create({
    data: {
      sku_code: sku_code,
      sku_name: generated_sku_name,
      material_signature_hash: material_signature_hash,
      material_signature: JSON.stringify(material_signature),
      total_quantity: 1,
      available_quantity: 1,
      unit_price: selling_price,
      total_value: 1 * selling_price, // available_quantity * selling_price
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
  
  // 为新创建的SKU创建库存变动日志
  await createSkuInventoryLog({
    sku_id: new_sku.id,
    action: 'CREATE',
    quantity_change: 1,
    quantity_before: 0,
    quantity_after: 1,
    reference_type: additional_data.reference_type || 'PRODUCT',
    reference_id: additional_data.reference_id || null,
    notes: additional_data.notes || `创建新SKU: ${generated_sku_name}`,
    user_id: user_id,
    tx: tx
  });
  
  return {
    sku: new_sku,
    is_new_sku: true,
    log_created: true // 标记已创建日志
  };
}

/**
 * 创建SKU库存变更日志
 * @param {Object} params - 参数对象
 * @param {string} params.skuId - SKU ID
 * @param {string} params.action - 操作类型
 * @param {number} params.quantityChange - 数量变化
 * @param {number} params.quantityBefore - 变更前数量
 * @param {number} params.quantityAfter - 变更后数量
 * @param {string} params.referenceType - 引用类型
 * @param {string} params.referenceId - 引用ID
 * @param {string} params.notes - 备注
 * @param {string} params.userId - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 */
export async function createSkuInventoryLog({
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
  await tx.skuInventoryLog.create({
    data: {
      sku_id,
      action,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_type,
      reference_id,
      notes,
      user_id
    }
  });
}

/**
 * 减少SKU可售数量（销售时调用）
 * @param {Object} params - 参数对象
 * @param {string} params.skuId - SKU ID
 * @param {number} params.quantity - 减少数量
 * @param {string} params.referenceId - 引用ID（如订单ID）
 * @param {string} params.notes - 备注
 * @param {string} params.userId - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 */
export async function decreaseSkuQuantity({
  skuId,
  quantity,
  referenceId,
  notes,
  userId,
  tx
}) {
  const sku = await tx.productSku.findUnique({
    where: { id: skuId }
  });
  
  if (!sku) {
    throw new Error('SKU不存在');
  }
  
  if (sku.available_quantity < quantity) {
    throw new Error(`SKU ${sku.sku_code} 可售数量不足，可售：${sku.available_quantity}，需要：${quantity}`);
  }
  
  const quantityBefore = sku.available_quantity;
  const quantityAfter = quantityBefore - quantity;
  
  // 更新SKU数量
  const updatedSku = await tx.productSku.update({
    where: { id: skuId },
    data: {
      available_quantity: quantityAfter,
      total_value: quantityAfter * sku.selling_price
    }
  });
  
  // 创建库存变更日志
  await createSkuInventoryLog({
    sku_id: skuId,
    action: 'SELL',
    quantity_change: -quantity,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter,
    reference_type: 'SALE',
    reference_id: referenceId,
    notes: notes,
    user_id: userId,
    tx: tx
  });
  
  return updatedSku;
}

/**
 * 调整SKU库存数量（手动调整）
 * @param {Object} params - 参数对象
 * @param {string} params.skuId - SKU ID
 * @param {number} params.newQuantity - 新的可售数量
 * @param {string} params.notes - 调整原因
 * @param {string} params.userId - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 */
export async function adjustSkuQuantity({
  skuId,
  newQuantity,
  notes,
  userId,
  tx
}) {
  const sku = await tx.productSku.findUnique({
    where: { id: skuId }
  });
  
  if (!sku) {
    throw new Error('SKU不存在');
  }
  
  const quantityBefore = sku.available_quantity;
  const quantityChange = newQuantity - quantityBefore;
  
  // 更新SKU数量
  const updatedSku = await tx.productSku.update({
    where: { id: skuId },
    data: {
      available_quantity: newQuantity,
      total_value: newQuantity * sku.selling_price
    }
  });
  
  // 创建库存变更日志
  await createSkuInventoryLog({
    sku_id: skuId,
    action: 'ADJUST',
    quantity_change: quantityChange,
    quantity_before: quantityBefore,
    quantity_after: newQuantity,
    reference_type: 'MANUAL',
    reference_id: null,
    notes: notes,
    user_id: userId,
    tx: tx
  });
  
  return updatedSku;
}

/**
 * 获取SKU详细信息（不使用Product模型，直接返回SKU表数据）
 * @param {string} skuId - SKU ID
 * @returns {Object} SKU详细信息
 */
export async function getSkuDetails(skuId) {
  const sku = await prisma.productSku.findUnique({
    where: { id: skuId },
    include: {
      material_usages: {
        include: {
          material: {
            include: {
              purchase: {
                include: {
                  supplier: true,
                  user: {
                    select: {
                      id: true,
                      user_name: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      },
      inventory_logs: {
        orderBy: { created_at: 'desc' },
        take: 10
      },
      creator: {
        select: {
          id: true,
          user_name: true,
          name: true
        }
      }
    }
  });
  
  return sku;
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
export async function getSkuList({
  page = 1,
  limit = 20,
  search = '',
  status = 'ACTIVE'
} = {}) {
  const skip = (page - 1) * limit;
  
  // 处理status参数，支持单个值或数组
  let statusCondition
  if (Array.isArray(status)) {
    statusCondition = { in: status }
  } else {
    statusCondition = status
  }
  
  const where = {
    status: statusCondition,
    ...(search && {
      OR: [
        { sku_code: { contains: search } },
        { sku_name: { contains: search } }
      ]
    })
  };
  
  const [skus, total] = await Promise.all([
    prisma.productSku.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    }),
    prisma.productSku.count({ where })
  ]);
  
  // 转换_count字段为蛇形命名
  const formattedSkus = skus.map(sku => {
    const { _count, ...rest } = sku;
    return {
      ...rest,
      products_count: _count.products
    };
  });
  
  return {
    skus: formattedSkus,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
}