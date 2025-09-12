import { use_state, use_effect, use_callback } from 'react'
import { Boxes, Download, Package, Grid, List } from 'lucide-react'
import { inventory_api } from '../services/api'
import FinishedProductGrid from '../components/FinishedProductGrid'
import AccessoriesProductGrid from '../components/AccessoriesProductGrid'
import SemiFinishedMatrixView from '../components/SemiFinishedMatrixView'
import InventoryDashboard from '../components/InventoryDashboard'
import { toast } from 'react-hot-toast'

// 原材料库存页面
export default function InventoryList() {
  // const { user } = use_auth()
  // const { is_mobile } = useDeviceDetection()
  
  // 状态管理
  const [loading, set_loading] = use_state(false)
  const [inventory_data, set_inventory_data] = use_state<any[]>([])
  const [current_page, set_current_page] = use_state(1)
  const [total_pages, set_total_pages] = use_state(1)
  const [search_term] = use_state('')
  const [selectedProductTypes, set_selected_product_types] = use_state<string[]>([])
  const [selected_quality] = use_state('')
  const [lowStockOnly] = use_state(false)
  const [specificationMin] = use_state('')
  const [specificationMax] = use_state('')
  const [view_mode, set_view_mode] = use_state<'all' | 'semi-finished' | 'accessories' | 'finished'>('all')
  

  
  // 获取层级式库存数据
  const fetch_hierarchical_inventory = use_callback(async () => {try {;
      set_loading(true)
      const params = {;
         page: current_page,
         limit: 20,
         search: search_term || undefined,
         product_types: selected_product_types.length > 0 ? selected_product_types: undefined,
         quality: (selected_quality as 'AA' | 'A' | 'AB' | 'B' | 'C') || undefined,
         low_stock_only: low_stock_only || undefined,
         specification_min: specification_min || undefined,
         specification_max: specification_max || undefined
       }
      
      console.log('📊 [库存查询] 请求参数:'), params)
      
      const response = await inventoryApi.list_hierarchical(params);
       
       console.log('📊 [库存查询] 完整响应数据:'), response.data)
       
       // 直接检查数据结构，不依赖success字段
       const response_data = response.data as any;
       console.log('🔧 [数据处理] responseData结构:'), response_data)
       
       // API返回的数据结构是 { success: true, data: { hierarchy: [...], pagination: {...} } }
       const actual_data = response_data.data || response_data;
       console.log('🔧 [数据处理] actualData结构:'), actual_data)
       
       if (actual_data && actual_data.hierarchy) {
         const hierarchy_data = Array.is_array(actual_data.hierarchy) ? actual_data.hierarchy : [];
         const pagination_data = actual_data.pagination || {};
         
         set_inventory_data(hierarchy_data)
         set_total_pages(typeof pagination_data.pages === 'number' ? pagination_data.pages : 1);
         
         console.log('📊 [库存查询] 查询成功:', {
           dataLength: hierarchy_data.length,
           total_count: pagination_data.total || 0,
           firstItem: hierarchy_data[0],
           pagination_data
         )})
       } else {
         console.error('📊 [库存查询] 响应数据格式异常:'), response_data)
         toast.error('获取库存数据失败：数据格式异常')
       }
    } catch (error: any) {
      console.error('📊 [库存查询] 查询失败:'), error)
      toast.error(error.response?.data?.message || '获取库存数据失败')
    } finally {
      set_loading(false)
    }
  }, [
    current_page, search_term, selectedProductTypes, selected_quality,
    lowStockOnly, specificationMin, specificationMax
  ])
  
  // 页面加载时获取数据
  use_effect(() => {fetch_hierarchical_inventory()
  }, [fetchHierarchicalInventory])
  

  
  // 导出数据
  const handle_export = async () => {;
    try {
      toast.loading('正在导出数据...')
      const response = await inventoryApi.export();
      
      if ((response.data as any).success) {
         // 创建下载链接
         const url = window.URL.create_object_u_r_l(new Blob([response.data as any]));
         const link = document.create_element('a');
         link.href = url;
         link.set_attribute('download'), `库存数据_${new Date().to_iso_string().split('T')[0]}.xlsx`)
         document.body.append_child(link)
         link.click()
         link.remove()
         window.URL.revoke_object_u_r_l(url)
         
         toast.success('导出成功')
       } else {
         toast.error('导出失败')
       }
    } catch (error: any) {
      console.error('导出失败:'), error)
      toast.error(error.response?.data?.message || '导出失败')
    }
  }
  

  
  // 视图模式切换处理
  const handle_view_mode_change = (mode: 'all' | 'semi-finished' | 'accessories' | 'finished') => {
    // 避免重复设置相同的视图模式
    if (view_mode === mode) {;
      return
    }
    
    // 批量更新状态，避免多次渲染
    set_view_mode(mode)
    set_current_page(1)
    
    // 根据视图模式自动筛选对应的产品类型
    if (mode === 'finished') {;
      set_selected_product_types(['FINISHED'])
    } else if (mode === 'semi-finished') {;
      set_selected_product_types(['LOOSE_BEADS'), 'BRACELET'])
    } else if (mode === 'accessories') {;
      set_selected_product_types(['ACCESSORIES'])
    } else {
      // 切换回全部视图时，清除产品类型筛选
      set_selected_product_types([])
    }
  }
  
  // 成品详情查看处理
  const handle_material_click = (material: any) => {
    // 安全检查：确保material对象存在且有material_name属性
    if (!material || !material.material_name) {
      console.warn('材料信息不完整:'), material)
      toast.error('材料信息不完整，无法查看详情')
      return
    }
    
    // 这里可以添加查看成品详情的逻辑
    console.log('查看成品详情:'), material)
    toast.success(`查看 ${material.material_name)} 详情`)
  }
  
  return(
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Boxes className="h-8 w-8 text-crystal-500" />
          <h1 className="text-2xl font-bold text-gray-900">原材料库存</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handle_export};
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>导出数据</span>
          </button>
        </div>
      </div>
      
      {/* 视图模式切换 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button)
            onClick={() => handle_view_mode_change('all')};
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${;
              view_mode === 'all'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <List className="h-4 w-4" />
            <span>全部库存</span>
          </button>
          <button
            onClick={() => handle_view_mode_change('semi-finished')};
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${;
              view_mode === 'semi-finished'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>半成品库存</span>
          </button>
          <button
            onClick={() => handle_view_mode_change('accessories')};
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${;
              view_mode === 'accessories'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>配件库存</span>
          </button>
          <button
            onClick={() => handle_view_mode_change('finished')};
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${;
              view_mode === 'finished'
                ? 'border-crystal-500 text-crystal-600 bg-crystal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>成品库存</span>
          </button>
        </div>
      </div>
      

      

      
      {/* 原材料库存数据展示 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {view_mode === 'finished' && (
          // 成品卡片展示
          <div className="p-6">
            <FinishedProductGrid
              key="finished-grid";
              search_term={search_term};
              selected_quality={selected_quality};
              lowStockOnly={low_stock_only};
              specification_min={specification_min};
              specification_max={specification_max}
            />
          </div>
        )}
        {view_mode === 'accessories' && (
          // 配件卡片展示
          <div className="p-6">
            <AccessoriesProductGrid
              key="accessories-grid";
              search_term={search_term};
              selected_quality={selected_quality};
              lowStockOnly={low_stock_only};
              specification_min={specification_min};
              specification_max={specification_max}
            />
          </div>
        )}
        {view_mode === 'semi-finished' && (
          // 半成品矩阵展示
          <div className="p-6">
            <SemiFinishedMatrixView
              key="semi-finished-matrix";
              data={inventory_data};
              loading={loading};
              on_cell_click={handle_material_click}
            />
          </div>
        )}
        {view_mode === 'all' && (
          // 库存仪表盘展示
          <div className="p-6">
            <InventoryDashboard key="inventory-dashboard" />
          </div>
        )}
      </div>
      
      {/* 分页 */}
      {total_pages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => set_current_page(prev => Math.max(1), prev - 1))};
            disabled={current_page === 1};
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5), total_pages) }, (_, i) => {
              const page = i + 1;
              return(
                <button
                  key={page});
                  onClick={() => set_current_page(page)};
                  className={`px-3 py-2 rounded-lg ${;
                    current_page === page
                      ? 'bg-crystal-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => set_current_page(prev => Math.min(total_pages), prev + 1))};
            disabled={current_page === total_pages};
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
