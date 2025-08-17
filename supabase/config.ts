// Supabase配置文件
// 请在.env文件中设置以下环境变量：
// VITE_SUPABASE_URL=your_supabase_url
// VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

export const supabaseConfig = {
  url: 'https://zorjkjsujpukqfpgankm.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmpranN1anB1a3FmcGdhbmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMTM5NzMsImV4cCI6MjA3MDU4OTk3M30.s8O77uNuRVfWYMnZUWUN4qxctazgkyLxhIv3a7Ta61U',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcmpranN1anB1a3FmcGdhbmttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAxMzk3MywiZXhwIjoyMDcwNTg5OTczfQ.X2dch1k8zvGWoIGbH5-pF4_bOwt6_6aXChzpL0x4DpE',  // 👈 添加这一行
};
// 检查配置是否完整
export const isSupabaseConfigured = () => {
  const hasUrl = !!supabaseConfig.url;
  const hasAnonKey = !!supabaseConfig.anonKey;
  const hasServiceRoleKey = !!supabaseConfig.serviceRoleKey;
  
  console.log('🔧 Supabase配置检查:', {
    hasUrl,
    hasAnonKey,
    hasServiceRoleKey,
    url: supabaseConfig.url ? '已配置' : '未配置',
    anonKey: supabaseConfig.anonKey ? '已配置' : '未配置',
    serviceRoleKey: supabaseConfig.serviceRoleKey ? '已配置' : '未配置'
  });
  
  return hasUrl && hasAnonKey && hasServiceRoleKey;
};