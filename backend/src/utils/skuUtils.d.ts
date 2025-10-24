// SKU工具函数类型声明

export interface SkuInventoryLog {
  id: string;
  sku_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  old_quantity?: number;
  new_quantity: number;
  change_reason: string;
  created_at: Date;
  updated_at: Date;
}

export interface SkuData {
  id?: string;
  sku_code?: string;
  product_name: string;
  specification: string;
  quantity: number;
  total_quantity: number;
  available_quantity: number;
  unit_price: number;
  total_value: number;
  images?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface FindOrCreateSkuResult {
  sku: SkuData;
  is_new_sku: boolean;
  log_created: boolean;
}

// 查找或创建SKU
export declare function findOrCreateSku(params: {
  material_usages: any[];
  sku_name: string;
  selling_price: number;
  user_id: string;
  tx: any;
  additional_data?: any;
}): Promise<FindOrCreateSkuResult>;

// 创建SKU库存变更日志
export declare function createSkuInventoryLog(params: {
  sku_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  user_id: string;
  tx: any;
}): Promise<SkuInventoryLog>;

// 获取SKU列表
export declare function getSkuList(params: any): Promise<any>;

// 获取SKU详情
export declare function getSkuDetails(id: string): Promise<any>;

// 调整SKU数量
export declare function adjustSkuQuantity(params: {
  skuId: string;
  quantity: number;
  reason: string;
}): Promise<any>;

// 减少SKU数量
export declare function decreaseSkuQuantity(params: {
  skuId: string;
  quantity: number;
  referenceId?: string;
  notes?: string;
  userId?: string;
  tx: any;
}): Promise<any>;