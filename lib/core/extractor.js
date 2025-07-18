const fs = require('fs');
const path = require('path');
const ConfigManager = require('../utils/config');

/**
 * Extract n8n workflow into individual files for better version control
 */
class WorkflowExtractor {
  constructor(configManager = null) {
    this.configManager = configManager || new ConfigManager();
    this.config = this.configManager.config;
    this.paths = this.configManager.getPaths();
  }

  /**
   * Get file extension based on node type
   */
  getNodeFileExtension(nodeType, parameters) {
    switch (nodeType) {
      case 'n8n-nodes-base.code':
        // Check if code contains TypeScript patterns
        const jsCode = parameters?.jsCode || '';
        if (jsCode.includes('interface ') || jsCode.includes('type ') || jsCode.includes(': string') || jsCode.includes(': number')) {
          return '.ts';
        }
        return '.js';
      case 'n8n-nodes-base.webhook':
      case 'n8n-nodes-base.httpRequest':
      case 'n8n-nodes-base.if':
      case 'n8n-nodes-base.github':
      case 'n8n-nodes-base.linearTrigger':
        return '.json';
      default:
        return '.json';
    }
  }

  /**
   * Sanitize node name for filesystem
   */
  sanitizeNodeName(nodeName) {
    return nodeName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Extract code content from code nodes
   */
  extractCodeNode(node) {
    const { jsCode, ...otherParams } = node.parameters || {};
    
    return {
      codeContent: jsCode || '',
      nodeConfig: {
        ...node,
        parameters: {
          ...otherParams,
          jsCode: '// CODE_PLACEHOLDER - content loaded from external file'
        }
      }
    };
  }

  /**
   * Extract single workflow
   */
  extractWorkflow(workflowName) {
    const workflowPath = path.join(this.paths.n8nDir, `${workflowName}.json`);
    
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow file not found: ${workflowPath}`);
    }

    console.log(`🔍 Extracting workflow: ${workflowName}`);
    
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
    const targetDir = path.join(this.paths.workflowsDir, workflowName);
    const nodesDir = path.join(targetDir, 'nodes');
    const typesDir = path.join(targetDir, 'types');

    // Create directories
    if (!fs.existsSync(nodesDir)) {
      fs.mkdirSync(nodesDir, { recursive: true });
    }
    if (!fs.existsSync(typesDir)) {
      fs.mkdirSync(typesDir, { recursive: true });
    }

    // Extract metadata
    const metadata = {
      name: workflow.name,
      active: workflow.active,
      settings: workflow.settings,
      versionId: workflow.versionId,
      meta: workflow.meta,
      id: this.config.extraction.preserveIds ? workflow.id : undefined,
      tags: workflow.tags,
      extractedAt: new Date().toISOString(),
      nodeCount: workflow.nodes?.length || 0
    };

    // Remove undefined values
    Object.keys(metadata).forEach(key => {
      if (metadata[key] === undefined) {
        delete metadata[key];
      }
    });

    fs.writeFileSync(
      path.join(targetDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Extract connections
    if (workflow.connections) {
      fs.writeFileSync(
        path.join(targetDir, 'connections.json'),
        JSON.stringify(workflow.connections, null, 2)
      );
    }

    // Extract nodes
    const nodeIndex = {};
    const extractedNodes = [];

    if (workflow.nodes) {
      workflow.nodes.forEach((node, index) => {
        const sanitizedName = this.sanitizeNodeName(node.name);
        const extension = this.getNodeFileExtension(node.type, node.parameters);
        const filename = `${sanitizedName}${extension}`;
        
        console.log(`  📄 Extracting node: ${node.name} -> ${filename}`);

        if (this.config.extraction.generateIndex) {
          nodeIndex[node.id] = {
            name: node.name,
            filename: filename,
            type: node.type,
            originalIndex: index
          };
        }

        if (node.type === 'n8n-nodes-base.code' && this.config.extraction.splitCodeNodes) {
          const { codeContent, nodeConfig } = this.extractCodeNode(node);
          
          // Save code to separate file
          fs.writeFileSync(path.join(nodesDir, filename), codeContent);
          
          // Save node configuration
          const configFilename = `${sanitizedName}.config.json`;
          fs.writeFileSync(
            path.join(nodesDir, configFilename),
            JSON.stringify(nodeConfig, null, 2)
          );
          
          extractedNodes.push({
            ...nodeConfig,
            _extractedCodeFile: filename,
            _extractedConfigFile: configFilename
          });
        } else {
          // Save regular node
          fs.writeFileSync(
            path.join(nodesDir, filename),
            JSON.stringify(node, null, 2)
          );
          
          extractedNodes.push({
            ...node,
            _extractedFile: filename
          });
        }
      });
    }

    // Save node index if enabled
    if (this.config.extraction.generateIndex) {
      fs.writeFileSync(
        path.join(targetDir, 'node-index.json'),
        JSON.stringify(nodeIndex, null, 2)
      );
    }

    // Create main workflow file with references
    const extractedWorkflow = {
      ...workflow,
      nodes: extractedNodes,
      _extracted: true,
      _extractedAt: new Date().toISOString(),
      _extractedWith: 'n8n-workflow-manager'
    };

    fs.writeFileSync(
      path.join(targetDir, 'workflow.json'),
      JSON.stringify(extractedWorkflow, null, 2)
    );

    console.log(`✅ Workflow extracted to: ${targetDir}`);
    console.log(`   📊 ${workflow.nodes?.length || 0} nodes extracted`);
    console.log(`   📁 ${Object.keys(nodeIndex).length} files created`);
    
    return {
      targetDir,
      nodeCount: workflow.nodes?.length || 0,
      extractedFiles: Object.values(nodeIndex).map(n => n.filename)
    };
  }

  /**
   * Extract all workflows
   */
  extractAll() {
    const workflowFiles = this.configManager.getWorkflowFiles();

    console.log(`🔍 Found ${workflowFiles.length} workflow(s) to extract`);

    const results = [];
    for (const workflowName of workflowFiles) {
      try {
        const result = this.extractWorkflow(workflowName);
        results.push({ workflowName, success: true, ...result });
      } catch (error) {
        console.error(`❌ Failed to extract ${workflowName}:`, error.message);
        results.push({ workflowName, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get extraction statistics
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
   * Validate extraction environment
   */
  validateEnvironment() {
    const validation = this.configManager.validate();
    
    if (!validation.valid) {
      throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`);
    }
    
    return validation;
  }
}

module.exports = WorkflowExtractor;