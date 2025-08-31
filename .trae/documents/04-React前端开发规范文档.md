# React前端开发规范文档（适配现有组件）

## 一、文档概述

本文档规范了水晶ERP系统前端开发的技术标准、组件设计、状态管理、UI交互等核心规范，确保代码质量和开发效率。

**适用范围：** 前端开发人员、UI设计师、技术负责人
**更新频率：** 随功能迭代实时更新
**版本：** v1.0

## 二、技术栈规范

### 2.1 核心技术栈

- **前端框架：** React 18 + TypeScript
- **构建工具：** Vite
- **样式框架：** Tailwind CSS 3
- **状态管理：** React Hooks (useState, useEffect, useContext)
- **路由管理：** React Router DOM
- **HTTP客户端：** Axios
- **图标库：** Lucide React
- **UI组件：** 自定义组件 + Tailwind CSS

### 2.2 项目结构规范（提取自《React组件规范文档》1.1）

```plaintext
src/
├── components/          # 通用组件（复用现有）
│   ├── ProtectedRoute.tsx # 权限路由（已开发）
│   ├── PermissionWrapper.tsx # 敏感内容包裹（已开发）
│   ├── Form/            # 表单组件（MaterialSelector等）
│   └── UI/              # 基础UI（Notification等）
├── pages/              # 页面组件（已开发核心页面）
│   ├── PurchaseEntry.tsx # 采购录入（含AI识别）
│   ├── InventoryList.tsx # 库存列表（实时计算）
│   ├── ProductList.tsx  # 成品管理（含销毁逻辑）
│   └── SupplierManagement.tsx # 供应商管理（仅老板）
├── hooks/              # 自定义Hooks（复用现有）
│   ├── useAuth.tsx      # 认证Hook
│   ├── usePermission.tsx # 权限Hook（敏感字段过滤）
│   └── useNotification.tsx # 提示Hook
├── services/           # API服务（已封装）
│   ├── api.ts          # Axios实例（含拦截器）
│   ├── aiService.ts     # 豆包AI调用
│   └── networkService.ts # 网络检测服务
├── utils/              # 工具函数
│   ├── networkDetector.ts # 网络环境检测
│   ├── debugTools.ts   # 调试工具集
│   └── retryHandler.ts # 智能重试处理
└── types/              # 类型定义（复用现有）
    └── index.ts        # 核心类型（Purchase、Product等）
```

## 三、认证系统前端规范

### 3.1 Login页面组件规范

#### 3.1.1 组件结构设计

**文件路径：** `src/pages/Login.tsx`

**组件职责：**
- 用户登录表单渲染
- 表单验证和错误处理
- 登录状态管理
- 响应式设计适配

**核心状态管理：**
```typescript
interface LoginState {
  username: string;           // 用户名
  password: string;           // 密码
  showPassword: boolean;      // 密码显示状态
  isLoading: boolean;         // 加载状态
  error: string;             // 错误信息
}
```

#### 3.1.2 表单验证规范

**验证规则：**
- 用户名：必填，不能为空
- 密码：必填，不能为空
- 实时验证：失焦时触发验证
- 错误提示：表单下方显示错误信息

**验证实现：**
```typescript
const validateForm = () => {
  if (!username.trim()) {
    setError('请输入用户名');
    return false;
  }
  if (!password.trim()) {
    setError('请输入密码');
    return false;
  }
  setError('');
  return true;
};
```

#### 3.1.3 UI设计规范

**布局结构：**
- 居中卡片式布局
- 响应式设计（移动端适配）
- 品牌Logo和标题
- 表单输入区域
- 登录按钮和状态提示

**样式规范：**
```css
/* 主容器 */
.login-container {
  @apply min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4;
}

/* 登录卡片 */
.login-card {
  @apply bg-white rounded-2xl shadow-xl p-8 w-full max-w-md;
}

/* 输入框样式 */
.login-input {
  @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

/* 登录按钮 */
.login-button {
  @apply w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed;
}
```

**交互状态：**
- 加载状态：按钮显示加载动画，禁用表单
- 错误状态：错误信息红色显示，输入框红色边框
- 成功状态：登录成功后跳转到主页面

#### 3.1.4 密码显示切换功能

**功能实现：**
```typescript
const [showPassword, setShowPassword] = useState(false);

const togglePasswordVisibility = () => {
  setShowPassword(!showPassword);
};

// JSX中的实现
<div className="relative">
  <input
    type={showPassword ? 'text' : 'password'}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="login-input pr-12"
    placeholder="请输入密码"
  />
  <button
    type="button"
    onClick={togglePasswordVisibility}
    className="absolute right-3 top-1/2 transform -translate-y-1/2"
  >
    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
  </button>
</div>
```

### 3.2 useAuth Hook规范

#### 3.2.1 Hook职责定义

**文件路径：** `src/hooks/useAuth.tsx`

**核心职责：**
- 用户认证状态管理
- Token存储和验证
- 登录/登出逻辑处理
- 权限控制判断

#### 3.2.2 状态管理规范

**认证状态结构：**
```typescript
interface AuthState {
  user: User | null;          // 当前用户信息
  token: string | null;       // JWT Token
  isAuthenticated: boolean;   // 认证状态
  isLoading: boolean;         // 加载状态
  isBoss: boolean;           // 是否为管理员
}
```

**初始化逻辑：**
```typescript
const initializeAuth = useCallback(async () => {
  const storedToken = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  if (storedToken && storedUser) {
    try {
      // 验证Token有效性
      const response = await authApi.verify();
      if (response.success) {
        setUser(response.data);
        setToken(storedToken);
        setIsAuthenticated(true);
      } else {
        // Token无效，清除本地存储
        clearAuthData();
      }
    } catch (error) {
      clearAuthData();
    }
  }
  setIsLoading(false);
}, []);
```

#### 3.2.3 登录流程规范

**登录方法实现：**
```typescript
const login = async (username: string, password: string) => {
  try {
    const response = await authApi.login({ username, password });
    
    if (response.success) {
      const { token, user } = response.data;
      
      // 存储认证信息
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // 更新状态
      setToken(token);
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } else {
      return { success: false, message: response.message };
    }
  } catch (error) {
    return { success: false, message: '登录失败，请稍后重试' };
  }
};
```

#### 3.2.4 登出流程规范

**登出方法实现：**
```typescript
const logout = async () => {
  try {
    // 调用后端登出接口
    await authApi.logout();
  } catch (error) {
    console.error('登出接口调用失败:', error);
  } finally {
    // 无论接口是否成功，都清除本地状态
    clearAuthData();
  }
};

const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setToken(null);
  setUser(null);
  setIsAuthenticated(false);
};
```

### 3.3 响应式设计规范

#### 3.3.1 断点设计

**Tailwind CSS断点：**
- `sm`: 640px及以上（小屏幕）
- `md`: 768px及以上（中等屏幕）
- `lg`: 1024px及以上（大屏幕）
- `xl`: 1280px及以上（超大屏幕）

#### 3.3.2 移动端适配

**Login页面移动端优化：**
```typescript
// 移动端样式调整
const mobileStyles = {
  container: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4",
  card: "bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md",
  title: "text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center",
  input: "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
  button: "w-full bg-blue-600 text-white py-3 text-base rounded-lg hover:bg-blue-700 disabled:opacity-50"
};
```

**触摸优化：**
- 按钮最小点击区域44px
- 输入框适当增大高度
- 合理的间距设计
- 避免悬停效果在移动端的问题

## 四、核心组件实现

### 4.1 PurchaseDetailModal组件编辑功能规范

#### 4.1.1 组件概述

**文件路径：** `src/components/PurchaseDetailModal.tsx`

**组件职责：**
- 采购记录详情展示
- 采购记录编辑功能
- 修改历史记录显示
- 权限控制和字段验证
- 响应式设计适配

**核心功能：**
- 支持所有产品类型的字段编辑
- 实时字段变更检测
- 自动记录修改历史
- 供应商自动创建
- 派生字段自动计算

#### 4.1.2 状态管理规范

**核心状态结构：**
```typescript
interface PurchaseDetailState {
  purchase: Purchase | null;                    // 采购记录数据
  loading: boolean;                            // 加载状态
  error: string | null;                        // 错误信息
  isEditMode: boolean;                         // 编辑模式状态
  editData: Partial<Purchase & {supplier_name: string}>; // 编辑数据
  suppliers: Array<{id: string, name: string}>; // 供应商列表
  selectedImageIndex: number;                  // 选中图片索引
  showDeleteConfirm: boolean;                  // 删除确认对话框
}
```

**编辑数据初始化逻辑：**
```typescript
// 根据产品类型动态初始化编辑数据
const initializeEditData = (purchase: Purchase) => {
  const baseData = {
    product_name: purchase.product_name || '',
    quality: purchase.quality || '',
    price_per_gram: purchase.price_per_gram || 0,
    total_price: purchase.total_price || 0,
    weight: purchase.weight || 0,
    supplier_name: purchase.supplier?.name || '',
    notes: purchase.notes || ''
  };
  
  // 根据产品类型添加相应字段
  if (purchase.product_type === 'BRACELET') {
    // 手串类型：使用quantity, bead_diameter, beads_per_string, total_beads
    return {
      ...baseData,
      quantity: purchase.quantity || undefined,
      bead_diameter: purchase.bead_diameter || undefined,
      beads_per_string: purchase.beads_per_string || undefined,
      total_beads: purchase.total_beads || undefined
    };
  } else {
    // 其他类型：使用piece_count和对应的规格字段
    const editDataObj: any = {
      ...baseData,
      piece_count: purchase.piece_count || undefined
    };
    
    if (purchase.product_type === 'LOOSE_BEADS') {
      editDataObj.bead_diameter = purchase.bead_diameter || undefined;
    } else if (purchase.product_type === 'ACCESSORIES' || purchase.product_type === 'FINISHED') {
      editDataObj.specification = purchase.specification || undefined;
    }
    
    return editDataObj;
  }
};
```

#### 4.1.3 字段变更检测逻辑

**变更检测实现：**
```typescript
const detectFieldChanges = (editData: any, originalPurchase: Purchase) => {
  const updateData: any = {};
  
  // 检查每个字段是否有变化（使用snake_case格式发送给后端）
  const fieldMappings = [
    { edit: 'product_name', original: 'product_name' },
    { edit: 'quantity', original: 'quantity' },
    { edit: 'piece_count', original: 'piece_count' },
    { edit: 'bead_diameter', original: 'bead_diameter' },
    { edit: 'specification', original: 'specification' },
    { edit: 'quality', original: 'quality' },
    { edit: 'price_per_gram', original: 'price_per_gram' },
    { edit: 'total_price', original: 'total_price' },
    { edit: 'weight', original: 'weight' },
    { edit: 'beads_per_string', original: 'beads_per_string' },
    { edit: 'total_beads', original: 'total_beads' },
    { edit: 'notes', original: 'notes' },
    { edit: 'supplier_name', original: (p: Purchase) => p.supplier?.name || '' }
  ];
  
  fieldMappings.forEach(({ edit, original }) => {
    if (editData[edit] !== undefined) {
      const originalValue = typeof original === 'function' 
        ? original(originalPurchase) 
        : originalPurchase[original];
      
      if (editData[edit] !== originalValue) {
        updateData[edit] = editData[edit];
      }
    }
  });
  
  return updateData;
};
```

#### 4.1.4 编辑字段渲染逻辑

**动态字段渲染：**
```typescript
const renderEditField = (
  field: string, 
  label: string, 
  value: any, 
  type: 'text' | 'number' | 'select' = 'text', 
  options?: string[]
) => {
  if (!isEditMode) {
    // 显示模式：格式化显示值
    if (field === 'price_per_gram' || field === 'total_price') {
      return user?.role === 'EMPLOYEE' ? '-' : (value ? `¥${value}` : '-');
    }
    if (field === 'weight') {
      return value ? `${value}g` : '-';
    }
    if (field === 'bead_diameter' || field === 'specification') {
      return value ? `${value}mm` : '-';
    }
    if (field === 'quality') {
      return value ? `${value}级` : '未知';
    }
    return value || '-';
  }
  
  // 编辑模式：渲染输入控件
  if (type === 'select' && options) {
    return (
      <select
        value={editData[field] || ''}
        onChange={(e) => updateEditData(field, e.target.value)}
        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
      >
        <option value="">请选择</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }
  
  if (type === 'number') {
    return (
      <input
        type="number"
        value={editData[field] || ''}
        onChange={(e) => {
          const value = e.target.value;
          const numValue = value === '' ? undefined : parseFloat(value);
          updateEditData(field, numValue);
        }}
        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
        placeholder={`请输入${label}`}
      />
    );
  }
  
  return (
    <input
      type="text"
      value={editData[field] || ''}
      onChange={(e) => updateEditData(field, e.target.value)}
      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
      placeholder={`请输入${label}`}
    />
  );
};
```

#### 4.1.5 保存逻辑实现

**保存处理流程：**
```typescript
const handleSave = async () => {
  if (!purchase || !canEdit) return;
  
  try {
    setLoading(true);
    
    // 1. 检测字段变更
    const updateData = detectFieldChanges(editData, purchase);
    
    // 2. 验证是否有变更
    if (Object.keys(updateData).length === 0) {
      toast.info('没有检测到任何变化');
      setIsEditMode(false);
      return;
    }
    
    // 3. 调用后端API保存数据
    const response = await purchaseApi.update(purchase.id, updateData);
    
    if (response.success) {
      toast.success('保存成功');
      setIsEditMode(false);
      setEditData({});
      
      // 4. 重新获取数据
      await fetchPurchaseDetail();
      
      // 5. 通知父组件刷新列表
      if (onSave) {
        onSave();
      }
    } else {
      toast.error(response.message || '保存失败');
    }
  } catch (error) {
    console.error('保存失败:', error);
    toast.error(error instanceof Error ? error.message : '保存失败，请重试');
  } finally {
    setLoading(false);
  }
};
```

#### 4.1.6 修改历史显示逻辑

**修改历史渲染：**
```typescript
const renderEditHistory = () => {
  if (!purchase.edit_logs || purchase.edit_logs.length === 0) {
    return (
      <div className="bg-white rounded-lg p-3 border border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {purchase.last_edited_by?.name || purchase.user?.name || '系统管理员'} 修改了采购信息
          </span>
          <span className="text-gray-500">
            {formatDate(purchase.updated_at)}
          </span>
        </div>
      </div>
    );
  }
  
  // 按用户和时间分组合并日志
  const groupedLogs = purchase.edit_logs.reduce((groups: {[key: string]: any[]}, log: any) => {
    const timeKey = new Date(log.created_at).toISOString().slice(0, 16);
    const groupKey = `${log.user_id}_${timeKey}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(log);
    return groups;
  }, {});
  
  // 转换为数组并按时间倒序排列，显示最近5条
  const sortedGroups = Object.entries(groupedLogs)
    .sort(([a], [b]) => {
      const timeA = a.split('_')[1];
      const timeB = b.split('_')[1];
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    })
    .slice(0, 5);
  
  return (
    <div className="space-y-2">
      {sortedGroups.map(([groupKey, logs]) => {
        const firstLog = logs[0];
        const editorName = firstLog.user?.name || '系统管理员';
        const mergedDetails = logs.length > 0 && logs[0].details 
          ? logs[0].details
          : `${editorName} 修改了采购信息`;
        
        return (
          <div key={groupKey} className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="text-xs text-gray-700 leading-relaxed">
              {mergedDetails}
            </div>
          </div>
        );
      })}
      {Object.keys(groupedLogs).length > 5 && (
        <p className="text-xs text-gray-400 text-center py-1">
          还有更多历史记录...
        </p>
      )}
    </div>
  );
};
```

#### 4.1.7 权限控制规范

**编辑权限控制：**
```typescript
const { user } = useAuth();
const canEdit = user?.role === 'BOSS';

// 编辑按钮权限控制
{canEdit && (
  <button
    onClick={toggleEditMode}
    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
  >
    <Edit className="h-3 w-3 mr-1 inline" />
    {isEditMode ? '取消编辑' : '编辑'}
  </button>
)}

// 敏感字段显示控制
const renderSensitiveField = (value: any, label: string) => {
  if (user?.role === 'EMPLOYEE') {
    return '-';
  }
  return value ? `¥${value}` : '-';
};
```

#### 4.1.8 错误处理规范

**错误处理策略：**
```typescript
// API调用错误处理
try {
  const response = await purchaseApi.update(purchase.id, updateData);
  if (response.success) {
    // 成功处理
  } else {
    // 业务错误处理
    toast.error(response.message || '保存失败');
  }
} catch (error: any) {
  // 网络错误或其他异常
  if (error.response?.data?.message) {
    toast.error(error.response.data.message);
  } else {
    toast.error('保存失败，请重试');
  }
}

// 表单验证错误处理
const validateEditData = (data: any) => {
  const errors: string[] = [];
  
  if (data.product_name && data.product_name.trim().length === 0) {
    errors.push('产品名称不能为空');
  }
  
  if (data.total_price && data.total_price <= 0) {
    errors.push('总价必须大于0');
  }
  
  if (data.bead_diameter && (data.bead_diameter < 4 || data.bead_diameter > 50)) {
    errors.push('珠子直径必须在4-50mm之间');
  }
  
  return errors;
};
```（提取现有逻辑，无新增）

### 2.1 PermissionWrapper组件（权限控制，提取自《React组件规范文档》3.1）

```typescript
interface PermissionWrapperProps {
  children: React.ReactNode;
  allowedRoles: ('boss' | 'employee')[]; // 允许的角色
  hideForEmployee?: boolean; // 雇员隐藏（显示***）
}

const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children, allowedRoles, hideForEmployee = false
}) => {
  const { user } = useAuth();
  const hasPermission = allowedRoles.includes(user?.role || 'employee');

  if (!hasPermission) return null;
  if (hideForEmployee && user?.role === 'employee') {
    return <span className="text-gray-400">***</span>;
  }
  return <>{children}</>;
};
```

### 2.2 PurchaseEntry组件核心逻辑（采购录入，提取自《React组件规范文档》4.1）

```typescript
// 珠子直径计算每串颗数（现有逻辑）
const handleBeadDiameterChange = (diameter: string) => {
  const diameterNum = parseFloat(diameter);
  if (diameterNum > 0) {
    const beadsPerString = Math.floor(160 / diameterNum); // 16cm手围=160mm
    setFormData(prev => ({
      ...prev,
      bead_diameter: diameter,
      beads_per_string: beadsPerString,
      total_beads: prev.quantity ? prev.quantity * beadsPerString : null
    }));
  }
};

// AI识别调用（完整实现）
const handleAiParse = async (description: string) => {
  if (!description.trim()) {
    toast.error('请输入采购描述');
    return;
  }
  
  setAiParsing(true);
  try {
    const response = await aiApi.parseCrystalPurchase(description);
    if (response.success && response.data) {
      const data = response.data;
      
      console.log('🤖 AI识别原始数据:', data);
      
      // 字段映射和自动填充
      const updates: any = {};
      
      // 产品名称映射
      if (data.productName) {
        updates.product_name = data.productName;
      }
      
      // 产品类型映射
      if (data.productType) {
        updates.product_type = data.productType;
      }
      
      // 珠径映射
      if (data.beadDiameter) {
        updates.bead_diameter = data.beadDiameter.toString();
        // 自动计算每串颗数
        const beadsPerString = Math.floor(160 / data.beadDiameter);
        updates.beads_per_string = beadsPerString;
      }
      
      // 数量映射（根据产品类型）
      if (data.quantity) {
        updates.quantity = data.quantity;
      }
      if (data.pieceCount) {
        updates.piece_count = data.pieceCount;
      }
      
      // 价格映射
      if (data.pricePerGram) {
        updates.price_per_gram = data.pricePerGram;
      }
      if (data.unitPrice) {
        updates.unit_price = data.unitPrice;
      }
      if (data.totalPrice) {
        updates.total_price = data.totalPrice;
      }
      
      // 重量映射
      if (data.weight) {
        updates.weight = data.weight;
      }
      
      // 品相映射
      if (data.quality) {
        updates.quality = data.quality;
      }
      
      // 供应商映射
      if (data.supplierName) {
        updates.supplier_name = data.supplierName;
        // 同步到供应商输入框
        setSupplierState(prev => ({
          ...prev,
          currentInput: data.supplierName
        }));
      }
      
      // 备注映射
      if (data.notes) {
        updates.notes = data.notes;
      }
      
      // 批量更新表单数据
      setFormData(prev => ({ ...prev, ...updates }));
      
      console.log('✅ AI识别成功，已填充字段:', Object.keys(updates));
      toast.success(`AI识别成功，已自动填充${Object.keys(updates).length}个字段`);
    } else {
      throw new Error(response.message || 'AI识别失败');
    }
  } catch (error: any) {
    console.error('❌ AI识别失败:', error);
    toast.error(error.message || 'AI识别失败，请手动输入');
  } finally {
    setAiParsing(false);
  }
};

// 供应商选择逻辑（权限控制）
const { user } = useAuth();
const [supplierState, setSupplierState] = useState({
  suppliers: [],
  filteredSuppliers: [],
  showDropdown: false,
  currentInput: '',
  isLoading: false
});

// 加载供应商列表（仅BOSS权限）
const loadSuppliers = async () => {
  if (user?.role !== 'BOSS') {
    console.log('🚫 [权限] 雇员角色无法访问供应商功能');
    return;
  }
  
  setSupplierState(prev => ({ ...prev, isLoading: true }));
  try {
    const response = await supplierApi.getAll({ limit: 1000 });
    const suppliers = response.data.suppliers || [];
    
    // 数据去重逻辑（按ID优先，ID为空时按名称）
    const uniqueSuppliers = suppliers.reduce((acc, current) => {
      const existingIndex = acc.findIndex(item => {
        if (current.id && item.id) {
          return item.id === current.id;
        }
        return item.name === current.name;
      });
      
      if (existingIndex === -1) {
        acc.push(current);
      } else {
        console.log('🔍 [去重] 发现重复供应商:', {
          current: { id: current.id, name: current.name },
          existing: { id: acc[existingIndex].id, name: acc[existingIndex].name }
        });
      }
      return acc;
    }, []);
    
    setSupplierState(prev => ({
      ...prev,
      suppliers: uniqueSuppliers,
      filteredSuppliers: uniqueSuppliers,
      isLoading: false
    }));
    
    console.log('✅ [供应商加载] 成功:', {
      原始数据长度: suppliers.length,
      去重后数量: uniqueSuppliers.length,
      去重移除数量: suppliers.length - uniqueSuppliers.length
    });
  } catch (error) {
    console.error('❌ [供应商加载] 失败:', error);
    setSupplierState(prev => ({ ...prev, isLoading: false }));
  }
};

// 供应商选择交互优化
const handleSupplierSelect = (supplier, event?: React.MouseEvent) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  console.log('🎯 [供应商选择]:', supplier);
  setFormData(prev => ({ 
    ...prev, 
    supplier_id: supplier.id,
    supplier_name: supplier.name 
  }));
  setSupplierState(prev => ({
    ...prev,
    currentInput: supplier.name,
    showDropdown: false
  }));
};

// 防抖搜索（300ms延迟）
const handleSupplierInputChange = useCallback(
  debounce((value: string) => {
    const filtered = supplierState.suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(value.toLowerCase())
    );
    setSupplierState(prev => ({
      ...prev,
      filteredSuppliers: filtered,
      currentInput: value,
      showDropdown: value.length > 0 && filtered.length > 0
    }));
  }, 300),
  [supplierState.suppliers]
);

// 下拉框延迟隐藏（300ms）
const handleSupplierBlur = () => {
  setTimeout(() => {
    setSupplierState(prev => ({ ...prev, showDropdown: false }));
  }, 300);
};
```

### 2.3 网络检测与智能重试组件（新增）

```typescript
// 网络状态检测Hook
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');

  useEffect(() => {
    const detectNetwork = async () => {
      try {
        const endpoint = await networkDetector.getBestEndpoint();
        setApiEndpoint(endpoint);
        setIsOnline(true);
        setConnectionQuality('good');
      } catch (error) {
        setIsOnline(false);
        setConnectionQuality('offline');
      }
    };

    detectNetwork();
    const interval = setInterval(detectNetwork, 30000); // 30秒检测一次
    return () => clearInterval(interval);
  }, []);

  return { isOnline, apiEndpoint, connectionQuality };
};

// 智能重试Hook
const useSmartRetry = () => {
  const retryWithBackoff = async <T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) break;
        
        // 指数退避延迟
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  };

  return { retryWithBackoff };
};
```

## 四、表头筛选功能实现规范

### 4.1 表头筛选系统架构

**核心功能：** 支持6种筛选类型的表头筛选系统，包括位置计算、外部关闭、跨页保持等功能

**筛选类型定义：**
```typescript
type FilterType = 'sort' | 'search' | 'select' | 'multiSelect' | 'range' | 'sortAndRange';

interface FilterConfig {
  type: FilterType;
  field: string;
  label: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}
```

**表头筛选状态管理：**
```typescript
interface FilterState {
  activeFilter: string | null;           // 当前激活的筛选器
  filterPosition: { top: number; left: number } | null; // 筛选面板位置
  filters: Record<string, any>;          // 筛选值
  sortBy: string;                        // 排序字段
  sortOrder: 'asc' | 'desc';            // 排序方向
}

const [filterState, setFilterState] = useState<FilterState>({
  activeFilter: null,
  filterPosition: null,
  filters: {},
  sortBy: 'created_at',
  sortOrder: 'desc'
});
```

### 4.2 筛选面板位置计算

**位置计算逻辑：**
```typescript
const calculateFilterPosition = (buttonElement: HTMLElement) => {
  const rect = buttonElement.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = 300; // 筛选面板宽度
  const panelHeight = 400; // 筛选面板最大高度
  
  let left = rect.left;
  let top = rect.bottom + 8;
  
  // 右边界检测
  if (left + panelWidth > viewportWidth) {
    left = viewportWidth - panelWidth - 16;
  }
  
  // 左边界检测
  if (left < 16) {
    left = 16;
  }
  
  // 下边界检测
  if (top + panelHeight > viewportHeight) {
    top = rect.top - panelHeight - 8;
  }
  
  // 上边界检测
  if (top < 16) {
    top = 16;
  }
  
  return { top, left };
};
```

**筛选器激活处理：**
```typescript
const handleFilterClick = (field: string, event: React.MouseEvent) => {
  event.stopPropagation();
  
  const buttonElement = event.currentTarget as HTMLElement;
  const position = calculateFilterPosition(buttonElement);
  
  setFilterState(prev => ({
    ...prev,
    activeFilter: prev.activeFilter === field ? null : field,
    filterPosition: prev.activeFilter === field ? null : position
  }));
};
```

### 4.3 外部点击关闭功能

**外部点击检测：**
```typescript
const filterPanelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (filterState.activeFilter && filterPanelRef.current) {
      const target = event.target as Node;
      
      // 检查点击是否在筛选面板内
      if (!filterPanelRef.current.contains(target)) {
        // 检查点击是否在表头按钮上
        const isHeaderButton = (target as Element).closest('[data-filter-button]');
        
        if (!isHeaderButton) {
          setFilterState(prev => ({
            ...prev,
            activeFilter: null,
            filterPosition: null
          }));
        }
      }
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [filterState.activeFilter]);
```

### 4.4 Portal组件实现

**筛选面板Portal：**
```typescript
import { createPortal } from 'react-dom';

const FilterPanel: React.FC<{
  isOpen: boolean;
  position: { top: number; left: number } | null;
  config: FilterConfig;
  value: any;
  onChange: (value: any) => void;
  onClose: () => void;
}> = ({ isOpen, position, config, value, onChange, onClose }) => {
  if (!isOpen || !position) return null;
  
  const panelContent = (
    <div
      ref={filterPanelRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px]"
      style={{
        top: position.top,
        left: position.left
      }}
    >
      {renderFilterContent(config, value, onChange)}
    </div>
  );
  
  return createPortal(panelContent, document.body);
};
```

### 4.5 筛选类型实现

**多选筛选器：**
```typescript
const MultiSelectFilter: React.FC<{
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}> = ({ options, value = [], onChange, placeholder }) => {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };
  
  const handleSelectAll = () => {
    const allValues = options.map(opt => opt.value);
    onChange(value.length === options.length ? [] : allValues);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">选择选项</span>
        <button
          onClick={handleSelectAll}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {value.length === options.length ? '取消全选' : '全选'}
        </button>
      </div>
      
      <div className="max-h-48 overflow-y-auto space-y-1">
        {options.map(option => (
          <label
            key={option.value}
            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
```

**范围筛选器：**
```typescript
const RangeFilter: React.FC<{
  min?: number;
  max?: number;
  step?: number;
  value: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number }) => void;
  label: string;
}> = ({ min = 0, max = 100, step = 1, value, onChange, label }) => {
  const [localValue, setLocalValue] = useState(value);
  
  const handleChange = (field: 'min' | 'max', newValue: string) => {
    const numValue = newValue === '' ? undefined : Number(newValue);
    const updated = { ...localValue, [field]: numValue };
    setLocalValue(updated);
    onChange(updated);
  };
  
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{label}</div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">最小值</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={localValue.min ?? ''}
            onChange={(e) => handleChange('min', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="最小值"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">最大值</label>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={localValue.max ?? ''}
            onChange={(e) => handleChange('max', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="最大值"
          />
        </div>
      </div>
    </div>
  );
};
```

### 4.6 跨页筛选状态保持

**筛选状态持久化：**
```typescript
const FILTER_STORAGE_KEY = 'purchase_list_filters';

// 保存筛选状态到localStorage
const saveFiltersToStorage = useCallback((filters: Record<string, any>) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error);
  }
}, []);

// 从localStorage恢复筛选状态
const loadFiltersFromStorage = useCallback(() => {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error);
    return {};
  }
}, []);

// 初始化时恢复筛选状态
useEffect(() => {
  const savedFilters = loadFiltersFromStorage();
  if (Object.keys(savedFilters).length > 0) {
    setFilterState(prev => ({
      ...prev,
      filters: savedFilters
    }));
  }
}, []);

// 筛选状态变化时保存
useEffect(() => {
  if (Object.keys(filterState.filters).length > 0) {
    saveFiltersToStorage(filterState.filters);
  }
}, [filterState.filters, saveFiltersToStorage]);
```

### 4.7 防抖搜索实现

**搜索防抖处理：**
```typescript
import { debounce } from 'lodash';

const [searchValue, setSearchValue] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

// 防抖搜索函数
const debouncedSearchHandler = useCallback(
  debounce((value: string) => {
    setDebouncedSearch(value);
    setFilterState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        search: value || undefined
      }
    }));
  }, 300),
  []
);

// 搜索输入处理
const handleSearchChange = (value: string) => {
  setSearchValue(value);
  debouncedSearchHandler(value);
};

// 清除搜索
const handleSearchClear = () => {
  setSearchValue('');
  setDebouncedSearch('');
  debouncedSearchHandler.cancel();
  setFilterState(prev => ({
    ...prev,
    filters: {
      ...prev.filters,
      search: undefined
    }
  }));
};
```

## 五、采购录入页面组件规范

### 5.1 PurchaseEntry组件架构

**文件路径：** `src/pages/PurchaseEntry.tsx`

**核心依赖：**
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import Camera from 'react-html5-camera-photo';
import 'react-html5-camera-photo/build/css/index.css';
```

**组件状态管理：**
```typescript
interface PurchaseFormData {
  product_name: string;
  product_type: 'LOOSE_BEADS' | 'BRACELET' | 'ACCESSORIES' | 'FINISHED';
  unit_type: 'PIECES' | 'STRINGS' | 'SLICES' | 'ITEMS';
  bead_diameter?: number;
  specification?: number;
  quantity?: number;
  piece_count?: number;
  price_per_gram?: number;
  total_price?: number;
  weight?: number;
  quality?: 'AA' | 'A' | 'AB' | 'B' | 'C';
  supplier_name: string;
  notes?: string;
  natural_language_input?: string;
}

// 主要状态
const [photos, setPhotos] = useState<string[]>([]);
const [fileDataList, setFileDataList] = useState<FileData[]>([]);
const [uploading, setUploading] = useState(false);
const [aiParsing, setAiParsing] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [suppliers, setSuppliers] = useState<Supplier[]>([]);
const [loadingSuppliers, setLoadingSuppliers] = useState(false);
const [supplierInput, setSupplierInput] = useState('');
const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
const [creatingSupplier, setCreatingSupplier] = useState(false);
```

### 5.2 相机功能组件规范

**相机错误边界组件：**
```typescript
class CameraErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Camera error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <p className="text-red-600">相机功能暂时不可用</p>
          <p className="text-sm text-gray-500">请使用文件上传功能</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**相机兼容性检查：**
```typescript
const checkCameraCompatibility = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // 开发环境下放宽限制
  if (isDevelopment) {
    return true;
  }
  
  // 生产环境需要HTTPS
  if (!isHttps && !isLocalhost) {
    return false;
  }
  
  // 检查浏览器支持
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

// 相机状态管理
const [cameraActive, setCameraActive] = useState(false);
const [cameraSupported, setCameraSupported] = useState(false);

useEffect(() => {
  setCameraSupported(checkCameraCompatibility());
}, []);

// 相机拍照处理
const handleCameraPhoto = async (dataUri: string) => {
  console.log('📸 相机拍照，开始上传...');
  setUploading(true);
  
  try {
    // 将dataUri转换为Blob
    const response = await fetch(dataUri);
    const blob = await response.blob();
    
    // 构建FormData
    const formData = new FormData();
    formData.append('images', blob, `camera-${Date.now()}.jpg`);
    
    // 上传图片
    const uploadResponse = await uploadApi.upload_purchase_images(formData);
    
    if (uploadResponse.success && uploadResponse.data?.urls) {
      const fullUrls = uploadResponse.data.urls.map(url => 
        fixImageUrl(url, getApiUrl())
      );
      setPhotos(prev => [...prev, ...fullUrls]);
      console.log('✅ 相机拍照上传成功:', fullUrls);
    }
  } catch (error) {
    console.error('❌ 相机拍照上传失败:', error);
    toast.error('拍照上传失败，请重试');
  } finally {
    setUploading(false);
    setCameraActive(false);
  }
};
```

### 5.3 图片上传处理规范

**Dropzone配置：**
```typescript
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp']
  },
  multiple: true,
  maxFiles: 10,
  maxSize: 10 * 1024 * 1024, // 10MB
  onDrop: handleImageUpload
});

// 文件验证函数
const validateFileData = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    toast.error(`不支持的文件格式: ${file.type}`);
    return false;
  }
  
  if (file.size > maxSize) {
    toast.error(`文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    return false;
  }
  
  return true;
};

// Base64转Blob函数
const base64ToBlob = (base64Data: string, contentType: string): Blob => {
  const byteCharacters = atob(base64Data.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

// 图片上传处理
const handleImageUpload = async (acceptedFiles: File[]) => {
  if (acceptedFiles.length === 0) return;
  
  setUploading(true);
  
  try {
    for (const file of acceptedFiles) {
      // 文件验证
      if (!validateFileData(file)) {
        continue;
      }
      
      // 读取文件为Base64
      const base64Data = await readFileData(file);
      
      // 存储文件数据到状态
      const fileData: FileData = {
        file,
        base64: base64Data,
        uploaded: false
      };
      setFileDataList(prev => [...prev, fileData]);
      
      // 转换为Blob并上传
      const blob = base64ToBlob(base64Data, file.type);
      const formData = new FormData();
      formData.append('images', blob, file.name);
      
      const response = await uploadApi.upload_purchase_images(formData);
      
      if (response.success && response.data?.urls) {
        const fullUrls = response.data.urls.map(url => 
          fixImageUrl(url, getApiUrl())
        );
        setPhotos(prev => [...prev, ...fullUrls]);
        
        // 更新文件数据状态
        setFileDataList(prev => 
          prev.map(item => 
            item.file === file ? { ...item, uploaded: true } : item
          )
        );
      }
    }
  } catch (error) {
    console.error('图片上传失败:', error);
    toast.error('图片上传失败，请重试');
    
    // 清理失败的文件数据
    setFileDataList(prev => 
      prev.filter(item => item.uploaded)
    );
  } finally {
    setUploading(false);
  }
};
```

### 5.4 AI识别功能规范

**AI解析处理：**
```typescript
const handleAiParse = async (description: string) => {
  if (!description.trim()) {
    toast.error('请输入采购描述');
    return;
  }
  
  setAiParsing(true);
  
  try {
    const response = await aiApi.parse_crystal_purchase({
      description: description.trim()
    });
    
    if (response.success && response.data) {
      const aiData = response.data;
      
      // 字段映射（camelCase -> snake_case）
      const fieldMapping = {
        productName: 'product_name',
        productType: 'product_type',
        unitType: 'unit_type',
        beadDiameter: 'bead_diameter',
        specification: 'specification',
        quantity: 'quantity',
        pieceCount: 'piece_count',
        pricePerGram: 'price_per_gram',
        totalPrice: 'total_price',
        weight: 'weight',
        quality: 'quality',
        supplierName: 'supplier_name',
        notes: 'notes'
      };
      
      // 自动填充表单
      Object.entries(fieldMapping).forEach(([aiField, formField]) => {
        if (aiData[aiField] !== undefined && aiData[aiField] !== null) {
          setValue(formField as keyof PurchaseFormData, aiData[aiField]);
        }
      });
      
      // 价格计算提示
      const hasPrice = aiData.pricePerGram || aiData.totalPrice;
      const hasWeight = aiData.weight;
      
      if (hasPrice && hasWeight) {
        calculateMissingValue(aiData.pricePerGram, aiData.totalPrice, aiData.weight);
      }
      
      toast.success('AI识别完成，请检查并补充信息');
    }
  } catch (error) {
    console.error('AI解析失败:', error);
    toast.error('AI解析失败，请重试');
  } finally {
    setAiParsing(false);
  }
};

// 价格计算函数
const calculateMissingValue = (pricePerGram?: number, totalPrice?: number, weight?: number) => {
  if (pricePerGram && totalPrice && !weight) {
    const calculatedWeight = totalPrice / pricePerGram;
    setValue('weight', parseFloat(calculatedWeight.toFixed(3)));
    toast.info(`已自动计算重量: ${calculatedWeight.toFixed(3)}克`);
  } else if (pricePerGram && weight && !totalPrice) {
    const calculatedTotal = pricePerGram * weight;
    setValue('total_price', parseFloat(calculatedTotal.toFixed(2)));
    toast.info(`已自动计算总价: ¥${calculatedTotal.toFixed(2)}`);
  } else if (totalPrice && weight && !pricePerGram) {
    const calculatedPrice = totalPrice / weight;
    setValue('price_per_gram', parseFloat(calculatedPrice.toFixed(2)));
    toast.info(`已自动计算克价: ¥${calculatedPrice.toFixed(2)}/克`);
  }
};
```

### 5.5 供应商管理功能规范

**供应商列表加载：**
```typescript
const loadSuppliers = async () => {
  setLoadingSuppliers(true);
  try {
    const response = await supplierApi.list();
    if (response.success && response.data) {
      setSuppliers(response.data);
    }
  } catch (error) {
    console.error('加载供应商列表失败:', error);
  } finally {
    setLoadingSuppliers(false);
  }
};

// 供应商输入处理
const handleSupplierInputChange = (value: string) => {
  setSupplierInput(value);
  setValue('supplier_name', value);
  setShowSupplierDropdown(value.length > 0);
};

// 供应商选择
const handleSupplierSelect = (supplier: Supplier) => {
  setSupplierInput(supplier.name);
  setValue('supplier_name', supplier.name);
  setShowSupplierDropdown(false);
};

// 创建新供应商
const createNewSupplier = async (name: string) => {
  setCreatingSupplier(true);
  try {
    const response = await supplierApi.create({
      name: name.trim(),
      contact_person: '',
      phone: '',
      address: ''
    });
    
    if (response.success && response.data) {
      setSuppliers(prev => [...prev, response.data]);
      setSupplierInput(name.trim());
      setValue('supplier_name', name.trim());
      setShowSupplierDropdown(false);
      toast.success('供应商创建成功');
      return response.data;
    }
  } catch (error) {
    console.error('创建供应商失败:', error);
    toast.error('创建供应商失败，请重试');
    throw error;
  } finally {
    setCreatingSupplier(false);
  }
};

// 供应商输入失焦处理
const handleSupplierBlur = () => {
  setTimeout(() => {
    setShowSupplierDropdown(false);
  }, 200);
};

// 过滤供应商列表
const filteredSuppliers = suppliers.filter(supplier =>
  supplier.name.toLowerCase().includes(supplierInput.toLowerCase())
);
```

### 2.4 AI服务类完整实现规范

```typescript
// AI服务类（src/services/aiService.ts）
import apiClient from './api'
import { AIParseRequest, AIParseResponse, AssistantRequest, AssistantResponse } from '../types'

class AIService {
  /**
   * 解析采购描述文本
   * 使用豆包AI提取结构化数据
   */
  async parseDescription(description: string): Promise<AIParseResponse> {
    try {
      console.log('🤖 开始AI解析:', description)
      
      const request: AIParseRequest = {
        description: description.trim()
      }
      
      const response = await apiClient.post<AIParseResponse>(
        '/ai/parse-description',
        request
      )
      
      if (response.success && response.data) {
        console.log('🤖 AI解析成功:', response.data)
        return response.data
      } else {
        throw new Error(response.message || 'AI解析失败')
      }
    } catch (error: any) {
      console.error('🤖 AI解析失败:', error)
      throw new Error(error.message || 'AI解析服务暂时不可用')
    }
  }
  
  /**
   * 智能助理对话（仅老板权限）
   */
  async chat(message: string, context?: any): Promise<AssistantResponse> {
    try {
      console.log('💬 智能助理对话:', message)
      
      const request: AssistantRequest = {
        message: message.trim(),
        context
      }
      
      const response = await apiClient.post<AssistantResponse>(
        '/assistant/chat',
        request
      )
      
      if (response.success && response.data) {
        console.log('💬 助理回复:', response.data.message)
        return response.data
      } else {
        throw new Error(response.message || '智能助理暂时不可用')
      }
    } catch (error: any) {
      console.error('💬 智能助理错误:', error)
      
      // 处理权限错误
      if (error.message?.includes('403') || error.message?.includes('权限')) {
        throw new Error('智能助理功能仅限老板使用')
      }
      
      throw new Error(error.message || '智能助理服务暂时不可用')
    }
  }
  
  /**
   * 获取业务数据分析（仅老板权限）
   */
  async getBusinessInsights(query: string): Promise<AssistantResponse> {
    try {
      console.log('📊 获取业务洞察:', query)
      
      const response = await apiClient.post<AssistantResponse>(
        '/assistant/insights',
        { query }
      )
      
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '业务分析失败')
      }
    } catch (error: any) {
      console.error('📊 业务洞察错误:', error)
      throw new Error(error.message || '业务分析服务暂时不可用')
    }
  }
  
  /**
   * 验证AI服务可用性
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await apiClient.get('/ai/health')
      return response.success
    } catch (error) {
      console.warn('AI服务不可用:', error)
      return false
    }
  }
  
  /**
   * 获取AI服务配置信息
   */
  async getConfig(): Promise<any> {
    try {
      const response = await apiClient.get('/ai/config')
      return response.data
    } catch (error) {
      console.warn('无法获取AI配置:', error)
      return null
    }
  }
}

// 创建AI服务实例
export const aiService = new AIService()

// 工具函数：格式化AI解析结果
export function formatAIParseResult(result: AIParseResponse): string {
  const parts: string[] = []
  
  if (result.product_name) {
    parts.push(`产品名称: ${result.product_name}`)
  }
  
  if (result.quantity) {
    parts.push(`数量: ${result.quantity}串`)
  }
  
  if (result.bead_diameter) {
    parts.push(`直径: ${result.bead_diameter}mm`)
  }
  
  if (result.weight) {
    parts.push(`重量: ${result.weight}g`)
  }
  
  if (result.price_per_gram) {
    parts.push(`克价: ¥${result.price_per_gram}`)
  }
  
  if (result.quality) {
    parts.push(`品相: ${result.quality}`)
  }
  
  if (result.supplier_name) {
    parts.push(`供应商: ${result.supplier_name}`)
  }
  
  return parts.length > 0 ? parts.join(' | ') : '未识别到有效信息'
}

// 工具函数：验证AI解析结果
export function validateAIParseResult(result: AIParseResponse): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // 检查置信度
  if (result.confidence < 0.5) {
    errors.push('AI识别置信度较低，请检查输入内容')
  }
  
  // 检查必要字段
  if (!result.product_name) {
    errors.push('未识别到产品名称')
  }
  
  // 检查数值合理性
  if (result.quantity && (result.quantity <= 0 || result.quantity > 10000)) {
    errors.push('数量值不合理')
  }
  
  if (result.bead_diameter && (result.bead_diameter <= 0 || result.bead_diameter > 100)) {
    errors.push('直径值不合理')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### 2.5 调试工具组件（开发环境）

```typescript
// 开发环境调试面板
const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { apiEndpoint, connectionQuality } = useNetworkStatus();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // 全局调试工具
      (window as any).apiDebug = {
        showPanel: () => setIsVisible(true),
        hidePanel: () => setIsVisible(false),
        getNetworkInfo: () => ({ apiEndpoint, connectionQuality }),
        clearCache: () => localStorage.clear(),
        testConnection: () => networkDetector.testConnectivity(),
        testAI: async () => {
          try {
            const health = await aiService.checkAvailability();
            const config = await aiService.getConfig();
            console.log('AI服务状态:', { health, config });
            return { health, config };
          } catch (error) {
            console.error('AI服务测试失败:', error);
            return { error };
          }
        }
      };
    }
  }, [apiEndpoint, connectionQuality]);

  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">调试信息</h3>
        <button onClick={() => setIsVisible(false)} className="text-gray-400">×</button>
      </div>
      <div className="text-xs space-y-1">
        <div>API地址: {apiEndpoint}</div>
        <div>连接质量: {connectionQuality}</div>
        <div>环境: {process.env.NODE_ENV}</div>
        <div>AI服务: 可通过 window.apiDebug.testAI() 测试</div>
      </div>
    </div>
  );
};

// API调试工具组件
const ApiDebugTools: React.FC = () => {
  const debugApi = async () => {
    try {
      const response = await fetch('/api/v1/debug/status');
      const data = await response.json();
      console.log('🔍 [API调试]:', data);
    } catch (error) {
      console.error('❌ [API调试失败]:', error);
    }
  };
  
  return (
    <button onClick={debugApi} className="bg-blue-500 text-white px-4 py-2 rounded">
      调试API状态
    </button>
  );
};

// 供应商调试功能组件
const SupplierDebugTools: React.FC = () => {
  const { user } = useAuth();
  const [debugData, setDebugData] = useState<any>(null);
  
  // 调试供应商数据
  const debugSupplierData = () => {
    const currentState = {
      suppliersCount: supplierState.suppliers.length,
      allSuppliers: supplierState.suppliers,
      filteredSuppliersCount: supplierState.filteredSuppliers.length,
      filteredSuppliers: supplierState.filteredSuppliers,
      currentInput: supplierState.currentInput,
      showDropdown: supplierState.showDropdown,
      userRole: user?.role,
      isBoss: user?.role === 'BOSS'
    };
    
    console.log('🔍 [调试] 当前供应商数据:', currentState);
    setDebugData(currentState);
  };
  
  // 查询数据库统计
  const queryDatabaseStats = async () => {
    try {
      console.log('🔍 [调试] 测试后端调试端点...');
      const response = await supplierApi.debugCount();
      console.log('📊 [调试] 后端数据库统计:', response.data);
      
      if (response.data.success) {
        const { totalSuppliers, activeSuppliers, allActiveSuppliers } = response.data.data;
        console.log('📊 [调试] 数据库统计详情:', {
          总供应商数: totalSuppliers,
          活跃供应商数: activeSuppliers,
          非活跃供应商数: totalSuppliers - activeSuppliers
        });
        console.log('📊 [调试] 所有活跃供应商列表:', allActiveSuppliers);
        
        showSuccessMessage(`数据库统计：总计${totalSuppliers}个，活跃${activeSuppliers}个`);
      }
    } catch (error) {
      console.error('❌ [调试] 查询数据库统计失败:', error);
      showErrorMessage('查询数据库统计失败');
    }
  };
  
  // 重新加载供应商
  const reloadSuppliers = async () => {
    console.log('🔄 [调试] 重新加载供应商...');
    await loadSuppliers();
    console.log('🔍 [调试] 加载完成，当前状态:', {
      suppliers: supplierState.suppliers.length,
      filteredSuppliers: supplierState.filteredSuppliers.length
    });
  };
  
  if (process.env.NODE_ENV !== 'development' || user?.role !== 'BOSS') {
    return null;
  }
  
  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <h4 className="text-sm font-bold mb-2">🔧 调试工具（开发环境）</h4>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={debugSupplierData}
          className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
        >
          调试供应商数据
        </button>
        <button
          onClick={queryDatabaseStats}
          className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
        >
          查询数据库统计
        </button>
        <button
          onClick={reloadSuppliers}
          className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
        >
          重新加载供应商
        </button>
      </div>
      {debugData && (
        <div className="mt-2 p-2 bg-white rounded text-xs">
          <pre>{JSON.stringify(debugData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
```

## 三、采购记录编辑功能规范（新增）

### 3.1 建议数值计算逻辑规范

#### 3.1.1 价格三选二计算逻辑

**核心原理：** 克价、总价、重量三个字段中，当有任意两个有效值时，自动计算第三个值。

**实现规范：**

```typescript
// 三选二计算逻辑：克价、总价、重量
const hasValidPrice = total_price > 0
const hasValidWeight = weight > 0
const hasValidPricePerGram = price_per_gram > 0

// 计算缺失值的逻辑
if (hasValidPrice && hasValidPricePerGram && !hasValidWeight) {
  // 有总价和克价，计算重量
  const calculatedWeight = total_price / price_per_gram
  newSuggestions.weight = calculatedWeight
} else if (hasValidPrice && hasValidWeight && !hasValidPricePerGram) {
  // 有总价和重量，计算克价
  const calculatedPricePerGram = total_price / weight
  newSuggestions.price_per_gram = calculatedPricePerGram
} else if (hasValidPricePerGram && hasValidWeight && !hasValidPrice) {
  // 有克价和重量，计算总价
  const calculatedTotalPrice = price_per_gram * weight
  newSuggestions.total_price = calculatedTotalPrice
} else if (hasValidPrice && hasValidPricePerGram && hasValidWeight) {
  // 三者都有值，检查是否一致
  const calculatedTotalPrice = price_per_gram * weight
  const tolerance = 0.1 // 允许0.1的误差
  
  if (Math.abs(total_price - calculatedTotalPrice) > tolerance) {
    // 数据不一致，提供三种调整选项
    newSuggestions.inconsistency_warning = {
      type: 'warning',
      message: '价格数据不一致',
      options: {
        total_price: (price_per_gram * weight).toFixed(1),
        price_per_gram: weight > 0 ? (total_price / weight).toFixed(1) : '0',
        weight: price_per_gram > 0 ? (total_price / price_per_gram).toFixed(1) : '0'
      }
    }
  }
}
```

#### 3.1.2 串数颗数计算逻辑

**手串类型专用计算：**

```typescript
// 1. 每串颗数计算 - 基于手围和直径
// 标准手围160mm，每串颗数 = 手围 ÷ 直径
if (bead_diameter > 0) {
  const standardWristSize = 160 // 标准手围160mm
  const calculatedBeadsPerString = Math.round(standardWristSize / bead_diameter)
  if (Math.abs(beads_per_string - calculatedBeadsPerString) > 0.1) {
    newSuggestions.beads_per_string = calculatedBeadsPerString
  }
}

// 2. 总颗数计算 - 串数 × 每串颗数
if (quantity > 0 && beads_per_string > 0) {
  const calculatedTotalBeads = quantity * beads_per_string
  if (Math.abs(total_beads - calculatedTotalBeads) > 0.1) {
    newSuggestions.total_beads = calculatedTotalBeads
  }
}

// 3. 每颗单价计算 - 总价 ÷ 总颗数
if (total_price > 0 && total_beads > 0) {
  const calculatedPricePerBead = total_price / total_beads
  newSuggestions.price_per_bead = calculatedPricePerBead
}
```

#### 3.1.3 字段验证规则更新

**允许null值和0值的字段：**

```typescript
// 更新后的验证规则
const fieldValidation = {
  price_per_gram: {
    type: 'number',
    min: 0, // 允许0值
    nullable: true, // 允许null值
    message: '克价不能为负数'
  },
  total_price: {
    type: 'number',
    min: 0, // 允许0值
    nullable: true, // 允许null值
    message: '总价不能为负数'
  },
  weight: {
    type: 'number',
    min: 0, // 允许0值
    nullable: true, // 允许null值
    message: '重量不能为负数'
  }
}
```

#### 3.1.4 建议值显示规范

**UI显示规则：**

```typescript
// 建议值显示组件
{isEditMode && suggestions.weight && (
  <div className="text-xs text-red-600 mt-1">
    建议: {suggestions.weight.toFixed(1)}g
  </div>
)}

{isEditMode && suggestions.price_per_gram && (
  <div className="text-xs text-red-600 mt-1">
    建议: ¥{suggestions.price_per_gram.toFixed(1)}
  </div>
)}

{isEditMode && suggestions.total_price && (
  <div className="text-xs text-red-600 mt-1">
    建议: ¥{suggestions.total_price.toFixed(1)}
  </div>
)}

// 不一致性警告显示
{isEditMode && suggestions.inconsistency_warning && (
  <div className="text-xs text-orange-600 mt-1 p-2 bg-orange-50 rounded border border-orange-200">
    <div className="font-medium mb-1">⚠️ {suggestions.inconsistency_warning.message}</div>
    <div>建议总价: ¥{suggestions.inconsistency_warning.options.total_price}</div>
    <div>建议克价: ¥{suggestions.inconsistency_warning.options.price_per_gram}</div>
    <div>建议重量: {suggestions.inconsistency_warning.options.weight}g</div>
  </div>
)}
```

## 四、表头筛选功能规范（新增）

### 4.1 表头筛选功能配置

表头筛选功能通过 `columnFilters` 配置实现，支持多种筛选类型：

```typescript
columnFilters: {
  purchaseCode: { visible: false, type: 'sort' }, // 排序功能
  productName: { visible: false, type: 'search' }, // 搜索功能
  product_type: { visible: false, type: 'select' }, // 多选功能
  specification: { visible: false, type: 'sortAndRange' }, // 排序和范围筛选
  quality: { visible: false, type: 'select' }, // 选择功能
  supplier: { visible: false, type: 'select' }, // 选择功能
  beadDiameter: { visible: false, type: 'sortAndRange' }, // 排序和范围筛选
  quantity: { visible: false, type: 'sort' }, // 排序功能
  pricePerGram: { visible: false, type: 'sortAndRange' }, // 排序和范围筛选
  totalPrice: { visible: false, type: 'sort' }, // 排序功能
  purchaseDate: { visible: false, type: 'sort' } // 排序功能
}
```

### 3.2 筛选类型说明

| 筛选类型 | 功能描述 | 适用场景 | 实现要点 |
|---------|---------|---------|----------|
| sort | 升序/降序排序 | 数值、日期、文本排序 | 支持三态切换：升序→降序→无排序 |
| search | 文本搜索 | 产品名称、采购编号等 | 实时输入，支持模糊匹配 |
| select | 下拉选择 | 品相、供应商等枚举值 | 单选或多选，动态获取选项 |
| sortAndRange | 排序+范围筛选 | 规格、克价、珠径等数值 | 同时支持排序和数值范围筛选 |
| numberRange | 纯数值范围 | 数量范围等 | 最小值-最大值输入框 |
| dateRange | 日期范围 | 采购日期等 | 开始日期-结束日期选择器 |

### 3.3 权限控制

敏感字段的筛选功能需要根据用户角色控制显示：

```typescript
// 只有BOSS角色才能看到敏感字段的筛选功能
{user?.role === 'BOSS' && renderColumnFilter('pricePerGram', '克价')}
{user?.role === 'BOSS' && renderColumnFilter('totalPrice', '总价')}
{user?.role === 'BOSS' && renderColumnFilter('supplier', '供应商')}
```

### 3.4 字段映射规范

前端字段名必须正确映射到后端字段名：

```typescript
const fieldMapping: { [key: string]: string } = {
  'purchaseDate': 'purchase_date',
  'purchaseCode': 'purchase_code',
  'productName': 'product_name',
  'specification': 'specification',
  'supplier': 'supplier',
  'quantity': 'quantity',
  'price_per_gram': 'price_per_gram',
  'total_price': 'total_price',
  'bead_diameter': 'bead_diameter'
}
```

## 三、表头筛选功能规范（新增）

### 3.1 筛选功能类型定义

| 筛选类型 | 功能描述 | 适用场景 | UI组件 |
|---------|---------|---------|--------|
| sort | 仅排序功能 | 采购编号、数量、总价、采购日期 | 升序/降序按钮 |
| search | 搜索功能 | 产品名称 | 文本输入框 |
| select | 选择功能 | 品相、供应商 | 下拉选择框 |
| multiSelect | 多选功能 | 产品类型 | 复选框组 |
| sortAndRange | 排序+范围筛选 | 规格、珠径、克价 | 排序按钮+数值范围输入 |

### 3.2 columnFilters配置规范

```typescript
columnFilters: {
  // 排序功能
  purchaseCode: { visible: false, type: 'sort' },
  quantity: { visible: false, type: 'sort' },
  totalPrice: { visible: false, type: 'sort' },
  purchaseDate: { visible: false, type: 'sort' },
  
  // 搜索功能
  productName: { visible: false, type: 'search' },
  
  // 选择功能
  quality: { visible: false, type: 'select' },
  supplier: { visible: false, type: 'select' },
  
  // 多选功能
  product_type: { visible: false, type: 'multiSelect' },
  
  // 排序+范围筛选
  specification: { visible: false, type: 'sortAndRange' },
  beadDiameter: { visible: false, type: 'sortAndRange' },
  pricePerGram: { visible: false, type: 'sortAndRange' }
}
```

### 3.3 筛选状态管理规范

```typescript
interface FilterState {
  // 基础筛选
  search: string              // 搜索关键词
  quality: string             // 品相选择
  supplier: string            // 供应商选择
  product_types: string[]     // 产品类型多选
  
  // 日期范围
  startDate: string
  endDate: string
  
  // 数值范围筛选
  diameterMin: string         // 珠径最小值
  diameterMax: string         // 珠径最大值
  specificationMin: string    // 规格最小值
  specificationMax: string    // 规格最大值
  quantityMin: string         // 数量最小值
  quantityMax: string         // 数量最大值
  price_per_gram_min: string  // 克价最小值
  price_per_gram_max: string  // 克价最大值
}
```

### 3.4 字段映射规范

```typescript
// 前端字段名到后端字段名的映射
const fieldMapping: { [key: string]: string } = {
  'purchaseDate': 'purchase_date',
  'purchaseCode': 'purchase_code', 
  'productName': 'product_name',
  'supplier': 'supplier',
  'quantity': 'quantity',
  'pricePerGram': 'price_per_gram',
  'totalPrice': 'total_price',
  'beadDiameter': 'bead_diameter',
  'specification': 'specification'
}
```

### 3.5 权限控制规范

```typescript
// 敏感字段筛选功能仅对BOSS角色显示
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  <div className="flex items-center">
    克价
    {user?.role === 'BOSS' && renderColumnFilter('pricePerGram', '克价')}
  </div>
</th>
```

### 3.6 renderColumnFilter实现规范

```typescript
const renderColumnFilter = (column: string, title: string) => {
  const filter = state.columnFilters[column]
  if (!filter) return null

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => toggleColumnFilter(column, e)}
        className="ml-1 p-1 hover:bg-gray-100 rounded"
      >
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>
      
      {filter.visible && (
        <div className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[200px] p-3">
          {/* 关闭按钮 */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">{title}筛选</span>
            <button
              onClick={() => toggleColumnFilter(column)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          {/* 排序功能 */}
          {(filter.type === 'sort' || filter.type === 'sortAndRange') && (
            <div className="mb-3 pb-3 border-b border-gray-100">
              <div className="text-xs text-gray-500 mb-2">排序</div>
              <div className="flex space-x-1">
                <button 
                  onClick={() => handleSort(column, 'asc')}
                  className={`px-2 py-1 text-xs rounded ${
                    state.sortField === column && state.sortDirection === 'asc'
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  升序
                </button>
                <button 
                  onClick={() => handleSort(column, 'desc')}
                  className={`px-2 py-1 text-xs rounded ${
                    state.sortField === column && state.sortDirection === 'desc'
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  降序
                </button>
                <button 
                  onClick={() => handleSort('', '')}
                  className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                >
                  清除
                </button>
              </div>
            </div>
          )}
          
          {/* 搜索功能 */}
          {filter.type === 'search' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder={`搜索${title}...`}
                value={state.filters.search}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, search: e.target.value }
                }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
          
          {/* 品相选择功能 */}
          {filter.type === 'select' && column === 'quality' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">品相选择</div>
              <select
                value={state.filters.quality}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, quality: e.target.value }
                }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">全部品相</option>
                <option value="AA">AA级</option>
                <option value="A">A级</option>
                <option value="AB">AB级</option>
                <option value="B">B级</option>
                <option value="C">C级</option>
              </select>
            </div>
          )}
          
          {/* 供应商选择功能 */}
          {filter.type === 'select' && column === 'supplier' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">供应商选择</div>
              <select
                value={state.filters.supplier}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  filters: { ...prev.filters, supplier: e.target.value }
                }))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">全部供应商</option>
                {getUniqueSuppliers().map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* 产品类型多选功能 */}
          {filter.type === 'multiSelect' && column === 'product_type' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">产品类型</div>
                <button
                  onClick={() => {
                    const allTypes = ['珍珠', '翡翠', '和田玉', '南红', '蜜蜡', '其他'];
                    if (state.filters.product_types.length === 0) {
                      // 当前全选状态，点击变为全不选
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, product_types: allTypes }
                      }));
                    } else {
                      // 当前非全选状态，点击变为全选
                      setState(prev => ({
                        ...prev,
                        filters: { ...prev.filters, product_types: [] }
                      }));
                    }
                  }}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  {state.filters.product_types.length === 0 ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {['珍珠', '翡翠', '和田玉', '南红', '蜜蜡', '其他'].map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={state.filters.product_types.length === 0 || !state.filters.product_types.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // 选中：从排除列表中移除
                          setState(prev => ({
                            ...prev,
                            filters: {
                              ...prev.filters,
                              product_types: prev.filters.product_types.filter(t => t !== type)
                            }
                          }));
                        } else {
                          // 取消选中：添加到排除列表
                          setState(prev => ({
                            ...prev,
                            filters: {
                              ...prev.filters,
                              product_types: [...prev.filters.product_types, type]
                            }
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* 珠径范围筛选功能 */}
          {(filter.type === 'sortAndRange') && column === 'beadDiameter' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">珠径范围(mm)</div>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="最小值"
                  value={state.filters.diameterMin}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, diameterMin: e.target.value }
                  }))}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-400 self-center">-</span>
                <input
                  type="number"
                  placeholder="最大值"
                  value={state.filters.diameterMax}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, diameterMax: e.target.value }
                  }))}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}
          
          {/* 规格范围筛选功能 */}
          {(filter.type === 'sortAndRange') && column === 'specification' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">规格范围</div>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="最小规格"
                  value={state.filters.specificationMin}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, specificationMin: e.target.value }
                  }))}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-400 self-center">-</span>
                <input
                  type="number"
                  placeholder="最大规格"
                  value={state.filters.specificationMax}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, specificationMax: e.target.value }
                  }))}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}
          
          {/* 克价范围筛选功能 */}
          {(filter.type === 'sortAndRange') && column === 'pricePerGram' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">克价范围(元/克)</div>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="最小克价"
                  value={state.filters.price_per_gram_min}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, price_per_gram_min: e.target.value }
                  }))}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-400 self-center">-</span>
                <input
                  type="number"
                  placeholder="最大克价"
                  value={state.filters.price_per_gram_max}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, price_per_gram_max: e.target.value }
                  }))}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}
          
          {/* 日期范围筛选功能 */}
          {column === 'purchaseDate' && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2">日期范围</div>
              <div className="space-y-2">
                <input
                  type="date"
                  value={state.filters.startDate}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, startDate: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <input
                  type="date"
                  value={state.filters.endDate}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    filters: { ...prev.filters, endDate: e.target.value }
                  }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### 3.7 供应商动态选项获取

```typescript
// 获取唯一供应商列表的函数
const getUniqueSuppliers = (): string[] => {
  const suppliers = new Set<string>();
  
  state.purchases.forEach(purchase => {
    if (purchase.supplier && purchase.supplier.trim()) {
      suppliers.add(purchase.supplier.trim());
    }
  });
  
  return Array.from(suppliers).sort();
};
```

### 3.8 筛选状态完整管理

```typescript
// 筛选状态重置函数
const resetFilters = () => {
  setState(prev => ({
    ...prev,
    filters: {
      search: '',
      quality: '',
      supplier: '',
      product_types: [], // 空数组表示全选状态
      startDate: '',
      endDate: '',
      diameterMin: '',
      diameterMax: '',
      specificationMin: '',
      specificationMax: '',
      quantityMin: '',
      quantityMax: '',
      price_per_gram_min: '',
      price_per_gram_max: ''
    },
    sortField: '',
    sortDirection: ''
  }));
};

// 筛选参数构建函数
const buildFilterParams = () => {
  const params: any = {};
  
  // 基础筛选
  if (state.filters.search) params.search = state.filters.search;
  if (state.filters.quality) params.quality = state.filters.quality;
  if (state.filters.supplier) params.supplier = state.filters.supplier;
  
  // 产品类型筛选（排除逻辑）
  if (state.filters.product_types.length > 0) {
    params.product_types = state.filters.product_types;
  }
  
  // 日期范围
  if (state.filters.startDate) params.startDate = state.filters.startDate;
  if (state.filters.endDate) params.endDate = state.filters.endDate;
  
  // 数值范围筛选
  if (state.filters.diameterMin) params.diameterMin = state.filters.diameterMin;
  if (state.filters.diameterMax) params.diameterMax = state.filters.diameterMax;
  if (state.filters.specificationMin) params.specificationMin = state.filters.specificationMin;
  if (state.filters.specificationMax) params.specificationMax = state.filters.specificationMax;
  if (state.filters.quantityMin) params.quantityMin = state.filters.quantityMin;
  if (state.filters.quantityMax) params.quantityMax = state.filters.quantityMax;
  if (state.filters.price_per_gram_min) params.price_per_gram_min = state.filters.price_per_gram_min;
  if (state.filters.price_per_gram_max) params.price_per_gram_max = state.filters.price_per_gram_max;
  
  // 排序参数
  if (state.sortField && state.sortDirection) {
    params.sortBy = fieldMapping[state.sortField] || state.sortField;
    params.sortOrder = state.sortDirection;
  }
  
  return params;
};
```

### 3.9 UI交互细节规范

```typescript
// 筛选面板定位和层级
const filterPanelStyle = {
  position: 'fixed' as const,
  zIndex: 9999,
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  minWidth: '200px',
  maxWidth: '300px',
  padding: '12px'
};

// 点击外部关闭筛选面板
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.filter-panel') && !target.closest('.filter-trigger')) {
      // 关闭所有筛选面板
      setState(prev => ({
        ...prev,
        columnFilters: Object.keys(prev.columnFilters).reduce((acc, key) => {
          acc[key] = { ...prev.columnFilters[key], visible: false };
          return acc;
        }, {} as any)
      }));
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// 筛选面板切换函数
const toggleColumnFilter = (column: string, event?: React.MouseEvent) => {
  if (event) {
    event.stopPropagation();
  }
  
  setState(prev => {
    const newFilters = { ...prev.columnFilters };
    
    // 关闭其他筛选面板
    Object.keys(newFilters).forEach(key => {
      if (key !== column) {
        newFilters[key] = { ...newFilters[key], visible: false };
      }
    });
    
    // 切换当前筛选面板
    newFilters[column] = {
      ...newFilters[column],
      visible: !newFilters[column]?.visible
    };
    
    return {
      ...prev,
      columnFilters: newFilters
    };
  });
};
```

## 十、开发最佳实践

### 10.1 代码规范

- 使用TypeScript严格模式
- 组件名使用PascalCase
- 文件名使用PascalCase（组件）或camelCase（工具函数）
- 使用ESLint和Prettier保证代码质量
- 添加适当的注释和类型定义

### 10.2 性能优化

- 使用React.memo优化组件渲染
- 合理使用useCallback和useMemo
- 避免在render中创建新对象
- 图片懒加载和压缩
- 代码分割和动态导入

### 10.3 错误处理

- 统一的错误边界处理
- 友好的错误提示信息
- 网络请求错误重试机制
- 表单验证错误提示

### 10.4 测试规范

- 单元测试覆盖核心逻辑
- 集成测试覆盖用户流程
- E2E测试覆盖关键业务场景
- Mock外部依赖和API调用

## 十一、表格组件规范

### 11.1 表格基础结构

**组件命名：** `DataTable.tsx`

**核心功能：**
- 分页显示
- 排序功能
- 搜索筛选
- 响应式布局
- 表头筛选功能

**基础结构：**
```tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: PaginationConfig;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  headerFilters?: HeaderFilterConfig[];
}
```

### 4.2 表头筛选功能规范

**适用场景：** 采购列表、库存管理等需要多维度筛选的数据表格

**核心组件：** `HeaderFilter.tsx`

**筛选类型支持：**

| 筛选类型 | 组件 | 适用字段 | 实现规范 |
|---------|------|---------|----------|
| 多选框 | Checkbox Group | 产品类型 | 空数组表示全选状态，UI显示为全部选中 |
| 范围输入 | Number Range | 规格、珠径、克价、数量 | 支持最小值、最大值独立设置 |
| 下拉选择 | Select | 供应商、品相 | 支持搜索和清空功能 |
| 日期范围 | Date Range Picker | 采购日期 | 支持快捷选择（今天、本周、本月） |

**产品类型筛选特殊规范：**
```tsx
// 产品类型筛选状态管理
const [productTypes, setProductTypes] = useState<string[]>([]);

// UI显示逻辑：空数组时显示为全选状态
const isAllSelected = productTypes.length === 0;
const isIndeterminate = productTypes.length > 0 && productTypes.length < totalTypes;

// 全选/取消全选功能
const handleSelectAll = () => {
  if (isAllSelected) {
    // 当前是全选状态，点击后变为全不选
    setProductTypes(ALL_PRODUCT_TYPES);
  } else {
    // 当前不是全选状态，点击后变为全选
    setProductTypes([]);
  }
};
```

**规格筛选特殊规范：**
```tsx
// 规格筛选组件实现
interface SpecificationFilterProps {
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
}

// 注意：规格筛选会同时查询bead_diameter和specification字段
// 前端只需传递specificationMin和specificationMax参数
// 后端会自动处理字段映射逻辑
const handleSpecificationChange = (min?: number, max?: number) => {
  onFilterChange({
    ...filters,
    specificationMin: min,
    specificationMax: max
  });
};
```

## 五、库存管理组件规范（新增）

### 5.1 库存查询页面组件架构

**主组件：** `InventoryList.tsx`

**核心功能：**
- 多视图切换（层级式、分组、饰品配件、成品、仪表盘）
- 统一的筛选和搜索功能
- 响应式布局适配
- 数据实时更新

**组件结构：**
```tsx
interface InventoryListProps {
  defaultView?: 'hierarchical' | 'grouped' | 'accessories' | 'finished' | 'dashboard';
  showFilters?: boolean;
  enableExport?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({
  defaultView = 'hierarchical',
  showFilters = true,
  enableExport = true
}) => {
  const [activeView, setActiveView] = useState(defaultView);
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  return (
    <div className="inventory-container">
      <InventoryHeader 
        activeView={activeView}
        onViewChange={setActiveView}
        onSearch={setSearchTerm}
        onFilter={setFilters}
      />
      <InventoryContent 
        view={activeView}
        filters={filters}
        searchTerm={searchTerm}
      />
    </div>
  );
};
```

### 5.2 层级式库存视图组件

**组件：** `HierarchicalInventoryView.tsx`

**功能特点：**
- 树形结构展示库存数据
- 支持展开/折叠节点
- 按产品类型、品相、供应商分层
- 实时库存数量和价值统计

**数据结构：**
```tsx
interface HierarchicalNode {
  id: string;
  name: string;
  type: 'category' | 'group' | 'item';
  level: number;
  children?: HierarchicalNode[];
  data?: {
    quantity: number;
    totalValue: number;
    lowStock: boolean;
  };
  expanded?: boolean;
}

interface HierarchicalInventoryProps {
  data: HierarchicalNode[];
  onNodeClick?: (node: HierarchicalNode) => void;
  onNodeExpand?: (nodeId: string, expanded: boolean) => void;
  showLowStockOnly?: boolean;
}
```

**渲染逻辑：**
```tsx
const renderNode = (node: HierarchicalNode, depth: number = 0) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.expanded ?? false;
  
  return (
    <div key={node.id} className={`node-container level-${depth}`}>
      <div 
        className={`node-header ${node.type}`}
        onClick={() => handleNodeClick(node)}
      >
        {hasChildren && (
          <button 
            className="expand-button"
            onClick={(e) => {
              e.stopPropagation();
              handleNodeExpand(node.id, !isExpanded);
            }}
          >
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </button>
        )}
        <span className="node-name">{node.name}</span>
        {node.data && (
          <div className="node-stats">
            <span className="quantity">{node.data.quantity}</span>
            <span className="value">¥{node.data.totalValue}</span>
            {node.data.lowStock && (
              <AlertTriangle className="low-stock-icon" />
            )}
          </div>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="node-children">
          {node.children!.map(child => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );
};
```

### 5.3 分组库存列表组件

**组件：** `GroupedInventoryView.tsx`

**功能特点：**
- 按指定字段分组显示
- 支持多种分组方式（产品类型、品相、供应商）
- 组内数据排序和筛选
- 分组统计信息

**分组配置：**
```tsx
interface GroupConfig {
  field: 'product_type' | 'quality' | 'supplier_name';
  label: string;
  sortBy?: 'name' | 'quantity' | 'value';
  sortOrder?: 'asc' | 'desc';
}

const GROUP_CONFIGS: GroupConfig[] = [
  { field: 'product_type', label: '按产品类型', sortBy: 'quantity', sortOrder: 'desc' },
  { field: 'quality', label: '按品相等级', sortBy: 'value', sortOrder: 'desc' },
  { field: 'supplier_name', label: '按供应商', sortBy: 'name', sortOrder: 'asc' }
];
```

### 5.4 饰品配件专用视图组件

**组件：** `AccessoriesProductGrid.tsx`

**功能特点：**
- 网格布局展示配件
- 支持按材质、规格筛选
- 图片预览和详情查看
- 库存预警提示

**组件结构：**
```tsx
interface AccessoryItem {
  id: string;
  name: string;
  category: string;
  material: string;
  specification: string;
  quantity: number;
  unitPrice: number;
  photos: string[];
  supplierName: string;
  lowStock: boolean;
}

const AccessoriesProductGrid: React.FC<{
  accessories: AccessoryItem[];
  onItemClick?: (item: AccessoryItem) => void;
  gridCols?: number;
}> = ({ accessories, onItemClick, gridCols = 4 }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridCols} gap-4`}>
      {accessories.map(item => (
        <AccessoryCard 
          key={item.id}
          item={item}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  );
};
```

### 5.5 半成品矩阵视图组件

**组件：** `SemiFinishedMatrixView.tsx`

**功能特点：**
- 矩阵式布局展示半成品库存（散珠、手串）
- 支持按尺寸或品相两种视图模式
- 产品筛选和搜索功能
- 库存状态颜色编码
- 移动端适配优化

**半成品矩阵数据结构：**
```tsx
interface SemiFinishedMatrixData {
  product_type: string;
  total_quantity: number;
  total_variants: number;
  has_low_stock: boolean;
  specifications: SpecificationData[];
}

interface MatrixCell {
  productType: string;
  productName: string;
  size: number;
  quality?: string;
  totalQuantity: number;
  avgPrice: number;
  priceUnit: string;
  qualityDistribution: { [key: string]: number };
  qualityPrices: { [key: string]: number };
  isLowStock: boolean;
  batches: BatchData[];
}

type MatrixViewMode = 'size' | 'quality';
```

**矩阵视图模式：**
- **按尺寸视图**：横轴为尺寸规格，纵轴为产品名称
- **按品相视图**：横轴为品相等级，纵轴为产品名称

**库存状态颜色编码：**
```tsx
const getStockStatusColor = (quantity: number, isLowStock: boolean) => {
  if (isLowStock || quantity <= 50) {
    return 'bg-red-100 border-red-200 text-red-800'; // 低库存
  } else if (quantity <= 200) {
    return 'bg-yellow-100 border-yellow-200 text-yellow-800'; // 中等库存
  } else {
    return 'bg-green-100 border-green-200 text-green-800'; // 充足库存
  }
};
```

### 5.6 成品卡片视图组件

**组件：** `FinishedProductGrid.tsx`

**功能特点：**
- 卡片式布局展示成品
- 显示成本、售价、利润率
- 材料组成信息
- 状态标识（可售、已售、预留）

**成品数据结构：**
```tsx
interface FinishedProduct {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'sold' | 'reserved';
  cost: number;
  sellingPrice: number;
  profitMargin: number;
  materials: MaterialUsage[];
  photos: string[];
  createdAt: string;
}

interface MaterialUsage {
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unitCost: number;
}
```

### 5.7 库存仪表盘组件规范

#### 5.7.1 InventoryDashboard 主组件

**组件：** `InventoryDashboard.tsx`

**功能特点：**
- 库存数据统计展示
- 多种图表可视化
- 权限控制数据过滤
- 实时数据刷新
- 响应式布局设计

**组件状态管理：**
```tsx
interface InventoryStatistics {
  total_stats?: {
    total_items: number;
    total_quantity: number;
    total_low_stock: number;
    total_value?: number;  // 仅BOSS可见
  };
  totalStats?: {
    totalItems: number;
    totalQuantity: number;
    totalLowStock?: number;
    totalValue?: number;   // 仅BOSS可见
  };
  type_statistics?: {
    product_type: string;
    total_items: number;
    total_quantity: number;
    low_stock_count: number;
    total_value?: number;  // 仅BOSS可见
  }[];
  low_stock_products?: {
    product_name: string;
    product_type: string;
    remaining_quantity: number;
    min_stock_threshold: number;
    supplier_name: string;
  }[];
  quality_distribution?: {
    quality: string;
    total_quantity: number;
    percentage: number;
  }[];
  supplier_distribution?: {  // 仅BOSS可见
    supplier_name: string;
    total_quantity: number;
    total_value: number;
    percentage: number;
  }[];
}

const InventoryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<InventoryStatistics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getStatistics();
      
      if (response.success) {
        setStatistics(response.data);
      } else {
        toast.error('获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      toast.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 手动刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatistics();
    setRefreshing(false);
    toast.success('数据已刷新');
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-crystal-500" />
          <h1 className="text-2xl font-bold text-gray-900">库存仪表盘</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? '刷新中...' : '刷新数据'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <StatisticsCards statistics={statistics} userRole={user?.role} />
          
          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductPriceDistributionChart />
            <ProductDistributionPieChart />
          </div>
          
          {/* 消耗分析图表 */}
          <InventoryConsumptionChart />
        </>
      )}
    </div>
  );
};
```

#### 5.7.2 StatisticsCards 统计卡片组件

**组件：** `StatisticsCards.tsx`

**功能特点：**
- 关键指标卡片展示
- 权限控制敏感数据
- 图标和颜色主题
- 响应式网格布局

**组件实现：**
```tsx
interface StatisticsCardsProps {
  statistics: InventoryStatistics | null;
  userRole?: string;
}

interface StatCard {
  title: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  permission: 'all' | 'boss';
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ statistics, userRole }) => {
  if (!statistics) return null;

  const totalStats = statistics.total_stats || statistics.totalStats;
  if (!totalStats) return null;

  const cards: StatCard[] = [
    {
      title: '库存总条目',
      value: totalStats.total_items || totalStats.totalItems || 0,
      unit: '条',
      icon: <Package className="h-6 w-6" />,
      color: 'blue',
      permission: 'all'
    },
    {
      title: '库存总数量',
      value: totalStats.total_quantity || totalStats.totalQuantity || 0,
      unit: '颗/条/片/件',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'green',
      permission: 'all'
    },
    {
      title: '低库存预警',
      value: totalStats.total_low_stock || totalStats.totalLowStock || 0,
      unit: '条',
      icon: <AlertTriangle className="h-6 w-6" />,
      color: 'red',
      permission: 'all'
    },
    {
      title: '库存总价值',
      value: totalStats.total_value || totalStats.totalValue || 0,
      unit: '元',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'purple',
      permission: 'boss'
    }
  ];

  // 根据权限过滤卡片
  const visibleCards = cards.filter(card => {
    if (card.permission === 'boss') {
      return userRole === 'BOSS';
    }
    return true;
  });

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {visibleCards.map((card, index) => (
        <div
          key={index}
          className={`p-6 rounded-lg border-2 ${getColorClasses(card.color)} transition-all duration-200 hover:shadow-md`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-75">{card.title}</p>
              <p className="text-2xl font-bold mt-1">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                <span className="text-sm font-normal ml-1">{card.unit}</span>
              </p>
            </div>
            <div className="opacity-75">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### 5.7.3 ProductPriceDistributionChart 价格分布图表组件

**组件：** `ProductPriceDistributionChart.tsx`

**功能特点：**
- 价格区间分布饼图
- 单价/总价切换
- 权限控制数据显示
- 自定义Tooltip
- 响应式图表

**价格区间定义：**
```tsx
const PRICE_RANGES = [
  { name: '0-50元', min: 0, max: 50, color: '#8B5CF6' },
  { name: '50-100元', min: 50, max: 100, color: '#10B981' },
  { name: '100-200元', min: 100, max: 200, color: '#F59E0B' },
  { name: '200-500元', min: 200, max: 500, color: '#EF4444' },
  { name: '500元以上', min: 500, max: Infinity, color: '#6366F1' }
];
```

**自定义Tooltip组件：**
```tsx
const CustomTooltip = ({ active, payload, priceType, userRole }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    if (priceType === 'unit') {
      // 单价区间分布
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">产品类型: {data.product_type}</p>
          <p className="text-sm text-blue-600">数量: {data.value}</p>
          <p className="text-sm text-green-600">占比: {data.percentage}%</p>
        </div>
      );
    } else {
      // 总价分布（仅BOSS可见详细信息）
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.product_name}</p>
          <p className="text-sm text-gray-600">类型: {data.product_type}</p>
          <p className="text-sm text-gray-600">品相: {data.quality}</p>
          {userRole === 'BOSS' && (
            <>
              <p className="text-sm text-blue-600">总价: ¥{data.total_price}</p>
              <p className="text-sm text-gray-600">供应商: {data.supplier_name}</p>
            </>
          )}
          <p className="text-sm text-green-600">占比: {data.percentage}%</p>
        </div>
      );
    }
  }
  return null;
};
```

#### 5.7.4 权限控制与数据过滤规范

**权限控制Hook：**
```tsx
const usePermissionFilter = () => {
  const { user } = useAuth();
  
  const filterSensitiveData = <T extends Record<string, any>>(data: T): T => {
    if (user?.role === 'BOSS') {
      return data; // BOSS可查看所有数据
    }
    
    // EMPLOYEE角色过滤敏感字段
    const filtered = { ...data };
    
    // 过滤价值相关字段
    if ('total_value' in filtered) {
      delete filtered.total_value;
    }
    if ('totalValue' in filtered) {
      delete filtered.totalValue;
    }
    
    // 过滤供应商分布
    if ('supplier_distribution' in filtered) {
      delete filtered.supplier_distribution;
    }
    
    // 过滤总价分布
    if ('total_distribution' in filtered) {
      delete filtered.total_distribution;
    }
    
    return filtered;
  };
  
  return { filterSensitiveData, isBoss: user?.role === 'BOSS' };
};
```

**敏感内容包装组件：**
```tsx
const SensitiveContent: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'BOSS' | 'EMPLOYEE';
  fallback?: React.ReactNode;
}> = ({ children, requiredRole = 'BOSS', fallback = null }) => {
  const { user } = useAuth();
  
  if (requiredRole === 'BOSS' && user?.role !== 'BOSS') {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};
```

### 5.8 库存组件状态管理规范

**全局状态结构：**
```tsx
interface InventoryState {
  activeView: InventoryView;
  data: {
    hierarchical: HierarchicalNode[];
    grouped: GroupedData[];
    accessories: AccessoryItem[];
    finished: FinishedProduct[];
    statistics: DashboardData;
  };
  filters: InventoryFilters;
  loading: {
    hierarchical: boolean;
    grouped: boolean;
    accessories: boolean;
    finished: boolean;
    statistics: boolean;
  };
  error: string | null;
}

interface InventoryFilters {
  productTypes: string[];
  quality: string[];
  supplierName: string;
  priceRange: [number, number];
  stockStatus: 'all' | 'low' | 'out';
  dateRange: [Date, Date];
}
```

**API调用规范：**
```tsx
const useInventoryData = (view: InventoryView, filters: InventoryFilters) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      switch (view) {
        case 'hierarchical':
          response = await inventoryApi.getHierarchical(filters);
          break;
        case 'grouped':
          response = await inventoryApi.getGrouped(filters);
          break;
        case 'accessories':
          response = await inventoryApi.getAccessories(filters);
          break;
        case 'finished':
          response = await inventoryApi.getFinished(filters);
          break;
        case 'statistics':
          response = await inventoryApi.getStatistics(filters);
          break;
      }
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [view, filters]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
};
```

## 六、成品制作组件规范

### 6.1 ProductEntry 成品制作页面组件

#### 6.1.1 组件结构设计

**文件路径：** `src/pages/ProductEntry.tsx`

**组件职责：**
- 成品制作流程管理
- 原材料选择和库存验证
- 成本计算和价格设定
- 成品信息录入和提交

**核心状态管理：**
```typescript
interface ProductEntryState {
  currentStep: 'mode' | 'materials' | 'details' | 'batch_details';  // 当前步骤
  mode: 'direct' | 'combination';                                   // 制作模式
  
  // 组合制作模式的表单数据
  formData: {
    product_name: string;                         // 成品名称
    description: string;                          // 成品描述
    specification: string;                        // 规格
    selected_materials: MaterialUsage[];          // 选中的原材料
    labor_cost: number;                          // 人工成本
    craft_cost: number;                          // 工艺成本
    selling_price: number;                       // 销售价格
    photos: string[];                            // 成品图片
  };
  
  // 直接转化模式的批量表单数据
  batchFormData: {
    selected_materials: AvailableMaterial[];      // 选中的原材料成品
    products: BatchProductInfo[];                 // 每个成品的详细信息
  };
  
  loading: boolean;                              // 提交状态
  availableMaterials: Material[];                // 可用原材料
}

// 批量创建的单个成品信息
interface BatchProductInfo {
  material_id: string;                           // 对应的原材料ID
  product_name: string;                         // 成品名称
  description: string;                          // 成品描述
  specification: string;                        // 规格
  labor_cost: number;                          // 人工成本
  craft_cost: number;                          // 工艺成本
  selling_price: number;                       // 销售价格
  photos: string[];                            // 成品图片
  material_cost: number;                       // 原材料成本（自动计算）
  total_cost: number;                          // 总成本（自动计算）
  profit_margin: number;                       // 利润率（自动计算）
}
```

#### 6.1.2 制作模式选择

**直接转化模式（批量创建）：**
- 可多选原材料成品（FINISHED类型）
- 每个原材料成品对应一个独立的销售成品
- 批量信息填写界面，每个成品可单独编辑
- 统一提交创建多个销售成品
- 适用于将多个原材料成品快速转化为销售成品

**组合制作模式：**
- 选择多种原材料
- 组合制作复杂成品
- 支持散珠、手串、配件等混合使用
- 多对一的组合关系

**模式选择UI：**
```tsx
const ModeSelection = ({ onModeSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 直接转化模式 */}
      <div 
        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer transition-colors"
        onClick={() => onModeSelect('direct')}
      >
        <div className="text-center">
          <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">直接转化模式</h3>
          <p className="text-gray-600 text-sm">
            选择库存中的一个原材料成品，直接转化为销售成品
          </p>
        </div>
      </div>
      
      {/* 组合制作模式 */}
      <div 
        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer transition-colors"
        onClick={() => onModeSelect('combination')}
      >
        <div className="text-center">
          <Layers className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">组合制作模式</h3>
          <p className="text-gray-600 text-sm">
            选择多种原材料，组合制作复杂成品
          </p>
        </div>
      </div>
    </div>
  );
};
```

#### 6.1.3 原材料选择组件

**功能特点：**
- 显示可用原材料列表
- 实时库存验证
- 使用量输入和验证
- 成本预览计算

**组件实现：**
```tsx
const MaterialSelector = ({ materials, selectedMaterials, onMaterialChange }) => {
  const handleQuantityChange = (materialId: string, quantity: number, type: 'beads' | 'pieces') => {
    const material = materials.find(m => m.purchase_id === materialId);
    if (!material) return;
    
    // 库存验证
    const maxQuantity = type === 'beads' ? material.remaining_beads : material.remaining_pieces;
    if (quantity > maxQuantity) {
      toast.error(`库存不足，最大可用：${maxQuantity}${type === 'beads' ? '颗' : '片'}`);
      return;
    }
    
    onMaterialChange(materialId, quantity, type);
  };
  
  return (
    <div className="space-y-4">
      {materials.map(material => (
        <div key={material.purchase_id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <img 
                src={material.photos?.[0]} 
                alt={material.product_name}
                className="w-12 h-12 object-cover rounded"
              />
              <div>
                <h4 className="font-medium text-gray-900">{material.product_name}</h4>
                <p className="text-sm text-gray-500">{material.product_type}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">剩余库存</div>
              <div className="font-medium">
                {material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' 
                  ? `${material.remaining_beads}颗` 
                  : `${material.remaining_pieces}片`
                }
              </div>
            </div>
          </div>
          
          {/* 使用量输入 */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">使用量：</label>
            <input
              type="number"
              min="0"
              max={material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' 
                ? material.remaining_beads 
                : material.remaining_pieces
              }
              className="w-24 px-3 py-2 border border-gray-300 rounded-md"
              onChange={(e) => handleQuantityChange(
                material.purchase_id, 
                parseInt(e.target.value) || 0,
                material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? 'beads' : 'pieces'
              )}
            />
            <span className="text-sm text-gray-500">
              {material.product_type === 'LOOSE_BEADS' || material.product_type === 'BRACELET' ? '颗' : '片'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### 6.1.4 批量信息填写组件（直接转化模式）

**功能特点：**
- 显示所有选中的原材料成品
- 每个成品独立的信息编辑区域
- 实时成本计算和利润率显示
- 支持单个成品的信息复制
- 统一提交所有成品

**组件实现：**
```tsx
const BatchProductEditor = ({ selectedMaterials, batchFormData, onProductChange, onSubmit }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (materialId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedItems(newExpanded);
  };
  
  const calculateCosts = (product: BatchProductInfo) => {
    const materialCost = product.material_cost || 0;
    const totalCost = materialCost + product.labor_cost + product.craft_cost;
    const profitMargin = product.selling_price > 0 
      ? ((product.selling_price - totalCost) / product.selling_price) * 100 
      : 0;
    
    return { totalCost, profitMargin };
  };
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">批量成品信息填写</h2>
        <p className="text-gray-600">为每个选中的原材料成品填写销售成品信息</p>
      </div>
      
      <div className="space-y-4">
        {batchFormData.products.map((product, index) => {
          const material = selectedMaterials.find(m => m.purchase_id === product.material_id);
          const { totalCost, profitMargin } = calculateCosts(product);
          const isExpanded = expandedItems.has(product.material_id);
          
          return (
            <div key={product.material_id} className="border border-gray-200 rounded-lg">
              {/* 原材料信息头部 */}
              <div 
                className="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpanded(product.material_id)}
              >
                <div className="flex items-center space-x-3">
                  <img 
                    src={material?.photos?.[0]} 
                    alt={material?.product_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{material?.product_name}</h4>
                    <p className="text-sm text-gray-500">
                      原材料成本: ¥{product.material_cost?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">销售价格</div>
                    <div className="font-medium text-lg">
                      ¥{product.selling_price?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">利润率</div>
                    <div className={`font-medium ${
                      profitMargin >= 30 ? 'text-green-600' : 
                      profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {profitMargin.toFixed(1)}%
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`} />
                </div>
              </div>
              
              {/* 详细编辑区域 */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 基本信息 */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          成品名称 *
                        </label>
                        <input
                          type="text"
                          value={product.product_name}
                          onChange={(e) => onProductChange(index, 'product_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          placeholder="请输入成品名称"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          成品描述
                        </label>
                        <textarea
                          value={product.description}
                          onChange={(e) => onProductChange(index, 'description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          placeholder="请输入成品描述"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          规格说明
                        </label>
                        <input
                          type="text"
                          value={product.specification}
                          onChange={(e) => onProductChange(index, 'specification', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          placeholder="如：平均直径18mm"
                        />
                      </div>
                    </div>
                    
                    {/* 成本和价格 */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            人工成本
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={product.labor_cost}
                            onChange={(e) => onProductChange(index, 'labor_cost', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            工艺成本
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={product.craft_cost}
                            onChange={(e) => onProductChange(index, 'craft_cost', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          销售价格 *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.selling_price}
                          onChange={(e) => onProductChange(index, 'selling_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-crystal-500"
                        />
                      </div>
                      
                      {/* 成本汇总 */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">成本汇总</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">原材料成本：</span>
                            <span>¥{product.material_cost?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">人工成本：</span>
                            <span>¥{product.labor_cost?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">工艺成本：</span>
                            <span>¥{product.craft_cost?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t border-gray-200 pt-1">
                            <span>总成本：</span>
                            <span>¥{totalCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>预期利润：</span>
                            <span className={profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ¥{(product.selling_price - totalCost).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 提交按钮 */}
      <div className="flex justify-between">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          返回修改
        </button>
        
        <button
          onClick={onSubmit}
          className="px-6 py-3 bg-crystal-600 text-white rounded-lg hover:bg-crystal-700"
        >
          批量创建成品 ({batchFormData.products.length}个)
        </button>
      </div>
    </div>
  );
};
```

#### 6.1.5 成本计算组件（组合制作模式）

**成本计算逻辑：**
```tsx
const CostCalculator = ({ selectedMaterials, laborCost, craftCost, onCostChange }) => {
  const materialCost = useMemo(() => {
    return selectedMaterials.reduce((total, material) => {
      const unitCost = material.unit_cost || 0;
      const quantity = material.quantity_used_beads || material.quantity_used_pieces || 0;
      return total + (unitCost * quantity);
    }, 0);
  }, [selectedMaterials]);
  
  const totalCost = materialCost + laborCost + craftCost;
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-medium text-gray-900 mb-3">成本计算</h4>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">原材料成本：</span>
          <span className="font-medium">¥{materialCost.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">人工成本：</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={laborCost}
            onChange={(e) => onCostChange('labor', parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
          />
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">工艺成本：</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={craftCost}
            onChange={(e) => onCostChange('craft', parseFloat(e.target.value) || 0)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
          />
        </div>
        
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-medium">
            <span>总成本：</span>
            <span className="text-red-600">¥{totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 6.2 FinishedProductGrid 成品展示组件

#### 6.2.1 组件功能特点

**文件路径：** `src/components/FinishedProductGrid.tsx`

**核心功能：**
- 成品列表网格展示
- 搜索和筛选功能
- 成品详情查看
- 权限控制显示
- 分页加载

**组件Props：**
```typescript
interface FinishedProductGridProps {
  searchTerm?: string;           // 搜索关键词
  selectedQuality?: string;      // 品相筛选
  lowStockOnly?: boolean;        // 仅显示低库存
  specificationMin?: string;     // 最小规格
  specificationMax?: string;     // 最大规格
}
```

#### 6.2.2 成品卡片设计

**卡片布局：**
```tsx
const ProductCard = ({ product, onViewDetails }) => {
  const { user } = useAuth();
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
      {/* 产品图片 */}
      <div className="relative h-48 bg-gray-100">
        {product.photos && product.photos.length > 0 ? (
          <img
            src={product.photos[0]}
            alt={product.product_name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* 品相标签 */}
        {product.quality && (
          <div className="absolute top-2 right-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              getQualityColor(product.quality)
            }`}>
              {formatQuality(product.quality)}
            </span>
          </div>
        )}
        
        {/* 悬浮操作按钮 */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <button
            onClick={() => onViewDetails(product)}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-50 flex items-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span className="text-sm">查看详情</span>
          </button>
        </div>
      </div>
      
      {/* 产品信息 */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {product.product_name}
        </h3>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="flex items-center space-x-1">
            <Ruler className="h-4 w-4" />
            <span>{product.specification}mm</span>
          </div>
          <div className="flex items-center space-x-1">
            <Package className="h-4 w-4" />
            <span>{product.piece_count}颗</span>
          </div>
        </div>
        
        {/* 价格信息（权限控制） */}
        {user?.role === 'BOSS' && product.price_per_unit && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">单价</span>
            <span className="font-medium text-green-600">
              ¥{product.price_per_unit.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
```

#### 6.2.3 成品详情模态框

**详情展示：**
```tsx
const ProductDetailModal = ({ product, isOpen, onClose }) => {
  const { user } = useAuth();
  
  if (!isOpen || !product) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 模态框头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {product.product_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* 模态框内容 */}
        <div className="p-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-500">规格</div>
              <div className="font-medium">{product.specification}mm</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">颗数</div>
              <div className="font-medium">{product.piece_count}颗</div>
            </div>
            {user?.role === 'BOSS' && (
              <>
                <div>
                  <div className="text-sm text-gray-500">单价</div>
                  <div className="font-medium text-green-600">
                    ¥{product.price_per_unit?.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">供应商</div>
                  <div className="font-medium">{product.supplier_name || '未知'}</div>
                </div>
              </>
            )}
          </div>
          
          {/* 产品图片 */}
          {product.photos && product.photos.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">产品图片</div>
              <div className="grid grid-cols-2 gap-2">
                {product.photos.slice(0, 4).map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`${product.product_name} ${index + 1}`}
                    className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### 6.2.4 权限控制实现

**敏感信息过滤：**
```tsx
const usePermissionFilter = () => {
  const { user } = useAuth();
  
  const filterProductData = (products: FinishedProduct[]) => {
    if (user?.role === 'BOSS') {
      return products; // BOSS可查看所有信息
    }
    
    // EMPLOYEE角色过滤敏感字段
    return products.map(product => ({
      ...product,
      price_per_unit: undefined,
      total_price: undefined,
      supplier_name: undefined,
      unit_cost: undefined
    }));
  };
  
  return { filterProductData, isBoss: user?.role === 'BOSS' };
};
```

## 七、鸿蒙适配规则（提取自《React组件规范文档》10章）

| React组件          | 鸿蒙ArkUI组件             | 事件参数映射                                              | 适配要点                      | 来源文档              |
| ---------------- | --------------------- | --------------------------------------------------- | ------------------------- | ----------------- |
| MaterialSelector | MaterialSelectorArkUI | onMaterialSelect: (material, beads: number) => void | beads必须为整数，避免小数           | 《React组件规范文档》10.1 |
| Button           | Button                | onClick: () => void                                 | 按压反馈用HapticFeedback       | 《React组件规范文档》10.2 |
| ImageUpload      | @ohos.request         | onSuccess: (urls: string\[]) => void                | 格式限制与Web端一致（jpg/png/webp） | 《React组件规范文档》10.2 |
| ProductEntry     | ProductEntryArkUI     | onSubmit: (productData) => void                    | 成品制作流程适配，支持步骤导航         | 《React组件规范文档》10.3 |
| FinishedProductGrid | FinishedProductGridArkUI | onProductSelect: (product) => void              | 网格布局适配，支持触摸手势           | 《React组件规范文档》10.3 |

## 八、采购删除功能规范

### 8.1 PurchaseDetailModal组件删除功能

#### 8.1.1 删除确认对话框设计

**UI组件结构：**

```typescript
// 删除确认对话框状态管理
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

// 删除确认对话框UI
{showDeleteConfirm && (
  <div className="fixed inset-0 z-60 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
        onClick={() => setShowDeleteConfirm(false)}
      />
      
      {/* 确认对话框 */}
      <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-medium text-gray-900">
            确认删除采购记录
          </h3>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-3">
            您确定要删除这条采购记录吗？
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-medium">
              产品：{purchase?.product_name}
            </p>
            <p className="text-sm text-red-600">
              采购编号：{purchase?.purchase_code}
            </p>
          </div>
          <p className="text-sm text-red-600 mt-2 font-medium">
            ⚠️ 此操作不可恢复，请谨慎操作！
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>删除中...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>确认删除</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

#### 8.1.2 删除处理函数实现

**错误处理优化原则：**

* 避免重复显示错误提示
* errorHandler已经自动处理API错误
* 只处理非HTTP响应错误

```typescript
// 删除采购记录处理函数
const handleDelete = async () => {
  if (!purchase || !canEdit) return
  
  try {
    setLoading(true)
    
    const response = await purchaseApi.delete(purchase.id)
    
    if (response.success) {
      toast.success(response.message || '采购记录删除成功')
      setShowDeleteConfirm(false)
      onClose()
      // 通知父组件刷新列表
      if (onDelete) {
        onDelete()
      }
    } else {
      // 处理业务逻辑错误，如成品使用了珠子的情况
      if ((response.data as any)?.used_by_products && (response.data as any).used_by_products.length > 0) {
        const productNames = (response.data as any).used_by_products.map((p: any) => p.product_name).join('、')
        toast.error(
          `无法删除该采购记录，因为以下成品正在使用其珠子：${productNames}。请先将这些成品拆散，使珠子回退到库存后再删除。`,
          {
            duration: 8000, // 延长显示时间
            style: {
              maxWidth: '500px'
            }
          }
        )
      } else {
        toast.error(response.message || '删除失败')
      }
    }
  } catch (error: any) {
    console.error('删除采购记录失败:', error)
    
    // 注意：errorHandler已经自动处理了API错误并显示了toast提示
    // 这里只处理非API错误的情况，避免重复显示错误提示
    if (!error.response) {
      // 只有在非HTTP响应错误时才显示额外的错误提示（如网络连接问题）
      toast.error('网络连接失败，请检查网络后重试')
    }
    // 如果是HTTP响应错误，errorHandler已经处理了，不需要再次显示toast
  } finally {
    setLoading(false)
    setShowDeleteConfirm(false)
  }
}
```

#### 8.1.3 权限控制实现

**权限验证规则：**

```typescript
// 权限检查
const { user } = useAuth()
const canEdit = user?.role === 'BOSS'

// 删除按钮显示控制
{canEdit && (
  <button
    onClick={() => setShowDeleteConfirm(true)}
    disabled={loading}
    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center space-x-1"
    title="删除采购记录"
  >
    <Trash2 className="h-3 w-3" />
    <span>删除</span>
  </button>
)}
```

#### 8.1.4 错误提示用户体验优化

**业务约束错误提示设计：**

* 错误信息要清晰明确
* 提供具体的解决方案
* 延长显示时间确保用户能完整阅读
* 使用合适的样式突出重要信息

**网络错误处理：**

* 区分网络连接错误和API业务错误
* 避免重复显示相同的错误信息
* 提供重试机制和用户指导

### 8.2 错误处理最佳实践

#### 8.2.1 避免重复错误提示

**问题描述：**
当API调用失败时，如果errorHandler已经自动处理了错误并显示了toast提示，组件的catch块中不应该再次显示相同的错误信息。

**解决方案：**
```typescript
try {
  // API调用
  const response = await api.someMethod()
  // 处理成功响应
} catch (error: any) {
  console.error('操作失败:', error)
  
  // 只处理非HTTP响应错误，避免重复提示
  if (!error.response) {
    // 网络连接错误等非API错误
    toast.error('网络连接失败，请检查网络后重试')
  }
  // HTTP响应错误已由errorHandler处理，无需重复显示
}
```

#### 8.2.2 业务约束错误的友好提示

**设计原则：**
* 错误信息要具体明确
* 提供解决问题的指导
* 使用合适的视觉样式
* 考虑用户的阅读时间

**实现示例：**
```typescript
// 业务约束错误的特殊处理
if (response.data?.usedByProducts) {
  const productNames = response.data.usedByProducts
    .map(p => p.productName)
    .join('、')
  
  toast.error(
    `无法删除该采购记录，因为以下成品正在使用其珠子：${productNames}。请先将这些成品拆散，使珠子回退到库存后再删除。`,
    {
      duration: 8000, // 延长显示时间
      style: {
        maxWidth: '500px', // 增加宽度以显示完整信息
        fontSize: '14px'
      }
    }
  )
}
```

## 九、库存状态组件实现规范

### 9.1 库存状态颜色函数

**getStockStatusColor 函数实现：**
```typescript
// 获取库存状态颜色
const getStockStatusColor = (quantity: number, isLowStock: boolean) => {
  if (isLowStock || quantity <= 50) {
    return 'bg-red-100 border-red-200 text-red-800'
  } else if (quantity <= 200) {
    return 'bg-yellow-100 border-yellow-200 text-yellow-800'
  } else {
    return 'bg-green-100 border-green-200 text-green-800'
  }
}
```

**库存状态分级规则：**
- **库存充足（> 200）：** 绿色背景，正常显示
- **中等库存（51-200）：** 黄色背景，正常显示
- **低库存/库存不足（1-50）：** 红色背景，灰度滤镜 + 警告图标
- **库存已用完（0）：** 显示灰色"-"符号

### 9.2 库存为0的显示处理

**矩阵视图中的空单元格：**
```jsx
{!cell ? (
  <td key={size} className="px-3 py-4 text-center">
    <div className="text-gray-400 text-xs">-</div>
  </td>
) : (
  // 正常库存单元格渲染
  <td key={size} className="px-3 py-4 text-center">
    <div className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
      getStockStatusColor(cell.totalQuantity, cell.isLowStock)
    }`}>
      <div className="font-bold text-lg">
        {cell.totalQuantity}
      </div>
    </div>
  </td>
)}
```

**层级视图中的过滤逻辑：**
- 库存为0的项目不在列表中显示
- 通过数据过滤实现，而非UI隐藏
- 确保用户只看到有库存的项目

### 9.3 低库存交互效果实现

**灰度滤镜效果：**
```jsx
<div 
  className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
    getStockStatusColor(cell.totalQuantity, cell.isLowStock)
  }`}
  style={{
    filter: cell.isLowStock || cell.totalQuantity <= 50 ? 'grayscale(1)' : 'none',
    transition: 'filter 0.3s ease'
  }}
  onMouseEnter={(e) => {
    if (cell.isLowStock || cell.totalQuantity <= 50) {
      e.currentTarget.style.filter = 'grayscale(0)'
    }
  }}
  onMouseLeave={(e) => {
    if (cell.isLowStock || cell.totalQuantity <= 50) {
      e.currentTarget.style.filter = 'grayscale(1)'
    }
  }}
  onClick={() => handleCellClick(cell)}
>
  {/* 库存数量 */}
  <div className="font-bold text-lg">
    {cell.totalQuantity}
  </div>
  
  {/* 低库存警告图标 */}
  {cell.isLowStock && (
    <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />
  )}
</div>
```

**交互效果说明：**
- **默认状态：** 低库存项目应用灰度滤镜 `filter: grayscale(1)`
- **鼠标悬停：** 移除灰度滤镜 `filter: grayscale(0)`，恢复正常颜色
- **过渡动画：** 使用 `transition: filter 0.3s ease` 实现平滑过渡
- **警告图标：** 使用 `AlertTriangle` 图标，红色显示

### 9.4 库存状态标识组件

**低库存警告标识：**
```jsx
{/* 低库存标识 - 用于成品卡片 */}
{product.is_low_stock && (
  <div className="absolute top-2 left-2">
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      库存不足
    </span>
  </div>
)}

{/* 低库存警告图标 - 用于矩阵视图 */}
{cell.isLowStock && (
  <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />
)}

{/* 低库存文字提示 - 用于层级视图 */}
{product_type_data.has_low_stock && (
  <p className={`text-red-600 font-medium ${
    isMobile ? 'text-mobile-caption' : 'text-xs'
  }`}>低库存</p>
)}
```

### 9.5 品相颜色标识函数

**getQualityColor 函数实现：**
```typescript
// 获取品相颜色
const getQualityColor = (quality: string) => {
  const colorMap: Record<string, string> = {
    'AA': 'bg-red-500',
    'A': 'bg-orange-500',
    'AB': 'bg-yellow-500',
    'B': 'bg-blue-500',
    'C': 'bg-gray-500',
    '未知': 'bg-gray-400'
  }
  return colorMap[quality] || 'bg-gray-400'
}
```

**品相颜色圆点显示：**
```jsx
{/* 品相分布显示 */}
{Object.entries(cell.qualityDistribution)
  .filter(([, quantity]) => quantity > 0)
  .sort(([a], [b]) => {
    // 按品相等级排序：AA > A > AB > B > C > 未知
    const order = ['AA', 'A', 'AB', 'B', 'C', '未知'];
    return order.indexOf(a) - order.indexOf(b);
  })
  .map(([quality, quantity]) => (
    <div key={quality} className="flex justify-center items-center space-x-1">
      <div className={`w-1.5 h-1.5 rounded-full ${getQualityColor(quality)}`}></div>
      <span className="text-xs">
        {quality}: {quantity}{getUnitText(cell.productType)}
      </span>
    </div>
  ))
}
```

### 9.6 库存状态组件使用示例

**在HierarchicalInventoryView中的应用：**
```jsx
// 产品类型卡片头部 - 低库存背景色
<div 
  className={`p-mobile cursor-pointer touch-feedback transition-colors ${
    product_type_data.has_low_stock ? 'bg-red-50 border-l-4 border-l-red-500' : 'bg-gray-50'
  }`}
>
  {/* 低库存警告图标 */}
  {product_type_data.has_low_stock && (
    <AlertTriangle className="h-4 w-4 text-red-500" />
  )}
</div>
```

**在SemiFinishedMatrixView中的应用：**
```jsx
// 矩阵单元格状态显示
<div 
  className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-md ${
    getStockStatusColor(cell.totalQuantity, cell.isLowStock)
  }`}
  style={{
    filter: cell.isLowStock || cell.totalQuantity <= 50 ? 'grayscale(1)' : 'none',
    transition: 'filter 0.3s ease'
  }}
>
  {/* 库存数量显示 */}
  <div className="font-bold text-lg">{cell.totalQuantity}</div>
  
  {/* 品相分布信息 */}
  {user?.role === 'BOSS' && Object.keys(cell.qualityDistribution).length > 0 && (
    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
      {/* 品相分布详情 */}
    </div>
  )}
  
  {/* 低库存警告 */}
  {cell.isLowStock && (
    <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mt-1" />
  )}
</div>
```

**在FinishedProductGrid中的应用：**
```jsx
{/* 低库存标识 */}
{product.is_low_stock && (
  <div className="absolute top-2 left-2">
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
      库存不足
    </span>
  </div>
)}
```

