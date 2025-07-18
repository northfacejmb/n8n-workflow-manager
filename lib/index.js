// Main entry point for n8n-workflow-manager
const WorkflowExtractor = require('./core/extractor');
const WorkflowPackager = require('./core/packager');
const TypesGenerator = require('./core/types-generator');
const WorkflowSelector = require('./utils/selector');
const ConfigManager = require('./utils/config');

// Commands
const {
  ExtractCommand,
  PackageCommand,
  GenerateTypesCommand,
  InitCommand,
  InteractiveCommand
} = require('./commands');

module.exports = {
  // Core modules
  WorkflowExtractor,
  WorkflowPackager,
  TypesGenerator,
  WorkflowSelector,
  ConfigManager,
  
  // Commands
  ExtractCommand,
  PackageCommand,
  GenerateTypesCommand,
  InitCommand,
  InteractiveCommand
};