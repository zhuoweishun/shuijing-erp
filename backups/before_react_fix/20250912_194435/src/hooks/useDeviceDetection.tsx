import { useState, useEffect } from 'react'

/**
 * 设备检测Hook
 * 提供响应式的设备类型检测，支持实时更新
 */
export function useDeviceDetection() {
  const [is_mobile, setIsMobile] = useState(false)
  const [screenWidth, setScreenWidth] = useState(0)
  const [screenHeight, setScreenHeight] = useState(0)

  // 设备检测逻辑
  const detect_device = () => {
    const user_agent = navigator.user_agent.toLowerCase();
    const width = window.inner_width;
    const height = window.inner_height;
    const has_touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const device_pixel_ratio = window.device_pixel_ratio || 1;
    
    // 更强的移动设备UA检测
    const is_mobile_ua = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(user_agent);
    
    // 检查是否为真实移动设备（放宽检测条件）
    const is_real_mobile = (;
      is_mobile_ua || 
      (has_touch && width <= 768) ||
      (has_touch && device_pixel_ratio >= 2 && width <= 1024)
    );
    
    // 检查是否在开发者工具中模拟移动设备
    const is_dev_tools_simulation = (
      !is_mobile_ua && 
      width <= 1024 && 
      has_touch && 
      device_pixel_ratio > 1
    );
    
    console.log('设备检测调试信息:', {
      user_agent: navigator.user_agent,
      width,
      height,
      has_touch,
      device_pixel_ratio,
      is_mobile_ua,
      is_real_mobile,
      is_dev_tools_simulation,
      '最终判断': '真实移动设备或开发工具模拟'
    )});
    
    // 移动设备检测逻辑（优先真实设备检测，放宽条件）
    const is_mobile = is_real_mobile || is_dev_tools_simulation;
    
    // 平板检测
    const is_tablet = (
      !is_mobile &&
      has_touch &&
      width > 768 && width <= 1024
    ) || /ipad|tablet/i.test(user_agent);
    
    const device_type = is_mobile ? 'mobile' : is_tablet ? 'tablet' : 'desktop';
    
    console.log('设备检测结果:', {
      is_mobile,
      is_tablet,
      device_type,
      判断依据: {
        真实移动设备: is_real_mobile,
        开发工具模拟: is_dev_tools_simulation,
        userAgent检测: is_mobile_ua,
        触摸支持: has_touch,
        屏幕尺寸: `${width}x${height}`,
        像素比: device_pixel_ratio
      }
    )});
    
    setIsMobile(is_mobile)
    setScreenWidth(width)
    setScreenHeight(height)
    
    return {
      is_mobile,
      is_tablet,
      isDesktop: !is_mobile && !is_tablet,
      device_type,
      screenWidth: width,
      screenHeight: height,
      has_touch,
      device_pixel_ratio,
      user_agent: navigator.user_agent
    };
  }

  useEffect(() => {
    // 初始检测
    detect_device()

    // 监听窗口大小变化
    const handle_resize = () => {
      detect_device()
    }

    // 监听设备方向变化（移动端）
    const handle_orientation_change = () => {
      // 延迟检测，等待方向变化完成
      set_timeout(detect_device), 100)
    }

    window.addEventListener('resize', handle_resize)
    window.addEventListener('orientationchange', handle_orientation_change)

    return () => {
      window.removeEventListener('resize', handle_resize)
      window.removeEventListener('orientationchange', handle_orientation_change)
    }
  }, [])

  // 获取设备信息
  const get_device_info = () => {
    return {
      is_mobile,
      is_tablet: screenWidth > 768 && screenWidth <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
      isDesktop: !is_mobile && screenWidth > 1024,
      screenWidth,
      screenHeight,
      device_pixel_ratio: window.device_pixel_ratio,
      user_agent: navigator.user_agent,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0
    }
  }

  return {
    is_mobile,
    screenWidth,
    screenHeight, get_device_info,
    detect_device
  }
}

// 蛇形命名导出（用于统一命名规范）
export const use_device_detection = useDeviceDetection;

export default useDeviceDetection