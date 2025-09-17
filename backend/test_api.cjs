const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMaterialsData() {
  console.log('=== 检查materials表散珠数据 ===');
  
  const scatterBeads = await prisma.material.findMany({
    where: { material_type: 'LOOSE_BEADS' },
    select: {
      material_code: true,
      material_name: true,
      remaining_quantity: true,
      unit_cost: true
    }
  });
  
  console.log('散珠材料记录:');
  scatterBeads.forEach(bead => {
    console.log(`材料编号: ${bead.material_code}, 材料名称: ${bead.material_name}, 剩余数量: ${bead.remaining_quantity}`);
  });
  
  const total = scatterBeads.reduce((sum, bead) => sum + (bead.remaining_quantity || 0), 0);
  console.log(`散珠总剩余数量: ${total}`);
  
  await prisma.$disconnect();
}

testMaterialsData().catch(console.error);