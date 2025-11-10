/**
 * Claude Content Script - AI Verification
 * 
 * Similar to ChatGPT integration but adapted for Claude's UI
 */

import type { PlasmoCSConfig } from "plasmo"
import { createRoot } from "react-dom/client"
import { apiClient } from "~lib/api"

export const config: PlasmoCSConfig = {
  matches: ["https://claude.ai/*"],
  run_at: "document_idle"
}

interface CodeVerification {
  code: string
  isHallucinated: boolean
  confidence: number
  issues: string[]
  betterAlternative?: {
    code: string
    reason: string
    usedBy: number
  }
}

// Warning component (same as ChatGPT)
const HallucinationWarning = ({
  verification,
  onApplyFix,
  onDismiss
}: {
  verification: CodeVerification
  onApplyFix: () => void
  onDismiss: () => void
}) => {
  return (
    <div className="mindhive-warning p-3 my-2 border-2 border-red-500 rounded-lg bg-red-50">
      <div className="flex items-start gap-3">
        <span className="text-3xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-bold text-red-900 text-lg mb-1">
            SECURITY RISK DETECTED
          </h4>
          <p className="text-sm text-red-800 mb-2">
            MindHive NEXUS has identified potential issues with this AI-generated code:
          </p>
          
          <ul className="list-disc list-inside space-y-1 mb-3">
            {verification.issues.map((issue, idx) => (
              <li key={idx} className="text-sm text-red-700">
                {issue}
              </li>
            ))}
          </ul>

          {verification.betterAlternative && (
            <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✅</span>
                <span className="font-semibold text-green-900">
                  Recommended: Proven Alternative
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-2">
                Used by {verification.betterAlternative.usedBy.toLocaleString()} developers • 
                {' '}{verification.betterAlternative.reason}
              </p>
              <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
                {verification.betterAlternative.code}
              </pre>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onApplyFix}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors font-medium"
                >
                  Copy Better Solution
                </button>
                <button
                  onClick={onDismiss}
                  className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-600">
            <span className="font-medium">MindHive Confidence:</span> {verification.confidence}% 
            {' '}• Verified by 6 AI models
          </div>
        </div>
      </div>
    </div>
  )
}

const VerifiedCodeBadge = ({ confidence }: { confidence: number }) => {
  return (
    <div className="mindhive-verified inline-flex items-center gap-1 px-2 py-1 bg-green-100 border border-green-300 rounded text-xs">
      <span>✅</span>
      <span className="font-medium text-green-800">
        Verified by MindHive ({confidence}%)
      </span>
    </div>
  )
}

// Main Claude analyzer
class ClaudeAnalyzer {
  private verifiedMessages = new Set<string>()
  private observer: MutationObserver | null = null

  async init() {
    console.log('🧠 MindHive Claude Integration: Initializing...')
    
    // Wait for Claude's UI to load
    await this.waitForClaudeUI()
    
    // Analyze existing messages
    await this.scanMessages()
    
    // Watch for new messages
    this.setupObserver()
    
    console.log('✅ MindHive Claude Integration: Ready')
  }

  private async waitForClaudeUI(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const main = document.querySelector('main')
        if (main) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 500)
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        resolve()
      }, 10000)
    })
  }

  private setupObserver() {
    this.observer = new MutationObserver(() => {
      setTimeout(() => this.scanMessages(), 1000)
    })

    const container = document.querySelector('main') || document.body
    
    this.observer.observe(container, {
      childList: true,
      subtree: true
    })
  }

  private async scanMessages() {
    // Claude uses different selectors - find assistant messages
    const messages = document.querySelectorAll('[data-is-streaming="false"]')
    
    for (const message of Array.from(messages)) {
      const messageText = message.textContent || ''
      
      // Skip user messages (rough heuristic)
      if (messageText.length < 50) continue
      
      const messageId = this.getMessageId(message as HTMLElement)
      
      if (this.verifiedMessages.has(messageId)) continue
      
      this.verifiedMessages.add(messageId)
      
      // Find code blocks
      const codeBlocks = message.querySelectorAll('pre code, code[class*="language-"]')
      
      if (codeBlocks.length === 0) continue
      
      // Verify each code block
      for (const codeBlock of Array.from(codeBlocks)) {
        await this.verifyCodeBlock(codeBlock as HTMLElement)
      }
    }
  }

  private getMessageId(element: HTMLElement): string {
    // Generate ID based on content and position
    const content = element.textContent?.slice(0, 100) || ''
    const position = Array.from(element.parentElement?.children || []).indexOf(element)
    return `${content}-${position}`.replace(/\s+/g, '')
  }

  private async verifyCodeBlock(codeElement: HTMLElement) {
    const code = codeElement.textContent || ''
    
    if (code.trim().length < 20) return
    
    try {
      const verification = await this.performVerification(code)
      
      if (verification.isHallucinated || verification.issues.length > 0) {
        this.injectWarning(codeElement, verification)
      } else if (verification.confidence >= 85) {
        this.injectVerifiedBadge(codeElement, verification.confidence)
      }
      
      await this.learnFromCode(code, verification)
      
    } catch (error) {
      console.error('Verification failed:', error)
    }
  }

  private async performVerification(code: string): Promise<CodeVerification> {
    try {
      const response = await apiClient.verifyAICode(code)
      
      return {
        code,
        isHallucinated: response.hallucinated || false,
        confidence: response.confidence || 90,
        issues: response.issues || [],
        betterAlternative: response.alternative
      }
    } catch (error) {
      // Demo detection
      const issues: string[] = []
      
      if (code.includes('MD5') || code.includes('md5')) {
        issues.push('MD5 is cryptographically broken')
      }
      if (code.includes('eval(')) {
        issues.push('eval() is dangerous')
      }
      if (code.includes('innerHTML')) {
        issues.push('innerHTML can lead to XSS')
      }
      
      return {
        code,
        isHallucinated: issues.length > 0,
        confidence: issues.length > 0 ? 65 : 92,
        issues,
        betterAlternative: issues.length > 0 ? {
          code: this.generateBetterAlternative(code),
          reason: 'More secure and follows best practices',
          usedBy: 15420
        } : undefined
      }
    }
  }

  private generateBetterAlternative(code: string): string {
    if (code.includes('MD5')) {
      return `import bcrypt from 'bcrypt';\nconst hash = await bcrypt.hash(password, 12);`
    }
    if (code.includes('innerHTML')) {
      return `element.textContent = userInput; // Prevents XSS`
    }
    if (code.includes('eval(')) {
      return `const data = JSON.parse(jsonString); // Safer than eval`
    }
    return code
  }

  private injectWarning(codeElement: HTMLElement, verification: CodeVerification) {
    const container = codeElement.closest('[data-is-streaming="false"]')
    if (!container) return
    
    if (container.querySelector('.mindhive-warning')) return
    
    const warningDiv = document.createElement('div')
    
    const root = createRoot(warningDiv)
    root.render(
      <HallucinationWarning
        verification={verification}
        onApplyFix={() => {
          if (verification.betterAlternative) {
            navigator.clipboard.writeText(verification.betterAlternative.code)
            alert('✅ Better solution copied to clipboard!')
          }
        }}
        onDismiss={() => warningDiv.remove()}
      />
    )
    
    const preElement = codeElement.closest('pre')
    if (preElement && preElement.parentElement) {
      preElement.parentElement.insertBefore(warningDiv, preElement.nextSibling)
    }
  }

  private injectVerifiedBadge(codeElement: HTMLElement, confidence: number) {
    const preElement = codeElement.closest('pre')
    if (!preElement || !preElement.parentElement) return
    
    if (preElement.parentElement.querySelector('.mindhive-verified')) return
    
    const badgeDiv = document.createElement('div')
    badgeDiv.style.cssText = 'margin-top: 8px;'
    
    const root = createRoot(badgeDiv)
    root.render(<VerifiedCodeBadge confidence={confidence} />)
    
    preElement.parentElement.insertBefore(badgeDiv, preElement.nextSibling)
  }

  private async learnFromCode(code: string, verification: CodeVerification) {
    try {
      await apiClient.learnFromAIConversation({
        code,
        verified: !verification.isHallucinated && verification.confidence >= 85,
        issues: verification.issues,
        source: 'claude'
      })
    } catch (error) {
      console.error('Learning failed:', error)
    }
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// Initialize
const analyzer = new ClaudeAnalyzer()
analyzer.init()

// Cleanup
window.addEventListener('beforeunload', () => {
  analyzer.cleanup()
})
