import { useState, useEffect, useRef } from 'react';
import { Save, ArrowLeft, Camera, Zap, Images, ChevronDown, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storage, Purchase } from '../utils/storage';
import { PurchaseService } from '../lib/supabaseService';
import { authService } from '../services/auth';
import { createAIService, getGlobalAIConfig, AIRecognitionResult } from '../services/aiService';

export default function PurchaseEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData as Purchase | undefined;
  const isEditing = !!editData;
  const structuredInfoRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [scrollOffset, setScrollOffset] = useState(0);
  // AI服务状态管理 - 添加错误处理
  const [aiService, setAiService] = useState(() => {
    try {
      return createAIService(getGlobalAIConfig());
    } catch (error) {
      console.error('AI服务初始化失败:', error);
      return null;
    }
  });
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  
  const [formData, setFormData] = useState({
    // 结构化信息
    productName: '',
    quantity: '',
    quality: '',
    size: '',
    weight: '',
    unitPrice: '',
    totalPrice: '',
    supplier: '',
    // 自然语言和图片
    naturalLanguage: '',
    productImage: '' as string
  });
  
  // 供应商相关状态
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState<string[]>([]);

  // 获取历史供应商数据
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        // 防止API调用失败导致组件无法渲染
        let supplierList = [];
        try {
          supplierList = await PurchaseService.getUniqueSuppliers();
        } catch (apiError) {
          console.error('获取供应商列表API调用失败:', apiError);
          // 使用空数组作为后备
        }
        setSuppliers(supplierList);
        setFilteredSuppliers(supplierList);
      } catch (error) {
        console.error('获取供应商列表失败:', error);
      }
    };
    
    loadSuppliers();
  }, []);
  
  // 如果是编辑模式，预填充数据
  useEffect(() => {
    if (editData) {
      setFormData({
        productName: editData.crystalType || '',
        quantity: editData.quantity?.toString() || '1',
        quality: editData.quality || '',
        size: editData.size?.toString() || '',
        weight: editData.weight?.toString() || '',
        unitPrice: editData.unitPrice?.toString() || '',
        totalPrice: editData.price?.toString() || '',
        supplier: editData.supplier || '',
        naturalLanguage: editData.notes || '',
        productImage: editData.photos?.[0] || ''
      });
    }
  }, [editData]);

  // 智能输入法适配逻辑
  const calculateOptimalScroll = (inputElement: HTMLElement, inputIndex: number) => {
    const rect = inputElement.getBoundingClientRect();
    const currentViewportHeight = window.innerHeight;
    const estimatedKeyboardHeight = currentViewportHeight * 0.4; // 估算键盘高度为屏幕40%
    const availableHeight = currentViewportHeight - estimatedKeyboardHeight;
    const inputBottom = rect.bottom;
    const inputTop = rect.top;
    const inputHeight = rect.height;
    
    // 根据输入框位置调整滚动策略
    const padding = 20; // 适当的间距
    let scrollOffset = 0;
    
    if (inputIndex === 1) {
       // 第一行需要更大的滚动偏移，确保不被输入法遮挡
       scrollOffset = Math.max(0, inputBottom - availableHeight + 150);
    } else if (inputIndex >= 2 && inputIndex <= 8) {
       // 第二到第四行使用最小滚动，避免过多留白
       if (inputBottom > availableHeight) {
         scrollOffset = Math.max(0, inputBottom - availableHeight + 10); // 减少padding避免留白
       }
     }
    
    return Math.max(0, window.pageYOffset + scrollOffset);
  };

  const handleInputFocus = (inputIndex: number, event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setActiveInputIndex(inputIndex);
    setIsKeyboardVisible(true);
    
    // 延迟计算滚动位置，等待键盘弹出动画
    setTimeout(() => {
      const inputElement = event.target as HTMLElement;
      const optimalScrollTop = calculateOptimalScroll(inputElement, inputIndex);
      setScrollOffset(optimalScrollTop);
      
      window.scrollTo({
        top: optimalScrollTop,
        behavior: 'smooth'
      });
    }, 300);
  };

  const handleInputBlur = () => {
    setIsKeyboardVisible(false);
    setActiveInputIndex(null);
    
    // 延迟重置滚动位置，等待键盘收起
    setTimeout(() => {
      setScrollOffset(0);
      // 平滑滚动回顶部，确保布局重置
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 200); // 减少延迟时间，更快重置
  };

  // 智能监听视口变化和键盘状态
  useEffect(() => {
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      setViewportHeight(currentHeight);
      
      // 动态检测键盘高度
      const initialHeight = window.screen.height;
      const heightDiff = initialHeight - currentHeight;
      
      if (heightDiff > 150) { // 键盘弹出
        setKeyboardHeight(heightDiff);
        setIsKeyboardVisible(true);
      } else {
        setKeyboardHeight(0);
        if (!activeInputIndex) {
          setIsKeyboardVisible(false);
        }
      }
    };

    // 监听视口变化
    window.addEventListener('resize', handleResize);
    
    // 监听orientationchange事件
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 500); // 延迟处理屏幕旋转
    });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [activeInputIndex]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // 特殊处理品相字段：当选择"选择品相"时，设置为空字符串
      if (field === 'quality' && value === '') {
        // 用户选择了"选择品相"选项，保持为空字符串
        // 在保存时会被转换为"未知"
      }
      
      // 智能自动计算：仅在新建模式下启用，编辑模式下禁用自动计算
      if (!isEditing && (field === 'weight' || field === 'unitPrice' || field === 'totalPrice')) {
        const weight = parseFloat(field === 'weight' ? value : newData.weight) || 0;
        const unitPrice = parseFloat(field === 'unitPrice' ? value : newData.unitPrice) || 0;
        const totalPrice = parseFloat(field === 'totalPrice' ? value : newData.totalPrice) || 0;
        
        // 根据输入的字段计算其他字段
        if (field === 'weight' && unitPrice > 0) {
          // 输入重量，有克价，计算总价
          newData.totalPrice = (weight * unitPrice).toFixed(2);
        } else if (field === 'unitPrice' && weight > 0) {
          // 输入克价，有重量，计算总价
          newData.totalPrice = (weight * unitPrice).toFixed(2);
        } else if (field === 'totalPrice' && weight > 0) {
          // 输入总价，有重量，计算克价
          newData.unitPrice = (totalPrice / weight).toFixed(2);
        } else if (field === 'totalPrice' && unitPrice > 0) {
          // 输入总价，有克价，计算重量
          newData.weight = (totalPrice / unitPrice).toFixed(2);
        }
      }
      
      return newData;
    });
  };
  
  // 供应商相关处理函数
  const handleSupplierChange = (value: string) => {
    setFormData(prev => ({ ...prev, supplier: value }));
    
    // 过滤供应商列表
    const filtered = suppliers.filter(supplier => 
      supplier.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  };
  
  const handleSupplierFocus = () => {
    setShowSupplierDropdown(true);
    setFilteredSuppliers(suppliers);
  };
  
  const handleSupplierBlur = () => {
    // 延迟隐藏下拉框，允许点击选项
    setTimeout(() => {
      setShowSupplierDropdown(false);
    }, 200);
  };
  
  const handleSupplierSelect = (supplier: string) => {
    setFormData(prev => ({ ...prev, supplier }));
    setShowSupplierDropdown(false);
  };

  // 图片处理函数
  const triggerCamera = () => {
    const input = document.getElementById('camera-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const triggerGallery = () => {
    const input = document.getElementById('gallery-input') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, productImage: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGallerySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, productImage: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // AI识别处理函数
  const handleRecognize = async () => {
    if (!formData.naturalLanguage.trim()) {
      alert('请先输入自然语言描述');
      return;
    }

    setIsAIProcessing(true);
    try {
      // 获取AI配置并进行识别
      const currentConfig = getGlobalAIConfig();
      
      // 检查AI配置
      if (!currentConfig.apiKey) {
        alert('AI服务配置错误，请联系管理员');
        setIsAIProcessing(false);
        return;
      }
      
      // 创建AI服务实例并调用识别
      const aiServiceInstance = createAIService(currentConfig);
      const result = await aiServiceInstance.recognizeWithAI(formData.naturalLanguage);
      
      if (result) {
        // 更新表单数据
        setFormData(prev => ({
          ...prev,
          productName: result.productName || '',
          quantity: result.quantity || '',
          quality: result.quality || '',
          size: result.size || '',
          weight: result.weight || '',
          unitPrice: result.unitPrice || '',
          totalPrice: result.totalPrice || '',
          supplier: result.supplier || ''
        }));
        
        alert('AI识别完成！请检查并确认识别结果。');
      } else {
        alert('识别失败，AI返回结果为空');
      }
    } catch (error) {
      console.error('AI识别失败:', error);
      alert(`AI识别失败: ${error.message || '请检查网络连接或稍后重试'}`);
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleSave = async () => {
    // 防重复提交
    if (isSaving) {
      console.log('正在保存中，忽略重复点击');
      return;
    }
    
    try {
      // 如果有自然语言但未识别，先自动识别
      if (formData.naturalLanguage.trim() && !formData.productName.trim()) {
        handleRecognize();
        // 给用户时间查看识别结果
        setTimeout(() => {
          if (confirm('识别完成，是否继续保存？')) {
            performSave();
          }
        }, 1000);
        return;
      }
      
      performSave();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
  };
  
  // 计算单珠价格的函数
  const calculateBeadPrice = (size: number, totalPrice: number, quantity: number = 1): number => {
    // 根据尺寸确定每串珠子数量的标准
    const beadCountMap: { [key: number]: number } = {
      10: 19,
      12: 17,
      13: 16,
      14: 16,
      15: 14
    };
    
    // 找到最接近的尺寸标准
    let closestSize = 10;
    let minDiff = Math.abs(size - 10);
    
    for (const standardSize of Object.keys(beadCountMap)) {
      const diff = Math.abs(size - parseInt(standardSize));
      if (diff < minDiff) {
        minDiff = diff;
        closestSize = parseInt(standardSize);
      }
    }
    
    const beadsPerString = beadCountMap[closestSize];
    const totalBeads = beadsPerString * quantity;
    
    return totalPrice / totalBeads;
  };

  // 计算估算珠子数量的函数
  const calculateEstimatedBeadCount = (size: number, quantity: number = 1): number => {
    // 根据尺寸确定每串珠子数量的标准
    const beadCountMap: { [key: number]: number } = {
      10: 19,
      12: 17,
      13: 16,
      14: 16,
      15: 14
    };
    
    // 找到最接近的尺寸标准
    let closestSize = 10;
    let minDiff = Math.abs(size - 10);
    
    for (const standardSize of Object.keys(beadCountMap)) {
      const diff = Math.abs(size - parseInt(standardSize));
      if (diff < minDiff) {
        minDiff = diff;
        closestSize = parseInt(standardSize);
      }
    }
    
    const beadsPerString = beadCountMap[closestSize];
    return Math.round(beadsPerString * quantity); // 取整数
  };

  const performSave = async () => {
    // 设置保存状态，防止重复提交
    setIsSaving(true);
    
    try {
      console.log('=== 开始保存采购数据 ===');
      console.log('当前表单数据:', JSON.stringify(formData, null, 2));
      
      // 验证必填字段
      if (!formData.productName.trim()) {
        console.error('验证失败: 产品名称为空');
        alert('请输入产品名称');
        return;
      }
      if (!formData.weight || parseFloat(formData.weight) <= 0) {
        console.error('验证失败: 重量无效', formData.weight);
        alert('请输入有效的重量');
        return;
      }
      if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) {
        console.error('验证失败: 克价无效', formData.unitPrice);
        alert('请输入有效的克价');
        return;
      }

      console.log('表单验证通过');

      // 计算单珠价格和估算珠子数量
      let beadPrice = 0;
      let estimatedBeadCount = 0;
      if (formData.size) {
        const size = parseFloat(formData.size);
        const quantity = parseInt(formData.quantity) || 1;
        
        console.log('计算珠子数据:', { size, quantity });
        
        // 计算估算珠子数量
        estimatedBeadCount = calculateEstimatedBeadCount(size, quantity);
        console.log('估算珠子数量:', estimatedBeadCount);
        
        // 计算单珠价格（需要总价）
        if (formData.totalPrice) {
          const totalPrice = parseFloat(formData.totalPrice);
          beadPrice = calculateBeadPrice(size, totalPrice, quantity);
          console.log('单珠价格:', beadPrice);
        }
      }

      // 获取当前用户信息
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        alert('用户未登录，请先登录');
        return;
      }

      // 保存到数据库（兼容原有数据结构）
      const purchaseData = {
        supplier: formData.supplier.trim() || '未知供应商',
        crystalType: formData.productName.trim(),
        weight: parseFloat(formData.weight),
        price: parseFloat(formData.totalPrice) || parseFloat(formData.unitPrice),
        quality: formData.quality && formData.quality !== '' ? formData.quality : '未知',
        notes: formData.naturalLanguage.trim(),
        photos: formData.productImage ? [formData.productImage] : [],
        // 新增字段
        quantity: parseInt(formData.quantity) || 1,
        size: formData.size.trim(),
        unitPrice: parseFloat(formData.unitPrice),
        beadPrice: beadPrice > 0 ? parseFloat(beadPrice.toFixed(2)) : undefined,
        estimatedBeadCount: estimatedBeadCount > 0 ? estimatedBeadCount : undefined,
        // 用户信息
        createdBy: currentUser.username,
        userId: currentUser.id
      };

      console.log('=== 准备保存的数据 ===');
      console.log('保存的数据:', JSON.stringify(purchaseData, null, 2));

      // 检查认证状态
      console.log('检查认证状态...');
      console.log('当前用户:', currentUser);
      
      if (!currentUser) {
        console.error('用户未登录');
        alert('用户未登录，请先登录');
        return;
      }
      
      // 修复Supabase会话状态不一致问题
      console.log('🔧 检查并修复Supabase会话状态...');
      try {
        // 简化版本：不需要会话修复
        const fixResult = { success: false, message: '简化版本不支持会话修复' };
        console.log('会话修复结果:', fixResult);
        
        if (!fixResult.success) {
          console.warn('⚠️ 会话修复失败，但继续尝试保存:', fixResult.message);
        }
      } catch (sessionError) {
        console.warn('⚠️ 会话修复过程异常，但继续尝试保存:', sessionError);
      }

      if (isEditing && editData) {
        // 更新现有记录 - 强制使用云端
        console.log('🌐 强制云端更新现有记录, ID:', editData.id);
        const result = await storage.updatePurchase(editData.id, purchaseData);
        console.log('✅ 云端更新结果:', result);
        alert('采购记录已成功更新到云端！');
      } else {
        // 创建新记录 - 强制使用云端
        console.log('🌐 强制云端创建新记录...');
        const result = await storage.savePurchase(purchaseData);
        console.log('✅ 云端保存结果:', result);
        alert('采购记录已成功保存到云端！');
      }
      
      console.log('保存完成，准备跳转到列表页');
      navigate('/purchase/list');
    } catch (error) {
      console.error('=== 保存失败 ===');
      console.error('错误详情:', error);
      console.error('错误堆栈:', error.stack);
      
      // 简化的错误处理
      const { ErrorHandler } = await import('../utils/errorHandler');
      const errorMessage = ErrorHandler.getUserMessage(error);
      
      // 显示用户友好的错误信息
      alert(errorMessage);
      
      // 如果是认证相关错误，提示用户重新登录
      if (error.message && (error.message.includes('auth') || error.message.includes('session') || error.message.includes('token'))) {
        const shouldRelogin = confirm('是否立即跳转到登录页面重新登录？');
        if (shouldRelogin) {
          navigate('/login');
        }
      }
    } finally {
      // 重置保存状态
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white shadow-sm p-4 flex items-center flex-shrink-0">
        <button
          onClick={() => navigate(isEditing ? '/purchase/list' : '/')}
          className="p-2 rounded-lg bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 ml-4">
          {isEditing ? '编辑采购' : '采购录入'}
        </h1>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 第一段：产品图片区域 - 固定高度 */}
        <div className="bg-white border-b border-gray-200 p-3 flex flex-col" style={{ height: '160px', flexShrink: 0, marginBottom: '2px' }}>
          <h2 className="text-xs font-medium text-gray-700 mb-1 flex-shrink-0">产品图片</h2>
          <div className="flex-1 flex items-center justify-center relative">
            {formData.productImage ? (
              <div className="w-full h-full relative rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                <img 
                  src={formData.productImage} 
                  alt="产品图片" 
                  className="max-w-full max-h-full object-contain rounded-lg"
                  style={{ 
                    maxHeight: '120px', 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    width: 'auto',
                    height: 'auto'
                  }}
                />
                <button
                  onClick={() => setFormData(prev => ({ ...prev, productImage: '' }))}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-lg z-10"
                  style={{ fontSize: '14px', lineHeight: '1' }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-2">
                <Camera className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-gray-500 text-xs mb-2">选择图片来源</p>
                <div className="flex space-x-2">
                  <button
                    onClick={triggerCamera}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-600 flex items-center space-x-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>拍照</span>
                  </button>
                  <button
                     onClick={triggerGallery}
                     className="bg-green-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-600 flex items-center space-x-1"
                   >
                     <Images className="w-3 h-3" />
                     <span>相册</span>
                   </button>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                  id="camera-input"
                />
                <input
                  type="file"
                  onChange={handleGallerySelect}
                  className="hidden"
                  id="gallery-input"
                />
              </div>
            )}
          </div>
        </div>

        {/* 第二段：自然语言输入区域 - 固定高度 */}
        <div className="bg-white border-b border-gray-200 p-3 flex flex-col" style={{ height: '160px', flexShrink: 0, marginBottom: '0px' }}>
          <h2 className="text-xs font-medium text-gray-700 mb-1 flex-shrink-0">自然语言描述</h2>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={formData.naturalLanguage}
              onChange={(e) => handleInputChange('naturalLanguage', e.target.value)}
              onFocus={(e) => handleInputFocus(9, e)}
              onBlur={handleInputBlur}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="例如：在张三家买的紫水晶，大小是10，重量50克，A级品相，单价15元"
              style={{ height: '80px' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleRecognize}
                disabled={isAIProcessing}
                className={`flex-1 ${isAIProcessing ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center space-x-1 flex-shrink-0`}
                style={{ height: '32px' }}
              >
                <Zap className="w-3 h-3" />
                <span>{isAIProcessing ? '识别中...' : '智能识别'}</span>
              </button>
             </div>
          </div>
        </div>

        {/* 第三段：结构化信息区域 */}
        <div 
          ref={structuredInfoRef}
          className="bg-white p-3 flex flex-col"
          style={{ 
            minHeight: '300px',
            marginTop: '0px'
          }}
        >
          <h2 className="text-xs font-medium text-gray-700 mb-1 flex-shrink-0">结构化信息</h2>
          <div className="space-y-2">
            {/* 第一行：产品名称、数量 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">产品名称</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => handleInputChange('productName', e.target.value)}
                  onFocus={(e) => handleInputFocus(1, e)}
                  onBlur={handleInputBlur}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                  placeholder="水晶类型"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">数量</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  onFocus={(e) => handleInputFocus(2, e)}
                  onBlur={handleInputBlur}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                  placeholder="1"
                />
              </div>
            </div>

            {/* 第二行：品相、尺寸 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">品相</label>
                <select
                  value={formData.quality}
                  onChange={(e) => handleInputChange('quality', e.target.value)}
                  onFocus={(e) => handleInputFocus(3, e)}
                  onBlur={handleInputBlur}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                >
                  <option value="">选择品相</option>
                  <option value="AA">AA级</option>
                  <option value="A">A级</option>
                  <option value="AB">AB级</option>
                  <option value="B">B级</option>
                  <option value="C">C级</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">尺寸（mm）</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  onFocus={(e) => handleInputFocus(4, e)}
                  onBlur={handleInputBlur}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                  placeholder="单珠直径"
                />
              </div>
            </div>

            {/* 第三行：重量、克价 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">重量(g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  onFocus={(e) => handleInputFocus(5, e)}
                  onBlur={handleInputBlur}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">克价(元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                  onFocus={(e) => handleInputFocus(6, e)}
                  onBlur={handleInputBlur}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 第四行：总价、供应商 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">总价(元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.totalPrice}
                  onChange={(e) => handleInputChange('totalPrice', e.target.value)}
                  onFocus={(e) => handleInputFocus(7, e)}
                  onBlur={handleInputBlur}
                  className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                  placeholder="0.00"
                />
              </div>
              <div className="relative">
                <label className="block text-xs text-gray-600 mb-0.5 leading-tight">供应商</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    onFocus={(e) => {
                      handleInputFocus(8, e);
                      handleSupplierFocus();
                    }}
                    onBlur={(e) => {
                      handleInputBlur();
                      handleSupplierBlur();
                    }}
                    className="w-full px-1.5 py-1 pr-6 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 h-7"
                    placeholder="输入或选择供应商"
                  />
                  <ChevronDown className="absolute right-1.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  
                  {/* 下拉选项 */}
                  {showSupplierDropdown && filteredSuppliers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-32 overflow-y-auto">
                      {filteredSuppliers.map((supplier, index) => (
                        <div
                          key={index}
                          onClick={() => handleSupplierSelect(supplier)}
                          className="px-2 py-1 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {supplier}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 第五行：估算信息显示 */}
            {formData.size && formData.quantity && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-600 font-medium">估算珠子数量：</span>
                    <span className="text-blue-800 font-bold">
                      {calculateEstimatedBeadCount(parseFloat(formData.size), parseInt(formData.quantity) || 1)} 颗
                    </span>
                  </div>
                  {formData.totalPrice && (
                    <div>
                      <span className="text-blue-600 font-medium">单珠价格：</span>
                      <span className="text-blue-800 font-bold">
                        ¥{calculateBeadPrice(
                          parseFloat(formData.size), 
                          parseFloat(formData.totalPrice), 
                          parseInt(formData.quantity) || 1
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  💡 提示：根据 {formData.size}mm 尺寸和 {formData.quantity} 串数量自动估算
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 保存按钮区域 - 固定排列在结构化信息下方 */}
        <div className="bg-white border-t border-gray-200 p-3 flex-shrink-0">
          <div className="flex justify-center">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-1.5 rounded text-xs font-medium flex items-center space-x-1 transition-colors ${
                isSaving 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <Save className="w-3 h-3" />
              <span>
                {isSaving 
                  ? '保存中...' 
                  : (isEditing ? '更新记录' : '保存记录')
                }
              </span>
            </button>
          </div>
        </div>
        
        {/* 底部留白区域 - 适度的滚动空间 */}
        <div style={{ height: '10vh' }}></div>
      </div>
    </div>
  );
}