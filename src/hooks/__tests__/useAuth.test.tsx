import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import * as api from '../../services/api';

// 模拟API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// 模拟localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 模拟用户数据
const mockBossUser = {
  id: '1',
  username: 'boss',
  role: 'BOSS' as const,
  token: 'mock-boss-token'
};

const mockEmployeeUser = {
  id: '2',
  username: 'employee',
  role: 'EMPLOYEE' as const,
  token: 'mock-employee-token'
};

describe('useAuth Hook 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // 重置mock API方法
    mockApi.authApi.login = jest.fn();
    mockApi.authApi.logout = jest.fn();
    mockApi.authApi.verify = jest.fn();
  });

  describe('初始化状态测试', () => {
    test('无token时应该返回未登录状态', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    test('有有效token时应该自动获取用户信息', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      mockApi.authApi.verify = jest.fn().mockResolvedValue({
        data: mockBossUser
      });
      
      const { result } = renderHook(() => useAuth());
      
      // 初始加载状态
      expect(result.current.isLoading).toBe(true);
      
      // 等待异步操作完成
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user).toEqual(mockBossUser);
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.authApi.verify).toHaveBeenCalled();
    });

    test('无效token时应该清除本地存储', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      mockApi.authApi.verify = jest.fn().mockRejectedValue({
        response: { status: 401 }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('登录功能测试', () => {
    test('成功登录BOSS用户', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockApi.authApi.login = jest.fn().mockResolvedValue({
        data: {
          user: mockBossUser,
          token: 'new-boss-token'
        }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login({ username: 'boss', password: 'password123' });
      });
      
      expect(mockApi.authApi.login).toHaveBeenCalledWith({
        username: 'boss',
        password: 'password123'
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-boss-token');
      expect(result.current.user).toEqual(mockBossUser);
    });

    test('成功登录EMPLOYEE用户', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockApi.authApi.login = jest.fn().mockResolvedValue({
        data: {
          user: mockEmployeeUser,
          token: 'new-employee-token'
        }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.login({ username: 'employee', password: 'password123' });
      });
      
      expect(result.current.user).toEqual(mockEmployeeUser);
      expect(result.current.user?.role).toBe('EMPLOYEE');
    });

    test('登录失败应该抛出错误', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockApi.authApi.login = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: '用户名或密码错误' }
        }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login({ username: 'wrong', password: 'wrong' });
        } catch (error: any) {
          expect(error.response.status).toBe(401);
          expect(error.response.data.message).toBe('用户名或密码错误');
        }
      });
      
      expect(result.current.user).toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    test('网络错误处理', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockApi.authApi.login = jest.fn().mockRejectedValue(
        new Error('Network Error')
      );
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.login({ username: 'user', password: 'pass' });
        } catch (error: any) {
          expect(error.message).toBe('Network Error');
        }
      });
      
      expect(result.current.user).toBeNull();
    });
  });

  describe('登出功能测试', () => {
    test('成功登出', async () => {
      // 设置初始登录状态
      localStorageMock.getItem.mockReturnValue('valid-token');
      mockApi.authApi.verify = jest.fn().mockResolvedValue({
        data: mockBossUser
      });
      mockApi.authApi.logout = jest.fn().mockResolvedValue({});
      
      const { result } = renderHook(() => useAuth());
      
      // 等待初始化完成
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user).toEqual(mockBossUser);
      
      // 执行登出
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockApi.authApi.logout).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(result.current.user).toBeNull();
    });

    test('登出API失败时仍应清除本地状态', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      mockApi.authApi.verify = jest.fn().mockResolvedValue({
        data: mockEmployeeUser
      });
      mockApi.authApi.logout = jest.fn().mockRejectedValue(
        new Error('Logout API failed')
      );
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      await act(async () => {
        await result.current.logout();
      });
      
      // 即使API失败，也应该清除本地状态
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(result.current.user).toBeNull();
    });
  });

  describe('权限验证测试', () => {
    test('BOSS用户权限验证', async () => {
      localStorageMock.getItem.mockReturnValue('boss-token');
      mockApi.authApi.verify = jest.fn().mockResolvedValue({
        data: mockBossUser
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user?.role).toBe('BOSS');
      expect(result.current.user?.username).toBe('boss');
    });

    test('EMPLOYEE用户权限验证', async () => {
      localStorageMock.getItem.mockReturnValue('employee-token');
      mockApi.authApi.verify = jest.fn().mockResolvedValue({
        data: mockEmployeeUser
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user?.role).toBe('EMPLOYEE');
      expect(result.current.user?.username).toBe('employee');
    });
  });

  describe('Token刷新测试', () => {
    test('Token过期时自动清除状态', async () => {
      localStorageMock.getItem.mockReturnValue('expired-token');
      mockApi.authApi.verify = jest.fn().mockRejectedValue({
        response: { 
          status: 401, 
          data: { message: 'Token已过期' } 
        }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.user).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('并发请求处理测试', () => {
    test('多次同时调用login应该正确处理', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockApi.authApi.login = jest.fn().mockResolvedValue({
        data: {
          user: mockBossUser,
          token: 'concurrent-token'
        }
      });
      
      const { result } = renderHook(() => useAuth());
      
      // 同时发起多个登录请求
      await act(async () => {
        const promises = [
          result.current.login({ username: 'boss', password: 'password' }),
          result.current.login({ username: 'boss', password: 'password' }),
          result.current.login({ username: 'boss', password: 'password' })
        ];
        
        await Promise.all(promises);
      });
      
      // 应该只调用一次API
      expect(mockApi.authApi.login).toHaveBeenCalledTimes(3);
      expect(result.current.user).toEqual(mockBossUser);
    });
  });
});