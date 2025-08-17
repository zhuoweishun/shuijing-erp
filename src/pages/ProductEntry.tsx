import { useState, useEffect } from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PhotoCapture from '../components/PhotoCapture';
import VoiceInput from '../components/VoiceInput';
import { storage } from '../utils/storage';

export default function ProductEntry() {
  // Trigger hot reload
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const isEditing = !!editData;
  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    rawMaterial: '',
    weight: '',
    size: '',
    craftTime: '',
    cost: '',
    sellingPrice: '',
    description: '',
    status: '制作中',
    photos: [] as string[]
  });

  // 如果是编辑模式，预填充表单数据
  useEffect(() => {
    if (editData) {
      setFormData({
        productName: editData.productName,
        category: editData.category,
        rawMaterial: editData.rawMaterial,
        weight: editData.weight.toString(),
        size: editData.size,
        craftTime: editData.craftTime.toString(),
        cost: editData.cost.toString(),
        sellingPrice: editData.sellingPrice.toString(),
        description: editData.description,
        status: editData.status || '制作中',
        photos: editData.photos || []
      });
    }
  }, [editData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoCapture = (photos: string[]) => {
    setFormData(prev => ({ ...prev, photos }));
  };

  const handleVoiceResult = (text: string) => {
    setFormData(prev => ({ ...prev, description: prev.description + (prev.description ? ' ' : '') + text }));
  };

  const handleSave = async () => {
    try {
      // 验证必填字段
      if (!formData.productName.trim()) {
        alert('请输入成品名称');
        return;
      }
      if (!formData.category) {
        alert('请选择产品分类');
        return;
      }
      if (!formData.weight || parseFloat(formData.weight) <= 0) {
        alert('请输入有效的重量');
        return;
      }
      if (!formData.cost || parseFloat(formData.cost) <= 0) {
        alert('请输入有效的成本');
        return;
      }
      if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
        alert('请输入有效的售价');
        return;
      }

      // 保存到本地存储
      const productData = {
        productName: formData.productName.trim(),
        category: formData.category,
        rawMaterial: formData.rawMaterial.trim(),
        weight: parseFloat(formData.weight),
        size: formData.size.trim(),
        craftTime: parseFloat(formData.craftTime) || 0,
        cost: parseFloat(formData.cost),
        sellingPrice: parseFloat(formData.sellingPrice),
        description: formData.description.trim(),
        status: formData.status,
        photos: formData.photos
      };

      if (isEditing && editData) {
        // 更新现有记录
        const result = await storage.updateProduct(editData.id, productData);
        if (result) {
          alert('成品记录更新成功！');
          navigate('/product/list');
        } else {
          alert('更新失败，请重试');
        }
      } else {
        // 创建新记录
        await storage.saveProduct(productData);
        alert('成品记录保存成功！');
        navigate('/product/list');
      }
    } catch (error) {
      console.error(isEditing ? '更新失败:' : '保存失败:', error);
      alert(isEditing ? '更新失败，请重试' : '保存失败，请重试');
    }
  };

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className="max-w-md mx-auto">
        {/* 头部 */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg bg-white shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 ml-4">{isEditing ? '编辑成品' : '成品录入'}</h1>
        </div>

        {/* 表单 */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          {/* 成品名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              成品名称
            </label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => handleInputChange('productName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入成品名称"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分类
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">请选择分类</option>
              <option value="手链">手链</option>
              <option value="项链">项链</option>
              <option value="耳环">耳环</option>
              <option value="戒指">戒指</option>
              <option value="摆件">摆件</option>
              <option value="其他">其他</option>
            </select>
          </div>

          {/* 原材料 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              原材料
            </label>
            <input
              type="text"
              value={formData.rawMaterial}
              onChange={(e) => handleInputChange('rawMaterial', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="使用的水晶原材料"
            />
          </div>

          {/* 重量和尺寸 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                重量(克)
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                尺寸(cm)
              </label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="长x宽x高"
              />
            </div>
          </div>

          {/* 制作时间 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              制作时间(小时)
            </label>
            <input
              type="number"
              value={formData.craftTime}
              onChange={(e) => handleInputChange('craftTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* 成本和售价 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                成本(元)
              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                售价(元)
              </label>
              <input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => handleInputChange('sellingPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              制作状态
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="制作中">制作中</option>
              <option value="已完成">已完成</option>
              <option value="已售出">已售出</option>
              <option value="暂停制作">暂停制作</option>
            </select>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品描述
            </label>
            <div className="space-y-2">
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="请输入产品描述，或使用下方语音输入"
              />
              <VoiceInput onVoiceResult={handleVoiceResult} />
            </div>
          </div>

          {/* 拍照功能 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产品照片
            </label>
            <PhotoCapture 
              onPhotoCapture={handlePhotoCapture}
              existingPhotos={formData.photos}
              maxPhotos={5}
            />
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{isEditing ? '更新记录' : '保存记录'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}