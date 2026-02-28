import { useState, useRef, useEffect } from 'react'
import { User, Bot, Send, Loader2 } from 'lucide-react'
import * as webLLM from '@mlc-ai/web-llm'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatProps {
  selectedModel: string
}

export function Chat({ selectedModel }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isModelReady, setIsModelReady] = useState(false)
  const [engine, setEngine] = useState<webLLM.MLCEngineInterface | null>(null)
  const [progress, setProgress] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const initEngine = async () => {
      try {
        // 初始化引擎（WebGPU）
        const newEngine = await webLLM.CreateMLCEngine(selectedModel, {
          initProgressCallback: (report) => {
            console.log('[MLC]', report.text)
            setProgress(`${report.progress.toFixed(2)}% - ${report.text}`)
          },
        })

        setEngine(newEngine)
        setIsModelReady(true)
        setProgress('✓ 模型加载完成！')
      } catch (error) {
        console.error('模型加载失败:', error)
        setProgress('模型加载失败，请检查浏览器是否支持 WebGPU')
      }
    }

    initEngine()
  }, [selectedModel])

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!input.trim() || !engine || !isModelReady) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const messagesForEngine = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
      messagesForEngine.push({ role: 'user', content: input })

      const reply = await engine.chat.completions.create({
        messages: messagesForEngine,
      })

      const assistantMessage: Message = {
        role: 'assistant',
        content: reply.choices[0].message.content || '',
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('生成回复失败:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '生成回复时出错，请重试。' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Model Status */}
      <div className="p-4 bg-linear-to-r from-brand-start to-brand-end text-white text-center min-h-20 flex items-center justify-center">
        {!isModelReady ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm">{progress || '正在加载模型...'}</p>
            <p className="text-xs opacity-90">首次加载约需 1-2 分钟，请耐心等待</p>
          </div>
        ) : (
          <p className="font-semibold text-base">✓ 模型已就绪</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center py-12 px-8 text-slate-600">
            <Bot className="w-12 h-12 mx-auto mb-4 text-brand-start" />
            <h2 className="text-2xl font-bold text-slate-800 mb-4">欢迎使用 Web LLM 聊天</h2>
            <p className="mb-2">模型加载完成后，你可以开始聊天了！</p>
            <p className="text-sm">所有处理都在本地浏览器中完成，不会发送到服务器。</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user' ? 'bg-linear-to-br from-user-gradient-start to-user-gradient-end text-white' : 'bg-linear-to-br from-brand-start to-brand-end text-white'}`}>
              {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className="max-w-[70%] flex flex-col gap-1">
              <div className="text-xs text-slate-500 px-2">{message.role === 'user' ? '你' : 'AI 助手'}</div>
              <div className={`p-3 rounded-xl leading-relaxed break-words whitespace-pre-wrap ${message.role === 'assistant' ? 'bg-white text-slate-800 shadow-sm' : 'bg-linear-to-br from-brand-start to-brand-end text-white'}`}>
                {message.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-linear-to-br from-brand-start to-brand-end text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-slate-500 px-2">AI 助手</div>
              <div className="p-3 rounded-xl bg-white flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse delay-100" />
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-4 bg-white border-t border-slate-200">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isModelReady ? '输入消息...' : '等待模型加载...'}
          disabled={!isModelReady || isLoading}
          className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-full text-base outline-none focus:border-brand-start focus:ring-4 focus:ring-brand-start/10 disabled:bg-slate-100 disabled:cursor-not-allowed transition-all"
        />
        <button
          type="submit"
          disabled={!isModelReady || !input.trim() || isLoading}
          className="px-6 py-3 bg-linear-to-r from-brand-start to-brand-end text-white rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-start/40 active:translate-y-0 transition-all flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              发送中
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              发送
            </>
          )}
        </button>
      </form>
    </div>
  )
}
