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
  workflow_dispatch:
    inputs:
      tag_name:
        description: 'Release tag (e.g., v1.0.0)'
        required: true
        type: string

jobs:
  trigger-scoop:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger bucket update
        run: |
          curl -X POST \
            -H "Authorization: token ${{ secrets.SCOOP_BUCKET_TOKEN }}" \
            -H "Accept: application/vnd.github.everest-preview+json" \
            -H "Content-Type: application/json" \
            https://api.github.com/repos/isfopo/scoop-bucket/dispatches \
            -d '{
              "event_type": "release-update",
              "client_payload": {
                "version": "${{ github.event.inputs.tag_name || github.event.release.tag_name }}",
                "repo": "${{ github.repository }}",
                "run_id": "${{ github.run_id }}"
              }
            }'
```

**How it works:**

1. **Automatic Trigger**: When a new release is published, the workflow automatically triggers
2. **Manual Trigger**: You can also manually trigger the workflow and specify a tag
3. **Simplified Payload**: Only sends version, repo, and run_id - the bucket fetches release details automatically
4. **Asset Detection**: The bucket automatically finds the Windows amd64 asset and calculates its hash
5. **Direct Commits**: Changes are committed directly to the main branch (no pull requests)

**Required Secrets:**

- `SCOOP_BUCKET_TOKEN`: A Personal Access Token with `repo` scope that can trigger dispatch events in the scoop-bucket repository

#### Manual Updates

You can also trigger updates directly in the scoop-bucket repository:

1. Go to the **Actions** tab in the scoop-bucket repository
2. Select the **Release** workflow
3. Click **Run workflow**
4. Fill in the required parameters:
   - **Repository path**: `owner/repo` (e.g., `myorg/soundcheck`)
   - **Version**: Version number (e.g., `1.0.0`)
   - **Run ID**: Optional GitHub Actions run ID for tracking

The workflow will update the manifest and commit changes directly to the main branch.

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

Updates a manifest file with new release information by fetching data from GitHub API.

```bash
node scripts/update-manifest.js <manifest-file> <repo> <version> <run-id>
```

**Arguments:**
- `manifest-file`: Path to the JSON manifest file
- `repo`: Full repository path (owner/repo)
- `version`: New version to update
- `run-id`: GitHub Actions run ID that triggered the update

The script automatically:
- Fetches release information from GitHub API
- Finds the Windows amd64 asset
- Downloads the asset and calculates SHA256 hash
- Updates the manifest with new version, URL, and hash
- Configures autoupdate templates for future releases

### `scripts/validate-manifest.js`

Validates a manifest file against Scoop requirements.

```bash
node scripts/validate-manifest.js <manifest-file>
```

## Workflows

### `release.yml`

Unified workflow that handles both automatic and manual manifest updates:

- **Repository Dispatch**: Triggered by other repositories when they publish releases
- **Manual Dispatch**: Can be run manually from the Actions tab with custom parameters
- **Validation**: Automatically validates updated manifests before committing changes
- **Direct Commits**: Commits and pushes changes directly to main branch (no PRs)

### `validate-manifests.yml`

Runs on every push and pull request to validate all manifest files in the bucket.

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