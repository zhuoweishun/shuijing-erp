import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import PurchaseEntry from '../PurchaseEntry';
// import { apiClient } from '../../services/api'; // 暂时注释掉未使用的导入
import { useAuth } from '../../hooks/useAuth';

// Mock API
jest.mock('../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  }
}))

// 获取mock实例
const mockApiClient = require('../../services/api').apiClient as any

// 模拟依赖
jest.mock('../../hooks/useAuth');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// 测试组件包装器
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// 模拟数据
const mockSuppliers = [
  { id: '1', name: '测试供应商1', is_active: true },
  { id: '2', name: '测试供应商2', is_active: true }
];

const mockBossUser = {
       id: 1,
       user_name: 'boss',
       real_name: 'Boss User',
       name: 'boss',
       role: 'BOSS' as const,
       status: 'active' as const,
       token: 'mock-token',
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
     };

const mockEmployeeUser = {
  id: 2,
  user_name: 'employee',
  real_name: 'Employee User',
  name: 'employee',
  role: 'EMPLOYEE' as const,
  status: 'active' as const,
  token: 'mock-token',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe('PurchaseEntry 组件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 默认模拟API响应
    mockApiClient.get = jest.fn().mockResolvedValue({ data: mockSuppliers });
    mockApiClient.post = jest.fn().mockResolvedValue({ data: { id: '1' } });
  });

  describe('权限控制测试', () => {
    test('BOSS角色应该能够访问供应商功能', async () => {
      mockUseAuth.mockReturnValue({
        user: mockBossUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: true
      });

      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      // 等待组件加载
      await waitFor(() => {
        expect(screen.getByText('采购录入')).toBeInTheDocument();
      });

      // 验证供应商输入框存在
      const supplier_input = screen.getByLabelText(/供应商名称/);
      expect(supplier_input).toBeInTheDocument();
      expect(supplier_input).not.toBeDisabled();
    });

    test('EMPLOYEE角色应该看到权限不足提示', async () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployeeUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: false
      });

      // 模拟权限不足的API响应
      mockApiClient.get = jest.fn().mockRejectedValue({
        response: { status: 403, data: { message: '权限不足' } }
      });

      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('采购录入')).toBeInTheDocument();
      });

      // 验证权限提示信息
      await waitFor(() => {
        expect(screen.getByText(/权限不足/)).toBeInTheDocument();
      });
    });
  });

  describe('表单验证测试', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockBossUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: true
      });
    });

    test('必填字段验证', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const submitButton = screen.getByText('提交采购');
      
      // 尝试提交空表单
      fireEvent.click(submitButton);

      await waitFor(() => {
        // 验证必填字段错误提示
        expect(screen.getByText(/供应商名称为必填项/)).toBeInTheDocument();
        expect(screen.getByText(/材料名称为必填项/)).toBeInTheDocument();
      });
    });

    test('珠子直径范围验证', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const diameterInput = screen.getByLabelText(/珠子直径/);
      
      // 测试无效直径值
      await userEvent.clear(diameterInput);
      await userEvent.type(diameterInput, '3');
      
      fireEvent.blur(diameterInput);

      await waitFor(() => {
        expect(screen.getByText(/珠子直径必须在4-20mm之间/)).toBeInTheDocument();
      });

      // 测试有效直径值
      await userEvent.clear(diameterInput);
      await userEvent.type(diameterInput, '8');
      
      fireEvent.blur(diameterInput);

      await waitFor(() => {
        expect(screen.queryByText(/珠子直径必须在4-20mm之间/)).not.toBeInTheDocument();
      });
    });

    test('数量验证', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const quantityInput = screen.getByLabelText(/数量/);
      
      // 测试负数
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '-5');
      
      fireEvent.blur(quantityInput);

      await waitFor(() => {
        expect(screen.getByText(/数量必须大于0/)).toBeInTheDocument();
      });

      // 测试零值
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '0');
      
      fireEvent.blur(quantityInput);

      await waitFor(() => {
        expect(screen.getByText(/数量必须大于0/)).toBeInTheDocument();
      });
    });
  });

  describe('供应商选择功能测试', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockBossUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: true
      });
    });

    test('供应商下拉列表显示', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const supplier_input = screen.getByLabelText(/供应商名称/);
      
      // 点击输入框触发下拉列表
      fireEvent.focus(supplier_input);
      await userEvent.type(supplier_input, '测试');

      await waitFor(() => {
        expect(screen.getByText('测试供应商1')).toBeInTheDocument();
        expect(screen.getByText('测试供应商2')).toBeInTheDocument();
      });
    });

    test('供应商选择功能', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const supplier_input = screen.getByLabelText(/供应商名称/);
      
      // 触发下拉列表
      fireEvent.focus(supplier_input);
      await userEvent.type(supplier_input, '测试');

      await waitFor(() => {
        expect(screen.getByText('测试供应商1')).toBeInTheDocument();
      });

      // 选择供应商
      fireEvent.click(screen.getByText('测试供应商1'));

      await waitFor(() => {
        expect(supplier_input).toHaveValue('测试供应商1');
      });
    });

    test('新供应商创建功能', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const supplier_input = screen.getByLabelText(/供应商名称/);
      
      // 输入新供应商名称
      await userEvent.type(supplier_input, '新供应商名称');
      
      // 触发失焦事件（模拟创建新供应商）
      fireEvent.blur(supplier_input);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/suppliers', {
          name: '新供应商名称'
        });
      });
    });
  });

  describe('调试功能测试', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockBossUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: true
      });
    });

    test('调试按钮功能', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      // 查找调试按钮
      const debugButton = screen.getByText('查询数据库统计');
      expect(debugButton).toBeInTheDocument();

      // 点击调试按钮
      fireEvent.click(debugButton);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/suppliers/debug/count');
      });
    });
  });

  describe('表单提交测试', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockBossUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: true
      });
    });

    test('成功提交采购表单', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      // 填写表单
      const supplier_input = screen.getByLabelText(/供应商名称/);
      const materialNameInput = screen.getByLabelText(/材料名称/);
      const quantityInput = screen.getByLabelText(/数量/);
      const priceInput = screen.getByLabelText(/单价/);

      await userEvent.type(supplier_input, '测试供应商1');
      await userEvent.type(materialNameInput, '测试材料');
      await userEvent.type(quantityInput, '100');
      await userEvent.type(priceInput, '10.5');

      // 提交表单
      const submitButton = screen.getByText('提交采购');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/purchases',
          expect.objectContaining({
            supplier_name: '测试供应商1',
            material_name: '测试材料',
            quantity: 100,
            unit_price: 10.5
          })
        );
      });
    });
  });
});