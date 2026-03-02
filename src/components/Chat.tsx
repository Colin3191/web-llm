import { useState, useRef, useEffect, useCallback } from 'react'
import { UserOutlined, RobotOutlined } from '@ant-design/icons'
import { Bubble, Sender } from '@ant-design/x'
import type { BubbleListRef } from '@ant-design/x/es/bubble/interface'
import * as webLLM from '@mlc-ai/web-llm'

interface Message {
  key: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

const MODELS = [
  'Qwen3-0.6B-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2-0.5B-Instruct-q4f16_1-MLC',
]

export function Chat() {
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isModelReady, setIsModelReady] = useState(false)
  const [engine, setEngine] = useState<webLLM.MLCEngineInterface | null>(null)
  const [progress, setProgress] = useState('')
  const listRef = useRef<BubbleListRef>(null)
  const idCounter = useRef(0)

  useEffect(() => {
    // 切换模型时重置状态
    setMessages([])
    setIsModelReady(false)
    setIsLoading(false)
    setEngine(null)
    setProgress('')

    const initEngine = async () => {
      try {
        const newEngine = await webLLM.CreateMLCEngine(selectedModel, {
          initProgressCallback: (report) => {
            setProgress(`${(report.progress * 100).toFixed(0)}% - ${report.text}`)
          },
        })
        setEngine(newEngine)
        setIsModelReady(true)
        setProgress('✓ 模型加载完成')
      } catch (error) {
        console.error('模型加载失败:', error)
        setProgress('模型加载失败，请检查浏览器是否支持 WebGPU')
      }
    }
    initEngine()
  }, [selectedModel])

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || !engine || !isModelReady) return

    const userKey = `msg-${idCounter.current++}`
    const assistantKey = `msg-${idCounter.current++}`

    const userMsg: Message = { key: userKey, role: 'user', content: text }
    const assistantMsg: Message = { key: assistantKey, role: 'assistant', content: '', loading: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      history.push({ role: 'user', content: text })

      const chunks = await engine.chat.completions.create({
        messages: history,
        stream: true,
        extra_body: { enable_thinking: false },
      })

      let fullContent = ''
      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content || ''
        fullContent += delta
        // 过滤掉 <think>...</think> 内容
        const filtered = fullContent.replace(/<think>[\s\S]*?<\/think>\s*/g, '').replace(/<think>[\s\S]*$/, '')
        setMessages(prev =>
          prev.map(m => m.key === assistantKey ? { ...m, content: filtered, loading: false } : m)
        )
      }
    } catch (error) {
      console.error('生成回复失败:', error)
      setMessages(prev =>
        prev.map(m => m.key === assistantKey ? { ...m, content: '生成回复时出错，请重试。', loading: false } : m)
      )
    } finally {
      setIsLoading(false)
    }
  }, [engine, isModelReady, messages])

  const bubbleItems = messages.map(msg => ({
    key: msg.key,
    role: msg.role === 'user' ? 'user' : 'ai',
    content: msg.content,
    loading: msg.loading,
  }))

  const roles = {
    ai: {
      placement: 'start' as const,
      typing: { effect: 'typing' as const, step: 2, interval: 30 },
      avatar: <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><RobotOutlined /></div>,
    },
    user: {
      placement: 'end' as const,
      avatar: <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#87d068', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><UserOutlined /></div>,
    },
  }

  return (
    <div className="w-full max-w-2xl h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Model Status */}
      <div className="p-3 bg-linear-to-r from-blue-500 to-purple-600 text-white text-center min-h-14 flex items-center justify-center">
        {!isModelReady ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm">{progress || '正在加载模型...'}</p>
          </div>
        ) : (
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm cursor-pointer border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 [&>option]:text-slate-800"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-2">
        <Bubble.List
          ref={listRef}
          autoScroll
          role={roles}
          items={bubbleItems.length > 0 ? bubbleItems : isModelReady ? [{
            key: 'welcome',
            role: 'ai',
            content: '你好！我是本地 AI 助手，所有处理都在浏览器中完成。有什么可以帮你的？',
          }] : []}
          style={{ height: '100%' }}
        />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <Sender
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          disabled={!isModelReady}
          loading={isLoading}
          placeholder={isModelReady ? '输入消息...' : '等待模型加载...'}
        />
      </div>
    </div>
  )
}
