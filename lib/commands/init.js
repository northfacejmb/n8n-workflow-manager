const fs = require('fs');
const path = require('path');
const ConfigManager = require('../utils/config');

/**
 * Initialize command handler
 */
class InitCommand {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
  }

  /**
   * Execute init command
   */
  async execute(options = {}) {
    try {
      if (options.interactive) {
        return await this.executeInteractive();
      }

      return await this.initializeProject(options);
    } catch (error) {
      console.error('❌ Init command failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Interactive initialization
   */
  async executeInteractive() {
    console.log('🚀 Interactive n8n-workflow-manager initialization');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

    try {
      const baseDir = process.cwd();
      
      console.log(`\n📁 Current directory: ${baseDir}`);
      
      // Check if config already exists
      const existingConfig = this.configManager.findConfigFile();
      if (existingConfig) {
        console.log(`⚠️  Config file already exists: ${existingConfig}`);
        const overwrite = await question('Do you want to overwrite it? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
          console.log('🚫 Initialization cancelled');
          rl.close();
          return { success: false, cancelled: true };
        }
      }

      // Gather configuration
      const config = { ...this.configManager.getDefaultConfig() };
      
      const n8nDir = await question(`n8n directory (${config.n8nDir}): `);
      if (n8nDir.trim()) config.n8nDir = n8nDir.trim();
      
      const workflowsDir = await question(`Workflows directory (${config.workflowsDir}): `);
      if (workflowsDir.trim()) config.workflowsDir = workflowsDir.trim();
      
      const enableTypeScript = await question(`Enable TypeScript? (Y/n): `);
      config.typeScript.enabled = enableTypeScript.toLowerCase() !== 'n';
      
      if (config.typeScript.enabled) {
        const typesDir = await question(`Types output directory (${config.typeScript.outputDir}): `);
        if (typesDir.trim()) config.typeScript.outputDir = typesDir.trim();
      }
      
      const splitCodeNodes = await question(`Split code nodes into separate files? (Y/n): `);
      config.extraction.splitCodeNodes = splitCodeNodes.toLowerCase() !== 'n';
      
      const validateWorkflows = await question(`Validate workflows during packaging? (Y/n): `);
      config.packaging.validateWorkflows = validateWorkflows.toLowerCase() !== 'n';
      
      const backupOriginal = await question(`Backup original files during packaging? (Y/n): `);
      config.packaging.backupOriginal = backupOriginal.toLowerCase() !== 'n';
      
      rl.close();

      return await this.initializeProject({ config, baseDir });
    } catch (error) {
      rl.close();
      throw error;
    }
  }

  /**
   * Initialize project
   */
  async initializeProject(options = {}) {
    const baseDir = options.baseDir || process.cwd();
    const config = options.config || this.configManager.getDefaultConfig();
    
    console.log(`🚀 Initializing n8n-workflow-manager project in: ${baseDir}`);

    const results = {
      success: true,
      created: [],
      errors: []
    };

    try {
      // Create config file
      const configPath = path.join(baseDir, 'n8n-config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`✅ Created config file: ${configPath}`);
      results.created.push(configPath);

      // Create directory structure
      const directories = [
        path.resolve(baseDir, config.n8nDir),
        path.resolve(baseDir, config.workflowsDir),
      ];

      if (config.typeScript.enabled) {
        directories.push(path.resolve(baseDir, config.typeScript.outputDir));
      }

      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
          results.created.push(dir);
        } else {
          console.log(`📁 Directory already exists: ${dir}`);
        }
      }

      // Create .gitignore entries
      const gitignorePath = path.join(baseDir, '.gitignore');
      let gitignoreContent = '';
      
      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      }

      const gitignoreEntries = [
        '# n8n-workflow-manager',
        '*.backup.json',
        '.env',
        '.env.*',
        '*.log'
      ];

      let needsUpdate = false;
      for (const entry of gitignoreEntries) {
        if (!gitignoreContent.includes(entry)) {
          gitignoreContent += `\n${entry}`;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        fs.writeFileSync(gitignorePath, gitignoreContent);
        console.log(`✅ Updated .gitignore: ${gitignorePath}`);
        results.created.push(gitignorePath);
      }

      // Create README template
      const readmePath = path.join(baseDir, 'README.md');
      if (!fs.existsSync(readmePath)) {
        const readmeContent = this.generateReadmeTemplate(config);
        fs.writeFileSync(readmePath, readmeContent);
        console.log(`✅ Created README.md: ${readmePath}`);
        results.created.push(readmePath);
      }

      // Create package.json scripts if package.json exists
      const packageJsonPath = path.join(baseDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          
          if (!packageJson.scripts) {
            packageJson.scripts = {};
          }

          const scripts = {
            'n8n:extract': 'n8n-workflow-manager extract --all',
            'n8n:package': 'n8n-workflow-manager package --all',
            'n8n:types': 'n8n-workflow-manager generate-types --all',
            'n8n:interactive': 'n8n-workflow-manager interactive'
          };

          let scriptsAdded = false;
          for (const [key, value] of Object.entries(scripts)) {
            if (!packageJson.scripts[key]) {
              packageJson.scripts[key] = value;
              scriptsAdded = true;
            }
          }

          if (scriptsAdded) {
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`✅ Added npm scripts to package.json`);
            results.created.push(packageJsonPath);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to update package.json: ${error.message}`);
          results.errors.push(`Failed to update package.json: ${error.message}`);
        }
      }

      // Initialize TypeScript if enabled
      if (config.typeScript.enabled) {
        const tsConfigPath = path.join(baseDir, 'tsconfig.json');
        if (!fs.existsSync(tsConfigPath)) {
          const tsConfig = {
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              lib: ['ES2020'],
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
              resolveJsonModule: true,
              declaration: true,
              declarationMap: true,
              sourceMap: true
            },
            include: [
              'src/**/*',
              `${config.typeScript.outputDir}/**/*`
            ],
            exclude: [
              'node_modules',
              'dist',
              '**/*.test.ts'
            ]
          };
          
          fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
          console.log(`✅ Created tsconfig.json: ${tsConfigPath}`);
          results.created.push(tsConfigPath);
        }
      }

      console.log(`\n🎉 Initialization complete!`);
      console.log(`\n📖 Next steps:`);
      console.log(`   1. Place your n8n workflow JSON files in: ${config.n8nDir}/`);
      console.log(`   2. Run: n8n-workflow-manager extract --all`);
      console.log(`   3. Edit extracted workflows in: ${config.workflowsDir}/`);
      console.log(`   4. Run: n8n-workflow-manager package --all`);
      
      if (config.typeScript.enabled) {
        console.log(`   5. Run: n8n-workflow-manager generate-types --all`);
      }

      return results;
    } catch (error) {
      results.success = false;
      results.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Generate README template
   */
  generateReadmeTemplate(config) {
    return `# n8n Workflow Manager

This project uses n8n-workflow-manager to manage n8n workflows with version control.

## Directory Structure

- \`${config.n8nDir}/\` - Original n8n workflow JSON files
- \`${config.workflowsDir}/\` - Extracted workflow files (version controlled)
${config.typeScript.enabled ? `- \`${config.typeScript.outputDir}/\` - Generated TypeScript types` : ''}

## Available Commands

### Extract workflows
\`\`\`bash
# Extract all workflows
npm run n8n:extract

# Extract specific workflow
npx n8n-workflow-manager extract --workflow my-workflow
\`\`\`

### Package workflows
\`\`\`bash
# Package all workflows
npm run n8n:package

# Package specific workflow  
npx n8n-workflow-manager package --workflow my-workflow
\`\`\`

${config.typeScript.enabled ? `### Generate TypeScript types
\`\`\`bash
# Generate types for all workflows
npm run n8n:types

# Generate types for specific workflow
npx n8n-workflow-manager generate-types --workflow my-workflow
\`\`\`
` : ''}

### Interactive mode
\`\`\`bash
# Interactive workflow management
npm run n8n:interactive
\`\`\`

## Workflow Development

1. **Extract**: Convert n8n JSON files to editable format
2. **Edit**: Modify workflows in the \`${config.workflowsDir}/\` directory
3. **Package**: Convert back to n8n JSON format
4. **Import**: Import the packaged JSON back into n8n

## Configuration

Edit \`n8n-config.json\` to customize:
- Directory paths
- TypeScript settings
- Extraction options
- Packaging options

## Generated Files

- \`*.backup.json\` - Backup files (ignored by git)
- \`node-index.json\` - Node mapping files
- \`metadata.json\` - Workflow metadata
- \`connections.json\` - Node connections
- \`types/\` - TypeScript type definitions
`;
  }

  /**
   * Show help
   */
  async showHelp() {
    console.log(`
Usage: n8n-workflow-manager init [options]

Options:
  --interactive       Interactive initialization
  --help, -h          Show this help message

Examples:
  n8n-workflow-manager init
  n8n-workflow-manager init --interactive
`);
    
    return { success: true, help: true };
  }
}

module.exports = InitCommand;