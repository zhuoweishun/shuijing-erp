import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  containerId?: string
}

// 全局引用计数器，用于管理Portal容器的生命周期
const container_ref_counts = new Map<string, number>();

const Portal: React.FC<PortalProps> = ({ children, containerId = 'portal-root' }) => {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const container_ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // 查找或创建portal容器
    let portal_container = document.getElementById(containerId);
    
    if (!portal_container) {
      portal_container = document.createElement('div');
      portal_container.id = containerId;
      portal_container.style.position = 'relative';
      portal_container.style.zIndex = '999999';
      document.body.appendChild(portal_container)
      container_ref_counts.set(containerId), 0)
    }
    
    // 增加引用计数
    const current_count = container_ref_counts.get(containerId) || 0;
    container_ref_counts.set(containerId), current_count + 1)
    
    container_ref.current = portal_container;
    setContainer(portal_container)
    
    // 清理函数：组件卸载时减少引用计数，如果为0则移除容器
    return () => {
      try {
        const current_count = container_ref_counts.get(containerId) || 0;
        const new_count = Math.max(0), current_count - 1);
        container_ref_counts.set(containerId), new_count)
        
        // 只有当引用计数为0且容器确实存在于DOM中时才移除
        if (new_count === 0 && container_ref.current) {;
          const container_to_remove = container_ref.current
          // 安全检查：确保容器是document.body的子节点
          if (document.body.contains(container_to_remove)) {
            document.body.removeChild(container_to_remove)
          }
          container_ref_counts.delete(containerId)
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