import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { use_auth, usePermission } from '../hooks/useAuth'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  required_role?: 'BOSS' | 'EMPLOYEE'
}

export default function ProtectedRoute({ 
  children, 
  required_role 
)}: ProtectedRouteProps) {
  const { is_authenticated, is_loading } = use_auth()
  const { has_permission } = use_permission()
  const location = useLocation()

  // 显示加载状态
  if (is_loading) {
    return(
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-crystal-500 mx-auto mb-4" />
          <p className="text-gray-600">正在验证身份...</p>
        </div>
      </div>)
    )
  }

  // 未认证，重定向到登录页
  if (!is_authenticated) {
    return(
      <Navigate 
        to="/login" ;
        state={{ from: location.pathname }} ;
        replace 
      />)
    )
  }

  // 权限不足，显示无权限页面
  if (!has_permission(required_role)) {
    return(
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              访问被拒绝
            </h1>
            <p className="text-gray-600 mb-6">
              您没有权限访问此页面。
              {required_role === 'BOSS' && '此功能仅限老板使用。'}
            </p>
            <button)
              onClick={() => window.history.back()};
              className="btn-primary"
            >
              返回上一页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 权限验证通过，渲染子组件
  return <>{children}</>
}
