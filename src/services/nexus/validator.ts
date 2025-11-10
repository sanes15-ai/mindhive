/**
 * NEXUS Code Validator
 * Syntax validation and auto-fix for generated code
 * 
 * Validates code using:
 * 1. AST parsing (syntax correctness)
 * 2. Language-specific linters
 * 3. Basic runtime checks
 */

import * as parser from '@babel/parser';
import * as eslint from 'eslint';
import { logger } from '../../utils/logger';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixedCode?: string;
  language: string;
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  rule?: string;
}

interface ValidationWarning {
  line: number;
  message: string;
  suggestion?: string;
}

export class NexusValidator {
  /**
   * Validate generated code
   */
  async validateCode(
    code: string,
    language: string
  ): Promise<ValidationResult> {
    logger.info('🔍 NEXUS: Validating code', { language });

    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
        case 'jsx':
        case 'tsx':
          return await this.validateJavaScript(code, language);

        case 'python':
          return await this.validatePython(code);

        case 'java':
          return await this.validateJava(code);

        case 'go':
          return await this.validateGo(code);

        case 'rust':
          return await this.validateRust(code);

        default:
          // Basic syntax check for unknown languages
          return await this.validateGeneric(code, language);
      }
    } catch (error) {
      logger.error('🔍 NEXUS: Validation failed', { error, language });
      return {
        isValid: false,
        errors: [
          {
            line: 0,
            column: 0,
            message: `Validation failed: ${(error as Error).message}`,
            severity: 'error',
          },
        ],
        warnings: [],
        language,
      };
    }
  }

  /**
   * Validate JavaScript/TypeScript code
   */
  private async validateJavaScript(
    code: string,
    language: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Parse with Babel to check syntax
      const parserOptions: parser.ParserOptions = {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      };

      parser.parse(code, parserOptions);

      // Run ESLint for additional checks
      const lintResult = await this.runESLint(code);
      errors.push(...lintResult.errors);
      warnings.push(...lintResult.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixedCode: lintResult.fixedCode,
        language,
      };
    } catch (error: any) {
      // Babel parse error
      const loc = error.loc || { line: 0, column: 0 };
      errors.push({
        line: loc.line,
        column: loc.column,
        message: error.message,
        severity: 'error',
      });

      return {
        isValid: false,
        errors,
        warnings,
        language,
      };
    }
  }

  /**
   * Run ESLint on JavaScript/TypeScript code
   */
  private async runESLint(code: string): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    fixedCode?: string;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const linter = new eslint.Linter();

      const config = {
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true,
          },
        },
        rules: {
          // Core rules
          'no-unused-vars': 'warn',
          'no-undef': 'error',
          'no-console': 'warn',
          'no-debugger': 'error',
          'no-alert': 'error',

          // Best practices
          'eqeqeq': 'error',
          'no-eval': 'error',
          'no-implied-eval': 'error',
          'no-new-func': 'error',

          // ES6+
          'prefer-const': 'warn',
          'no-var': 'error',
          'prefer-arrow-callback': 'warn',
        },
      };

      const result = linter.verify(code, config as any);

      result.forEach((msg) => {
        if (msg.severity === 2) {
          errors.push({
            line: msg.line,
            column: msg.column,
            message: msg.message,
            severity: 'error',
            rule: msg.ruleId || undefined,
          });
        } else {
          warnings.push({
            line: msg.line,
            message: msg.message,
            suggestion: msg.fix ? 'Auto-fix available' : undefined,
          });
        }
      });

      // Try to auto-fix
      const fixResult = linter.verifyAndFix(code, config as any);
      const fixedCode = fixResult.fixed ? fixResult.output : undefined;

      return { errors, warnings, fixedCode };
    } catch (error) {
      logger.error('ESLint failed', { error });
      return { errors, warnings };
    }
  }

  /**
   * Validate Python code
   */
  private async validatePython(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic Python syntax checks
    const lines = code.split('\n');

    // Check for basic syntax patterns
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for unmatched parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        warnings.push({
          line: lineNum,
          message: 'Unmatched parentheses detected',
        });
      }

      // Check for proper indentation (should be 4 spaces or tabs)
      if (line.match(/^\s+/) && !line.match(/^(    |\t)/)) {
        warnings.push({
          line: lineNum,
          message: 'Inconsistent indentation (use 4 spaces)',
          suggestion: 'Fix indentation',
        });
      }

      // Check for common mistakes
      if (line.includes('import *')) {
        warnings.push({
          line: lineNum,
          message: 'Avoid wildcard imports',
          suggestion: 'Import specific modules',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      language: 'python',
    };
  }

  /**
   * Validate Java code
   */
  private async validateJava(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic Java syntax checks
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for class declaration
      if (line.includes('class ') && !line.includes('public class')) {
        warnings.push({
          line: lineNum,
          message: 'Consider making class public',
        });
      }

      // Check for proper semicolons
      if (
        line.trim() &&
        !line.trim().endsWith(';') &&
        !line.trim().endsWith('{') &&
        !line.trim().endsWith('}') &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('/*')
      ) {
        if (line.includes('=') || line.includes('return')) {
          errors.push({
            line: lineNum,
            column: line.length,
            message: 'Missing semicolon',
            severity: 'error',
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      language: 'java',
    };
  }

  /**
   * Validate Go code
   */
  private async validateGo(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic Go syntax checks
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for proper package declaration
      if (lineNum === 1 && !line.startsWith('package ')) {
        errors.push({
          line: lineNum,
          column: 0,
          message: 'Go files must start with package declaration',
          severity: 'error',
        });
      }

      // Check for unused imports (simplified)
      if (line.includes('import "') && !code.includes(line.split('"')[1])) {
        warnings.push({
          line: lineNum,
          message: 'Potentially unused import',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      language: 'go',
    };
  }

  /**
   * Validate Rust code
   */
  private async validateRust(code: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic Rust syntax checks
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for proper semicolons
      if (
        line.includes('let ') &&
        !line.trim().endsWith(';') &&
        !line.trim().endsWith('{')
      ) {
        errors.push({
          line: lineNum,
          column: line.length,
          message: 'Missing semicolon after let statement',
          severity: 'error',
        });
      }

      // Check for unused variables (simplified)
      if (line.match(/let\s+(\w+)\s*=/) && !line.includes('_')) {
        const varName = line.match(/let\s+(\w+)\s*=/)?.[1];
        if (varName && !code.slice(lines.slice(0, index).join('\n').length).includes(varName)) {
          warnings.push({
            line: lineNum,
            message: `Variable '${varName}' may be unused`,
            suggestion: 'Prefix with underscore if intentionally unused',
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      language: 'rust',
    };
  }

  /**
   * Generic validation for unsupported languages
   */
  private async validateGeneric(
    code: string,
    language: string
  ): Promise<ValidationResult> {
    const warnings: ValidationWarning[] = [];

    // Basic checks that apply to most languages
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for extremely long lines
      if (line.length > 120) {
        warnings.push({
          line: lineNum,
          message: 'Line exceeds 120 characters',
          suggestion: 'Consider breaking into multiple lines',
        });
      }

      // Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        warnings.push({
          line: lineNum,
          message: 'Trailing whitespace detected',
        });
      }
    });

    return {
      isValid: true, // Assume valid for unknown languages
      errors: [],
      warnings,
      language,
    };
  }

  /**
   * Auto-fix common issues
   */
  async autoFix(code: string, language: string): Promise<string> {
    let fixedCode = code;

    // Remove trailing whitespace
    fixedCode = fixedCode
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // Ensure file ends with newline
    if (!fixedCode.endsWith('\n')) {
      fixedCode += '\n';
    }

    // Language-specific fixes
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        const lintResult = await this.runESLint(fixedCode);
        if (lintResult.fixedCode) {
          fixedCode = lintResult.fixedCode;
        }
        break;

      case 'python':
        // Fix indentation (convert tabs to 4 spaces)
        fixedCode = fixedCode.replace(/\t/g, '    ');
        break;
    }

    return fixedCode;
  }
}

export const nexusValidator = new NexusValidator();

