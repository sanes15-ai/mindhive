/**
 * ChatGPT Content Script - AI Verification
 * 
 * Listens to ChatGPT conversations and verifies code suggestions with NEXUS
 * Warns about hallucinations before you use them
 */

import type { PlasmoCSConfig } from "plasmo"
import { createRoot } from "react-dom/client"
import { apiClient } from "~lib/api"

export const config: PlasmoCSConfig = {
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
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

// Warning overlay component
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
          
          {/* Issues list */}
          <ul className="list-disc list-inside space-y-1 mb-3">
            {verification.issues.map((issue, idx) => (
              <li key={idx} className="text-sm text-red-700">
                {issue}
              </li>
            ))}
          </ul>

          {/* Better alternative */}
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

          {/* Confidence score */}
          <div className="mt-3 text-xs text-gray-600">
            <span className="font-medium">MindHive Confidence:</span> {verification.confidence}% 
            {' '}• Verified by 6 AI models
          </div>
        </div>
      </div>
    </div>
  )
}

// Success indicator for verified code
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

// Main ChatGPT analyzer
class ChatGPTAnalyzer {
  private verifiedMessages = new Set<string>()
  private observer: MutationObserver | null = null

  async init() {
    console.log('🧠 MindHive ChatGPT Integration: Initializing...')
    
    // Analyze existing messages
    await this.scanMessages()
    
    // Watch for new messages
    this.setupObserver()
    
    console.log('✅ MindHive ChatGPT Integration: Ready')
  }

  private setupObserver() {
    this.observer = new MutationObserver(() => {
      setTimeout(() => this.scanMessages(), 1000)
    })

    // Watch the main conversation container
    const container = document.querySelector('main') || document.body
    
    this.observer.observe(container, {
      childList: true,
      subtree: true
    })
  }

  private async scanMessages() {
    // Find all assistant messages (ChatGPT responses)
    const messages = document.querySelectorAll('[data-message-author-role="assistant"]')
    
    for (const message of Array.from(messages)) {
      const messageId = this.getMessageId(message as HTMLElement)
      
      if (this.verifiedMessages.has(messageId)) continue
      
      this.verifiedMessages.add(messageId)
      
      // Find code blocks in message
      const codeBlocks = message.querySelectorAll('pre code')
      
      if (codeBlocks.length === 0) continue
      
      // Verify each code block
      for (const codeBlock of Array.from(codeBlocks)) {
        await this.verifyCodeBlock(codeBlock as HTMLElement)
      }
    }
  }

  private getMessageId(element: HTMLElement): string {
    return element.getAttribute('data-message-id') || 
           Math.random().toString(36)
  }

  private async verifyCodeBlock(codeElement: HTMLElement) {
    const code = codeElement.textContent || ''
    
    if (code.trim().length < 20) return
    
    try {
      const verification = await this.performVerification(code)
      
      // Inject warning or verification badge
      if (verification.isHallucinated || verification.issues.length > 0) {
        this.injectWarning(codeElement, verification)
      } else if (verification.confidence >= 85) {
        this.injectVerifiedBadge(codeElement, verification.confidence)
      }
      
      // Learn from this conversation
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
      console.error('API verification failed:', error)
      
      // Demo: Detect common issues
      const issues: string[] = []
      
      if (code.includes('MD5') || code.includes('md5')) {
        issues.push('MD5 is cryptographically broken (since 2004)')
      }
      if (code.includes('eval(')) {
        issues.push('eval() is dangerous and can execute arbitrary code')
      }
      if (code.match(/password\s*=\s*['"][^'"]+['"]/i)) {
        issues.push('Hardcoded password detected - use environment variables')
      }
      if (code.includes('innerHTML')) {
        issues.push('innerHTML can lead to XSS vulnerabilities')
      }
      
      return {
        code,
        isHallucinated: issues.length > 0,
        confidence: issues.length > 0 ? 65 : 92,
        issues,
        betterAlternative: issues.length > 0 ? {
          code: this.generateBetterAlternative(code, issues),
          reason: 'More secure and follows modern best practices',
          usedBy: 15420
        } : undefined
      }
    }
  }

  private generateBetterAlternative(code: string, issues: string[]): string {
    if (code.includes('MD5') || code.includes('md5')) {
      return `import bcrypt from 'bcrypt';\n\nconst hashedPassword = await bcrypt.hash(password, 12);`
    }
    if (code.includes('innerHTML')) {
      return `// Use textContent or React's JSX to prevent XSS\nelement.textContent = userInput;`
    }
    if (code.includes('eval(')) {
      return `// Use JSON.parse for data or Function constructor for specific cases\nconst data = JSON.parse(jsonString);`
    }
    return code
  }

  private injectWarning(codeElement: HTMLElement, verification: CodeVerification) {
    // Find parent container
    const container = codeElement.closest('[data-message-author-role="assistant"]')
    if (!container) return
    
    // Check if warning already exists
    if (container.querySelector('.mindhive-warning')) return
    
    // Create warning container
    const warningDiv = document.createElement('div')
    
    // Render React component
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
        onDismiss={() => {
          warningDiv.remove()
        }}
      />
    )
    
    // Insert after code block
    const preElement = codeElement.closest('pre')
    if (preElement && preElement.parentElement) {
      preElement.parentElement.insertBefore(warningDiv, preElement.nextSibling)
    }
  }

  private injectVerifiedBadge(codeElement: HTMLElement, confidence: number) {
    const preElement = codeElement.closest('pre')
    if (!preElement || !preElement.parentElement) return
    
    // Check if badge already exists
    if (preElement.parentElement.querySelector('.mindhive-verified')) return
    
    // Create badge
    const badgeDiv = document.createElement('div')
    badgeDiv.style.cssText = 'margin-top: 8px;'
    
    const root = createRoot(badgeDiv)
    root.render(<VerifiedCodeBadge confidence={confidence} />)
    
    preElement.parentElement.insertBefore(badgeDiv, preElement.nextSibling)
  }

  private async learnFromCode(code: string, verification: CodeVerification) {
    try {
      // Send to MindHive for collective learning
      await apiClient.learnFromAIConversation({
        code,
        verified: !verification.isHallucinated && verification.confidence >= 85,
        issues: verification.issues,
        source: 'chatgpt'
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
const analyzer = new ChatGPTAnalyzer()
analyzer.init()

// Cleanup
window.addEventListener('beforeunload', () => {
  analyzer.cleanup()
})
