import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

interface Activity {
  id: string;
  type: 'purchase' | 'product';
  description: string;
  timestamp: string;
  color: string;
}

export default function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadRecentActivities();
  }, []);

  const loadRecentActivities = async () => {
    try {
      const [purchases, products] = await Promise.all([
        storage.getPurchases(),
        storage.getProducts()
      ]);
      
      const allActivities: Activity[] = [];
      
      // 添加采购活动
      purchases.slice(-5).forEach(purchase => {
        allActivities.push({
          id: `purchase-${purchase.id}`,
          type: 'purchase',
          description: `新增采购记录：${purchase.crystalType} ${purchase.weight}g`,
          timestamp: purchase.createdAt,
          color: 'bg-blue-500'
        });
      });
      
      // 添加成品活动
      products.slice(-5).forEach(product => {
        allActivities.push({
          id: `product-${product.id}`,
          type: 'product',
          description: `完成成品：${product.productName}`,
          timestamp: product.createdAt,
          color: 'bg-green-500'
        });
      });
      
      // 按时间排序，最新的在前
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setActivities(allActivities.slice(0, 5));
    } catch (error) {
      console.error('加载最近活动失败:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}小时前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}天前`;
    
    return time.toLocaleDateString('zh-CN');
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>暂无最近活动</p>
        <p className="text-sm mt-1">开始录入采购或成品数据吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div 
          key={activity.id} 
          className={`flex items-center justify-between py-2 ${
            index < activities.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <div className="flex items-center">
            <div className={`w-2 h-2 ${activity.color} rounded-full mr-3`}></div>
            <span className="text-sm text-gray-600">{activity.description}</span>
          </div>
          <span className="text-xs text-gray-400">
            {formatTimeAgo(activity.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}