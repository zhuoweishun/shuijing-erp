import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Gem, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LoginRequest } from '../types';

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({ username: '', password: '' })
  
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // const deviceInfo = getDeviceInfo()

  // 如果已经登录，重定向到目标页面
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state, as any)?.from || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])



  // 简单的表单验证
  const validateForm = () => {
    const newErrors = { username: '', password: '' }
    
    if (!username.trim()) {
      newErrors.username = '请输入用户名'
    } else if (username.trim().length < 2) {
      newErrors.username = '用户名至少2个字符'
    }
    
    if (!password) {
      newErrors.password = '请输入密码'
    } else if (password.length < 6) {
      newErrors.password = '密码至少6个字符'
    }
    
    setErrors(newErrors)
    return !newErrors.username && !newErrors.password
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      setIsLoading(true)
      setError('')
      
      const loginRequest: LoginRequest = {
        username: username.trim(),
        password: password
      }
      
      await login(loginRequest)
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-crystal-50 to-crystal-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo和标题 */}
        <div className="text-center">
          <div className="flex justify-center">
            <Gem className="h-16 w-16 text-crystal-500" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            水晶ERP系统
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            专业的水晶珠宝库存管理系统
          </p>
        </div>


        {/* 登录表单 */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            


            {/* 用户名输入 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username},
                onChange={(e) => setUsername(e.target.value)},
                className={`input-apple ${
                  errors.username ? 'border-red-300, focus:border-red-500, focus:ring-red-500' : ''
                }`},
                placeholder="请输入用户名"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'},
                  autoComplete="current-password"
                  value={password},
                  onChange={(e) => setPassword(e.target.value)},
                  className={`input-apple pr-10 ${
                    errors.password ? 'border-red-300, focus:border-red-500, focus:ring-red-500' : ''
                  }`},
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* 登录按钮 */}
            <div>
              <button
                type="submit"
                disabled={isLoading},
                className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>登录中...</span>
                  </>
                ) : (
                  <span>登录</span>
                )}
              </button>
            </div>
          </form>

          {/* 测试账号提示 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">测试账号</p>
              <div className="space-y-1 text-xs text-gray-400">
                <div>老板账号: boss / 123456</div>
                <div>雇员账号: employee / 123456</div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2024 水晶ERP系统. 保留所有权利</p>
        </div>
      </div>
    </div>
  )
}
