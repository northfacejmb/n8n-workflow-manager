const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ConfigManager = require('./config');

/**
 * Interactive workflow selection utility
 */
class WorkflowSelector {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.config = this.configManager.config;
    this.paths = this.configManager.getPaths();
    this.rl = null;
  }

  /**
   * Initialize readline interface
   */
  initializeReadline() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
  }

  /**
   * Close readline interface
   */
  closeReadline() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Get available workflows (extracted or raw)
   */
  getAvailableWorkflows(type = 'extracted') {
    if (type === 'extracted') {
      return this.configManager.getExtractedWorkflows();
    } else if (type === 'raw') {
      return this.configManager.getWorkflowFiles();
    } else {
      // Return both types with metadata
      const extracted = this.configManager.getExtractedWorkflows();
      const raw = this.configManager.getWorkflowFiles();
      
      return {
        extracted,
        raw,
        all: [...new Set([...extracted, ...raw])].map(name => ({
          name,
          hasExtracted: extracted.includes(name),
          hasRaw: raw.includes(name)
        }))
      };
    }
  }

  /**
   * Display workflow selection menu
   */
  displayMenu(workflows, type = 'extracted') {
    console.log(`\n🔧 Available ${type} workflows:`);
    
    if (Array.isArray(workflows)) {
      workflows.forEach((workflow, index) => {
        if (typeof workflow === 'string') {
          console.log(`  ${index + 1}. ${workflow}`);
        } else {
          // Enhanced display for mixed types
          const status = workflow.hasExtracted && workflow.hasRaw ? '📦🔧' : 
                        workflow.hasExtracted ? '🔧' : '📦';
          console.log(`  ${index + 1}. ${workflow.name} ${status}`);
        }
      });
    } else {
      // Handle object with different types
      if (workflows.extracted && workflows.extracted.length > 0) {
        console.log('\n  Extracted workflows:');
        workflows.extracted.forEach((workflow, index) => {
          console.log(`    ${index + 1}. ${workflow} 🔧`);
        });
      }
      if (workflows.raw && workflows.raw.length > 0) {
        console.log('\n  Raw workflows:');
        workflows.raw.forEach((workflow, index) => {
          console.log(`    ${workflows.extracted.length + index + 1}. ${workflow} 📦`);
        });
      }
    }
    
    console.log('  0. All workflows');
    console.log('  q. Quit');
  }

  /**
   * Display workflow details
   */
  displayWorkflowDetails(workflowName) {
    const extractedPath = path.join(this.paths.workflowsDir, workflowName);
    const rawPath = path.join(this.paths.n8nDir, `${workflowName}.json`);
    
    console.log(`\n📋 Workflow: ${workflowName}`);
    
    // Check extracted version
    if (fs.existsSync(extractedPath)) {
      const metadataPath = path.join(extractedPath, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          console.log(`  🔧 Extracted version:`);
          console.log(`     Nodes: ${metadata.nodeCount || 'Unknown'}`);
          console.log(`     Active: ${metadata.active ? 'Yes' : 'No'}`);
          console.log(`     Extracted: ${metadata.extractedAt || 'Unknown'}`);
          console.log(`     Tags: ${metadata.tags ? metadata.tags.join(', ') : 'None'}`);
        } catch (error) {
          console.log(`  🔧 Extracted version: Present (metadata unreadable)`);
        }
      } else {
        console.log(`  🔧 Extracted version: Present`);
      }
    }
    
    // Check raw version
    if (fs.existsSync(rawPath)) {
      try {
        const stat = fs.statSync(rawPath);
        const workflow = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
        console.log(`  📦 Raw version:`);
        console.log(`     Nodes: ${workflow.nodes ? workflow.nodes.length : 'Unknown'}`);
        console.log(`     Active: ${workflow.active ? 'Yes' : 'No'}`);
        console.log(`     Size: ${Math.round(stat.size / 1024)} KB`);
        console.log(`     Modified: ${stat.mtime.toISOString()}`);
      } catch (error) {
        console.log(`  📦 Raw version: Present (unreadable)`);
      }
    }
    
    if (!fs.existsSync(extractedPath) && !fs.existsSync(rawPath)) {
      console.log(`  ❌ No versions found`);
    }
  }

  /**
   * Prompt user for workflow selection
   */
  async selectWorkflow(operation = 'work with', type = 'extracted') {
    const workflows = this.getAvailableWorkflows(type);
    
    // Handle different workflow types
    let workflowList;
    if (type === 'all') {
      workflowList = workflows.all;
    } else if (Array.isArray(workflows)) {
      workflowList = workflows;
    } else {
      workflowList = [...(workflows.extracted || []), ...(workflows.raw || [])];
    }
    
    if (workflowList.length === 0) {
      console.log(`❌ No ${type} workflows found`);
      return null;
    }

    console.log(`\n🎯 Which workflow would you like to ${operation}?`);
    this.displayMenu(type === 'all' ? workflows : workflowList, type);

    this.initializeReadline();
    
    return new Promise((resolve) => {
      this.rl.question('\nEnter your choice: ', (answer) => {
        this.closeReadline();
        
        const choice = answer.trim().toLowerCase();
        
        if (choice === 'q') {
          console.log('👋 Goodbye!');
          resolve(null);
          return;
        }
        
        if (choice === '0') {
          resolve('all');
          return;
        }
        
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < workflowList.length) {
          const selected = workflowList[index];
          resolve(typeof selected === 'string' ? selected : selected.name);
        } else {
          console.log('❌ Invalid choice. Please try again.');
          resolve(null);
        }
      });
    });
  }

  /**
   * Select workflow with details
   */
  async selectWorkflowWithDetails(operation = 'work with', type = 'extracted') {
    const selection = await this.selectWorkflow(operation, type);
    
    if (selection && selection !== 'all') {
      this.displayWorkflowDetails(selection);
    }
    
    return selection;
  }

  /**
   * Select multiple workflows
   */
  async selectMultipleWorkflows(operation = 'work with', type = 'extracted') {
    const workflows = this.getAvailableWorkflows(type);
    
    let workflowList;
    if (type === 'all') {
      workflowList = workflows.all;
    } else if (Array.isArray(workflows)) {
      workflowList = workflows;
    } else {
      workflowList = [...(workflows.extracted || []), ...(workflows.raw || [])];
    }
    
    if (workflowList.length === 0) {
      console.log(`❌ No ${type} workflows found`);
      return [];
    }

    console.log(`\n🎯 Select workflows to ${operation}:`);
    this.displayMenu(type === 'all' ? workflows : workflowList, type);
    console.log('\nEnter numbers separated by commas (e.g., 1,3,5) or "all" for all workflows:');

    this.initializeReadline();
    
    return new Promise((resolve) => {
      this.rl.question('Your selection: ', (answer) => {
        this.closeReadline();
        
        const choice = answer.trim().toLowerCase();
        
        if (choice === 'q') {
          console.log('👋 Goodbye!');
          resolve([]);
          return;
        }
        
        if (choice === 'all' || choice === '0') {
          const allWorkflows = workflowList.map(w => typeof w === 'string' ? w : w.name);
          resolve(allWorkflows);
          return;
        }
        
        // Parse comma-separated numbers
        const indices = choice.split(',').map(n => parseInt(n.trim()) - 1);
        const selected = indices
          .filter(index => index >= 0 && index < workflowList.length)
          .map(index => {
            const workflow = workflowList[index];
            return typeof workflow === 'string' ? workflow : workflow.name;
          });
        
        if (selected.length === 0) {
          console.log('❌ No valid selections made.');
          resolve([]);
        } else {
          console.log(`✅ Selected: ${selected.join(', ')}`);
          resolve(selected);
        }
      });
    });
  }

  /**
   * Interactive workflow management menu
   */
  async interactiveMenu() {
    const workflows = this.getAvailableWorkflows('all');
    
    if (workflows.all.length === 0) {
      console.log('❌ No workflows found. Please add some workflows first.');
      return null;
    }

    console.log('\n🔧 n8n Workflow Manager');
    console.log('1. Extract workflows');
    console.log('2. Package workflows');
    console.log('3. Generate types');
    console.log('4. View workflow details');
    console.log('5. List all workflows');
    console.log('q. Quit');

    this.initializeReadline();
    
    return new Promise((resolve) => {
      this.rl.question('\nWhat would you like to do? ', (answer) => {
        this.closeReadline();
        
        const choice = answer.trim().toLowerCase();
        
        switch (choice) {
          case '1':
            resolve({ action: 'extract', type: 'raw' });
            break;
          case '2':
            resolve({ action: 'package', type: 'extracted' });
            break;
          case '3':
            resolve({ action: 'generate-types', type: 'extracted' });
            break;
          case '4':
            resolve({ action: 'details', type: 'all' });
            break;
          case '5':
            resolve({ action: 'list', type: 'all' });
            break;
          case 'q':
            console.log('👋 Goodbye!');
            resolve(null);
            break;
          default:
            console.log('❌ Invalid choice. Please try again.');
            resolve(null);
        }
      });
    });
  }

  /**
   * Get workflow statistics
   */
  getStats() {
    const workflows = this.getAvailableWorkflows('all');
    
    return {
      total: workflows.all.length,
      extracted: workflows.extracted.length,
      raw: workflows.raw.length,
      both: workflows.all.filter(w => w.hasExtracted && w.hasRaw).length,
      extractedOnly: workflows.all.filter(w => w.hasExtracted && !w.hasRaw).length,
      rawOnly: workflows.all.filter(w => !w.hasExtracted && w.hasRaw).length,
      paths: this.paths
    };
  }
}

module.exports = WorkflowSelector;