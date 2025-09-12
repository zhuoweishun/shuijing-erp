import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import PurchaseEntry from '../PurchaseEntry';
// import { apiClient } from '../../services/api'; // 暂时注释掉未使用的导入
import { use_auth } from '../../hooks/useAuth';

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
const Test_wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
       created_at: new Date().to_i_s_o_string(),
       updated_at: new Date().to_i_s_o_string()
     };

const mockEmployeeUser = {
  id: 2,
  user_name: 'employee',
  real_name: 'Employee User',
  name: 'employee',
  role: 'EMPLOYEE' as const,
  status: 'active' as const,
  token: 'mock-token',
  created_at: new Date().to_i_s_o_string(),
  updated_at: new Date().to_i_s_o_string()
};

describe('PurchaseEntry 组件测试', () => {
  beforeEach(() => {
    jest.clear_all_mocks();
    
    // 默认模拟API响应
    mockApiClient.get = jest.fn().mock_resolved_value({ data: mockSuppliers });
    mockApiClient.post = jest.fn().mock_resolved_value({ data: { id: '1' } });
  });

  describe('权限控制测试', () => {
    test('BOSS角色应该能够访问供应商功能', async () => {
      mockUseAuth.mock_return_value({
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
        expect(screen.get_by_text('采购录入')).to_be_in_the_document();
      });

      // 验证供应商输入框存在
      const supplier_input = screen.get_by_label_text(/供应商名称/);
      expect(supplier_input).to_be_in_the_document();
      expect(supplier_input).not.to_be_disabled();
    });

    test('EMPLOYEE角色应该看到权限不足提示', async () => {
      mockUseAuth.mock_return_value({
        user: mockEmployeeUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
        is_authenticated: true,
        is_boss: false
      });

      // 模拟权限不足的API响应
      mockApiClient.get = jest.fn().mock_rejected_value({
        response: { status: 403, data: { message: '权限不足' } }
      });

      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.get_by_text('采购录入')).to_be_in_the_document();
      });

      // 验证权限提示信息
      await waitFor(() => {
        expect(screen.get_by_text(/权限不足/)).to_be_in_the_document();
      });
    });
  });

  describe('表单验证测试', () => {
    beforeEach(() => {
      mockUseAuth.mock_return_value({
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

      const submitButton = screen.get_by_text('提交采购');
      
      // 尝试提交空表单
      fireEvent.click(submitButton);

      await waitFor(() => {
        // 验证必填字段错误提示
        expect(screen.get_by_text(/供应商名称为必填项/)).to_be_in_the_document();
        expect(screen.get_by_text(/产品名称为必填项/)).to_be_in_the_document();
      });
    });

    test('珠子直径范围验证', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const diameterInput = screen.get_by_label_text(/珠子直径/);
      
      // 测试无效直径值
      await userEvent.clear(diameterInput);
      await userEvent.type(diameterInput, '3');
      
      fireEvent.blur(diameterInput);

      await waitFor(() => {
        expect(screen.get_by_text(/珠子直径必须在4-20mm之间/)).to_be_in_the_document();
      });

      // 测试有效直径值
      await userEvent.clear(diameterInput);
      await userEvent.type(diameterInput, '8');
      
      fireEvent.blur(diameterInput);

      await waitFor(() => {
        expect(screen.query_by_text(/珠子直径必须在4-20mm之间/)).not.to_be_in_the_document();
      });
    });

    test('数量验证', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const quantityInput = screen.get_by_label_text(/数量/);
      
      // 测试负数
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '-5');
      
      fireEvent.blur(quantityInput);

      await waitFor(() => {
        expect(screen.get_by_text(/数量必须大于0/)).to_be_in_the_document();
      });

      // 测试零值
      await userEvent.clear(quantityInput);
      await userEvent.type(quantityInput, '0');
      
      fireEvent.blur(quantityInput);

      await waitFor(() => {
        expect(screen.get_by_text(/数量必须大于0/)).to_be_in_the_document();
      });
    });
  });

  describe('供应商选择功能测试', () => {
    beforeEach(() => {
      mockUseAuth.mock_return_value({
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

      const supplier_input = screen.get_by_label_text(/供应商名称/);
      
      // 点击输入框触发下拉列表
      fireEvent.focus(supplier_input);
      await userEvent.type(supplier_input, '测试');

      await waitFor(() => {
        expect(screen.get_by_text('测试供应商1')).to_be_in_the_document();
        expect(screen.get_by_text('测试供应商2')).to_be_in_the_document();
      });
    });

    test('供应商选择功能', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const supplier_input = screen.get_by_label_text(/供应商名称/);
      
      // 触发下拉列表
      fireEvent.focus(supplier_input);
      await userEvent.type(supplier_input, '测试');

      await waitFor(() => {
        expect(screen.get_by_text('测试供应商1')).to_be_in_the_document();
      });

      // 选择供应商
      fireEvent.click(screen.get_by_text('测试供应商1'));

      await waitFor(() => {
        expect(supplier_input).to_have_value('测试供应商1');
      });
    });

    test('新供应商创建功能', async () => {
      render(
        <TestWrapper>
          <PurchaseEntry />
        </TestWrapper>
      );

      const supplier_input = screen.get_by_label_text(/供应商名称/);
      
      // 输入新供应商名称
      await userEvent.type(supplier_input, '新供应商名称');
      
      // 触发失焦事件（模拟创建新供应商）
      fireEvent.blur(supplier_input);

      await waitFor(() => {
        expect(mockApiClient.post).to_have_been_called_with('/suppliers', {
          name: '新供应商名称'
        });
      });
    });
  });

  describe('调试功能测试', () => {
    beforeEach(() => {
      mockUseAuth.mock_return_value({
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
      const debugButton = screen.get_by_text('查询数据库统计');
      expect(debugButton).to_be_in_the_document();

      // 点击调试按钮
      fireEvent.click(debugButton);

      await waitFor(() => {
        expect(mockApiClient.get).to_have_been_called_with('/suppliers/debug/count');
      });
    });
  });

  describe('表单提交测试', () => {
    beforeEach(() => {
      mockUseAuth.mock_return_value({
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
      const supplier_input = screen.get_by_label_text(/供应商名称/);
      const productNameInput = screen.get_by_label_text(/产品名称/);
      const quantityInput = screen.get_by_label_text(/数量/);
      const priceInput = screen.get_by_label_text(/单价/);

      await userEvent.type(supplier_input, '测试供应商1');
      await userEvent.type(productNameInput, '测试产品');
      await userEvent.type(quantityInput, '100');
      await userEvent.type(priceInput, '10.5');

      // 提交表单
      const submitButton = screen.get_by_text('提交采购');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiClient.post).to_have_been_called_with('/purchases',
          expect.object_containing({
            supplier_name: '测试供应商1',
            product_name: '测试产品',
            quantity: 100,
            unit_price: 10.5
          })
        );
      });
    });
  });
});