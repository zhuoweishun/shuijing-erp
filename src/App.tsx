import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { authService } from './services/auth';
import ProtectedRoute from './components/ProtectedRoute';
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import PurchaseEntry from "@/pages/PurchaseEntry";

import PurchaseList from "@/pages/PurchaseList";
import ProductEntry from "@/pages/ProductEntry";
import ProductList from "@/pages/ProductList";
import Statistics from "@/pages/Statistics";
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import Debug from "@/pages/Debug";


export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null表示正在检查
  const [isLoading, setIsLoading] = useState(true);

  // 检查认证状态的异步函数
  const checkAuthStatus = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 在应用启动时初始化
  useEffect(() => {
    const initialize = async () => {
      // 初始化默认管理员账户
      // 简化版本：不需要初始化默认管理员，使用固定的admin/user账户
        console.log('使用简化的权限系统，admin和user账户已内置');
      // 检查认证状态
      await checkAuthStatus();
    };
    
    initialize();
  }, []);
  
  // 监听登录状态变化
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
    };
    
    // 监听存储变化
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // 显示加载状态
  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 登录页面 */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        
        {/* 受保护的路由 */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        
        <Route path="/purchase/entry" element={
          <ProtectedRoute>
            <PurchaseEntry />
          </ProtectedRoute>
        } />
        
        <Route path="/purchase/list" element={
          <ProtectedRoute>
            <PurchaseList />
          </ProtectedRoute>
        } />
        
        <Route path="/product/entry" element={
          <ProtectedRoute>
            <ProductEntry />
          </ProtectedRoute>
        } />
        
        <Route path="/product/list" element={
          <ProtectedRoute>
            <ProductList />
          </ProtectedRoute>
        } />
        
        <Route path="/statistics" element={
          <ProtectedRoute>
            <Statistics />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        
        {/* 仅管理员可访问的用户管理页面 */}
        <Route path="/users" element={
          <ProtectedRoute requireAdmin={true}>
            <UserManagement />
          </ProtectedRoute>
        } />
        
        {/* 调试页面 */}
        <Route path="/debug" element={<Debug />} />
        

        
        {/* 默认重定向 */}
        <Route path="*" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
      
      {/* Toast通知组件 */}
      <Toaster position="top-center" richColors />
    </Router>
  );
}
