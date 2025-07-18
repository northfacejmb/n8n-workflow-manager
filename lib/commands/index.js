// Command exports for n8n-workflow-manager
const ExtractCommand = require('./extract');
const PackageCommand = require('./package');
const GenerateTypesCommand = require('./generate-types');
const InitCommand = require('./init');
const InteractiveCommand = require('./interactive');

module.exports = {
  ExtractCommand,
  PackageCommand,
  GenerateTypesCommand,
  InitCommand,
  InteractiveCommand
};