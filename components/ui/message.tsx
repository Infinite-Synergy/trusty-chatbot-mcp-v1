"use client"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Copy, ThumbsUp, ThumbsDown } from "lucide-react"
import React, { useState } from "react"
import ReactMarkdown from 'react-markdown'

import remarkGfm from 'remark-gfm'

interface MessageProps {
  content: string
  role: "user" | "assistant"
  timestamp?: Date
  className?: string
}

// Function to convert plain text with \n characters to proper markdown
function convertToMarkdown(text: string): string {
  // First, convert \n\n to actual double newlines for paragraph breaks
  let converted = text.replace(/\\n\\n/g, '\n\n')
  
  // Convert single \n to actual newlines  
  converted = converted.replace(/\\n/g, '\n')
  
  // Split by double newlines to get paragraphs
  const paragraphs = converted.split('\n\n')
  
  return paragraphs.map(paragraph => {
    // Clean up the paragraph
    paragraph = paragraph.trim()
    
    // Detect if this is a list (starts with - or *)
    if (paragraph.includes('\n- ') || paragraph.includes('\n* ') || paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
      return paragraph // Keep lists as-is, markdown will handle them
    }
    
    // Detect code blocks - look for function definitions, imports, etc.
    const codePatterns = [
      /^(import|from|def|class|function|const|let|var|if|for|while)/m,
      /^[ ]*[a-zA-Z_][a-zA-Z0-9_]*\s*[=:]/m,
      /^[ ]*[{}[\]()]/m,
      /^\s*\/\/|^\s*#|^\s*\/\*/m, // Comments
      /;\s*$/m // Semicolons at end of lines
    ]
    
    const hasCode = codePatterns.some(pattern => pattern.test(paragraph))
    const hasMultipleLines = paragraph.includes('\n')
    const looksLikeCode = hasCode && hasMultipleLines && paragraph.split('\n').length > 2
    
    // If it looks like code, wrap in code block
    if (looksLikeCode) {
      // Try to detect language
      let language = 'text'
      if (paragraph.includes('import ') || paragraph.includes('def ') || paragraph.includes('print(')) {
        language = 'python'
      } else if (paragraph.includes('function ') || paragraph.includes('const ') || paragraph.includes('console.log')) {
        language = 'javascript'
      } else if (paragraph.includes('#include') || paragraph.includes('int main')) {
        language = 'c'
      } else if (paragraph.includes('public class') || paragraph.includes('System.out')) {
        language = 'java'
      }
      
      return '```' + language + '\n' + paragraph + '\n```'
    }
    
    // Regular paragraph - return as-is
    return paragraph
  }).join('\n\n')
}

export function Message({ content, role, timestamp, className }: MessageProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // DEBUG: Log all server responses (assistant messages)
  if (role === 'assistant') {
    const processedContent = content.replace(/\\n/g, '\n');
    console.log('🤖 [Message.tsx] Assistant message rendering:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 100) + '...',
      rawContent: content,
      processedContent: processedContent,
      hasLiteralNewlines: content.includes('\\n'),
      hasActualNewlines: content.includes('\n')
    });
  }

  // Convert plain text to markdown for assistant messages
  const markdownContent = role === "assistant" ? convertToMarkdown(content) : content

  return (
    <div className={cn("flex w-full", role === "user" ? "justify-end" : "justify-start", className)}>
      <div className="flex gap-3 max-w-[85%]">
        {/* User messages: Avatar on right, message on left */}
        {role === "user" ? (
          <>
            <div className="group relative rounded-2xl px-4 py-3 shadow-sm transition-all bg-gray-600 text-white">
              <div className="text-sm leading-relaxed text-white">
                <p className="whitespace-pre-wrap m-0">{content}</p>
              </div>

              {/* Timestamp */}
              {timestamp && (
                <div className="mt-2 text-xs opacity-60 text-gray-100">
                  {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-gray-600 text-white">
                U
              </AvatarFallback>
            </Avatar>
          </>
        ) : (
          <>
            {/* Assistant messages: Avatar on left, message on right */}
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-gray-200 text-gray-700">
                🤖
              </AvatarFallback>
            </Avatar>
            
            <div className="group relative rounded-2xl px-4 py-3 shadow-sm transition-all bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 prose prose-sm dark:prose-invert max-w-none break-words">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Handle text nodes with newlines (both \n and actual newlines)
                    text({children}: any) {
                      if (typeof children === 'string') {
                        // Handle both literal \n sequences and actual newlines
                        const processedText = children.replace(/\\n/g, '\n');
                        
                        if (processedText.includes('\n')) {
                          return (
                            <>
                              {processedText.split('\n').map((line, index, array) => (
                                <React.Fragment key={index}>
                                  {line}
                                  {index < array.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                            </>
                          )
                        }
                      }
                      return <>{children}</>
                    },
                    // Code blocks
                    code({inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      const language = match ? match[1] : ''
                      
                      return !inline ? (
                        <pre className="bg-gray-900 dark:bg-gray-800 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto border">
                          <code className="text-sm font-mono whitespace-pre">
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded text-sm font-mono border">
                          {children}
                        </code>
                      )
                    },
                    
                    // Paragraphs with newline support
                    p({children}) {
                      return <p className="mb-3 leading-relaxed whitespace-pre-line">{children}</p>
                    },
                    
                    // Headers
                    h1({children}) {
                      return <h1 className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100">{children}</h1>
                    },
                    h2({children}) {
                      return <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{children}</h2>
                    },
                    h3({children}) {
                      return <h3 className="text-md font-medium mb-2 text-gray-900 dark:text-gray-100">{children}</h3>
                    },
                    
                    // Lists
                    ul({children}) {
                      return <ul className="list-disc ml-6 mb-3 space-y-1">{children}</ul>
                    },
                    ol({children}) {
                      return <ol className="list-decimal ml-6 mb-3 space-y-1">{children}</ol>
                    },
                    li({children}) {
                      return <li className="leading-relaxed">{children}</li>
                    },
                    
                    // Links
                    a({href, children}) {
                      return (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {children}
                        </a>
                      )
                    },
                    
                    // Tables
                    table({children}) {
                      return (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border border-gray-300 dark:border-gray-600 rounded-lg">
                            {children}
                          </table>
                        </div>
                      )
                    },
                    th({children}) {
                      return (
                        <th className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-left font-semibold">
                          {children}
                        </th>
                      )
                    },
                    td({children}) {
                      return (
                        <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                          {children}
                        </td>
                      )
                    },
                    
                    // Blockquotes
                    blockquote({children}) {
                      return (
                        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-3 italic text-gray-700 dark:text-gray-300">
                          {children}
                        </blockquote>
                      )
                    },
                    
                    // Strong and emphasis
                    strong({children}) {
                      return <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
                    },
                    em({children}) {
                      return <em className="italic">{children}</em>
                    },
                  }}
                >
                  {content.replace(/\\n/g, '\n')}
                </ReactMarkdown>
              </div>

              {/* Message Actions */}
              <div className="absolute -bottom-8 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  onClick={copyToClipboard}
                  title={copied ? "Copied!" : "Copy message"}
                >
                  <Copy className={cn("h-3 w-3", copied && "text-green-500")} />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Timestamp */}
              {timestamp && (
                <div className="mt-2 text-xs opacity-60 text-gray-500">
                  {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}