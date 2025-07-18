# Deployment & Release Workflow

This repository uses an automated deployment workflow with two main branches and GitHub Actions for CI/CD.

## 🌳 Branch Structure

### `prod` - Production Branch
- **Purpose**: Stable, production-ready code
- **Auto-deploys**: ✅ Automatically publishes to npm
- **Protection**: Should be protected with PR requirements
- **Triggers**: GitHub Actions release workflow

### `dev` - Development Branch  
- **Purpose**: Active development and testing
- **Auto-versioning**: ✅ Automatically increments patch version on commits
- **Testing**: Runs full test suite on pushes and PRs
- **Integration**: Merge to `prod` when ready for release

## 🚀 Automated Workflows

### 1. Release to npm (`release.yml`)
**Triggers**: Push to `prod` branch

**Actions**:
- ✅ Runs linting and tests
- ✅ Automatically bumps version
- ✅ Commits version bump with `[skip ci]`
- ✅ Creates Git tag
- ✅ Publishes to npm
- ✅ Creates GitHub release

### 2. Auto Version Increment (`auto-version.yml`)
**Triggers**: Push to `dev` branch

**Actions**:
- ✅ Increments patch version in package.json
- ✅ Commits version bump automatically
- ✅ Skips if commit message contains version bump

### 3. Test PR (`test.yml`)
**Triggers**: PRs to `dev` or `prod`, pushes to `dev`

**Actions**:
- ✅ Runs linting
- ✅ Runs tests
- ✅ Verifies package can be built

## ⚙️ Required GitHub Setup

### 1. Secrets Configuration
Go to **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:
```
NPM_TOKEN=your_npm_publishing_token
PAT_TOKEN=your_personal_access_token
```

### 2. npm Token Setup
1. Visit: https://www.npmjs.com/settings/tokens
2. Create a new **Automation** token
3. Copy the token and add to GitHub secrets as `NPM_TOKEN`

### 3. Personal Access Token Setup (Required for Auto-versioning)
1. Visit: https://github.com/settings/tokens
2. Click **Generate new token** → **Generate new token (classic)**
3. Set expiration to **No expiration** (or 1 year)
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Copy the token and add to GitHub secrets as `PAT_TOKEN`

### 4. Branch Protection (Recommended)
Go to **GitHub Repository → Settings → Branches**

**For `prod` branch**:
- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Required status checks: `test`

**For `dev` branch**:
- ✅ Require status checks to pass
- ✅ Required status checks: `test`

### 5. Default Branch
Set `prod` as the default branch:
- Go to **Settings → General → Default branch**
- Change from `main` to `prod`

## 📝 Development Workflow

### For New Features
```bash
# Start from dev
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "feat: add new feature"

# Push and create PR to dev
git push origin feature/your-feature-name
```

### For Releases
```bash
# When dev is ready for release
git checkout prod
git pull origin prod

# Create PR from dev to prod
# Or merge directly if you're the maintainer
git merge dev
git push origin prod

# This triggers automatic:
# 1. Version bump
# 2. npm publish  
# 3. GitHub release
```

## 🔄 Version Management

### Automatic Versioning
- **Dev commits**: Patch version increment (0.0.1 → 0.0.2)
- **Prod releases**: Patch version increment + npm publish

### Manual Versioning
If you need to manually control versions:

```bash
# Minor version bump
npm version minor  # 0.1.0 → 0.2.0

# Major version bump  
npm version major  # 1.0.0 → 2.0.0

# Then commit and push
git push origin dev
```

## 🛠 Local Development

### Setup
```bash
git clone https://github.com/northfacejmb/n8n-workflow-manager.git
cd n8n-workflow-manager
git checkout dev
npm install
```

### Testing
```bash
npm run lint    # Check code style
npm test        # Run tests
npm run lint:fix # Auto-fix linting issues
```

### Building
```bash
npm pack --dry-run  # Check what gets packaged
```

## 🐛 Troubleshooting

### GitHub Actions Failing?
1. **Check npm token**: Ensure `NPM_TOKEN` secret is valid
2. **Check permissions**: Ensure Actions have write permissions
3. **Check linting**: Run `npm run lint` locally first

### Version conflicts?
1. **Reset version**: Manually set version in package.json
2. **Force push**: `git push origin dev --force` (only if needed)
3. **Clean history**: Consider rebasing if commit history is messy

### npm publishing issues?
1. **Check token**: Verify npm token hasn't expired
2. **Check package name**: Ensure name isn't taken
3. **Manual publish**: `npm publish` locally as fallback

## 📚 References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/) 