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
  isNewSku: boolean;
}

// 查找或创建SKU
export declare function findOrCreateSku(params: {
  tx: any;
  productName: string;
  specification: string;
  unitPrice: number;
  images?: string[];
}): Promise<FindOrCreateSkuResult>;

// 创建SKU库存变更日志
export declare function createSkuInventoryLog(params: {
  tx: any;
  skuId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  newQuantity: number;
  oldQuantity?: number;
  changeReason?: string;
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
  reason: string;
}): Promise<any>;