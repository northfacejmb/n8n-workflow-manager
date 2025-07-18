const WorkflowPackager = require('../core/packager');
const WorkflowSelector = require('../utils/selector');
const ConfigManager = require('../utils/config');

/**
 * Package command handler
 */
class PackageCommand {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.packager = new WorkflowPackager(this.configManager);
    this.selector = new WorkflowSelector(this.configManager);
  }

  /**
   * Execute package command
   */
  async execute(options = {}) {
    try {
      // Validate environment
      this.packager.validateEnvironment();

      if (options.interactive) {
        return await this.executeInteractive();
      }

      if (options.workflow) {
        return await this.packageSingle(options.workflow);
      }

      if (options.node && options.nodeWorkflow) {
        return await this.packageSingleNode(options.nodeWorkflow, options.node);
      }

      if (options.all) {
        return await this.packageAll();
      }

      // Default: show help or interactive mode
      return await this.showHelp();
    } catch (error) {
      console.error('❌ Package command failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Interactive packaging
   */
  async executeInteractive() {
    console.log('📦 Interactive workflow packaging');
    
    const selection = await this.selector.selectWorkflow('package', 'extracted');
    
    if (!selection) {
      return { success: false, error: 'No workflow selected' };
    }

    if (selection === 'all') {
      return await this.packageAll();
    }

    return await this.packageSingle(selection);
  }

  /**
   * Package single workflow
   */
  async packageSingle(workflowName) {
    console.log(`📦 Packaging workflow: ${workflowName}`);
    
    try {
      const result = this.packager.packageWorkflow(workflowName);
      
      return {
        success: true,
        workflow: workflowName,
        ...result
      };
    } catch (error) {
      console.error(`❌ Failed to package ${workflowName}:`, error.message);
      return {
        success: false,
        workflow: workflowName,
        error: error.message
      };
    }
  }

  /**
   * Package single node
   */
  async packageSingleNode(workflowName, nodeName) {
    console.log(`📦 Packaging single node: ${nodeName} from ${workflowName}`);
    
    try {
      const result = this.packager.packageSingleNode(workflowName, nodeName);
      
      return {
        success: true,
        workflow: workflowName,
        node: nodeName,
        ...result
      };
    } catch (error) {
      console.error(`❌ Failed to package node ${nodeName} from ${workflowName}:`, error.message);
      return {
        success: false,
        workflow: workflowName,
        node: nodeName,
        error: error.message
      };
    }
  }

  /**
   * Package all workflows
   */
  async packageAll() {
    console.log('📦 Packaging all workflows');
    
    const results = this.packager.packageAll();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 Packaging Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    // Show validation warnings if any
    const warnings = results.filter(r => r.success && r.validation && !r.validation.valid);
    if (warnings.length > 0) {
      console.log(`   ⚠️  With warnings: ${warnings.length}`);
      warnings.forEach(w => {
        console.log(`     ${w.workflowName}: ${w.validation.errors.join(', ')}`);
      });
    }
    
    return {
      success: failed === 0,
      total: results.length,
      successful,
      failed,
      warnings: warnings.length,
      results
    };
  }

  /**
   * Show packaging statistics
   */
  async showStats() {
    const stats = this.packager.getStats();
    
    console.log(`\n📊 Packaging Statistics:`);
    console.log(`   📦 Total workflows: ${stats.totalWorkflows}`);
    console.log(`   🔧 Extracted workflows: ${stats.extractedWorkflows}`);
    console.log(`   📁 n8n directory: ${stats.paths.n8nDir}`);
    console.log(`   📁 Workflows directory: ${stats.paths.workflowsDir}`);
    
    if (stats.extractedWorkflows > 0) {
      console.log(`\n   Available extracted workflows:`);
      stats.extractedWorkflows.forEach(workflow => {
        console.log(`     🔧 ${workflow}`);
      });
    }
    
    return stats;
  }

  /**
   * Show help
   */
  async showHelp() {
    console.log(`
Usage: n8n-workflow-manager package [options]

Options:
  --workflow <name>         Package specific workflow
  --node <workflow> <node>  Package single node from workflow
  --all                     Package all workflows
  --interactive             Interactive workflow selection
  --stats                   Show packaging statistics
  --help, -h                Show this help message

Examples:
  n8n-workflow-manager package --workflow bug-tracker
  n8n-workflow-manager package --node bug-tracker "Prepare Linear Query"
  n8n-workflow-manager package --all
  n8n-workflow-manager package --interactive
  n8n-workflow-manager package --stats
`);
    
    return { success: true, help: true };
  }
}

module.exports = PackageCommand;