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
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi } from '../services/api'
import { toast } from 'sonner'

export default function Home() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<Array<{type: 'user' | 'assistant', content: string}>>([{
    type: 'assistant',
    content: '您好！我是智能助手，有什么可以帮助您的吗？'
  }])
  const [inputMessage, setInputMessage] = useState('')
  
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // 简单的移动端检测（暂时保留以备后用）
  // const isMobile = window.innerWidth < 768

  useEffect(() => {
    loadDashboardData()
  }, [])

  // 简化的发送消息
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return
    
    const userMessage = {
      type: 'user' as const,
      content: inputMessage
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    
    // 简化的AI回复
    setTimeout(() => {
      const aiResponse = {
        type: 'assistant' as const,
        content: '收到您的消息，我正在处理中。'
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

  // 处理回车发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await dashboardApi.getData()
      
      if (response.success && response.data) {
        setStats(response.data as any)
      } else {
        throw new Error(response.message || '获取数据失败')
      }
    } catch (err: any) {
      console.error('加载仪表板数据失败', err)
      setError(err.message || '加载数据失败')
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 快捷操作定义
  const quickActions = [
    {
      id: 'purchase-entry',
      label: '采购录入',
      icon: ShoppingCart,
      action: () => navigate('/purchase-entry'),
      permission: 'purchase:create'
    },
    {
      id: 'purchase-list',
      label: '采购列表',
      icon: Package,
      action: () => navigate('/purchase-list'),
      permission: 'purchase:read'
    },
    {
      id: 'product-entry',
      label: '成品制作',
      icon: Plus,
      action: () => navigate('/product-entry'),
      permission: 'product:create'
    },
    {
      id: 'sales-list',
      label: '销售列表',
      icon: Package,
      action: () => navigate('/sales-list'),
      permission: 'product:read'
    },
    {
      id: 'inventory',
      label: '库存查询',
      icon: BarChart3,
      action: () => navigate('/inventory-list'),
      permission: 'inventory:read'
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
  const filteredQuickActions = quickActions

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 欢迎信息 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          欢迎回来，{user?.real_name || user?.username || '用户'}
        </h1>
        <p className="mt-1 text-gray-600">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}
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
            {filteredQuickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
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
          {stats?.recent_products && stats.recent_products.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_products.slice(0, 5).map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.product_name}</div>
                    <div className="text-sm text-gray-500">
                      规格: {product.specification} | 数量: {product.quantity}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(product.created_at).toLocaleDateString()}
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
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
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
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
