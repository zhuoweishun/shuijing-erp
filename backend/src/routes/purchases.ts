
// 临时的API格式转换函数
function convertFromApiFormat(data: any) {
  return data; // 直接返回，因为现在都是蛇形命名
}
import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth'
import { prisma } from '../lib/prisma'
// 移除fieldConverter导入，直接使用snake_case
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
} from '../utils/validation'
import { ErrorResponses } from '../utils/errorResponse'
import { OperationLogger } from '../utils/operationLogger'
import { filterSensitiveFields } from '../utils/filterSensitiveFields'

const router = Router()

// 临时调试接口：查看原始数据和转换后数据
router.get('/debug/raw-data', authenticateToken, asyncHandler(async (_, res) => {
    try {
    const purchases = await prisma.purchase.findMany({
      take: 2,
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        price_per_gram: true,
        total_price: true,
        weight: true,
        bead_diameter: true,
        specification: true,
        product_type: true,
        quality: true
      }
    })
    
    // 直接返回数据，无需转换
    const converted = purchases.map(purchase => {
      return {
        original: purchase,
        converted: purchase // 直接使用原始数据，已是蛇形命名
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
      error: (error as Error).message
    })
  }
  // 函数结束
  // 函数结束
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
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    purchase_code_search,
    quality, 
    start_date, 
    end_date, 
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
  
  // 搜索条件（使用数据库字段名：蛇形命名）
  if (search) {
    where.product_name = {
      contains: search as string
    }
  }
  
  // 采购编号搜索
  if (purchase_code_search) {
    where.purchase_code = {
      contains: purchase_code_search as string
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
        const hasNull = quality.includes('null') || quality.some((q: any) => q === null)
        const nonNullQualities = quality.filter((q: any) => q !== null && q !== 'null')
        
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
  
  if (start_date || end_date) {
    // 添加日期参数调试日志
    console.log('后端接收到的日期参数:', {
      start_date,
      end_date,
      startDateType: typeof start_date,
      endDateType: typeof end_date
    })
    
    where.purchase_date = {}
    if (start_date) {
      // 确保开始日期从当天00:00:00开始
      const startDateObj = new Date(start_date as string + 'T00:00:00.000Z')
      where.purchase_date.gte = startDateObj
      console.log('开始日期处理:', {
        原始值: start_date,
        转换后: startDateObj,
        ISO字符串: startDateObj.toISOString(),
        本地时间: startDateObj.toLocaleString('zh-CN')
      })
    }
    if (end_date) {
      // 确保结束日期到当天23:59:59结束
      const endDateObj = new Date(end_date as string + 'T23:59:59.999Z')
      where.purchase_date.lte = endDateObj
      console.log('结束日期处理:', {
        原始值: end_date,
        转换后: endDateObj,
        ISO字符串: endDateObj.toISOString(),
        本地时间: endDateObj.toLocaleString('zh-CN')
      })
    }
    
    console.log('最终日期筛选条件:', where.purchase_date)
  }
  
  // 供应商筛选：支持多选，添加错误处理
  if (supplier) {
    try {
      if (Array.isArray(supplier)) {
        // 多个供应商：使用IN查询，过滤空值
        const validSuppliers = Array.isArray(supplier) ? supplier.filter(s => s && typeof s === 'string' && s.trim()) : []
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
    where.bead_diameter = {}
    if (diameterMin) where.bead_diameter.gte = parseFloat(diameterMin as string)
    if (diameterMax) where.bead_diameter.lte = parseFloat(diameterMax as string)
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
          { price_per_gram: null },
          { price_per_gram: { gte: minValue } }
        )
      } else {
        // 如果最小值>0，只包含>=minValue的记录
        priceConditions.push({ price_per_gram: { gte: minValue } })
      }
    } else {
      // 没有最小值限制，包含null值
      priceConditions.push({ price_per_gram: null })
    }
    
    if (pricePerGramMax || price_per_gram_max) {
      // 添加最大值限制（null值视为0，如果maxValue>=0则包含null）
      if (maxValue >= 0) {
        if (!priceConditions.some(c => c.price_per_gram === null)) {
          priceConditions.push({ price_per_gram: null })
        }
      }
      // 为非null值添加最大值限制
      const existingCondition = priceConditions.find(c => c.price_per_gram && typeof c.price_per_gram === 'object' && 'gte' in c.price_per_gram)
      if (existingCondition && existingCondition.price_per_gram && typeof existingCondition.price_per_gram === 'object') {
        (existingCondition.price_per_gram as any).lte = maxValue
      } else {
        priceConditions.push({ price_per_gram: { lte: maxValue } })
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
    where.total_price = {}
    if (totalPriceMin || total_price_min) {
      where.total_price.gte = parseFloat((totalPriceMin || total_price_min) as string)
    }
    if (totalPriceMax || total_price_max) {
      where.total_price.lte = parseFloat((totalPriceMax || total_price_max) as string)
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
    // let conditions: any[] = []; // 暂时注释未使用的变量
    
    // 散珠和手串：使用bead_diameter字段
    const specification_conditions: any[] = [];
    if (minValue !== undefined || maxValue !== undefined) {
      specification_conditions.push({
        AND: [
          { product_type: { in: ['LOOSE_BEADS', 'BRACELET'] } },
          {
            bead_diameter: {
              ...(minValue !== undefined && { gte: minValue }),
              ...(maxValue !== undefined && { lte: maxValue })
            }
          }
        ]
      });
    }
    
    // 饰品配件和成品：使用specification字段
    if (minValue !== undefined || maxValue !== undefined) {
      specification_conditions.push({
        AND: [
          { product_type: { in: ['ACCESSORIES', 'FINISHED'] } },
          {
            specification: {
              ...(minValue !== undefined && { gte: minValue }),
              ...(maxValue !== undefined && { lte: maxValue })
            }
          }
        ]
      });
    }
    
    if (specification_conditions.length > 0) {
      if (Object.keys(where).length > 0) {
        // 如果where中已有其他条件，使用AND组合
        where.AND = [{ OR: specification_conditions }];
      } else {
        // 如果where中没有其他条件，直接使用OR
        where.OR = specification_conditions;
      }
    }
  }
  
  // 处理产品类型筛选
  if (processedProductTypes) {
    // 特殊处理：如果product_types是空数组，应该返回空结果
    if (Array.isArray(processedProductTypes) && processedProductTypes.length === 0) {
      where.product_type = { in: [] }; // 空数组会导致查询返回空结果
    } else {
      const types = Array.isArray(processedProductTypes) ? processedProductTypes : [processedProductTypes];
      
      if (where.AND) {
        // 如果已有AND条件（如规格筛选），添加产品类型筛选
        where.AND.push({ product_type: { in: types } });
      } else if (where.OR) {
        // 如果已有OR条件（如规格筛选），需要重新组织为AND结构
        const existingOr = where.OR;
        delete where.OR;
        where.AND = [
          { OR: existingOr },
          { product_type: { in: types } }
        ];
      } else {
        // 没有其他条件，直接设置产品类型筛选
        where.product_type = { in: types };
      }
    }
  }
  
  // 定义字段映射（移到函数开始处，确保整个函数范围内可访问）
  const validSortFields = {
    'purchase_date': 'purchase_date',
    'purchase_code': 'purchase_code',
    'product_name': 'product_name', 
    'supplier': 'supplier.name',
    'quantity': 'quantity',
    'price_per_gram': 'price_per_gram',
    'total_price': 'total_price',
    'bead_diameter': 'bead_diameter',
    'specification': 'specification'
  }
  
  // 构建WHERE子句的辅助函数
  const buildWhereClause = (whereObj: any): string => {
    if (!whereObj || Object.keys(whereObj).length === 0) {
      return '';
    }
    
    const conditions: string[] = [];
    
    // 处理搜索条件
    if (whereObj.product_name && whereObj.product_name.contains) {
      conditions.push(`p.product_name LIKE '%${whereObj.product_name.contains}%'`);
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
    if (whereObj.purchase_date) {
      if (whereObj.purchase_date.gte) {
        const date = new Date(whereObj.purchase_date.gte).toISOString().slice(0, 19).replace('T', ' ');
        conditions.push(`p.purchase_date >= '${date}'`);
      }
      if (whereObj.purchase_date.lte) {
        const date = new Date(whereObj.purchase_date.lte).toISOString().slice(0, 19).replace('T', ' ');
        conditions.push(`p.purchase_date <= '${date}'`);
      }
    }
    
    // 处理供应商筛选
    if (whereObj.supplier && whereObj.supplier.name && whereObj.supplier.name.contains) {
      conditions.push(`s.name LIKE '%${whereObj.supplier.name.contains}%'`);
    }
    
    // 处理珠子直径范围筛选
    if (whereObj.bead_diameter) {
      if (whereObj.bead_diameter.gte !== undefined) {
        conditions.push(`p.bead_diameter >= ${whereObj.bead_diameter.gte}`);
      }
      if (whereObj.bead_diameter.lte !== undefined) {
        conditions.push(`p.bead_diameter <= ${whereObj.bead_diameter.lte}`);
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
    if (whereObj.price_per_gram) {
      if (whereObj.price_per_gram.gte !== undefined) {
        conditions.push(`(p.price_per_gram >= ${whereObj.price_per_gram.gte} OR (p.price_per_gram IS NULL AND ${whereObj.price_per_gram.gte} <= 0))`);
      }
      if (whereObj.price_per_gram.lte !== undefined) {
        conditions.push(`(p.price_per_gram <= ${whereObj.price_per_gram.lte} OR (p.price_per_gram IS NULL AND ${whereObj.price_per_gram.lte} >= 0))`);
      }
    }
    
    // 处理总价范围筛选
    if (whereObj.total_price) {
      if (whereObj.total_price.gte !== undefined) {
        conditions.push(`p.total_price >= ${whereObj.total_price.gte}`);
      }
      if (whereObj.total_price.lte !== undefined) {
        conditions.push(`p.total_price <= ${whereObj.total_price.lte}`);
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
                if (nestedCondition.product_type && nestedCondition.product_type.in) {
                  const types = nestedCondition.product_type.in.map((t: string) => `'${t}'`).join(',');
                  nestedAndParts.push(`p.product_type IN (${types})`);
                }
                
                if (nestedCondition.bead_diameter) {
                  if (nestedCondition.bead_diameter.gte !== undefined) {
                    nestedAndParts.push(`p.bead_diameter >= ${nestedCondition.bead_diameter.gte}`);
                  }
                  if (nestedCondition.bead_diameter.lte !== undefined) {
                    nestedAndParts.push(`p.bead_diameter <= ${nestedCondition.bead_diameter.lte}`);
                  }
                }
                
                if (nestedCondition.specification) {
                  if (nestedCondition.specification.gte !== undefined) {
                    nestedAndParts.push(`p.specification >= ${nestedCondition.specification.gte}`);
                  }
                  if (nestedCondition.specification.lte !== undefined) {
                    nestedAndParts.push(`p.item.specification && Number(item.specification) <= ${nestedCondition.specification.lte}`);
                  }
                }
              });
              
              if (nestedAndParts.length > 0) {
                orParts.push(`(${nestedAndParts.join(' AND ')})`);
              }
            } else {
              // 处理原有的简单条件
              if (orCondition.product_type && orCondition.product_type.in) {
                const types = orCondition.product_type.in.map((t: string) => `'${t}'`).join(',');
                orParts.push(`p.product_type IN (${types})`);
              }
              
              if (orCondition.bead_diameter) {
                if (orCondition.bead_diameter.gte !== undefined) {
                  orParts.push(`p.bead_diameter >= ${orCondition.bead_diameter.gte}`);
                }
                if (orCondition.bead_diameter.lte !== undefined) {
                  orParts.push(`p.bead_diameter <= ${orCondition.bead_diameter.lte}`);
                }
              }
              
              if (orCondition.specification) {
                if (orCondition.specification.gte !== undefined) {
                  orParts.push(`p.specification >= ${orCondition.specification.gte}`);
                }
                if (orCondition.specification.lte !== undefined) {
                  orParts.push(`p.item.specification && Number(item.specification) <= ${orCondition.specification.lte}`);
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
        } else if (andCondition.product_type && andCondition.product_type.in) {
          const types = andCondition.product_type.in.map((t: string) => `'${t}'`).join(',');
          conditions.push(`p.product_type IN (${types})`);
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
            if (nestedCondition.product_type && nestedCondition.product_type.in) {
              const types = nestedCondition.product_type.in.map((t: string) => `'${t}'`).join(',');
              nestedAndParts.push(`p.product_type IN (${types})`);
            }
            
            if (nestedCondition.bead_diameter) {
              if (nestedCondition.bead_diameter.gte !== undefined) {
                nestedAndParts.push(`p.bead_diameter >= ${nestedCondition.bead_diameter.gte}`);
              }
              if (nestedCondition.bead_diameter.lte !== undefined) {
                nestedAndParts.push(`p.bead_diameter <= ${nestedCondition.bead_diameter.lte}`);
              }
            }
            
            if (nestedCondition.specification) {
              if (nestedCondition.specification.gte !== undefined) {
                nestedAndParts.push(`p.specification >= ${nestedCondition.specification.gte}`);
              }
              if (nestedCondition.specification.lte !== undefined) {
                nestedAndParts.push(`p.item.specification && Number(item.specification) <= ${nestedCondition.specification.lte}`);
              }
            }
          });
          
          if (nestedAndParts.length > 0) {
            orParts.push(`(${nestedAndParts.join(' AND ')})`);
          }
        } else {
          // 处理原有的简单条件
          if (orCondition.product_type && orCondition.product_type.in) {
            const types = orCondition.product_type.in.map((t: string) => `'${t}'`).join(',');
            orParts.push(`p.product_type IN (${types})`);
          }
          
          if (orCondition.bead_diameter) {
            if (orCondition.bead_diameter.gte !== undefined) {
              orParts.push(`p.bead_diameter >= ${orCondition.bead_diameter.gte}`);
            }
            if (orCondition.bead_diameter.lte !== undefined) {
              orParts.push(`p.bead_diameter <= ${orCondition.bead_diameter.lte}`);
            }
          }
          
          if (orCondition.specification) {
            if (orCondition.specification.gte !== undefined) {
              orParts.push(`p.specification >= ${orCondition.specification.gte}`);
            }
            if (orCondition.specification.lte !== undefined) {
              orParts.push(`p.item.specification && Number(item.specification) <= ${orCondition.specification.lte}`);
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
    
    // 处理直接的product_type条件
    if (whereObj.product_type && whereObj.product_type.in && !whereObj.AND && !whereObj.OR) {
      const types = whereObj.product_type.in.map((t: string) => `'${t}'`).join(',');
      conditions.push(`p.product_type IN (${types})`);
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
          const supplier_name = whereObj.supplier.name.contains.replace(/'/g, "''");
          conditions.push(`s.name LIKE '%${supplier_name}%'`);
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
  
  // 处理排序（使用数据库字段名：蛇形命名）
  let orderBy: any = { created_at: 'desc' } // 默认排序
  
  // 添加排序调试日志
  console.log('=== 排序调试信息 ===');
  console.log('原始排序参数:', { sortBy, sortOrder });
  
  if (sortBy && sortOrder) {
    
    const field = validSortFields[sortBy as keyof typeof validSortFields] as string | undefined
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
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.user_name as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplier_id = s.id
           LEFT JOIN users u ON p.user_id = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             CASE 
               WHEN p.product_type IN ('LOOSE_BEADS', 'BRACELET') THEN p.bead_diameter
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
          const displaySpec = ['LOOSE_BEADS', 'BRACELET'].includes(p.product_type) ? p.bead_diameter : p.specification
          console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.product_type}, 显示规格: ${displaySpec}mm, 珠径: ${p.bead_diameter}, 规格: ${p.specification}, ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 直接使用蛇形命名并根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          // 构建响应对象，所有字段已经是蛇形命名
          const apiFormatPurchase = {
            ...purchase,
            created_at: purchase.created_at,
            updated_at: purchase.updated_at,
            supplier_name: purchase.supplier?.name || null
          }
          return filterSensitiveFields(apiFormatPurchase, req.user!.role)
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
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.user_name as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplier_id = s.id
           LEFT JOIN users u ON p.user_id = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             CASE 
               WHEN p.product_type = 'BRACELET' THEN p.quantity
               ELSE p.piece_count
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
          const displayQuantity = p.product_type === 'LOOSE_BEADS' ? p.quantity : p.piece_count
          const displayUnit = p.product_type === 'LOOSE_BEADS' ? '条' : 
                             p.product_type === 'LOOSE_BEADS' ? '颗' :
                             p.product_type === 'ACCESSORIES' ? '片' : '件'
          console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.product_type}, 显示数量: ${displayQuantity}${displayUnit}, 手串数量: ${p.quantity}, 件数: ${p.piece_count}, ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 直接使用蛇形命名并根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          // 构建响应对象，所有字段已经是蛇形命名
          const apiFormatPurchase = {
            ...purchase,
            created_at: purchase.created_at,
            updated_at: purchase.updated_at,
            supplier_name: purchase.supplier?.name || null
          }
          return filterSensitiveFields(apiFormatPurchase, req.user!.role)
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
      } else if (field === 'price_per_gram') {
        // 克价字段需要特殊处理null值（视为0）
        const whereClause = buildWhereClause(where)
        const orderClause = sortOrder === 'asc' ? 'ASC' : 'DESC'
        
        const rawQuery = `
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.user_name as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplier_id = s.id
           LEFT JOIN users u ON p.user_id = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             COALESCE(p.price_per_gram, 0) ${orderClause},
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
          const displayPrice = p.price_per_gram !== null ? p.price_per_gram : 0
          console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.product_type}, 克价: ${p.price_per_gram}(显示为${displayPrice}), ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 直接使用蛇形命名并根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          // 构建响应对象，所有字段已经是蛇形命名
          const apiFormatPurchase = {
            ...purchase,
            created_at: purchase.created_at,
            updated_at: purchase.updated_at,
            supplier_name: purchase.supplier?.name || null
          }
          return filterSensitiveFields(apiFormatPurchase, req.user!.role)
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
          user_name: true
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
      console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.product_type}, 规格: ${p.specification}, 珠径: ${p.bead_diameter}, ID: ${p.id}`);
    });
    
    // 检查是否真的按规格排序
    console.log('规格值序列:', purchases.slice(0, 15).map(p => p.specification));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.product_type));
    
    // 分析null值分布
    const nullCount = purchases.filter(p => p.specification === null).length;
    const nonNullCount = purchases.filter(p => p.specification !== null).length;
    console.log(`规格字段null值统计: null=${nullCount}, 非null=${nonNullCount}`);
  }
  
  if (sortBy === 'quantity') {
    console.log('数量排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.product_type}, 数量: ${p.quantity}, ID: ${p.id}`);
    });
    
    // 检查是否真的按数量排序
    console.log('数量值序列:', purchases.slice(0, 15).map(p => p.quantity));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.product_type));
    
    // 分析null值分布
    const nullCount = purchases.filter(p => p.quantity === null).length;
    const nonNullCount = purchases.filter(p => p.quantity !== null).length;
    console.log(`数量字段null值统计: null=${nullCount}, 非null=${nonNullCount}`);
  }
  
  if (sortBy === 'price_per_gram') {
    console.log('克价排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.product_type}, 克价: ${p.price_per_gram}, ID: ${p.id}`);
    });
    
    // 检查是否真的按克价排序
    console.log('克价值序列:', purchases.slice(0, 15).map(p => p.price_per_gram));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.product_type));
    
    // 分析null值分布
    const nullCount = purchases.filter(p => p.price_per_gram === null).length;
    const nonNullCount = purchases.filter(p => p.price_per_gram !== null).length;
    console.log(`克价字段null值统计: null=${nullCount}, 非null=${nonNullCount}`);
  }
  
  const total = await prisma.purchase.count({ where })
  
  // 直接使用蛇形命名并根据用户角色过滤敏感信息
  const filteredPurchases = purchases.map(purchase => {
    // 构建响应对象，所有字段已经是蛇形命名
    const apiFormatPurchase = {
      ...purchase,
      created_at: purchase.created_at,
      updated_at: purchase.updated_at,
      supplier_name: purchase.supplier?.name || null,
      user_name: purchase.user?.name || null
    }
    return filterSensitiveFields(apiFormatPurchase, req.user!.role)
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
  // 函数结束
  // 函数结束
}))

// 创建采购记录
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  // 验证请求数据
  const validatedData = createPurchaseSchema.parse(req.body)
  
  // 生成采购编号
  let purchase_code: string
  let isUnique = false
  let attempts = 0
  
  while (!isUnique && attempts < 10) {
    purchase_code = generatePurchaseCode()
    const existing = await prisma.purchase.findUnique({
      where: { purchase_code: purchase_code }
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
  let total_beads: number | undefined
  let price_per_bead: number | undefined
  let price_per_piece: number | undefined
  let unit_price: number | undefined
  
  // 设置规格字段（统一存储在specification中）
  = validatedData.specification || validatedData.bead_diameter
  
  if (validatedData.product_type === 'LOOSE_BEADS') {
    // 散珠：按颗计算
    if (validatedData.bead_diameter && validatedData.piece_count) {
      beadsPerString = calculateBeadsPerString(validatedData.bead_diameter)
      total_beads = validatedData.piece_count
      price_per_bead = validatedData.total_price ? validatedData.total_price / validatedData.piece_count : undefined
    }
  } else if (validatedData.product_type === 'BRACELET') {
    // 手串：保持原有逻辑
    if (validatedData.bead_diameter) {
      beadsPerString = calculateBeadsPerString(validatedData.bead_diameter)
      total_beads = validatedData.quantity ? validatedData.quantity * beadsPerString : undefined
      price_per_bead = validatedData.total_price && total_beads ? validatedData.total_price / total_beads : undefined
      unit_price = validatedData.total_price && validatedData.quantity ? validatedData.total_price / validatedData.quantity : undefined
    }
  } else if (validatedData.product_type === 'ACCESSORIES') {
    // 饰品配件：按片计算
    if (validatedData.piece_count && validatedData.total_price) {
      price_per_piece = validatedData.total_price / validatedData.piece_count
      unit_price = price_per_piece // 对于饰品配件，单价就是每片价格
    }
  } else if (validatedData.product_type === 'FINISHED') {
    // 成品：按件计算
    if (validatedData.piece_count && validatedData.total_price) {
      price_per_piece = validatedData.total_price / validatedData.piece_count
      unit_price = price_per_piece // 对于成品，单价就是每件价格
    }
  }
  
  // 处理供应商
  let supplier_id: string | undefined
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
    
    supplier_id = supplier.id
  }
  
  // 创建采购记录
  const purchase = await prisma.purchase.create({
    data: {
      purchase_code: purchase_code!,
      product_name: validatedData.product_name,
      product_type: validatedData.product_type,
      unit_type: validatedData.unit_type,
      bead_diameter: validatedData.bead_diameter,
      specification: req.body.specification,
      quantity: validatedData.quantity,
      piece_count: validatedData.piece_count,
      min_stock_alert: validatedData.min_stock_alert,
      price_per_gram: validatedData.price_per_gram,
      total_price: validatedData.total_price,
      weight: validatedData.weight,
      beads_per_string: beadsPerString,
      total_beads: total_beads,
      price_per_bead: price_per_bead,
      price_per_piece: price_per_piece,
      unit_price: unit_price,
      quality: validatedData.quality,
      photos: validatedData.photos,
      notes: validatedData.notes,
      natural_language_input: validatedData.natural_language_input,
      ai_recognition_result: validatedData.ai_recognition_result,
      purchase_date: new Date(),
      supplier_id: supplier_id,
      user_id: req.user!.id
    },
    include: {
      supplier: true,
      user: {
        select: {
          id: true,
          name: true,
          user_name: true
        }
      }
    }
  })
  
  // 记录操作日志
  await OperationLogger.logPurchaseCreate(
    req.user!.id,
    purchase.id,
    purchase,
    req.ip
  )
  
  // 直接使用蛇形命名并过滤敏感字段
  const apiFormatPurchase = {
    ...purchase,
    created_at: purchase.created_at,
    updated_at: purchase.updated_at,
    supplier_name: purchase.supplier?.name || null,
    user_name: purchase.user?.name || null
  }
  const filteredPurchase = filterSensitiveFields(apiFormatPurchase, req.user!.role)
  
  return res.status(201).json({
    success: true,
    message: '采购记录创建成功',
    data: filteredPurchase
  })
  // 函数结束
  // 函数结束
}))

// 获取单个采购记录
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
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
          user_name: true
        }
      },
      edit_logs: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              user_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
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
  
  // 直接使用蛇形命名并根据用户角色过滤敏感信息
  const apiFormatPurchase = {
    ...purchase,
    created_at: purchase.created_at,
    updated_at: purchase.updated_at,
    supplier_name: purchase.supplier?.name || null,
    user_name: purchase.user?.name || null,
    edit_logs: purchase.edit_logs?.map((log: any) => ({
      ...log,
      created_at: log.created_at,
      user_name: log.user?.name || null
    }))
  }
  const filteredPurchase = filterSensitiveFields(apiFormatPurchase, req.user?.role || "USER" || "EMPLOYEE")
  
  return res.json({
    success: true,
    data: filteredPurchase
  })
  // 函数结束
  // 函数结束
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
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 权限检查：只有老板可以编辑
  if ((req.user?.role || "USER" || "EMPLOYEE") !== 'BOSS') {
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
  console.log('🔍 [后端调试] totalBeads转换后值:', dbData.total_beads, '类型:', typeof dbData.total_beads)
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
          user_name: true
        }
      },
      material_usages: {
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
  if (existingPurchase.material_usages && existingPurchase.material_usages.length > 0) {
    const usedByProducts = existingPurchase.material_usages.map(usage => usage.product?.name || "未知产品").join('、')
    return res.status(400).json({
      success: false,
      message: `无法编辑该采购记录，因为以下成品正在使用其珠子：${usedByProducts}。请先将这些成品销毁，使珠子回退到库存后再编辑。`,
      data: {
        usedByProducts: existingPurchase.material_usages.map(usage => ({
          product_id: usage.product?.id || "",
          product_name: usage.product?.name || "未知产品",
          quantityUsed: usage.quantity_used || usage.quantity_used
        }))
      }
    })
  }
  
  // 处理供应商
  let supplier_id: string | undefined = existingPurchase.supplier_id || undefined
  if (dbData.supplier_name !== undefined) {
    if (dbData.supplier_name) {
      // 查找现有供应商
      let supplier = await prisma.supplier.findFirst({
        where: {
          name: dbData.supplier_name
        }
      })
      
      // 如果不存在则创建新供应商
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: {
            name: dbData.supplier_name
          }
        })
      }
      
      supplier_id = supplier.id
    } else {
      supplier_id = undefined
    }
  }
  
  // 计算相关数值
  const updateData: any = {
    ...dbData,
    supplier_id: supplier_id,
    last_edited_by_id: req.user?.id,
    updated_at: new Date()
  }
  
  // 移除supplierName字段，因为数据库中没有这个字段
  delete updateData.supplier_name
  
  // 如果更新了数量或直径，重新计算相关数值
  if (dbData.bead_diameter && !dbData.beadsPerString) {
    updateData.beads_per_string = calculateBeadsPerString(dbData.bead_diameter)
  }
  
  const finalQuantity = dbData.quantity ?? existingPurchase.quantity
  const finalBeadsPerString = updateData.beads_per_string ?? existingPurchase.beads_per_string
  const finalTotalPrice = dbData.total_price ?? existingPurchase.total_price
  
  // 保存用户手动设置的totalBeads值
  const userSetTotalBeads = dbData.total_beads
  const existingTotalBeads = existingPurchase.total_beads
  
  console.log('🔍 [totalBeads逻辑调试] 用户本次设置值:', userSetTotalBeads, '类型:', typeof userSetTotalBeads)
  console.log('🔍 [totalBeads逻辑调试] 数据库现有值:', existingTotalBeads, '类型:', typeof existingTotalBeads)
  console.log('🔍 [totalBeads逻辑调试] 自动计算条件 - quantity:', finalQuantity, 'beadsPerString:', finalBeadsPerString)
  
  // totalBeads字段处理逻辑：
  // 1. 如果用户本次手动设置了totalBeads，使用用户设置的值（最高优先级）
  // 2. 如果用户本次没有设置totalBeads，保持数据库中的现有值（保护用户之前的手动设置）
  // 3. 只有在数据库中没有totalBeads值且用户也没有设置时，才进行自动计算
  if (userSetTotalBeads !== undefined) {
    // 用户本次手动设置了totalBeads，使用用户的值
    updateData.total_beads = userSetTotalBeads
    console.log('🔍 [totalBeads处理] 使用用户本次设置值:', userSetTotalBeads)
  } else if (existingTotalBeads !== null && existingTotalBeads !== undefined) {
    // 用户本次没有设置totalBeads，但数据库中有现有值，保持现有值不变
    updateData.total_beads = existingTotalBeads
    console.log('🔍 [totalBeads处理] 保持数据库现有值:', existingTotalBeads)
  } else if (finalQuantity && finalBeadsPerString) {
    // 数据库中没有totalBeads值且用户也没有设置，进行自动计算
    updateData.total_beads = finalQuantity * finalBeadsPerString
    console.log('🔍 [totalBeads处理] 自动计算值:', finalQuantity * finalBeadsPerString)
  }
  
  // 根据产品类型计算相关的派生字段
  const finalPieceCount = dbData.piece_count ?? existingPurchase.piece_count
  const product_type = existingPurchase.product_type
  
  if (finalTotalPrice) {
    if (product_type === 'LOOSE_BEADS') {
      // 散珠：按颗计算
      if (finalPieceCount) {
        updateData.price_per_bead = finalTotalPrice / finalPieceCount
      }
    } else if (product_type === 'BRACELET') {
      // 手串：按串和颗计算
      if (updateData.total_beads && finalQuantity) {
        updateData.price_per_bead = finalTotalPrice / updateData.total_beads
        updateData.unit_price = finalTotalPrice / finalQuantity
      }
    } else if (product_type === 'ACCESSORIES' || product_type === 'FINISHED') {
      // 饰品配件和成品：按片/件计算
      if (finalPieceCount) {
        updateData.price_per_piece = finalTotalPrice / finalPieceCount
        updateData.unit_price = updateData.price_per_piece
      }
    }
    console.log('🔍 [派生字段计算] product_type:', product_type, 'price_per_bead:', updateData.price_per_bead, 'price_per_piece:', updateData.price_per_piece, 'unit_price:', updateData.unit_price)
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
    const camelCaseKey = convertFromApiFormat({[key]: (validatedData as any)[key]})
    const camelCaseFieldName = Object.keys(camelCaseKey)[0]
    const oldValue = (existingPurchase as any)[camelCaseFieldName]
    const newValue = (validatedData as any)[key]
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
          user_name: true
        }
      },
      last_edited_by: {
        select: {
          id: true,
          name: true,
          user_name: true
        }
      }
    }
  })
  
  // 创建详细的编辑日志
  if (fieldChanges.length > 0) {
    // 获取用户信息
    // const user = await prisma.user.findUnique({ // 暂时注释未使用的变量
    //   where: { id: req.user?.id },
    //   select: { name: true, role: true }
    // })
    
    const userRole = roleDisplayNames[req.user?.role || 'EMPLOYEE'] || '用户';
  const currentTime = new Date();
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
        purchase_id: id,
        user_id: req.user!.id,
        action: 'UPDATE',
        details: changeDetails,
        changed_fields: fieldChanges.map(change => ({
          field: change.field,
          displayName: change.displayName,
          oldValue: change.oldValue,
          newValue: change.newValue,
          timestamp: currentTime.toISOString()
        }))
      }
    })
  }
  
  return res.json({
    success: true,
    message: '采购记录更新成功',
    data: updatedPurchase
  })
  // 函数结束
  // 函数结束
}))

// 删除采购记录
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 权限检查：只有BOSS可以删除采购记录
  if ((req.user?.role || "USER" || "EMPLOYEE") !== 'BOSS') {
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
          user_name: true
        }
      },
      material_usages: {
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
  if (existingPurchase.material_usages && existingPurchase.material_usages.length > 0) {
    const usedByProducts = existingPurchase.material_usages.map(usage => usage.product?.name || "未知产品").join('、')
    return res.status(400).json({
      success: false,
      message: `无法删除该采购记录，因为以下成品正在使用其珠子：${usedByProducts}。请先将这些成品拆散，使珠子回退到库存后再删除。`,
      data: {
        usedByProducts: existingPurchase.material_usages.map(usage => ({
          product_id: usage.product?.id || "",
          product_name: usage.product?.name || "未知产品",
          quantityUsed: usage.quantity_used
        }))
      }
    })
  }
  
  // 获取用户信息用于日志记录
  // const user = await prisma.user.findUnique({ // 暂时注释未使用的变量
  //   where: { id: req.user?.id },
  //   select: { name: true, role: true }
  // })
  
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
          purchase_id: id,
          user_id: req.user!.id,
          action: 'DELETE',
          details: `老板 ${req.user?.user_name || "未知用户"} 在 ${timeStr} 删除了采购记录：${existingPurchase.product_name}（采购编号：${existingPurchase.purchase_code}）。该操作同时清理了相关库存数据。`,
          changed_fields: [{
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
    
    return res.json({
      success: true,
      message: '采购记录删除成功，相关库存数据已同步更新',
      data: {
        deletedPurchase: {
          id: existingPurchase.id,
          product_name: existingPurchase.product_name,
          purchase_code: existingPurchase.purchase_code
        }
      }
    })
  } catch (error) {
    console.error('删除采购记录失败:', error)
    
    // 检查是否是外键约束错误
    if ((error as any).code === 'P2003') {
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
  // 函数结束
  // 函数结束
}))

// 临时调试接口：查询指定采购编号的quality字段
  // 默认返回
  //   return res.status(500).json({ success: false, message: "操作失败" })  // 移除函数体外的return语句
router.get('/debug/quality/:purchase_code', authenticateToken, asyncHandler(async (req, res) => {
  const { purchase_code } = req.params
  
  const purchase = await prisma.purchase.findFirst({
    where: { purchase_code: purchase_code },
    select: {
      id: true,
      purchase_code: true,
      product_name: true,
      product_type: true,
      quality: true
    }
  })
  
  if (!purchase) {
    return res.status(404).json({
      success: false,
      message: '采购记录不存在'
    })
  }
  
  return res.json({
    success: true,
    data: {
      purchase_code: purchase.purchase_code,
      product_name: purchase.product_name,
      product_type: purchase.product_type,
      quality: purchase.quality,
      quality_type: typeof purchase.quality,
      quality_is_null: purchase.quality === null,
      quality_is_undefined: purchase.quality === undefined,
      quality_stringified: JSON.stringify(purchase.quality)
    }
  })
  // 函数结束
  // 函数结束
}))

export default router