// import React from 'react' // 未使用，已注释
import InventoryDashboard from '../components/InventoryDashboard'

// 库存仪表盘测试页面
export default function InventoryDashboardTest() {
  console.log('📋 [测试页面] InventoryDashboardTest 组件已加载')
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">库存仪表盘测试页面</h1>
          <p className="text-gray-600 mt-2">用于测试库存仪表盘组件的数据显示功能</p>
        </div>
        
        <InventoryDashboard />
      </div>
    </div>
  )
}