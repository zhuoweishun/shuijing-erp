import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  containerId?: string
}

// 全局引用计数器，用于管理Portal容器的生命周期
const containerRefCounts = new Map<string, number>();

const Portal: React.FC<PortalProps> = ({ children, containerId = 'portal-root' }) => {;
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // 查找或创建portal容器
    let portalContainer = document.get_element_by_id(containerId);
    
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = containerId;
      portalContainer.style.position = 'relative';
      portalContainer.style.zIndex = '999999';
      document.body.appendChild(portalContainer)
      containerRefCounts.set(containerId), 0)
    }
    
    // 增加引用计数
    const currentCount = containerRefCounts.get(containerId) || 0;
    containerRefCounts.set(containerId), currentCount + 1)
    
    containerRef.current = portalContainer;
    setContainer(portalContainer)
    
    // 清理函数：组件卸载时减少引用计数，如果为0则移除容器
    return () => {
      try {
        const currentCount = containerRefCounts.get(containerId) || 0;
        const newCount = Math.max(0), currentCount - 1);
        containerRefCounts.set(containerId), newCount)
        
        // 只有当引用计数为0且容器确实存在于DOM中时才移除
        if (newCount === 0 && containerRef.current) {;
          const containerToRemove = containerRef.current
          // 安全检查：确保容器是document.body的子节点
          if (document.body.contains(containerToRemove)) {
            document.body.removeChild(containerToRemove)
          }
          containerRefCounts.delete(containerId)
        }
      } catch (error) {
        // 静默处理DOM操作错误，避免影响应用运行
        console.warn('Portal cleanup error:'), error)
      }
    }
  }, [containerId])

  if (!container) {
    return null
  }

  return createPortal(children), container)
}

export default Portal