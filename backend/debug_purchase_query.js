import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPurchaseQuery() {
  try {
    console.log('🔍 使用Prisma查询采购记录及其关联数据...');
    
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: 'cmfnmiw6z000513utzdf2hjon' },
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
            sku: {
              select: {
                id: true,
                sku_name: true
              }
            }
          }
        },
        materials: {
          include: {
            material_usages: {
              include: {
                sku: {
                  select: {
                    id: true,
                    sku_name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('\n📊 查询结果:');
    console.log('- 采购记录ID:', existingPurchase?.id);
    console.log('- 采购名称:', existingPurchase?.purchase_name);
    console.log('- 直接关联的material_usages数量:', existingPurchase?.material_usages?.length || 0);
    console.log('- 关联的materials数量:', existingPurchase?.materials?.length || 0);
    
    if (existingPurchase?.materials) {
      existingPurchase.materials.forEach((material, i) => {
        console.log(`\n材料 ${i+1}: ${material.material_name}`);
        console.log(`- material_id: ${material.id}`);
        console.log(`- material_usages数量: ${material.material_usages?.length || 0}`);
        
        if (material.material_usages && material.material_usages.length > 0) {
          material.material_usages.forEach((usage, j) => {
            console.log(`  使用记录 ${j+1}:`);
            console.log(`  - usage_id: ${usage.id}`);
            console.log(`  - sku_name: ${usage.sku?.sku_name || '无SKU'}`);
            console.log(`  - quantity_used: ${usage.quantity_used}`);
          });
        }
      });
    }
    
    // 检查是否有任何material_usage记录
    const hasUsages = existingPurchase?.material_usages?.length > 0 || 
                     existingPurchase?.materials?.some(m => m.material_usages?.length > 0);
    
    console.log('\n🔍 是否有使用记录:', hasUsages);
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPurchaseQuery();