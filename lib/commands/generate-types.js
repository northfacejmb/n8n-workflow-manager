const TypesGenerator = require('../core/types-generator');
const WorkflowSelector = require('../utils/selector');
const ConfigManager = require('../utils/config');

/**
 * Generate types command handler
 */
class GenerateTypesCommand {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.generator = new TypesGenerator(this.configManager);
    this.selector = new WorkflowSelector(this.configManager);
  }

  /**
   * Execute generate types command
   */
  async execute(options = {}) {
    try {
      // Validate environment
      this.generator.validateEnvironment();

      if (options.interactive) {
        return await this.executeInteractive();
      }

      if (options.workflow) {
        return await this.generateForWorkflow(options.workflow);
      }

      if (options.base) {
        return await this.generateBaseTypes();
      }

      if (options.all) {
        return await this.generateAllTypes();
      }

      // Default: show help or interactive mode
      return await this.showHelp();
    } catch (error) {
      console.error('❌ Generate types command failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Interactive type generation
   */
  async executeInteractive() {
    console.log('🔧 Interactive type generation');
    
    const selection = await this.selector.selectWorkflow('generate types for', 'extracted');
    
    if (!selection) {
      return { success: false, error: 'No workflow selected' };
    }

    if (selection === 'all') {
      return await this.generateAllTypes();
    }

    return await this.generateForWorkflow(selection);
  }

  /**
   * Generate types for single workflow
   */
  async generateForWorkflow(workflowName) {
    console.log(`🔧 Generating types for workflow: ${workflowName}`);
    
    try {
      // Generate base types first
      this.generator.generateBaseTypes();
      
      // Generate workflow-specific types
      const result = this.generator.generateWorkflowTypes(workflowName);
      
      return {
        success: true,
        workflow: workflowName,
        outputPath: result
      };
    } catch (error) {
      console.error(`❌ Failed to generate types for ${workflowName}:`, error.message);
      return {
        success: false,
        workflow: workflowName,
        error: error.message
      };
    }
  }

  /**
   * Generate base types only
   */
  async generateBaseTypes() {
    console.log('🔧 Generating base types');
    
    try {
      const result = this.generator.generateBaseTypes();
      
      return {
        success: true,
        baseTypes: true,
        outputPath: result
      };
    } catch (error) {
      console.error('❌ Failed to generate base types:', error.message);
      return {
        success: false,
        baseTypes: true,
        error: error.message
      };
    }
  }

  /**
   * Generate types for all workflows
   */
  async generateAllTypes() {
    console.log('🔧 Generating types for all workflows');
    
    const results = this.generator.generateAllTypes();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Type Generation Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    // Show generated files
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length > 0) {
      console.log(`\n   Generated files:`);
      successfulResults.forEach(r => {
        console.log(`     📄 ${r.workflowName}: ${r.outputPath}`);
      });
    }
    
    return {
      success: failed === 0,
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Show type generation statistics
   */
  async showStats() {
    const stats = this.generator.getStats();
    
    console.log(`\n📊 Type Generation Statistics:`);
    console.log(`   🔧 TypeScript enabled: ${stats.typesEnabled ? 'Yes' : 'No'}`);
    console.log(`   📦 Extracted workflows: ${stats.extractedWorkflows}`);
    console.log(`   📄 Generated types: ${stats.generatedTypes}`);
    console.log(`   📁 Types directory: ${stats.paths.typesDir}`);
    console.log(`   📁 Base types: ${stats.baseTypesPath}`);
    console.log(`   📁 Index file: ${stats.indexPath}`);
    
    if (!stats.typesEnabled) {
      console.log(`\n   ⚠️  TypeScript is disabled in configuration.`);
      console.log(`      Enable it in n8n-config.json to generate types.`);
    }
    
    return stats;
  }

  /**
   * Initialize TypeScript configuration
   */
  async initializeTypeScript() {
    console.log('🔧 Initializing TypeScript configuration');
    
    try {
      // Generate base types
      const baseTypesPath = this.generator.generateBaseTypes();
      
      // Generate index file
      const indexPath = this.generator.generateTypesIndex();
      
      // Create tsconfig.json if it doesn't exist
      const tsConfigPath = path.join(this.configManager.paths.baseDir, 'tsconfig.json');
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
            'types/**/*'
          ],
          exclude: [
            'node_modules',
            'dist',
            '**/*.test.ts'
          ]
        };
        
        fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
        console.log(`✅ Created tsconfig.json: ${tsConfigPath}`);
      }
      
      return {
        success: true,
        baseTypesPath,
        indexPath,
        tsConfigPath
      };
    } catch (error) {
      console.error('❌ Failed to initialize TypeScript:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Show help
   */
  async showHelp() {
    console.log(`
Usage: n8n-workflow-manager generate-types [options]

Options:
  --workflow <name>    Generate types for specific workflow
  --base              Generate base types only
  --all               Generate types for all workflows
  --interactive       Interactive workflow selection
  --stats             Show type generation statistics
  --init              Initialize TypeScript configuration
  --help, -h          Show this help message

Examples:
  n8n-workflow-manager generate-types --workflow bug-tracker
  n8n-workflow-manager generate-types --base
  n8n-workflow-manager generate-types --all
  n8n-workflow-manager generate-types --interactive
  n8n-workflow-manager generate-types --stats
  n8n-workflow-manager generate-types --init
`);
    
    return { success: true, help: true };
  }
}

module.exports = GenerateTypesCommand;