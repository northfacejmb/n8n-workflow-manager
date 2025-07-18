const fs = require('fs');
const path = require('path');
const ConfigManager = require('../utils/config');

/**
 * Package n8n workflow from individual files back to single JSON
 */
class WorkflowPackager {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.config = this.configManager.config;
    this.paths = this.configManager.getPaths();
  }

  /**
   * Load code content from external file
   */
  loadCodeContent(nodesDir, filename) {
    const codePath = path.join(nodesDir, filename);
    if (!fs.existsSync(codePath)) {
      throw new Error(`Code file not found: ${codePath}`);
    }
    return fs.readFileSync(codePath, 'utf-8');
  }

  /**
   * Create backup of original workflow if enabled
   */
  createBackup(workflowName) {
    if (!this.config.packaging.backupOriginal) {
      return null;
    }

    const originalPath = path.join(this.paths.n8nDir, `${workflowName}.json`);
    if (!fs.existsSync(originalPath)) {
      return null;
    }

    const backupPath = path.join(this.paths.n8nDir, `${workflowName}.backup.json`);
    fs.copyFileSync(originalPath, backupPath);
    console.log(`💾 Created backup: ${backupPath}`);
    
    return backupPath;
  }

  /**
   * Validate workflow structure
   */
  validateWorkflow(workflow) {
    if (!this.config.packaging.validateWorkflows) {
      return { valid: true, errors: [] };
    }

    const errors = [];

    // Check required fields
    if (!workflow.name) {
      errors.push('Workflow name is required');
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      errors.push('Workflow must have nodes array');
    }

    if (!workflow.connections || typeof workflow.connections !== 'object') {
      errors.push('Workflow must have connections object');
    }

    // Check node structure
    if (workflow.nodes) {
      workflow.nodes.forEach((node, index) => {
        if (!node.id) {
          errors.push(`Node at index ${index} is missing id`);
        }
        if (!node.name) {
          errors.push(`Node at index ${index} is missing name`);
        }
        if (!node.type) {
          errors.push(`Node at index ${index} is missing type`);
        }
        if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
          errors.push(`Node at index ${index} has invalid position`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Package single workflow
   */
  packageWorkflow(workflowName) {
    const workflowDir = path.join(this.paths.workflowsDir, workflowName);
    const nodesDir = path.join(workflowDir, 'nodes');
    
    if (!fs.existsSync(workflowDir)) {
      throw new Error(`Workflow directory not found: ${workflowDir}`);
    }

    console.log(`📦 Packaging workflow: ${workflowName}`);

    // Create backup if enabled
    const backupPath = this.createBackup(workflowName);

    // Load workflow base
    const workflowPath = path.join(workflowDir, 'workflow.json');
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`);
    }

    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
    
    // Load metadata
    const metadataPath = path.join(workflowDir, 'metadata.json');
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }

    // Load connections
    const connectionsPath = path.join(workflowDir, 'connections.json');
    let connections = {};
    if (fs.existsSync(connectionsPath)) {
      connections = JSON.parse(fs.readFileSync(connectionsPath, 'utf-8'));
    }

    // Process nodes
    const processedNodes = [];
    
    if (workflow.nodes) {
      workflow.nodes.forEach((node, index) => {
        console.log(`  🔧 Processing node: ${node.name}`);
        
        const processedNode = { ...node };
        
        // Remove extraction metadata
        delete processedNode._extractedFile;
        delete processedNode._extractedCodeFile;
        delete processedNode._extractedConfigFile;
        
        // Handle code nodes
        if (node.type === 'n8n-nodes-base.code' && node._extractedCodeFile) {
          try {
            const codeContent = this.loadCodeContent(nodesDir, node._extractedCodeFile);
            processedNode.parameters = {
              ...processedNode.parameters,
              jsCode: codeContent
            };
            console.log(`    💻 Loaded code from: ${node._extractedCodeFile}`);
          } catch (error) {
            console.warn(`    ⚠️  Failed to load code file: ${error.message}`);
          }
        }
        
        // Handle nodes loaded from individual files
        if (node._extractedFile) {
          try {
            const filePath = path.join(nodesDir, node._extractedFile);
            const nodeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            Object.assign(processedNode, nodeData);
            console.log(`    📄 Loaded config from: ${node._extractedFile}`);
          } catch (error) {
            console.warn(`    ⚠️  Failed to load node file: ${error.message}`);
          }
        }
        
        processedNodes.push(processedNode);
      });
    }

    // Build final workflow
    const packagedWorkflow = {
      name: metadata.name || workflow.name,
      nodes: processedNodes,
      connections: connections,
      active: metadata.active !== undefined ? metadata.active : workflow.active,
      settings: metadata.settings || workflow.settings || {},
      versionId: metadata.versionId || workflow.versionId,
      meta: metadata.meta || workflow.meta || {},
      id: metadata.id || workflow.id,
      tags: metadata.tags || workflow.tags || [],
      pinData: workflow.pinData || {}
    };

    // Remove extraction metadata
    delete packagedWorkflow._extracted;
    delete packagedWorkflow._extractedAt;
    delete packagedWorkflow._extractedWith;

    // Validate workflow
    const validation = this.validateWorkflow(packagedWorkflow);
    if (!validation.valid) {
      console.warn(`⚠️  Workflow validation warnings: ${validation.errors.join(', ')}`);
      if (this.config.packaging.validateWorkflows) {
        throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Write packaged workflow
    const outputPath = path.join(this.paths.n8nDir, `${workflowName}.json`);
    const outputContent = this.config.packaging.minifyOutput 
      ? JSON.stringify(packagedWorkflow)
      : JSON.stringify(packagedWorkflow, null, 2);
    
    fs.writeFileSync(outputPath, outputContent);

    console.log(`✅ Workflow packaged to: ${outputPath}`);
    console.log(`   📊 ${processedNodes.length} nodes processed`);
    
    return {
      outputPath,
      nodeCount: processedNodes.length,
      backupPath,
      validation
    };
  }

  /**
   * Package single node for import
   */
  packageSingleNode(workflowName, nodeName) {
    const workflowDir = path.join(this.paths.workflowsDir, workflowName);
    const nodesDir = path.join(workflowDir, 'nodes');
    
    if (!fs.existsSync(workflowDir)) {
      throw new Error(`Workflow directory not found: ${workflowDir}`);
    }

    console.log(`📦 Packaging single node: ${nodeName} from ${workflowName}`);

    // Load node index
    const nodeIndexPath = path.join(workflowDir, 'node-index.json');
    if (!fs.existsSync(nodeIndexPath)) {
      throw new Error(`Node index not found: ${nodeIndexPath}`);
    }

    const nodeIndex = JSON.parse(fs.readFileSync(nodeIndexPath, 'utf-8'));
    
    // Find node by name
    const nodeInfo = Object.values(nodeIndex).find(n => 
      n.name.toLowerCase() === nodeName.toLowerCase()
    );
    
    if (!nodeInfo) {
      throw new Error(`Node not found: ${nodeName}`);
    }

    // Load node file
    const nodeFilePath = path.join(nodesDir, nodeInfo.filename);
    if (!fs.existsSync(nodeFilePath)) {
      throw new Error(`Node file not found: ${nodeFilePath}`);
    }

    let nodeData;
    
    if (nodeInfo.type === 'n8n-nodes-base.code') {
      // Load code content
      const codeContent = fs.readFileSync(nodeFilePath, 'utf-8');
      
      // Load config if available
      const configFilename = nodeInfo.filename.replace(/\.(js|ts)$/, '.config.json');
      const configPath = path.join(nodesDir, configFilename);
      
      if (fs.existsSync(configPath)) {
        nodeData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        nodeData.parameters = {
          ...nodeData.parameters,
          jsCode: codeContent
        };
      } else {
        // Create minimal node structure
        nodeData = {
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [0, 0],
          parameters: {
            jsCode: codeContent
          }
        };
      }
    } else {
      nodeData = JSON.parse(fs.readFileSync(nodeFilePath, 'utf-8'));
    }

    // Clean up extraction metadata
    delete nodeData._extractedFile;
    delete nodeData._extractedCodeFile;
    delete nodeData._extractedConfigFile;

    // Create single-node workflow
    const singleNodeWorkflow = {
      name: `${workflowName}-${nodeName}`,
      nodes: [nodeData],
      connections: {},
      active: false,
      settings: {},
      versionId: `single-node-${Date.now()}`,
      meta: {},
      id: `single-node-${Date.now()}`,
      tags: ['single-node-export'],
      pinData: {}
    };

    // Write single node export
    const outputPath = path.join(this.paths.n8nDir, `${workflowName}-${nodeName.toLowerCase()}.json`);
    const outputContent = this.config.packaging.minifyOutput 
      ? JSON.stringify(singleNodeWorkflow)
      : JSON.stringify(singleNodeWorkflow, null, 2);
    
    fs.writeFileSync(outputPath, outputContent);

    console.log(`✅ Single node packaged to: ${outputPath}`);
    
    return {
      outputPath,
      nodeInfo,
      nodeData
    };
  }

  /**
   * Package all workflows
   */
  packageAll() {
    const workflowDirs = this.configManager.getExtractedWorkflows();

    console.log(`📦 Found ${workflowDirs.length} workflow(s) to package`);

    const results = [];
    for (const workflowName of workflowDirs) {
      try {
        const result = this.packageWorkflow(workflowName);
        results.push({ workflowName, success: true, ...result });
      } catch (error) {
        console.error(`❌ Failed to package ${workflowName}:`, error.message);
        results.push({ workflowName, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get packaging statistics
   */
  getStats() {
    const workflowFiles = this.configManager.getWorkflowFiles();
    const extractedWorkflows = this.configManager.getExtractedWorkflows();
    
    return {
      totalWorkflows: workflowFiles.length,
      extractedWorkflows: extractedWorkflows.length,
      workflowFiles,
      extractedWorkflows,
      paths: this.paths
    };
  }

  /**
   * Validate packaging environment
   */
  validateEnvironment() {
    const validation = this.configManager.validate();
    
    if (!validation.valid) {
      throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
    }
    
    return validation;
  }
}

module.exports = WorkflowPackager;