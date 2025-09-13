import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// 验证schemas
const createMaterialSchema = z.object({
  material_name: z.string().min(1, '原材料名称不能为空'),
  material_type: z.enum(['SEMI_FINISHED', 'FINISHED']),
  specification: z.string().optional(),
  unit: z.string().min(1, '计量单位不能为空'),
  total_quantity: z.number().int().min(0, '总数量不能为负数'),
  available_quantity: z.number().int().min(0, '可用数量不能为负数'),
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
  available_quantity: z.number().int().min(0, '可用数量不能为负数').optional(),
  unit_cost: z.number().min(0, '单位成本不能为负数').optional(),
  total_cost: z.number().min(0, '总成本不能为负数').optional(),
  quality: z.enum(['AA', 'A', 'AB', 'B', 'C']).optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'DEPLETED', 'INACTIVE']).optional()
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  material_type: z.enum(['SEMI_FINISHED', 'FINISHED']).optional(),
  status: z.enum(['ACTIVE', 'DEPLETED', 'INACTIVE']).optional(),
  purchase_id: z.string().optional()
});

// 生成原材料编号
function generateMaterialCode(): string {
  const now = new Date();
  const date_str = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `MAT${date_str}${randomNum}`;
}

// 获取原材料列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = querySchema.parse(req.query);
    const { page, limit, search, material_type, status, purchase_id } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { material_name: { contains: search } },
        { material_code: { contains: search } },
        { specification: { contains: search } },
        { notes: { contains: search } }
      ];
    }
    
    if (material_type) {
      where.material_type = material_type;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (purchase_id) {
      where.purchase_id = purchase_id;
    }

    // 查询数据
    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
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
      error: error instanceof Error ? error.message : '未知错误'
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
        purchase: {
          select: {
            id: true,
            purchase_code: true,
            product_name: true,
            material_type: true,
            purchase_date: true,
            supplier: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            user_name: true
          }
        },
        material_usages: {
          include: {
            sku: {
              select: {
                id: true,
                sku_code: true,
                sku_name: true
              }
            }
          },
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

    res.json({
      success: true,
      data: material
    });
    return
  } catch (error) {
    console.error('获取原材料详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取原材料详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
    return
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
        where: { material_code: material_code }
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
        material_code: material_code!,
        material_name: data.material_name,
        material_type: data.material_type,
        specification: data.specification,
        unit: data.unit,
        total_quantity: data.total_quantity,
        available_quantity: data.available_quantity,
        used_quantity: 0,
        unit_cost: data.unit_cost,
        total_cost: data.total_cost,
        quality: data.quality,
        photos: data.photos || [],
        notes: data.notes,
        purchase_id: data.purchase_id,
        created_by: user_id
      },
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
    });

    // 创建原材料使用记录（CREATE操作）
    await prisma.material_usage.create({
      data: {
        material_id: material.id,
        quantity_used: data.total_quantity,
        unit_cost: data.unit_cost,
        total_cost: data.total_cost,
        action: 'CREATE',
        notes: `从采购记录 ${purchase.purchase_code} 转换创建`,
        purchase_id: data.purchase_id
      }
    });

    res.status(201).json({
      success: true,
      message: '原材料创建成功',
      data: material
    });
    return
  } catch (error) {
    console.error('创建原材料失败:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }
    res.status(500).json({
      success: false,
      message: '创建原材料失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
    return
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
    });

    res.json({
      success: true,
      message: '原材料更新成功',
      data: material
    });
    return
  } catch (error) {
    console.error('更新原材料失败:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.issues
      });
    }
    res.status(500).json({
      success: false,
      message: '更新原材料失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
    return
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
      await tx.material_usage.deleteMany({
        where: { material_id: id }
      });
      
      // 删除原材料
      await tx.material.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: '原材料删除成功'
    });
    return
  } catch (error) {
    console.error('删除原材料失败:', error);
    res.status(500).json({
      success: false,
      message: '删除原材料失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
    return
  }
});

// 获取原材料统计信息
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const [total_count, active_count, depleted_count, semi_finished_count, finished_count] = await Promise.all([
      prisma.material.count(),
      prisma.material.count({ where: { status: 'ACTIVE' } }),
      prisma.material.count({ where: { status: 'DEPLETED' } }),
      prisma.material.count({ where: { material_type: 'SEMI_FINISHED' } }),
      prisma.material.count({ where: { material_type: 'FINISHED' } })
    ]);

    const total_value = await prisma.material.aggregate({
      _sum: {
        total_cost: true
      },
      where: {
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      data: {
        total_count,
        active_count,
        depleted_count,
        semi_finished_count,
        finished_count,
        total_value: total_value._sum.total_cost || 0
      }
    });
  } catch (error) {
    console.error('获取原材料统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取原材料统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;