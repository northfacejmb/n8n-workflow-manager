const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer').default || require('inquirer');

/**
 * Initialize n8n tooling in the current project
 */
async function initCommand(options, globalOptions) {
  const { force = false } = options;
  const { verbose = false, dryRun = false } = globalOptions;

  console.log(chalk.cyan.bold('🚀 Initializing n8n-workflow-manager in your project...\n'));

  // Check if already initialized
  const n8nRootDir = path.join(process.cwd(), 'n8n');
  const configPath = path.join(n8nRootDir, 'n8n-config.json');
  
  if (fs.existsSync(configPath) && !force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'n8n-workflow-manager appears to already be initialized. Overwrite?',
        default: false
      }
    ]);
    
    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      return;
    }
  }

  // Get project configuration
  const config = await getProjectConfig();
  
  if (verbose) {
    console.log(chalk.gray('Configuration:'), config);
  }

  // Create directory structure
  await createDirectoryStructure(config, dryRun, verbose);
  
  // Create configuration file
  await createConfigFile(config, dryRun, verbose);
  
  // Create template files
  await createTemplateFiles(config, dryRun, verbose);
  
  // Update .gitignore
  await updateGitignore(config, dryRun, verbose);

  console.log(chalk.green.bold('\n✅ n8n-workflow-manager initialized successfully!\n'));
  console.log(chalk.yellow('Next steps:'));
  console.log(`1. Place your n8n workflow JSON files in the n8n/${config.n8nDir}/ directory`);
  console.log('2. Run: npx n8n-workflow-manager split');
  console.log(`3. Edit your workflows in the n8n/${config.workflowsDir}/ directory`);
  console.log('4. Run: npx n8n-workflow-manager package');
  console.log('');
  console.log(chalk.blue('For help: npx n8n-workflow-manager help'));
}

/**
 * Get project configuration from user
 */
async function getProjectConfig() {
  const questions = [
    {
      type: 'input',
      name: 'workflowsDir',
      message: 'Directory for extracted workflows (within n8n/):',
      default: 'workflows'
    },
    {
      type: 'input',
      name: 'n8nDir',
      message: 'Directory for n8n JSON files (within n8n/):',
      default: 'json'
    },
    {
      type: 'confirm',
      name: 'generateTypes',
      message: 'Generate TypeScript types?',
      default: true
    },
    {
      type: 'input',
      name: 'typesDir',
      message: 'Directory for TypeScript types (within n8n/):',
      default: 'types',
      when: (answers) => answers.generateTypes
    }
  ];

  return await inquirer.prompt(questions);
}

/**
 * Create directory structure
 */
async function createDirectoryStructure(config, dryRun, verbose) {
  const n8nRootDir = path.join(process.cwd(), 'n8n');
  const directories = [
    n8nRootDir,
    path.join(n8nRootDir, config.n8nDir),
    path.join(n8nRootDir, config.workflowsDir),
    config.generateTypes ? path.join(n8nRootDir, config.typesDir) : null
  ].filter(Boolean);

  console.log(chalk.blue('📁 Creating directory structure...'));
  
  for (const dir of directories) {
    const relativeDir = path.relative(process.cwd(), dir);
    if (verbose || dryRun) {
      console.log(chalk.gray(`  Creating: ${relativeDir}/`));
    }
    
    if (!dryRun) {
      await fs.ensureDir(dir);
    }
  }
}

/**
 * Create configuration file
 */
async function createConfigFile(config, dryRun, verbose) {
  const n8nRootDir = path.join(process.cwd(), 'n8n');
  const configPath = path.join(n8nRootDir, 'n8n-config.json');
  
  const configContent = {
    workflowsDir: config.workflowsDir,
    n8nDir: config.n8nDir,
    generateTypes: config.generateTypes,
    ...(config.generateTypes && {
      typeScript: {
        enabled: true,
        outputDir: config.typesDir
      }
    }),
    ignore: [
      'node_modules',
      '.git',
      '.env',
      '.env.*'
    ]
  };

  console.log(chalk.blue('⚙️  Creating configuration file...'));
  
  if (verbose || dryRun) {
    console.log(chalk.gray(`  Creating: n8n/n8n-config.json`));
  }
  
  if (!dryRun) {
    await fs.writeJson(configPath, configContent, { spaces: 2 });
  }
}

/**
 * Create template files
 */
async function createTemplateFiles(config, dryRun, verbose) {
  console.log(chalk.blue('📄 Creating template files...'));
  
  const n8nRootDir = path.join(process.cwd(), 'n8n');
  
  // Create README in n8n directory
  const readmeContent = `# n8n Workflows

This directory contains your n8n workflow management structure.

## Usage

- Place your exported n8n workflows (.json files) in the ${config.n8nDir}/ directory
- Run \`npx n8n-workflow-manager split\` to extract them to the ${config.workflowsDir}/ directory
- Edit your workflows in the ${config.workflowsDir}/ directory
- Run \`npx n8n-workflow-manager package\` to compile them back to JSON

## Directory Structure

\`\`\`
n8n/
├── n8n-config.json             # Configuration file
├── ${config.n8nDir}/                    # Original n8n workflow exports
│   ├── workflow-name.json      # Exported workflow files
│   └── README.md               # This file
├── ${config.workflowsDir}/              # Extracted workflow components
│   ├── workflow-name/
│   │   ├── workflow.json       # Base workflow structure
│   │   ├── metadata.json       # Workflow metadata
│   │   ├── connections.json    # Node connections
│   │   ├── nodes/              # Individual node files
│   │   └── types/              # TypeScript definitions
│   └── ...
${config.generateTypes ? `└── ${config.typesDir}/                   # Generated TypeScript types` : ''}
\`\`\`

## Commands

- \`npx n8n-workflow-manager split\` - Extract workflows to individual files
- \`npx n8n-workflow-manager package\` - Package files back to JSON
- \`npx n8n-workflow-manager types\` - Generate TypeScript types
- \`npx n8n-workflow-manager help\` - Show help and examples
`;

  const readmePath = path.join(n8nRootDir, 'README.md');
  
  if (verbose || dryRun) {
    console.log(chalk.gray(`  Creating: n8n/README.md`));
  }
  
  if (!dryRun) {
    await fs.writeFile(readmePath, readmeContent);
  }
}

/**
 * Update .gitignore file
 */
async function updateGitignore(config, dryRun, verbose) {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  const gitignoreEntries = [
    '# n8n-workflow-manager',
    '*.log',
    'node_modules/',
    '.env',
    '.env.*'
  ];

  console.log(chalk.blue('🔧 Updating .gitignore...'));
  
  if (fs.existsSync(gitignorePath)) {
    const existingContent = await fs.readFile(gitignorePath, 'utf-8');
    
    // Check if our entries already exist
    const newEntries = gitignoreEntries.filter(entry => 
      !existingContent.includes(entry)
    );
    
    if (newEntries.length > 0) {
      const updatedContent = existingContent + '\n' + newEntries.join('\n') + '\n';
      
      if (verbose || dryRun) {
        console.log(chalk.gray(`  Adding entries to .gitignore`));
      }
      
      if (!dryRun) {
        await fs.writeFile(gitignorePath, updatedContent);
      }
    }
  } else {
    if (verbose || dryRun) {
      console.log(chalk.gray(`  Creating .gitignore`));
    }
    
    if (!dryRun) {
      await fs.writeFile(gitignorePath, gitignoreEntries.join('\n') + '\n');
    }
  }
}

module.exports = initCommand;