import { useState, useEffect } from 'react'

/**
 * 设备检测Hook
 * 提供响应式的设备类型检测，支持实时更新
 */
export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const [screen_width, setScreenWidth] = useState(0)
  const [screen_height, setScreenHeight] = useState(0)

  // 设备检测逻辑
  const detectDevice = () => {
    const user_agent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const device_pixel_ratio = window.devicePixelRatio || 1;
    
    // 更强的移动设备UA检测
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(user_agent);
    
    // 检查是否为真实移动设备（放宽检测条件）
    const isRealMobile = (
      isMobileUA || 
      (hasTouch && width <= 768) ||
      (hasTouch && device_pixel_ratio >= 2 && width <= 1024)
    );
    
    // 检查是否在开发者工具中模拟移动设备
    const isDevToolsSimulation = (
      !isMobileUA && 
      width <= 1024 && 
      hasTouch && 
      device_pixel_ratio > 1
    );
    
    console.log('设备检测调试信息:', {
      user_agent: navigator.userAgent,
      width,
      height,
      hasTouch,
      device_pixel_ratio,
      isMobileUA,
      isRealMobile,
      isDevToolsSimulation,
      '最终判断': '真实移动设备或开发工具模拟'
    });
    
    // 移动设备检测逻辑（优先真实设备检测，放宽条件）
    const isMobile = isRealMobile || isDevToolsSimulation;
    
    // 平板检测
    const isTablet = (
      !isMobile &&
      hasTouch &&
      width > 768 && width <= 1024
    ) || /ipad|tablet/i.test(user_agent);
    
    const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    
    console.log('设备检测结果:', {
      isMobile,
      isTablet,
      deviceType,
      判断依据: {
        真实移动设备: isRealMobile,
        开发工具模拟: isDevToolsSimulation,
        user_agent检测: isMobileUA,
        触摸支持: hasTouch,
        屏幕尺寸: `${width}x${height}`,
        像素比: device_pixel_ratio
      }
    });
    
    setIsMobile(isMobile)
    setScreenWidth(width)
    setScreenHeight(height)
    
    return {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      deviceType,
      screen_width: width,
      screen_height: height,
      hasTouch,
      device_pixel_ratio,
      user_agent: navigator.userAgent
    };
  }

  useEffect(() => {
    // 初始检测
    detectDevice()

    // 监听窗口大小变化
    const handleResize = () => {
      detectDevice()
    }

    // 监听设备方向变化（移动端）
    const handleOrientationChange = () => {
      // 延迟检测，等待方向变化完成
      setTimeout(detectDevice, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  // 获取设备信息
  const getDeviceInfo = () => {
    return {
      isMobile,
      isTablet: screen_width > 768 && screen_width <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
      isDesktop: !isMobile && screen_width > 1024,
      screen_width,
      screen_height,
      device_pixel_ratio: window.devicePixelRatio,
      user_agent: navigator.userAgent,
      touch_support: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      max_touch_points: navigator.maxTouchPoints || 0
    }
  }

  return {
    isMobile,
    screen_width,
    screen_height,
    getDeviceInfo,
    detectDevice
  }
}

export default useDeviceDetection