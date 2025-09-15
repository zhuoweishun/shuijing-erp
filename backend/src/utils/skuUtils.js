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
    .map(usage => ({
      productName: usage.purchase.productName,
      productType: usage.purchase.productType,
      quality: usage.purchase.quality || null,
      beadDiameter: usage.purchase.beadDiameter || null,
      specification: usage.purchase.specification || null,
      quantityUsedBeads: usage.quantityUsedBeads || 0,
      quantityUsedPieces: usage.quantityUsedPieces || 0
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));
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
 * @param {string} productName - 原成品名称
 * @returns {string} SKU名称
 */
export function generateSkuName(productName) {
  return productName.replace(/\s*#\d+\s*$/, '').trim();
}

/**
 * 查找或创建SKU
 * @param {Object} params - 参数对象
 * @param {Array} params.materialUsages - 原材料使用记录
 * @param {string} params.productName - 成品名称
 * @param {number} params.sellingPrice - 销售价格
 * @param {string} params.userId - 用户ID
 * @param {Object} params.tx - 数据库事务对象
 * @param {Object} params.additionalData - 额外数据（图片、描述等）
 * @returns {Object} SKU信息和是否为新创建
 */
export async function findOrCreateSku({
  materialUsages,
  productName,
  sellingPrice,
  userId,
  tx,
  additionalData = {}
}) {
  // 生成原材料标识
  const materialSignature = generateMaterialSignature(materialUsages);
  const materialSignatureHash = generateSkuHash(materialSignature);
  
  // 查找现有SKU
  let existingSku = await tx.productSku.findFirst({
    where: {
      materialSignatureHash: materialSignatureHash
    }
  });
  
  if (existingSku) {
    // 检查价格差异
    const priceDifference = Math.abs(existingSku.sellingPrice - sellingPrice) / existingSku.sellingPrice;
    
    if (priceDifference > 0.05) { // 5%以上差异
      console.log(`⚠️  价格差异较大: 现有SKU价格 ${existingSku.sellingPrice}, 新价格 ${sellingPrice}`);
      // 这里可以根据业务需求决定是否创建新SKU或更新价格
      // 暂时使用现有SKU价格
    }
    
    // 更新SKU数量
    const updatedSku = await tx.productSku.update({
      where: { id: existingSku.id },
      data: {
        totalQuantity: existingSku.totalQuantity + 1,
        availableQuantity: existingSku.availableQuantity + 1,
        totalValue: (existingSku.totalQuantity + 1) * existingSku.unitPrice
      }
    });
    
    return {
      sku: updatedSku,
      isNewSku: false
    };
  }
  
  // 创建新SKU
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  
  // 获取当日SKU序号
  const existingSkuCount = await tx.productSku.count({
    where: {
      createdAt: {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    }
  });
  
  const skuCode = generateSkuCode(today, existingSkuCount + 1);
  const skuName = generateSkuName(productName);
  
  const newSku = await tx.productSku.create({
    data: {
      skuCode: skuCode,
      skuName: skuName,
      materialSignatureHash: materialSignatureHash,
      materialSignature: JSON.stringify(materialSignature),
      totalQuantity: 1,
      availableQuantity: 1,
      unitPrice: sellingPrice,
      totalValue: sellingPrice,
      sellingPrice: sellingPrice,
      photos: additionalData.photos || null,
      description: additionalData.description || null,
      specification: additionalData.specification || null,
      materialCost: additionalData.materialCost || null,
      laborCost: additionalData.laborCost || null,
      craftCost: additionalData.craftCost || null,
      totalCost: additionalData.totalCost || null,
      profitMargin: additionalData.profitMargin || null,
      createdBy: userId
    }
  });
  
  return {
    sku: newSku,
    isNewSku: true
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
  skuId,
  action,
  quantityChange,
  quantityBefore,
  quantityAfter,
  referenceType,
  referenceId,
  notes,
  userId,
  tx
}) {
  await tx.skuInventoryLog.create({
    data: {
      skuId: skuId,
      action: action,
      quantityChange: quantityChange,
      quantityBefore: quantityBefore,
      quantityAfter: quantityAfter,
      referenceType: referenceType,
      referenceId: referenceId,
      notes: notes,
      userId: userId
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
  
  if (sku.availableQuantity < quantity) {
    throw new Error(`SKU ${sku.skuCode} 可售数量不足，可售：${sku.availableQuantity}，需要：${quantity}`);
  }
  
  const quantityBefore = sku.availableQuantity;
  const quantityAfter = quantityBefore - quantity;
  
  // 更新SKU数量
  const updatedSku = await tx.productSku.update({
    where: { id: skuId },
    data: {
      availableQuantity: quantityAfter,
      totalValue: quantityAfter * sku.unitPrice
    }
  });
  
  // 创建库存变更日志
  await createSkuInventoryLog({
    skuId: skuId,
    action: 'SELL',
    quantityChange: -quantity,
    quantityBefore: quantityBefore,
    quantityAfter: quantityAfter,
    referenceType: 'SALE',
    referenceId: referenceId,
    notes: notes,
    userId: userId,
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
  
  const quantityBefore = sku.availableQuantity;
  const quantityChange = newQuantity - quantityBefore;
  
  // 更新SKU数量
  const updatedSku = await tx.productSku.update({
    where: { id: skuId },
    data: {
      availableQuantity: newQuantity,
      totalValue: newQuantity * sku.unitPrice
    }
  });
  
  // 创建库存变更日志
  await createSkuInventoryLog({
    skuId: skuId,
    action: 'ADJUST',
    quantityChange: quantityChange,
    quantityBefore: quantityBefore,
    quantityAfter: newQuantity,
    referenceType: 'MANUAL',
    referenceId: null,
    notes: notes,
    userId: userId,
    tx: tx
  });
  
  return updatedSku;
}

/**
 * 获取SKU详细信息（包括关联的成品）
 * @param {string} skuId - SKU ID
 * @returns {Object} SKU详细信息
 */
export async function getSkuDetails(skuId) {
  const sku = await prisma.productSku.findUnique({
    where: { id: skuId },
    include: {
      products: {
        include: {
          materialUsages: {
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
        { skuCode: { contains: search } },
        { skuName: { contains: search } }
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
  
  return {
    skus,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
}