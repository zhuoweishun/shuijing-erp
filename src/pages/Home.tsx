import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Plus, List, BarChart3, Settings, ShoppingCart, Package, TrendingUp, DollarSign, Users, LogOut } from 'lucide-react';
import { storage } from '../utils/storage';
import { authService, User } from '../services/auth';
import RecentActivities from '../components/RecentActivities';

export default function Home() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        
        if (user) {
          const admin = await authService.isAdmin();
          setIsAdmin(admin);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      // 强制刷新页面状态，确保路由重新评估
      window.location.href = '/login';
    } catch (error) {
      console.error('登出失败:', error);
      // 即使登出失败也跳转到登录页
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 第一行：采购录入、成品录入
  const firstRowActions = [
    {
      title: '采购录入',
      description: '快速录入新的采购记录',
      icon: ShoppingCart,
      color: 'bg-blue-500',
      path: '/purchase/entry'
    },
    {
      title: '成品录入',
      description: '添加新的成品信息',
      icon: Package,
      color: 'bg-green-500',
      path: '/product/entry'
    }
  ];

  // 第二行：采购列表、成品管理
  const secondRowActions = [
    {
      title: '采购列表',
      description: '查看和管理采购记录',
      icon: List,
      color: 'bg-purple-500',
      path: '/purchase/list'
    },
    {
      title: '成品管理',
      description: '管理成品库存和信息',
      icon: Package,
      color: 'bg-orange-500',
      path: '/product/list'
    }
  ];

  // 第三行：统计分析、系统设置
  const thirdRowActions = [
    {
      title: '统计分析',
      description: '查看业务数据和趋势',
      icon: BarChart3,
      color: 'bg-indigo-500',
      path: '/statistics'
    },
    {
      title: '系统设置',
      description: '配置应用和数据管理',
      icon: Settings,
      color: 'bg-gray-500',
      path: '/settings'
    }
  ];

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* 头部欢迎和用户信息 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">水晶销售管理系统</h1>
              <p className="text-sm sm:text-base text-gray-600">欢迎回来，{currentUser?.username}！今天是 {new Date().toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <button
                  onClick={() => navigate('/users')}
                  className="flex items-center px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">用户管理</span>
                  <span className="sm:hidden">管理</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center px-2 py-1.5 sm:px-3 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">退出登录</span>
                <span className="sm:hidden">退出</span>
              </button>
            </div>
          </div>
        </div>



        {/* 快捷操作 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">快捷操作</h2>
          
          {/* 第一行：采购录入、成品录入 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            {firstRowActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-lg shadow-sm p-3 sm:p-6 text-left hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-3 ${action.color} rounded-lg mr-2 sm:mr-3`}>
                      <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{action.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{action.description}</p>
                </button>
              );
            })}
          </div>
          
          {/* 第二行：采购列表、成品管理 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
            {secondRowActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-lg shadow-sm p-3 sm:p-6 text-left hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-3 ${action.color} rounded-lg mr-2 sm:mr-3`}>
                      <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{action.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{action.description}</p>
                </button>
              );
            })}
          </div>
          
          {/* 第三行：统计分析、系统设置 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {thirdRowActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-lg shadow-sm p-3 sm:p-6 text-left hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-3 ${action.color} rounded-lg mr-2 sm:mr-3`}>
                      <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{action.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">最近活动</h2>
          <RecentActivities />
        </div>
      </div>
    </div>
  );
}