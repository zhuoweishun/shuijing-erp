import { useState, useEffect } from 'react';

interface DeviceInfo {
  is_mobile: boolean;
  is_tablet: boolean;
  is_desktop: boolean;
  screen_width: number;
  screen_height: number;
  user_agent: string;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [device_info, set_device_info] = useState<DeviceInfo>({
    is_mobile: false,
    is_tablet: false,
    is_desktop: true,
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    user_agent: navigator.userAgent
  });

  useEffect(() => {
    const detect_device = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const user_agent = navigator.userAgent;
      
      const is_mobile = width <= 768;
      const is_tablet = width > 768 && width <= 1024;
      const is_desktop = width > 1024;
      
      set_device_info({
        is_mobile,
        is_tablet,
        is_desktop,
        screen_width: width,
        screen_height: height,
        user_agent
      });
    };

    detect_device();
    window.addEventListener('resize', detect_device);
    
    return () => {
      window.removeEventListener('resize', detect_device);
    };
  }, []);

  return device_info;
};

export default useDeviceDetection;
