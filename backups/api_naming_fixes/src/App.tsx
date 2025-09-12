// import { use_effect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import {auth_provider} from './hooks/use_auth'
import layout from './components/layout'
import protected_route from './components/protected_route'

// 页面组件
import login from './pages/login'
import home from './pages/home'
import purchase_entry from './pages/purchase_entry'
import purchase_list from './pages/purchase_list'
import product_entry from './pages/product_entry'

import sales_list from './pages/sales_list'
import inventory_list from './pages/inventory_list'
import supplier_management from './pages/supplier_management'
import customer_management from './pages/customer_management'
import user_management from './pages/user_management'
import settings from './pages/settings'
import financial from './pages/financial'
import {use_auth} from './hooks/use_auth'

// 主App组件，包装AuthProvider
function App() {
  return(
    <AuthProvider>
      <AppContent />
    </AuthProvider>)
  )
}

// 内部应用组件，在AuthProvider内部使用
function AppContent() {
  const { is_loading } = use_auth()

  if (is_loading) {
    return(
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crystal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>)
    )
  }

  return(
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster 
          position="top-center";
          richColors
          closeButton
          duration={3000};
          toastOptions={{;
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
            
            <Route path="/financial" element={
              <ProtectedRoute>
                <Layout>
                  <Financial />
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
            
            <Route path="/customer-management" element={
              <ProtectedRoute>
                <Layout>
                  <CustomerManagement />
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
      </Router>)
    )
}

export default App