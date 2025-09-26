import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// 验证schemas
const createMaterialSchema = z.object({
  material_name: z.string().min(1, '原材料名称不能为空'),
  material_type: z.enum(['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL']),
  specification: z.string().optional(),
  unit: z.string().min(1, '计量单位不能为空'),
  total_quantity: z.number().int().min(0, '总数量不能为负数'),
  remaining_quantity: z.number().int().min(0, '剩余数量不能为负数'),
  unit_cost: z.number().min(0, '单位成本不能为负数'),
  total_cost: z.number().min(0, '总成本不能为负数'),
  quality: z.enum(['AA', 'A', 'AB', 'B', 'C']).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  purchase_id: z.string().min(1, '采购记录ID不能为空')
});

const updateMaterialSchema = z.object({
  material_name: z.string().min(1, '原材料名称不能为空').optional(),
  specification: z.string().optional(),
  unit: z.string().min(1, '计量单位不能为空').optional(),
  remaining_quantity: z.number().int().min(0, '剩余数量不能为负数').optional(),
  unit_cost: z.number().min(0, '单位成本不能为负数').optional(),
  total_cost: z.number().min(0, '总成本不能为负数').optional(),
  quality: z.enum(['AA', 'A', 'AB', 'B', 'C']).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  stock_status: z.enum(['SUFFICIENT', 'LOW', 'OUT_OF_STOCK']).optional()
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  material_type: z.union([
    z.enum(['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL']),
    z.array(z.enum(['LOOSE_BEADS', 'BRACELET', 'ACCESSORIES', 'FINISHED_MATERIAL']))
  ]).optional(),
  stock_status: z.union([
    z.enum(['SUFFICIENT', 'LOW', 'OUT_OF_STOCK']),
    z.array(z.enum(['SUFFICIENT', 'LOW', 'OUT_OF_STOCK']))
  ]).optional(),
  purchase_id: z.string().optional()
});

// 生成原材料编号
const generateMaterialCode = (): string => {
  const now = new Date();
  const date_str = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `MAT${date_str}${randomNum}`;
}

// 获取原材料列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = querySchema.parse(req.query);
    const { page, limit, search, material_type, stock_status, purchase_id } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { material_name: { contains: search } },
        { id: { contains: search } },
        { specification: { contains: search } },
        { notes: { contains: search } }
      ];
    }
    
    if (material_type) {
      if (Array.isArray(material_type)) {
        where.material_type = { in: material_type };
      } else {
        where.material_type = material_type;
      }
    }
    
    if (stock_status) {
      if (Array.isArray(stock_status)) {
        where.stock_status = { in: stock_status };
      } else {
        where.stock_status = stock_status;
      }
    }
    
    if (purchase_id) {
      where.purchase_id = purchase_id;
    }

    // 查询数据

    const [materialsRaw, total] = await Promise.all([
      prisma.material.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              user_name: true
            }
          },
          purchase: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              material_usages: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.material.count({ where })
    ]);



    // 转换字段名称为蛇形命名
    const materials = materialsRaw.map(material => {
      const { _count, purchase, ...rest } = material;
      return {
        ...rest,
        material_usage_count: _count.material_usages,
        supplier: purchase?.supplier || null,
        supplier_name: purchase?.supplier?.name || null,
        supplier_id: purchase?.supplier?.id || null
      };
    });

    res.json({
      success: true,
      data: {
        materials,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取原材料列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取原材料列表失败',
      error: error instanceof Error ? (error as Error).message : '未知错误'
    });
  }
});

// 获取单个原材料详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            user_name: true
          }
        },
        purchase: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        material_usages: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: '原材料不存在'
      });
    }

    // 添加supplier信息到返回数据
    const { purchase, ...materialData } = material;
    const materialWithSupplier = {
      ...materialData,
      supplier: purchase?.supplier || null,
      supplier_name: purchase?.supplier?.name || null,
      supplier_id: purchase?.supplier?.id || null
    };

    return res.json({
      success: true,
      data: materialWithSupplier
    });
  } catch (error) {
    console.error('获取原材料详情失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取原材料详情失败',
      error: error instanceof Error ? (error as Error).message : '未知错误'
    });
  }
});

// 创建原材料（从采购记录转换）
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = createMaterialSchema.parse(req.body);
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 验证采购记录是否存在
    const purchase = await prisma.purchase.findUnique({
      where: { id: data.purchase_id }
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: '采购记录不存在'
      });
    }

    // 检查是否已经转换过
    const existingMaterial = await prisma.material.findFirst({
      where: { purchase_id: data.purchase_id }
    });

    if (existingMaterial) {
      return res.status(400).json({
        success: false,
        message: '该采购记录已经转换为原材料'
      });
    }

    // 生成原材料编号
    let material_code: string;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      material_code = generateMaterialCode();
      const existing = await prisma.material.findUnique({
        where: { id: material_code }
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: '生成原材料编号失败，请重试'
      });
    }

    // 创建原材料记录
    const material = await prisma.material.create({
      data: {
        id: material_code!,
        material_code: material_code!,
        material_name: data.material_name,
        material_type: data.material_type,
        specification: data.specification,
        remaining_quantity: data.remaining_quantity,
        unit_cost: data.unit_cost,
        total_cost: data.total_cost,
        quality: data.quality,
        photos: data.photos || [],
        notes: data.notes,
        created_at: new Date(),
        created_by: user_id
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            user_name: true
          }
        }
      }
    });

    // 创建原材料使用记录（CREATE操作）
    await prisma.materialUsage.create({
      data: {
        material_id: material.id,
        purchase_id: data.purchase_id,
        quantity_used: data.total_quantity,
        action: 'CREATE',
        notes: `从采购记录 ${purchase.purchase_code} 转换创建`
      }
    });

    return res.status(201).json({
      success: true,
      message: '原材料创建成功',
      data: material
    });
  } catch (error) {
    console.error('创建原材料失败:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }
    return res.status(500).json({
      success: false,
      message: '创建原材料失败',
      error: error instanceof Error ? (error as Error).message : '未知错误'
    });
  }
});

// 更新原材料
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateMaterialSchema.parse(req.body);

    // 检查原材料是否存在
    const existingMaterial = await prisma.material.findUnique({
      where: { id }
    });

    if (!existingMaterial) {
      return res.status(404).json({
        success: false,
        message: '原材料不存在'
      });
    }

    // 更新原材料
    const material = await prisma.material.update({
      where: { id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            user_name: true
          }
        }
      }
    });

    return res.json({
      success: true,
      message: '原材料更新成功',
      data: material
    });
  } catch (error) {
    console.error('更新原材料失败:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }
    return res.status(500).json({
      success: false,
      message: '更新原材料失败',
      error: error instanceof Error ? (error as Error).message : '未知错误'
    });
  }
});

// 删除原材料
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查原材料是否存在
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        material_usages: {
          where: {
            action: 'USE'
          }
        }
      }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: '原材料不存在'
      });
    }

    // 检查是否已被使用
    if (material.material_usages.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该原材料已被使用，无法删除'
      });
    }

    // 删除原材料及相关记录
    await prisma.$transaction(async (tx) => {
      // 删除使用记录
      await tx.materialUsage.deleteMany({
        where: { material_id: id }
      });
      
      // 删除原材料
      await tx.material.delete({
        where: { id }
      });
    });

    return res.json({
      success: true,
      message: '原材料删除成功'
    });
  } catch (error) {
    console.error('删除原材料失败:', error);
    return res.status(500).json({
      success: false,
      message: '删除原材料失败',
      error: error instanceof Error ? (error as Error).message : '未知错误'
    });
  }
});

// 获取原材料统计信息
router.get('/stats/overview', authenticateToken, async (_req, res) => {
  try {
    const [total_count, active_count, used_count, semi_finished_count, finished_count] = await Promise.all([
      prisma.material.count(),
      prisma.material.count({ where: { stock_status: 'IN_STOCK' } }),
      prisma.material.count({ where: { stock_status: 'OUT_OF_STOCK' } }),
      prisma.material.count({ where: { material_type: 'BRACELET' } }),
      prisma.material.count({ where: { material_type: 'FINISHED_MATERIAL' } })
    ]);

    const total_value = await prisma.material.aggregate({
      _sum: {
        total_cost: true
      },
      where: {
        stock_status: 'IN_STOCK'
      }
    });

    return res.json({
        success: true,
        data: {
          total_count,
          active_count,
          used_count,
          semi_finished_count,
          finished_count,
          total_value: total_value._sum.total_cost || 0
        }
      });
  } catch (error) {
    console.error('获取原材料统计失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取原材料统计失败',
      error: error instanceof Error ? (error as Error).message : '未知错误'
    });
  }
});

// 获取原材料价格分布
router.get('/price-distribution', authenticateToken, async (req, res) => {
  const { 
    material_type = 'LOOSE_BEADS', 
    price_type = 'unit_price', 
    limit = 10 
  } = req.query

  console.log('🔍 [原材料价格分布] 请求参数:', {
    material_type,
    price_type,
    limit,
    userRole: req.user?.role || "USER"
  })

  try {
    // 构建产品类型筛选条件
    let productTypeCondition = ''
    if (material_type && material_type !== 'ALL') {
      productTypeCondition = `AND p.purchase_type = '${material_type}'`
    }

    // 根据价格类型选择不同的处理逻辑
    if (price_type === 'unit_price') {
      // 单价分布 - 返回价格区间统计
      const priceRangeQuery = `
        SELECT 
           CASE 
             -- 成品类型使用专门的价格区间
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price >= 0 AND calculated_price <= 50 THEN '0-50元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 50 AND calculated_price <= 100 THEN '50-100元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 100 AND calculated_price <= 200 THEN '100-200元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 200 AND calculated_price <= 500 THEN '200-500元（含）'
             WHEN material_type = 'FINISHED_MATERIAL' AND calculated_price > 500 THEN '500元以上'
             -- 其他产品类型使用原有价格区间
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price >= 0 AND calculated_price <= 3 THEN '0-3元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 3 AND calculated_price <= 10 THEN '3-10元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 10 AND calculated_price <= 20 THEN '10-20元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 20 AND calculated_price <= 50 THEN '20-50元（含）'
             WHEN material_type != 'FINISHED_MATERIAL' AND calculated_price > 50 THEN '50元以上'
             ELSE '未知'
           END as price_range,
          COUNT(*) as count
        FROM (
          SELECT 
            p.purchase_type as material_type,
            CASE 
              WHEN p.purchase_type = 'LOOSE_BEADS' AND remaining_beads > 0 THEN COALESCE(p.price_per_bead, p.total_price / NULLIF(p.total_beads, 0))
              WHEN p.purchase_type = 'BRACELET' AND remaining_quantity > 0 THEN COALESCE(p.price_per_bead, p.total_price / NULLIF(p.total_beads, 0))
              WHEN p.purchase_type = 'ACCESSORIES' AND remaining_pieces > 0 THEN p.total_price / p.piece_count
              WHEN p.purchase_type = 'FINISHED_MATERIAL' AND remaining_pieces > 0 THEN p.total_price / p.piece_count
              ELSE NULL
            END as calculated_price,
            remaining_beads,
            remaining_quantity,
            remaining_pieces
          FROM (
            SELECT 
              p.*,
              CASE 
                WHEN p.purchase_type = 'LOOSE_BEADS' THEN p.total_beads - COALESCE(SUM(mu.quantity_used), 0)
                ELSE 0
              END as remaining_beads,
              CASE 
                WHEN p.purchase_type = 'BRACELET' THEN p.quantity - COALESCE(SUM(mu.quantity_used), 0)
                ELSE 0
              END as remaining_quantity,
              CASE 
                WHEN p.purchase_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') THEN p.piece_count - COALESCE(SUM(mu.quantity_used), 0)
                ELSE 0
              END as remaining_pieces
            FROM purchases p
            LEFT JOIN material_usage mu ON p.id = mu.purchase_id
            WHERE p.status IN ('ACTIVE', 'USED')
              AND p.total_price IS NOT NULL
              AND p.total_price > 0
              AND (
                (p.purchase_type = 'LOOSE_BEADS' AND p.total_beads IS NOT NULL AND p.total_beads > 0) OR
                (p.purchase_type = 'BRACELET' AND p.quantity IS NOT NULL AND p.quantity > 0) OR
                (p.purchase_type = 'ACCESSORIES' AND p.piece_count IS NOT NULL AND p.piece_count > 0) OR
                (p.purchase_type = 'FINISHED_MATERIAL' AND p.piece_count IS NOT NULL AND p.piece_count > 0)
              )
              ${productTypeCondition}
            GROUP BY p.id, p.purchase_type, p.total_beads, p.quantity, p.piece_count, p.total_price
          ) p
        ) as price_data
        WHERE calculated_price IS NOT NULL
          AND (
            (material_type = 'LOOSE_BEADS' AND remaining_beads > 0) OR
            (material_type = 'BRACELET' AND remaining_quantity > 0) OR
            (material_type IN ('ACCESSORIES', 'FINISHED_MATERIAL') AND remaining_pieces > 0)
          )
        GROUP BY price_range
        ORDER BY 
           CASE price_range
             -- 成品类型排序
             WHEN '0-50元（含）' THEN 1
             WHEN '50-100元（含）' THEN 2
             WHEN '100-200元（含）' THEN 3
             WHEN '200-500元（含）' THEN 4
             WHEN '500元以上' THEN 5
             -- 其他产品类型排序
             WHEN '0-3元（含）' THEN 6
             WHEN '3-10元（含）' THEN 7
             WHEN '10-20元（含）' THEN 8
             WHEN '20-50元（含）' THEN 9
             WHEN '50元以上' THEN 10
             ELSE 11
           END
      `
      
      const rangeData = await prisma.$queryRawUnsafe(priceRangeQuery) as any[]
      const total_count = rangeData.reduce((sum, item) => sum + Number(item.count), 0)
      
      const priceRanges = rangeData.map(item => ({
        name: item.price_range,
        value: Number(item.count),
        percentage: total_count > 0 ? (Number(item.count) / total_count * 100).toFixed(1) : '0'
      }))
      
      const responseData = {
        material_type,
        price_type,
        price_label: '单价区间分布',
        total_products: total_count,
        price_ranges: priceRanges,
        analysis_date: new Date().toISOString()
      }
      
      console.log('📊 [原材料单价区间分布] 响应数据:', responseData)
      
      res.json({
        success: true,
        message: '获取单价区间分布成功',
        data: responseData
      })
      return
    }
    
    // 总价分布逻辑...
    res.json({
      success: true,
      message: '获取价格分布成功',
      data: {
        material_type,
        price_type,
        total_products: 0,
        price_ranges: []
      }
    })
    
  } catch (error) {
    console.error('获取原材料价格分布失败:', error)
    res.status(500).json({
      success: false,
      message: '获取原材料价格分布失败',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
})

export default router;