# Scoop Bucket

A custom Scoop bucket that automatically updates manifests when new releases are published in connected repositories.

## Overview

This bucket is designed to work with automated release workflows. When a new release is created in a connected repository (like the `soundcheck` repo), it can trigger a workflow in this bucket to automatically update the corresponding manifest file.

## Features

- ✅ Automated manifest updates via repository dispatch events
- ✅ Manifest validation on every push/PR
- ✅ Support for SHA256 hash verification
- ✅ Semantic versioning compatibility
- ✅ Auto-update configuration for future releases

## Installation

To add this bucket to your Scoop installation:

```bash
scoop bucket add <bucket-name> https://github.com/your-username/scoop-bucket
```

Replace `<bucket-name>` with your desired bucket name and `your-username` with your GitHub username.

## Usage

### Installing Packages

Once the bucket is added, you can install packages:

```bash
scoop install <package-name>
```

For example:
```bash
scoop install soundcheck
```

### Manual Updates

To manually update all packages in this bucket:

```bash
scoop update <bucket-name>
```

## For Repository Maintainers

### Setting Up Automated Updates

To enable automatic manifest updates when you release a new version:

1. **Create a Personal Access Token** in your GitHub account with `repo` scope
2. **Add the token** as a secret named `GITHUB_TOKEN` (or `PAT`) in this bucket repository
3. **Add a workflow** in your source repository that triggers a repository dispatch event

#### Example Workflow for Source Repository

Create a file `.github/workflows/update-scoop.yml` in your source repository:

```yaml
name: Update Scoop Manifest

on:
  release:
    types: [published]

jobs:
  update-scoop:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    
    steps:
      - name: Get release info
        id: release
        run: |
          # Extract information from the release
          REPO_NAME="${{ github.event.repository.name }}"
          VERSION="${{ github.event.release.tag_name }}"
          VERSION="${VERSION#v}"  # Remove 'v' prefix if present
          RELEASE_URL="${{ github.event.release.html_url }}"
          
          # Find the Windows asset (adjust pattern as needed)
          ASSET_URL=$(curl -s "${{ github.event.release.assets_url }}" | \
                     jq -r '.[] | select(.name | contains("windows") and contains("amd64")) | .browser_download_url')
          
          # Download and calculate hash
          curl -L -o asset "$ASSET_URL"
          HASH=$(sha256sum asset | cut -d' ' -f1)
          
          echo "repo_name=$REPO_NAME" >> $GITHUB_OUTPUT
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "release_url=$RELEASE_URL" >> $GITHUB_OUTPUT
          echo "asset_url=$ASSET_URL" >> $GITHUB_OUTPUT
          echo "hash=$HASH" >> $GITHUB_OUTPUT
          
      - name: Trigger bucket update
        run: |
          curl -X POST \
            -H "Authorization: token ${{ secrets.SCOOP_BUCKET_TOKEN }}" \
            -H "Accept: application/vnd.github.everest-preview+json" \
            -H "Content-Type: application/json" \
            https://api.github.com/repos/your-username/scoop-bucket/dispatches \
            -d '{
              "event_type": "release-update",
              "client_payload": {
                "repository": "${{ steps.release.outputs.repo_name }}",
                "version": "${{ steps.release.outputs.version }}",
                "release_url": "${{ steps.release.outputs.release_url }}",
                "asset_url": "${{ steps.release.outputs.asset_url }}",
                "hash": "${{ steps.release.outputs.hash }}"
              }
            }'
```

### Manifest Structure

Each manifest in the `bucket/` directory follows the Scoop manifest format:

```json
{
  "version": "1.0.0",
  "description": "Brief description of the application",
  "homepage": "https://github.com/user/repo",
  "license": "MIT",
  "url": "https://github.com/user/repo/releases/download/v1.0.0/app-1.0.0-windows-amd64.zip",
  "hash": "sha256:abcdef123456...",
  "bin": "app.exe",
  "checkver": {
    "github": "https://github.com/user/repo"
  },
  "autoupdate": {
    "url": "https://github.com/user/repo/releases/download/v$version/app-$version-windows-amd64.zip",
    "hash": {
      "url": "$url.sha256"
    }
  }
}
```

## Scripts

This repository includes several utility scripts:

### `scripts/update-manifest.js`

Updates a manifest file with new release information.

```bash
node scripts/update-manifest.js <manifest-file> <version> <release-url> <asset-url> <hash>
```

### `scripts/validate-manifest.js`

Validates a manifest file against Scoop requirements.

```bash
node scripts/validate-manifest.js <manifest-file>
```

## Workflows

### `validate-manifests.yml`

Runs on every push and pull request to validate all manifest files in the bucket.

### `update-manifest.yml`

Triggered by repository dispatch events from other repositories to automatically update manifests.

## Contributing

1. Fork this repository
2. Create a feature branch
3. Add or update manifests in the `bucket/` directory
4. Ensure all manifests pass validation
5. Submit a pull request

## Requirements for New Manifests

- Must include all required fields: `version`, `homepage`, `license`, `url`, `hash`
- Should follow semantic versioning
- Must provide Windows binaries (either standalone or in archives)
- Should include `checkver` and `autoupdate` for automatic updates

## Support

If you encounter issues with any packages in this bucket:

1. Check the [Issues](https://github.com/your-username/scoop-bucket/issues) page
2. Create a new issue with details about the problem
3. Include the output of `scoop install --verbose <package-name>`

## License

This bucket repository is licensed under the MIT License. Individual package licenses are specified in their respective manifests.