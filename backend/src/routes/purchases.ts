import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { convertToApiFormat, convertFromApiFormat, filterSensitiveFields } from '../utils/fieldConverter.js'
import {
  diameterSchema,
  specificationSchema,
  quantitySchema,
  priceSchema,
  weightSchema,
  productTypeSchema,
  unitTypeSchema,
  qualitySchema,
  productNameSchema,
  supplierNameSchema,
  notesSchema,
  naturalLanguageInputSchema,
  photosSchema,
  validateProductTypeFields,
  calculateBeadsPerString
} from '../utils/validation.js'
import { ErrorResponses, createSuccessResponse } from '../utils/errorResponse.js'
import { OperationLogger } from '../utils/operationLogger.js'

const router = Router()

// 临时调试接口：查看原始数据和转换后数据
router.get('/debug/raw-data', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      take: 2,
      select: {
        id: true,
        purchaseCode: true,
        productName: true,
        pricePerGram: true,
        totalPrice: true,
        weight: true,
        beadDiameter: true,
        specification: true,
        productType: true,
        quality: true
      }
    })
    
    // 测试转换函数
    const converted = purchases.map(purchase => {
      const apiFormat = convertToApiFormat(purchase)
      return {
        original: purchase,
        converted: apiFormat
      }
    })
    
    res.json({
      success: true,
      message: '调试数据获取成功',
      data: converted,
      count: converted.length
    })
  } catch (error) {
    console.error('调试接口错误:', error)
    res.status(500).json({
      success: false,
      message: '调试接口错误',
      error: error.message
    })
  }
}))

// 采购录入数据验证schema（接收下划线命名的API参数）
const createPurchaseSchema = z.object({
  product_name: productNameSchema,
  product_type: productTypeSchema.default('BRACELET'),
  unit_type: unitTypeSchema.default('STRINGS'),
  bead_diameter: diameterSchema.optional(), // 散珠和手串必填，其他可选
  specification: specificationSchema.optional(), // 通用规格字段
  quantity: quantitySchema.optional(), // 手串数量
  piece_count: quantitySchema.optional(), // 散珠颗数/饰品片数/成品件数
  min_stock_alert: quantitySchema.optional(),
  price_per_gram: priceSchema.optional(),
  total_price: priceSchema.optional(),
  weight: weightSchema.optional(),
  quality: qualitySchema.optional(),
  photos: photosSchema,
  notes: notesSchema,
  natural_language_input: naturalLanguageInputSchema,
  supplier_name: supplierNameSchema.optional(),
  ai_recognition_result: z.any().optional()
}).refine((data) => {
  // 使用统一的产品类型字段验证
  const validation = validateProductTypeFields({
    product_type: data.product_type,
    bead_diameter: data.bead_diameter,
    specification: data.specification
  })
  return validation.isValid
}, {
  message: '散珠和手串需要填写珠子直径，饰品配件和成品需要填写规格'
})

// 生成采购编号
function generatePurchaseCode(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `CG${dateStr}${randomNum}`
}

// calculateBeadsPerString函数已移至utils/validation.ts中

// 获取采购列表
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    quality, 
    startDate, 
    endDate, 
    sortBy, 
    sortOrder,
    diameterMin,
    diameterMax,
    quantityMin,
    quantityMax,
    pricePerGramMin,
    pricePerGramMax,
    price_per_gram_min,
    price_per_gram_max,
    totalPriceMin,
    totalPriceMax,
    total_price_min,
    total_price_max,
    supplier,
    specificationMin,
    specificationMax,
    specification_min,
    specification_max,
    product_types
  } = req.query
  
  const where: any = {}
  
  // 权限控制：所有用户都可以查看采购记录，但雇员看到的敏感字段会被过滤
  // 不再限制雇员只能查看自己创建的记录
  
  // 搜索条件（使用数据库字段名：驼峰命名）
  if (search) {
    where.productName = {
      contains: search as string
    }
  }
  
  // 品相筛选：支持多选，处理null值
  if (quality !== undefined) {
    if (Array.isArray(quality)) {
      // 特殊处理：如果quality是空数组，应该返回空结果
      if (quality.length === 0) {
        where.quality = { in: [] }; // 空数组会导致查询返回空结果
      } else {
        // 处理包含null值的数组
        const hasNull = quality.includes(null) || quality.includes('null')
        const nonNullQualities = quality.filter(q => q !== null && q !== 'null')
        
        if (hasNull && nonNullQualities.length > 0) {
           // 既有null又有其他值，使用OR条件
           if (where.OR) {
             // 如果已有OR条件，需要重新组织
             const existingOr = where.OR
             delete where.OR
             where.AND = [
               { OR: existingOr },
               { OR: [
                 { quality: { in: nonNullQualities } },
                 { quality: null }
               ]}
             ]
           } else {
             where.OR = [
               { quality: { in: nonNullQualities } },
               { quality: null }
             ]
           }
        } else if (hasNull) {
          // 只有null值
          where.quality = null
        } else {
          // 只有非null值
          where.quality = { in: quality }
        }
      }
    } else if (typeof quality === 'string' && quality.includes(',')) {
      // 处理逗号分隔的字符串
      const qualityArray = quality.split(',').map(q => q.trim() === 'null' ? null : q.trim())
      const hasNull = qualityArray.includes(null)
      const nonNullQualities = qualityArray.filter(q => q !== null)
      
      if (hasNull && nonNullQualities.length > 0) {
         if (where.OR) {
           // 如果已有OR条件，需要重新组织
           const existingOr = where.OR
           delete where.OR
           where.AND = [
             { OR: existingOr },
             { OR: [
               { quality: { in: nonNullQualities } },
               { quality: null }
             ]}
           ]
         } else {
           where.OR = [
             { quality: { in: nonNullQualities } },
             { quality: null }
           ]
         }
      } else if (hasNull) {
        where.quality = null
      } else {
        where.quality = { in: qualityArray }
      }
    } else {
      where.quality = quality === 'null' ? null : quality
    }
  }
  
  if (startDate || endDate) {
    // 添加日期参数调试日志
    console.log('后端接收到的日期参数:', {
      startDate,
      endDate,
      startDateType: typeof startDate,
      endDateType: typeof endDate
    })
    
    where.purchaseDate = {}
    if (startDate) {
      // 确保开始日期从当天00:00:00开始
      const startDateObj = new Date(startDate as string + 'T00:00:00.000Z')
      where.purchaseDate.gte = startDateObj
      console.log('开始日期处理:', {
        原始值: startDate,
        转换后: startDateObj,
        ISO字符串: startDateObj.toISOString(),
        本地时间: startDateObj.toLocaleString('zh-CN')
      })
    }
    if (endDate) {
      // 确保结束日期到当天23:59:59结束
      const endDateObj = new Date(endDate as string + 'T23:59:59.999Z')
      where.purchaseDate.lte = endDateObj
      console.log('结束日期处理:', {
        原始值: endDate,
        转换后: endDateObj,
        ISO字符串: endDateObj.toISOString(),
        本地时间: endDateObj.toLocaleString('zh-CN')
      })
    }
    
    console.log('最终日期筛选条件:', where.purchaseDate)
  }
  
  // 供应商筛选：支持多选，添加错误处理
  if (supplier) {
    try {
      if (Array.isArray(supplier)) {
        // 多个供应商：使用IN查询，过滤空值
        const validSuppliers = supplier.filter(s => s && s.trim())
        if (validSuppliers.length > 0) {
          where.supplier = {
            name: {
              in: validSuppliers
            }
          }
        }
      } else if (typeof supplier === 'string' && supplier.includes(',')) {
        // 处理逗号分隔的字符串，过滤空值
        const supplierArray = supplier.split(',').map(s => s.trim()).filter(s => s)
        if (supplierArray.length > 0) {
          where.supplier = {
            name: {
              in: supplierArray
            }
          }
        }
      } else if (supplier && typeof supplier === 'string' && supplier.trim()) {
        // 单个供应商：使用contains查询
        where.supplier = {
          name: {
            contains: supplier.trim()
          }
        }
      }
    } catch (error) {
      console.warn('供应商筛选参数处理错误:', error)
      // 忽略供应商筛选错误，继续其他筛选
    }
  }
  
  // 珠子直径范围筛选
  if (diameterMin || diameterMax) {
    where.beadDiameter = {}
    if (diameterMin) where.beadDiameter.gte = parseFloat(diameterMin as string)
    if (diameterMax) where.beadDiameter.lte = parseFloat(diameterMax as string)
  }
  
  // 数量范围筛选
  if (quantityMin || quantityMax) {
    where.quantity = {}
    if (quantityMin) where.quantity.gte = parseInt(quantityMin as string)
    if (quantityMax) where.quantity.lte = parseInt(quantityMax as string)
  }
  
  // 克价范围筛选（将null值视为0处理）
  if (pricePerGramMin || pricePerGramMax || price_per_gram_min || price_per_gram_max) {
    const minValue = parseFloat((pricePerGramMin || price_per_gram_min) as string)
    const maxValue = parseFloat((pricePerGramMax || price_per_gram_max) as string)
    
    // 构建OR条件：包含null值（视为0）和实际值范围
    const priceConditions = []
    
    if (pricePerGramMin || price_per_gram_min) {
      if (minValue <= 0) {
        // 如果最小值<=0，包含null值和>=minValue的记录
        priceConditions.push(
          { pricePerGram: null },
          { pricePerGram: { gte: minValue } }
        )
      } else {
        // 如果最小值>0，只包含>=minValue的记录
        priceConditions.push({ pricePerGram: { gte: minValue } })
      }
    } else {
      // 没有最小值限制，包含null值
      priceConditions.push({ pricePerGram: null })
    }
    
    if (pricePerGramMax || price_per_gram_max) {
      // 添加最大值限制（null值视为0，如果maxValue>=0则包含null）
      if (maxValue >= 0) {
        if (!priceConditions.some(c => c.pricePerGram === null)) {
          priceConditions.push({ pricePerGram: null })
        }
      }
      // 为非null值添加最大值限制
      const existingCondition = priceConditions.find(c => c.pricePerGram && typeof c.pricePerGram === 'object' && 'gte' in c.pricePerGram)
      if (existingCondition && existingCondition.pricePerGram && typeof existingCondition.pricePerGram === 'object') {
        existingCondition.pricePerGram.lte = maxValue
      } else {
        priceConditions.push({ pricePerGram: { lte: maxValue } })
      }
    }
    
    // 应用OR条件
    if (priceConditions.length > 0) {
      if (where.OR) {
        // 如果已有OR条件，需要重新组织为AND结构
        const existingOr = where.OR
        delete where.OR
        where.AND = [
          { OR: existingOr },
          { OR: priceConditions }
        ]
      } else if (where.AND) {
        // 如果已有AND条件，添加克价筛选
        where.AND.push({ OR: priceConditions })
      } else {
        // 没有其他条件，直接设置OR条件
        where.OR = priceConditions
      }
    }
  }
  
  // 总价范围筛选
  if (totalPriceMin || totalPriceMax || total_price_min || total_price_max) {
    where.totalPrice = {}
    if (totalPriceMin || total_price_min) {
      where.totalPrice.gte = parseFloat((totalPriceMin || total_price_min) as string)
    }
    if (totalPriceMax || total_price_max) {
      where.totalPrice.lte = parseFloat((totalPriceMax || total_price_max) as string)
    }
  }
  
  // 预处理 product_types 参数：如果是字符串且包含逗号，则分割为数组
  let processedProductTypes = product_types;
  if (product_types && typeof product_types === 'string' && product_types.includes(',')) {
    processedProductTypes = product_types.split(',').map(type => type.trim());
  }
  
  // 处理规格筛选：根据产品类型选择正确的字段进行范围筛选
  if (specificationMin || specificationMax || specification_min || specification_max) {
    const minValue = (specificationMin || specification_min) ? parseFloat((specificationMin || specification_min) as string) : undefined;
    const maxValue = (specificationMax || specification_max) ? parseFloat((specificationMax || specification_max) as string) : undefined;
    
    // 使用正确的逻辑：根据产品类型选择对应的字段进行范围筛选
    const specificationConditions = [];
    
    // 散珠和手串：使用bead_diameter字段
    if (minValue !== undefined || maxValue !== undefined) {
      specificationConditions.push({
        AND: [
          { productType: { in: ['LOOSE_BEADS', 'BRACELET'] } },
          {
            beadDiameter: {
              ...(minValue !== undefined && { gte: minValue }),
              ...(maxValue !== undefined && { lte: maxValue })
            }
          }
        ]
      });
    }
    
    // 饰品配件和成品：使用specification字段
    if (minValue !== undefined || maxValue !== undefined) {
      specificationConditions.push({
        AND: [
          { productType: { in: ['ACCESSORIES', 'FINISHED'] } },
          {
            specification: {
              ...(minValue !== undefined && { gte: minValue }),
              ...(maxValue !== undefined && { lte: maxValue })
            }
          }
        ]
      });
    }
    
    if (specificationConditions.length > 0) {
      if (Object.keys(where).length > 0) {
        // 如果where中已有其他条件，使用AND组合
        where.AND = [{ OR: specificationConditions }];
      } else {
        // 如果where中没有其他条件，直接使用OR
        where.OR = specificationConditions;
      }
    }
  }
  
  // 处理产品类型筛选
  if (processedProductTypes) {
    // 特殊处理：如果product_types是空数组，应该返回空结果
    if (Array.isArray(processedProductTypes) && processedProductTypes.length === 0) {
      where.productType = { in: [] }; // 空数组会导致查询返回空结果
    } else {
      const types = Array.isArray(processedProductTypes) ? processedProductTypes : [processedProductTypes];
      
      if (where.AND) {
        // 如果已有AND条件（如规格筛选），添加产品类型筛选
        where.AND.push({ productType: { in: types } });
      } else if (where.OR) {
        // 如果已有OR条件（如规格筛选），需要重新组织为AND结构
        const existingOr = where.OR;
        delete where.OR;
        where.AND = [
          { OR: existingOr },
          { productType: { in: types } }
        ];
      } else {
        // 没有其他条件，直接设置产品类型筛选
        where.productType = { in: types };
      }
    }
  }
  
  // 定义字段映射（移到函数开始处，确保整个函数范围内可访问）
  const validSortFields = {
    'purchase_date': 'purchaseDate',
    'purchase_code': 'purchaseCode',
    'product_name': 'productName', 
    'supplier': 'supplier.name',
    'quantity': 'quantity',
    'price_per_gram': 'pricePerGram',
    'total_price': 'totalPrice',
    'bead_diameter': 'beadDiameter',
    'specification': 'specification'
  }
  
  // 构建WHERE子句的辅助函数
  const buildWhereClause = (whereObj: any): string => {
    if (!whereObj || Object.keys(whereObj).length === 0) {
      return '';
    }
    
    const conditions: string[] = [];
    
    // 处理搜索条件
    if (whereObj.productName && whereObj.productName.contains) {
      conditions.push(`p.productName LIKE '%${whereObj.productName.contains}%'`);
    }
    
    // 处理品相筛选
    if (whereObj.quality) {
      if (whereObj.quality.in) {
        const values = whereObj.quality.in.map((v: string) => `'${v}'`).join(',');
        conditions.push(`p.quality IN (${values})`);
      } else if (typeof whereObj.quality === 'string') {
        conditions.push(`p.quality = '${whereObj.quality}'`);
      }
    }
    
    // 处理日期范围筛选
    if (whereObj.purchaseDate) {
      if (whereObj.purchaseDate.gte) {
        const date = new Date(whereObj.purchaseDate.gte).toISOString().slice(0, 19).replace('T', ' ');
        conditions.push(`p.purchaseDate >= '${date}'`);
      }
      if (whereObj.purchaseDate.lte) {
        const date = new Date(whereObj.purchaseDate.lte).toISOString().slice(0, 19).replace('T', ' ');
        conditions.push(`p.purchaseDate <= '${date}'`);
      }
    }
    
    // 处理供应商筛选
    if (whereObj.supplier && whereObj.supplier.name && whereObj.supplier.name.contains) {
      conditions.push(`s.name LIKE '%${whereObj.supplier.name.contains}%'`);
    }
    
    // 处理珠子直径范围筛选
    if (whereObj.beadDiameter) {
      if (whereObj.beadDiameter.gte !== undefined) {
        conditions.push(`p.beadDiameter >= ${whereObj.beadDiameter.gte}`);
      }
      if (whereObj.beadDiameter.lte !== undefined) {
        conditions.push(`p.beadDiameter <= ${whereObj.beadDiameter.lte}`);
      }
    }
    
    // 处理数量范围筛选
    if (whereObj.quantity) {
      if (whereObj.quantity.gte !== undefined) {
        conditions.push(`p.quantity >= ${whereObj.quantity.gte}`);
      }
      if (whereObj.quantity.lte !== undefined) {
        conditions.push(`p.quantity <= ${whereObj.quantity.lte}`);
      }
    }
    
    // 处理克价范围筛选（将null值视为0处理）
    if (whereObj.pricePerGram) {
      if (whereObj.pricePerGram.gte !== undefined) {
        conditions.push(`(p.pricePerGram >= ${whereObj.pricePerGram.gte} OR (p.pricePerGram IS NULL AND ${whereObj.pricePerGram.gte} <= 0))`);
      }
      if (whereObj.pricePerGram.lte !== undefined) {
        conditions.push(`(p.pricePerGram <= ${whereObj.pricePerGram.lte} OR (p.pricePerGram IS NULL AND ${whereObj.pricePerGram.lte} >= 0))`);
      }
    }
    
    // 处理总价范围筛选
    if (whereObj.totalPrice) {
      if (whereObj.totalPrice.gte !== undefined) {
        conditions.push(`p.totalPrice >= ${whereObj.totalPrice.gte}`);
      }
      if (whereObj.totalPrice.lte !== undefined) {
        conditions.push(`p.totalPrice <= ${whereObj.totalPrice.lte}`);
      }
    }
    
    // 处理AND条件
    if (whereObj.AND) {
      whereObj.AND.forEach((andCondition: any) => {
        if (andCondition.OR) {
          const orConditions: string[] = [];
          andCondition.OR.forEach((orCondition: any) => {
            const orParts: string[] = [];
            
            // 处理嵌套的AND条件（规格筛选的新逻辑）
            if (orCondition.AND) {
              const nestedAndParts: string[] = [];
              orCondition.AND.forEach((nestedCondition: any) => {
                if (nestedCondition.productType && nestedCondition.productType.in) {
                  const types = nestedCondition.productType.in.map((t: string) => `'${t}'`).join(',');
                  nestedAndParts.push(`p.productType IN (${types})`);
                }
                
                if (nestedCondition.beadDiameter) {
                  if (nestedCondition.beadDiameter.gte !== undefined) {
                    nestedAndParts.push(`p.beadDiameter >= ${nestedCondition.beadDiameter.gte}`);
                  }
                  if (nestedCondition.beadDiameter.lte !== undefined) {
                    nestedAndParts.push(`p.beadDiameter <= ${nestedCondition.beadDiameter.lte}`);
                  }
                }
                
                if (nestedCondition.specification) {
                  if (nestedCondition.specification.gte !== undefined) {
                    nestedAndParts.push(`p.specification >= ${nestedCondition.specification.gte}`);
                  }
                  if (nestedCondition.specification.lte !== undefined) {
                    nestedAndParts.push(`p.specification <= ${nestedCondition.specification.lte}`);
                  }
                }
              });
              
              if (nestedAndParts.length > 0) {
                orParts.push(`(${nestedAndParts.join(' AND ')})`);
              }
            } else {
              // 处理原有的简单条件
              if (orCondition.productType && orCondition.productType.in) {
                const types = orCondition.productType.in.map((t: string) => `'${t}'`).join(',');
                orParts.push(`p.productType IN (${types})`);
              }
              
              if (orCondition.beadDiameter) {
                if (orCondition.beadDiameter.gte !== undefined) {
                  orParts.push(`p.beadDiameter >= ${orCondition.beadDiameter.gte}`);
                }
                if (orCondition.beadDiameter.lte !== undefined) {
                  orParts.push(`p.beadDiameter <= ${orCondition.beadDiameter.lte}`);
                }
              }
              
              if (orCondition.specification) {
                if (orCondition.specification.gte !== undefined) {
                  orParts.push(`p.specification >= ${orCondition.specification.gte}`);
                }
                if (orCondition.specification.lte !== undefined) {
                  orParts.push(`p.specification <= ${orCondition.specification.lte}`);
                }
              }
            }
            
            if (orParts.length > 0) {
              orConditions.push(`(${orParts.join(' AND ')})`);
            }
          });
          
          if (orConditions.length > 0) {
            conditions.push(`(${orConditions.join(' OR ')})`);
          }
        } else if (andCondition.productType && andCondition.productType.in) {
          const types = andCondition.productType.in.map((t: string) => `'${t}'`).join(',');
          conditions.push(`p.productType IN (${types})`);
        }
      });
    }
    
    // 处理OR条件
    if (whereObj.OR) {
      const orConditions: string[] = [];
      whereObj.OR.forEach((orCondition: any) => {
        const orParts: string[] = [];
        
        // 处理嵌套的AND条件（规格筛选的新逻辑）
        if (orCondition.AND) {
          const nestedAndParts: string[] = [];
          orCondition.AND.forEach((nestedCondition: any) => {
            if (nestedCondition.productType && nestedCondition.productType.in) {
              const types = nestedCondition.productType.in.map((t: string) => `'${t}'`).join(',');
              nestedAndParts.push(`p.productType IN (${types})`);
            }
            
            if (nestedCondition.beadDiameter) {
              if (nestedCondition.beadDiameter.gte !== undefined) {
                nestedAndParts.push(`p.beadDiameter >= ${nestedCondition.beadDiameter.gte}`);
              }
              if (nestedCondition.beadDiameter.lte !== undefined) {
                nestedAndParts.push(`p.beadDiameter <= ${nestedCondition.beadDiameter.lte}`);
              }
            }
            
            if (nestedCondition.specification) {
              if (nestedCondition.specification.gte !== undefined) {
                nestedAndParts.push(`p.specification >= ${nestedCondition.specification.gte}`);
              }
              if (nestedCondition.specification.lte !== undefined) {
                nestedAndParts.push(`p.specification <= ${nestedCondition.specification.lte}`);
              }
            }
          });
          
          if (nestedAndParts.length > 0) {
            orParts.push(`(${nestedAndParts.join(' AND ')})`);
          }
        } else {
          // 处理原有的简单条件
          if (orCondition.productType && orCondition.productType.in) {
            const types = orCondition.productType.in.map((t: string) => `'${t}'`).join(',');
            orParts.push(`p.productType IN (${types})`);
          }
          
          if (orCondition.beadDiameter) {
            if (orCondition.beadDiameter.gte !== undefined) {
              orParts.push(`p.beadDiameter >= ${orCondition.beadDiameter.gte}`);
            }
            if (orCondition.beadDiameter.lte !== undefined) {
              orParts.push(`p.beadDiameter <= ${orCondition.beadDiameter.lte}`);
            }
          }
          
          if (orCondition.specification) {
            if (orCondition.specification.gte !== undefined) {
              orParts.push(`p.specification >= ${orCondition.specification.gte}`);
            }
            if (orCondition.specification.lte !== undefined) {
              orParts.push(`p.specification <= ${orCondition.specification.lte}`);
            }
          }
        }
        
        if (orParts.length > 0) {
          orConditions.push(`(${orParts.join(' AND ')})`);
        }
      });
      
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
    }
    
    // 处理直接的productType条件
    if (whereObj.productType && whereObj.productType.in && !whereObj.AND && !whereObj.OR) {
      const types = whereObj.productType.in.map((t: string) => `'${t}'`).join(',');
      conditions.push(`p.productType IN (${types})`);
    }
    
    // 处理供应商筛选
    if (whereObj.supplier) {
      if (whereObj.supplier.name) {
        if (whereObj.supplier.name.in) {
          // 多个供应商：使用IN查询
          const suppliers = whereObj.supplier.name.in.map((s: string) => `'${s.replace(/'/g, "''")}'`).join(',');
          conditions.push(`s.name IN (${suppliers})`);
        } else if (whereObj.supplier.name.contains) {
          // 单个供应商：使用LIKE查询
          const supplierName = whereObj.supplier.name.contains.replace(/'/g, "''");
          conditions.push(`s.name LIKE '%${supplierName}%'`);
        }
      }
    }
    
    // 添加调试日志
    console.log('buildWhereClause 调试信息:');
    console.log('输入的whereObj:', JSON.stringify(whereObj, null, 2));
    console.log('生成的conditions:', conditions);
    console.log('最终WHERE子句:', conditions.join(' AND '));
    
    return conditions.join(' AND ');
  }
  
  // 处理排序（使用数据库字段名：驼峰命名）
  let orderBy: any = { createdAt: 'desc' } // 默认排序
  
  // 添加排序调试日志
  console.log('=== 排序调试信息 ===');
  console.log('原始排序参数:', { sortBy, sortOrder });
  
  if (sortBy && sortOrder) {
    
    const field = validSortFields[sortBy as string]
    console.log('映射后的字段:', field);
    
    if (field && (sortOrder === 'asc' || sortOrder === 'desc')) {
      if (field === 'supplier.name') {
        orderBy = {
          supplier: {
            name: sortOrder
          }
        }
      } else if (field === 'specification') {
        // 规格字段需要根据产品类型动态排序
        // 散珠和手串按beadDiameter排序，其他按specification排序
        // 使用原生SQL实现混合字段排序
        
        // 添加调试日志
        console.log('=== 规格排序调试信息 ===');
        console.log('原始where对象:', JSON.stringify(where, null, 2));
        
        const whereClause = buildWhereClause(where)
        console.log('生成的WHERE子句:', whereClause);
        
        const orderClause = sortOrder === 'asc' ? 'ASC' : 'DESC'
        
        const rawQuery = `
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.username as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplierId = s.id
           LEFT JOIN users u ON p.userId = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             CASE 
               WHEN p.productType IN ('LOOSE_BEADS', 'BRACELET') THEN p.beadDiameter
               ELSE p.specification
             END ${orderClause},
             p.id ${orderClause}
           LIMIT ? OFFSET ?
         `
        
        console.log('使用原生SQL进行规格排序:', rawQuery)
        console.log('查询参数:', { limit: Number(limit), offset: (Number(page) - 1) * Number(limit) });
        
        const rawPurchases = await prisma.$queryRawUnsafe(
          rawQuery,
          Number(limit),
          (Number(page) - 1) * Number(limit)
        ) as any[]
        
        // 转换原生查询结果为Prisma格式
        const purchases = rawPurchases.map(p => ({
          ...p,
          supplier: p.supplier_name ? { name: p.supplier_name } : null,
          user: {
            id: p.user_id,
            name: p.user_name,
            username: p.user_username
          }
        }))
        
        // 添加调试日志
        console.log('规格排序结果预览:');
        purchases.slice(0, 15).forEach((p, index) => {
          const displaySpec = ['LOOSE_BEADS', 'BRACELET'].includes(p.productType) ? p.beadDiameter : p.specification
          console.log(`${index + 1}. 产品: ${p.productName}, 产品类型: ${p.productType}, 显示规格: ${displaySpec}mm, 珠径: ${p.beadDiameter}, 规格: ${p.specification}, ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 转换为API格式并根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          const apiFormatPurchase = convertToApiFormat(purchase)
          return filterSensitiveFields(apiFormatPurchase, req.user.role)
        })
        
        return res.json({
          success: true,
          data: {
            purchases: filteredPurchases,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total,
              pages: Math.ceil(total / Number(limit))
            }
          }
        })
      } else if (field === 'quantity') {
        // 数量字段需要根据产品类型动态排序
        // 手串按quantity排序，其他按pieceCount排序
        // 使用原生SQL实现混合字段排序
        const whereClause = buildWhereClause(where)
        const orderClause = sortOrder === 'asc' ? 'ASC' : 'DESC'
        
        const rawQuery = `
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.username as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplierId = s.id
           LEFT JOIN users u ON p.userId = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             CASE 
               WHEN p.productType = 'BRACELET' THEN p.quantity
               ELSE p.pieceCount
             END ${orderClause},
             p.id ${orderClause}
           LIMIT ? OFFSET ?
         `
        
        console.log('使用原生SQL进行数量排序:', rawQuery)
        
        const rawPurchases = await prisma.$queryRawUnsafe(
          rawQuery,
          Number(limit),
          (Number(page) - 1) * Number(limit)
        ) as any[]
        
        // 转换原生查询结果为Prisma格式
        const purchases = rawPurchases.map(p => ({
          ...p,
          supplier: p.supplier_name ? { name: p.supplier_name } : null,
          user: {
            id: p.user_id,
            name: p.user_name,
            username: p.user_username
          }
        }))
        
        // 添加调试日志
        console.log('数量排序结果预览:');
        purchases.slice(0, 15).forEach((p, index) => {
          const displayQuantity = p.productType === 'BRACELET' ? p.quantity : p.pieceCount
          const displayUnit = p.productType === 'BRACELET' ? '条' : 
                             p.productType === 'LOOSE_BEADS' ? '颗' :
                             p.productType === 'ACCESSORIES' ? '片' : '件'
          console.log(`${index + 1}. 产品: ${p.productName}, 产品类型: ${p.productType}, 显示数量: ${displayQuantity}${displayUnit}, 手串数量: ${p.quantity}, 件数: ${p.pieceCount}, ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 转换为API格式并根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          const apiFormatPurchase = convertToApiFormat(purchase)
          return filterSensitiveFields(apiFormatPurchase, req.user.role)
        })
        
        return res.json({
          success: true,
          data: {
            purchases: filteredPurchases,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total,
              pages: Math.ceil(total / Number(limit))
            }
          }
        })
      } else if (field === 'pricePerGram') {
        // 克价字段需要特殊处理null值（视为0）
        const whereClause = buildWhereClause(where)
        const orderClause = sortOrder === 'asc' ? 'ASC' : 'DESC'
        
        const rawQuery = `
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.username as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplierId = s.id
           LEFT JOIN users u ON p.userId = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             COALESCE(p.pricePerGram, 0) ${orderClause},
             p.id ${orderClause}
           LIMIT ? OFFSET ?
         `
        
        console.log('使用原生SQL进行克价排序（null视为0）:', rawQuery)
        
        const rawPurchases = await prisma.$queryRawUnsafe(
          rawQuery,
          Number(limit),
          (Number(page) - 1) * Number(limit)
        ) as any[]
        
        // 转换原生查询结果为Prisma格式
        const purchases = rawPurchases.map(p => ({
          ...p,
          supplier: p.supplier_name ? { name: p.supplier_name } : null,
          user: {
            id: p.user_id,
            name: p.user_name,
            username: p.user_username
          }
        }))
        
        // 添加调试日志
        console.log('克价排序结果预览（null视为0）:');
        purchases.slice(0, 15).forEach((p, index) => {
          const displayPrice = p.pricePerGram !== null ? p.pricePerGram : 0
          console.log(`${index + 1}. 产品: ${p.productName}, 产品类型: ${p.productType}, 克价: ${p.pricePerGram}(显示为${displayPrice}), ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 转换为API格式并根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          const apiFormatPurchase = convertToApiFormat(purchase)
          return filterSensitiveFields(apiFormatPurchase, req.user.role)
        })
        
        return res.json({
          success: true,
          data: {
            purchases: filteredPurchases,
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total,
              pages: Math.ceil(total / Number(limit))
            }
          }
        })
      } else {
        // 对其他字段使用简单排序，保持稳定性
        orderBy = {
          [field]: sortOrder
        }
      }
      console.log('最终orderBy对象:', JSON.stringify(orderBy, null, 2));
    }
  }

  // 执行查询
  console.log('查询条件where:', JSON.stringify(where, null, 2));
  console.log('分页参数:', { page: Number(page), limit: Number(limit), skip: (Number(page) - 1) * Number(limit) });
  
  // 使用标准的Prisma查询，保持简单和稳定
  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      supplier: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    },
    orderBy,
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit)
  })
  
  // 添加查询结果调试日志
  console.log('查询结果数量:', purchases.length);
  if (sortBy === 'specification') {
    console.log('规格排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.productName}, 产品类型: ${p.productType}, 规格: ${p.specification}, 珠径: ${p.beadDiameter}, ID: ${p.id}`);
    });
    
    // 检查是否真的按规格排序
    console.log('规格值序列:', purchases.slice(0, 15).map(p => p.specification));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.productType));
    
    // 分析null值分布
    const nullCount = purchases.filter(p => p.specification === null).length;
    const nonNullCount = purchases.filter(p => p.specification !== null).length;
    console.log(`规格字段null值统计: null=${nullCount}, 非null=${nonNullCount}`);
  }
  
  if (sortBy === 'quantity') {
    console.log('数量排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.productName}, 产品类型: ${p.productType}, 数量: ${p.quantity}, ID: ${p.id}`);
    });
    
    // 检查是否真的按数量排序
    console.log('数量值序列:', purchases.slice(0, 15).map(p => p.quantity));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.productType));
    
    // 分析null值分布
    const nullCount = purchases.filter(p => p.quantity === null).length;
    const nonNullCount = purchases.filter(p => p.quantity !== null).length;
    console.log(`数量字段null值统计: null=${nullCount}, 非null=${nonNullCount}`);
  }
  
  if (sortBy === 'price_per_gram') {
    console.log('克价排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.productName}, 产品类型: ${p.productType}, 克价: ${p.pricePerGram}, ID: ${p.id}`);
    });
    
    // 检查是否真的按克价排序
    console.log('克价值序列:', purchases.slice(0, 15).map(p => p.pricePerGram));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.productType));
    
    // 分析null值分布
    const nullCount = purchases.filter(p => p.pricePerGram === null).length;
    const nonNullCount = purchases.filter(p => p.pricePerGram !== null).length;
    console.log(`克价字段null值统计: null=${nullCount}, 非null=${nonNullCount}`);
  }
  
  const total = await prisma.purchase.count({ where })
  
  // 转换为API格式并根据用户角色过滤敏感信息
  const filteredPurchases = purchases.map(purchase => {
    const apiFormatPurchase = convertToApiFormat(purchase)
    return filterSensitiveFields(apiFormatPurchase, req.user.role)
  })
  
  res.json({
    success: true,
    data: {
      purchases: filteredPurchases,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  })
}))

// 创建采购记录
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  // 验证请求数据
  const validatedData = createPurchaseSchema.parse(req.body)
  
  // 生成采购编号
  let purchaseCode: string
  let isUnique = false
  let attempts = 0
  
  while (!isUnique && attempts < 10) {
    purchaseCode = generatePurchaseCode()
    const existing = await prisma.purchase.findUnique({
      where: { purchaseCode }
    })
    if (!existing) {
      isUnique = true
    }
    attempts++
  }
  
  if (!isUnique) {
    return res.status(500).json(
      ErrorResponses.internal('生成采购编号失败，请重试')
    )
  }
  
  // 根据产品类型计算相关数值
  let beadsPerString: number | undefined
  let totalBeads: number | undefined
  let pricePerBead: number | undefined
  let pricePerPiece: number | undefined
  let unitPrice: number | undefined
  
  // 设置规格字段（统一存储在specification中）
  const specification = validatedData.specification || validatedData.bead_diameter
  
  if (validatedData.product_type === 'LOOSE_BEADS') {
    // 散珠：按颗计算
    if (validatedData.bead_diameter && validatedData.piece_count) {
      beadsPerString = calculateBeadsPerString(validatedData.bead_diameter)
      totalBeads = validatedData.piece_count
      pricePerBead = validatedData.total_price ? validatedData.total_price / validatedData.piece_count : undefined
    }
  } else if (validatedData.product_type === 'BRACELET') {
    // 手串：保持原有逻辑
    if (validatedData.bead_diameter) {
      beadsPerString = calculateBeadsPerString(validatedData.bead_diameter)
      totalBeads = validatedData.quantity ? validatedData.quantity * beadsPerString : undefined
      pricePerBead = validatedData.total_price && totalBeads ? validatedData.total_price / totalBeads : undefined
      unitPrice = validatedData.total_price && validatedData.quantity ? validatedData.total_price / validatedData.quantity : undefined
    }
  } else if (validatedData.product_type === 'ACCESSORIES') {
    // 饰品配件：按片计算
    if (validatedData.piece_count && validatedData.total_price) {
      pricePerPiece = validatedData.total_price / validatedData.piece_count
      unitPrice = pricePerPiece // 对于饰品配件，单价就是每片价格
    }
  } else if (validatedData.product_type === 'FINISHED') {
    // 成品：按件计算
    if (validatedData.piece_count && validatedData.total_price) {
      pricePerPiece = validatedData.total_price / validatedData.piece_count
      unitPrice = pricePerPiece // 对于成品，单价就是每件价格
    }
  }
  
  // 处理供应商
  let supplierId: string | undefined
  if (validatedData.supplier_name) {
    // 查找现有供应商
    let supplier = await prisma.supplier.findFirst({
      where: {
        name: validatedData.supplier_name
      }
    })
    
    // 如果不存在则创建新供应商
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          name: validatedData.supplier_name
        }
      })
    }
    
    supplierId = supplier.id
  }
  
  // 创建采购记录
  const purchase = await prisma.purchase.create({
    data: {
      purchaseCode: purchaseCode!,
      productName: validatedData.product_name,
      productType: validatedData.product_type,
      unitType: validatedData.unit_type,
      beadDiameter: validatedData.bead_diameter,
      specification,
      quantity: validatedData.quantity,
      pieceCount: validatedData.piece_count,
      minStockAlert: validatedData.min_stock_alert,
      pricePerGram: validatedData.price_per_gram,
      totalPrice: validatedData.total_price,
      weight: validatedData.weight,
      beadsPerString,
      totalBeads,
      pricePerBead,
      pricePerPiece,
      unitPrice,
      quality: validatedData.quality,
      photos: validatedData.photos,
      notes: validatedData.notes,
      naturalLanguageInput: validatedData.natural_language_input,
      aiRecognitionResult: validatedData.ai_recognition_result,
      purchaseDate: new Date(),
      supplierId,
      userId: req.user.id
    },
    include: {
      supplier: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })
  
  // 记录操作日志
  await OperationLogger.logPurchaseCreate(
    req.user.id,
    purchase.id,
    purchase,
    req.ip
  )
  
  // 转换为API格式并过滤敏感字段
  const apiFormatPurchase = convertToApiFormat(purchase)
  const filteredPurchase = filterSensitiveFields(apiFormatPurchase, req.user.role)
  
  res.status(201).json({
    success: true,
    message: '采购记录创建成功',
    data: filteredPurchase
  })
}))

// 获取单个采购记录
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      editLogs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })
  
  if (!purchase) {
    return res.status(404).json(
      ErrorResponses.recordNotFound('采购记录不存在')
    )
  }
  
  // 权限控制：所有用户都可以查看采购记录详情，但雇员看到的敏感字段会被过滤
  // 不再限制雇员只能查看自己创建的记录
  
  // 转换为API格式并根据用户角色过滤敏感信息
  const apiFormatPurchase = convertToApiFormat(purchase)
  const filteredPurchase = filterSensitiveFields(apiFormatPurchase, req.user.role)
  
  res.json({
    success: true,
    data: filteredPurchase
  })
}))

// 更新采购记录数据验证schema（接收snake_case命名的API参数）
const updatePurchaseSchema = z.object({
  product_name: z.string().min(1, '产品名称不能为空').max(200, '产品名称不能超过200字符').optional(),
  quantity: z.number().int().positive('数量必须是正整数').optional(),
  piece_count: z.number().int().positive('颗数/片数/件数必须是正整数').optional(),
  bead_diameter: diameterSchema.optional(),
  specification: specificationSchema.optional(),
  quality: z.enum(['AA', 'A', 'AB', 'B', 'C']).optional(),
  price_per_gram: z.number().min(0, '克价不能为负数').nullable().optional(),
  total_price: z.number().min(0, '总价不能为负数').nullable().optional(),
  weight: z.number().min(0, '重量不能为负数').nullable().optional(),
  beads_per_string: z.number().int().positive('每串颗数必须是正整数').optional(),
  total_beads: z.number().int().positive('总计颗数必须是正整数').optional(),
  notes: z.string().optional(),
  supplier_name: z.string().optional()
})

// 更新采购记录
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 权限检查：只有老板可以编辑
  if (req.user.role !== 'BOSS') {
    return res.status(403).json(
      ErrorResponses.insufficientPermissions('权限不足，只有老板可以编辑采购记录')
    )
  }
  
  // 验证请求数据
  const validatedData = updatePurchaseSchema.parse(req.body)
  
  // 将snake_case格式的API数据转换为camelCase格式的数据库数据
  console.log('🔍 [后端调试] 接收到的原始数据:', validatedData)
  console.log('🔍 [后端调试] total_beads原始值:', validatedData.total_beads, '类型:', typeof validatedData.total_beads)
  const dbData = convertFromApiFormat(validatedData)
  console.log('🔍 [后端调试] 数据库格式数据:', dbData)
  console.log('🔍 [后端调试] totalBeads转换后值:', dbData.totalBeads, '类型:', typeof dbData.totalBeads)
  console.log('🔍 [后端调试] 字段详情:', {
    '字段数量': Object.keys(validatedData).length,
    '字段列表': Object.keys(validatedData)
  })
  
  // 检查采购记录是否存在
  const existingPurchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      materialUsages: {
        include: {
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })
  
  if (!existingPurchase) {
    return res.status(404).json({
      success: false,
      message: '采购记录不存在'
    })
  }

  // 检查是否有成品使用了该采购记录的珠子
  if (existingPurchase.materialUsages && existingPurchase.materialUsages.length > 0) {
    const usedByProducts = existingPurchase.materialUsages.map(usage => usage.product.name).join('、')
    return res.status(400).json({
      success: false,
      message: `无法编辑该采购记录，因为以下成品正在使用其珠子：${usedByProducts}。请先将这些成品销毁，使珠子回退到库存后再编辑。`,
      data: {
        usedByProducts: existingPurchase.materialUsages.map(usage => ({
          productId: usage.product.id,
          productName: usage.product.name,
          quantityUsed: usage.quantityUsedBeads || usage.quantityUsedPieces
        }))
      }
    })
  }
  
  // 处理供应商
  let supplierId: string | undefined = existingPurchase.supplierId
  if (dbData.supplierName !== undefined) {
    if (dbData.supplierName) {
      // 查找现有供应商
      let supplier = await prisma.supplier.findFirst({
        where: {
          name: dbData.supplierName
        }
      })
      
      // 如果不存在则创建新供应商
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: dbData.supplierName
          }
        })
      }
      
      supplierId = supplier.id
    } else {
      supplierId = null
    }
  }
  
  // 计算相关数值
  const updateData: any = {
    ...dbData,
    supplierId,
    lastEditedById: req.user.id,
    updatedAt: new Date()
  }
  
  // 移除supplierName字段，因为数据库中没有这个字段
  delete updateData.supplierName
  
  // 如果更新了数量或直径，重新计算相关数值
  if (dbData.beadDiameter && !dbData.beadsPerString) {
    updateData.beadsPerString = calculateBeadsPerString(dbData.beadDiameter)
  }
  
  const finalQuantity = dbData.quantity ?? existingPurchase.quantity
  const finalBeadsPerString = updateData.beadsPerString ?? existingPurchase.beadsPerString
  const finalTotalPrice = dbData.totalPrice ?? existingPurchase.totalPrice
  
  // 保存用户手动设置的totalBeads值
  const userSetTotalBeads = dbData.totalBeads
  const existingTotalBeads = existingPurchase.totalBeads
  
  console.log('🔍 [totalBeads逻辑调试] 用户本次设置值:', userSetTotalBeads, '类型:', typeof userSetTotalBeads)
  console.log('🔍 [totalBeads逻辑调试] 数据库现有值:', existingTotalBeads, '类型:', typeof existingTotalBeads)
  console.log('🔍 [totalBeads逻辑调试] 自动计算条件 - quantity:', finalQuantity, 'beadsPerString:', finalBeadsPerString)
  
  // totalBeads字段处理逻辑：
  // 1. 如果用户本次手动设置了totalBeads，使用用户设置的值（最高优先级）
  // 2. 如果用户本次没有设置totalBeads，保持数据库中的现有值（保护用户之前的手动设置）
  // 3. 只有在数据库中没有totalBeads值且用户也没有设置时，才进行自动计算
  if (userSetTotalBeads !== undefined) {
    // 用户本次手动设置了totalBeads，使用用户的值
    updateData.totalBeads = userSetTotalBeads
    console.log('🔍 [totalBeads处理] 使用用户本次设置值:', userSetTotalBeads)
  } else if (existingTotalBeads !== null && existingTotalBeads !== undefined) {
    // 用户本次没有设置totalBeads，但数据库中有现有值，保持现有值不变
    updateData.totalBeads = existingTotalBeads
    console.log('🔍 [totalBeads处理] 保持数据库现有值:', existingTotalBeads)
  } else if (finalQuantity && finalBeadsPerString) {
    // 数据库中没有totalBeads值且用户也没有设置，进行自动计算
    updateData.totalBeads = finalQuantity * finalBeadsPerString
    console.log('🔍 [totalBeads处理] 自动计算值:', finalQuantity * finalBeadsPerString)
  }
  
  // 根据产品类型计算相关的派生字段
  const finalPieceCount = dbData.pieceCount ?? existingPurchase.pieceCount
  const productType = existingPurchase.productType
  
  if (finalTotalPrice) {
    if (productType === 'LOOSE_BEADS') {
      // 散珠：按颗计算
      if (finalPieceCount) {
        updateData.pricePerBead = finalTotalPrice / finalPieceCount
      }
    } else if (productType === 'BRACELET') {
      // 手串：按串和颗计算
      if (updateData.totalBeads && finalQuantity) {
        updateData.pricePerBead = finalTotalPrice / updateData.totalBeads
        updateData.unitPrice = finalTotalPrice / finalQuantity
      }
    } else if (productType === 'ACCESSORIES' || productType === 'FINISHED') {
      // 饰品配件和成品：按片/件计算
      if (finalPieceCount) {
        updateData.pricePerPiece = finalTotalPrice / finalPieceCount
        updateData.unitPrice = updateData.pricePerPiece
      }
    }
    console.log('🔍 [派生字段计算] productType:', productType, 'pricePerBead:', updateData.pricePerBead, 'pricePerPiece:', updateData.pricePerPiece, 'unitPrice:', updateData.unitPrice)
  }
  
  // 记录修改的字段详细信息
  const fieldChanges: Array<{field: string, oldValue: any, newValue: any, displayName: string}> = []
  const fieldDisplayNames: {[key: string]: string} = {
    product_name: '产品名称',
    quantity: '串数',
    piece_count: '颗数/片数/件数',
    bead_diameter: '珠子直径',
    specification: '规格',
    quality: '品相等级',
    price_per_gram: '克价',
    total_price: '总价',
    weight: '重量',
    beads_per_string: '每串颗数',
    total_beads: '总计颗数',
    notes: '备注',
    supplier_name: '供应商'
  }
  
  // 角色名称映射
  const roleDisplayNames: {[key: string]: string} = {
    'BOSS': '老板',
    'EMPLOYEE': '雇员'
  }
  
  // 使用原始的snake_case字段名来检测变更
  Object.keys(validatedData).forEach(key => {
    const camelCaseKey = convertFromApiFormat({[key]: validatedData[key]})
    const camelCaseFieldName = Object.keys(camelCaseKey)[0]
    const oldValue = existingPurchase[camelCaseFieldName]
    const newValue = validatedData[key]
    if (newValue !== oldValue) {
      fieldChanges.push({
        field: key,
        oldValue: oldValue,
        newValue: newValue,
        displayName: fieldDisplayNames[key] || key
      })
    }
  })
  
  // 检查供应商变更
  if (validatedData.supplier_name !== undefined) {
    const oldSupplierName = existingPurchase.supplier?.name || null
    const newSupplierName = validatedData.supplier_name || null
    if (oldSupplierName !== newSupplierName) {
      fieldChanges.push({
        field: 'supplier_name',
        oldValue: oldSupplierName,
        newValue: newSupplierName,
        displayName: '供应商'
      })
    }
  }
  
  // 更新采购记录
  console.log('🔍 [后端调试] 最终发送到数据库的updateData:', updateData)
  console.log('🔍 [后端调试] updateData包含的字段:', Object.keys(updateData))
  const updatedPurchase = await prisma.purchase.update({
    where: { id },
    data: updateData,
    include: {
      supplier: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      lastEditedBy: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  })
  
  // 创建详细的编辑日志
  if (fieldChanges.length > 0) {
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true, role: true }
    })
    
    const userName = user?.name || '未知用户'
    const userRole = roleDisplayNames[user?.role || 'EMPLOYEE'] || '用户'
    const currentTime = new Date()
    const timeStr = currentTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-')
    
    // 生成人性化的修改描述 - 合并格式
    const changes = fieldChanges.map(change => {
      const oldValueStr = change.oldValue === null || change.oldValue === undefined ? '空' : String(change.oldValue)
      const newValueStr = change.newValue === null || change.newValue === undefined ? '空' : String(change.newValue)
      return `${change.displayName}从 ${oldValueStr} 改为 ${newValueStr}`
    })
    
    const changeDetails = `${userRole} 在 ${timeStr} 将${changes.join('，')}`
    
    await prisma.editLog.create({
      data: {
        purchaseId: id,
        userId: req.user.id,
        action: 'UPDATE',
        details: changeDetails,
        changedFields: fieldChanges.map(change => ({
          field: change.field,
          displayName: change.displayName,
          oldValue: change.oldValue,
          newValue: change.newValue,
          timestamp: currentTime.toISOString()
        }))
      }
    })
  }
  
  res.json({
    success: true,
    message: '采购记录更新成功',
    data: updatedPurchase
  })
}))

// 删除采购记录
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 权限检查：只有BOSS可以删除采购记录
  if (req.user.role !== 'BOSS') {
    return res.status(403).json({
      success: false,
      message: '只有老板可以删除采购记录'
    })
  }
  
  // 检查采购记录是否存在
  const existingPurchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      materialUsages: {
        include: {
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })
  
  if (!existingPurchase) {
    return res.status(404).json({
      success: false,
      message: '采购记录不存在'
    })
  }
  
  // 检查是否有成品使用了该采购记录的珠子
  if (existingPurchase.materialUsages && existingPurchase.materialUsages.length > 0) {
    const usedByProducts = existingPurchase.materialUsages.map(usage => usage.product.name).join('、')
    return res.status(400).json({
      success: false,
      message: `无法删除该采购记录，因为以下成品正在使用其珠子：${usedByProducts}。请先将这些成品拆散，使珠子回退到库存后再删除。`,
      data: {
        usedByProducts: existingPurchase.materialUsages.map(usage => ({
          productId: usage.product.id,
          productName: usage.product.name,
          quantityUsed: usage.quantityUsedBeads
        }))
      }
    })
  }
  
  // 获取用户信息用于日志记录
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { name: true, role: true }
  })
  
  const userName = user?.name || '未知用户'
  const currentTime = new Date()
  const timeStr = currentTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
  
  // 使用事务确保删除操作的原子性
  try {
    await prisma.$transaction(async (tx) => {
      // 创建删除日志
      await tx.editLog.create({
        data: {
          purchaseId: id,
          userId: req.user.id,
          action: 'DELETE',
          details: `老板 ${userName} 在 ${timeStr} 删除了采购记录：${existingPurchase.productName}（采购编号：${existingPurchase.purchaseCode}）。该操作同时清理了相关库存数据。`,
          changedFields: [{
            field: 'deleted',
            displayName: '删除操作',
            oldValue: '存在',
            newValue: '已删除',
            timestamp: currentTime.toISOString()
          }]
        }
      })
      
      // 删除采购记录（库存数据基于采购记录计算，删除采购记录后库存会自动更新）
      await tx.purchase.delete({
        where: { id }
      })
    })
    
    res.json({
      success: true,
      message: '采购记录删除成功，相关库存数据已同步更新',
      data: {
        deletedPurchase: {
          id: existingPurchase.id,
          productName: existingPurchase.productName,
          purchaseCode: existingPurchase.purchaseCode
        }
      }
    })
  } catch (error) {
    console.error('删除采购记录失败:', error)
    
    // 检查是否是外键约束错误
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: '无法删除该采购记录，因为仍有成品在使用其珠子。请先将相关成品拆散后再删除。'
      })
    }
    
    return res.status(500).json({
      success: false,
      message: '删除采购记录时发生错误，请稍后重试'
    })
  }
}))

// 临时调试接口：查询指定采购编号的quality字段
router.get('/debug/quality/:purchaseCode', authenticateToken, asyncHandler(async (req, res) => {
  const { purchaseCode } = req.params
  
  const purchase = await prisma.purchase.findFirst({
    where: { purchaseCode },
    select: {
      id: true,
      purchaseCode: true,
      productName: true,
      productType: true,
      quality: true
    }
  })
  
  if (!purchase) {
    return res.status(404).json({
      success: false,
      message: '采购记录不存在'
    })
  }
  
  res.json({
    success: true,
    data: {
      purchase_code: purchase.purchaseCode,
      product_name: purchase.productName,
      product_type: purchase.productType,
      quality: purchase.quality,
      quality_type: typeof purchase.quality,
      quality_is_null: purchase.quality === null,
      quality_is_undefined: purchase.quality === undefined,
      quality_stringified: JSON.stringify(purchase.quality)
    }
  })
}))

export default router