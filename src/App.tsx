// import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './hooks/useAuth'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// 页面组件
import Login from './pages/Login'
import Home from './pages/Home'
import PurchaseEntry from './pages/PurchaseEntry'
import PurchaseList from './pages/PurchaseList'
import ProductEntry from './pages/ProductEntry'
import ProductList from './pages/ProductList'
import SalesList from './pages/SalesList'
import InventoryList from './pages/InventoryList'
import SupplierManagement from './pages/SupplierManagement'
import UserManagement from './pages/UserManagement'
import Settings from './pages/Settings'
import { useAuth } from './hooks/useAuth'



// 内部应用组件，在AuthProvider内部使用
function AppContent() {
  const { isLoading } = useAuth()








  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crystal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster 
          position="top-center"
          richColors
          closeButton
          duration={3000}
          toastOptions={{
            style: {
              fontSize: '14px',
            },
          }}
        />
        <Routes>
            {/* 公开路由 */}
            <Route path="/login" element={<Login />} />
            
            {/* 受保护的路由 */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/purchase-entry" element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseEntry />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/purchase-list" element={
              <ProtectedRoute>
                <Layout>
                  <PurchaseList />
                </Layout>
              </ProtectedRoute>
            } />
            

            
            <Route path="/product-entry" element={
              <ProtectedRoute>
                <Layout>
                  <ProductEntry />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/product-list" element={
              <ProtectedRoute>
                <Layout>
                  <ProductList />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/sales-list" element={
              <ProtectedRoute>
                <Layout>
                  <SalesList />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/inventory-list" element={
              <ProtectedRoute>
                <Layout>
                  <InventoryList />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/supplier-management" element={
              <ProtectedRoute required_role="BOSS">
                <Layout>
                  <SupplierManagement />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/user-management" element={
              <ProtectedRoute required_role="BOSS">
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* 默认重定向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    )
}

// 主App组件，包装AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App