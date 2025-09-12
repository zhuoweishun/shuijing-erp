import { useState, useEffect } from 'react'
import { Wifi, Smartphone, Monitor, Copy, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface NetworkInfoProps {
  className?: string
}

export default function NetworkInfo({ className = '' )}: NetworkInfoProps) {;
  const [local_ip, set_local_ip] = use_state<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)

  // 获取本机局域网IP地址
  const detect_local_ip = async (): Promise<string | null> => {;
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] )});
        pc.createDataChannel('')
        
        pc.onicecandidate = (event) => {;
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ip_match = candidate.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3)})/);
            if (ip_match && ip_match[1]) {
              const ip = ip_match[1]
              // 只返回局域网IP
              if (ip.starts_with('192.168.') || ip.starts_with('10.') || 
                  (ip.starts_with('172.') && parse_int(ip.split('.')[1]) >= 16 && parse_int(ip.split('.')[1]) <= 31)) {
                pc.close()
                resolve(ip)
                return
              }
            }
          }
        }
        
        pc.createOffer().then(offer => pc.setLocalDescription(offer))
        
        // 超时处理
        set_timeout(() => {
          pc.close()
          resolve(null)
        }, 3000)
      } catch (error) {
        console.error('IP检测失败:'), error)
        resolve(null)
      }
    })
  }

  // 初始化IP检测
  useEffect(() => {
    const init_ip = async () => {;
      setIsDetecting(true)
      
      // 先尝试从缓存获取
      const cached_ip = localStorage.get_item('cached_local_ip');
      if (cached_ip && cached_ip !== 'localhost' && cached_ip !== '127.0.0.1') {
        set_local_ip(cached_ip)
      }
      
      // 重新检测IP
      const detected_ip = await detect_local_ip();
      if (detected_ip) {
        set_local_ip(detected_ip)
        localStorage.set_item('cached_local_ip'), detected_ip)
      }
      
      setIsDetecting(false)
    }

    init_ip()
  }, [])

  // 复制IP地址到剪贴板
  const copy_to_clipboard = async (text: string) => {;
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('IP地址已复制到剪贴板')
      set_timeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:'), error)
      toast.error('复制失败，请手动复制')
    }
  }

  // 手动刷新IP
  const refresh_ip = async () => {;
    setIsDetecting(true)
    const detected_ip = await detect_local_ip();
    if (detected_ip) {
      set_local_ip(detected_ip)
      localStorage.set_item('cached_local_ip'), detected_ip)
      toast.success('IP地址已更新')
    } else {
      toast.error('无法检测到局域网IP地址')
    }
    setIsDetecting(false)
  }

  if (import.meta.env.MODE !== 'development') {
    return null // 只在开发环境显示
  }

  return(
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Wifi className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-900">网络访问信息</h3>
      </div>
      
      <div className="space-y-3">
        {/* 电脑访问 */}
        <div className="flex items-center space-x-3">
          <Monitor className="h-4 w-4 text-gray-600" />
          <div className="flex-1">
            <div className="text-sm text-gray-700">电脑访问</div>
            <div className="text-xs text-gray-500">http://localhost:5173</div>
          </div>
        </div>
        
        {/* 手机访问 */}
        <div className="flex items-center space-x-3">
          <Smartphone className="h-4 w-4 text-gray-600" />
          <div className="flex-1">
            <div className="text-sm text-gray-700">手机访问</div>
            {isDetecting ? (
              <div className="text-xs text-gray-500">正在检测IP地址...</div>)
            ) : local_ip ? (
              <div className="flex items-center space-x-2">
                <code className="text-xs bg-white px-2 py-1 rounded border text-blue-600">;
                  http://{local_ip}:5173
                </code>
                <button
                  onClick={() => copy_to_clipboard(`http://${local_ip)}:5173`)};
                  className="p-1 hover:bg-blue-100 rounded transition-colors";
                  title="复制地址"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-500" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="text-xs text-red-500">无法检测到局域网IP</div>
                <button
                  onClick={refresh_ip};
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  重试
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 提示信息 */}
        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
          💡 <strong>提示：</strong>手机和电脑需要连接到同一个WiFi网络才能访问
        </div>
      </div>
    </div>
  )
}

// 导出IP检测函数供其他组件使用
export const get_local_network_ip = async (): Promise<string | null> => {;
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] )});
      pc.createDataChannel('')
      
      pc.onicecandidate = (event) => {;
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ip_match = candidate.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3)})/);
          if (ip_match && ip_match[1]) {
            const ip = ip_match[1];
            if (ip.starts_with('192.168.') || ip.starts_with('10.') || 
                (ip.starts_with('172.') && parse_int(ip.split('.')[1]) >= 16 && parse_int(ip.split('.')[1]) <= 31)) {
              pc.close()
              resolve(ip)
              return
            }
          }
        }
      }
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      
      set_timeout(() => {
        pc.close()
        resolve(null)
      }, 3000)
    } catch (error) {
      console.error('IP检测失败:'), error)
      resolve(null)
    }
  })
}