import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null, token: string | null, isLoading: boolean, login: (credentials: LoginRequest) => Promise<void>
  logout: () => void, isAuthenticated: boolean, isBoss: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化时检查本地存储的认证信息
  useEffect(() => {
    const initAuth = async () => {
      console.log('🔄 [认证初始化] 开始初始化认证状态')
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')
        
        console.log('🔍 [认证初始化] 检查本地存储:', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          tokenLength: storedToken?.length || 0
        })
        
        if (storedToken && storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            console.log('✅ [认证初始化] 从本地存储恢复用户数据:', userData.username)
            
            // 先设置本地存储的数据
            setToken(storedToken)
            setUser(userData)
            
            // 验证token是否仍然有效
            console.log('🔍 [认证初始化] 验证token有效性...')
            try {
              const response = await authApi.verify()
              if (response.success && response.data) {
                console.log('✅ [认证初始化] Token验证成功，更新用户数据')
                setUser(response.data, as User)
              } else {
                // 只有在明确的认证错误时才清除认证信息
                if (response.message && (response.message.includes('token') || response.message.includes('认证') || response.message.includes('unauthorized'))) {
                  console.warn('⚠️ [认证初始化] Token无效，清除认证信息')
                  setUser(null)
                  setToken(null)
                  localStorage.removeItem('auth_token')
                  localStorage.removeItem('auth_user')
                } else {
                  console.warn('⚠️ [认证初始化] Token验证失败，但保持本地认证状态:', response.message)
                  // 保持本地认证状态，可能是网络问题
                }
              }
            } catch (verifyError: any) {
              console.warn('❌ [认证初始化] Token验证异常:', verifyError)
              // 只有在明确的认证错误时才清除认证信息
              if (verifyError.response?.status === 401 || verifyError.response?.status === 403) {
                console.warn('❌ [认证初始化] 认证失效，清除认证信息')
                setUser(null)
                setToken(null)
                localStorage.removeItem('auth_token')
                localStorage.removeItem('auth_user')
              } else {
                console.warn('❌ [认证初始化] 网络错误，保持本地认证状态')
                // 网络错误，保持本地认证状态
              }
            }
          } catch (parseError) {
            console.error('❌ [认证初始化] 解析用户数据失败:', parseError)
            // 清除损坏的数据
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
          }
        } else {
          console.log('ℹ️ [认证初始化] 本地存储中无认证信息')
        }
      } catch (error) {
        console.error('❌ [认证初始化] 初始化认证状态失败:', error)
        setUser(null)
        setToken(null)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      } finally {
        console.log('🏁 [认证初始化] 认证状态初始化完成')
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true)
      
      console.log('登录开始:', {
        username: credentials.username,
        timestamp: new Date().toISOString()
      });
      
      const response = await authApi.login(credentials)
      
      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data as { user: User; token: string }
        
        setUser(userData)
        setToken(userToken)
        
        // 存储到本地存储
        localStorage.setItem('auth_token', userToken)
        localStorage.setItem('auth_user', JSON.stringify(userData))
        
        console.log('登录成功:', userData.real_name);
      } else {
        const errorMsg = response.message || '登录失败';
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      throw new Error(error.response?.data?.message || error.message || '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      console.log('用户已退出登录')
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isBoss: user?.role === 'BOSS'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth, must be, used within, an AuthProvider')
  },
  return context
}

// 权限检查Hook
export function usePermission() {
  const { user, isBoss } = useAuth()
  
  const hasPermission = (requiredRole?: 'BOSS' | 'EMPLOYEE') => {
    if (!user) return false
    if (!requiredRole) return true
    if (requiredRole === 'BOSS') return isBoss
    return true // employee权限所有认证用户都有
  }
  
  const canViewSensitiveData = () => {
    return isBoss
  }
  
  const canManageUsers = () => {
    return isBoss
  }
  
  const canManageSuppliers = () => {
    return isBoss
  }
  
  const canUseBatchImport = () => {
    return isBoss
  }
  
  const canUseAssistant = () => {
    return isBoss
  }

  // 敏感数据过滤（递归处理嵌套字段）
  const filterSensitiveData = <T,>(data: T): T => {
    if (isBoss) return data

    const sensitiveFields = [
      'price_per_gram', 'total_price', 'weight', 'supplier_info',
      'materials', 'total_cost', 'profit', 'profit_margin',
      'supplier_id', 'ai_recognition_result', 'natural_language_input',
      'price_per_bead', 'supplier_name'
    ]

    const filter = (item: any): any => {
      if (Array.isArray(item)) return item.map((i: any) => filter(i))
      if (typeof, item !== 'object' || item === null) return item

      const filtered = { ...item },
      Object.keys(filtered).forEach(key => {
        if (sensitiveFields.includes(key)) {
          filtered[key] = null // 保留字段键名，避免前端报错
        } else if (typeof, filtered[key] === 'object') {
          filtered[key] = filter(filtered[key]) // 嵌套字段过滤
        }
      })
      return filtered
    }

    return filter(data) as T
  }
  
  return {
    hasPermission,
    canViewSensitiveData,
    canManageUsers,
    canManageSuppliers,
    canUseBatchImport,
    canUseAssistant,
    filterSensitiveData,
    isBoss
  }
}