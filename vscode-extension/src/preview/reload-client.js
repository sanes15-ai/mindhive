/**
 * MindHive Hot Reload Client
 * Injected into preview iframe to enable hot reload and console forwarding
 * 
 * This script runs in the preview iframe and listens for reload signals from the extension.
 * It also intercepts console methods to forward logs to the extension.
 */

(function() {
  'use strict';

  // Prevent double injection
  if (window.__MINDHIVE_RELOAD_CLIENT__) {
    console.log('🔥 Hot reload client already injected');
    return;
  }
  window.__MINDHIVE_RELOAD_CLIENT__ = true;

  const CONFIG = {
    reconnectDelay: 2000, // Reconnect WebSocket after 2s
    maxReconnectAttempts: 10,
    reloadDelay: 100, // Delay before reload to batch changes
  };

  let reconnectAttempts = 0;
  let socket = null;
  let reloadTimeout = null;

  /**
   * Console interceptor
   * Captures console output and forwards to parent
   */
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };

  function forwardConsole(level, args) {
    // Call original console method
    originalConsole[level].apply(console, args);

    // Forward to parent window
    try {
      window.parent.postMessage({
        type: 'console',
        level: level,
        message: Array.from(args).map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' '),
        timestamp: Date.now(),
      }, '*');
    } catch (e) {
      // Cross-origin restriction, ignore
    }
  }

  // Intercept console methods
  ['log', 'warn', 'error', 'info'].forEach(level => {
    console[level] = function(...args) {
      forwardConsole(level, args);
    };
  });

  /**
   * Error handler
   * Captures unhandled errors and forwards them
   */
  window.addEventListener('error', (event) => {
    const errorInfo = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    };

    originalConsole.error('Unhandled error:', errorInfo);

    try {
      window.parent.postMessage({
        type: 'error',
        error: errorInfo,
        timestamp: Date.now(),
      }, '*');
    } catch (e) {
      // Cross-origin restriction, ignore
    }

    return false; // Don't prevent default error handling
  });

  /**
   * Unhandled promise rejection handler
   */
  window.addEventListener('unhandledrejection', (event) => {
    const errorInfo = {
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    };

    originalConsole.error('Unhandled promise rejection:', errorInfo);

    try {
      window.parent.postMessage({
        type: 'error',
        error: errorInfo,
        timestamp: Date.now(),
      }, '*');
    } catch (e) {
      // Cross-origin restriction, ignore
    }
  });

  /**
   * Reload indicator
   * Shows visual feedback when reloading
   */
  function showReloadIndicator() {
    let indicator = document.getElementById('__mindhive_reload_indicator__');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = '__mindhive_reload_indicator__';
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      indicator.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        <span>Hot Reload</span>
      `;
      
      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        #__mindhive_reload_indicator__ svg {
          animation: spin 1s linear infinite;
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(indicator);
    }

    indicator.style.display = 'flex';

    // Hide after 1.5 seconds
    setTimeout(() => {
      if (indicator) {
        indicator.style.display = 'none';
      }
    }, 1500);
  }

  /**
   * Perform page reload
   */
  function performReload(changeInfo) {
    originalConsole.log('🔄 Hot reload triggered:', changeInfo);
    
    showReloadIndicator();

    // Delay reload slightly to batch multiple changes
    if (reloadTimeout) {
      clearTimeout(reloadTimeout);
    }

    reloadTimeout = setTimeout(() => {
      // Try to preserve scroll position
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Store in sessionStorage for restoration after reload
      try {
        sessionStorage.setItem('__mindhive_scroll_pos__', JSON.stringify({ x: scrollX, y: scrollY }));
      } catch (e) {
        // SessionStorage not available
      }

      // Reload with cache bust
      window.location.reload();
    }, CONFIG.reloadDelay);
  }

  /**
   * Restore scroll position after reload
   */
  function restoreScrollPosition() {
    try {
      const scrollPos = sessionStorage.getItem('__mindhive_scroll_pos__');
      if (scrollPos) {
        const { x, y } = JSON.parse(scrollPos);
        window.scrollTo(x, y);
        sessionStorage.removeItem('__mindhive_scroll_pos__');
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Restore scroll on page load
  if (document.readyState === 'complete') {
    restoreScrollPosition();
  } else {
    window.addEventListener('load', restoreScrollPosition);
  }

  /**
   * Listen for reload commands from parent window
   */
  window.addEventListener('message', (event) => {
    try {
      const message = event.data;

      if (message && message.command === 'reload') {
        performReload({
          file: message.file,
          type: message.type,
        });
      }
    } catch (e) {
      originalConsole.error('Error handling reload message:', e);
    }
  });

  /**
   * Notify parent that client is ready
   */
  function notifyReady() {
    try {
      window.parent.postMessage({
        type: 'reloadClientReady',
        timestamp: Date.now(),
      }, '*');
    } catch (e) {
      // Cross-origin restriction, ignore
    }
  }

  // Notify when DOM is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    notifyReady();
  } else {
    document.addEventListener('DOMContentLoaded', notifyReady);
  }

  originalConsole.log('🔥 MindHive hot reload client initialized');
})();
