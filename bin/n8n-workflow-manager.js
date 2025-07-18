#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

// Import command handlers
const initCommand = require('../lib/commands/init');
const splitCommand = require('../lib/commands/split');
const packageCommand = require('../lib/commands/package');
const typesCommand = require('../lib/commands/types');

// Package info
const packageJson = require('../package.json');

program
  .name('n8n-workflow-manager')
  .description('Command-line tools for managing n8n workflows with version control')
  .version(packageJson.version);

// Global options
program
  .option('-c, --config <path>', 'path to config file', 'n8n-config.json')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--dry-run', 'show what would be done without making changes');

// Init command
program
  .command('init')
  .description('Initialize n8n workflow management in the current project')
  .option('-f, --force', 'overwrite existing files')
  .action(async (options) => {
    try {
      await initCommand(options, program.opts());
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Split command
program
  .command('split')
  .description('Extract n8n workflows into individual files')
  .option('-w, --workflow <name>', 'specific workflow to split')
  .option('-a, --all', 'split all workflows')
  .action(async (options) => {
    try {
      await splitCommand(options, program.opts());
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Package command
program
  .command('package')
  .description('Package individual files back into n8n workflow JSON')
  .option('-w, --workflow <name>', 'specific workflow to package')
  .option('-a, --all', 'package all workflows')
  .option('-n, --node <workflow> <node>', 'package single node from workflow')
  .action(async (options) => {
    try {
      await packageCommand(options, program.opts());
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Types command
program
  .command('types')
  .description('Generate TypeScript type definitions for workflows')
  .option('-w, --workflow <name>', 'specific workflow to generate types for')
  .option('-a, --all', 'generate types for all workflows')
  .option('-b, --base', 'generate base type definitions only')
  .action(async (options) => {
    try {
      await typesCommand(options, program.opts());
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Show detailed help and examples')
  .action(() => {
    console.log(chalk.cyan.bold('\n🔧 n8n-workflow-manager\n'));
    console.log('Command-line tools for managing n8n workflows with version control\n');
    
    console.log(chalk.yellow('Common Usage:'));
    console.log('  npx n8n-workflow-manager init          # Initialize project');
    console.log('  npx n8n-workflow-manager split         # Interactive workflow splitting');
    console.log('  npx n8n-workflow-manager package       # Interactive workflow packaging');
    console.log('  npx n8n-workflow-manager types         # Generate TypeScript types');
    console.log('');
    
    console.log(chalk.yellow('Advanced Usage:'));
    console.log('  npx n8n-workflow-manager split --all                    # Split all workflows');
    console.log('  npx n8n-workflow-manager split --workflow bug-tracker   # Split specific workflow');
    console.log('  npx n8n-workflow-manager package --all                  # Package all workflows');
    console.log('  npx n8n-workflow-manager types --workflow bug-tracker   # Generate types for specific workflow');
    console.log('');
    
    console.log(chalk.yellow('Configuration:'));
    console.log('  Create n8n-config.json to customize behavior');
    console.log('  Use --config <path> to specify config file location');
    console.log('  Use --verbose for detailed logging');
    console.log('  Use --dry-run to preview changes');
    console.log('');
    
    console.log(chalk.green('For more information, visit: https://github.com/jeremypress/n8n-workflow-manager'));
  });

// Error handling
program.on('command:*', function (operands) {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log(chalk.yellow('Use --help to see available commands'));
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.help();
}