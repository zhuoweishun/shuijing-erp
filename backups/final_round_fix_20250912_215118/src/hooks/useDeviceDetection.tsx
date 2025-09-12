import { useState, useEffect } from 'react'
import { useDeviceDetection } from '../hooks/useDeviceDetection';

/**
 * 设备检测Hook
 * 提供响应式的设备类型检测，支持实时更新
 */
export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const [screenWidth, setScreenWidth] = useState(0)
  const [screenHeight, setScreenHeight] = useState(0)

  // 设备检测逻辑
  const detectDevice = () => {
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // 更强的移动设备UA检测
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(user_agent);
    
    // 检查是否为真实移动设备（放宽检测条件）
    const isRealMobile = (
      isMobileUA || 
      (hasTouch && width <= 768) ||
      (hasTouch && devicePixelRatio >= 2 && width <= 1024)
    );
    
    // 检查是否在开发者工具中模拟移动设备
    const isDevToolsSimulation = (
      !isMobileUA && 
      width <= 1024 && 
      hasTouch && 
      devicePixelRatio > 1
    );
    
    console.log('设备检测调试信息:', {
      user_agent: navigator.user_agent,
      width,
      height,
      hasTouch,
      devicePixelRatio,
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
        userAgent检测: isMobileUA,
        触摸支持: hasTouch,
        屏幕尺寸: `${width}x${height}`,
        像素比: devicePixelRatio
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
      screenWidth: width,
      screenHeight: height,
      hasTouch,
      devicePixelRatio,
      user_agent: navigator.user_agent
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
  const get_device_info = () => {
    return {
      isMobile,
      isTablet: screenWidth > 768 && screenWidth <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
      isDesktop: !isMobile && screenWidth > 1024,
      screenWidth,
      screenHeight,
      devicePixelRatio: window.devicePixelRatio,
      user_agent: navigator.user_agent,
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0
    }
  }

  return {
    isMobile,
    screenWidth,
    screenHeight, get_device_info,
    detectDevice
  }
}

// 蛇形命名导出（用于统一命名规范）
export const useDeviceDetection = useDeviceDetection

export default useDeviceDetection