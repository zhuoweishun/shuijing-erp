const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRestockInfo() {
  try {
    const response = await fetch('http://192.168.50.160:3001/api/v1/skus/cmfxnpvr40002dddaim03a4c3/restock-info', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiY21mbmo1cDlzMDAwMGlic3RvNWJxZGNlZCIsInVzZXJfbmFtZSI6ImFkbWluIiwicm9sZSI6IkJPU1MiLCJpYXQiOjE3MjcxNzI5NzMsImV4cCI6MTcyNzI1OTM3M30.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
      }
    });
    
    const result = await response.json();
    
    console.log('API响应状态:', response.status);
    console.log('补货信息:');
    console.log('原材料数量:', result.data?.required_materials?.length || 0);
    
    if (result.data?.required_materials) {
      result.data.required_materials.forEach((material, index) => {
        console.log(`${index + 1}. ${material.material_name}: ${material.quantity_needed_per_sku}${material.unit} (库存: ${material.available_quantity}${material.unit})`);
      });
    }
    
    console.log('\n是否可以补货:', result.data?.can_restock);
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testRestockInfo();