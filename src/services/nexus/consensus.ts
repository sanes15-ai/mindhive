/**
 * NEXUS Consensus Engine
 * Multi-model consensus system to eliminate AI hallucinations
 * 
 * Strategy:
 * 1. Call multiple AI models in parallel (GPT-4, Claude, Gemini)
 * 2. Compare outputs using semantic similarity
 * 3. If agreement >= 85%, use consensus response
 * 4. If disagreement, use voting mechanism with confidence scores
 * 5. Log all decisions for continuous improvement
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { prisma } from '../../index';

// Model configurations
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-placeholder',
});

const gemini = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY || 'placeholder'
);

interface ModelResponse {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  content: string;
  confidence: number;
  latency: number;
  tokensUsed: number;
}

interface ConsensusResult {
  finalResponse: string;
  confidence: number;
  agreement: number; // 0-1 scale
  modelResponses: ModelResponse[];
  decision: 'consensus' | 'voting' | 'fallback';
  explanation: string;
}

export class NexusConsensus {
  private similarityThreshold = 0.85; // 85% agreement required
  private minConfidence = 0.7; // Minimum confidence to accept

  /**
   * Generate code with multi-model consensus
   */
  async generateWithConsensus(
    prompt: string,
    language: string,
    context?: any
  ): Promise<ConsensusResult> {
    logger.info('🛡️ NEXUS: Starting multi-model consensus', {
      prompt: prompt.substring(0, 100),
      language,
    });

    const startTime = Date.now();

    try {
      // Call all models in parallel
      const responses = await Promise.allSettled([
        this.callOpenAI(prompt, language, context),
        this.callClaude(prompt, language, context),
        this.callGemini(prompt, language, context),
      ]);

      // Extract successful responses
      const modelResponses: ModelResponse[] = responses
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<ModelResponse>).value);

      if (modelResponses.length === 0) {
        throw new AppError(500, 'All AI models failed to respond');
      }

      // Calculate consensus
      const consensusResult = await this.calculateConsensus(modelResponses);

      // Track statistics in database
      const totalLatency = Date.now() - startTime;
      await this.trackStatistics(
        prompt,
        language,
        consensusResult,
        modelResponses,
        totalLatency,
        context
      );

      logger.info('🛡️ NEXUS: Consensus reached', {
        decision: consensusResult.decision,
        agreement: consensusResult.agreement,
        confidence: consensusResult.confidence,
      });

      return consensusResult;
    } catch (error) {
      logger.error('🛡️ NEXUS: Consensus failed', { error });
      throw error;
    }
  }

  /**
   * Call OpenAI GPT-4
   */
  private async callOpenAI(
    prompt: string,
    language: string,
    context?: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert ${language} developer. Generate clean, production-ready code with best practices.${
              context ? `\n\nContext: ${JSON.stringify(context)}` : ''
            }`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content || '';
      const latency = Date.now() - startTime;

      return {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        content,
        confidence: this.calculateConfidence(completion.choices[0]),
        latency,
        tokensUsed: completion.usage?.total_tokens || 0,
      };
    } catch (error) {
      logger.error('OpenAI call failed', { error });
      throw error;
    }
  }

  /**
   * Call Anthropic Claude
   */
  private async callClaude(
    prompt: string,
    language: string,
    context?: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        temperature: 0.3,
        system: `You are an expert ${language} developer. Generate clean, production-ready code with best practices.${
          context ? `\n\nContext: ${JSON.stringify(context)}` : ''
        }`,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content =
        message.content[0].type === 'text' ? message.content[0].text : '';
      const latency = Date.now() - startTime;

      return {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        content,
        confidence: 0.9, // Claude typically has high confidence
        latency,
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      };
    } catch (error) {
      logger.error('Claude call failed', { error });
      throw error;
    }
  }

  /**
   * Call Google Gemini
   */
  private async callGemini(
    prompt: string,
    language: string,
    context?: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const model = gemini.getGenerativeModel({ model: 'gemini-pro' });

      const fullPrompt = `You are an expert ${language} developer. Generate clean, production-ready code with best practices.${
        context ? `\n\nContext: ${JSON.stringify(context)}` : ''
      }\n\n${prompt}`;

      const result = await model.generateContent(fullPrompt);
      const content = result.response.text();
      const latency = Date.now() - startTime;

      return {
        provider: 'google',
        model: 'gemini-pro',
        content,
        confidence: 0.85, // Gemini confidence estimate
        latency,
        tokensUsed: 0, // Google doesn't provide token counts easily
      };
    } catch (error) {
      logger.error('Gemini call failed', { error });
      throw error;
    }
  }

  /**
   * Calculate consensus from multiple model responses
   */
  private async calculateConsensus(
    responses: ModelResponse[]
  ): Promise<ConsensusResult> {
    if (responses.length === 1) {
      // Only one model responded - use it but flag low confidence
      return {
        finalResponse: responses[0].content,
        confidence: responses[0].confidence * 0.8, // Reduce confidence
        agreement: 0,
        modelResponses: responses,
        decision: 'fallback',
        explanation: 'Only one model responded',
      };
    }

    // Compare all pairs of responses for similarity
    const similarities: number[] = [];
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateSemanticSimilarity(
          responses[i].content,
          responses[j].content
        );
        similarities.push(similarity);
      }
    }

    const avgSimilarity =
      similarities.reduce((a, b) => a + b, 0) / similarities.length;

    // High agreement - use consensus
    if (avgSimilarity >= this.similarityThreshold) {
      const bestResponse = this.selectBestResponse(responses);
      return {
        finalResponse: bestResponse.content,
        confidence: bestResponse.confidence,
        agreement: avgSimilarity,
        modelResponses: responses,
        decision: 'consensus',
        explanation: `Models agree with ${(avgSimilarity * 100).toFixed(1)}% similarity`,
      };
    }

    // Low agreement - use voting with confidence weights
    const votingResult = this.conductVoting(responses);
    return {
      finalResponse: votingResult.content,
      confidence: votingResult.confidence * 0.9, // Slight reduction for disagreement
      agreement: avgSimilarity,
      modelResponses: responses,
      decision: 'voting',
      explanation: `Models disagreed (${(avgSimilarity * 100).toFixed(1)}% similarity), used confidence-weighted voting`,
    };
  }

  /**
   * Calculate semantic similarity between two code outputs
   * Uses simple text similarity for now, can be upgraded to embeddings
   */
  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // Remove whitespace and normalize
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[{}();,]/g, '')
        .trim();

    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    // Simple Jaccard similarity on words
    const words1 = new Set(norm1.split(' '));
    const words2 = new Set(norm2.split(' '));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Also check for exact code block matches
    const codeBlocks1: string[] = text1.match(/```[\s\S]*?```/g) || [];
    const codeBlocks2: string[] = text2.match(/```[\s\S]*?```/g) || [];

    let codeBlockSimilarity = 0;
    if (codeBlocks1.length > 0 && codeBlocks2.length > 0) {
      const exactMatches = codeBlocks1.filter((block: string) =>
        codeBlocks2.includes(block)
      ).length;
      codeBlockSimilarity =
        exactMatches / Math.max(codeBlocks1.length, codeBlocks2.length);
    }

    // Weighted average: 70% word similarity, 30% code block similarity
    return jaccardSimilarity * 0.7 + codeBlockSimilarity * 0.3;
  }

  /**
   * Calculate confidence score for OpenAI response
   */
  private calculateConfidence(choice: any): number {
    // Base confidence on finish_reason and logprobs if available
    let confidence = 0.8; // Default

    if (choice.finish_reason === 'stop') {
      confidence += 0.1; // Completed naturally
    }

    if (choice.logprobs) {
      // Average token probability (if available)
      const avgProb =
        choice.logprobs.content.reduce((sum: number, token: any) => {
          return sum + Math.exp(token.logprob);
        }, 0) / choice.logprobs.content.length;
      confidence = Math.min(confidence, avgProb);
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Select best response based on confidence and latency
   */
  private selectBestResponse(responses: ModelResponse[]): ModelResponse {
    // Weight: 70% confidence, 30% speed (inverse of latency)
    const maxLatency = Math.max(...responses.map((r) => r.latency));

    return responses.reduce((best, current) => {
      const currentScore =
        current.confidence * 0.7 +
        (1 - current.latency / maxLatency) * 0.3;
      const bestScore =
        best.confidence * 0.7 + (1 - best.latency / maxLatency) * 0.3;

      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Conduct voting with confidence weights
   */
  private conductVoting(responses: ModelResponse[]): ModelResponse {
    // Weight each response by its confidence
    const weightedResponses = responses.map((r) => ({
      ...r,
      weight: r.confidence,
    }));

    // For now, return highest confidence response
    // In future, could use more sophisticated voting
    return weightedResponses.reduce((best, current) =>
      current.weight > best.weight ? current : best
    );
  }

  /**
   * Update similarity threshold (for tuning)
   */
  setSimilarityThreshold(threshold: number) {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.similarityThreshold = threshold;
    logger.info('🛡️ NEXUS: Similarity threshold updated', { threshold });
  }

  /**
   * Track consensus statistics in database
   */
  private async trackStatistics(
    prompt: string,
    language: string,
    consensusResult: ConsensusResult,
    modelResponses: ModelResponse[],
    totalLatency: number,
    context?: any
  ): Promise<void> {
    try {
      const openaiResponse = modelResponses.find((r) => r.provider === 'openai');
      const claudeResponse = modelResponses.find((r) => r.provider === 'anthropic');
      const geminiResponse = modelResponses.find((r) => r.provider === 'google');

      const totalTokens = modelResponses.reduce(
        (sum, r) => sum + r.tokensUsed,
        0
      );

      await prisma.consensusStatistic.create({
        data: {
          prompt: prompt.substring(0, 1000), // Truncate for storage
          language,
          decision: consensusResult.decision.toUpperCase() as any,
          agreement: consensusResult.agreement,
          finalConfidence: consensusResult.confidence,
          openaiResponse: !!openaiResponse,
          claudeResponse: !!claudeResponse,
          geminiResponse: !!geminiResponse,
          openaiLatency: openaiResponse?.latency,
          claudeLatency: claudeResponse?.latency,
          geminiLatency: geminiResponse?.latency,
          totalLatency,
          tokensUsed: totalTokens,
          userId: context?.userId,
          context: context ? JSON.parse(JSON.stringify(context)) : undefined,
          tags: context?.tags || [],
        },
      });

      logger.debug('🛡️ NEXUS: Statistics tracked', {
        decision: consensusResult.decision,
        totalLatency,
        tokensUsed: totalTokens,
      });
    } catch (error) {
      // Don't fail the request if statistics tracking fails
      logger.error('🛡️ NEXUS: Failed to track statistics', { error });
    }
  }

  /**
   * Get consensus statistics from database
   */
  async getStatistics(filter?: {
    language?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const where: any = {};
      if (filter?.language) where.language = filter.language;
      if (filter?.userId) where.userId = filter.userId;
      if (filter?.startDate || filter?.endDate) {
        where.requestTimestamp = {};
        if (filter.startDate) where.requestTimestamp.gte = filter.startDate;
        if (filter.endDate) where.requestTimestamp.lte = filter.endDate;
      }

      const [total, stats] = await Promise.all([
        prisma.consensusStatistic.count({ where }),
        prisma.consensusStatistic.groupBy({
          by: ['decision'],
          where,
          _count: true,
          _avg: {
            agreement: true,
            finalConfidence: true,
            totalLatency: true,
            tokensUsed: true,
          },
        }),
      ]);

      const consensusCount =
        stats.find((s) => s.decision === 'CONSENSUS')?._count || 0;
      const votingCount =
        stats.find((s) => s.decision === 'VOTING')?._count || 0;
      const fallbackCount =
        stats.find((s) => s.decision === 'FALLBACK')?._count || 0;

      const avgAgreement =
        stats.reduce((sum, s) => sum + (s._avg.agreement || 0), 0) /
          stats.length || 0;
      const avgConfidence =
        stats.reduce((sum, s) => sum + (s._avg.finalConfidence || 0), 0) /
          stats.length || 0;
      const avgLatency =
        stats.reduce((sum, s) => sum + (s._avg.totalLatency || 0), 0) /
          stats.length || 0;
      const avgTokens =
        stats.reduce((sum, s) => sum + (s._avg.tokensUsed || 0), 0) /
          stats.length || 0;

      return {
        totalRequests: total,
        consensusRate: total > 0 ? consensusCount / total : 0,
        votingRate: total > 0 ? votingCount / total : 0,
        fallbackRate: total > 0 ? fallbackCount / total : 0,
        avgAgreement,
        avgConfidence,
        avgLatency,
        avgTokens,
        breakdown: {
          consensus: consensusCount,
          voting: votingCount,
          fallback: fallbackCount,
        },
      };
    } catch (error) {
      logger.error('🛡️ NEXUS: Failed to get statistics', { error });
      return {
        totalRequests: 0,
        consensusRate: 0,
        votingRate: 0,
        fallbackRate: 0,
        avgAgreement: 0,
        avgConfidence: 0,
        avgLatency: 0,
        avgTokens: 0,
        breakdown: {
          consensus: 0,
          voting: 0,
          fallback: 0,
        },
      };
    }
  }
}

export const nexusConsensus = new NexusConsensus();

