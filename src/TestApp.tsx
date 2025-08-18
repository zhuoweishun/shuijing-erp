import React from 'react';

function TestApp() {
  return (
    <div style={{ padding: '20px', fontSize: '24px', color: 'blue' }}>
      <h1>测试页面 - React 正在工作!</h1>
      <p>如果你能看到这个页面，说明React基础渲染正常。</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
    </div>
  );
}

export default TestApp;