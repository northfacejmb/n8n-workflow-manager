const chalk = require('chalk');
const ConfigManager = require('../utils/config');
const WorkflowExtractor = require('../core/extractor');
const WorkflowSelector = require('../utils/selector');

/**
 * Split command implementation
 */
async function splitCommand(options, globalOptions) {
  const { workflow, all } = options;
  const { verbose = false, dryRun = false } = globalOptions;

  try {
    // Load configuration
    const config = new ConfigManager(globalOptions.config);
    const extractor = new WorkflowExtractor(config);
    const selector = new WorkflowSelector(config);

    console.log(chalk.cyan.bold('🔄 Splitting workflows into individual files...\n'));

    if (all) {
      // Extract all workflows
      console.log(chalk.blue('📦 Extracting all workflows...'));
      const results = await extractor.extractAll();
      
      console.log(chalk.green(`✅ Extracted ${results.length} workflows successfully`));
      
      if (verbose) {
        results.forEach(result => {
          console.log(chalk.gray(`  - ${result.workflowName}: ${result.nodeCount} nodes`));
        });
      }
    } else if (workflow) {
      // Extract specific workflow
      console.log(chalk.blue(`📦 Extracting workflow: ${workflow}`));
      const result = await extractor.extractWorkflow(workflow);
      
      console.log(chalk.green(`✅ Extracted ${workflow} with ${result.nodeCount} nodes`));
    } else {
      // Interactive selection
      const selection = await selector.selectWorkflow('split');
      
      if (!selection) {
        console.log(chalk.yellow('No workflow selected. Exiting.'));
        return;
      }

      if (selection === 'all') {
        const results = await extractor.extractAll();
        console.log(chalk.green(`✅ Extracted ${results.length} workflows successfully`));
      } else {
        const result = await extractor.extractWorkflow(selection);
        console.log(chalk.green(`✅ Extracted ${selection} with ${result.nodeCount} nodes`));
      }
    }

    console.log(chalk.cyan('\n📁 Files have been extracted to the workflows directory'));
    console.log(chalk.gray('Run "npx n8n-workflow-manager package" to convert back to JSON'));
    
  } catch (error) {
    console.error(chalk.red('❌ Split failed:'), error.message);
    if (verbose) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  }
}

module.exports = splitCommand;