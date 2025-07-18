const WorkflowExtractor = require('../core/extractor');
const WorkflowSelector = require('../utils/selector');
const ConfigManager = require('../utils/config');

/**
 * Extract command handler
 */
class ExtractCommand {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.extractor = new WorkflowExtractor(this.configManager);
    this.selector = new WorkflowSelector(this.configManager);
  }

  /**
   * Execute extract command
   */
  async execute(options = {}) {
    try {
      // Validate environment
      this.extractor.validateEnvironment();

      if (options.interactive) {
        return await this.executeInteractive();
      }

      if (options.workflow) {
        return await this.extractSingle(options.workflow);
      }

      if (options.all) {
        return await this.extractAll();
      }

      // Default: show help or interactive mode
      return await this.showHelp();
    } catch (error) {
      console.error('❌ Extract command failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Interactive extraction
   */
  async executeInteractive() {
    console.log('🔍 Interactive workflow extraction');
    
    const selection = await this.selector.selectWorkflow('extract', 'raw');
    
    if (!selection) {
      return { success: false, error: 'No workflow selected' };
    }

    if (selection === 'all') {
      return await this.extractAll();
    }

    return await this.extractSingle(selection);
  }

  /**
   * Extract single workflow
   */
  async extractSingle(workflowName) {
    console.log(`🔍 Extracting workflow: ${workflowName}`);
    
    try {
      const result = this.extractor.extractWorkflow(workflowName);
      
      return {
        success: true,
        workflow: workflowName,
        ...result
      };
    } catch (error) {
      console.error(`❌ Failed to extract ${workflowName}:`, error.message);
      return {
        success: false,
        workflow: workflowName,
        error: error.message
      };
    }
  }

  /**
   * Extract all workflows
   */
  async extractAll() {
    console.log('🔍 Extracting all workflows');
    
    const results = this.extractor.extractAll();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Extraction Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    return {
      success: failed === 0,
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Show extraction statistics
   */
  async showStats() {
    const stats = this.extractor.getStats();
    
    console.log(`\n📊 Extraction Statistics:`);
    console.log(`   📦 Total workflows: ${stats.totalWorkflows}`);
    console.log(`   🔧 Extracted workflows: ${stats.extractedWorkflows}`);
    console.log(`   📁 n8n directory: ${stats.paths.n8nDir}`);
    console.log(`   📁 Workflows directory: ${stats.paths.workflowsDir}`);
    
    if (stats.workflowFiles.length > 0) {
      console.log(`\n   Available workflows:`);
      stats.workflowFiles.forEach(workflow => {
        const isExtracted = stats.extractedWorkflows.includes(workflow);
        const status = isExtracted ? '🔧' : '📦';
        console.log(`     ${status} ${workflow}`);
      });
    }
    
    return stats;
  }

  /**
   * Show help
   */
  async showHelp() {
    console.log(`
Usage: n8n-workflow-manager extract [options]

Options:
  --workflow <name>    Extract specific workflow
  --all               Extract all workflows
  --interactive       Interactive workflow selection
  --stats             Show extraction statistics
  --help, -h          Show this help message

Examples:
  n8n-workflow-manager extract --workflow bug-tracker
  n8n-workflow-manager extract --all
  n8n-workflow-manager extract --interactive
  n8n-workflow-manager extract --stats
`);
    
    return { success: true, help: true };
  }
}

module.exports = ExtractCommand;