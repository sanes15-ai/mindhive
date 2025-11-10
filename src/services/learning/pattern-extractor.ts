import * as babel from '@babel/parser';
import traverse from '@babel/traverse';
import { logger } from '../../utils/logger';

export interface ExtractedPatterns {
  // Naming conventions
  namingConventions: {
    variables: string;
    functions: string;
    classes: string;
    constants: string;
  };

  // Code organization
  codeOrganization: {
    importsStyle: 'named' | 'default' | 'mixed';
    exportStyle: 'named' | 'default' | 'mixed';
    usesTypeScript: boolean;
    usesJSX: boolean;
  };

  // React patterns (if applicable)
  reactPatterns?: {
    componentStyle: 'functional' | 'class' | 'mixed';
    usesHooks: boolean;
    stateManagement: 'useState' | 'useReducer' | 'class' | 'mixed';
    propTypes: 'typescript' | 'prop-types' | 'none';
  };

  // General patterns
  generalPatterns: {
    usesArrowFunctions: boolean;
    usesAsyncAwait: boolean;
    usesDestructuring: boolean;
    usesSpreadOperator: boolean;
    usesTemplateLiterals: boolean;
  };

  // Architecture patterns
  architecturePatterns: string[]; // e.g., ['MVC', 'Hooks', 'HOC', 'Composition']

  // Code style
  codeStyle: {
    quotesStyle: 'single' | 'double' | 'mixed';
    semicolons: boolean;
    trailingCommas: boolean;
  };
}

export class PatternExtractor {
  /**
   * Extract coding patterns from accepted code
   */
  async extractPatterns(
    code: string,
    language: string,
    framework?: string
  ): Promise<ExtractedPatterns> {
    try {
      // Only parse JavaScript/TypeScript for now
      if (!['javascript', 'typescript', 'jsx', 'tsx'].includes(language.toLowerCase())) {
        logger.warn(`Pattern extraction not yet supported for ${language}`);
        return this.getDefaultPatterns();
      }

      const isTypeScript = ['typescript', 'tsx'].includes(language.toLowerCase());
      const isJSX = ['jsx', 'tsx'].includes(language.toLowerCase());

      // Parse code with Babel
      const ast = babel.parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'asyncGenerators',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      });

      const patterns: ExtractedPatterns = {
        namingConventions: {
          variables: 'mixed',
          functions: 'mixed',
          classes: 'mixed',
          constants: 'mixed',
        },
        codeOrganization: {
          importsStyle: 'mixed',
          exportStyle: 'mixed',
          usesTypeScript: isTypeScript,
          usesJSX: isJSX,
        },
        generalPatterns: {
          usesArrowFunctions: false,
          usesAsyncAwait: false,
          usesDestructuring: false,
          usesSpreadOperator: false,
          usesTemplateLiterals: false,
        },
        architecturePatterns: [],
        codeStyle: {
          quotesStyle: 'mixed',
          semicolons: false,
          trailingCommas: false,
        },
      };

      // Collect identifiers for naming analysis
      const variableNames: string[] = [];
      const functionNames: string[] = [];
      const classNames: string[] = [];
      const constantNames: string[] = [];

      // Analyze AST
      traverse(ast, {
        // Variable declarations
        VariableDeclarator(path) {
          if (path.node.id.type === 'Identifier') {
            const name = path.node.id.name;
            const parent = path.parent;
            
            if (parent.type === 'VariableDeclaration' && parent.kind === 'const') {
              // Check if it's a constant (all uppercase)
              if (name === name.toUpperCase() && name.includes('_')) {
                constantNames.push(name);
              } else {
                variableNames.push(name);
              }
            } else {
              variableNames.push(name);
            }
          }
        },

        // Function declarations and expressions
        FunctionDeclaration(path) {
          if (path.node.id) {
            functionNames.push(path.node.id.name);
          }
          
          if (path.node.async) {
            patterns.generalPatterns.usesAsyncAwait = true;
          }
        },

        ArrowFunctionExpression(path) {
          patterns.generalPatterns.usesArrowFunctions = true;
          
          if (path.node.async) {
            patterns.generalPatterns.usesAsyncAwait = true;
          }
        },

        // Class declarations
        ClassDeclaration(path) {
          if (path.node.id) {
            classNames.push(path.node.id.name);
          }
        },

        // React component detection
        JSXElement() {
          if (!patterns.reactPatterns) {
            patterns.reactPatterns = {
              componentStyle: 'functional',
              usesHooks: false,
              stateManagement: 'mixed',
              propTypes: isTypeScript ? 'typescript' : 'none',
            };
          }
        },

        // React hooks
        CallExpression(path) {
          if (path.node.callee.type === 'Identifier') {
            const name = path.node.callee.name;
            
            // Detect React hooks
            if (name.startsWith('use') && patterns.reactPatterns) {
              patterns.reactPatterns.usesHooks = true;
              
              if (name === 'useState') {
                patterns.reactPatterns.stateManagement = 'useState';
              } else if (name === 'useReducer') {
                patterns.reactPatterns.stateManagement = 'useReducer';
              }
            }

            // Detect async/await
            if (name === 'await') {
              patterns.generalPatterns.usesAsyncAwait = true;
            }
          }
        },

        // Destructuring
        ObjectPattern() {
          patterns.generalPatterns.usesDestructuring = true;
        },

        ArrayPattern() {
          patterns.generalPatterns.usesDestructuring = true;
        },

        // Spread operator
        SpreadElement() {
          patterns.generalPatterns.usesSpreadOperator = true;
        },

        ObjectProperty(path) {
          // Check for spread in object properties
          if (path.node.value && 'type' in path.node.value) {
            patterns.generalPatterns.usesSpreadOperator = true;
          }
        },

        // Template literals
        TemplateLiteral() {
          patterns.generalPatterns.usesTemplateLiterals = true;
        },

        // Import/Export style
        ImportDeclaration(path) {
          if (path.node.specifiers.length > 0) {
            const hasDefault = path.node.specifiers.some(
              (s) => s.type === 'ImportDefaultSpecifier'
            );
            const hasNamed = path.node.specifiers.some(
              (s) => s.type === 'ImportSpecifier'
            );

            if (hasDefault && !hasNamed) {
              patterns.codeOrganization.importsStyle = 'default';
            } else if (!hasDefault && hasNamed) {
              patterns.codeOrganization.importsStyle = 'named';
            } else {
              patterns.codeOrganization.importsStyle = 'mixed';
            }
          }
        },

        ExportNamedDeclaration() {
          patterns.codeOrganization.exportStyle = 'named';
        },

        ExportDefaultDeclaration() {
          patterns.codeOrganization.exportStyle = 'default';
        },

        // String literals for quote style
        StringLiteral(path) {
          const raw = code.substring(path.node.start || 0, path.node.end || 0);
          if (raw.startsWith("'")) {
            patterns.codeStyle.quotesStyle = 'single';
          } else if (raw.startsWith('"')) {
            patterns.codeStyle.quotesStyle = 'double';
          }
        },
      });

      // Analyze naming conventions
      patterns.namingConventions.variables = this.detectNamingStyle(variableNames);
      patterns.namingConventions.functions = this.detectNamingStyle(functionNames);
      patterns.namingConventions.classes = this.detectNamingStyle(classNames);
      patterns.namingConventions.constants = this.detectNamingStyle(constantNames);

      // Detect architecture patterns
      if (patterns.reactPatterns?.usesHooks) {
        patterns.architecturePatterns.push('Hooks');
      }
      if (patterns.reactPatterns?.componentStyle === 'functional') {
        patterns.architecturePatterns.push('Functional Components');
      }
      if (patterns.generalPatterns.usesAsyncAwait) {
        patterns.architecturePatterns.push('Async/Await');
      }

      // Detect semicolons and trailing commas from raw code
      patterns.codeStyle.semicolons = code.includes(';');
      patterns.codeStyle.trailingCommas = /,\s*[}\])]/.test(code);

      logger.info('Pattern extraction successful', {
        language,
        framework,
        patternsFound: Object.keys(patterns.architecturePatterns).length,
      });

      return patterns;
    } catch (error) {
      logger.error('Failed to extract patterns', { error, language });
      return this.getDefaultPatterns();
    }
  }

  /**
   * Detect naming style from a list of identifiers
   */
  private detectNamingStyle(names: string[]): string {
    if (names.length === 0) return 'mixed';

    const styles = {
      camelCase: 0,
      snake_case: 0,
      PascalCase: 0,
      UPPER_SNAKE_CASE: 0,
    };

    for (const name of names) {
      if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        styles.PascalCase++;
      } else if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
        styles.camelCase++;
      } else if (/^[a-z][a-z0-9_]*$/.test(name)) {
        styles.snake_case++;
      } else if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
        styles.UPPER_SNAKE_CASE++;
      }
    }

    // Find dominant style (>60% of names)
    const total = names.length;
    const threshold = total * 0.6;

    if (styles.camelCase >= threshold) return 'camelCase';
    if (styles.snake_case >= threshold) return 'snake_case';
    if (styles.PascalCase >= threshold) return 'PascalCase';
    if (styles.UPPER_SNAKE_CASE >= threshold) return 'UPPER_SNAKE_CASE' as any;

    return 'mixed';
  }

  /**
   * Get default patterns when extraction fails
   */
  private getDefaultPatterns(): ExtractedPatterns {
    return {
      namingConventions: {
        variables: 'camelCase',
        functions: 'camelCase',
        classes: 'PascalCase',
        constants: 'UPPER_SNAKE_CASE',
      },
      codeOrganization: {
        importsStyle: 'mixed',
        exportStyle: 'mixed',
        usesTypeScript: false,
        usesJSX: false,
      },
      generalPatterns: {
        usesArrowFunctions: false,
        usesAsyncAwait: false,
        usesDestructuring: false,
        usesSpreadOperator: false,
        usesTemplateLiterals: false,
      },
      architecturePatterns: [],
      codeStyle: {
        quotesStyle: 'single',
        semicolons: true,
        trailingCommas: false,
      },
    };
  }

  /**
   * Merge multiple extracted patterns to find common style
   */
  mergePatterns(patterns: ExtractedPatterns[]): ExtractedPatterns {
    if (patterns.length === 0) return this.getDefaultPatterns();
    if (patterns.length === 1) return patterns[0];

    // Count occurrences of each pattern
    const merged = this.getDefaultPatterns();

    // Merge naming conventions (pick most common)
    merged.namingConventions.variables = this.mostCommon(
      patterns.map((p) => p.namingConventions.variables)
    );
    merged.namingConventions.functions = this.mostCommon(
      patterns.map((p) => p.namingConventions.functions)
    );
    merged.namingConventions.classes = this.mostCommon(
      patterns.map((p) => p.namingConventions.classes)
    );
    merged.namingConventions.constants = this.mostCommon(
      patterns.map((p) => p.namingConventions.constants)
    );

    // Merge general patterns (true if >50% use it)
    const threshold = patterns.length / 2;
    merged.generalPatterns.usesArrowFunctions =
      patterns.filter((p) => p.generalPatterns.usesArrowFunctions).length >= threshold;
    merged.generalPatterns.usesAsyncAwait =
      patterns.filter((p) => p.generalPatterns.usesAsyncAwait).length >= threshold;
    merged.generalPatterns.usesDestructuring =
      patterns.filter((p) => p.generalPatterns.usesDestructuring).length >= threshold;
    merged.generalPatterns.usesSpreadOperator =
      patterns.filter((p) => p.generalPatterns.usesSpreadOperator).length >= threshold;
    merged.generalPatterns.usesTemplateLiterals =
      patterns.filter((p) => p.generalPatterns.usesTemplateLiterals).length >= threshold;

    // Merge architecture patterns (unique)
    const allArchPatterns = patterns.flatMap((p) => p.architecturePatterns);
    merged.architecturePatterns = [...new Set(allArchPatterns)];

    // Merge code style
    merged.codeStyle.quotesStyle = this.mostCommon(
      patterns.map((p) => p.codeStyle.quotesStyle)
    );
    merged.codeStyle.semicolons =
      patterns.filter((p) => p.codeStyle.semicolons).length >= threshold;
    merged.codeStyle.trailingCommas =
      patterns.filter((p) => p.codeStyle.trailingCommas).length >= threshold;

    return merged;
  }

  /**
   * Find most common value in array
   */
  private mostCommon<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = arr[0];

    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }

    return mostCommon;
  }
}

export const patternExtractor = new PatternExtractor();
