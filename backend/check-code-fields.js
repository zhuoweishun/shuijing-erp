// 检查采购记录和SKU记录的编码字段
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFields() {
  try {
    console.log('检查采购记录的编码字段...');
    const purchase = await prisma.purchase.find_first({
      select: {
        id: true,
        purchase_code: true,
        product_name: true,
        supplier: {
          select: {
            name: true
          }
        }
      }
    });
    console.log('采购记录字段:', purchase);
    
    console.log('\n检查SKU记录的编码字段...');
    const sku = await prisma.product_sku.find_first({
      select: {
        id: true,
        sku_code: true,
        sku_name: true
      }
    });
    console.log('SKU记录字段:', sku);
    
    console.log('\n字段验证完成!');
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFields();