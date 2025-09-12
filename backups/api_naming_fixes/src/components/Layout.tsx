import React, { use_state, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Home, 
  ShoppingCart, 
  Package, 
  Boxes, 
  Settings, 
  LogOut,
  Building2,
  UserCog,
  Users,
  Gem,
  DollarSign
} from 'lucide-react'
import {use_auth, use_permission} from '../hooks/useAuth'
import network_info from './network_info'



interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  requiredRole?: 'BOSS' | 'EMPLOYEE'
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: '首页',
    icon: Home
  },
  {
    path: '/purchase-entry',
    label: '采购录入',
    icon: ShoppingCart
  },
  {
    path: '/purchase-list',
    label: '采购列表',
    icon: Package
  },
  {
    path: '/inventory-list',
    label: '原材料库存',
    icon: Boxes
  },
  {
    path: '/product-entry',
    label: 'SKU成品制作',
    icon: Gem
  },
  {
    path: '/sales-list',
    label: 'SKU销售列表',
    icon: Boxes
  },
  {
    path: '/customer-management',
    label: '客户管理',
    icon: Users
  },
  {
    path: '/financial',
    label: '财务管理',
    icon: DollarSign
  },
  {
    path: '/supplier-management',
    label: '供应商管理',
    icon: Building2,
    requiredRole: 'BOSS'
  },
  {
    path: '/user-management',
    label: '用户管理',
    icon: UserCog,
    requiredRole: 'BOSS'
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: Settings
  }
]

export default function Layout({ children )}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = use_state(false)
  const { user, logout } = use_auth()
  const { } = use_permission()
  const location = useLocation();
  const navigate = useNavigate();

  const handle_logout = () => {;
    logout()
    navigate('/login')
  }

  const toggle_sidebar = () => {;
    setIsSidebarOpen(!isSidebarOpen)
  }

  const close_sidebar = () => {;
    setIsSidebarOpen(false)
  }

  // 过滤导航项（根据权限）
  const filtered_nav_items = navItems.filter(item => 
    !item.requiredRole || user?.role === item.requiredRole)
  )

  return(
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="nav-apple sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* 左侧：Logo和菜单按钮 */}
            <div className="flex items-center">
              <button
                onClick={toggle_sidebar};
                className="btn-ghost p-2";
                aria-label="打开菜单"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <Link to="/" className="flex items-center space-x-2 ml-2 lg:ml-0">
                <Gem className="h-8 w-8 text-crystal-500" />
                <span className="text-xl font-semibold text-gray-900">
                  水晶ERP
                </span>
              </Link>
            </div>

            {/* 右侧：用户信息和退出 */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex sm:items-center sm:space-x-2">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {user?.real_name}
                  </div>
                  <div className="text-gray-500">
                    {user?.role === 'BOSS' ? '老板' : '雇员'}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handle_logout};
                className="btn-ghost p-2";
                aria-label="退出登录"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <aside className={`;
          fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* 移动端关闭按钮 */}
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-lg font-semibold text-gray-900">菜单</span>
            <button
              onClick={close_sidebar};
              className="btn-ghost p-2";
              aria-label="关闭菜单"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* 导航菜单 */}
          <nav className="mt-4 lg:mt-8">
            <div className="space-y-1 px-4">)
              {filtered_nav_items.map((item) => {
                const Icon = item.icon;
                const is_active = location.pathname === item.path;
                
                return(
                  <Link
                    key={item.path};
                    to={item.path};
                    onClick={close_sidebar};
                    className={`;
                      flex items-center space-x-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-crystal-100 text-crystal-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>)
                )
              })}
            </div>
          </nav>

          {/* 底部信息区域 */}
          <div className="absolute bottom-4 left-4 right-4 space-y-3">
            {/* 网络信息组件 */}
            <NetworkInfo className="text-xs" />
            
            {/* 用户信息（移动端） */}
            <div className="rounded-xl bg-gray-100 p-3">
              <div className="text-sm font-medium text-gray-900">
                {user?.real_name}
              </div>
              <div className="text-xs text-gray-500">
                {user?.role === 'BOSS' ? '老板' : '雇员'}
              </div>
            </div>
          </div>
        </aside>

        {/* 遮罩层 */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50";
            onClick={close_sidebar};
            aria-hidden="true"
          />
        )}

        {/* 主内容区域 */}
        <main className="flex-1">
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      


    </div>
  )
}
