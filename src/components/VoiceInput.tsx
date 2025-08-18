import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

// 声明 SpeechRecognition 类型
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface VoiceInputProps {
  onVoiceResult: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export default function VoiceInput({ onVoiceResult, placeholder = "点击麦克风开始语音输入", className = "" }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      
      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript) {
          onVoiceResult(finalTranscript);
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        setIsListening(false);
        
        // 提供错误反馈
        switch (event.error) {
          case 'no-speech':
            toast.error('未检测到语音，请重试');
            break;
          case 'audio-capture':
            toast.error('无法访问麦克风，请检查权限设置');
            break;
          case 'not-allowed':
            toast.error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
            break;
          default:
            toast.error('语音识别出错，请重试');
        }
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onVoiceResult]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('启动语音识别失败:', error);
        toast.error('启动语音识别失败，请重试');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center text-gray-400 ${className}`}>
        <MicOff className="w-4 h-4 mr-1" />
        <span className="text-xs">浏览器不支持语音输入</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={toggleListening}
        className={`p-2 rounded-full transition-colors ${
          isListening 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
        }`}
        title={isListening ? '点击停止录音' : '点击开始语音输入'}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      
      {isListening && (
        <div className="flex items-center space-x-2 text-sm">
          <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-red-500">正在听...</span>
        </div>
      )}
      
      {transcript && (
        <div className="flex-1 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
          {transcript}
        </div>
      )}
    </div>
  );
}