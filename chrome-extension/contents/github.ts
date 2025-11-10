import type { PlasmoCSConfig } from "plasmo"
import { apiClient } from "~lib/api"
import { getConfig } from "~lib/config"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*"],
  all_frames: false
}

// Inject Hive Mind insights into GitHub code blocks
async function enhanceGitHubCode() {
  const config = await getConfig()
  if (!config.isAuthenticated || !config.nexusEnabled) {
    return
  }

  // Find all code blocks
  const codeBlocks = document.querySelectorAll(".blob-code-inner")

  for (const block of codeBlocks) {
    const code = block.textContent || ""
    if (code.trim().length < 10) {
      continue
    }

    // Detect language
    const language = detectLanguage()

    try {
      // Verify code with Nexus
      const verification = await apiClient.verifyCode(code, language)

      if (!verification.result.isValid) {
        // Add warning overlay
        addWarningOverlay(block as HTMLElement, verification.result)
      } else if (verification.result.confidence < 0.8) {
        // Add info overlay
        addInfoOverlay(block as HTMLElement, verification.result)
      }

      // Log interaction
      await apiClient.logInteraction({
        action: "github-code-scan",
        url: window.location.href,
        language
      })
    } catch (error) {
      console.error("Hive Mind verification failed:", error)
    }
  }
}

function detectLanguage(): string {
  // Detect from GitHub's language indicator
  const langElement = document.querySelector(".repository-content .btn-sm")
  if (langElement) {
    return langElement.textContent?.trim().toLowerCase() || "javascript"
  }
  return "javascript"
}

function addWarningOverlay(element: HTMLElement, result: any) {
  const overlay = document.createElement("div")
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    right: 0;
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid #ff9800;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    color: #ff9800;
    cursor: pointer;
    z-index: 1000;
  `
  overlay.innerHTML = `⚠️ Issues found (${Math.round(result.confidence * 100)}% confidence)`
  
  overlay.onclick = () => {
    showDetailPanel(result)
  }

  element.style.position = "relative"
  element.appendChild(overlay)
}

function addInfoOverlay(element: HTMLElement, result: any) {
  const overlay = document.createElement("div")
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    right: 0;
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid #4caf50;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    color: #4caf50;
    cursor: pointer;
    z-index: 1000;
  `
  overlay.innerHTML = `✓ Verified (${Math.round(result.confidence * 100)}%)`
  
  element.style.position = "relative"
  element.appendChild(overlay)
}

function showDetailPanel(result: any) {
  // Create side panel with details
  const panel = document.createElement("div")
  panel.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: rgba(30, 30, 30, 0.98);
    backdrop-filter: blur(10px);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    padding: 20px;
    z-index: 10000;
    overflow-y: auto;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  panel.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">
        🧠 Hive Mind Analysis
      </h2>
      <button id="hm-close" style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
    </div>

    <div style="margin-bottom: 20px;">
      <div style="font-size: 14px; color: #888; margin-bottom: 5px;">Confidence</div>
      <div style="font-size: 24px; font-weight: bold;">${Math.round(result.confidence * 100)}%</div>
    </div>

    ${result.warnings.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; color: #888; margin-bottom: 10px;">⚠️ Warnings</div>
        ${result.warnings.map((w: string) => `
          <div style="background: rgba(255, 152, 0, 0.1); padding: 10px; border-left: 3px solid #ff9800; margin-bottom: 10px;">
            ${w}
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${result.suggestions.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; color: #888; margin-bottom: 10px;">💡 Suggestions</div>
        ${result.suggestions.map((s: string) => `
          <div style="background: rgba(76, 175, 80, 0.1); padding: 10px; border-left: 3px solid #4caf50; margin-bottom: 10px;">
            ${s}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
      Powered by Hive Mind Collective Intelligence
    </div>
  `

  document.body.appendChild(panel)

  // Close button handler
  document.getElementById("hm-close")!.onclick = () => {
    panel.remove()
  }
}

// Run on page load and when DOM changes
enhanceGitHubCode()

const observer = new MutationObserver(() => {
  enhanceGitHubCode()
})

observer.observe(document.body, {
  childList: true,
  subtree: true
})
