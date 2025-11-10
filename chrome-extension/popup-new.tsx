/**
 * MindHive Extension Popup
 * Main UI for authentication, settings, and quick stats
 */

import { useState, useEffect } from "react"
import { useAuthStore } from "./store/authStore"
import { useSettingsStore } from "./store/settingsStore"
import { apiClient } from "./lib/api"

import "./popup-styles.css"

function IndexPopup() {
  const authState = useAuthStore ? useAuthStore() : { isAuthenticated: false, user: null, login: () => {}, logout: () => {} }
  const settingsState = useSettingsStore ? useSettingsStore() : { 
    globalEnabled: true, 
    toggleGlobal: () => {}, 
    autoVerifyCode: true, 
    showFloatingHUD: true, 
    updateSettings: () => {} 
  }
  
  const [view, setView] = useState<'main' | 'login' | 'settings'>('main')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [stats, setStats] = useState({
    verifiedToday: 0,
    issuesFound: 0,
    patternsLearned: 0
  })

  useEffect(() => {
    if (authState.isAuthenticated) {
      loadStats()
    }
  }, [authState.isAuthenticated])

  const loadStats = async () => {
    try {
      const data = await apiClient.getQuickStats()
      setStats({
        verifiedToday: data.verifiedCodeBlocks,
        issuesFound: data.securityIssuesFound,
        patternsLearned: data.patternsLearnedToday
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const { token, user } = await apiClient.login(email, password)
      authState.login(token, user)
      setView('main')
      setEmail("")
      setPassword("")
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authState.logout()
    }
  }

  // Login View
  if (view === 'login') {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <button onClick={() => setView('main')} className="back-button">
            ← Back
          </button>
          <h2>🧠 Sign In to MindHive</h2>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" disabled={loading} className="primary-button">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="popup-footer">
          <a href="https://mindhive.dev/register" target="_blank">
            Don't have an account? Sign up
          </a>
        </div>
      </div>
    )
  }

  // Settings View
  if (view === 'settings') {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <button onClick={() => setView('main')} className="back-button">
            ← Back
          </button>
          <h2>⚙️ Settings</h2>
        </div>
        
        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Auto-Verify Code</div>
              <div className="setting-description">
                Automatically verify code blocks on GitHub
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settingsState.autoVerifyCode}
                onChange={() => settingsState.updateSettings({ autoVerifyCode: !settingsState.autoVerifyCode })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Show Floating HUD</div>
              <div className="setting-description">
                Display brain icon for quick access
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settingsState.showFloatingHUD}
                onChange={() => settingsState.updateSettings({ showFloatingHUD: !settingsState.showFloatingHUD })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Global Extension Status</div>
              <div className="setting-description">
                Enable/disable MindHive on all sites
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settingsState.globalEnabled}
                onChange={settingsState.toggleGlobal}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div className="popup-footer">
          <button 
            onClick={() => window.open('https://mindhive.dev/dashboard', '_blank')}
            className="secondary-button"
          >
            Open Full Dashboard →
          </button>
        </div>
      </div>
    )
  }

  // Main View
  return (
    <div className="popup-container">
      {/* Header */}
      <div className="popup-header">
        <div className="header-content">
          <span className="logo">🧠</span>
          <div>
            <h2>MindHive</h2>
            <p className="tagline">Collective Intelligence</p>
          </div>
        </div>
        
        {authState.isAuthenticated && (
          <button onClick={() => setView('settings')} className="icon-button" title="Settings">
            ⚙️
          </button>
        )}
      </div>

      {/* Authentication Status */}
      {!authState.isAuthenticated ? (
        <div className="auth-prompt">
          <p className="auth-message">
            Sign in to access collective intelligence features
          </p>
          <button onClick={() => setView('login')} className="primary-button">
            Sign In
          </button>
        </div>
      ) : (
        <>
          {/* User Info */}
          <div className="user-info">
            <div className="user-avatar">
              {authState.user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="user-details">
              <div className="user-name">{authState.user?.name || 'User'}</div>
              <div className="user-email">{authState.user?.email || ''}</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-value">{stats.verifiedToday}</div>
              <div className="stat-label">Verified Today</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🔒</div>
              <div className="stat-value">{stats.issuesFound}</div>
              <div className="stat-label">Issues Found</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📚</div>
              <div className="stat-value">{stats.patternsLearned}</div>
              <div className="stat-label">Patterns Learned</div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`status-indicator ${settingsState.globalEnabled ? 'active' : 'inactive'}`}>
            <div className="status-dot"></div>
            <span>{settingsState.globalEnabled ? 'Active on this site' : 'Inactive'}</span>
            <label className="toggle-mini">
              <input
                type="checkbox"
                checked={settingsState.globalEnabled}
                onChange={settingsState.toggleGlobal}
              />
              <span className="toggle-slider-mini"></span>
            </label>
          </div>

          {/* Quick Actions */}
          <div className="action-buttons">
            <button 
              onClick={() => window.open('https://mindhive.dev/dashboard', '_blank')}
              className="action-button"
            >
              <span>📊</span>
              <span>Dashboard</span>
            </button>
            
            <button 
              onClick={() => window.open('https://docs.mindhive.dev', '_blank')}
              className="action-button"
            >
              <span>📖</span>
              <span>Docs</span>
            </button>
            
            <button onClick={handleLogout} className="action-button">
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="popup-footer">
        <div className="footer-text">
          Powered by 6 AI models • NEXUS Verified
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
