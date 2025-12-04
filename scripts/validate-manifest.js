#!/usr/bin/env node

/**
 * Script to validate Scoop manifest files
 * 
 * Usage: node validate-manifest.js <manifest-file>
 */

const fs = require('fs');
const path = require('path');

// Required fields for Scoop manifests
const REQUIRED_FIELDS = ['version', 'homepage', 'license', 'url', 'hash'];

// Optional but recommended fields
const RECOMMENDED_FIELDS = ['description', 'bin', 'checkver', 'autoupdate'];

/**
 * Validate a Scoop manifest file
 */
function validateManifest(manifestPath) {
  try {
    // Check if file exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }
    
    // Read and parse JSON
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    console.log(`🔍 Validating manifest: ${manifestPath}`);
    
    // Check required fields
    const missingRequired = REQUIRED_FIELDS.filter(field => !(field in manifest));
    if (missingRequired.length > 0) {
      throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
    }
    
    // Check recommended fields
    const missingRecommended = RECOMMENDED_FIELDS.filter(field => !(field in manifest));
    if (missingRecommended.length > 0) {
      console.log(`⚠️  Missing recommended fields: ${missingRecommended.join(', ')}`);
    }
    
    // Validate version format (basic semantic versioning check)
    const versionRegex = /^\d+\.\d+\.\d+(-.*)?$/;
    if (!versionRegex.test(manifest.version)) {
      console.log(`⚠️  Version may not follow semantic versioning: ${manifest.version}`);
    }
    
    // Validate URL format
    try {
      new URL(manifest.url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${manifest.url}`);
    }
    
    // Validate hash format (SHA-256 should be 64 hex characters)
    if (manifest.hash && !/^[a-fA-F0-9]{64}$/.test(manifest.hash)) {
      console.log(`⚠️  Hash may not be valid SHA-256: ${manifest.hash}`);
    }
    
    console.log(`✅ Manifest validation passed`);
    return true;
    
  } catch (error) {
    console.error(`❌ Manifest validation failed: ${error.message}`);
    return false;
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('Usage: node validate-manifest.js <manifest-file>');
  process.exit(1);
}

// Validate the manifest
const isValid = validateManifest(args[0]);
process.exit(isValid ? 0 : 1);