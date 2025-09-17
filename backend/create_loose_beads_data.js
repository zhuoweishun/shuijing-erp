import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createLooseBeadsData() {
  try {
    console.log('开始创建散珠测试数据...');
    
    // 创建散珠测试数据
    const looseBeadsData = [
      {
        purchase_code: 'LB20250117001',
        purchase_name: '天然白水晶散珠',
        purchase_type: 'LOOSE_BEADS',
        bead_diameter: 8.0,
        total_beads: 1000,
        total_price: 50.0,
        price_per_bead: 0.05,
        quality: 'A',
        specification: 8.0,
        piece_count: 1000,
        purchase_date: new Date(),
        photos: JSON.stringify(['http://localhost:3001/uploads/purchases/white_crystal_beads.jpg']),
        notes: '天然白水晶散珠，8mm规格',
        status: 'ACTIVE',
        user_id: 'cm5aqhqhp0000yzpqgxqxqxqx' // 需要替换为实际的用户ID
      },