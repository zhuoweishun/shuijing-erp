#!/usr/bin/env node

/**
 * React组件属性和CSS属性修复脚本
 * 修复批量转换工具错误地将React和CSS属性名转换的问题
 */

const fs = require('fs');
const path = require('path');

// 需要修复的React组件属性映射
const REACT_PROP_FIXES = {
  // PermissionWrapper组件属性
  'allowed_roles': 'allowedRoles',
  'hide_for_employee': 'hideForEmployee',
  'class_name': 'className',
  
  // 常见React属性
  'on_click': 'onClick',
  'on_change': 'onChange',
  'on_submit': 'onSubmit',
  'on_focus': 'onFocus',
  'on_blur': 'onBlur',
  'on_key_down': 'onKeyDown',
  'on_key_up': 'onKeyUp',
  'on_mouse_enter': 'onMouseEnter',
  'on_mouse_leave': 'onMouseLeave',
  'on_mouse_down': 'onMouseDown',
  'on_mouse_up': 'onMouseUp',
  'default_value': 'defaultValue',
  'default_checked': 'defaultChecked',
  'auto_focus': 'autoFocus',
  'auto_complete': 'autoComplete',
  'read_only': 'readOnly',
  'tab_index': 'tabIndex',
  'max_length': 'maxLength',
  'min_length': 'minLength',
  'spell_check': 'spellCheck',
  'content_editable': 'contentEditable',
  'draggable': 'draggable',
  'drop_zone': 'dropZone',
  'hidden': 'hidden',
  'lang': 'lang',
  'role': 'role',
  'aria_label': 'ariaLabel',
  'aria_labelledby': 'ariaLabelledby',
  'aria_describedby': 'ariaDescribedby',
  'data_testid': 'data-testid'
};

// 需要修复的CSS属性映射
const CSS_PROP_FIXES = {
  // 布局属性
  'z_index': 'zIndex',
  'max_width': 'maxWidth',
  'max_height': 'maxHeight',
  'min_width': 'minWidth',
  'min_height': 'minHeight',
  'padding_top': 'paddingTop',
  'padding_bottom': 'paddingBottom',
  'padding_left': 'paddingLeft',
  'padding_right': 'paddingRight',
  'margin_top': 'marginTop',
  'margin_bottom': 'marginBottom',
  'margin_left': 'marginLeft',
  'margin_right': 'marginRight',
  'border_top': 'borderTop',
  'border_bottom': 'borderBottom',
  'border_left': 'borderLeft',
  'border_right': 'borderRight',
  'border_width': 'borderWidth',
  'border_style': 'borderStyle',
  'border_color': 'borderColor',
  'border_radius': 'borderRadius',
  'background_color': 'backgroundColor',
  'background_image': 'backgroundImage',
  'background_size': 'backgroundSize',
  'background_position': 'backgroundPosition',
  'background_repeat': 'backgroundRepeat',
  'background_attachment': 'backgroundAttachment',
  
  // 文本属性
  'font_size': 'fontSize',
  'font_weight': 'fontWeight',
  'font_family': 'fontFamily',
  'font_style': 'fontStyle',
  'line_height': 'lineHeight',
  'text_align': 'textAlign',
  'text_decoration': 'textDecoration',
  'text_transform': 'textTransform',
  'text_shadow': 'textShadow',
  'letter_spacing': 'letterSpacing',
  'word_spacing': 'wordSpacing',
  'white_space': 'whiteSpace',
  'text_overflow': 'textOverflow',
  
  // 显示属性
  'display': 'display',
  'position': 'position',
  'top': 'top',
  'bottom': 'bottom',
  'left': 'left',
  'right': 'right',
  'float': 'float',
  'clear': 'clear',
  'overflow': 'overflow',
  'overflow_x': 'overflowX',
  'overflow_y': 'overflowY',
  'visibility': 'visibility',
  'opacity': 'opacity',
  
  // Flexbox属性
  'flex_direction': 'flexDirection',
  'flex_wrap': 'flexWrap',
  'flex_flow': 'flexFlow',
  'justify_content': 'justifyContent',
  'align_items': 'alignItems',
  'align_content': 'alignContent',
  'align_self': 'alignSelf',
  'flex_grow': 'flexGrow',
  'flex_shrink': 'flexShrink',
  'flex_basis': 'flexBasis',
  
  // Grid属性
  'grid_template_columns': 'gridTemplateColumns',
  'grid_template_rows': 'gridTemplateRows',
  'grid_template_areas': 'gridTemplateAreas',
  'grid_column': 'gridColumn',
  'grid_row': 'gridRow',
  'grid_area': 'gridArea',
  'grid_gap': 'gridGap',
  'column_gap': 'columnGap',
  'row_gap': 'rowGap',
  
  // 动画属性
  'animation_name': 'animationName',
  'animation_duration': 'animationDuration',
  'animation_timing_function': 'animationTimingFunction',
  'animation_delay': 'animationDelay',
  'animation_iteration_count': 'animationIterationCount',
  'animation_direction': 'animationDirection',
  'animation_fill_mode': 'animationFillMode',
  'animation_play_state': 'animationPlayState',
  'transition': 'transition',
  'transition_property': 'transitionProperty',
  'transition_duration': 'transitionDuration',
  'transition_timing_function': 'transitionTimingFunction',
  'transition_delay': 'transitionDelay',
  'transform': 'transform',
  'transform_origin': 'transformOrigin',
  'transform_style': 'transformStyle',
  'perspective': 'perspective',
  'perspective_origin': 'perspectiveOrigin',
  'backface_visibility': 'backfaceVisibility'
};

/**
 * 修复单个文件中的React和CSS属性名
 */
function fixReactCSSPropsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    const changes = [];
    
    // 修复React组件属性
    Object.entries(REACT_PROP_FIXES).forEach(([wrongProp, correctProp]) => {
      // 匹配JSX属性：prop={value} 或 prop="value" 或 prop
      const patterns = [
        new RegExp(`\\b${wrongProp}(\\s*=)`, 'g'),
        new RegExp(`\\b${wrongProp}(\\s*\\})`, 'g'),
        new RegExp(`\\b${wrongProp}(\\s*,)`, 'g'),
        new RegExp(`\\b${wrongProp}(\\s*:)`, 'g')
      ];
      
      patterns.forEach((regex, index) => {
        const matches = content.match(regex);
        if (matches) {
          content = content.replace(regex, `${correctProp}$1`);
          hasChanges = true;
          if (!changes.includes(`${wrongProp} -> ${correctProp}`)) {
            changes.push(`${wrongProp} -> ${correctProp}`);
          }
        }
      });
    });
    
    // 修复CSS属性（在style对象中）
    Object.entries(CSS_PROP_FIXES).forEach(([wrongProp, correctProp]) => {
      // 匹配style对象中的属性：prop: value
      const regex = new RegExp(`(\\s+)${wrongProp}(\\s*:)`, 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, `$1${correctProp}$2`);
        hasChanges = true;
        if (!changes.includes(`${wrongProp} -> ${correctProp}`)) {
          changes.push(`${wrongProp} -> ${correctProp}`);
        }
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 修复 ${path.relative(process.cwd(), filePath)}:`);
      changes.forEach(change => console.log(`   • ${change}`));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 修复文件失败 ${filePath}:`, error.message);
    return false;
  }
}

/**
 * 递归扫描目录
 */
function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 跳过node_modules等目录
        if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'build') {
          results.push(...scanDirectory(fullPath, extensions));
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    });
  } catch (error) {
    console.error(`❌ 扫描目录失败 ${dir}:`, error.message);
  }
  
  return results;
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 React组件属性和CSS属性修复工具');
  console.log('=' .repeat(50));
  console.log('修复批量转换工具错误地将React和CSS属性名转换的问题\n');
  
  const srcDir = path.join(__dirname, '..', 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src目录不存在:', srcDir);
    process.exit(1);
  }
  
  console.log('📁 扫描目录:', srcDir);
  const files = scanDirectory(srcDir);
  
  console.log(`📄 找到 ${files.length} 个文件需要检查\n`);
  
  let fixedFiles = 0;
  
  files.forEach(file => {
    const fixed = fixReactCSSPropsInFile(file);
    if (fixed) {
      fixedFiles++;
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 修复结果汇总:');
  console.log(`- 检查文件: ${files.length}`);
  console.log(`- 修复文件: ${fixedFiles}`);
  
  if (fixedFiles > 0) {
    console.log('\n✅ React组件属性和CSS属性修复完成！');
    console.log('💡 建议重启开发服务器以确保更改生效');
    console.log('💡 可以运行 npm run check 检查是否还有其他错误');
  } else {
    console.log('\n✅ 没有发现需要修复的React组件属性和CSS属性');
  }
}

// 运行修复
if (require.main === module) {
  main();
}

module.exports = { fixReactCSSPropsInFile, scanDirectory, REACT_PROP_FIXES, CSS_PROP_FIXES };