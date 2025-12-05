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
scoop bucket add isfopo https://github.com/isfopo/scoop-bucket
```

## Usage

### Installing Packages

Once the bucket is added, you can install packages:

```bash
scoop install <package-name>
```

### Available Packages

This bucket currently includes the following packages:

#### soundcheck

- **Description**: Audio testing and validation tool
- **Current Version**: 0.0.34
- **Installation**: `scoop install soundcheck`
- **Repository**: https://github.com/isfopo/soundcheck

For example:

```bash
scoop install soundcheck
```

### Manual Updates

To manually update all packages in this bucket:

```bash
scoop update isfopo
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
        description: "Release tag (e.g., v1.0.0)"
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
              "event_type": "scoop-release",
              "client_payload": {
                "owner": "${{ github.repository_owner }}",
                "repo": "${{ github.event.repository.name }}",
                "version": "${{ github.event.inputs.tag_name || github.event.release.tag_name }}"
              }
            }'
```

**How it works:**

1. **Automatic Trigger**: When a new release is published, the workflow automatically triggers
2. **Manual Trigger**: You can also manually trigger the workflow and specify a tag
3. **Simplified Payload**: Only sends owner, repo, and version - the bucket fetches release details automatically
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
   - **Owner**: Repository owner (e.g., `myorg`)
   - **Repository**: Repository name (e.g., `soundcheck`)
   - **Version**: Version number (e.g., `1.0.0`)

The workflow will update the manifest and commit changes directly to the main branch.

### Manifest Structure

Each manifest in the `bucket/` directory follows the Scoop manifest format. Here's an example from the current `soundcheck` package (version 0.0.34):

```json
{
  "version": "0.0.34",
  "description": "Soundcheck - Audio testing and validation tool",
  "homepage": "https://github.com/isfopo/soundcheck",
  "license": "MIT",
  "url": "https://github.com/isfopo/soundcheck/releases/download/0.0.34/soundcheck-x86_64-pc-windows-msvc.zip",
  "hash": "a5947844838708509fd15255625b0009d97c252cd01504cb7873eb5224186fbf",
  "bin": "soundcheck.exe",
  "checkver": {
    "github": "https://github.com/isfopo/soundcheck"
  },
  "autoupdate": {
    "url": "https://github.com/isfopo/soundcheck/releases/download/0.0.34/soundcheck-x86_64-pc-windows-msvc.zip",
    "hash": {
      "url": "https://github.com/isfopo/soundcheck/releases/download/0.0.34/soundcheck-x86_64-pc-windows-msvc.zip.sha256"
    }
  }
}
```

**General manifest format:**

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

## Troubleshooting

### Common Issues

**Manifest validation fails:**

- Ensure all required fields are present: `version`, `homepage`, `license`, `url`, `hash`
- Check that the URL is accessible and points to a Windows binary
- Verify the SHA256 hash is correct (64 hexadecimal characters)

**Automatic updates not working:**

- Ensure the source repository workflow is triggering the correct `scoop-release` event
- Check that the `SCOOP_BUCKET_TOKEN` has the correct permissions
- Verify the manifest file exists in the `bucket/` directory

**Package installation fails:**

- Run `scoop install --verbose <package-name>` to see detailed error messages
- Check if the download URL is accessible
- Verify the binary name matches the `bin` field in the manifest

## Support

If you encounter issues with any packages in this bucket:

1. Check the [Issues](https://github.com/isfopo/scoop-bucket/issues) page
2. Create a new issue with details about the problem
3. Include the output of `scoop install --verbose <package-name>`
4. For package-specific issues, also check the upstream repository

## License

This bucket repository is licensed under the MIT License. Individual package licenses are specified in their respective manifests.
