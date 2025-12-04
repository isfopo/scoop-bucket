#!/usr/bin/env node

/**
 * Script to update Scoop manifest with new release information
 * 
 * Usage: node update-manifest.js <manifest-file> <version> <release-url> <asset-url> <hash>
 * 
 * Arguments:
 *   manifest-file: Path to the JSON manifest file
 *   version: New version to update
 *   release-url: URL to the GitHub release
 *   asset-url: URL to the release asset
 *   hash: SHA256 hash of the asset
 */

const fs = require('fs');
const path = require('path');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 5) {
  console.error('Usage: node update-manifest.js <manifest-file> <version> <release-url> <asset-url> <hash>');
  process.exit(1);
}

const [manifestFile, version, releaseUrl, assetUrl, hash] = args;

/**
 * Update manifest with new release information
 */
function updateManifest(manifestPath, newVersion, releaseUrl, assetUrl, assetHash) {
  try {
    // Read existing manifest
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }
    
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Update version
    manifest.version = newVersion;
    
    // Update URL to point to the new asset
    manifest.url = assetUrl;
    
    // Update hash
    manifest.hash = assetHash;
    
    // Update autoupdate configuration if it exists
    if (manifest.autoupdate) {
      manifest.autoupdate.url = assetUrl.replace(new RegExp(newVersion.replace('.', '\\.') + '-[^/]+'), '$version-windows-amd64');
      
      // Update hash URL pattern
      if (manifest.autoupdate.hash && manifest.autoupdate.hash.url) {
        manifest.autoupdate.hash.url = assetUrl + '.sha256';
      }
    }
    
    // Write updated manifest back to file
    const updatedContent = JSON.stringify(manifest, null, 2) + '\n';
    fs.writeFileSync(manifestPath, updatedContent);
    
    console.log(`✅ Updated manifest: ${manifestPath}`);
    console.log(`   Version: ${newVersion}`);
    console.log(`   URL: ${assetUrl}`);
    console.log(`   Hash: ${assetHash}`);
    
  } catch (error) {
    console.error(`❌ Error updating manifest: ${error.message}`);
    process.exit(1);
  }
}

// Execute the update
updateManifest(manifestFile, version, releaseUrl, assetUrl, hash);