import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import InventoryList from '../InventoryList';
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

// 模拟库存数据
const mockInventoryData = [
  {
    material_type: '手串',
    variants: [
      {
        id: '1',
        product_name: '紫水晶手串',
        bead_diameter: 8,
        specification: '8mm',
        total_quantity: 50,
        available_quantity: 45,
        reserved_quantity: 5,
        costPrice: 25.5,
        selling_price: 45.0,
        supplier_name: '水晶供应商A',
        lastUpdated: '2024-01-15T10:30:00Z'
      }
    ]
  },
  {
    material_type: '项链',
    variants: [
      {
        id: '2',
        product_name: '玫瑰石英项链',
        bead_diameter: 6,
        specification: '6mm',
        total_quantity: 30,
        available_quantity: 28,
        reserved_quantity: 2,
        costPrice: 35.0,
        selling_price: 65.0,
        supplier_name: '水晶供应商B',
        lastUpdated: '2024-01-14T15:20:00Z'
      }
    ]
  }
];

const mockBossUser = {
  id: 1,
  user_name: 'boss',
  real_name: 'Boss User',
  name: 'Boss User',
  role: 'BOSS' as const,
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  token: 'mock-token'
};

const mockEmployeeUser = {
  id: 2,
  user_name: 'employee',
  real_name: 'Employee User',
  name: 'Employee User',
  role: 'EMPLOYEE' as const,
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  token: 'mock-token'
};

describe('InventoryList 组件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 默认模拟API响应
    mockApiClient.get = jest.fn().mockResolvedValue({ data: mockInventoryData });
    mockApiClient.post = jest.fn().mockResolvedValue({ 
      data: { 
        filename: 'inventory_export.xlsx',
        url: 'mock-download-url' 
      } 
    });
  });

  describe('权限控制测试', () => {
    test('BOSS角色应该能看到完整的库存信息', async () => {
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
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      // 验证BOSS能看到敏感信息
      await waitFor(() => {
        expect(screen.getByText('成本价')).toBeInTheDocument();
        expect(screen.getByText('¥25.50')).toBeInTheDocument(); // 成本价
        expect(screen.getByText('水晶供应商A')).toBeInTheDocument(); // 供应商信息
      });
    });

    test('EMPLOYEE角色应该看到过滤后的库存信息', async () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployeeUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: false
      });

      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      // 验证EMPLOYEE看不到敏感信息
      await waitFor(() => {
        expect(screen.queryByText('成本价')).not.toBeInTheDocument();
        expect(screen.queryByText('¥25.50')).not.toBeInTheDocument(); // 成本价应该被隐藏
        expect(screen.getByText('¥45.00')).toBeInTheDocument(); // 销售价应该可见
      });
    });
  });

  describe('筛选功能测试', () => {
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

    test('产品类型筛选', async () => {
      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      // 查找产品类型筛选器
      const product_type_filter = screen.getByLabelText(/产品类型/);
      expect(product_type_filter).toBeInTheDocument();

      // 选择手串类型
      fireEvent.change(product_type_filter, { target: { value: '手串' } });

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/inventory/hierarchical',
          expect.objectContaining({
            material_type: '手串'
          })
        );
      });
    });

    test('规格范围筛选', async () => {
      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      // 查找规格筛选输入框
      const minSpecInput = screen.getByLabelText(/最小规格/);
      const maxSpecInput = screen.getByLabelText(/最大规格/);

      // 输入筛选范围
      await userEvent.type(minSpecInput, '6');
      await userEvent.type(maxSpecInput, '10');

      // 触发筛选
      fireEvent.blur(maxSpecInput);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/inventory/hierarchical', 
          expect.objectContaining({
            params: expect.objectContaining({
              specMin: 6,
              specMax: 10
            })
          })
        );
      });
    });

    test('库存数量筛选', async () => {
      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      // 查找库存筛选选项
      const low_stock_filter = screen.getByLabelText(/低库存预警/);
      
      fireEvent.click(low_stock_filter);

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/inventory/hierarchical',
          expect.objectContaining({
            params: expect.objectContaining({
              lowStock: true
            })
          })
        );
      });
    });
  });

  describe('数据验证测试', () => {
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

    test('筛选参数验证', async () => {
      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      const minSpecInput = screen.getByLabelText(/最小规格/);
      const maxSpecInput = screen.getByLabelText(/最大规格/);

      // 测试无效范围（最小值大于最大值）
      await userEvent.type(minSpecInput, '10');
      await userEvent.type(maxSpecInput, '5');
      
      fireEvent.blur(maxSpecInput);

      await waitFor(() => {
        expect(screen.getByText(/最小值不能大于最大值/)).toBeInTheDocument();
      });
    });

    test('负数验证', async () => {
      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      const minSpecInput = screen.getByLabelText(/最小规格/);
      
      // 输入负数
      await userEvent.type(minSpecInput, '-5');
      fireEvent.blur(minSpecInput);

      await waitFor(() => {
        expect(screen.getByText(/规格值必须是非负数字/)).toBeInTheDocument();
      });
    });
  });

  describe('导出功能测试', () => {
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

    test('BOSS角色可以导出完整数据', async () => {
      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      // 查找导出按钮
      const exportButton = screen.getByText(/导出Excel/);
      expect(exportButton).toBeInTheDocument();

      // 点击导出
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/inventory/export',
          expect.objectContaining({
            includeSensitive: true // BOSS角色包含敏感数据
          })
        );
      });
    });

    test('EMPLOYEE角色导出过滤数据', async () => {
      mockUseAuth.mockReturnValue({
        user: mockEmployeeUser,
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        is_loading: false,
      is_authenticated: true,
      is_boss: false
      });

      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      const exportButton = screen.getByText(/导出Excel/);
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/inventory/export',
          expect.objectContaining({
            includeSensitive: false // EMPLOYEE角色不包含敏感数据
          })
        );
      });
    });
  });

  describe('响应式设计测试', () => {
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

    test('移动端视图切换', async () => {
      // 模拟移动端屏幕尺寸
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('原材料库存')).toBeInTheDocument();
      });

      // 验证移动端布局元素
      const mobileToggle = screen.getByLabelText(/切换视图/);
      expect(mobileToggle).toBeInTheDocument();
    });
  });

  describe('错误处理测试', () => {
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

    test('API错误处理', async () => {
      // 模拟API错误
      mockApiClient.get = jest.fn().mockRejectedValue({
        response: { 
          status: 500, 
          data: { message: '服务器内部错误' } 
        }
      });

      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/加载库存数据失败/)).toBeInTheDocument();
      });
    });

    test('网络错误处理', async () => {
      // 模拟网络错误
      mockApiClient.get = jest.fn().mockRejectedValue(
        new Error('Network Error')
      );

      render(
        <TestWrapper>
          <InventoryList />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/网络连接失败/)).toBeInTheDocument();
      });
    });
  });
});