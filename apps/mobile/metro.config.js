const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Monorepo: add workspace root to watchFolders (merge with Expo defaults)
config.watchFolders = [...(config.watchFolders || []), workspaceRoot];
// Monorepo: resolve from app and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Use Expo default (false) so expo doctor passes
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
