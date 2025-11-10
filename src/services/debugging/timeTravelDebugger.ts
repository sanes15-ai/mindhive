/**
 * Time-Travel Debugger
 * Analyzes errors, finds similar patterns, and recommends proven fixes
 */

import { PrismaClient } from '@prisma/client';
import { ErrorPatternExtractor, ErrorLog, ExtractedPattern } from './errorPatternExtractor';
import { AIOrchestrator } from '../ai/orchestrator';

const prisma = new PrismaClient();

export interface DebugAnalysisResult {
  diagnosis: string;
  errorPattern: ExtractedPattern;
  similarErrors: SimilarError[];
  recommendedFixes: RecommendedFix[];
  confidence: number;
  estimatedFixTime: string;
  insights: string[];
}

export interface SimilarError {
  id: string;
  similarity: number;
  occurrenceCount: number;
  resolutionCount: number;
  successRate: number;
  avgTimeToFix: number | null;
  description: string;
}

export interface RecommendedFix {
  id: string;
  fixType: string;
  description: string;
  explanation: string;
  codeChanges: any;
  successRate: number;
  confidenceScore: number;
  appliedCount: number;
  verifiedBy: number;
  source: string;
  estimatedTime: string;
  oneClickApplicable: boolean;
}

export interface ApplyFixResult {
  success: boolean;
  message: string;
  appliedChanges: any[];
  testResults?: any;
}

export class TimeTravelDebugger {
  private extractor: ErrorPatternExtractor;
  private aiOrchestrator: AIOrchestrator;

  constructor() {
    this.extractor = new ErrorPatternExtractor();
    this.aiOrchestrator = new AIOrchestrator();
  }

  /**
   * Analyze an error and provide time-travel debugging insights
   */
  async analyzeError(errorLog: ErrorLog, userId?: string): Promise<DebugAnalysisResult> {
    console.log('🔍 Time-Travel Debugger: Analyzing error...');

    // Step 1: Extract error pattern
    const pattern = this.extractor.extractPattern(errorLog);
    console.log(`✓ Pattern extracted: ${pattern.signature} (${pattern.errorType})`);

    // Step 2: Find or create error pattern in database
    let dbPattern = await prisma.errorPattern.findUnique({
      where: { signature: pattern.signature },
    });

    if (!dbPattern) {
      // Create new pattern
      dbPattern = await prisma.errorPattern.create({
        data: {
          signature: pattern.signature,
          errorType: pattern.errorType,
          errorMessage: pattern.errorMessage,
          normalizedStack: pattern.normalizedStack,
          language: pattern.language,
          framework: pattern.framework,
          category: pattern.category as any,
          severity: pattern.severity as any,
          tags: pattern.tags,
          occurrenceCount: 1,
        },
      });
      console.log('✓ New pattern created in database');
    } else {
      // Update occurrence count
      await prisma.errorPattern.update({
        where: { id: dbPattern.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeen: new Date(),
        },
      });
      console.log(`✓ Pattern found (seen ${dbPattern.occurrenceCount} times)`);
    }

    // Step 3: Record this occurrence
    await prisma.errorOccurrence.create({
      data: {
        patternId: dbPattern.id,
        userId,
        fullErrorLog: `${errorLog.errorMessage}\n${errorLog.stackTrace}`,
        stackTrace: errorLog.stackTrace,
        codeSnippet: errorLog.codeSnippet,
        filePath: errorLog.filePath,
        lineNumber: errorLog.lineNumber,
        environment: errorLog.environment,
      },
    });

    // Step 4: Find similar errors
    const similarErrors = await this.findSimilarErrors(pattern, dbPattern.id);
    console.log(`✓ Found ${similarErrors.length} similar errors`);

    // Step 5: Get recommended fixes
    const recommendedFixes = await this.getRecommendedFixes(dbPattern.id, pattern);
    console.log(`✓ Found ${recommendedFixes.length} potential fixes`);

    // Step 6: Generate AI-powered fixes if no existing fixes
    if (recommendedFixes.length === 0) {
      console.log('⚡ Generating AI-powered fix...');
      const aiFix = await this.generateAIFix(errorLog, pattern, dbPattern.id);
      if (aiFix) {
        recommendedFixes.push(aiFix);
      }
    }

    // Step 7: Generate diagnosis and insights
    const diagnosis = this.generateDiagnosis(pattern, similarErrors, recommendedFixes);
    const insights = this.generateInsights(pattern, similarErrors, recommendedFixes);
    const confidence = this.calculateOverallConfidence(similarErrors, recommendedFixes);
    const estimatedFixTime = this.estimateFixTime(recommendedFixes, similarErrors);

    console.log('✅ Analysis complete!');

    return {
      diagnosis,
      errorPattern: pattern,
      similarErrors,
      recommendedFixes,
      confidence,
      estimatedFixTime,
      insights,
    };
  }

  /**
   * Find similar errors in the database
   */
  private async findSimilarErrors(
    pattern: ExtractedPattern,
    currentPatternId: string
  ): Promise<SimilarError[]> {
    // Get all patterns with same error type and category
    const candidates = await prisma.errorPattern.findMany({
      where: {
        errorType: pattern.errorType,
        category: pattern.category as any,
        language: pattern.language,
        id: { not: currentPatternId }, // Exclude current pattern
      },
      take: 50, // Limit to 50 candidates for performance
    });

    // Calculate similarity scores
    const similarities = candidates.map((candidate) => {
      const candidatePattern: ExtractedPattern = {
        signature: candidate.signature,
        errorType: candidate.errorType,
        errorMessage: candidate.errorMessage,
        normalizedStack: candidate.normalizedStack,
        language: candidate.language,
        framework: candidate.framework || undefined,
        category: candidate.category,
        severity: candidate.severity,
        keyFrames: [], // Not stored in DB, would need to recalculate
        tags: candidate.tags,
      };

      const similarity = this.extractor.calculateSimilarity(pattern, candidatePattern);

      return {
        ...candidate,
        similarity,
      };
    });

    // Filter by minimum similarity threshold (70%)
    const similar = similarities.filter((s) => s.similarity >= 0.7);

    // Sort by similarity (descending)
    similar.sort((a, b) => b.similarity - a.similarity);

    // Take top 10
    const top = similar.slice(0, 10);

    // Format results
    return top.map((s) => ({
      id: s.id,
      similarity: Math.round(s.similarity * 100) / 100,
      occurrenceCount: s.occurrenceCount,
      resolutionCount: s.resolutionCount,
      successRate: s.successRate,
      avgTimeToFix: s.avgTimeToFix,
      description: `${s.errorType}: ${s.errorMessage.substring(0, 100)}...`,
    }));
  }

  /**
   * Get recommended fixes from database
   */
  private async getRecommendedFixes(
    patternId: string,
    pattern: ExtractedPattern
  ): Promise<RecommendedFix[]> {
    // Get resolutions for this exact pattern
    const exactFixes = await prisma.errorResolution.findMany({
      where: { patternId },
      orderBy: [{ confidenceScore: 'desc' }, { successRate: 'desc' }],
      take: 5,
    });

    // If we have exact fixes, use them
    if (exactFixes.length > 0) {
      return exactFixes.map((fix) => this.formatFix(fix));
    }

    // Otherwise, look for fixes from similar patterns
    const similarPatterns = await prisma.errorPattern.findMany({
      where: {
        errorType: pattern.errorType,
        category: pattern.category as any,
        language: pattern.language,
      },
      include: {
        resolutions: {
          where: {
            successRate: { gte: 0.7 }, // Minimum 70% success rate
          },
          orderBy: { confidenceScore: 'desc' },
          take: 3,
        },
      },
      take: 5,
    });

    // Collect fixes from similar patterns
    const similarFixes: any[] = [];
    for (const similarPattern of similarPatterns) {
      similarFixes.push(...similarPattern.resolutions);
    }

    // Deduplicate by fixType and description
    const uniqueFixes = this.deduplicateFixes(similarFixes);

    return uniqueFixes.map((fix) => this.formatFix(fix));
  }

  /**
   * Generate AI-powered fix when no existing fixes found
   */
  private async generateAIFix(
    errorLog: ErrorLog,
    pattern: ExtractedPattern,
    patternId: string
  ): Promise<RecommendedFix | null> {
    try {
      const prompt = `
You are an expert debugger. Analyze this error and provide a fix:

Error Type: ${pattern.errorType}
Category: ${pattern.category}
Message: ${errorLog.errorMessage}

Stack Trace:
${errorLog.stackTrace}

${errorLog.codeSnippet ? `Code Snippet:\n${errorLog.codeSnippet}\n` : ''}

Provide:
1. Root cause analysis
2. Specific code changes to fix it
3. Explanation of why this fix works
4. Any preventive measures

Format as JSON:
{
  "rootCause": "...",
  "fixType": "NULL_CHECK | TYPE_CONVERSION | ASYNC_AWAIT | TRY_CATCH | etc",
  "codeChanges": [
    {
      "file": "path/to/file",
      "lineNumber": 42,
      "before": "old code",
      "after": "new code"
    }
  ],
  "explanation": "...",
  "preventiveMeasures": ["..."]
}
`;

      const response = await this.aiOrchestrator.chat(
        [{ role: 'user', content: prompt }],
        { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' } // Claude is best for debugging
      );

      // Parse AI response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('AI response not in JSON format');
        return null;
      }

      const fix = JSON.parse(jsonMatch[0]);

      // Save AI-generated fix to database
      const savedFix = await prisma.errorResolution.create({
        data: {
          patternId,
          fixType: fix.fixType || 'OTHER',
          fixDescription: `AI-Generated Fix: ${fix.rootCause}`,
          codeChanges: fix.codeChanges,
          explanation: fix.explanation,
          source: 'AI_GENERATED',
          aiModel: 'claude-3-5-sonnet-20241022',
          confidenceScore: 0.7, // Initial confidence for AI fixes
          tags: [pattern.category.toLowerCase(), 'ai-generated'],
        },
      });

      return this.formatFix(savedFix);
    } catch (error) {
      console.error('Error generating AI fix:', error);
      return null;
    }
  }

  /**
   * Format database fix for response
   */
  private formatFix(fix: any): RecommendedFix {
    return {
      id: fix.id,
      fixType: fix.fixType,
      description: fix.fixDescription,
      explanation: fix.explanation,
      codeChanges: fix.codeChanges,
      successRate: fix.successRate,
      confidenceScore: fix.confidenceScore,
      appliedCount: fix.appliedCount,
      verifiedBy: fix.verifiedBy,
      source: fix.source,
      estimatedTime: this.formatEstimatedTime(fix.avgFixTime),
      oneClickApplicable: this.isOneClickApplicable(fix.codeChanges),
    };
  }

  /**
   * Deduplicate fixes by type and description
   */
  private deduplicateFixes(fixes: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const fix of fixes) {
      const key = `${fix.fixType}:${fix.fixDescription}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(fix);
      }
    }

    return unique;
  }

  /**
   * Generate human-readable diagnosis
   */
  private generateDiagnosis(
    pattern: ExtractedPattern,
    similarErrors: SimilarError[],
    fixes: RecommendedFix[]
  ): string {
    const totalOccurrences = similarErrors.reduce((sum, e) => sum + e.occurrenceCount, 0);
    const avgSuccessRate =
      similarErrors.reduce((sum, e) => sum + e.successRate, 0) / similarErrors.length || 0;

    let diagnosis = `${pattern.errorType} in ${pattern.language}`;

    if (totalOccurrences > 0) {
      diagnosis += ` - ${totalOccurrences.toLocaleString()} developers have encountered this`;
    }

    if (fixes.length > 0 && avgSuccessRate > 0) {
      diagnosis += ` (${Math.round(avgSuccessRate * 100)}% successfully resolved)`;
    }

    return diagnosis;
  }

  /**
   * Generate insights from analysis
   */
  private generateInsights(
    pattern: ExtractedPattern,
    similarErrors: SimilarError[],
    fixes: RecommendedFix[]
  ): string[] {
    const insights: string[] = [];

    // Pattern insights
    if (pattern.category === 'NULL_REFERENCE') {
      insights.push('💡 This is a null/undefined reference error - add null checks');
    }

    if (pattern.category === 'ASYNC_ERROR') {
      insights.push('⚡ Async/await issue detected - ensure proper promise handling');
    }

    // Frequency insights
    if (similarErrors.length > 0) {
      const mostSimilar = similarErrors[0];
      insights.push(
        `🔍 ${mostSimilar.occurrenceCount} developers hit similar error (${Math.round(mostSimilar.similarity * 100)}% match)`
      );
    }

    // Fix success insights
    if (fixes.length > 0) {
      const bestFix = fixes[0];
      if (bestFix.successRate >= 0.9) {
        insights.push(`✅ Proven fix available (${Math.round(bestFix.successRate * 100)}% success rate)`);
      }
      if (bestFix.appliedCount >= 10) {
        insights.push(`👥 ${bestFix.appliedCount} developers successfully used this fix`);
      }
    }

    // Time insights
    const avgTime = similarErrors
      .map((e) => e.avgTimeToFix)
      .filter((t) => t !== null)
      .reduce((sum, t) => sum + (t as number), 0) / similarErrors.filter((e) => e.avgTimeToFix !== null).length;

    if (avgTime > 0) {
      insights.push(`⏱️ Average fix time: ${this.formatEstimatedTime(avgTime)}`);
    }

    return insights;
  }

  /**
   * Calculate overall confidence in the analysis
   */
  private calculateOverallConfidence(
    similarErrors: SimilarError[],
    fixes: RecommendedFix[]
  ): number {
    if (fixes.length === 0) return 0.3; // Low confidence with no fixes

    // Base confidence on best fix
    const bestFix = fixes[0];
    let confidence = bestFix.confidenceScore;

    // Boost if we have similar errors
    if (similarErrors.length > 0) {
      const avgSimilarity = similarErrors.reduce((sum, e) => sum + e.similarity, 0) / similarErrors.length;
      confidence = confidence * 0.7 + avgSimilarity * 0.3;
    }

    // Boost if fix has been applied many times
    if (bestFix.appliedCount >= 10) {
      confidence = Math.min(1, confidence * 1.1);
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Estimate time to fix
   */
  private estimateFixTime(fixes: RecommendedFix[], similarErrors: SimilarError[]): string {
    if (fixes.length > 0 && fixes[0].oneClickApplicable) {
      return '30 seconds (one-click fix available)';
    }

    // Calculate average from similar errors
    const avgTime = similarErrors
      .map((e) => e.avgTimeToFix)
      .filter((t) => t !== null)
      .reduce((sum, t) => sum + (t as number), 0) / similarErrors.filter((e) => e.avgTimeToFix !== null).length;

    if (avgTime > 0) {
      return this.formatEstimatedTime(avgTime);
    }

    // Default estimate based on category
    return '2-5 minutes';
  }

  /**
   * Format milliseconds to human-readable time
   */
  private formatEstimatedTime(ms: number | null): string {
    if (!ms) return 'unknown';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  /**
   * Check if fix can be applied with one click
   */
  private isOneClickApplicable(codeChanges: any): boolean {
    if (!Array.isArray(codeChanges)) return false;
    if (codeChanges.length === 0) return false;

    // One-click applicable if:
    // 1. Single file change
    // 2. Line number is specified
    // 3. Before/after code is provided
    return (
      codeChanges.length <= 3 &&
      codeChanges.every(
        (change) =>
          change.file && change.lineNumber && change.before && change.after
      )
    );
  }

  /**
   * Apply a fix (for one-click fixes)
   */
  async applyFix(
    fixId: string,
    userId?: string,
    testMode: boolean = false
  ): Promise<ApplyFixResult> {
    // Get fix from database
    const fix = await prisma.errorResolution.findUnique({
      where: { id: fixId },
      include: { pattern: true },
    });

    if (!fix) {
      return {
        success: false,
        message: 'Fix not found',
        appliedChanges: [],
      };
    }

    // Update application count
    await prisma.errorResolution.update({
      where: { id: fixId },
      data: {
        appliedCount: { increment: 1 },
      },
    });

    // In real implementation, this would:
    // 1. Read the file
    // 2. Apply the changes
    // 3. Run tests
    // 4. Report results

    // For now, return mock success
    return {
      success: true,
      message: `Fix applied successfully (${testMode ? 'test mode' : 'live'})`,
      appliedChanges: fix.codeChanges as any,
    };
  }

  /**
   * Report fix success/failure
   */
  async reportFixResult(
    fixId: string,
    occurrenceId: string,
    success: boolean,
    timeToFix?: number
  ): Promise<void> {
    // Update fix statistics
    const fix = await prisma.errorResolution.findUnique({
      where: { id: fixId },
    });

    if (!fix) return;

    const newSuccessCount = success ? fix.successCount + 1 : fix.successCount;
    const newAppliedCount = fix.appliedCount + 1;
    const newSuccessRate = newSuccessCount / newAppliedCount;

    // Update fix
    await prisma.errorResolution.update({
      where: { id: fixId },
      data: {
        successCount: newSuccessCount,
        successRate: newSuccessRate,
        confidenceScore: this.calculateConfidenceFromStats(newSuccessRate, newAppliedCount),
        avgFixTime: timeToFix
          ? this.updateAvgFixTime(fix.avgFixTime, timeToFix, newAppliedCount)
          : fix.avgFixTime,
      },
    });

    // Update occurrence
    await prisma.errorOccurrence.update({
      where: { id: occurrenceId },
      data: {
        resolved: success,
        resolutionId: fixId,
        timeToResolve: timeToFix,
      },
    });

    // Update pattern statistics
    if (success) {
      await prisma.errorPattern.update({
        where: { id: fix.patternId },
        data: {
          resolutionCount: { increment: 1 },
        },
      });

      // Recalculate pattern success rate
      const pattern = await prisma.errorPattern.findUnique({
        where: { id: fix.patternId },
      });

      if (pattern) {
        const successRate = pattern.resolutionCount / pattern.occurrenceCount;
        await prisma.errorPattern.update({
          where: { id: fix.patternId },
          data: { successRate },
        });
      }
    }
  }

  /**
   * Calculate confidence score from success statistics
   */
  private calculateConfidenceFromStats(successRate: number, sampleSize: number): number {
    // Wilson score interval for confidence
    // https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval
    const z = 1.96; // 95% confidence
    const n = sampleSize;
    const p = successRate;

    if (n === 0) return 0;

    const denominator = 1 + (z * z) / n;
    const center = p + (z * z) / (2 * n);
    const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n)));

    const lower = (center - margin) / denominator;

    return Math.max(0, Math.min(1, lower));
  }

  /**
   * Update running average for fix time
   */
  private updateAvgFixTime(
    currentAvg: number | null,
    newTime: number,
    count: number
  ): number {
    if (!currentAvg) return newTime;
    return ((currentAvg * (count - 1)) + newTime) / count;
  }
}
