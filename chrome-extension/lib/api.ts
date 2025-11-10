/**
 * MindHive API Client for Chrome Extension
 * Handles all backend communication with NEXUS verification
 */

import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = process.env.PLASMO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// Types
interface VerificationResult {
  verified: boolean
  confidence: number
  security: {
    score: number
    issues: Array<{
      type: string
      severity: string
      message: string
      line?: number
    }>
  }
  quality: number
  issues: Array<{
    type: 'error' | 'warning' | 'info'
    message: string
    severity: string
    line?: number
  }>
  alternatives?: Array<{
    code: string
    explanation: string
    usedBy: number
    successRate: number
  }>
}

interface AICodeVerification {
  hallucinated: boolean
  confidence: number
  issues: string[]
  alternative?: {
    code: string
    reason: string
    usedBy: number
  }
}

interface StackOverflowRating {
  qualityScore: number
  successRate: number
  usedBy: number
  isOutdated: boolean
  modernAlternative?: {
    code: string
    explanation: string
    year: number
  }
  securityIssues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low'
    message: string
  }>
  verifiedBy: number
}

interface QuickStats {
  patternsLearnedToday: number
  verifiedCodeBlocks: number
  securityIssuesFound: number
  teamActivity: string
}

interface RecentPattern {
  id: string
  title: string
  usedBy: number
  confidence: number
}

class MindHiveAPIClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear token on 401
          this.token = null
          chrome.storage.local.remove('authToken')
        }
        return Promise.reject(error)
      }
    )

    // Load token from storage
    this.loadToken()
  }

  private async loadToken() {
    try {
      const result = await chrome.storage.local.get('authToken')
      if (result.authToken) {
        this.token = result.authToken
      }
    } catch (error) {
      console.error('Failed to load token:', error)
    }
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      chrome.storage.local.set({ authToken: token })
    } else {
      chrome.storage.local.remove('authToken')
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password })
    const { token, user } = response.data
    this.setToken(token)
    return { token, user }
  }

  async logout() {
    await this.client.post('/auth/logout')
    this.setToken(null)
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  // Code Verification (for GitHub)
  async verifyCode(code: string, language?: string): Promise<VerificationResult> {
    try {
      const response = await this.client.post('/code/verify', { 
        code, 
        language,
        context: 'github-extension'
      })
      return response.data
    } catch (error) {
      console.error('Code verification failed:', error)
      throw error
    }
  }

  // AI Code Verification (for ChatGPT/Claude)
  async verifyAICode(code: string): Promise<AICodeVerification> {
    try {
      const response = await this.client.post('/nexus/verify', { 
        code,
        source: 'ai-chat'
      })
      return response.data
    } catch (error) {
      console.error('AI code verification failed:', error)
      throw error
    }
  }

  // Stack Overflow Rating
  async rateStackOverflowAnswer(code: string): Promise<StackOverflowRating> {
    try {
      const response = await this.client.post('/intelligence/rate-answer', { 
        code,
        source: 'stackoverflow'
      })
      return response.data
    } catch (error) {
      console.error('Stack Overflow rating failed:', error)
      throw error
    }
  }

  // Learning from AI conversations
  async learnFromAIConversation(data: {
    code: string
    verified: boolean
    issues: string[]
    source: 'chatgpt' | 'claude'
  }) {
    try {
      await this.client.post('/memory/learn', {
        ...data,
        context: 'ai-conversation'
      })
    } catch (error) {
      console.error('Learning from AI conversation failed:', error)
    }
  }

  // Quick Stats (for Floating HUD)
  async getQuickStats(): Promise<QuickStats> {
    try {
      const response = await this.client.get('/analytics/quick-stats')
      return response.data
    } catch (error) {
      console.error('Failed to get quick stats:', error)
      throw error
    }
  }

  // Recent Patterns (for Floating HUD)
  async getRecentPatterns(limit = 5): Promise<RecentPattern[]> {
    try {
      const response = await this.client.get('/intelligence/patterns/recent', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get recent patterns:', error)
      throw error
    }
  }

  // Security Scanning
  async scanCodeSecurity(code: string, language?: string) {
    try {
      const response = await this.client.post('/security/scan', { 
        code, 
        language,
        scanType: 'full'
      })
      return response.data
    } catch (error) {
      console.error('Security scan failed:', error)
      throw error
    }
  }

  // Get collective insights
  async getCollectiveInsights(code: string) {
    try {
      const response = await this.client.post('/intelligence/insights', { code })
      return response.data
    } catch (error) {
      console.error('Failed to get collective insights:', error)
      throw error
    }
  }

  // Pattern matching
  async findSimilarPatterns(code: string, limit = 5) {
    try {
      const response = await this.client.post('/intelligence/patterns/search', { 
        code, 
        limit 
      })
      return response.data
    } catch (error) {
      console.error('Pattern matching failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const apiClient = new MindHiveAPIClient()
