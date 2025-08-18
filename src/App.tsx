import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { authService } from './services/auth';
import ProtectedRoute from './components/ProtectedRoute';
import NetworkDiagnostic from './components/NetworkDiagnostic';
import Login from "./pages/Login";
import Home from "./pages/Home";
import PurchaseEntry from "./pages/PurchaseEntry";
import PurchaseList from "./pages/PurchaseList";
import ProductEntry from "./pages/ProductEntry";
import ProductList from "./pages/ProductList";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Debug from "./pages/Debug";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 使用AuthService的onAuthStateChange方法监听认证状态
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const isAuthenticated = currentUser !== null;

  if (isLoading) {
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
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        
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
        
        <Route path="/users" element={
          <ProtectedRoute requireAdmin={true}>
            <UserManagement />
          </ProtectedRoute>
        } />
        
        <Route path="/debug" element={<Debug />} />
        
        <Route path="*" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
      
      <Toaster position="top-center" richColors />
      <NetworkDiagnostic />
    </Router>
  );
}
