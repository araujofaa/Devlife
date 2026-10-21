const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Encontra a raiz do monorepo (2 níveis acima de apps/mobile)
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Monitorar a raiz do monorepo para o pnpm
config.watchFolders = [workspaceRoot];

// 2. Resolver node_modules do app mobile e da raiz
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Resolver o alias @/ usado nos imports
config.resolver.extraNodeModules = {
  '@': projectRoot,
};

module.exports = config;