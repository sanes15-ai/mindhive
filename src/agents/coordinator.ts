import { AIOrchestrator } from '../services/ai/orchestrator';
import { NexusEngine } from '../services/nexus/engine';
import { logger } from '../utils/logger';
import { prisma } from '../index';

export interface AgentTask {
  id: string;
  type: 'codegen' | 'sentinel' | 'optimizer' | 'security' | 'oracle';
  input: any;
  priority: number;
  userId?: string;
}

export interface AgentResult {
  success: boolean;
  output: any;
  confidence: number;
  executionTime: number;
  warnings?: string[];
}

export class AgentCoordinator {
  private agents: Map<string, BaseAgent> = new Map();
  private taskQueue: AgentTask[] = [];
  private isProcessing = false;

  constructor(
    private aiOrchestrator: AIOrchestrator,
    private nexusEngine: NexusEngine
  ) {}

  async initialize(): Promise<void> {
    // Initialize all agents
    if (process.env.AGENT_CODEGEN_ENABLED === 'true') {
      this.agents.set('codegen', new CodeGenAgent(this.aiOrchestrator, this.nexusEngine));
    }

    if (process.env.AGENT_SENTINEL_ENABLED === 'true') {
      this.agents.set('sentinel', new SentinelAgent(this.aiOrchestrator, this.nexusEngine));
    }

    if (process.env.AGENT_OPTIMIZER_ENABLED === 'true') {
      this.agents.set('optimizer', new OptimizerAgent(this.aiOrchestrator, this.nexusEngine));
    }

    if (process.env.AGENT_SECURITY_ENABLED === 'true') {
      this.agents.set('security', new SecurityGuardAgent(this.aiOrchestrator, this.nexusEngine));
    }

    if (process.env.AGENT_ORACLE_ENABLED === 'true') {
      this.agents.set('oracle', new OracleAgent(this.aiOrchestrator, this.nexusEngine));
    }

    logger.info(`🤖 Initialized ${this.agents.size} AI agents`);

    // Start background processing
    this.startProcessing();
  }

  async executeTask(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    const agent = this.agents.get(task.type);

    if (!agent) {
      throw new Error(`Agent ${task.type} not found`);
    }

    try {
      const result = await agent.execute(task);
      const executionTime = Date.now() - startTime;

      // Log agent activity
      await prisma.agentActivity.create({
        data: {
          agentType: task.type.toUpperCase() as any,
          action: 'EXECUTE_TASK',
          targetId: task.id,
          input: task.input,
          output: result.output,
          confidenceScore: result.confidence,
          success: result.success,
          executionTime,
        },
      });

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error(`Agent ${task.type} failed:`, error);

      await prisma.agentActivity.create({
        data: {
          agentType: task.type.toUpperCase() as any,
          action: 'EXECUTE_TASK',
          targetId: task.id,
          input: task.input,
          success: false,
          errorMessage: (error as Error).message,
          executionTime,
        },
      });

      return {
        success: false,
        output: null,
        confidence: 0,
        executionTime,
        warnings: [(error as Error).message],
      };
    }
  }

  queueTask(task: AgentTask): void {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const processLoop = async (): Promise<void> => {
      while (this.isProcessing) {
        if (this.taskQueue.length > 0) {
          const task = this.taskQueue.shift()!;
          await this.executeTask(task);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };

    processLoop().catch((error) => {
      logger.error('Agent coordinator processing loop error:', error);
      this.isProcessing = false;
    });
  }
}

// Base Agent Class
abstract class BaseAgent {
  constructor(
    protected aiOrchestrator: AIOrchestrator,
    protected nexusEngine: NexusEngine
  ) {}

  abstract execute(task: AgentTask): Promise<AgentResult>;
}

// 🧬 CodeGen Agent - Writes production-grade features
class CodeGenAgent extends BaseAgent {
  async execute(task: AgentTask): Promise<AgentResult> {
    const { description, language, framework, style } = task.input;

    const messages = [
      {
        role: 'system',
        content: `You are CodeGen, an expert code generator. Generate production-ready ${language} code${framework ? ` using ${framework}` : ''}. Include:
- Complete implementation
- Error handling
- Type safety
- Documentation
- Tests
- Best practices

Follow these style guidelines: ${style || 'industry standard'}`,
      },
      {
        role: 'user',
        content: description,
      },
    ];

    try {
      // Generate code using consensus from multiple models
      const response = await this.aiOrchestrator.getConsensus(messages, [
        'openai',
        'anthropic',
        'google',
      ]);

      // Verify with NEXUS
      const verification = await this.nexusEngine.verifySuggestion(response.content, {
        language,
        framework,
      });

      return {
        success: verification.isValid,
        output: {
          code: response.content,
          verification,
          model: response.model,
          consensus: response.consensus,
        },
        confidence: verification.confidence * (response.consensus ? 1.0 : 0.8),
        warnings: verification.warnings,
        executionTime: 0, // Will be tracked by coordinator
      };
    } catch (error) {
      logger.error('CodeGen error:', error);
      return {
        success: false,
        output: null,
        confidence: 0,
        warnings: [(error as Error).message],
        executionTime: 0,
      };
    }
  }
}

// 🛡️ Sentinel Agent - Watches for bugs and issues
class SentinelAgent extends BaseAgent {
  async execute(task: AgentTask): Promise<AgentResult> {
    const { logs, code, errorPattern } = task.input;

    const messages = [
      {
        role: 'system',
        content: `You are Sentinel, a bug detection and fixing agent. Analyze the following logs/code and:
1. Identify the root cause
2. Generate a fix
3. Explain the issue
4. Suggest preventive measures`,
      },
      {
        role: 'user',
        content: `Logs: ${logs}\n\nCode: ${code}\n\nError Pattern: ${errorPattern}`,
      },
    ];

    const response = await this.aiOrchestrator.chat(messages);

    // Extract fix from response
    const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)```/);
    const fixCode = codeMatch ? codeMatch[1] : '';

    return {
      success: !!fixCode,
      output: {
        analysis: response.content,
        fix: fixCode,
        preventiveMeasures: this.extractPreventiveMeasures(response.content),
      },
      confidence: 0.85,
      executionTime: 0,
    };
  }

  private extractPreventiveMeasures(content: string): string[] {
    // Simple extraction - in production, use better parsing
    const measures: string[] = [];
    const lines = content.split('\n');
    let inPreventive = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('preventive') || line.toLowerCase().includes('prevent')) {
        inPreventive = true;
        continue;
      }
      if (inPreventive && line.trim().match(/^[-*]\s/)) {
        measures.push(line.trim().substring(2));
      }
    }

    return measures;
  }
}

// ⚡ Optimizer Agent - Improves performance
class OptimizerAgent extends BaseAgent {
  async execute(task: AgentTask): Promise<AgentResult> {
    const { code, language, metrics } = task.input;

    const messages = [
      {
        role: 'system',
        content: `You are Optimizer, a code optimization expert. Analyze and improve the code for:
- Performance
- Memory efficiency
- Readability
- Maintainability

Provide optimized code and explain improvements.`,
      },
      {
        role: 'user',
        content: `Language: ${language}\n\nCurrent metrics: ${JSON.stringify(metrics)}\n\nCode:\n${code}`,
      },
    ];

    const response = await this.aiOrchestrator.chat(messages);

    const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)```/);
    const optimizedCode = codeMatch ? codeMatch[1] : code;

    return {
      success: true,
      output: {
        originalCode: code,
        optimizedCode,
        improvements: this.extractImprovements(response.content),
        explanation: response.content,
      },
      confidence: 0.9,
      executionTime: 0,
    };
  }

  private extractImprovements(content: string): string[] {
    const improvements: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.trim().match(/^[-*]\s/)) {
        improvements.push(line.trim().substring(2));
      }
    }

    return improvements;
  }
}

// 🔒 SecurityGuard Agent - Scans and fixes vulnerabilities
class SecurityGuardAgent extends BaseAgent {
  async execute(task: AgentTask): Promise<AgentResult> {
    const { code, language } = task.input;

    // Use NEXUS for security scanning
    const verification = await this.nexusEngine.verifySuggestion(code, { language });

    const messages = [
      {
        role: 'system',
        content: `You are SecurityGuard, a security expert. Scan for vulnerabilities including:
- Injection attacks
- XSS
- CSRF
- Authentication issues
- Data exposure
- Cryptographic weaknesses

Provide secure alternatives.`,
      },
      {
        role: 'user',
        content: `Analyze this ${language} code for security vulnerabilities:\n\n${code}`,
      },
    ];

    const response = await this.aiOrchestrator.chat(messages);

    return {
      success: true,
      output: {
        vulnerabilities: verification.warnings,
        analysis: response.content,
        riskLevel: this.calculateRiskLevel(verification.warnings.length),
        recommendations: this.extractRecommendations(response.content),
      },
      confidence: verification.confidence,
      warnings: verification.warnings,
      executionTime: 0,
    };
  }

  private calculateRiskLevel(warningCount: number): string {
    if (warningCount === 0) return 'LOW';
    if (warningCount <= 2) return 'MEDIUM';
    if (warningCount <= 5) return 'HIGH';
    return 'CRITICAL';
  }

  private extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (
        line.toLowerCase().includes('recommend') ||
        line.toLowerCase().includes('should') ||
        line.trim().match(/^[-*]\s/)
      ) {
        recommendations.push(line.trim());
      }
    }

    return recommendations;
  }
}

// 🔮 Oracle Agent - Predicts needs and provides insights
class OracleAgent extends BaseAgent {
  async execute(task: AgentTask): Promise<AgentResult> {
    const { context, history, currentCode } = task.input;

    const messages = [
      {
        role: 'system',
        content: `You are Oracle, a predictive intelligence agent. Based on the developer's context and history:
1. Predict what they'll need next
2. Suggest relevant patterns
3. Provide proactive insights
4. Recommend improvements

Be concise and actionable.`,
      },
      {
        role: 'user',
        content: `Context: ${JSON.stringify(context)}\n\nRecent history: ${JSON.stringify(history)}\n\nCurrent code:\n${currentCode}`,
      },
    ];

    const response = await this.aiOrchestrator.chat(messages);

    return {
      success: true,
      output: {
        predictions: this.extractPredictions(response.content),
        suggestions: this.extractSuggestions(response.content),
        insights: response.content,
      },
      confidence: 0.8,
      executionTime: 0,
    };
  }

  private extractPredictions(content: string): string[] {
    const predictions: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (
        line.toLowerCase().includes('predict') ||
        line.toLowerCase().includes('likely') ||
        line.toLowerCase().includes('next')
      ) {
        predictions.push(line.trim());
      }
    }

    return predictions;
  }

  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.toLowerCase().includes('suggest') || line.trim().match(/^[-*]\s/)) {
        suggestions.push(line.trim());
      }
    }

    return suggestions;
  }
}

