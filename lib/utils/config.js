const fs = require('fs');
const path = require('path');

/**
 * Configuration manager for n8n-workflow-manager
 */
class ConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath || this.findConfigFile();
    this.config = this.loadConfig();
  }

  /**
   * Find n8n-config.json file starting from current directory
   */
  findConfigFile() {
    let currentDir = process.cwd();
    const maxLevels = 10;
    
    for (let i = 0; i < maxLevels; i++) {
      const configPath = path.join(currentDir, 'n8n-config.json');
      if (fs.existsSync(configPath)) {
        return configPath;
      }
      
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root directory
      }
      currentDir = parentDir;
    }
    
    return null;
  }

  /**
   * Load configuration from file
   */
  loadConfig() {
    if (!this.configPath) {
      return this.getDefaultConfig();
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(configContent);
      return { ...this.getDefaultConfig(), ...config };
    } catch (error) {
      console.warn(`⚠️  Failed to load config from ${this.configPath}: ${error.message}`);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      workflowsDir: 'workflows',
      n8nDir: 'n8n',
      generateTypes: true,
      typeScript: {
        enabled: true,
        outputDir: 'types'
      },
      ignore: [
        'node_modules',
        '.git',
        '.env',
        '.env.*',
        '*.log'
      ],
      extraction: {
        preserveIds: true,
        generateIndex: true,
        splitCodeNodes: true
      },
      packaging: {
        validateWorkflows: true,
        minifyOutput: false,
        backupOriginal: true
      }
    };
  }

  /**
   * Get resolved paths based on configuration
   */
  getPaths() {
    const baseDir = this.configPath ? path.dirname(this.configPath) : process.cwd();
    
    return {
      baseDir,
      n8nDir: path.resolve(baseDir, this.config.n8nDir),
      workflowsDir: path.resolve(baseDir, this.config.workflowsDir),
      typesDir: path.resolve(baseDir, this.config.typeScript.outputDir),
      configPath: this.configPath
    };
  }

  /**
   * Get configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Get nested configuration value
   */
  getDeep(keyPath) {
    const keys = keyPath.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Check if config file exists
   */
  hasConfigFile() {
    return this.configPath !== null;
  }

  /**
   * Create a new config file
   */
  createConfigFile(targetPath = null) {
    const configPath = targetPath || path.join(process.cwd(), 'n8n-config.json');
    const config = this.getDefaultConfig();
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Created config file: ${configPath}`);
    
    return configPath;
  }

  /**
   * Validate configuration
   */
  validate() {
    const paths = this.getPaths();
    const errors = [];
    
    // Check if n8n directory exists
    if (!fs.existsSync(paths.n8nDir)) {
      errors.push(`n8n directory not found: ${paths.n8nDir}`);
    }
    
    // Check if workflows directory exists (create if needed)
    if (!fs.existsSync(paths.workflowsDir)) {
      try {
        fs.mkdirSync(paths.workflowsDir, { recursive: true });
        console.log(`📁 Created workflows directory: ${paths.workflowsDir}`);
      } catch (error) {
        errors.push(`Failed to create workflows directory: ${error.message}`);
      }
    }
    
    // Check if types directory exists (create if needed and TypeScript is enabled)
    if (this.config.typeScript.enabled && !fs.existsSync(paths.typesDir)) {
      try {
        fs.mkdirSync(paths.typesDir, { recursive: true });
        console.log(`📁 Created types directory: ${paths.typesDir}`);
      } catch (error) {
        errors.push(`Failed to create types directory: ${error.message}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      paths
    };
  }

  /**
   * Get list of workflow files in n8n directory
   */
  getWorkflowFiles() {
    const paths = this.getPaths();
    
    if (!fs.existsSync(paths.n8nDir)) {
      return [];
    }
    
    return fs.readdirSync(paths.n8nDir)
      .filter(file => file.endsWith('.json') && !file.startsWith('.'))
      .map(file => path.basename(file, '.json'));
  }

  /**
   * Get list of extracted workflow directories
   */
  getExtractedWorkflows() {
    const paths = this.getPaths();
    
    if (!fs.existsSync(paths.workflowsDir)) {
      return [];
    }
    
    return fs.readdirSync(paths.workflowsDir)
      .filter(dir => {
        const fullPath = path.join(paths.workflowsDir, dir);
        return fs.statSync(fullPath).isDirectory();
      });
  }
}

module.exports = ConfigManager;