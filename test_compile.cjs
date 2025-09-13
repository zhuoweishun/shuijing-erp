const { exec } = require('child_process');

console.log('开始TypeScript编译检查...');

exec('cd backend && npx tsc --noEmit', (error, stdout, stderr) => {
  if (error) {
    console.log('编译失败，错误信息:');
    console.log(stderr || stdout || error.message);
    process.exit(1);
  } else {
    console.log('TypeScript编译成功！');
    console.log(stdout);
    process.exit(0);
  }
});