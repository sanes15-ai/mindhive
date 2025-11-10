import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';
import { AuthManager } from '../auth/AuthManager';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'mindhive.chatView';
  private _view?: vscode.WebviewView;
  private chatHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> = [];
  private currentProjectMemoryId?: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private client: MindHiveClient,
    private authManager: AuthManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          await this.handleUserMessage(data.message);
          break;
        case 'applyCode':
          await this.applyCodeToEditor(data.code, data.language);
          break;
        case 'executeCommand':
          await this.executeSlashCommand(data.command, data.args);
          break;
        case 'clearChat':
          this.chatHistory = [];
          this.updateChatHistory();
          break;
      }
    });

    // Load chat history for current project
    this.loadProjectChat();
  }

  private async loadProjectChat() {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) return;

      const projectMemory = await this.client.getOrCreateProjectMemory(
        workspaceFolder.uri.fsPath,
        vscode.workspace.name || 'Untitled'
      );

      this.currentProjectMemoryId = projectMemory.id;

      // Load recent chat history
      const projectContext = await this.client.getProjectMemory(projectMemory.id);
      if (projectContext?.recentChat) {
        this.chatHistory = projectContext.recentChat.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        }));
        this.updateChatHistory();
      }
    } catch (error) {
      console.error('Failed to load project chat:', error);
    }
  }

  private async handleUserMessage(message: string) {
    // Check for slash commands
    if (message.startsWith('/')) {
      const [command, ...args] = message.slice(1).split(' ');
      await this.executeSlashCommand(command, args.join(' '));
      return;
    }

    // Add user message to history
    this.chatHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    this.updateChatHistory();

    // Save to project memory
    if (this.currentProjectMemoryId) {
      try {
        await this.client.addChatMessage(
          this.currentProjectMemoryId,
          'user',
          message
        );
      } catch (error) {
        console.error('Failed to save chat message:', error);
      }
    }

    // Show typing indicator
    this.sendToWebview({ type: 'typing', isTyping: true });

    try {
      // Get AI response
      const response = await this.getAIResponse(message);

      // Add assistant message to history
      this.chatHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });

      // Save assistant response
      if (this.currentProjectMemoryId) {
        await this.client.addChatMessage(
          this.currentProjectMemoryId,
          'assistant',
          response
        );
      }
    } catch (error: any) {
      this.chatHistory.push({
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date(),
      });
    } finally {
      this.sendToWebview({ type: 'typing', isTyping: false });
      this.updateChatHistory();
    }
  }

  private async getAIResponse(message: string): Promise<string> {
    const editor = vscode.window.activeTextEditor;
    let context = '';

    if (editor) {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        context = editor.document.getText(selection);
      } else {
        // Include current file context
        const position = editor.selection.active;
        const startLine = Math.max(0, position.line - 25);
        const endLine = Math.min(editor.document.lineCount - 1, position.line + 25);
        const range = new vscode.Range(startLine, 0, endLine, 999);
        context = editor.document.getText(range);
      }
    }

    const response = await this.client.generateCode({
      prompt: message,
      language: editor?.document.languageId || 'typescript',
      context,
      models: ['anthropic', 'openai'],
    });

    return response.code || response.explanation || 'No response generated.';
  }

  private async executeSlashCommand(command: string, args: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.showError('No active editor');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection) || editor.document.getText();

    this.chatHistory.push({
      role: 'user',
      content: `/${command} ${args}`,
      timestamp: new Date(),
    });
    this.updateChatHistory();
    this.sendToWebview({ type: 'typing', isTyping: true });

    try {
      let response: string;

      switch (command.toLowerCase()) {
        case 'explain':
          response = await this.explainCode(selectedText, editor.document.languageId);
          break;

        case 'fix':
          response = await this.fixCode(selectedText, editor.document.languageId, args);
          break;

        case 'test':
          response = await this.generateTests(selectedText, editor.document.languageId);
          break;

        case 'refactor':
          response = await this.refactorCode(selectedText, editor.document.languageId, args);
          break;

        case 'docs':
          response = await this.generateDocs(selectedText, editor.document.languageId);
          break;

        case 'optimize':
          response = await this.optimizeCode(selectedText, editor.document.languageId);
          break;

        case 'security':
          response = await this.securityScan(selectedText, editor.document.languageId);
          break;

        default:
          response = `❌ Unknown command: /${command}\n\nAvailable commands:\n- /explain - Explain selected code\n- /fix - Fix bugs in code\n- /test - Generate tests\n- /refactor - Refactor code\n- /docs - Generate documentation\n- /optimize - Optimize performance\n- /security - Security scan`;
      }

      this.chatHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });
    } catch (error: any) {
      this.chatHistory.push({
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date(),
      });
    } finally {
      this.sendToWebview({ type: 'typing', isTyping: false });
      this.updateChatHistory();
    }
  }

  private async explainCode(code: string, language: string): Promise<string> {
    const explanation = await this.client.explainCode(code, language);
    return `## Code Explanation\n\n${explanation}`;
  }

  private async fixCode(code: string, language: string, issue: string): Promise<string> {
    const prompt = issue
      ? `Fix this issue: ${issue}\n\n${code}`
      : `Fix any bugs or issues in this code:\n\n${code}`;

    const response = await this.client.generateCode({
      prompt,
      language,
      context: code,
    });

    return `## Fixed Code\n\n\`\`\`${language}\n${response.code}\n\`\`\`\n\n**Changes Made:**\n${response.explanation || 'Code has been fixed.'}`;
  }

  private async generateTests(code: string, language: string): Promise<string> {
    const response = await this.client.generateCode({
      prompt: `Generate comprehensive unit tests for this code:\n\n${code}`,
      language,
      context: code,
    });

    return `## Generated Tests\n\n\`\`\`${language}\n${response.code}\n\`\`\``;
  }

  private async refactorCode(code: string, language: string, goal: string): Promise<string> {
    const prompt = goal
      ? `Refactor this code to: ${goal}\n\n${code}`
      : `Refactor this code for better readability and maintainability:\n\n${code}`;

    const response = await this.client.generateCode({
      prompt,
      language,
      context: code,
    });

    return `## Refactored Code\n\n\`\`\`${language}\n${response.code}\n\`\`\`\n\n**Improvements:**\n${response.explanation || 'Code has been refactored.'}`;
  }

  private async generateDocs(code: string, language: string): Promise<string> {
    const response = await this.client.generateCode({
      prompt: `Generate comprehensive documentation (JSDoc/comments) for this code:\n\n${code}`,
      language,
      context: code,
    });

    return `## Documentation\n\n\`\`\`${language}\n${response.code}\n\`\`\``;
  }

  private async optimizeCode(code: string, language: string): Promise<string> {
    const response = await this.client.optimizeCode(code, language);
    return `## Optimized Code\n\n\`\`\`${language}\n${response.code}\n\`\`\`\n\n**Performance Improvements:**\n${response.explanation || 'Code has been optimized.'}`;
  }

  private async securityScan(code: string, language: string): Promise<string> {
    const verification = await this.client.verifyCode(code, language);
    
    let result = `## Security Scan Results\n\n`;
    result += `**Status:** ${verification.isValid ? '✅ Passed' : '⚠️ Issues Found'}\n`;
    result += `**Confidence:** ${(verification.confidence * 100).toFixed(0)}%\n\n`;

    if (verification.warnings.length > 0) {
      result += `**Warnings:**\n`;
      verification.warnings.forEach(warning => {
        result += `- ${warning}\n`;
      });
    }

    if (verification.suggestions.length > 0) {
      result += `\n**Suggestions:**\n`;
      verification.suggestions.forEach(suggestion => {
        result += `- ${suggestion}\n`;
      });
    }

    return result;
  }

  private async applyCodeToEditor(code: string, language: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    await editor.edit((editBuilder) => {
      if (selection.isEmpty) {
        // Insert at cursor
        editBuilder.insert(selection.active, code);
      } else {
        // Replace selection
        editBuilder.replace(selection, code);
      }
    });

    vscode.window.showInformationMessage('✅ Code applied');
  }

  private updateChatHistory() {
    this.sendToWebview({
      type: 'chatHistory',
      messages: this.chatHistory,
    });
  }

  private showError(message: string) {
    this.sendToWebview({
      type: 'error',
      message,
    });
  }

  private sendToWebview(data: any) {
    this._view?.webview.postMessage(data);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MindHive Chat</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          color: var(--vscode-foreground);
          background: var(--vscode-editor-background);
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        #chat-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message {
          display: flex;
          flex-direction: column;
          gap: 4px;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          opacity: 0.7;
        }

        .message-role {
          font-weight: 600;
          text-transform: uppercase;
        }

        .user-message .message-role {
          color: var(--vscode-terminal-ansiBlue);
        }

        .assistant-message .message-role {
          color: var(--vscode-terminal-ansiGreen);
        }

        .message-content {
          background: var(--vscode-input-background);
          padding: 12px;
          border-radius: 6px;
          border: 1px solid var(--vscode-panel-border);
          line-height: 1.6;
        }

        .user-message .message-content {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .message-content pre {
          background: var(--vscode-textCodeBlock-background);
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          margin: 8px 0;
        }

        .message-content code {
          font-family: var(--vscode-editor-font-family);
          font-size: 13px;
        }

        .typing-indicator {
          display: none;
          padding: 12px;
          color: var(--vscode-descriptionForeground);
          font-style: italic;
        }

        .typing-indicator.active {
          display: block;
        }

        #input-container {
          border-top: 1px solid var(--vscode-panel-border);
          padding: 12px;
          background: var(--vscode-input-background);
        }

        #message-input {
          width: 100%;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          padding: 10px;
          border-radius: 4px;
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          resize: vertical;
          min-height: 40px;
          max-height: 200px;
        }

        #message-input:focus {
          outline: none;
          border-color: var(--vscode-focusBorder);
        }

        .button-group {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-family: var(--vscode-font-family);
        }

        button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .slash-commands {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          margin-top: 4px;
        }

        .apply-code-btn {
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          margin-top: 8px;
          float: right;
        }

        .apply-code-btn:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }
      </style>
    </head>
    <body>
      <div id="chat-container"></div>
      <div class="typing-indicator" id="typing">🧠 MindHive is thinking...</div>
      <div id="input-container">
        <textarea 
          id="message-input" 
          placeholder="Ask MindHive anything... (use / for commands)"
          rows="1"
        ></textarea>
        <div class="button-group">
          <button id="send-btn">Send</button>
          <button id="clear-btn">Clear Chat</button>
        </div>
        <div class="slash-commands">
          💡 /explain /fix /test /refactor /docs /optimize /security
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chat-container');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-btn');
        const typingIndicator = document.getElementById('typing');

        function sendMessage() {
          const message = messageInput.value.trim();
          if (!message) return;

          vscode.postMessage({
            type: 'sendMessage',
            message: message
          });

          messageInput.value = '';
          messageInput.style.height = '40px';
        }

        function renderMessage(msg) {
          const messageDiv = document.createElement('div');
          messageDiv.className = 'message ' + msg.role + '-message';

          const header = document.createElement('div');
          header.className = 'message-header';
          header.innerHTML = '<span class="message-role">' + msg.role + '</span>' +
            '<span class="message-time">' + new Date(msg.timestamp).toLocaleTimeString() + '</span>';

          const content = document.createElement('div');
          content.className = 'message-content';
          
          // Parse markdown-style code blocks
          let formattedContent = msg.content
            .replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, function(match, lang, code) {
              return '<pre><code class="language-' + lang + '">' + escapeHtml(code.trim()) + '</code></pre>';
            })
            .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
            .replace(/\\n/g, '<br>');

          content.innerHTML = formattedContent;

          // Add apply code button for code blocks from assistant
          if (msg.role === 'assistant' && msg.content.indexOf('\`\`\`') !== -1) {
            const applyBtn = document.createElement('button');
            applyBtn.className = 'apply-code-btn';
            applyBtn.textContent = '✨ Apply Code';
            applyBtn.onclick = function() {
              const codeMatch = msg.content.match(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/);
              if (codeMatch) {
                vscode.postMessage({
                  type: 'applyCode',
                  code: codeMatch[2].trim(),
                  language: codeMatch[1] || 'typescript'
                });
              }
            };
            content.appendChild(applyBtn);
          }

          messageDiv.appendChild(header);
          messageDiv.appendChild(content);
          chatContainer.appendChild(messageDiv);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function escapeHtml(text) {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);
        clearBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'clearChat' });
          chatContainer.innerHTML = '';
        });

        messageInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
          messageInput.style.height = '40px';
          messageInput.style.height = messageInput.scrollHeight + 'px';
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          switch (message.type) {
            case 'chatHistory':
              chatContainer.innerHTML = '';
              message.messages.forEach(renderMessage);
              break;
            case 'typing':
              typingIndicator.classList.toggle('active', message.isTyping);
              if (message.isTyping) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
              break;
            case 'error':
              alert(message.message);
              break;
          }
        });

        // Focus input on load
        messageInput.focus();
      </script>
    </body>
    </html>`;
  }
}
