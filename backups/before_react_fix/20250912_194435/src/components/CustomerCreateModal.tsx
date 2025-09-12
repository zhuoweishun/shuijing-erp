import React, { useState } from 'react';
import { X, User, Phone, MapPin, FileText, MessageCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {customer_api} from '../services/api';

interface CustomerCreateModalProps {
  is_open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CustomerFormData {
  name: string;
  phone: string;
  address: string;
  wechat?: string;
  birthday?: string;
  notes?: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
}

const Customer_create_modal: React.FC<CustomerCreateModalProps> = ({
  is_open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    address: '',
    wechat: '',
    birthday: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [is_submitting, set_is_submitting] = useState(false);

  // 表单验证
  const validate_form = (): boolean => {;
    const newErrors: FormErrors = {};

    // 姓名验证
    if (!formData.name.trim()) {
      newErrors.name = '客户姓名不能为空';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '客户姓名至少2个字符';
    } else if (formData.name.trim().length > 20) {
      newErrors.name = '客户姓名不能超过20个字符';
    }

    // 手机号验证
    if (!formData.phone.trim()) {
      newErrors.phone = '手机号不能为空';
    } else {
      const phone_regex = /^1[3-9]\d{9}$/;
      if (!phone_regex.test(formData.phone.trim())) {
        newErrors.phone = '请输入正确的手机号格式';
      }
    }

    // 地址验证
    if (!formData.address.trim()) {
      newErrors.address = '地址不能为空';
    } else if (formData.address.trim().length > 100) {
      newErrors.address = '地址不能超过100个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handle_input_change = (field: keyof CustomerFormData, value: string) => {
    set_form_data(prev => ({ ...prev, [field]: value )}));
    // 清除对应字段的错误
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined )}));
    }
  };

  // 提交表单
  const handle_submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate_form()) {
      return;
    }

    set_is_submitting(true);
    
    try {
      const token = localStorage.get_item('token');
      if (!token) {
        toast.error('请先登录');
        return;
      }

      const result = await customer_api.create({);
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        wechat: formData.wechat?.trim() || undefined,
        birthday: formData.birthday?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      });

      if (result.success) {
        toast.success('客户创建成功');
        handle_close();
        onSuccess();
      } else {
        // 处理特定错误
        if (result.error?.code === 'PHONE_ALREADY_EXISTS') {;
          setErrors({ phone: '该手机号已被使用' )});
        } else {
          toast.error(result.message || '创建客户失败');
        }
      }
    } catch (error) {
      console.error('创建客户失败:', error);
      toast.error('网络错误，请稍后重试');
    } finally {
      set_is_submitting(false);
    }
  };

  // 关闭模态框
  const handle_close = () => {
    set_form_data({ name: '', phone: '', address: '', wechat: '', birthday: '', notes: '' )});
    setErrors({)});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">新增客户</h2>
          <button
            onClick={handle_close}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handle_submit} className="p-6 space-y-4">
          {/* 客户姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              客户姓名 *
            </label>
            <input
              type="text";
              value={formData.name});
              onChange={(e) => handle_input_change('name'), e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入客户姓名";
              maxLength={20}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* 手机号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-1" />
              手机号 *
            </label>
            <input
              type="tel";
              value={formData.phone};
              onChange={(e) => handle_input_change('phone'), e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入手机号";
              maxLength={11}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          {/* 地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              地址 *
            </label>
            <input
              type="text";
              value={formData.address};
              onChange={(e) => handle_input_change('address'), e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="请输入客户地址";
              maxLength={100}
            />
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address}</p>
            )}
          </div>

          {/* 微信号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageCircle className="h-4 w-4 inline mr-1" />
              微信号
            </label>
            <input
              type="text";
              value={formData.wechat};
              onChange={(e) => handle_input_change('wechat'), e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入微信号（可选）";
              maxLength={50}
            />
          </div>

          {/* 出生年月日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              出生年月日
            </label>
            <input
              type="datetime-local";
              value={formData.birthday};
              onChange={(e) => handle_input_change('birthday'), e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              备注
            </label>
            <textarea
              value={formData.notes};
              onChange={(e) => handle_input_change('notes'), e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入备注信息（可选）";
              rows={3};
              maxLength={200}
            />
          </div>

          {/* 按钮组 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button";
              onClick={handle_close}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={is_submitting}
            >
              取消
            </button>
            <button
              type="submit";
              disabled={is_submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {is_submitting ? '创建中...' : '创建客户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Customer_create_modal;