// AI服务配置文件 - 内置API密钥
// 用户无需再次配置，直接使用内置的API服务

export const BUILT_IN_AI_CONFIG = {
  provider: 'doubao' as const,
  apiKey: '0a7c42e7-d1d3-4d53-9b83-dca43b9b2c81',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: 'doubao-1.5-pro-32k-250115',
};

// 检查是否有内置API配置
export function hasBuiltInAPIKey(): boolean {
  return BUILT_IN_AI_CONFIG.apiKey !== '' && 
         !BUILT_IN_AI_CONFIG.apiKey.includes('用户提供的API密钥');
}

// 获取内置AI配置
export function getBuiltInAIConfig() {
  return BUILT_IN_AI_CONFIG;
}