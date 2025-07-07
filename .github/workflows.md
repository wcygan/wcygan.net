# GitHub Actions Workflows

This repository uses GitHub Actions for continuous integration, deployment, and
maintenance. Below is an overview of all workflows and their purposes.

## Workflows

### 🔄 CI (`ci.yml`)

**Triggers:** Push to `main`, Pull Requests to `main`

**Purpose:** Comprehensive continuous integration pipeline that ensures code
quality and functionality.

**Steps:**

- ✅ Format checking with Prettier
- 🔍 Linting with ESLint
- 🔧 TypeScript type checking
- 🧪 Unit tests with Vitest
- 🏗️ Build verification
- 📦 Artifact upload (main branch only)

### 🚀 Deploy (`deploy.yml`)

**Triggers:** Push to `main`

**Purpose:** Automated deployment to GitHub Pages using SvelteKit's static
adapter.

**Features:**

- 🏗️ Production build
- 📄 GitHub Pages configuration
- 🔒 Secure deployment with proper permissions
- 🚦 Concurrency control to prevent deployment conflicts

### 🔒 Security & Dependencies (`security.yml`)

**Triggers:**

- 📅 Weekly schedule (Mondays at 9 AM UTC)
- Pull Requests to `main`
- Manual trigger

**Purpose:** Security auditing and dependency monitoring.

**Checks:**

- 🛡️ Security vulnerability scanning
- 📊 Dependency audit
- 📈 Outdated package detection

### ⚡ Performance & Lighthouse (`performance.yml`)

**Triggers:**

- Pull Requests to `main`
- Manual trigger

**Purpose:** Performance monitoring and optimization.

**Features:**

- 🏃 Lighthouse CI performance testing
- 📊 Bundle size analysis
- 🎯 Performance threshold enforcement
- 📈 Accessibility and SEO scoring

## Dependabot Configuration

**File:** `.github/dependabot.yml`

**Purpose:** Automated dependency updates to keep the project secure and
up-to-date.

**Features:**

- 📦 Weekly npm dependency updates
- 🔧 GitHub Actions version updates
- 🏷️ Automatic labeling and assignment
- 📝 Consistent commit message formatting

## Performance Thresholds

The Lighthouse CI enforces the following minimum scores:

- **Performance:** 80% (warning)
- **Accessibility:** 90% (error)
- **Best Practices:** 80% (warning)
- **SEO:** 80% (warning)

## Setup Requirements

### GitHub Pages

1. Go to repository Settings → Pages
2. Set Source to "GitHub Actions"
3. The deploy workflow will handle the rest

### Branch Protection (Recommended)

1. Go to repository Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators

### Secrets (If needed)

No secrets are currently required for these workflows, but you can add them in
repository Settings → Secrets and variables → Actions if needed for future
enhancements.

## Workflow Status

You can monitor workflow status in the "Actions" tab of your repository. Each
workflow provides detailed logs and artifact downloads when applicable.

## Local Development

To run the same checks locally:

```bash
# Install dependencies
pnpm install

# Format check
pnpm run format --check

# Lint
pnpm run lint

# Type check
pnpm run check

# Test
pnpm run test

# Build
pnpm run build

# Security audit
pnpm audit
```

## Troubleshooting

### Common Issues

1. **Build failures:** Check that all dependencies are properly installed and
   the build passes locally
2. **Lighthouse failures:** Ensure performance thresholds are met or adjust them
   in `.lighthouserc.json`
3. **Security audit failures:** Update vulnerable dependencies or add exceptions
   if necessary

### Getting Help

- Check workflow logs in the Actions tab
- Review the specific step that failed
- Compare with successful runs to identify changes
- Ensure local development environment matches CI environment
