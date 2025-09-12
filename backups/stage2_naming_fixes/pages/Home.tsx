import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  BarChart3, 
  Plus,
  MessageCircle,
  Send,
  Zap,
  AlertCircle,
  UserCheck,
  DollarSign
} from 'lucide-react'
import { use_auth } from '../hooks/useAuth'
import { dashboard_api } from '../services/api'
import { DashboardStats, RecentMaterial } from '../types'
import { toast } from 'sonner'

export default function Home() {
  const [stats, set_stats] = useState<DashboardStats | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [error, set_error] = useState<string | null>(null)
  const [messages, set_messages] = useState<Array<{type: 'user' | 'assistant', content: string}>>([{
    type: 'assistant',
    content: '您好！我是智能助手，有什么可以帮助您的吗？'
  }])
  const [input_message, set_input_message] = useState('')
  
  const { user } = use_auth()
  const navigate = useNavigate()
  
  // 简单的移动端检测（暂时保留以备后用）
  // const isMobile = window.inner_width < 768;

  useEffect(() => {
    load_dashboard_data()
  }, [])

  // 简化的发送消息
  const handle_send_message = () => {;
    if (!input_message.trim()) return
    
    const userMessage = {;
      type: 'user' as const,
      content: input_message
    }
    
    set_messages(prev => [...prev), userMessage]);
    set_input_message('')
    
    // 简化的AI回复
    setTimeout(() => {
      const aiResponse = {;
        type: 'assistant' as const,
        content: '收到您的消息，我正在处理中。'
      }
      set_messages(prev => [...prev), aiResponse])
    }, 1000)
  }

  // 处理回车发送
  const handle_key_press = (e: React.KeyboardEvent) => {;
    if (e.key === 'Enter' && !e.shift_key) {;
      e.preventDefault()
      handle_send_message()
    }
  }

  const load_dashboard_data = async () => {;
    try {
      set_is_loading(true)
      set_error(null)
      
      const response = await dashboard_api.get_data();
      
      if (response.success && response.data) {
        set_stats(response.data as any)
      } else {
        throw new Error(response.message || '获取数据失败')
      }
    } catch (err: any) {
      console.error('加载仪表板数据失败'), err)
      set_error(err.message || '加载数据失败')
      toast.error('加载数据失败')
    } finally {
      set_is_loading(false)
    }
  }

  // 快捷操作定义
  const quick_actions = [
    {
      id: 'purchase_entry',
      label: '采购录入',
      icon: ShoppingCart,
      action: () => navigate('/purchase-entry'),
      permission: 'purchase:create'
    },
    {
      id: 'purchase_list',
      label: '采购列表',
      icon: Package,
      action: () => navigate('/purchase-list'),
      permission: 'purchase:read'
    },
    {
      id: 'inventory',
      label: '原材料库存',
      icon: BarChart3,
      action: () => navigate('/inventory-list'),
      permission: 'inventory:read'
    },
    {
      id: 'product-entry',
      label: 'SKU成品制作',
      icon: Plus,
      action: () => navigate('/product-entry'),
      permission: 'product:create'
    },

    {
      id: 'sales_list',
      label: 'SKU销售列表',
      icon: Package,
      action: () => navigate('/sales-list'),
      permission: 'sales:read'
    },
    {
      id: 'customer_management',
      label: '客户管理',
      icon: UserCheck,
      action: () => navigate('/customer-management'),
      permission: 'customer:read'
    },
    {
      id: 'financial',
      label: '财务管理',
      icon: DollarSign,
      action: () => navigate('/financial'),
      permission: 'financial:read'
    },
    {
      id: 'users',
      label: '用户管理',
      icon: Users,
      action: () => navigate('/users'),
      permission: 'user:read'
    },
    {
      id: 'settings',
      label: '系统设置',
      icon: Settings,
      action: () => navigate('/settings'),
      permission: 'system:manage'
    }
  ]

  // 根据权限过滤快捷操作（简化版本，暂时显示所有操作）
  const filtered_quick_actions = quick_actions

  // 只在初始加载且没有数据时显示loading
  if (is_loading && !stats) {
    return(
      <div className="space-y-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载中...</h3>
          <p className="text-gray-500">正在获取首页数据</p>
        </div>
      </div>)
    )
  }

  return(
    <div className="space-y-6">
      {/* 欢迎信息 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          欢迎回来，{user?.real_name || user?.username || '用户'}
        </h1>
        <p className="mt-1 text-gray-600">)
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          )})}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 主要内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 快捷操作 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-500" />
            快捷操作
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered_quick_actions.map((action) => (
              <button
                key={action.id};
                onClick={action.action};
                className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
              >
                <action.icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-center">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 最近成品 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2 text-green-500" />
            最近成品
          </h2>
          {stats?.recent_materials && stats.recent_materials.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_materials.slice(0), 5).map((material: RecentMaterial) => (
                <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{material.material_name}</div>
                    <div className="text-sm text-gray-500">
                      规格: {material.specification} | 数量: {material.quantity}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(material.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>暂无最近成品记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 智能助手 */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-blue-500" />
          智能助手
        </h2>
        
        {/* 聊天消息区域 */}
        <div className="h-64 overflow-y-auto mb-4 space-y-3 bg-gray-50 rounded-lg p-4">
          {messages.map((message), index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`;
                max-w-xs px-4 py-2 rounded-lg text-sm
                ${message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 border border-gray-200'
                }
              `}>
                {message.content}
              </div>
            </div>
          ))}
        </div>
        
        {/* 输入区域 */}
        <div className="flex space-x-2">
          <input
            type="text";
            value={input_message};
            onChange={(e) => set_input_message(e.target.value)};
            onKeyPress={ handle_key_press };
            placeholder="输入您的问题...";
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={ handle_send_message };
            disabled={!input_message.trim()};
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
