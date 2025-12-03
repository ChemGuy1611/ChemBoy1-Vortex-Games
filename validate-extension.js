#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class VortexExtensionValidator {
  constructor(extensionPath) {
    this.extensionPath = extensionPath;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'error':
        this.errors.push(logEntry);
        console.error(`❌ ${message}`);
        break;
      case 'warning':
        this.warnings.push(logEntry);
        console.warn(`⚠️  ${message}`);
        break;
      case 'info':
        this.info.push(logEntry);
        console.log(`ℹ️  ${message}`);
        break;
    }
  }

  validate() {
    console.log(`🔍 Validating Vortex extension: ${this.extensionPath}`);
    console.log('=' .repeat(60));

    // Check if extension directory exists
    if (!fs.existsSync(this.extensionPath)) {
      this.log('error', `Extension directory does not exist: ${this.extensionPath}`);
      return false;
    }

    // Validate required files
    this.validateRequiredFiles();

    // Validate info.json
    this.validateInfoJson();

    // Validate index.js structure
    this.validateIndexJsStructure();

    // Validate game assets
    this.validateGameAssets();

    // Validate version consistency
    this.validateVersionConsistency();

    // Validate game constants
    this.validateGameConstants();

    // Print summary
    this.printSummary();

    return this.errors.length === 0;
  }

  validateRequiredFiles() {
    const requiredFiles = ['info.json', 'index.js'];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(this.extensionPath, file);
      if (!fs.existsSync(filePath)) {
        this.log('error', `Required file missing: ${file}`);
      } else {
        this.log('info', `Required file found: ${file}`);
      }
    });

    // Check for optional but recommended files
    const recommendedFiles = ['CHANGELOG.md'];
    recommendedFiles.forEach(file => {
      const filePath = path.join(this.extensionPath, file);
      if (fs.existsSync(filePath)) {
        this.log('info', `Recommended file found: ${file}`);
      } else {
        this.log('warning', `Recommended file missing: ${file}`);
      }
    });
  }

  validateInfoJson() {
    const infoPath = path.join(this.extensionPath, 'info.json');
    
    if (!fs.existsSync(infoPath)) {
      return;
    }

    try {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      
      // Check required fields
      const requiredFields = ['name', 'author', 'version', 'description'];
      requiredFields.forEach(field => {
        if (!info[field]) {
          this.log('error', `info.json missing required field: ${field}`);
        } else {
          this.log('info', `info.json field found: ${field} = ${info[field]}`);
        }
      });

      // Validate version format
      if (info.version && !this.isValidVersion(info.version)) {
        this.log('warning', `Version format may be invalid: ${info.version} (expected semver like x.y.z)`);
      }

      // Check if name follows Game: [Name] pattern
      if (info.name && !info.name.startsWith('Game: ')) {
        this.log('warning', `Extension name should start with 'Game: ': ${info.name}`);
      }

    } catch (error) {
      this.log('error', `Failed to parse info.json: ${error.message}`);
    }
  }

  validateIndexJsStructure() {
    const indexPath = path.join(this.extensionPath, 'index.js');
    
    if (!fs.existsSync(indexPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      
      // Check for required imports
      const requiredImports = ['vortex-api'];
      requiredImports.forEach(imp => {
        if (!content.includes(`require('${imp}')`)) {
          this.log('warning', `Missing required import: ${imp}`);
        } else {
          this.log('info', `Required import found: ${imp}`);
        }
      });

      // Check for required exports
      if (!content.includes('module.exports')) {
        this.log('error', 'Missing module.exports');
      } else {
        this.log('info', 'module.exports found');
      }

      // Check for main function
      if (!content.includes('function main')) {
        this.log('warning', 'Missing main function');
      } else {
        this.log('info', 'main function found');
      }

      // Check for game registration
      if (!content.includes('context.registerGame')) {
        this.log('warning', 'Missing game registration');
      } else {
        this.log('info', 'Game registration found');
      }

      // Check for common game constants
      const commonConstants = ['GAME_ID', 'GAME_NAME'];
      commonConstants.forEach(constant => {
        if (content.includes(`const ${constant}`) || content.includes(`let ${constant}`)) {
          this.log('info', `Game constant found: ${constant}`);
        }
      });

    } catch (error) {
      this.log('error', `Failed to read index.js: ${error.message}`);
    }
  }

  validateGameAssets() {
    const gameId = this.extractGameId();
    if (!gameId) {
      this.log('warning', 'Could not extract GAME_ID for asset validation');
      return;
    }

    // Check for game logo
    const logoExtensions = ['.jpg', '.jpeg', '.png'];
    let logoFound = false;
    
    logoExtensions.forEach(ext => {
      const logoPath = path.join(this.extensionPath, `${gameId}${ext}`);
      if (fs.existsSync(logoPath)) {
        this.log('info', `Game logo found: ${gameId}${ext}`);
        logoFound = true;
      }
    });

    if (!logoFound) {
      this.log('warning', `Game logo not found: ${gameId}.jpg/.png`);
    }
  }

  validateVersionConsistency() {
    const infoPath = path.join(this.extensionPath, 'info.json');
    const indexPath = path.join(this.extensionPath, 'index.js');

    if (!fs.existsSync(infoPath) || !fs.existsSync(indexPath)) {
      return;
    }

    try {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      const indexContent = fs.readFileSync(indexPath, 'utf8');

      // Extract version from info.json
      const infoVersion = info.version;

      // Look for version in index.js comments
      const versionMatch = indexContent.match(/Version:\s*([0-9.]+)/);
      const indexVersion = versionMatch ? versionMatch[1] : null;

      if (infoVersion && indexVersion) {
        if (infoVersion === indexVersion) {
          this.log('info', `Version consistency confirmed: ${infoVersion}`);
        } else {
          this.log('warning', `Version mismatch - info.json: ${infoVersion}, index.js: ${indexVersion}`);
        }
      }

    } catch (error) {
      this.log('error', `Failed to validate version consistency: ${error.message}`);
    }
  }

  validateGameConstants() {
    const indexPath = path.join(this.extensionPath, 'index.js');
    
    if (!fs.existsSync(indexPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf8');

      // Check for Steam App ID
      const steamMatch = content.match(/STEAMAPP_ID\s*=\s*["']?(\d+)["']?/);
      if (steamMatch) {
        this.log('info', `Steam App ID found: ${steamMatch[1]}`);
        
        // Validate Steam App ID format (should be numeric)
        if (!/^\d+$/.test(steamMatch[1])) {
          this.log('warning', `Steam App ID should be numeric: ${steamMatch[1]}`);
        }
      } else {
        this.log('info', 'Steam App ID not found (game may not be on Steam)');
      }

      // Check for Xbox App ID
      const xboxMatch = content.match(/XBOXAPP_ID\s*=\s*["']([^"']+)["']/);
      if (xboxMatch) {
        this.log('info', `Xbox App ID found: ${xboxMatch[1]}`);
      }

      // Check for executable name
      const execMatch = content.match(/EXEC_DEFAULT\s*=\s*["']([^"']+)["']/);
      if (execMatch) {
        this.log('info', `Default executable found: ${execMatch[1]}`);
        
        // Check if executable has .exe extension
        if (!execMatch[1].toLowerCase().endsWith('.exe')) {
          this.log('info', `Executable without .exe extension: ${execMatch[1]} (may be correct for some games)`);
        }
      }

    } catch (error) {
      this.log('error', `Failed to validate game constants: ${error.message}`);
    }
  }

  extractGameId() {
    const indexPath = path.join(this.extensionPath, 'index.js');
    
    if (!fs.existsSync(indexPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      const match = content.match(/GAME_ID\s*=\s*["']([^"']+)["']/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  isValidVersion(version) {
    // Basic semver validation
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9\-\.]+)?(\+[a-zA-Z0-9\-\.]+)?$/;
    return semverRegex.test(version);
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`ℹ️  Info: ${this.info.length}`);
    
    if (this.errors.length === 0) {
      console.log('\n🎉 Extension validation PASSED!');
    } else {
      console.log('\n💥 Extension validation FAILED!');
    }

    // Option to save detailed log
    console.log('\n💾 Detailed log can be saved with --log-file option');
  }

  saveLogFile(filePath) {
    const logContent = [
      '# Vortex Extension Validation Log',
      `# Extension: ${this.extensionPath}`,
      `# Timestamp: ${new Date().toISOString()}`,
      '',
      '## ERRORS',
      ...this.errors,
      '',
      '## WARNINGS', 
      ...this.warnings,
      '',
      '## INFO',
      ...this.info
    ].join('\n');

    fs.writeFileSync(filePath, logContent);
    console.log(`📄 Log saved to: ${filePath}`);
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node validate-extension.js <extension-path> [--log-file <path>]');
    console.log('Example: node validate-extension.js game-abioticfactor');
    process.exit(1);
  }

  const extensionPath = args[0];
  const logFileIndex = args.indexOf('--log-file');
  const logFile = logFileIndex !== -1 ? args[logFileIndex + 1] : null;

  const validator = new VortexExtensionValidator(extensionPath);
  const isValid = validator.validate();

  if (logFile) {
    validator.saveLogFile(logFile);
  }

  process.exit(isValid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = VortexExtensionValidator;