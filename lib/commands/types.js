const chalk = require('chalk');
const ConfigManager = require('../utils/config');
const TypesGenerator = require('../core/types-generator');
const WorkflowSelector = require('../utils/selector');

/**
 * Types command implementation
 */
async function typesCommand(options, globalOptions) {
  const { workflow, all, base } = options;
  const { verbose = false, dryRun = false } = globalOptions;

  try {
    // Load configuration
    const config = new ConfigManager(globalOptions.config);
    const generator = new TypesGenerator(config);
    const selector = new WorkflowSelector(config);

    console.log(chalk.cyan.bold('🏷️  Generating TypeScript types...\n'));

    if (base) {
      // Generate only base types
      console.log(chalk.blue('🔧 Generating base type definitions...'));
      const result = await generator.generateBaseTypes();
      
      console.log(chalk.green(`✅ Generated base types: ${result.outputPath}`));
    } else if (all) {
      // Generate types for all workflows
      console.log(chalk.blue('🔧 Generating types for all workflows...'));
      const results = await generator.generateAllTypes();
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(chalk.green(`✅ Generated types for ${successful} workflows successfully`));
      
      if (failed > 0) {
        console.log(chalk.yellow(`⚠️  ${failed} workflows failed to generate types`));
      }
      
      if (verbose) {
        results.forEach(result => {
          const status = result.success ? chalk.green('✅') : chalk.red('❌');
          console.log(chalk.gray(`  ${status} ${result.workflowName}: ${result.outputPath || 'failed'}`));
        });
      }
    } else if (workflow) {
      // Generate types for specific workflow
      console.log(chalk.blue(`🔧 Generating types for workflow: ${workflow}`));
      const result = await generator.generateWorkflowTypes(workflow);
      
      console.log(chalk.green(`✅ Generated types for ${workflow}`));
      console.log(chalk.gray(`   Output: ${result.outputPath}`));
    } else {
      // Interactive selection
      const selection = await selector.selectWorkflow('generate types for');
      
      if (!selection) {
        console.log(chalk.yellow('No workflow selected. Exiting.'));
        return;
      }

      if (selection === 'all') {
        const results = await generator.generateAllTypes();
        const successful = results.filter(r => r.success).length;
        console.log(chalk.green(`✅ Generated types for ${successful} workflows successfully`));
      } else {
        const result = await generator.generateWorkflowTypes(selection);
        console.log(chalk.green(`✅ Generated types for ${selection}`));
      }
    }

    console.log(chalk.cyan('\n🎯 TypeScript types have been generated'));
    console.log(chalk.gray('Use these types in your code nodes for better development experience'));
    
  } catch (error) {
    console.error(chalk.red('❌ Types generation failed:'), error.message);
    if (verbose) {
      console.error(chalk.gray(error.stack));
    }
    throw error;
  }
}

module.exports = typesCommand;