import { useState, useEffect } from 'react';
import { Search, Filter, Plus, ArrowLeft, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { storage, Product } from '../utils/storage';

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 加载成品数据
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await storage.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('加载成品数据失败:', error);
    }
  };

  const handleEdit = (product: Product) => {
    // 导航到编辑页面，传递数据
    navigate('/product/entry', { state: { editData: product } });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个成品记录吗？')) {
      try {
        const success = await storage.deleteProduct(id);
        if (success) {
          loadProducts(); // 重新加载数据
          alert('删除成功！');
        } else {
          alert('删除失败，请重试');
        }
      } catch (error) {
        console.error('删除成品记录失败:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleView = (product: Product) => {
    // 显示成品详情
    alert(`成品详情：\n名称：${product.productName}\n分类：${product.category}\n原材料：${product.rawMaterial}\n重量：${product.weight}g\n尺寸：${product.size}\n工时：${product.craftTime}h\n成本：¥${product.cost}\n售价：¥${product.sellingPrice}\n描述：${product.description}`);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.rawMaterial.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === '' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const totalValue = filteredProducts.reduce((sum, product) => sum + product.sellingPrice, 0);
  const totalCost = filteredProducts.reduce((sum, product) => sum + product.cost, 0);
  const totalProfit = totalValue - totalCost;

  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-white shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 ml-4">成品管理</h1>
          </div>
          <button
            onClick={() => navigate('/product/entry')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            <span>新增成品</span>
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">总成品数</div>
            <div className="text-2xl font-bold text-gray-800">{filteredProducts.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">总成本</div>
            <div className="text-2xl font-bold text-gray-800">¥{totalCost}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">总售价</div>
            <div className="text-2xl font-bold text-gray-800">¥{totalValue}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-500">预期利润</div>
            <div className="text-2xl font-bold text-green-600">¥{totalProfit}</div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索成品名称或原材料"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 w-4 h-4" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部分类</option>
                <option value="手链">手链</option>
                <option value="项链">项链</option>
                <option value="耳环">耳环</option>
                <option value="戒指">戒指</option>
                <option value="摆件">摆件</option>
                <option value="其他">其他</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">全部状态</option>
                <option value="在售">在售</option>
                <option value="已售">已售</option>
                <option value="制作中">制作中</option>
              </select>
            </div>
          </div>
        </div>

        {/* 成品列表 */}
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{product.productName}</h3>
                  <p className="text-sm text-gray-500">{product.category} · {product.rawMaterial}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    product.status === '在售' ? 'bg-green-100 text-green-800' :
                    product.status === '已售' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {product.status}
                  </span>
                  <button 
                    onClick={() => handleView(product)}
                    className="p-1 text-gray-400 hover:text-blue-500"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEdit(product)}
                    className="p-1 text-gray-400 hover:text-blue-500"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-500">重量:</span>
                  <span className="ml-1 font-medium">{product.weight}g</span>
                </div>
                <div>
                  <span className="text-gray-500">尺寸:</span>
                  <span className="ml-1 font-medium">{product.size}</span>
                </div>
                <div>
                  <span className="text-gray-500">工时:</span>
                  <span className="ml-1 font-medium">{product.craftTime}h</span>
                </div>
                <div>
                  <span className="text-gray-500">成本:</span>
                  <span className="ml-1 font-medium">¥{product.cost}</span>
                </div>
                <div>
                  <span className="text-gray-500">售价:</span>
                  <span className="ml-1 font-medium text-green-600">¥{product.sellingPrice}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">创建时间: {formatDate(product.createdAt)}</span>
                <span className="text-green-600 font-medium">
                  利润: ¥{product.sellingPrice - product.cost}
                </span>
              </div>
              
              {product.description && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600">{product.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">暂无成品记录</div>
            <button
              onClick={() => navigate('/product/entry')}
              className="text-blue-500 hover:text-blue-600"
            >
              立即添加第一个成品
            </button>
          </div>
        )}
      </div>
    </div>
  );
}