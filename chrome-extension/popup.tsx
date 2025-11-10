import React, { useState, useEffect } from "react"
import { getConfig, setConfig, login, logout } from "~lib/config"

function IndexPopup() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [token, setToken] = useState("")
  const [nexusEnabled, setNexusEnabled] = useState(true)
  const [autoLearn, setAutoLearn] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    const config = await getConfig()
    setIsAuthenticated(config.isAuthenticated)
    setNexusEnabled(config.nexusEnabled)
    setAutoLearn(config.autoLearn)
  }

  async function handleLogin() {
    if (!token) {
      return
    }
    await login(token)
    setIsAuthenticated(true)
  }

  async function handleLogout() {
    await logout()
    setIsAuthenticated(false)
    setToken("")
  }

  async function toggleNexus() {
    const newValue = !nexusEnabled
    await setConfig({ nexusEnabled: newValue })
    setNexusEnabled(newValue)
  }

  async function toggleAutoLearn() {
    const newValue = !autoLearn
    await setConfig({ autoLearn: newValue })
    setAutoLearn(newValue)
  }

  return (
    <div
      style={{
        width: "350px",
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#1a1a1a",
        color: "white"
      }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "5px" }}>
          🧠 Hive Mind
        </h1>
        <p style={{ fontSize: "12px", color: "#888" }}>
          Collective Intelligence Extension
        </p>
      </div>

      {!isAuthenticated ? (
        <div>
          <p style={{ marginBottom: "10px", fontSize: "14px" }}>
            Sign in to access collective intelligence
          </p>
          <input
            type="text"
            placeholder="Enter your API token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "10px",
              background: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: "4px",
              color: "white"
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "10px",
              background: "#9333ea",
              border: "none",
              borderRadius: "4px",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer"
            }}>
            Sign In
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>
              Status
            </div>
            <div style={{ fontSize: "14px", color: "#4caf50" }}>
              ✓ Connected
            </div>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontSize: "14px"
              }}>
              <input
                type="checkbox"
                checked={nexusEnabled}
                onChange={toggleNexus}
                style={{ marginRight: "10px" }}
              />
              Enable Nexus Verification
            </label>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontSize: "14px"
              }}>
              <input
                type="checkbox"
                checked={autoLearn}
                onChange={toggleAutoLearn}
                style={{ marginRight: "10px" }}
              />
              Auto-Learn from AI Chats
            </label>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px",
              background: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: "4px",
              color: "white",
              cursor: "pointer"
            }}>
            Sign Out
          </button>
        </div>
      )}

      <div style={{ marginTop: "20px", fontSize: "11px", color: "#666", textAlign: "center" }}>
        v1.0.0 • Made with ❤️ by Hive Mind
      </div>
    </div>
  )
}

export default IndexPopup
