// React导入在JSX中是必需的
import { Boxes } from 'lucide-react'

export default function ProductList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Boxes className="h-8 w-8 text-crystal-500" />
        <h1 className="text-2xl font-bold text-gray-900">销售列表</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="text-center py-12">
          <Boxes className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            销售列表功能
          </h3>
          <p className="text-gray-600">
            此功能正在开发中，敬请期待...
          </p>
        </div>
      </div>
    </div>
  )
}
