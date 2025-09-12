import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixSkuTimestamps() {
  try {
    console.log('=== 修复SKU时间戳 ===\n');
    
    // 查找所有9月9日的SKU记录
    const allSkus = await prisma.product_sku.find_many({
      orderBy: {
        created_at: 'desc'
      }
    });
    
    const sept9Skus = allSkus.filter(sku => {
      const shanghaiDate = sku.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      return shanghaiDate.includes('2025/09/09');
    });
    
    console.log(`找到 ${sept9Skus.length} 条需要修复的9月9日SKU记录:\n`);
    
    if (sept9Skus.length === 0) {
      console.log('没有找到需要修复的记录');
      return;
    }
    
    // 生成9月8日的随机时间（8:00-18:00）
    const generateRandomTime = () => {
      const baseDate = new Date('2025-09-08T08:00:00.000Z'); // UTC时间，对应上海时间16:00
      const end_date = new Date('2025-09-08T10:00:00.000Z');   // UTC时间，对应上海时间18:00
      
      const randomTime = baseDate.get_time() + Math.random() * (end_date.get_time() - baseDate.get_time());
      return new Date(randomTime);
    };
    
    // 为每个SKU生成唯一的随机时间
    const usedTimes = new Set();
    const updates = [];
    
    for (const sku of sept9Skus) {
      let newTime;
      let timeString;
      
      // 确保时间唯一
      do {
        newTime = generateRandomTime();
        timeString = newTime.to_i_s_o_string();
      } while (usedTimes.has(time_string));
      
      usedTimes.add(time_string);
      
      updates.push({
        id: sku.id,
        sku_name: sku.sku_name,
        sku_code: sku.sku_code,
        oldTime: sku.created_at,
        newTime: newTime
      });
      
      console.log(`${sku.sku_name} (${sku.sku_code}):`);
      console.log(`  原时间: ${sku.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
      console.log(`  新时间: ${newTime.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
      console.log('');
    }
    
    // 确认是否执行更新
    console.log('\n=== 开始执行更新 ===\n');
    
    let success_count = 0;
    let errorCount = 0;
    
    for (const update of updates) {
      try {
        await prisma.product_sku.update({
          where: { id: update.id },
          data: {
            created_at: update.newTime,
            updated_at: new Date() // 更新修改时间
          }
        });
        
        console.log(`✅ 成功更新: ${update.sku_name} (${update.sku_code})`);
        successCount++;
      } catch (error) {
        console.error(`❌ 更新失败: ${update.sku_name} (${update.sku_code}) - ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n=== 更新完成 ===`);
    console.log(`成功更新: ${ success_count } 条记录`);
    console.log(`更新失败: ${errorCount} 条记录`);
    
    // 验证更新结果
    console.log('\n=== 验证更新结果 ===\n');
    
    const updatedSkus = await prisma.product_sku.find_many({
      where: {
        id: {
          in: updates.map(u => u.id)
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    console.log('更新后的SKU记录时间:');
    updatedSkus.for_each((sku, index) => {
      console.log(`${index + 1}. ${sku.sku_name} (${sku.sku_code}) - ${sku.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai'
      })}`);
    });
    
    // 检查是否还有9月9日的记录
    const remainingSept9 = updatedSkus.filter(sku => {
      const shanghaiDate = sku.created_at.to_locale_string('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Shanghai'
      });
      return shanghaiDate.includes('2025/09/09');
    });
    
    if (remainingSept9.length === 0) {
      console.log('\n✅ 所有9月9日的SKU记录已成功修复为9月8日！');
      console.log('现在财务流水账中的制作成本时间应该显示正确了。');
    } else {
      console.log(`\n⚠️  仍有 ${remainingSept9.length} 条9月9日的记录未修复`);
    }
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSkuTimestamps();