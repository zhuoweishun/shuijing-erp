import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check_purchase_data() {
  console.log('🔍 检查purchase表数据不一致问题...')
  
  try {
    // 1. 直接查询CG20250917120816在purchase表中的数据
    console.log('\n📊 1. 查询CG20250917120816在purchase表中的实际数据:')
    const purchase_120816 = await prisma.purchase.findFirst({
      where: {
        purchase_code: 'CG20250917120816'
      }
    })
    
    if (purchase_120816) {
      console.log('Purchase表中的数据:')
      console.log(`- 采购编号: ${purchase_120816.purchase_code}`)
      console.log(`- 产品名称: ${purchase_120816.purchase_name}`)
      console.log(`- 总颗数: ${purchase_120816.total_beads}`)
      console.log(`- 总价: ${purchase_120816.total_price}`)
      console.log(`- 件数: ${purchase_120816.piece_count}`)
      console.log(`- 数量: ${purchase_120816.quantity}`)
      console.log(`- 更新时间: ${purchase_120816.updated_at}`)
    } else {
      console.log('❌ 未找到CG20250917120816的采购记录')
    }
    
    // 2. 查询对应的materials表数据
    console.log('\n📊 2. 查询CG20250917120816对应的materials表数据:')
    const material_120816 = await prisma.material.findFirst({
      where: {
        material_code: 'CG20250917120816'
      }
    })
    
    if (material_120816) {
      console.log('Materials表中的数据:')
      console.log(`- 材料编号: ${material_120816.material_code}`)
      console.log(`- 材料名称: ${material_120816.material_name}`)
      console.log(`- 原始数量: ${material_120816.original_quantity}`)
      console.log(`- 已用数量: ${material_120816.used_quantity}`)
      console.log(`- 剩余数量: ${material_120816.remaining_quantity}`)
      console.log(`- 总成本: ${material_120816.total_cost}`)
      console.log(`- 单位成本: ${material_120816.unit_cost}`)
      console.log(`- 更新时间: ${material_120816.updated_at}`)
    } else {
      console.log('❌ 未找到CG20250917120816的材料记录')
    }
    
    // 3. 对比数据差异
    console.log('\n📊 3. 数据差异对比:')
    if (purchase_120816 && material_120816) {
      console.log('数据对比结果:')
      console.log(`- Purchase总颗数: ${purchase_120816.total_beads} vs Materials原始数量: ${material_120816.original_quantity}`)
      console.log(`- Purchase总价: ${purchase_120816.total_price} vs Materials总成本: ${material_120816.total_cost}`)
      console.log(`- Purchase更新时间: ${purchase_120816.updated_at} vs Materials更新时间: ${material_120816.updated_at}`)
      
      if (purchase_120816.total_beads !== material_120816.original_quantity) {
        console.log('⚠️  发现数据不一致：purchase表的total_beads与materials表的original_quantity不匹配')
      }
      
      if (purchase_120816.total_price !== material_120816.total_cost) {
        console.log('⚠️  发现数据不一致：purchase表的total_price与materials表的total_cost不匹配')
      }
    }
    
    // 4. 查询所有散珠类型的purchase数据
    console.log('\n📊 4. 查询所有散珠类型的purchase数据:')
    const all_loose_beads = await prisma.purchase.findMany({
      where: {
        purchase_type: 'LOOSE_BEADS',
        status: { in: ['ACTIVE', 'USED'] }
      },
      orderBy: {
        purchase_code: 'asc'
      }
    })
    
    console.log(`找到 ${all_loose_beads.length} 条散珠采购记录:`)
    all_loose_beads.forEach(purchase => {
      console.log(`- ${purchase.purchase_code}: ${purchase.purchase_name}`)
      console.log(`  总颗数: ${purchase.total_beads}, 总价: ${purchase.total_price}, 更新时间: ${purchase.updated_at}`)
    })
    
    // 5. 查询所有散珠类型的materials数据
    console.log('\n📊 5. 查询所有散珠类型的materials数据:')
    const all_loose_materials = await prisma.material.findMany({
      where: {
        material_type: 'LOOSE_BEADS'
      },
      orderBy: {
        material_code: 'asc'
      }
    })
    
    console.log(`找到 ${all_loose_materials.length} 条散珠材料记录:`)
    all_loose_materials.forEach(material => {
      console.log(`- ${material.material_code}: ${material.material_name}`)
      console.log(`  原始数量: ${material.original_quantity}, 剩余数量: ${material.remaining_quantity}, 总成本: ${material.total_cost}, 更新时间: ${material.updated_at}`)
    })
    
    console.log('\n✅ 数据检查完成!')
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

check_purchase_data()