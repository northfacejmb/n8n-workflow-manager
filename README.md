# n8n-workflow-manager

> Command-line tools for managing n8n workflows with version control and TypeScript support

[![npm version](https://img.shields.io/npm/v/n8n-workflow-manager.svg)](https://www.npmjs.com/package/n8n-workflow-manager)
[![npm downloads](https://img.shields.io/npm/dm/n8n-workflow-manager.svg)](https://www.npmjs.com/package/n8n-workflow-manager)
[![GitHub](https://img.shields.io/badge/GitHub-n8n--workflow--manager-blue?logo=github)](https://github.com/northfacejmb/n8n-workflow-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/northfacejmb/n8n-workflow-manager)](https://github.com/northfacejmb/n8n-workflow-manager/issues)
[![GitHub stars](https://img.shields.io/github/stars/northfacejmb/n8n-workflow-manager)](https://github.com/northfacejmb/n8n-workflow-manager/stargazers)

## 🚀 Quick Start

### Installation

```bash
npm install --save-dev n8n-workflow-manager
```

### Initialize your project

```bash
npx n8n-workflow-manager init
```

### Basic Usage

```bash
# Split n8n workflows into individual files
npx n8n-workflow-manager split

# Package files back into n8n workflow JSON
npx n8n-workflow-manager package

# Generate TypeScript types
npx n8n-workflow-manager types
```

## 📖 What is n8n-workflow-manager?

n8n-workflow-manager is a powerful CLI tool that helps you manage n8n workflows with proper version control, TypeScript support, and team collaboration features. It solves the common problems of:

- **Version Control**: n8n workflows are large JSON files that are difficult to version control and review
- **Team Collaboration**: Multiple developers can't easily work on the same workflow
- **Code Organization**: Complex workflows become hard to maintain and understand
- **Type Safety**: No TypeScript support for workflow development

## 🎯 Features

### ✨ Core Features
- 🔄 **Bidirectional Conversion**: JSON ↔ Individual Files
- 📁 **Smart File Organization**: Automatic directory structure creation
- 🎯 **Interactive Workflow Selection**: Choose which workflows to process
- 🔧 **Configurable**: Customize behavior via `n8n-config.json`
- 📦 **Local Installation**: No global dependencies required

### 🔧 Advanced Features
- 🏷️ **TypeScript Support**: Generate type definitions for workflows
- 💾 **Backup Creation**: Automatic backups before packaging
- ✅ **Workflow Validation**: Validate workflow structure and integrity
- 📊 **Progress Reporting**: Detailed operation statistics
- 🔍 **Code Node Extraction**: Split JavaScript/TypeScript code into separate files

## 📋 Commands

### `npx n8n-workflow-manager init`
Initialize n8n workflow management in your project.

```bash
npx n8n-workflow-manager init
```

**Options:**
- `--force` - Overwrite existing configuration

### `npx n8n-workflow-manager split`
Extract n8n workflows into individual files for version control.

```bash
# Interactive selection
npx n8n-workflow-manager split

# Split all workflows
npx n8n-workflow-manager split --all

# Split specific workflow
npx n8n-workflow-manager split --workflow bug-tracker
```

**Options:**
- `--workflow <name>` - Split specific workflow
- `--all` - Split all workflows
- `--dry-run` - Preview changes without making them

### `npx n8n-workflow-manager package`
Package individual files back into n8n workflow JSON.

```bash
# Interactive selection
npx n8n-workflow-manager package

# Package all workflows
npx n8n-workflow-manager package --all

# Package specific workflow
npx n8n-workflow-manager package --workflow bug-tracker
```

**Options:**
- `--workflow <name>` - Package specific workflow
- `--all` - Package all workflows
- `--dry-run` - Preview changes without making them

### `npx n8n-workflow-manager types`
Generate TypeScript type definitions for workflows.

```bash
# Generate types for all workflows
npx n8n-workflow-manager types

# Generate types for specific workflow
npx n8n-workflow-manager types --workflow bug-tracker
```

**Options:**
- `--workflow <name>` - Generate types for specific workflow
- `--all` - Generate types for all workflows
- `--base` - Generate base type definitions only

## ⚙️ Configuration

Create `n8n-config.json` in your project root to customize behavior:

```json
{
  "workflowsDir": "workflows",
  "n8nDir": "n8n",
  "generateTypes": true,
  "typeScript": {
    "enabled": true,
    "outputDir": "types"
  },
  "ignore": [
    "node_modules",
    ".git",
    ".env",
    ".env.*"
  ],
  "extraction": {
    "preserveIds": true,
    "generateIndex": true,
    "splitCodeNodes": true
  },
  "packaging": {
    "validateWorkflows": true,
    "minifyOutput": false,
    "backupOriginal": true
  }
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `workflowsDir` | Directory for extracted workflows | `workflows` |
| `n8nDir` | Directory for n8n JSON files | `n8n` |
| `generateTypes` | Generate TypeScript types | `true` |
| `typeScript.enabled` | Enable TypeScript support | `true` |
| `typeScript.outputDir` | TypeScript output directory | `types` |
| `extraction.preserveIds` | Keep original node IDs | `true` |
| `extraction.generateIndex` | Generate node index files | `true` |
| `extraction.splitCodeNodes` | Split code nodes into separate files | `true` |
| `packaging.validateWorkflows` | Validate workflow structure | `true` |
| `packaging.backupOriginal` | Backup before packaging | `true` |

## 📁 Directory Structure

After initialization, your project will have:

```
your-project/
├── n8n/                     # n8n workflow JSON files
│   ├── bug-tracker.json     # Original workflow exports
│   └── github-pr.json
├── workflows/               # Extracted workflow files
│   ├── bug-tracker/
│   │   ├── workflow.json    # Base workflow structure
│   │   ├── metadata.json    # Workflow metadata
│   │   ├── connections.json # Node connections
│   │   ├── nodes/          # Individual node files
│   │   │   ├── webhook.json
│   │   │   ├── code-node.js
│   │   │   └── linear-create.json
│   │   └── types/          # TypeScript definitions
│   │       └── nodes.d.ts
│   └── github-pr/
│       └── ...
├── types/                  # Global TypeScript types
│   └── n8n-workflows.d.ts
└── n8n-config.json        # Configuration file
```

## 🔧 Global Options

Available on all commands:

- `--config <path>` - Path to config file (default: `n8n-config.json`)
- `--verbose` - Enable verbose logging
- `--dry-run` - Show what would be done without making changes
- `--help` - Show help information

## 💡 Use Cases

### Team Collaboration
1. **Split workflows** into individual files for easier code review
2. **Version control** each node and connection separately
3. **Merge conflicts** become manageable with individual files
4. **Parallel development** on different parts of the same workflow

### Code Organization
1. **Extract code nodes** into separate `.js`/`.ts` files
2. **Organize complex workflows** into logical file structures
3. **Reuse common nodes** across multiple workflows
4. **Generate TypeScript types** for better development experience

### CI/CD Integration
1. **Validate workflows** before deployment
2. **Automatic packaging** in build pipelines
3. **Type checking** for workflow code
4. **Backup creation** before updates

## 📚 Examples

### Basic Workflow Management

```bash
# Initialize project
npx n8n-workflow-manager init

# Place your n8n workflow JSON files in the n8n/ directory
cp my-workflow.json n8n/

# Split into individual files
npx n8n-workflow-manager split

# Edit files in workflows/ directory
# ...make changes...

# Package back to JSON
npx n8n-workflow-manager package
```

### TypeScript Development

```bash
# Generate TypeScript types
npx n8n-workflow-manager types

# Your code nodes can now use proper types
// workflows/my-workflow/nodes/process-data.ts
import { N8nNode, WorkflowContext } from '../types/nodes';

export function processData(context: WorkflowContext): N8nNode {
  // Type-safe workflow development
  return {
    json: {
      processed: true,
      data: context.inputData
    }
  };
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/n8n-workflows.yml
name: n8n Workflows
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate workflows
        run: npx n8n-workflow-manager package --dry-run
      
      - name: Generate types
        run: npx n8n-workflow-manager types
      
      - name: Type check
        run: npx tsc --noEmit
```

## 🛠 Development

To contribute to this project:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/northfacejmb/n8n-workflow-manager.git
   cd n8n-workflow-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run linting:**
   ```bash
   npm run lint
   ```

4. **Test your changes:**
   ```bash
   npm test
   ```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

**Quick ways to contribute:**
- 🐛 [Report bugs](https://github.com/northfacejmb/n8n-workflow-manager/issues/new?labels=bug)
- 💡 [Request features](https://github.com/northfacejmb/n8n-workflow-manager/issues/new?labels=enhancement)
- 📖 Improve documentation
- 🔧 Submit pull requests

## 📄 License

MIT © [Jeremy Press](https://github.com/jeremypress)

## 🔗 Links

- 📦 **[npm Package](https://www.npmjs.com/package/n8n-workflow-manager)** - Install and use the CLI tool
- 🐙 **[GitHub Repository](https://github.com/northfacejmb/n8n-workflow-manager)** - Source code and development
- 🐛 **[Issue Tracker](https://github.com/northfacejmb/n8n-workflow-manager/issues)** - Report bugs and request features
- 📚 **[n8n Documentation](https://docs.n8n.io/)** - Learn about n8n workflows

---

Made with ❤️ for the n8n community