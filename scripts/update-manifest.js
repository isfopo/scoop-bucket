#!/usr/bin/env node

/**
 * Script to update Scoop manifest with new release information
 * 
 * Usage: node update-manifest.js <manifest-file> <repo> <version> <run-id>
 * 
 * Arguments:
 *   manifest-file: Path to the JSON manifest file
 *   repo: Full repository path (owner/repo)
 *   version: New version to update
 *   run-id: GitHub Actions run ID that triggered the update
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 4) {
  console.error('Usage: node update-manifest.js <manifest-file> <repo> <version> <run-id>');
  process.exit(1);
}

const [manifestFile, repo, version, runId] = args;

/**
 * Make HTTPS request to GitHub API
 */
function httpsRequest(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'scoop-bucket-update',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${data}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Get release information from GitHub API
 */
async function getReleaseInfo(repo, version) {
  try {
    console.log(`🔍 Fetching release info for ${repo} version ${version}`);
    
    // Get release information
    const releaseUrl = `https://api.github.com/repos/${repo}/releases/tags/v${version}`;
    const release = await httpsRequest(releaseUrl);
    
    // Find Windows asset (look for windows-amd64 pattern)
    const windowsAsset = release.assets.find(asset => 
      asset.name.includes('windows') && 
      asset.name.includes('amd64')
    );
    
    if (!windowsAsset) {
      throw new Error('No Windows amd64 asset found in release');
    }
    
    // Get asset details and calculate hash
    const assetUrl = windowsAsset.browser_download_url;
    console.log(`📦 Found Windows asset: ${windowsAsset.name}`);
    
    // Download asset to calculate hash
    const assetBuffer = await downloadAsset(assetUrl);
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(assetBuffer).digest('hex');
    
    console.log(`🔐 Calculated SHA256: ${hash}`);
    
    return {
      version: version,
      releaseUrl: release.html_url,
      assetUrl: assetUrl,
      hash: hash
    };
    
  } catch (error) {
    console.error(`❌ Error fetching release info: ${error.message}`);
    throw error;
  }
}

/**
 * Download asset from URL
 */
function downloadAsset(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download asset: HTTP ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Update manifest with new release information
 */
async function updateManifest(manifestPath, repo, newVersion, runId) {
  try {
    // Read existing manifest
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }
    
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    console.log(`📄 Processing manifest: ${manifestPath}`);
    
    // Get release information from GitHub API
    const releaseInfo = await getReleaseInfo(repo, newVersion);
    
    // Update version
    manifest.version = newVersion;
    
    // Update URL to point to the new asset
    manifest.url = releaseInfo.assetUrl;
    
    // Update hash
    manifest.hash = releaseInfo.hash;
    
    // Update autoupdate configuration if it exists
    if (manifest.autoupdate) {
      // Create a template URL for autoupdate
      const assetName = releaseInfo.assetUrl.split('/').pop();
      const templateAssetName = assetName.replace(newVersion, '$version');
      manifest.autoupdate.url = releaseInfo.assetUrl.replace(assetName, templateAssetName);
      
      // Update hash URL pattern
      if (manifest.autoupdate.hash && manifest.autoupdate.hash.url) {
        manifest.autoupdate.hash.url = releaseInfo.assetUrl + '.sha256';
      }
    }
    
    // Write updated manifest back to file
    const updatedContent = JSON.stringify(manifest, null, 2) + '\n';
    fs.writeFileSync(manifestPath, updatedContent);
    
    console.log(`✅ Updated manifest: ${manifestPath}`);
    console.log(`   Version: ${newVersion}`);
    console.log(`   URL: ${releaseInfo.assetUrl}`);
    console.log(`   Hash: ${releaseInfo.hash}`);
    console.log(`   Run ID: ${runId}`);
    
  } catch (error) {
    console.error(`❌ Error updating manifest: ${error.message}`);
    process.exit(1);
  }
}

// Execute the update
updateManifest(manifestFile, repo, version, runId);