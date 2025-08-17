import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, DollarSign, Package, ShoppingCart, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { storage } from '../utils/storage';
import { authService } from '../services/auth';

export default function Statistics() {
  const navigate = useNavigate();
  const isAdmin = authService.isAdmin();
  const [timeRange, setTimeRange] = useState('6months');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [qualityData, setQualityData] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalPurchase: 0,
    totalSales: 0,
    totalProfit: 0,
    profitMargin: 0
  });

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const loadStatistics = async () => {
    try {
      const [purchases, products] = await Promise.all([
        storage.getPurchases(),
        storage.getProducts()
      ]);
      
      // 计算月度数据
      const monthlyStats = calculateMonthlyData(purchases, products);
      setMonthlyData(monthlyStats);
      
      // 计算分类数据
      const categoryStats = calculateCategoryData(products);
      setCategoryData(categoryStats);
      
      // 计算品质数据
      const qualityStats = calculateQualityData(purchases);
      setQualityData(qualityStats);
      
      // 计算总体统计
      const totalPurchase = purchases.reduce((sum, p) => sum + p.price, 0);
      const totalSales = products.reduce((sum, p) => sum + p.sellingPrice, 0);
      const totalCost = products.reduce((sum, p) => sum + p.cost, 0);
      const totalProfit = totalSales - totalCost;
      const profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;
      
      setTotalStats({
        totalPurchase,
        totalSales,
        totalProfit,
        profitMargin: parseFloat(profitMargin.toFixed(1))
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const calculateMonthlyData = (purchases: any[], products: any[]) => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthPurchases = purchases.filter(p => {
        const date = new Date(p.createdAt);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      
      const monthProducts = products.filter(p => {
        const date = new Date(p.createdAt);
        return date.getMonth() === index && date.getFullYear() === currentYear;
      });
      
      const purchase = monthPurchases.reduce((sum, p) => sum + p.price, 0);
      const sales = monthProducts.reduce((sum, p) => sum + p.sellingPrice, 0);
      const cost = monthProducts.reduce((sum, p) => sum + p.cost, 0);
      const profit = sales - cost;
      
      return { month, purchase, sales, profit };
    });
  };

  const calculateCategoryData = (products: any[]) => {
    const categoryCount: { [key: string]: number } = {};
    
    products.forEach(product => {
      const category = product.category || '其他';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000', '#00ffff'];
    
    return Object.entries(categoryCount).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  };

  const calculateQualityData = (purchases: any[]) => {
    const qualityCount: { [key: string]: number } = {};
    
    purchases.forEach(purchase => {
      const quality = purchase.quality || '未分级';
      qualityCount[quality] = (qualityCount[quality] || 0) + 1;
    });
    
    const colors = ['#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    
    return Object.entries(qualityCount).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  };

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-white shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 ml-4">统计分析</h1>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="3months">近3个月</option>
            <option value="6months">近6个月</option>
            <option value="1year">近1年</option>
          </select>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">总采购额</p>
                <p className="text-2xl font-bold text-gray-800">¥{totalStats.totalPurchase.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          {/* 销售额 - 仅管理员可见 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">总销售额</p>
                {isAdmin ? (
                  <p className="text-2xl font-bold text-gray-800">¥{totalStats.totalSales.toLocaleString()}</p>
                ) : (
                  <div className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-lg text-gray-400">仅管理员可见</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          {/* 利润 - 仅管理员可见 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">总利润</p>
                {isAdmin ? (
                  <p className="text-2xl font-bold text-gray-800">¥{totalStats.totalProfit.toLocaleString()}</p>
                ) : (
                  <div className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-lg text-gray-400">仅管理员可见</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          {/* 利润率 - 仅管理员可见 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">利润率</p>
                {isAdmin ? (
                  <p className="text-2xl font-bold text-gray-800">{totalStats.profitMargin}%</p>
                ) : (
                  <div className="flex items-center">
                    <Lock className="w-4 h-4 text-gray-400 mr-2" />
                    <p className="text-lg text-gray-400">仅管理员可见</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 月度趋势图 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">月度趋势</h3>
            {isAdmin ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="purchase" stroke="#8884d8" name="采购额" />
                  <Line type="monotone" dataKey="sales" stroke="#82ca9d" name="销售额" />
                  <Line type="monotone" dataKey="profit" stroke="#ffc658" name="利润" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">营收和利润数据仅管理员可见</p>
                </div>
              </div>
            )}
          </div>

          {/* 月度对比柱状图 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">月度对比</h3>
            {isAdmin ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="purchase" fill="#8884d8" name="采购额" />
                  <Bar dataKey="sales" fill="#82ca9d" name="销售额" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">营收数据仅管理员可见</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 产品分类分布 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">产品分类分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 品质分布 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">原材料品质分布</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={qualityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {qualityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 快速洞察 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">快速洞察</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">最佳销售月份</h4>
              <p className="text-sm text-blue-600">5月份销售额最高，达到¥3,200</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">热门产品类型</h4>
              <p className="text-sm text-green-600">手链类产品占比35%，最受欢迎</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">利润增长趋势</h4>
              <p className="text-sm text-purple-600">近6个月利润呈上升趋势</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}