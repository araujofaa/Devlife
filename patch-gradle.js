// patch-gradle.js
const fs = require('fs');
const path = require('path');

const androidDir = path.join(__dirname, 'apps', 'mobile', 'android');

// Função para substituir caminhos no Gradle
const patchFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Substitui '../node_modules' por '../../node_modules' (subindo dois níveis para a raiz do monorepo)
  const newContent = content.replace(/\.\.\/node_modules/g, '../../node_modules');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Caminhos corrigidos em: ${filePath}`);
  } else {
    console.log(`ℹ️ Nenhuma alteração necessária em: ${filePath}`);
  }
};

// Aplica a correção nos arquivos do Gradle
patchFile(path.join(androidDir, 'settings.gradle'));
patchFile(path.join(androidDir, 'app', 'build.gradle'));