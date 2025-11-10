import * as vscode from 'vscode';
import { MindHiveClient } from '../client/HiveMindClient';

/**
 * TASK PLANNER - Autonomous Task Planning System
 * 
 * Breaks down complex user requests into executable tasks with:
 * - Dependency resolution
 * - Resource estimation
 * - Risk assessment
 * - Rollback planning
 * - Parallel execution optimization
 */

export interface Task {
  id: string;
  description: string;
  type: 'edit' | 'test' | 'refactor' | 'analyze' | 'document' | 'debug' | 'git' | 'dependency';
  priority: number;
  estimatedTime: number; // seconds
  dependencies: string[]; // Task IDs
  riskLevel: 'low' | 'medium' | 'high';
  rollbackStrategy: string;
  files?: string[];
  commands?: string[];
  validation?: string;
}

export interface TaskPlan {
  tasks: Task[];
  dependencies: Map<string, string[]>;
  estimatedTime: number;
  parallelizable?: Task[][];
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export class TaskPlanner {
  private client: MindHiveClient;

  constructor(client: MindHiveClient) {
    this.client = client;
  }

  /**
   * Plan tasks for a user request
   * Uses AI to intelligently break down complex requests
   */
  async planTasks(request: string, context: string): Promise<TaskPlan> {
    // Build comprehensive prompt for AI planning
    const prompt = this.buildPlanningPrompt(request, context);
    
    // Get AI to create plan
    const response = await this.client.chat([
      {
        role: 'system',
        content: 'You are an expert software architect. Break down user requests into detailed, executable tasks. Return valid JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.3,
      maxTokens: 3000
    });
    
    // Parse AI response into task plan
    let tasks: Task[];
    try {
      const parsed = this.parseAIResponse(response.message);
      tasks = parsed.tasks;
    } catch (error) {
      // Fallback: create basic task plan
      tasks = this.createFallbackPlan(request);
    }
    
    // Build dependency graph
    const dependencies = this.buildDependencyGraph(tasks);
    
    // Calculate total estimated time
    const estimatedTime = this.calculateEstimatedTime(tasks, dependencies);
    
    // Optimize for parallel execution
    const parallelizable = this.optimizeForParallelExecution(tasks, dependencies);
    
    return {
      tasks,
      dependencies,
      estimatedTime,
      parallelizable
    };
  }

  /**
   * Build detailed planning prompt
   */
  private buildPlanningPrompt(request: string, context: string): string {
    return `
Break down this request into executable tasks:

REQUEST: ${request}

CONTEXT:
${context}

Create a detailed task plan with:
1. Task description (what to do)
2. Task type (edit/test/refactor/analyze/document/debug/git/dependency)
3. Priority (1-10, higher = more important)
4. Estimated time in seconds
5. Dependencies (which tasks must complete first)
6. Risk level (low/medium/high)
7. Rollback strategy (how to undo if fails)
8. Files to modify (if applicable)
9. Commands to run (if applicable)
10. Validation criteria (how to verify success)

Return ONLY valid JSON in this exact format:
{
  "tasks": [
    {
      "id": "task-1",
      "description": "Create new component file",
      "type": "edit",
      "priority": 8,
      "estimatedTime": 30,
      "dependencies": [],
      "riskLevel": "low",
      "rollbackStrategy": "Delete created file",
      "files": ["src/components/NewComponent.tsx"],
      "validation": "File exists and compiles"
    }
  ]
}

Be thorough but efficient. Break complex tasks into smaller steps.
Consider dependencies carefully - some tasks must happen in order.
`.trim();
  }

  /**
   * Parse AI response into task list
   */
  private parseAIResponse(response: string): { tasks: Task[] } {
    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = response.trim();
    
    // Remove markdown code blocks
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n/, '').replace(/\n```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n/, '').replace(/\n```$/, '');
    }
    
    // Parse JSON
    const parsed = JSON.parse(jsonStr);
    
    // Validate structure
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid task plan structure');
    }
    
    // Ensure all tasks have required fields
    parsed.tasks = parsed.tasks.map((task: any, index: number) => ({
      id: task.id || `task-${index + 1}`,
      description: task.description || 'Unnamed task',
      type: task.type || 'edit',
      priority: task.priority || 5,
      estimatedTime: task.estimatedTime || 60,
      dependencies: task.dependencies || [],
      riskLevel: task.riskLevel || 'medium',
      rollbackStrategy: task.rollbackStrategy || 'Manual rollback',
      files: task.files || [],
      commands: task.commands || [],
      validation: task.validation || 'Manual verification'
    }));
    
    return parsed;
  }

  /**
   * Create fallback plan if AI fails
   */
  private createFallbackPlan(request: string): Task[] {
    return [
      {
        id: 'task-1',
        description: `Execute: ${request}`,
        type: 'edit',
        priority: 5,
        estimatedTime: 120,
        dependencies: [],
        riskLevel: 'medium',
        rollbackStrategy: 'Use Git to revert changes',
        files: [],
        commands: [],
        validation: 'Manual verification'
      }
    ];
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(tasks: Task[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    tasks.forEach(task => {
      graph.set(task.id, task.dependencies);
    });
    
    return graph;
  }

  /**
   * Calculate total estimated time considering dependencies
   */
  private calculateEstimatedTime(tasks: Task[], dependencies: Map<string, string[]>): number {
    // For now, simple sum (in real implementation, would use critical path)
    const totalSequential = tasks.reduce((sum, task) => sum + task.estimatedTime, 0);
    
    // Could optimize with parallel execution
    // For now, assume 50% parallelization benefit
    return Math.ceil(totalSequential * 0.7);
  }

  /**
   * Optimize tasks for parallel execution
   * Groups tasks that can run simultaneously
   */
  private optimizeForParallelExecution(tasks: Task[], dependencies: Map<string, string[]>): Task[][] {
    const levels: Task[][] = [];
    const completed = new Set<string>();
    const remaining = [...tasks];
    
    while (remaining.length > 0) {
      // Find tasks with no pending dependencies
      const readyTasks = remaining.filter(task => {
        return task.dependencies.every(depId => completed.has(depId));
      });
      
      if (readyTasks.length === 0) {
        // Circular dependency or error
        break;
      }
      
      // Add this level
      levels.push(readyTasks);
      
      // Mark as completed
      readyTasks.forEach(task => {
        completed.add(task.id);
        const index = remaining.indexOf(task);
        remaining.splice(index, 1);
      });
    }
    
    return levels;
  }

  /**
   * Validate task plan for issues
   */
  validatePlan(plan: TaskPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for circular dependencies
    const circular = this.detectCircularDependencies(plan.tasks);
    if (circular.length > 0) {
      errors.push(`Circular dependencies detected: ${circular.join(', ')}`);
    }
    
    // Check for missing dependency references
    const allTaskIds = new Set(plan.tasks.map(t => t.id));
    plan.tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        if (!allTaskIds.has(depId)) {
          errors.push(`Task ${task.id} references non-existent dependency: ${depId}`);
        }
      });
    });
    
    // Check for tasks with same ID
    const idCounts = new Map<string, number>();
    plan.tasks.forEach(task => {
      idCounts.set(task.id, (idCounts.get(task.id) || 0) + 1);
    });
    idCounts.forEach((count, id) => {
      if (count > 1) {
        errors.push(`Duplicate task ID: ${id}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(tasks: Task[]): string[] {
    const circular: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const task = taskMap.get(taskId);
      if (!task) return false;
      
      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          if (dfs(depId)) {
            circular.push(`${taskId} -> ${depId}`);
            return true;
          }
        } else if (recursionStack.has(depId)) {
          circular.push(`${taskId} -> ${depId}`);
          return true;
        }
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    });
    
    return circular;
  }

  /**
   * Re-plan after task failure
   * Creates alternative approach
   */
  async replanAfterFailure(
    originalPlan: TaskPlan,
    failedTask: Task,
    error: string
  ): Promise<TaskPlan> {
    const prompt = `
Original plan failed at task: ${failedTask.description}
Error: ${error}

Original tasks:
${originalPlan.tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n')}

Create alternative approach to achieve the same goal, avoiding the failure.
Return valid JSON with new task list.
`.trim();
    
    const response = await this.client.chat([
      {
        role: 'system',
        content: 'You are a problem-solving expert. Find alternative approaches when plans fail.'
      },
      {
        role: 'user',
        content: prompt
      }
    ], {
      temperature: 0.5,
      maxTokens: 2000
    });
    
    try {
      const parsed = this.parseAIResponse(response.message);
      return this.planTasks(
        `Alternative approach: ${failedTask.description}`,
        `Previous attempt failed: ${error}`
      );
    } catch (error) {
      // Return simplified plan
      return {
        tasks: [
          {
            id: 'recovery-1',
            description: 'Manual recovery required',
            type: 'edit',
            priority: 10,
            estimatedTime: 300,
            dependencies: [],
            riskLevel: 'high',
            rollbackStrategy: 'N/A',
            validation: 'Manual verification'
          }
        ],
        dependencies: new Map(),
        estimatedTime: 300
      };
    }
  }

  /**
   * Estimate task completion time based on historical data
   */
  estimateTaskTime(task: Task, historicalData?: Map<string, number>): number {
    // If we have historical data for this task type, use it
    if (historicalData?.has(task.type)) {
      const historicalTime = historicalData.get(task.type)!;
      // Blend historical and estimated
      return Math.ceil((task.estimatedTime + historicalTime) / 2);
    }
    
    // Apply risk multiplier
    const riskMultipliers = {
      'low': 1.0,
      'medium': 1.3,
      'high': 1.8
    };
    
    return Math.ceil(task.estimatedTime * riskMultipliers[task.riskLevel]);
  }

  /**
   * Suggest optimizations for a plan
   */
  suggestOptimizations(plan: TaskPlan): string[] {
    const suggestions: string[] = [];
    
    // Check for tasks that could be parallelized
    if (plan.parallelizable && plan.parallelizable.length > 0) {
      const parallelCount = plan.parallelizable.reduce((sum, level) => 
        sum + (level.length > 1 ? level.length - 1 : 0), 0);
      
      if (parallelCount > 0) {
        suggestions.push(`${parallelCount} tasks could run in parallel, potentially reducing execution time by 30-50%`);
      }
    }
    
    // Check for high-risk tasks
    const highRiskTasks = plan.tasks.filter(t => t.riskLevel === 'high');
    if (highRiskTasks.length > 0) {
      suggestions.push(`${highRiskTasks.length} high-risk tasks detected. Consider adding validation steps or splitting into smaller tasks.`);
    }
    
    // Check for long-running tasks
    const longTasks = plan.tasks.filter(t => t.estimatedTime > 300); // > 5 minutes
    if (longTasks.length > 0) {
      suggestions.push(`${longTasks.length} tasks estimated to take >5 minutes. Consider breaking them down for better progress tracking.`);
    }
    
    // Check for tasks with many dependencies
    const complexDeps = plan.tasks.filter(t => t.dependencies.length > 3);
    if (complexDeps.length > 0) {
      suggestions.push(`${complexDeps.length} tasks have complex dependencies (>3). This could indicate over-coupling.`);
    }
    
    return suggestions;
  }
}
