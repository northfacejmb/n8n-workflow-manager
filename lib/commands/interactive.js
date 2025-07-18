const WorkflowSelector = require('../utils/selector');
const ExtractCommand = require('./extract');
const PackageCommand = require('./package');
const GenerateTypesCommand = require('./generate-types');
const ConfigManager = require('../utils/config');

/**
 * Interactive command handler
 */
class InteractiveCommand {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.selector = new WorkflowSelector(this.configManager);
    this.extractCommand = new ExtractCommand(this.configManager);
    this.packageCommand = new PackageCommand(this.configManager);
    this.generateTypesCommand = new GenerateTypesCommand(this.configManager);
  }

  /**
   * Execute interactive command
   */
  async execute(options = {}) {
    try {
      // Validate environment
      const validation = this.configManager.validate();
      if (!validation.valid) {
        console.error(`❌ Environment validation failed: ${validation.errors.join(', ')}`);
        return { success: false, error: validation.errors.join(', ') };
      }

      return await this.runInteractiveMenu();
    } catch (error) {
      console.error('❌ Interactive command failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run interactive menu
   */
  async runInteractiveMenu() {
    let running = true;
    const results = [];

    while (running) {
      try {
        const action = await this.selector.interactiveMenu();
        
        if (!action) {
          running = false;
          continue;
        }

        const result = await this.handleAction(action);
        results.push(result);

        // Ask if user wants to continue
        if (result.success && !result.help) {
          console.log('\n');
          const continueChoice = await this.askContinue();
          if (!continueChoice) {
            running = false;
          }
        }
      } catch (error) {
        console.error('❌ Action failed:', error.message);
        results.push({ success: false, error: error.message });
        
        const continueChoice = await this.askContinue();
        if (!continueChoice) {
          running = false;
        }
      }
    }

    return {
      success: true,
      interactive: true,
      results
    };
  }

  /**
   * Handle interactive action
   */
  async handleAction(action) {
    switch (action.action) {
      case 'extract':
        return await this.handleExtract(action.type);
      
      case 'package':
        return await this.handlePackage(action.type);
      
      case 'generate-types':
        return await this.handleGenerateTypes(action.type);
      
      case 'details':
        return await this.handleDetails(action.type);
      
      case 'list':
        return await this.handleList(action.type);
      
      default:
        return { success: false, error: `Unknown action: ${action.action}` };
    }
  }

  /**
   * Handle extract action
   */
  async handleExtract(type) {
    const selection = await this.selector.selectMultipleWorkflows('extract', type);
    
    if (selection.length === 0) {
      return { success: false, error: 'No workflows selected' };
    }

    const results = [];
    for (const workflowName of selection) {
      const result = await this.extractCommand.extractSingle(workflowName);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Extraction Results:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);

    return {
      success: failed === 0,
      action: 'extract',
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Handle package action
   */
  async handlePackage(type) {
    const selection = await this.selector.selectMultipleWorkflows('package', type);
    
    if (selection.length === 0) {
      return { success: false, error: 'No workflows selected' };
    }

    const results = [];
    for (const workflowName of selection) {
      const result = await this.packageCommand.packageSingle(workflowName);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Packaging Results:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);

    return {
      success: failed === 0,
      action: 'package',
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Handle generate types action
   */
  async handleGenerateTypes(type) {
    const selection = await this.selector.selectMultipleWorkflows('generate types for', type);
    
    if (selection.length === 0) {
      return { success: false, error: 'No workflows selected' };
    }

    const results = [];
    for (const workflowName of selection) {
      const result = await this.generateTypesCommand.generateForWorkflow(workflowName);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Type Generation Results:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);

    return {
      success: failed === 0,
      action: 'generate-types',
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Handle details action
   */
  async handleDetails(type) {
    const selection = await this.selector.selectWorkflow('view details for', type);
    
    if (!selection || selection === 'all') {
      return { success: false, error: 'Please select a specific workflow' };
    }

    this.selector.displayWorkflowDetails(selection);
    
    return {
      success: true,
      action: 'details',
      workflow: selection
    };
  }

  /**
   * Handle list action
   */
  async handleList(type) {
    const workflows = this.selector.getAvailableWorkflows(type);
    const stats = this.selector.getStats();
    
    console.log(`\n📋 Workflow Listing:`);
    console.log(`   📊 Total workflows: ${stats.total}`);
    console.log(`   🔧 Extracted: ${stats.extracted}`);
    console.log(`   📦 Raw: ${stats.raw}`);
    console.log(`   🔄 Both formats: ${stats.both}`);
    
    if (workflows.all && workflows.all.length > 0) {
      console.log(`\n   Available workflows:`);
      workflows.all.forEach(workflow => {
        const status = workflow.hasExtracted && workflow.hasRaw ? '🔄' : 
                      workflow.hasExtracted ? '🔧' : '📦';
        console.log(`     ${status} ${workflow.name}`);
      });
    }

    return {
      success: true,
      action: 'list',
      stats,
      workflows
    };
  }

  /**
   * Ask if user wants to continue
   */
  async askContinue() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Do you want to perform another action? (Y/n): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() !== 'n');
      });
    });
  }

  /**
   * Show help
   */
  async showHelp() {
    console.log(`
Usage: n8n-workflow-manager interactive

Interactive workflow management interface.

This command provides a menu-driven interface for:
- Extracting workflows
- Packaging workflows  
- Generating TypeScript types
- Viewing workflow details
- Listing available workflows

The interactive mode allows you to:
- Select multiple workflows for batch operations
- View workflow details before operations
- Perform multiple actions in sequence
- Get real-time feedback on operation results

Examples:
  n8n-workflow-manager interactive
`);
    
    return { success: true, help: true };
  }
}

module.exports = InteractiveCommand;