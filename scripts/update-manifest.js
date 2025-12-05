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
 *   run-id: GitHub Actions run ID that triggered update
 */

const fs = require("fs");
const https = require("https");

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 4) {
  console.error(
    "Usage: node update-manifest.js <manifest-file> <owner> <repo> <version>",
  );
  process.exit(5);
}

updateManifest(...args);

/**
 * Make HTTPS request to GitHub API
 */
function httpsRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "scoop-bucket-update",
        Accept: "application/vnd.github.v3+json",
      },
    };

    // Add authentication if token is available
    if (process.env.GITHUB_TOKEN) {
      options.headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const request = https.get(url, options, (response) => {
      let data = "";

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(
              new Error(`Failed to parse JSON response: ${error.message}`),
            );
          }
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${data}`));
        }
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

/**
 * Get release information from GitHub API
 */
async function getReleaseInfo(owner, repo, version) {
  try {
    console.log(
      `🔍 Fetching release info for ${owner}/${repo} version ${version}`,
    );

    // Get release information
    const releaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${version}`;

    console.log(`🔗 Fetching release info from ${releaseUrl}`);

    const release = await httpsRequest(releaseUrl);

    // Find Windows asset (look for windows pattern, accept x86_64 or amd64)
    const windowsAsset = release.assets.find(
      (asset) =>
        asset.name.includes("windows") &&
        (asset.name.includes("amd64") || asset.name.includes("x86_64")),
    );

    if (!windowsAsset) {
      throw new Error("No Windows amd64 asset found in release");
    }

    // Get asset details and calculate hash
    const assetUrl = windowsAsset.browser_download_url;
    console.log(`📦 Found Windows asset: ${windowsAsset.name}`);

    // Download asset to calculate hash
    const assetBuffer = await downloadAsset(assetUrl);
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(assetBuffer).digest("hex");

    console.log(`🔐 Calculated SHA256: ${hash}`);

    const repoUrl = release.html_url.match(
      RegExp("https://github\.com/[^/]+/[^/]+"),
    )[0];

    return {
      version: version,
      repoUrl: repoUrl,
      releaseUrl: release.html_url,
      assetUrl: assetUrl,
      hash: hash,
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
      // Handle redirect
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        console.log(`🔄 Following redirect to: ${response.headers.location}`);
        return downloadAsset(response.headers.location)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(
          new Error(`Failed to download asset: HTTP ${response.statusCode}`),
        );
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

/**
 * Update manifest with new release information
 */
async function updateManifest(manifestPath, owner, repo, newVersion) {
  try {
    // Read existing manifest
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    const manifestContent = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent);

    console.log(`📄 Processing manifest: ${manifestPath}`);

    // Get release information from GitHub API
    const releaseInfo = await getReleaseInfo(owner, repo, newVersion);

    // Update version
    manifest.version = newVersion;
    manifest.homepage = releaseInfo.repoUrl;

    // Update URL to point to the new asset
    manifest.url = releaseInfo.assetUrl;

    manifest.checkver.github = releaseInfo.repoUrl;

    // Update hash
    manifest.hash = releaseInfo.hash;

    // Update autoupdate configuration if it exists
    if (manifest.autoupdate) {
      // Create a template URL for autoupdate
      const assetName = releaseInfo.assetUrl.split("/").pop();
      const templateAssetName = assetName.replace(newVersion, "$version");
      manifest.autoupdate.url = releaseInfo.assetUrl.replace(
        assetName,
        templateAssetName,
      );

      // Update hash URL pattern
      if (manifest.autoupdate.hash && manifest.autoupdate.hash.url) {
        manifest.autoupdate.hash.url = releaseInfo.assetUrl + ".sha256";
      }
    }

    // Write updated manifest back to file
    const updatedContent = JSON.stringify(manifest, null, 2) + "\n";
    fs.writeFileSync(manifestPath, updatedContent);

    console.log(`✅ Updated manifest: ${manifestPath}`);
    console.log(`   Version: ${newVersion}`);
    console.log(`   URL: ${releaseInfo.assetUrl}`);
    console.log(`   Hash: ${releaseInfo.hash}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error updating manifest: ${error.message}`);
    process.exit(1);
  }
}
