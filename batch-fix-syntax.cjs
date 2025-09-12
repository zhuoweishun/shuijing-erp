const fs = require('fs');
const path = require('path');

// 定义需要修复的语法错误模式
const fixPatterns = [
  // SemiFinishedMatrixView.tsx 错误
  {
    file: 'src/components/SemiFinishedMatrixView.tsx',
    fixes: [
      { search: '.map((, filterIndex) => (', replace: '.map((product_name, filterIndex) => (' }
    ]
  },
  // SkuDetailModal.tsx 错误
  {
    file: 'src/components/SkuDetailModal.tsx',
    fixes: [
      { search: 'await skuApi.getHistory(, {', replace: 'await skuApi.getHistory(state.sku_id, {' }
    ]
  },
  // SkuDestroyForm.tsx 错误
  {
    file: 'src/components/SkuDestroyForm.tsx',
    fixes: [
      { search: '.filter(id => id !== )', replace: '.filter(id => id !== purchase_id)' },
      { search: 'prev.custom_return_quantities[]', replace: 'prev.custom_return_quantities[purchase_id]' }
    ]
  },
  // SemiFinishedMatrixView.tsx 更多错误
  {
    file: 'src/components/SemiFinishedMatrixView.tsx',
    fixes: [
      { search: 'filteredProductNames.map((, rowIndex) => (', replace: 'filteredProductNames.map((product_name, rowIndex) => (' }
    ]
  },
  // SkuControlModal.tsx 错误
   {
     file: 'src/components/SkuControlModal.tsx',
     fixes: [
       { search: 'if ( && activeTab === \'logs\') {', replace: 'if (is_open && activeTab === \'logs\') {' }
     ]
   },
   // SkuDetailModal.tsx 更多错误
   {
     file: 'src/components/SkuDetailModal.tsx',
     fixes: [
       { search: 'if ( && ) {', replace: 'if (is_open && state.sku_id) {' }
     ]
   },
   // SkuRestockForm.tsx 错误
   {
     file: 'src/components/SkuRestockForm.tsx',
     fixes: [
       { search: 'if () {', replace: 'if (is_open) {' }
     ]
   },
   // ReverseSaleModal.tsx 错误
   {
     file: 'src/components/ReverseSaleModal.tsx',
     fixes: [
       { search: 'if () {', replace: 'if (is_open) {' }
     ]
   },
   // CustomerDetailModal.tsx 错误
   {
     file: 'src/components/CustomerDetailModal.tsx',
     fixes: [
       { search: 'if ( && activeTab === \'purchases\' && customer?.id) {', replace: 'if (is_open && activeTab === \'purchases\' && customer?.id) {' },
       { search: 'if ( && activeTab === \'notes\' && customer?.id) {', replace: 'if (is_open && activeTab === \'notes\' && customer?.id) {' }
     ]
   },
   // CustomerRefundModal.tsx 错误
    {
      file: 'src/components/CustomerRefundModal.tsx',
      fixes: [
        { search: 'if ( && customer?.id) {', replace: 'if (is_open && customer?.id) {' },
        { search: '={showRefundModal}', replace: 'is_open={showRefundModal}' }
      ]
    },
    // SkuRestockForm.tsx 更多错误
    {
      file: 'src/components/SkuRestockForm.tsx',
      fixes: [
        { search: '{ && (', replace: '{loading && (' }
      ]
    },
    // CustomerDetailModal.tsx 更多错误
    {
      file: 'src/components/CustomerDetailModal.tsx',
      fixes: [
        { search: '{! ? (', replace: '{!isEditing ? (' }
      ]
    },
    // ReverseSaleModal.tsx 更多错误
     {
       file: 'src/components/ReverseSaleModal.tsx',
       fixes: [
         { search: 'value={state.}', replace: 'value={state.search_term}' }
       ]
     },
     // CustomerDetailModal.tsx 更多错误
     {
       file: 'src/components/CustomerDetailModal.tsx',
       fixes: [
         { search: '={showRefundModal}', replace: 'is_open={showRefundModal}' }
       ]
     },
     // PurchaseDetailModal.tsx 错误
     {
       file: 'src/components/PurchaseDetailModal.tsx',
       fixes: [
         { search: 'if ( && purchase_id) {', replace: 'if (is_open && purchase_id) {' }
       ]
     },
     // SkuHistoryView.tsx 错误
      {
        file: 'src/components/SkuHistoryView.tsx',
        fixes: [
          { search: 'if () {', replace: 'if (searchTerm) {' },
          { search: '.includes(.toLowe', replace: '.includes(searchTerm.toLowe' },
          { search: 'filteredData.length / )', replace: 'filteredData.length / itemsPerPage)' },
          { search: 'if (loading || ) {', replace: 'if (loading || !data) {' },
          { search: '{( - 1) * page_size + 1}', replace: '{(currentPage - 1) * page_size + 1}' },
          { search: '{Math.min( * page_size, filteredData.length)}', replace: '{Math.min(currentPage * page_size, filteredData.length)}' }
        ]
      },
      // SkuTraceView.tsx 错误
      {
        file: 'src/components/SkuTraceView.tsx',
        fixes: [
          { search: 'if (loading || ) {', replace: 'if (loading || !data) {' }
        ]
      }
];

// 执行批量修复
function batchFix() {
  console.log('开始批量修复语法错误...');
  
  fixPatterns.forEach(({ file, fixes }) => {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`文件不存在: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(({ search, replace }) => {
      if (content.includes(search)) {
        content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
        modified = true;
        console.log(`修复 ${file}: ${search} -> ${replace}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`已保存修复: ${file}`);
    } else {
      console.log(`无需修复: ${file}`);
    }
  });
  
  console.log('批量修复完成!');
}

batchFix();