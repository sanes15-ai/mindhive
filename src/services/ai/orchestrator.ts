import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Ollama from 'ollama';
import axios from 'axios';
import { logger } from '../../utils/logger';

export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'grok' | 'ollama';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  confidence?: number;
}

export class AIOrchestrator {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private google: GoogleGenerativeAI | null = null;
  private ollama: typeof Ollama | null = null;

  async initialize(): Promise<void> {
    try {
      // Initialize OpenAI
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          organization: process.env.OPENAI_ORG_ID,
        });
        logger.info('✅ OpenAI initialized');
      }

      // Initialize Anthropic
      if (process.env.ANTHROPIC_API_KEY) {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        logger.info('✅ Anthropic Claude initialized');
      }

      // Initialize Google Gemini
      if (process.env.GOOGLE_API_KEY) {
        this.google = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        logger.info('✅ Google Gemini initialized');
      }

      // Initialize Ollama
      if (process.env.OLLAMA_HOST) {
        this.ollama = Ollama;
        logger.info('✅ Ollama initialized');
      }

      logger.info('🤖 AI Orchestrator ready with multi-provider support');
    } catch (error) {
      logger.error('Failed to initialize AI providers:', error);
      throw error;
    }
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    config?: AIModelConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || 'openai';
    const model = config?.model || this.getDefaultModel(provider);

    try {
      switch (provider) {
        case 'openai':
          return await this.chatOpenAI(messages, model, config);
        case 'anthropic':
          return await this.chatAnthropic(messages, model, config);
        case 'google':
          return await this.chatGoogle(messages, model, config);
        case 'grok':
          return await this.chatGrok(messages, model, config);
        case 'ollama':
          return await this.chatOllama(messages, model, config);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error(`Error in ${provider} chat:`, error);
      throw error;
    }
  }

  private async chatOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string,
    config?: AIModelConfig
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages: messages as any,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || 4096,
      top_p: config?.topP || 1,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model,
      provider: 'openai',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  private async chatAnthropic(
    messages: Array<{ role: string; content: string }>,
    model: string,
    config?: AIModelConfig
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic not initialized');
    }

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7,
      system: systemMessage?.content,
      messages: userMessages as any,
    });

    const content = response.content[0];
    return {
      content: content.type === 'text' ? content.text : '',
      model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  private async chatGoogle(
    messages: Array<{ role: string; content: string }>,
    model: string,
    config?: AIModelConfig
  ): Promise<AIResponse> {
    if (!this.google) {
      throw new Error('Google not initialized');
    }

    const gemini = this.google.getGenerativeModel({ model });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = gemini.startChat({
      history,
      generationConfig: {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxTokens || 4096,
        topP: config?.topP || 1,
      },
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return {
      content: response.text(),
      model,
      provider: 'google',
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  private async chatGrok(
    messages: Array<{ role: string; content: string }>,
    model: string,
    config?: AIModelConfig
  ): Promise<AIResponse> {
    if (!process.env.GROK_API_KEY) {
      throw new Error('Grok API key not configured');
    }

    const response = await axios.post(
      `${process.env.GROK_API_URL || 'https://api.x.ai/v1'}/chat/completions`,
      {
        model,
        messages,
        temperature: config?.temperature || 0.7,
        max_tokens: config?.maxTokens || 4096,
        top_p: config?.topP || 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        },
      }
    );

    return {
      content: response.data.choices[0]?.message?.content || '',
      model,
      provider: 'grok',
      usage: {
        promptTokens: response.data.usage?.prompt_tokens || 0,
        completionTokens: response.data.usage?.completion_tokens || 0,
        totalTokens: response.data.usage?.total_tokens || 0,
      },
    };
  }

  private async chatOllama(
    messages: Array<{ role: string; content: string }>,
    model: string,
    config?: AIModelConfig
  ): Promise<AIResponse> {
    if (!this.ollama) {
      throw new Error('Ollama not initialized');
    }

    const response = await this.ollama.chat({
      model,
      messages: messages as any,
      options: {
        temperature: config?.temperature || 0.7,
        num_predict: config?.maxTokens || 4096,
        top_p: config?.topP || 1,
      },
    });

    return {
      content: response.message.content,
      model,
      provider: 'ollama',
    };
  }

  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      openai: 'gpt-4-turbo-preview',
      anthropic: 'claude-3-5-sonnet-20241022',
      google: 'gemini-1.5-pro',
      grok: 'grok-beta',
      ollama: 'codellama:34b',
    };
    return defaults[provider] || 'gpt-4-turbo-preview';
  }

  // Generate code embeddings
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized for embeddings');
    }

    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    });

    return response.data[0].embedding;
  }

  // Multi-model consensus for high-confidence answers
  async getConsensus(
    messages: Array<{ role: string; content: string }>,
    providers: string[] = ['openai', 'anthropic', 'google']
  ): Promise<AIResponse & { consensus: boolean }> {
    const responses = await Promise.all(
      providers.map((provider) =>
        this.chat(messages, { provider: provider as any, model: this.getDefaultModel(provider) })
      )
    );

    // Simple consensus check (in production, use semantic similarity)
    const contents = responses.map((r) => r.content);
    const uniqueContents = new Set(contents);
    const consensus = uniqueContents.size === 1;

    return {
      ...responses[0],
      consensus,
      confidence: consensus ? 1.0 : 0.7,
    };
  }

  // Stream response
  async *streamChat(
    messages: Array<{ role: string; content: string }>,
    config?: AIModelConfig
  ): AsyncGenerator<string> {
    const provider = config?.provider || 'openai';

    if (provider === 'openai' && this.openai) {
      const stream = await this.openai.chat.completions.create({
        model: config?.model || 'gpt-4-turbo-preview',
        messages: messages as any,
        temperature: config?.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }
    } else {
      // Fallback to non-streaming for other providers
      const response = await this.chat(messages, config);
      yield response.content;
    }
  }
}

