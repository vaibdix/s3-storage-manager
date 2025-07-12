// services/ShikiService.js - Fixed version with Shiki v3.0+ API
class ShikiService {
  constructor() {
    this.highlighter = null;
    this.isLoading = false;
    this.isLoaded = false;
  }

  // Language detection from file extension
  getLanguageFromFileName(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      // JavaScript/TypeScript
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',

      // Web technologies
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',

      // Backend languages
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      cxx: 'cpp',
      cc: 'cpp',
      c: 'c',
      h: 'c',
      hpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',

      // Shell scripts
      sh: 'bash',
      bash: 'bash',
      zsh: 'zsh',
      fish: 'fish',
      ps1: 'powershell',

      // Data/Config formats
      json: 'json',
      xml: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
      toml: 'toml',
      ini: 'ini',
      env: 'dotenv',

      // Documentation
      md: 'markdown',
      mdx: 'mdx',
      rst: 'rst',

      // Database
      sql: 'sql',

      // Other
      dockerfile: 'dockerfile',
      gitignore: 'gitignore',
      vue: 'vue',
      svelte: 'svelte',
      r: 'r',
      matlab: 'matlab',

      // Plain text fallback
      txt: 'text',
      log: 'text'
    };

    return langMap[ext] || 'text';
  }

  // Initialize Shiki highlighter with v3.0+ API
  async initialize(theme = 'github-dark') {
    if (this.isLoaded && this.highlighter) {
      return this.highlighter;
    }

    if (this.isLoading) {
      // Wait for existing initialization
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.highlighter;
    }

    try {
      this.isLoading = true;

      // Dynamic import of Shiki with v3.0+ API
      const shikiModule = await import('shiki');

      // Use createHighlighter instead of getHighlighter
      const createHighlighter = shikiModule.createHighlighter || shikiModule.default?.createHighlighter;

      if (!createHighlighter) {
        throw new Error('createHighlighter not found in shiki module');
      }

      // Create highlighter with common languages and themes
      this.highlighter = await createHighlighter({
        themes: [
          'github-dark',
          'github-light',
          'dark-plus',
          'light-plus',
          'monokai',
          'solarized-dark',
          'solarized-light'
        ],
        langs: [
          'javascript',
          'typescript',
          'tsx',
          'jsx',
          'html',
          'css',
          'scss',
          'python',
          'java',
          'cpp',
          'c',
          'php',
          'ruby',
          'go',
          'rust',
          'swift',
          'json',
          'yaml',
          'xml',
          'markdown',
          'sql',
          'bash',
          'text'
        ]
      });

      this.isLoaded = true;
      return this.highlighter;

    } catch (error) {
      console.error('Failed to initialize Shiki:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  // Highlight code with Shiki v3.0+ API
  async highlightCode(code, fileName, theme = 'github-dark') {
    try {
      // Ensure highlighter is initialized
      const highlighter = await this.initialize(theme);

      if (!highlighter) {
        throw new Error('Highlighter not available');
      }

      const language = this.getLanguageFromFileName(fileName);

      // Generate highlighted HTML using v3.0+ API
      const html = highlighter.codeToHtml(code, {
        lang: language,
        theme: theme
      });

      return {
        success: true,
        html,
        language,
        theme
      };

    } catch (error) {
      console.error('Shiki highlighting error:', error);

      // Return fallback HTML with basic styling
      return {
        success: false,
        html: this.getFallbackHTML(code, fileName),
        language: this.getLanguageFromFileName(fileName),
        theme,
        error: error.message
      };
    }
  }

  // Alternative method using shorthand function (v3.0+ feature)
  async highlightCodeShorthand(code, fileName, theme = 'github-dark') {
    try {
      // Dynamic import of shorthand function
      const { codeToHtml } = await import('shiki');

      const language = this.getLanguageFromFileName(fileName);

      // Use shorthand function - no initialization needed
      const html = await codeToHtml(code, {
        lang: language,
        theme: theme
      });

      return {
        success: true,
        html,
        language,
        theme
      };

    } catch (error) {
      console.error('Shiki shorthand highlighting error:', error);

      return {
        success: false,
        html: this.getFallbackHTML(code, fileName),
        language: this.getLanguageFromFileName(fileName),
        theme,
        error: error.message
      };
    }
  }

  // Fallback HTML when Shiki fails
  getFallbackHTML(code, fileName) {
    const language = this.getLanguageFromFileName(fileName);

    // Escape HTML entities
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    // Return styled fallback with proper scrolling - let parent handle overflow
    return `
      <pre style="
        margin: 0;
        padding: 1rem;
        background: #1e1e1e;
        color: #d4d4d4;
        font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
        white-space: pre;
        overflow: visible;
        width: 100%;
        border-radius: 6px;
        box-sizing: border-box;
      "><code data-language="${language}">${escapedCode}</code></pre>
    `;
  }

  // Get available themes
  getAvailableThemes() {
    return [
      { value: 'github-dark', label: 'GitHub Dark' },
      { value: 'github-light', label: 'GitHub Light' },
      { value: 'dark-plus', label: 'Dark+ (VS Code)' },
      { value: 'light-plus', label: 'Light+ (VS Code)' },
      { value: 'monokai', label: 'Monokai' },
      { value: 'solarized-dark', label: 'Solarized Dark' },
      { value: 'solarized-light', label: 'Solarized Light' }
    ];
  }

  // Get supported languages
  getSupportedLanguages() {
    return [
      'javascript', 'typescript', 'tsx', 'jsx', 'html', 'css', 'scss',
      'python', 'java', 'cpp', 'c', 'php', 'ruby', 'go', 'rust', 'swift',
      'json', 'yaml', 'xml', 'markdown', 'sql', 'bash', 'text'
    ];
  }

  // Check if language is supported
  isLanguageSupported(fileName) {
    const language = this.getLanguageFromFileName(fileName);
    return this.getSupportedLanguages().includes(language);
  }

  // Clean up resources
  dispose() {
    this.highlighter = null;
    this.isLoaded = false;
    this.isLoading = false;
  }
}

// Create singleton instance
export const shikiService = new ShikiService();

// Export class for testing
export { ShikiService };