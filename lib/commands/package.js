const chalk = require('chalk');
const ConfigManager = require('../utils/config');
const WorkflowPackager = require('../core/packager');
const WorkflowSelector = require('../utils/selector');

/**
 * Package command implementation
 */
async function packageCommand(options, globalOptions) {
  const { workflow, all, node } = options;
  const { verbose = false, dryRun = false } = globalOptions;

  try {
    // Load configuration
    const config = new ConfigManager(globalOptions.config);
    const packager = new WorkflowPackager(config);
    const selector = new WorkflowSelector(config);

    console.log(chalk.cyan.bold('📦 Packaging workflows into JSON files...\n'));

    if (all) {
      // Package all workflows
      console.log(chalk.blue('📦 Packaging all workflows...'));
      const results = await packager.packageAll();
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(chalk.green(`✅ Packaged ${successful} workflows successfully`));
      
      if (failed > 0) {
        console.log(chalk.yellow(`⚠️  ${failed} workflows failed to package`));
      }
      
      if (verbose) {
        results.forEach(result => {
          const status = result.success ? chalk.green('✅') : chalk.red('❌');
          console.log(chalk.gray(`  ${status} ${result.workflowName}: ${result.nodeCount || 0} nodes`));
        });
      }
    } else if (workflow) {
      // Package specific workflow
      console.log(chalk.blue(`📦 Packaging workflow: ${workflow}`));
      const result = await packager.packageWorkflow(workflow);
      
      console.log(chalk.green(`✅ Packaged ${workflow} with ${result.nodeCount} nodes`));
      console.log(chalk.gray(`   Output: ${result.outputPath}`));
    } else {
      // Interactive selection
      const selection = await selector.selectWorkflow('package');
      
      if (!selection) {
        console.log(chalk.yellow('No workflow selected. Exiting.'));
        return;
      }

      if (selection === 'all') {
        const results = await packager.packageAll();
        const successful = results.filter(r => r.success).length;
        console.log(chalk.green(`✅ Packaged ${successful} workflows successfully`));
      } else {
        const result = await packager.packageWorkflow(selection);
        console.log(chalk.green(`✅ Packaged ${selection} with ${result.nodeCount} nodes`));
      }
    }

    console.log(chalk.cyan('\n📄 JSON files have been created in the n8n directory'));
    console.log(chalk.gray('These files can be imported into n8n'));
    
  } catch (error) {
    console.error(chalk.red('❌ Package failed:'), error.message);
    if (verbose) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  }
}

module.exports = packageCommand;