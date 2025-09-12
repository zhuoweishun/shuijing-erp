// React导入在JSX中是必需的
import { Building2, AlertCircle } from 'lucide-react'
import { use_auth } from '../hooks/useAuth'

export default function SupplierManagement() {
  const { user, isBoss } = use_auth()
  
  // 权限检查：只有BOSS可以访问
  if (!is_boss) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-crystal-500" />
          <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              权限不足
            </h3>
            <p className="text-red-600">
              此功能仅限老板权限访问
            </p>
            <p className="text-sm text-red-500 mt-2">
              当前用户角色：{user?.role || '未知'}
            </p>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Building2 className="h-8 w-8 text-crystal-500" />
        <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            供应商管理功能
          </h3>
          <p className="text-gray-600">
            此功能正在开发中，敬请期待...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            仅限老板权限访问
          </p>
        </div>
      </div>
    </div>
  )
}
