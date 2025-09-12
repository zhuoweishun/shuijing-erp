import { Router } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { z } from 'zod'
import { authenticate_token } from '../middleware/auth'
import { prisma } from '../lib/prisma'
import { filterSensitiveFields } from '../utils/fieldConverter.js'
import {
  diameter_schema,
  specification_schema,
  quantity_schema,
  price_schema,
  weight_schema,
  material_type_schema,
  unit_type_schema,
  quality_schema,
  product_name_schema,
  supplier_name_schema,
  notes_schema,
  natural_language_input_schema,
  photos_schema,
  validate_product_type_fields,
  calculate_beads_per_string
} from '../utils/validation.js'
import { ErrorResponses, createSuccessResponse } from '../utils/errorResponse.js'
import { operation_logger } from '../utils/operationLogger.js'
import * as ExcelJS from 'exceljs'

const router = Router()

// 临时调试接口：查看原始数据和转换后数据
router.get('/debug/raw-data', authenticate_token, asyncHandler(async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      take: 2,
      select: {
      id: true,
      purchase_code: true,
      product_name: true,
      price_per_gram: true,
      total_price: true,
      quantity: true,
      bead_diameter: true,
      specification: true,
      material_type: true,
        quality: true
      }
    })
    
    res.json({
      success: true,
      message: '调试数据获取成功',
      data: purchases,
      count: purchases.length
    })
  } catch (error) {
    console.error('调试接口错误:', error)
    res.status(500).json({
      success: false,
      message: '调试接口错误',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
  return
}))

// 采购录入数据验证schema（接收snake_case命名的API参数）
const createPurchaseSchema = z.object({
  product_name: product_name_schema, // 统一使用snake_case
  material_type: material_type_schema.default('BRACELET'),
  unit_type: unit_type_schema.default('STRINGS'),
  bead_diameter: diameter_schema.optional(), // 散珠和手串必填，其他可选
  specification: specification_schema.optional(), // 通用规格字段
  quantity: quantity_schema.optional(), // 手串数量
  piece_count: quantity_schema.optional(), // 散珠颗数/饰品片数/成品件数
  min_stock_alert: quantity_schema.optional(),
  price_per_gram: price_schema.optional(),
  total_price: price_schema.optional(),
  weight: weight_schema.optional(),
  quality: quality_schema.optional(),
  photos: photos_schema,
  notes: notes_schema,
  natural_language_input: natural_language_input_schema,
  supplier_name: supplier_name_schema.optional(),
  ai_recognition_result: z.any().optional()
}).refine((data) => {
  // 使用统一的产品类型字段验证
  const validation = validate_product_type_fields({
    material_type: data.material_type, // 修复：使用snake_case字段名
    bead_diameter: data.bead_diameter,
    specification: data.specification
  })
  return validation.is_valid
}, {
  message: '散珠和手串需要填写珠子直径，饰品配件和成品需要填写规格'
})

// 生成采购编号
function generatePurchaseCode(): string {
  const now = new Date()
  const date_str = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `CG${date_str}${randomNum}`
}

// calculateBeadsPerString函数已移至utils/validation.ts中

// 获取采购列表
router.get('/', authenticate_token, asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    purchase_code_search,
    quality, 
    start_date, 
    end_date, 
    sort_by, 
    sort_order,
    diameter_min,
    diameter_max,
    quantity_min,
    quantity_max,
    price_per_gram_min,
    price_per_gram_max,
    total_price_min,
    total_price_max,
    supplier,
    specification_min,
    specification_max,
    material_types
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
        const hasNull = quality.includes('null') || quality.includes('UNKNOWN')
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
  
  if (start_date || end_date) {
    // 添加日期参数调试日志
    console.log('后端接收到的日期参数:', {
      start_date,
      end_date,
      start_date_type: typeof start_date,
      end_date_type: typeof end_date
    })
    
    where.purchase_date = {}
    if (start_date) {
      // 确保开始日期从当天00:00:00开始
      const start_date_obj = new Date(start_date as string + 'T00:00:00.000Z')
      where.purchase_date.gte = start_date_obj
      console.log('开始日期处理:', {
        原始值: start_date,
        转换后: start_date_obj,
        ISO字符串: start_date_obj.toISOString(),
        本地时间: start_date_obj.toLocaleString('zh-CN')
      })
    }
    if (end_date) {
      // 确保结束日期到当天23:59:59结束
      const end_date_obj = new Date(end_date as string + 'T23:59:59.999Z')
      where.purchase_date.lte = end_date_obj
      console.log('结束日期处理:', {
        原始值: end_date,
        转换后: end_date_obj,
        ISO字符串: end_date_obj.toISOString(),
        本地时间: end_date_obj.toLocaleString('zh-CN')
      })
    }
    
    console.log('最终日期筛选条件:', where.purchase_date)
  }
  
  // 供应商筛选：支持多选，添加错误处理
  if (supplier) {
    try {
      if (Array.isArray(supplier)) {
        // 多个供应商：使用IN查询，过滤空值
        const validSuppliers = (supplier as string[]).filter(s => s && typeof s === 'string' && s.trim())
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
  if (diameter_min || diameter_max) {
    where.bead_diameter = {}
    if (diameter_min) where.bead_diameter.gte = parseFloat(diameter_min as string)
    if (diameter_max) where.bead_diameter.lte = parseFloat(diameter_max as string)
  }
  
  // 数量范围筛选
  if (quantity_min || quantity_max) {
    where.quantity = {}
    if (quantity_min) where.quantity.gte = parseInt(quantity_min as string)
    if (quantity_max) where.quantity.lte = parseInt(quantity_max as string)
  }
  
  // 克价范围筛选（将null值视为0处理）
  if (price_per_gram_min || price_per_gram_max) {
    const min_value = parseFloat(price_per_gram_min as string)
    const max_value = parseFloat(price_per_gram_max as string)
    
    // 构建OR条件：包含null值（视为0）和实际值范围
    const price_conditions = []
    
    if (price_per_gram_min) {
      if (min_value <= 0) {
        // 如果最小值<=0，包含null值和>=min_value的记录
        price_conditions.push(
          { price_per_gram: null },
          { price_per_gram: { gte: min_value } }
        )
      } else {
        // 如果最小值>0，只包含>=min_value的记录
        price_conditions.push({ price_per_gram: { gte: min_value } })
      }
    } else {
      // 没有最小值限制，包含null值
      price_conditions.push({ price_per_gram: null })
    }
    
    if (price_per_gram_max) {
      // 添加最大值限制（null值视为0，如果max_value>=0则包含null）
      if (max_value >= 0) {
        if (!price_conditions.some(c => c.price_per_gram === null)) {
          price_conditions.push({ price_per_gram: null })
        }
      }
      // 为非null值添加最大值限制
      const existing_condition = price_conditions.find(c => c.price_per_gram && typeof c.price_per_gram === 'object' && 'gte' in c.price_per_gram)
      if (existing_condition && existing_condition.price_per_gram && typeof existing_condition.price_per_gram === 'object') {
        (existing_condition.price_per_gram as any).lte = max_value
      } else {
        price_conditions.push({ price_per_gram: { lte: max_value } })
      }
    }
    
    // 应用OR条件
    if (price_conditions.length > 0) {
      if (where.OR) {
        // 如果已有OR条件，需要重新组织为AND结构
        const existing_or = where.OR
        delete where.OR
        where.AND = [
          { OR: existing_or },
          { OR: price_conditions }
        ]
      } else if (where.AND) {
        // 如果已有AND条件，添加克价筛选
        where.AND.push({ OR: price_conditions })
      } else {
        // 没有其他条件，直接设置OR条件
        where.OR = price_conditions
      }
    }
  }
  
  // 总价范围筛选
  if (total_price_min || total_price_max) {
    where.total_price = {}
    if (total_price_min) {
      where.total_price.gte = parseFloat(total_price_min as string)
    }
    if (total_price_max) {
      where.total_price.lte = parseFloat(total_price_max as string)
    }
  }
  
  // 预处理 material_types 参数：如果是字符串且包含逗号，则分割为数组
  let processed_product_types = material_types;
  if (material_types && typeof material_types === 'string' && material_types.includes(',')) {
    processed_product_types = material_types.split(',').map(type => type.trim());
  }
  
  // 处理规格筛选：根据产品类型选择正确的字段进行范围筛选
  if (specification_min || specification_max) {
    const min_value = specification_min ? parseFloat(specification_min as string) : undefined;
    const max_value = specification_max ? parseFloat(specification_max as string) : undefined;
    
    // 使用正确的逻辑：根据产品类型选择对应的字段进行范围筛选
    const specificationConditions = [];
    
    // 散珠和手串：使用bead_diameter字段
    if (min_value !== undefined || max_value !== undefined) {
      specificationConditions.push({
        AND: [
          { material_type: { in: ['LOOSE_BEADS', 'BRACELET'] } },
          {
            bead_diameter: {
              ...(min_value !== undefined && { gte: min_value }),
              ...(max_value !== undefined && { lte: max_value })
            }
          }
        ]
      });
    }
    
    // 饰品配件和成品：使用specification字段
    if (min_value !== undefined || max_value !== undefined) {
      specificationConditions.push({
        AND: [
          { material_type: { in: ['ACCESSORIES', 'FINISHED'] } },
          {
            specification: {
              ...(min_value !== undefined && { gte: min_value }),
              ...(max_value !== undefined && { lte: max_value })
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
  if (processed_product_types) {
    // 特殊处理：如果material_types是空数组，应该返回空结果
    if (Array.isArray(processed_product_types) && processed_product_types.length === 0) {
      where.material_type = { in: [] }; // 空数组会导致查询返回空结果
    } else {
      const types = Array.isArray(processed_product_types) ? processed_product_types : [processed_product_types];
      
      if (where.AND) {
        // 如果已有AND条件（如规格筛选），添加产品类型筛选
        where.AND.push({ material_type: { in: types } });
      } else if (where.OR) {
        // 如果已有OR条件（如规格筛选），需要重新组织为AND结构
        const existing_or = where.OR;
        delete where.OR;
        where.AND = [
          { OR: existing_or },
          { material_type: { in: types } }
        ];
      } else {
        // 没有其他条件，直接设置产品类型筛选
        where.material_type = { in: types };
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
    
    // 处理搜索条件 - 采购的原材料名称
    if (whereObj.material_name && whereObj.material_name.contains) {
      conditions.push(`p.product_name LIKE '%${whereObj.material_name.contains}%'`);
    }
    // 兼容旧字段名
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
                // 采购的原材料类型
                if (nestedCondition.material_type && nestedCondition.material_type.in) {
                  const types = nestedCondition.material_type.in.map((t: string) => `'${t}'`).join(',');
                  nestedAndParts.push(`p.material_type IN (${types})`);
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
                    nestedAndParts.push(`p.specification <= ${nestedCondition.specification.lte}`);
                  }
                }
              });
              
              if (nestedAndParts.length > 0) {
                orParts.push(`(${nestedAndParts.join(' AND ')})`);
              }
            } else {
              // 处理原有的简单条件 - 采购的原材料类型
              if (orCondition.material_type && orCondition.material_type.in) {
                const types = orCondition.material_type.in.map((t: string) => `'${t}'`).join(',');
                orParts.push(`p.material_type IN (${types})`);
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
        } else if (andCondition.material_type && andCondition.material_type.in) {
          const types = andCondition.material_type.in.map((t: string) => `'${t}'`).join(',');
          conditions.push(`p.material_type IN (${types})`);
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
            if (nestedCondition.material_type && nestedCondition.material_type.in) {
              const types = nestedCondition.material_type.in.map((t: string) => `'${t}'`).join(',');
              nestedAndParts.push(`p.material_type IN (${types})`);
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
                nestedAndParts.push(`p.specification <= ${nestedCondition.specification.lte}`);
              }
            }
          });
          
          if (nestedAndParts.length > 0) {
            orParts.push(`(${nestedAndParts.join(' AND ')})`);
          }
        } else {
          // 处理原有的简单条件
          if (orCondition.material_type && orCondition.material_type.in) {
            const types = orCondition.material_type.in.map((t: string) => `'${t}'`).join(',');
            orParts.push(`p.material_type IN (${types})`);
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
    
    // 处理直接的materialType条件
    if (whereObj.material_type && whereObj.material_type.in && !whereObj.AND && !whereObj.OR) {
      const types = whereObj.material_type.in.map((t: string) => `'${t}'`).join(',');
      conditions.push(`p.material_type IN (${types})`);
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
  let order_by: any = { created_at: 'desc' } // 默认排序
  
  // 添加排序调试日志
  console.log('=== 排序调试信息 ===');
  console.log('原始排序参数:', { sort_by, sort_order });
  
  if (sort_by && sort_order) {
    
    const field = (validSortFields as any)[sort_by as string]
    console.log('映射后的字段:', field);
    
    if (field && (sort_order === 'asc' || sort_order === 'desc')) {
      if (field === 'supplier.name') {
        order_by = {
          supplier: {
            name: sort_order
          }
        }
      } else if (field === 'specification') {
        // 规格字段需要根据产品类型动态排序
        // 散珠和手串按bead_diameter排序，其他按specification排序
        // 使用原生SQL实现混合字段排序
        
        // 添加调试日志
        console.log('=== 规格排序调试信息 ===');
        console.log('原始where对象:', JSON.stringify(where, null, 2));
        
        const whereClause = buildWhereClause(where)
        console.log('生成的WHERE子句:', whereClause);
        
        const order_clause = sort_order === 'asc' ? 'ASC' : 'DESC'
        
        const rawQuery = `
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.user_name as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplier_id = s.id
           LEFT JOIN users u ON p.user_id = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             CASE 
               WHEN p.material_type IN ('LOOSE_BEADS', 'BRACELET') THEN p.bead_diameter
               ELSE p.specification
             END ${order_clause},
             p.id ${order_clause}
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
            user_name: p.user_username
          }
        }))
        
        // 添加调试日志
        console.log('规格排序结果预览:');
        purchases.slice(0, 15).forEach((p, index) => {
          const displaySpec = ['LOOSE_BEADS', 'BRACELET'].includes(p.material_type) ? p.bead_diameter : p.specification
          console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.material_type}, 显示规格: ${displaySpec}mm, 珠径: ${p.bead_diameter}, 规格: ${p.specification}, ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          return filterSensitiveFields(purchase, req.user!.role)
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
        // 手串按quantity排序，其他按piece_count排序
        // 使用原生SQL实现混合字段排序
        const whereClause = buildWhereClause(where)
        const order_clause = sort_order === 'asc' ? 'ASC' : 'DESC'
        
        const rawQuery = `
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.user_name as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplier_id = s.id
           LEFT JOIN users u ON p.user_id = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             CASE 
               WHEN p.material_type = 'BRACELET' THEN p.quantity
               ELSE p.piece_count
             END ${order_clause},
             p.id ${order_clause}
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
            user_name: p.user_username
          }
        }))
        
        // 添加调试日志
        console.log('数量排序结果预览:');
        purchases.slice(0, 15).forEach((p, index) => {
          const displayQuantity = p.material_type === 'BRACELET' ? p.quantity : p.piece_count
          const displayUnit = p.material_type === 'BRACELET' ? '条' :
                             p.material_type === 'LOOSE_BEADS' ? '颗' :
                             p.material_type === 'ACCESSORIES' ? '片' : '件'
          console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.material_type}, 显示数量: ${displayQuantity}${displayUnit}, 手串数量: ${p.quantity}, 件数: ${p.piece_count}, ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          return filterSensitiveFields(purchase, req.user!.role)
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
        const order_clause = sort_order === 'asc' ? 'ASC' : 'DESC'
        
        const rawQuery = `
           SELECT p.*, s.name as supplier_name, u.id as user_id, u.name as user_name, u.user_name as user_username
           FROM purchases p
           LEFT JOIN suppliers s ON p.supplier_id = s.id
           LEFT JOIN users u ON p.user_id = u.id
           ${whereClause ? `WHERE ${whereClause}` : ''}
           ORDER BY 
             COALESCE(p.price_per_gram, 0) ${order_clause},
             p.id ${order_clause}
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
            user_name: p.user_username
          }
        }))
        
        // 添加调试日志
        console.log('克价排序结果预览（null视为0）:');
        purchases.slice(0, 15).forEach((p, index) => {
          const displayPrice = p.price_per_gram !== null ? p.price_per_gram : 0
          console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.material_type}, 克价: ${p.price_per_gram}(显示为${displayPrice}), ID: ${p.id}`);
        });
        
        const total = await prisma.purchase.count({ where })
        
        // 根据用户角色过滤敏感信息
        const filteredPurchases = purchases.map(purchase => {
          return filterSensitiveFields(purchase, req.user!.role)
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
        order_by = {
          [field]: sort_order
        }
      }
      console.log('最终order_by对象:', JSON.stringify(order_by, null, 2));
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
    orderBy: order_by,
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit)
  })
  
  // 添加查询结果调试日志
  console.log('查询结果数量:', purchases.length);
  if (sort_by === 'specification') {
    console.log('规格排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.material_type}, 规格: ${p.specification}, 珠径: ${p.bead_diameter}, ID: ${p.id}`);
    });
    
    // 检查是否真的按规格排序
    console.log('规格值序列:', purchases.slice(0, 15).map(p => p.specification));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.material_type));
    
    // 分析null值分布
    const null_count = purchases.filter(p => p.specification === null).length;
    const non_null_count = purchases.filter(p => p.specification !== null).length;
    console.log(`规格字段null值统计: null=${null_count}, 非null=${non_null_count}`);
  }
  
  if (sort_by === 'quantity') {
    console.log('数量排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.material_type}, 数量: ${p.quantity}, ID: ${p.id}`);
    });
    
    // 检查是否真的按数量排序
    console.log('数量值序列:', purchases.slice(0, 15).map(p => p.quantity));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.material_type));
    
    // 分析null值分布
    const null_count = purchases.filter(p => p.quantity === null).length;
    const non_null_count = purchases.filter(p => p.quantity !== null).length;
    console.log(`数量字段null值统计: null=${null_count}, 非null=${non_null_count}`);
  }
  
  if (sort_by === 'price_per_gram') {
    console.log('克价排序结果预览:');
    purchases.slice(0, 15).forEach((p, index) => {
      console.log(`${index + 1}. 产品: ${p.product_name}, 产品类型: ${p.material_type}, 克价: ${p.price_per_gram}, ID: ${p.id}`);
    });
    
    // 检查是否真的按克价排序
    console.log('克价值序列:', purchases.slice(0, 15).map(p => p.price_per_gram));
    console.log('产品类型序列:', purchases.slice(0, 15).map(p => p.material_type));
    
    // 分析null值分布
    const null_count = purchases.filter(p => p.price_per_gram === null).length;
    const non_null_count = purchases.filter(p => p.price_per_gram !== null).length;
    console.log(`克价字段null值统计: null=${null_count}, 非null=${non_null_count}`);
  }
  
  const total = await prisma.purchase.count({ where })
  
  // 根据用户角色过滤敏感信息
  const filteredPurchases = purchases.map(purchase => {
    return filterSensitiveFields(purchase, req.user!.role)
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
  return
}))

// 创建采购记录
router.post('/', authenticate_token, asyncHandler(async (req, res) => {
  console.log('📥 [采购创建] 接收到的数据:', req.body)
  
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
  let beads_per_string: number | undefined
  let total_beads: number | undefined
  let price_per_bead: number | undefined
  let price_per_piece: number | undefined
  let unit_price: number | undefined
  
  // 设置规格字段（统一存储在specification中）
  const specification = validatedData.specification || validatedData.bead_diameter
  
  if (validatedData.material_type === 'LOOSE_BEADS') {
    // 散珠：按颗计算
    if (validatedData.bead_diameter && validatedData.piece_count) {
      beads_per_string = calculate_beads_per_string(validatedData.bead_diameter)
      total_beads = validatedData.piece_count
      price_per_bead = validatedData.total_price ? validatedData.total_price / validatedData.piece_count : undefined
    }
  } else if (validatedData.material_type === 'BRACELET') {
    // 手串：保持原有逻辑
    if (validatedData.bead_diameter) {
      beads_per_string = calculate_beads_per_string(validatedData.bead_diameter)
      total_beads = validatedData.quantity ? validatedData.quantity * beads_per_string : undefined
      price_per_bead = validatedData.total_price && total_beads ? validatedData.total_price / total_beads : undefined
      unit_price = validatedData.total_price && validatedData.quantity ? validatedData.total_price / validatedData.quantity : undefined
    }
  } else if (validatedData.material_type === 'ACCESSORIES') {
    // 饰品配件：按片计算
    if (validatedData.piece_count && validatedData.total_price) {
      price_per_piece = validatedData.total_price / validatedData.piece_count
      unit_price = price_per_piece // 对于饰品配件，单价就是每片价格
    }
  } else if (validatedData.material_type === 'FINISHED') {
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
      material_type: validatedData.material_type,
      unit_type: validatedData.unit_type,
      bead_diameter: validatedData.bead_diameter,
      specification,
      quantity: validatedData.quantity,
      piece_count: validatedData.piece_count,
      min_stock_alert: validatedData.min_stock_alert,
      price_per_gram: validatedData.price_per_gram,
      total_price: validatedData.total_price,
      weight: validatedData.weight,
      beads_per_string: beads_per_string,
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
  await operation_logger.log_purchase_create(
    req.user!.id,
    purchase.id,
    purchase,
    req.ip
  )
  
  // 自动创建财务支出记录
  if (validatedData.total_price && validatedData.total_price > 0) {
    await prisma.financial_record.create({
      data: {
        record_type: 'EXPENSE',
        amount: validatedData.total_price,
        description: `采购支出 - ${validatedData.product_name}`,
        reference_type: 'PURCHASE',
        reference_id: purchase.id,
        category: '采购支出',
        transaction_date: purchase.purchase_date,
        notes: `采购编号：${purchase.purchase_code}`,
        user_id: req.user!.id
      }
    })
  }
  
  // 过滤敏感字段
  const filteredPurchase = filterSensitiveFields(purchase, req.user!.role)
  
  res.status(201).json({
    success: true,
    message: '采购记录创建成功',
    data: filteredPurchase
  })
  return
}))

// 获取单个采购记录
router.get('/:id', authenticate_token, asyncHandler(async (req, res) => {
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
      ErrorResponses.record_not_found('采购记录不存在')
    )
  }
  
  // 权限控制：所有用户都可以查看采购记录详情，但雇员看到的敏感字段会被过滤
  // 不再限制雇员只能查看自己创建的记录
  
  // 根据用户角色过滤敏感信息
  const filteredPurchase = filterSensitiveFields(purchase, req.user!.role)
  
  res.json({
    success: true,
    data: filteredPurchase
  })
  return
}))

// 更新采购记录数据验证schema（接收snake_case命名的API参数）
const updatePurchaseSchema = z.object({
  product_name: z.string().min(1, '产品名称不能为空').max(200, '产品名称不能超过200字符').optional(),
  quantity: z.number().int().positive('数量必须是正整数').optional(),
  piece_count: z.number().int().positive('颗数/片数/件数必须是正整数').optional(),
  bead_diameter: diameter_schema.optional(),
  specification: specification_schema.optional(),
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
router.put('/:id', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 权限检查：只有老板可以编辑
  if (req.user!.role !== 'BOSS') {
    return res.status(403).json(
      ErrorResponses.insufficient_permissions('权限不足，只有老板可以编辑采购记录')
    )
  }
  
  // 验证请求数据
  const validatedData = updatePurchaseSchema.parse(req.body)
  
  console.log('🔍 [后端调试] 接收到的原始数据:', validatedData)
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
    const usedByProducts = existingPurchase.material_usages.map(usage => usage.product?.name || '未知产品').join('、')
    return res.status(400).json({
      success: false,
      message: `无法编辑该采购记录，因为以下成品正在使用其珠子：${usedByProducts}。请先将这些成品销毁，使珠子回退到库存后再编辑。`,
      data: {
        usedByProducts: existingPurchase.material_usages.map(usage => ({
          product_id: usage.product?.id || '',
          product_name: usage.product?.name || '未知产品',
          quantity_used: usage.quantity_used
        }))
      }
    })
  }
  
  // 处理供应商
  let supplier_id: string | undefined = existingPurchase.supplier_id || undefined
  if (validatedData.supplier_name !== undefined) {
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
    } else {
      supplier_id = undefined
    }
  }
  
  // 计算相关数值
  const updateData: any = {
    ...validatedData,
    supplier_id: supplier_id,
    last_edited_by_id: req.user!.id,
    updated_at: new Date()
  }
  
  // 移除supplierName字段，因为数据库中没有这个字段
  delete updateData.supplier_name
  
  // 如果更新了数量或直径，重新计算相关数值
  if (validatedData.bead_diameter && !validatedData.beads_per_string) {
    updateData.beads_per_string = calculate_beads_per_string(validatedData.bead_diameter)
  }
  
  const finalQuantity = validatedData.quantity ?? existingPurchase.quantity
  const finalBeadsPerString = updateData.beads_per_string ?? existingPurchase.beads_per_string
  const finalTotalPrice = validatedData.total_price ?? existingPurchase.total_price
  
  // 保存用户手动设置的totalBeads值
  const userSetTotalBeads = validatedData.total_beads
  const existingTotalBeads = existingPurchase.total_beads
  
  console.log('🔍 [totalBeads逻辑调试] 用户本次设置值:', userSetTotalBeads, '类型:', typeof userSetTotalBeads)
  console.log('🔍 [totalBeads逻辑调试] 数据库现有值:', existingTotalBeads, '类型:', typeof existingTotalBeads)
  console.log('🔍 [totalBeads逻辑调试] 自动计算条件 - quantity:', finalQuantity, 'beads_per_string:', finalBeadsPerString)
  
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
  const finalPieceCount = validatedData.piece_count ?? existingPurchase.piece_count
  const material_type = existingPurchase.material_type
  
  if (finalTotalPrice) {
    if (material_type === 'LOOSE_BEADS') {
      // 散珠：按颗计算
      if (finalPieceCount) {
        updateData.price_per_bead = Number(finalTotalPrice) / Number(finalPieceCount)
      }
    } else if (material_type === 'BRACELET') {
      // 手串：按串和颗计算
      if (updateData.total_beads && finalQuantity) {
        updateData.price_per_bead = Number(finalTotalPrice) / Number(updateData.total_beads)
        updateData.unit_price = Number(finalTotalPrice) / Number(finalQuantity)
      }
    } else if (material_type === 'ACCESSORIES' || material_type === 'FINISHED') {
      // 饰品配件和成品：按片/件计算
      if (finalPieceCount) {
        updateData.price_per_piece = Number(finalTotalPrice) / Number(finalPieceCount)
        updateData.unit_price = updateData.price_per_piece
      }
    }
    console.log('🔍 [派生字段计算] material_type:', material_type, 'price_per_bead:', updateData.price_per_bead, 'price_per_piece:', updateData.price_per_piece, 'unit_price:', updateData.unit_price)
  }
  
  // 记录修改的字段详细信息
  const fieldChanges: Array<{field: string, oldValue: any, newValue: any, display_name: string}> = []
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
    // 直接使用snake_case字段名映射到数据库字段
    const dbFieldName = key === 'bead_diameter' ? 'bead_diameter' : 
                       key === 'piece_count' ? 'piece_count' :
                       key === 'price_per_gram' ? 'price_per_gram' :
                       key === 'total_price' ? 'total_price' :
                       key === 'material_type' ? 'material_type' :
                       key === 'unit_type' ? 'unit_type' :
                       key === 'product_name' ? 'product_name' :
                       key === 'supplier_name' ? 'supplier_name' : key
    const oldValue = (existingPurchase as any)[dbFieldName]
    const newValue = (validatedData as any)[key]
    if (newValue !== oldValue) {
      fieldChanges.push({
        field: key,
        oldValue: oldValue,
        newValue: newValue,
        display_name: fieldDisplayNames[key] || key
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
        display_name: '供应商'
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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true, role: true }
    })
    
    const user_name = user?.name || '未知用户'
    const user_role = roleDisplayNames[user?.role || 'EMPLOYEE'] || '用户'
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
      return `${change.display_name}从 ${oldValueStr} 改为 ${newValueStr}`
    })
    
    const changeDetails = `${user_role} 在 ${timeStr} 将${changes.join('，')}`
    
    await prisma.edit_log.create({
      data: {
        purchase_id: id,
        user_id: req.user!.id,
        action: 'UPDATE',
        details: changeDetails,
        changed_fields: fieldChanges.map(change => ({
          field: change.field,
          display_name: change.display_name,
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
  return
}))

// 删除采购记录
router.delete('/:id', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  
  // 权限检查：只有BOSS可以删除采购记录
  if (req.user!.role !== 'BOSS') {
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
  
  // 检查采购记录状态：只允许删除ACTIVE状态的记录
  if (existingPurchase.status === 'USED') {
    return res.status(400).json({
      success: false,
      message: '无法删除该采购记录，因为它已被用于制作SKU。请先销毁相关SKU并选择退回原材料，然后再删除此记录。'
    })
  }
  
  // 检查是否有成品使用了该采购记录的珠子
  if (existingPurchase.material_usages && existingPurchase.material_usages.length > 0) {
    const usedByProducts = existingPurchase.material_usages.map(usage => usage.product?.name || '未知产品').join('、')
    return res.status(400).json({
      success: false,
      message: `无法删除该采购记录，因为以下成品正在使用其珠子：${usedByProducts}。请先将这些成品拆散，使珠子回退到库存后再删除。`,
      data: {
        usedByProducts: existingPurchase.material_usages.map(usage => ({
          product_id: usage.product?.id || '',
          product_name: usage.product?.name || '未知产品',
          quantity_used: usage.quantity_used
        }))
      }
    })
  }
  
  // 获取用户信息用于日志记录
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { name: true, role: true }
  })
  
  const user_name = user?.name || '未知用户'
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
      await tx.edit_log.create({
        data: {
          purchase_id: id,
          user_id: req.user!.id,
          action: 'DELETE',
          details: `老板 ${user_name} 在 ${timeStr} 删除了采购记录：${existingPurchase.product_name}（采购编号：${existingPurchase.purchase_code}）。该操作同时清理了相关库存数据和财务记录。`,
          changed_fields: [{
            field: 'deleted',
            display_name: '删除操作',
            oldValue: '存在',
            newValue: '已删除',
            timestamp: currentTime.toISOString()
          }]
        }
      })
      
      // 删除相关的财务支出记录
      await tx.financial_record.deleteMany({
        where: {
          reference_type: 'PURCHASE',
          reference_id: id
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
  return
}))

// 临时调试接口：查询指定采购编号的quality字段
router.get('/debug/quality/:purchase_code', authenticate_token, asyncHandler(async (req, res) => {
  const { purchase_code } = req.params
  
  const purchase = await prisma.purchase.findFirst({
    where: { purchase_code: purchase_code },
    select: {
      id: true,
      purchase_code: true,
      product_name: true,
      material_type: true,
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
      purchase_code: purchase.purchase_code,
      product_name: purchase.product_name,
      material_type: purchase.material_type,
      quality: purchase.quality,
      qualityType: typeof purchase.quality,
      qualityIsNull: purchase.quality === null,
      qualityIsUndefined: purchase.quality === undefined,
      qualityStringified: JSON.stringify(purchase.quality)
    }
  })
  return
}))

// Excel导出接口
router.get('/export/excel', authenticate_token, asyncHandler(async (req, res) => {
  const { 
    search, 
    purchase_code_search,
    quality, 
    start_date, 
    end_date, 
    sort_by, 
    sort_order,
    diameter_min,
    diameter_max,
    quantity_min,
    quantity_max,
    price_per_gram_min,
    price_per_gram_max,
    total_price_min,
    total_price_max,
    supplier,
    specification_min,
    specification_max,
    material_types
  } = req.query
  
  const where: any = {}
  
  // 构建筛选条件（与采购列表查询相同的逻辑）
  if (search) {
    where.product_name = {
      contains: search as string
    }
  }
  
  if (purchase_code_search) {
    where.purchase_code = {
      contains: purchase_code_search as string
    }
  }
  
  // 品相筛选
  if (quality !== undefined) {
    if (Array.isArray(quality)) {
      if (quality.length === 0) {
        where.quality = { in: [] }
      } else {
        const hasNull = quality.includes('null') || quality.includes('UNKNOWN')
        const nonNullQualities = quality.filter(q => q !== null && q !== 'null' && q !== 'UNKNOWN')
        
        if (hasNull && nonNullQualities.length > 0) {
          where.OR = [
            { quality: { in: nonNullQualities } },
            { quality: null }
          ]
        } else if (hasNull) {
          where.quality = null
        } else {
          where.quality = { in: nonNullQualities }
        }
      }
    } else {
      where.quality = (quality === 'null' || quality === 'UNKNOWN') ? null : quality
    }
  }
  
  // 日期范围筛选
  if (start_date || end_date) {
    where.purchase_date = {}
    if (start_date) {
      where.purchase_date.gte = new Date(start_date as string)
    }
    if (end_date) {
      const endDateObj = new Date(end_date as string)
      endDateObj.setHours(23, 59, 59, 999)
      where.purchase_date.lte = endDateObj
    }
  }
  
  // 供应商筛选
  if (supplier && Array.isArray(supplier) && supplier.length > 0) {
    where.supplier = {
      name: { in: supplier }
    }
  }
  
  // 数值范围筛选
  const diameterMinVal = diameter_min || undefined
  const diameterMaxVal = diameter_max || undefined
  const specMinVal = specification_min || undefined
  const specMaxVal = specification_max || undefined
  const qtyMinVal = quantity_min || undefined
  const qtyMaxVal = quantity_max || undefined
  const pricePerGramMinVal = price_per_gram_min || undefined
  const pricePerGramMaxVal = price_per_gram_max || undefined
  const total_price_minVal = total_price_min || undefined
  const total_price_maxVal = total_price_max || undefined
  
  if (diameterMinVal || diameterMaxVal) {
    where.bead_diameter = {}
    if (diameterMinVal) where.bead_diameter.gte = parseFloat(diameterMinVal as string)
    if (diameterMaxVal) where.bead_diameter.lte = parseFloat(diameterMaxVal as string)
  }
  
  if (specMinVal || specMaxVal) {
    where.specification = {}
    if (specMinVal) where.specification.gte = parseFloat(specMinVal as string)
    if (specMaxVal) where.specification.lte = parseFloat(specMaxVal as string)
  }
  
  if (qtyMinVal || qtyMaxVal) {
    where.OR = [
      {
        quantity: {
          ...(qtyMinVal && { gte: parseInt(qtyMinVal as string) }),
          ...(qtyMaxVal && { lte: parseInt(qtyMaxVal as string) })
        }
      },
      {
        piece_count: {
          ...(qtyMinVal && { gte: parseInt(qtyMinVal as string) }),
          ...(qtyMaxVal && { lte: parseInt(qtyMaxVal as string) })
        }
      }
    ]
  }
  
  if (pricePerGramMinVal || pricePerGramMaxVal) {
    where.price_per_gram = {}
    if (pricePerGramMinVal) where.price_per_gram.gte = parseFloat(pricePerGramMinVal as string)
    if (pricePerGramMaxVal) where.price_per_gram.lte = parseFloat(pricePerGramMaxVal as string)
  }
  
  if (total_price_minVal || total_price_maxVal) {
    where.total_price = {}
    if (total_price_minVal) where.total_price.gte = parseFloat(total_price_minVal as string)
    if (total_price_maxVal) where.total_price.lte = parseFloat(total_price_maxVal as string)
  }
  
  // 原材料类型筛选（采购模块中的materialType实际指原材料类型）
  if (material_types !== undefined) {
    if (Array.isArray(material_types)) {
      where.material_type = { in: material_types }
    } else {
      where.material_type = material_types
    }
  }
  
  // 构建排序条件
  const order_by: any = {}
  if (sort_by && sort_order) {
    const fieldMapping: { [key: string]: string } = {
      'purchase_date': 'purchase_date',
      'purchase_code': 'purchase_code',
      'material_name': 'product_name',  // 采购的原材料名称
      'product_name': 'product_name',   // 兼容旧字段名
      'specification': 'specification',
      'supplier': 'supplier',
      'quantity': 'quantity',
      'price_per_gram': 'price_per_gram',
      'total_price': 'total_price',
      'bead_diameter': 'bead_diameter'
    }
    const dbField = fieldMapping[sort_by as string] || sort_by
    order_by[dbField as string] = sort_order as string
  } else {
    order_by.purchase_date = 'desc' // 默认按采购日期降序
  }
  
  try {
    // 获取所有符合条件的采购记录（不分页）
    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            user_name: true
          }
        },
        material_usages: {
          select: {
            quantity_used: true
          }
        }
      }
    })
    
    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('采购记录')
    
    // 设置列标题
    const columns = [
      { header: '采购编号', key: 'purchase_code', width: 20 },
      { header: '原材料名称', key: 'material_name', width: 25 },  // 更准确的业务含义
      { header: '原材料类型', key: 'material_type', width: 15 },  // 更准确的业务含义
      { header: '品质', key: 'quality', width: 10 },
      { header: '规格', key: 'specification', width: 15 },
      { header: '数量', key: 'quantity', width: 15 },
      { header: '总价格', key: 'total_price', width: 15 },
      { header: '供应商', key: 'supplier_name', width: 20 },
      { header: '采购日期', key: 'purchase_date', width: 20 },
      {header: '剩余数量', key: 'remaining_quantity', width: 15 },
      { header: '创建时间', key: 'created_at', width: 20 }
    ]
    
    worksheet.columns = columns
    
    // 设置标题行样式
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    }
    
    // 格式化原材料类型（采购模块中的materialType实际指原材料类型）
    const formatMaterialType = (material_type: string) => {
      const type_map = {
        'LOOSE_BEADS': '散珠原料',
        'BRACELET': '手串原料', 
        'ACCESSORIES': '饰品配件原料',
        'FINISHED': '成品原料'
      }
      return type_map[material_type as keyof typeof type_map] || material_type
    }
    
    // 格式化规格（基于采购的原材料类型）
    const format_specification = (purchaseRecord: any) => {
      if (purchaseRecord.material_type === 'LOOSE_BEADS' || purchaseRecord.material_type === 'BRACELET') {
        return purchaseRecord.bead_diameter ? `${purchaseRecord.bead_diameter}mm` : '-'
      } else {
        return purchaseRecord.specification ? `${purchaseRecord.specification}mm` : '-'
      }
    }
    
    // 格式化数量（基于采购的原材料类型）
    const format_quantity = (purchaseRecord: any) => {
      switch (purchaseRecord.material_type) {
        case 'LOOSE_BEADS':
          return purchaseRecord.piece_count ? `${purchaseRecord.piece_count}颗` : '-'
        case 'BRACELET':
          return purchaseRecord.quantity ? `${purchaseRecord.quantity}条` : '-'
        case 'ACCESSORIES':
          return purchaseRecord.piece_count ? `${purchaseRecord.piece_count}片` : '-'
        case 'FINISHED':
          return purchaseRecord.piece_count ? `${purchaseRecord.piece_count}件` : '-'
        default:
          return purchaseRecord.quantity ? `${purchaseRecord.quantity}条` : '-'
      }
    }
    
    // 计算剩余数量（基于采购记录的原材料使用情况）
    const calculateRemainingQuantity = (purchaseRecord: any) => {
      let totalUsed = 0
      if (purchaseRecord.material_usages && purchaseRecord.material_usages.length > 0) {
        totalUsed = purchaseRecord.material_usages.reduce((sum: number, usage: any) => {
          if (purchaseRecord.material_type === 'LOOSE_BEADS' || purchaseRecord.material_type === 'BRACELET') {
            return sum + (usage.quantity_used || 0)
          } else {
            return sum + (usage.quantity_used || 0)
          }
        }, 0)
      }
      
      const total_quantity = purchaseRecord.material_type === 'BRACELET' ? purchaseRecord.quantity : purchaseRecord.piece_count
      const remaining = (total_quantity || 0) - totalUsed
      
      switch (purchaseRecord.material_type) {
        case 'LOOSE_BEADS':
          return `${remaining}颗`
        case 'BRACELET':
          return `${remaining}条`
        case 'ACCESSORIES':
          return `${remaining}片`
        case 'FINISHED':
          return `${remaining}件`
        default:
          return `${remaining}条`
      }
    }
    
    // 添加数据行
    purchases.forEach(purchaseRecord => {
      worksheet.addRow({
        purchase_code: purchaseRecord.purchase_code || '-',
        material_name: purchaseRecord.product_name || '-',  // 采购的原材料名称
        material_type: formatMaterialType(purchaseRecord.material_type),  // 采购的原材料类型
        quality: purchaseRecord.quality || '未知',
        specification: format_specification(purchaseRecord),
        quantity: format_quantity(purchaseRecord),
        total_price: purchaseRecord.total_price ? `¥${purchaseRecord.total_price.toFixed(2)}` : '-',
        supplier_name: purchaseRecord.supplier?.name || '-',
        purchase_date: purchaseRecord.purchase_date ? new Date(purchaseRecord.purchase_date).toLocaleDateString('zh-CN') : '-',
        remaining_quantity: calculateRemainingQuantity(purchaseRecord),
        created_at: purchaseRecord.created_at ? new Date(purchaseRecord.created_at).toLocaleString('zh-CN') : '-'
      })
    })
    
    // 设置响应头
    const file_name = `采购记录_${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file_name)}"`)
    
    // 输出Excel文件
    await workbook.xlsx.write(res)
    res.end()
    
  } catch (error) {
    console.error('Excel导出失败:', error)
    res.status(500).json({
      success: false,
      message: 'Excel导出失败',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}))

// 将采购记录转换为原材料
router.post('/:id/convert-to-material', authenticate_token, asyncHandler(async (req, res) => {
  const { id } = req.params
  const user_id = req.user?.id

  if (!user_id) {
    return res.status(401).json({
      success: false,
      message: '用户未认证'
    })
  }

  try {
    // 验证采购记录是否存在
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        materials: true // 检查是否已经转换过
      }
    })

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: '采购记录不存在'
      })
    }

    // 检查是否已经转换过
    if (purchase.materials.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该采购记录已经转换为原材料'
      })
    }

    // 生成原材料编号
    let material_code: string
    let isUnique = false
    let attempts = 0
    
    while (!isUnique && attempts < 10) {
      const now = new Date()
      const date_str = now.toISOString().slice(0, 10).replace(/-/g, '')
      const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
      material_code = `MAT${date_str}${randomNum}`
      
      const existing = await prisma.material.findUnique({
        where: { material_code: material_code }
      })
      if (!existing) {
        isUnique = true
      }
      attempts++
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: '生成原材料编号失败，请重试'
      })
    }

    // 确定原材料类型
    let material_type: 'SEMI_FINISHED' | 'FINISHED'
    if (purchase.material_type === 'FINISHED') {
      material_type = 'FINISHED'
    } else {
      material_type = 'SEMI_FINISHED'
    }

    // 计算数量和成本
    let total_quantity: number
    let unit_cost: number
    let unit: string

    switch (purchase.material_type) {
      case 'LOOSE_BEADS':
        total_quantity = purchase.piece_count || 0
        unit = '颗'
        unit_cost = purchase.price_per_bead ? parseFloat(purchase.price_per_bead.toString()) : 0
        break
      case 'BRACELET':
        total_quantity = purchase.quantity || 0
        unit = '条'
        unit_cost = purchase.unit_price ? parseFloat(purchase.unit_price.toString()) : 0
        break
      case 'ACCESSORIES':
        total_quantity = purchase.piece_count || 0
        unit = '片'
        unit_cost = purchase.price_per_piece ? parseFloat(purchase.price_per_piece.toString()) : 0
        break
      case 'FINISHED':
        total_quantity = purchase.piece_count || 0
        unit = '件'
        unit_cost = purchase.price_per_piece ? parseFloat(purchase.price_per_piece.toString()) : 0
        break
      default:
        total_quantity = purchase.quantity || 0
        unit = '条'
        unit_cost = purchase.unit_price ? parseFloat(purchase.unit_price.toString()) : 0
    }

    const total_cost = parseFloat(purchase.total_price?.toString() || '0')

    // 在事务中创建原材料记录
    const result = await prisma.$transaction(async (tx) => {
      // 创建原材料记录
      const material = await tx.material.create({
        data: {
          material_code: material_code!,
          material_name: purchase.product_name,
          material_type,
          specification: purchase.specification?.toString() || (purchase.bead_diameter ? `${purchase.bead_diameter.toString()}mm` : undefined),
          unit,
          total_quantity,
          available_quantity: total_quantity,
          used_quantity: 0,
          unit_cost,
          total_cost,
          quality: purchase.quality,
          photos: purchase.photos || [],
          notes: purchase.notes,
          purchase_id: purchase.id,
          created_by: user_id
        }
      })

      // 创建原材料使用记录（CREATE操作）
      await tx.material_usage.create({
        data: {
          material_id: material.id,
          quantity_used: total_quantity,
          unit_cost,
          total_cost,
          action: 'CREATE',
          notes: `从采购记录 ${purchase.purchase_code} 转换创建`,
          purchase_id: purchase.id
        }
      })

      return material
    })

    // 获取完整的原材料信息返回
    const materialWithDetails = await prisma.material.findUnique({
      where: { id: result.id },
      include: {
        purchase: {
          select: {
            id: true,
            purchase_code: true,
            product_name: true,
            material_type: true,
            purchase_date: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            user_name: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      message: '采购记录转换为原材料成功',
      data: materialWithDetails
    })
    return
  } catch (error) {
    console.error('转换为原材料失败:', error)
    res.status(500).json({
      success: false,
      message: '转换为原材料失败',
      error: error instanceof Error ? error.message : '未知错误'
    })
    return
  }
}))

export default router