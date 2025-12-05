import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

// 声明全局 window.booltox API
declare global {
  interface Window {
    booltox?: {
      backend: {
        register: () => Promise<{ channelId: string }>;
        call: (
          channelId: string,
          method: string,
          params?: any,
          timeout?: number
        ) => Promise<any>;
        notify: (channelId: string, method: string, params?: any) => Promise<void>;
        on: (
          channelId: string,
          event: string,
          listener: (data: any) => void
        ) => () => void;
        off: (channelId: string, event: string, listener?: (data: any) => void) => void;
        isReady: (channelId: string) => boolean;
        waitForReady: (channelId: string, timeout?: number) => Promise<void>;
      };
      window: {
        setTitle: (title: string) => Promise<void>;
      };
    };
  }
}

export default function App() {
  const [remaining, setRemaining] = useState(25 * 60); // 25 分钟
  const [isRunning, setIsRunning] = useState(false);
  const [duration] = useState(25 * 60);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 连接后端
  useEffect(() => {
    async function connectBackend() {
      try {
        if (!window.booltox) {
          throw new Error('Booltox API not available');
        }

        // 注册后端
        const handle = await window.booltox.backend.register();
        setChannelId(handle.channelId);

        // 等待就绪
        await window.booltox.backend.waitForReady(handle.channelId, 10000);

        // 设置窗口标题
        await window.booltox.window.setTitle('番茄钟');

        // 监听后端事件
        window.booltox.backend.on(handle.channelId, '$event', (data: any) => {
          if (data.type === 'tick') {
            setRemaining(data.remaining);
          } else if (data.type === 'complete') {
            setIsRunning(false);
          } else if (data.type === 'reset') {
            setRemaining(data.remaining);
          }
        });

        setIsConnecting(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setIsConnecting(false);
      }
    }

    connectBackend();
  }, []);

  // 开始/暂停
  const handleToggle = async () => {
    if (!channelId || !window.booltox) return;

    try {
      if (isRunning) {
        await window.booltox.backend.call(channelId, 'pause');
        setIsRunning(false);
      } else {
        await window.booltox.backend.call(channelId, 'start');
        setIsRunning(true);
      }
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  // 重置
  const handleReset = async () => {
    if (!channelId || !window.booltox) return;

    try {
      await window.booltox.backend.call(channelId, 'reset');
      setIsRunning(false);
      setRemaining(duration);
    } catch (error) {
      console.error('Reset failed:', error);
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 计算进度百分比
  const progress = ((duration - remaining) / duration) * 100;

  if (isConnecting) {
    return (
      <div className="app">
        <div className="loading">连接后端中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">🍅 番茄钟</h1>

        {/* 计时器显示 */}
        <div className="timer-container">
          {/* 进度环 */}
          <svg className="progress-ring" width="280" height="280">
            <circle
              className="progress-ring-bg"
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="#f5f5f5"
              strokeWidth="8"
            />
            <motion.circle
              className="progress-ring-fill"
              cx="140"
              cy="140"
              r="120"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100),
              }}
              transition={{ duration: 0.3 }}
            />
          </svg>

          {/* 时间显示 */}
          <div className="time-display">{formatTime(remaining)}</div>
        </div>

        {/* 控制按钮 */}
        <div className="controls">
          <motion.button
            onClick={handleToggle}
            className={`btn btn-primary ${isRunning ? 'running' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isRunning ? (
              <>
                <Pause size={20} />
                <span>暂停</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>开始</span>
              </>
            )}
          </motion.button>

          <motion.button
            onClick={handleReset}
            className="btn btn-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isRunning}
          >
            <RotateCcw size={20} />
            <span>重置</span>
          </motion.button>
        </div>

        {/* 提示文本 */}
        <div className="hint">
          {isRunning ? '专注工作中...' : '点击开始按钮开始专注'}
        </div>
      </div>
    </div>
  );
}
