import { clean_test_data } from './clean_test_data.js';

console.log('🚀 开始执行测试数据清理...');

clean_test_data()
  .then(() => {
    console.log('🎉 清理完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 清理失败:', error);
    process.exit(1);
  });