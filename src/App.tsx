import { Bot } from 'lucide-react'
import { Chat } from './components/Chat'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-brand-start to-brand-end">
      <header className="bg-white/95 backdrop-blur px-6 py-6 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
          <Bot className="w-8 h-8 text-brand-start" />
          Web LLM 聊天
        </h1>
        <p className="text-sm text-slate-600">在浏览器中运行本地 AI 模型</p>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <Chat />
      </main>
      <footer className="bg-black/30 text-white text-center py-4 text-sm">
        <p>Powered by MLC WebLLM - 所有计算都在本地完成</p>
      </footer>
    </div>
  )
}

export default App
