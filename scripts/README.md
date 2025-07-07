# Scripts Directory

This directory contains automation scripts for the wcygan.github.io project.

## Resume Download Script

### Overview

Automatically download the latest resume PDF from the GitHub repository and save
it locally, replacing the existing file if it exists.

### Quick Start

```bash
# Download resume to default location (static/will_cygan_resume.pdf)
deno run --allow-read --allow-write --allow-net scripts/download-resume.ts

# Download with verbose output
deno run --allow-read --allow-write --allow-net scripts/download-resume.ts --verbose

# Download to custom location
deno run --allow-read --allow-write --allow-net scripts/download-resume.ts --output docs/resume.pdf

# Dry run (check what would be downloaded)
deno run --allow-read --allow-write --allow-net scripts/download-resume.ts --dry-run
```

### Features

- ✅ **Automatic Download**: Fetches latest resume from GitHub repository
- 📊 **Size Comparison**: Shows file size differences between old and new
  versions
- 🔍 **URL Validation**: Checks accessibility before downloading
- 📁 **Directory Creation**: Automatically creates output directories if needed
- 🔄 **File Replacement**: Safely replaces existing files
- 📋 **Verbose Logging**: Detailed output with file sizes and headers
- 🧪 **Dry Run Mode**: Preview downloads without actually downloading

### Source

Downloads from:
`https://github.com/wcygan/resume/raw/main/will_cygan_resume.pdf`

## GitHub Actions Integration Testing

### Overview

Test GitHub Actions workflows locally using `act` before pushing to GitHub. This
helps catch issues early and speeds up development.

### Quick Start

1. **Install Prerequisites**:

   ```bash
   # macOS
   brew install act docker

   # Windows
   choco install act-cli docker-desktop
   ```

2. **Check Prerequisites**:

   ```bash
   deno run --allow-all scripts/test-github-actions.ts --dry-run
   ```

3. **Run Quick Test** (CI workflow only):

   ```bash
   deno run --allow-all scripts/quick-test.ts
   ```

4. **Run Full Test Suite**:
   ```bash
   deno run --allow-all scripts/test-github-actions.ts
   ```

### Available Scripts

| Script                   | Purpose                     | Usage                                                                        |
| ------------------------ | --------------------------- | ---------------------------------------------------------------------------- |
| `test-github-actions.ts` | Full integration test suite | `deno run --allow-all scripts/test-github-actions.ts`                        |
| `quick-test.ts`          | Quick CI workflow test      | `deno run --allow-all scripts/quick-test.ts`                                 |
| `download-resume.ts`     | Download latest resume PDF  | `deno run --allow-read --allow-write --allow-net scripts/download-resume.ts` |
| `new-post.js`            | Create new blog post        | `npm run post`                                                               |

### GitHub Actions Integration Test Features

- ✅ **Prerequisites Check**: Validates Docker and act installation
- 🧪 **Workflow Testing**: Tests CI, security, and performance workflows
- 📊 **Detailed Reporting**: Shows pass/fail status with timing
- 🔍 **Verbose Mode**: Detailed output for debugging
- ⚡ **Quick Mode**: Fast CI-only testing
- 🎯 **Selective Testing**: Test individual workflows

### Command Examples

```bash
# Test all workflows
deno run --allow-all scripts/test-github-actions.ts

# Test only CI workflow
deno run --allow-all scripts/test-github-actions.ts --workflow ci

# Verbose output for debugging
deno run --allow-all scripts/test-github-actions.ts --verbose

# Quick CI test
deno run --allow-all scripts/quick-test.ts

# Check prerequisites only
deno run --allow-all scripts/test-github-actions.ts --dry-run
```

### VS Code Integration

Use Command Palette (`Ctrl+Shift+P`) → "Tasks: Run Task":

- **Test GitHub Actions (All)** - Run all workflow tests
- **Test GitHub Actions (CI Only)** - Test CI workflow only
- **Test GitHub Actions (Verbose)** - Run with detailed output
- **Check GitHub Actions Prerequisites** - Verify setup

### Workflow Coverage

| Workflow        | Local Testing   | Description                                |
| --------------- | --------------- | ------------------------------------------ |
| **CI**          | ✅ Full support | Format, lint, type check, test, build      |
| **Security**    | ✅ Full support | Security audit and dependency check        |
| **Performance** | ✅ Full support | Lighthouse and bundle analysis             |
| **Deploy**      | ⏭️ Skipped      | GitHub Pages deployment (requires secrets) |

### Configuration Files

- **`.actrc`** - Act configuration for optimized local testing
- **`.vscode/tasks.json`** - VS Code tasks for easy access
- **`docs/github-actions-testing.md`** - Comprehensive documentation

### Troubleshooting

#### Common Issues

1. **Docker not running**: Start Docker Desktop
2. **Act not installed**: Install via package manager
3. **Permission errors**: Check Docker permissions
4. **Timeout errors**: Increase Docker resources

#### Getting Help

```bash
# Show help
deno run --allow-all scripts/test-github-actions.ts --help

# Verbose output for debugging
deno run --allow-all scripts/test-github-actions.ts --verbose

# Check prerequisites
deno run --allow-all scripts/test-github-actions.ts --dry-run
```

### Best Practices

1. **Test Before Push**: Always run tests before pushing changes
2. **Focus on CI**: The CI workflow is most critical to test
3. **Use Quick Test**: For rapid feedback during development
4. **Debug with Verbose**: Use verbose mode when troubleshooting
5. **Keep Tools Updated**: Regularly update Docker and act

### Resources

- 📖 [Full Documentation](../docs/github-actions-testing.md)
- 🐳 [Docker Installation](https://docs.docker.com/get-docker/)
- 🎭 [Act Documentation](https://github.com/nektos/act)
- 🦕 [Deno Installation](https://deno.land/manual/getting_started/installation)

---

**Note**: These scripts require Deno and use the `--allow-all` flag for full
system access needed to run Docker and act commands.
