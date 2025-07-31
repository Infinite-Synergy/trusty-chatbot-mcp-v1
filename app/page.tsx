'use client'

import { Sidebar } from '@/components/ui/sidebar'
import { MainChat } from '@/components/ui/main-chat'
import { useState } from 'react'

export default function Home() {
  const [chatKey, setChatKey] = useState(0)

  const handleNewChat = () => {
    setChatKey(prev => prev + 1) // Force re-render
  }

  return (
    <main className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar 
        className="w-80 flex-shrink-0 h-full" 
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col h-full min-h-0">
        <MainChat 
          key={chatKey}
          onNewChat={handleNewChat}
        />
      </div>
    </main>
  )
} 