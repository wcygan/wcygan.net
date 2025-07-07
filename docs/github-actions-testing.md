# GitHub Actions Integration Testing

This document explains how to test GitHub Actions workflows locally using `act`
before pushing to GitHub.

## Overview

The integration testing setup allows you to:

- Test workflows locally without pushing to GitHub
- Validate workflow syntax and logic
- Debug workflow issues faster
- Ensure workflows work before creating pull requests

## Prerequisites

### Required Tools

1. **Docker** - Required by act to run workflows in containers

   - [Install Docker](https://docs.docker.com/get-docker/)
   - Ensure Docker daemon is running

2. **Act** - Tool for running GitHub Actions locally

   - **macOS**: `brew install act`
   - **Windows**: `choco install act-cli`
   - **Linux**:
     `curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash`

3. **Deno** - For running the test script
   - [Install Deno](https://deno.land/manual/getting_started/installation)

### Verification

Check that all prerequisites are installed:

```bash
deno run --allow-all scripts/test-github-actions.ts --dry-run
```

## Usage

### Basic Usage

Test all workflows:

```bash
deno run --allow-all scripts/test-github-actions.ts
```

Test specific workflow:

```bash
deno run --allow-all scripts/test-github-actions.ts --workflow ci
```

Verbose output for debugging:

```bash
deno run --allow-all scripts/test-github-actions.ts --verbose
```

### VS Code Integration

Use the Command Palette (`Ctrl+Shift+P`) and run:

- **"Tasks: Run Task"** → **"Test GitHub Actions (All)"**
- **"Tasks: Run Task"** → **"Test GitHub Actions (CI Only)"**
- **"Tasks: Run Task"** → **"Test GitHub Actions (Verbose)"**
- **"Tasks: Run Task"** → **"Check GitHub Actions Prerequisites"**

## Available Workflows

| Workflow      | Description                                                    | Local Testing                        |
| ------------- | -------------------------------------------------------------- | ------------------------------------ |
| `ci`          | Continuous Integration (format, lint, type check, test, build) | ✅ Full support                      |
| `security`    | Security audit and dependency check                            | ✅ Full support                      |
| `performance` | Performance testing and bundle analysis                        | ✅ Full support                      |
| `deploy`      | Deploy to GitHub Pages                                         | ⏭️ Skipped (requires GitHub secrets) |

## Configuration

### Act Configuration (`.actrc`)

The `.actrc` file configures act with optimized settings:

- Uses smaller Docker images for faster testing
- Sets artifact server path
- Configures quiet mode by default
- Sets container architecture

### Workflow Event Simulation

| Workflow    | Simulated Event | Act Command                                                      |
| ----------- | --------------- | ---------------------------------------------------------------- |
| CI          | `push`          | `act push --workflows .github/workflows/ci.yml`                  |
| Security    | `pull_request`  | `act pull_request --workflows .github/workflows/security.yml`    |
| Performance | `pull_request`  | `act pull_request --workflows .github/workflows/performance.yml` |
| Deploy      | `push`          | Skipped locally                                                  |

## Understanding Test Results

### Success Output

```
🧪 Testing ci workflow...
✅ ci workflow passed (45s)

📊 Test Summary
================
Total: 3 | Passed: 3 | Failed: 0
Total time: 120s

✅ PASS ci          (45s)
✅ PASS security    (35s)
✅ PASS performance (40s)

✅ All tests passed!
```

### Failure Output

```
🧪 Testing ci workflow...
❌ ci workflow failed (30s)
Error output:
[Error details from the last 10 lines of output]

📊 Test Summary
================
Total: 1 | Passed: 0 | Failed: 1
Total time: 30s

❌ FAIL ci          (30s)

❌ Some tests failed. Check the output above for details.
```

## Troubleshooting

### Common Issues

#### Docker Not Running

```
❌ Docker daemon: Failed
```

**Solution**: Start Docker Desktop or Docker daemon

#### Act Not Installed

```
❌ Act: Not found
```

**Solution**: Install act using the appropriate package manager for your OS

#### Workflow Timeout

```
❌ ci workflow failed with error: Command timed out
```

**Solution**:

- Check Docker resources (CPU/Memory)
- Run with `--verbose` to see where it's hanging
- Increase timeout in the script if needed

#### Permission Errors

```
Error: Permission denied
```

**Solution**: Ensure Docker has proper permissions and is running

### Debugging Tips

1. **Use Verbose Mode**: Add `--verbose` to see detailed output
2. **Test Individual Workflows**: Use `--workflow <name>` to isolate issues
3. **Check Docker Resources**: Ensure Docker has enough CPU/Memory allocated
4. **Review Act Logs**: Act provides detailed logs about what's happening

### Performance Optimization

1. **Docker Image Caching**: Act will cache Docker images after first run
2. **Dependency Caching**: pnpm cache is preserved between runs
3. **Parallel Testing**: Currently runs sequentially for stability

## Limitations

### What Works Locally

- ✅ Code formatting and linting
- ✅ TypeScript type checking
- ✅ Unit tests
- ✅ Build process
- ✅ Security audits
- ✅ Bundle analysis

### What Doesn't Work Locally

- ❌ GitHub Pages deployment (requires GitHub secrets)
- ❌ GitHub-specific features (GitHub token, repository context)
- ❌ External service integrations that require specific credentials

### Differences from GitHub

1. **Environment**: Local Docker vs GitHub's Ubuntu runners
2. **Network**: Local network vs GitHub's network
3. **Secrets**: No access to GitHub secrets locally
4. **Performance**: May be slower/faster depending on local machine

## Advanced Usage

### Custom Act Commands

Run act directly for more control:

```bash
# Test specific workflow with custom options
act push --workflows .github/workflows/ci.yml --platform ubuntu-latest=catthehacker/ubuntu:act-latest

# List available workflows
act --list

# Dry run to see what would be executed
act --dry-run

# Use specific Docker image
act --platform ubuntu-latest=ubuntu:20.04
```

### Environment Variables

Set environment variables for testing:

```bash
# Set environment variables
act --env CUSTOM_VAR=value

# Use environment file
act --env-file .env.test
```

### Secrets (if needed)

For workflows that require secrets:

```bash
# Set secrets via command line
act --secret GITHUB_TOKEN=your_token

# Use secrets file
act --secret-file .secrets
```

## Integration with CI/CD

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running GitHub Actions tests..."
deno run --allow-all scripts/test-github-actions.ts --workflow ci
if [ $? -ne 0 ]; then
    echo "GitHub Actions tests failed. Commit aborted."
    exit 1
fi
```

### Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Best Practices

1. **Test Before Push**: Always run integration tests before pushing
2. **Focus on CI**: The CI workflow is the most important to test locally
3. **Use Verbose Mode**: When debugging, always use verbose output
4. **Keep Docker Updated**: Ensure Docker and act are up to date
5. **Monitor Resources**: Watch Docker resource usage during tests

## Contributing

When adding new workflows:

1. Add the workflow configuration to `WORKFLOWS` array in the test script
2. Test the new workflow locally
3. Update this documentation
4. Add appropriate VS Code tasks if needed

## Resources

- [Act Documentation](https://github.com/nektos/act)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Deno Documentation](https://deno.land/manual)
