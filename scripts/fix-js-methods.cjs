const fs = require('fs');
const path = require('path');

// JavaScript内置方法名修复映射
const JS_METHOD_FIXES = {
  // localStorage methods
  'localStorage.remove_item': 'localStorage.removeItem',
  'localStorage.set_item': 'localStorage.setItem', 
  'localStorage.get_item': 'localStorage.getItem',
  
  // sessionStorage methods
  'sessionStorage.remove_item': 'sessionStorage.removeItem',
  'sessionStorage.set_item': 'sessionStorage.setItem',
  'sessionStorage.get_item': 'sessionStorage.getItem',
  
  // Object methods
  'Object.define_property': 'Object.defineProperty',
  'Object.get_own_property_descriptor': 'Object.getOwnPropertyDescriptor',
  'Object.get_own_property_names': 'Object.getOwnPropertyNames',
  'Object.get_prototype_of': 'Object.getPrototypeOf',
  'Object.set_prototype_of': 'Object.setPrototypeOf',
  'Object.has_own_property': 'Object.hasOwnProperty',
  'Object.property_is_enumerable': 'Object.propertyIsEnumerable',
  
  // Array methods
  'Array.is_array': 'Array.isArray',
  '.for_each': '.forEach',
  '.index_of': '.indexOf',
  '.last_index_of': '.lastIndexOf',
  '.reduce_right': '.reduceRight',
  
  // String methods
  '.char_at': '.charAt',
  '.char_code_at': '.charCodeAt',
  '.index_of': '.indexOf',
  '.last_index_of': '.lastIndexOf',
  '.locale_compare': '.localeCompare',
  '.to_lower_case': '.toLowerCase',
  '.to_upper_case': '.toUpperCase',
  '.to_locale_lower_case': '.toLocaleLowerCase',
  '.to_locale_upper_case': '.toLocaleUpperCase',
  '.substring': '.substring',
  '.substr': '.substr',
  
  // Date methods
  '.get_time': '.getTime',
  '.get_full_year': '.getFullYear',
  '.get_month': '.getMonth',
  '.get_date': '.getDate',
  '.get_day': '.getDay',
  '.get_hours': '.getHours',
  '.get_minutes': '.getMinutes',
  '.get_seconds': '.getSeconds',
  '.get_milliseconds': '.getMilliseconds',
  '.set_time': '.setTime',
  '.set_full_year': '.setFullYear',
  '.set_month': '.setMonth',
  '.set_date': '.setDate',
  '.set_hours': '.setHours',
  '.set_minutes': '.setMinutes',
  '.set_seconds': '.setSeconds',
  '.set_milliseconds': '.setMilliseconds',
  '.to_iso_string': '.toISOString',
  '.to_date_string': '.toDateString',
  '.to_time_string': '.toTimeString',
  '.to_locale_string': '.toLocaleString',
  '.to_locale_date_string': '.toLocaleDateString',
  '.to_locale_time_string': '.toLocaleTimeString',
  
  // Navigator methods
  'navigator.media_devices': 'navigator.mediaDevices',
  'navigator.get_user_media': 'navigator.getUserMedia',
  
  // Document methods
  'document.get_element_by_id': 'document.getElementById',
  'document.get_elements_by_class_name': 'document.getElementsByClassName',
  'document.get_elements_by_tag_name': 'document.getElementsByTagName',
  'document.query_selector': 'document.querySelector',
  'document.query_selector_all': 'document.querySelectorAll',
  'document.create_element': 'document.createElement',
  'document.create_text_node': 'document.createTextNode',
  'document.add_event_listener': 'document.addEventListener',
  'document.remove_event_listener': 'document.removeEventListener',
  
  // Element methods
  '.add_event_listener': '.addEventListener',
  '.remove_event_listener': '.removeEventListener',
  '.get_attribute': '.getAttribute',
  '.set_attribute': '.setAttribute',
  '.remove_attribute': '.removeAttribute',
  '.has_attribute': '.hasAttribute',
  '.query_selector': '.querySelector',
  '.query_selector_all': '.querySelectorAll',
  '.class_list': '.classList',
  '.inner_html': '.innerHTML',
  '.outer_html': '.outerHTML',
  '.inner_text': '.innerText',
  '.text_content': '.textContent',
  '.scroll_top': '.scrollTop',
  '.scroll_left': '.scrollLeft',
  '.scroll_height': '.scrollHeight',
  '.scroll_width': '.scrollWidth',
  '.client_height': '.clientHeight',
  '.client_width': '.clientWidth',
  '.offset_height': '.offsetHeight',
  '.offset_width': '.offsetWidth',
  '.offset_top': '.offsetTop',
  '.offset_left': '.offsetLeft',
  
  // Window methods
  'window.set_timeout': 'window.setTimeout',
  'window.clear_timeout': 'window.clearTimeout',
  'window.set_interval': 'window.setInterval',
  'window.clear_interval': 'window.clearInterval',
  'window.request_animation_frame': 'window.requestAnimationFrame',
  'window.cancel_animation_frame': 'window.cancelAnimationFrame',
  
  // Console methods
  'console.log': 'console.log', // 保持不变
  'console.error': 'console.error', // 保持不变
  'console.warn': 'console.warn', // 保持不变
  'console.info': 'console.info', // 保持不变
  'console.debug': 'console.debug', // 保持不变
  
  // JSON methods
  'JSON.parse': 'JSON.parse', // 保持不变
  'JSON.stringify': 'JSON.stringify', // 保持不变
  
  // Math methods
  'Math.floor': 'Math.floor', // 保持不变
  'Math.ceil': 'Math.ceil', // 保持不变
  'Math.round': 'Math.round', // 保持不变
  'Math.random': 'Math.random', // 保持不变
  'Math.max': 'Math.max', // 保持不变
  'Math.min': 'Math.min', // 保持不变
  'Math.abs': 'Math.abs', // 保持不变
  
  // Event object properties
  '.current_target': '.currentTarget',
  '.prevent_default': '.preventDefault',
  '.stop_propagation': '.stopPropagation',
  '.stop_immediate_propagation': '.stopImmediatePropagation',
  
  // Promise methods
  '.then': '.then', // 保持不变
  '.catch': '.catch', // 保持不变
  '.finally': '.finally', // 保持不变
  'Promise.resolve': 'Promise.resolve', // 保持不变
  'Promise.reject': 'Promise.reject', // 保持不变
  'Promise.all': 'Promise.all', // 保持不变
  'Promise.race': 'Promise.race', // 保持不变
};

// 需要检查的文件扩展名
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// 递归获取目录下所有文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过node_modules和.git目录
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
        getAllFiles(filePath, fileList);
      }
    } else {
      // 只处理指定扩展名的文件
      if (FILE_EXTENSIONS.some(ext => file.endsWith(ext))) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// 修复单个文件
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // 应用所有修复
    for (const [wrongMethod, correctMethod] of Object.entries(JS_METHOD_FIXES)) {
      if (wrongMethod !== correctMethod) { // 只修复需要改变的
        const regex = new RegExp(wrongMethod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (regex.test(content)) {
          content = content.replace(regex, correctMethod);
          hasChanges = true;
          console.log(`  修复: ${wrongMethod} -> ${correctMethod}`);
        }
      }
    }
    
    // 如果有修改，写回文件
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('开始修复JavaScript内置方法名...');
  
  const srcDir = path.join(__dirname, '..', 'src');
  const apiDir = path.join(__dirname, '..', 'api');
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  // 处理src目录
  if (fs.existsSync(srcDir)) {
    console.log('\n处理src目录...');
    const srcFiles = getAllFiles(srcDir);
    
    srcFiles.forEach(filePath => {
      totalFiles++;
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`检查: ${relativePath}`);
      
      if (fixFile(filePath)) {
        fixedFiles++;
        console.log(`✓ 已修复: ${relativePath}`);
      }
    });
  }
  
  // 处理api目录
  if (fs.existsSync(apiDir)) {
    console.log('\n处理api目录...');
    const apiFiles = getAllFiles(apiDir);
    
    apiFiles.forEach(filePath => {
      totalFiles++;
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`检查: ${relativePath}`);
      
      if (fixFile(filePath)) {
        fixedFiles++;
        console.log(`✓ 已修复: ${relativePath}`);
      }
    });
  }
  
  console.log(`\n修复完成!`);
  console.log(`总共检查了 ${totalFiles} 个文件`);
  console.log(`修复了 ${fixedFiles} 个文件`);
  
  if (fixedFiles > 0) {
    console.log('\n建议运行 npm run check 验证修复结果');
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main, fixFile, JS_METHOD_FIXES };