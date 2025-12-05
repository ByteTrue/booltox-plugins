import { useState, useEffect } from 'react';
import { useBackend, useBackendEvent, useWindowTitle } from '@booltox/plugin-sdk';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function App() {
  const [remaining, setRemaining] = useState(25 * 60); // 25 分钟
  const [isRunning, setIsRunning] = useState(false);
  const [duration] = useState(25 * 60);

  const { backend, isConnected, isConnecting } = useBackend();

  // 设置窗口标题
  useWindowTitle('番茄钟');

  // 监听后端事件
  useBackendEvent(backend, '$event', (data: any) => {
    if (data.type === 'tick') {
      setRemaining(data.remaining);
    } else if (data.type === 'complete') {
      setIsRunning(false);
    } else if (data.type === 'reset') {
      setRemaining(data.remaining);
    }
  });

  // 开始/暂停
  const handleToggle = async () => {
    if (!backend) return;

    try {
      if (isRunning) {
        await backend.call('pause');
        setIsRunning(false);
      } else {
        await backend.call('start');
        setIsRunning(true);
      }
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  // 重置
  const handleReset = async () => {
    if (!backend) return;

    try {
      await backend.call('reset');
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

  if (!isConnected) {
    return (
      <div className="app">
        <div className="error">后端连接失败</div>
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
