# CI/CD PIPELINE SETUP - GITHUB ACTIONS

**Automated testing, building, and deployment workflows**

---

## 📋 OVERVIEW

This guide sets up complete CI/CD for:
- ✅ Automated testing on every PR
- ✅ Automated builds for iOS and Android
- ✅ Automated deployment to TestFlight/Internal Testing
- ✅ Production deployment on release tags

---

## PART 1: GITHUB ACTIONS WORKFLOWS

### Workflow 1: Test & Lint (runs on every PR)

**File:** `.github/workflows/test.yml`

```yaml
name: Test & Lint

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run TypeScript check
        run: npx tsc --noEmit
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
      
      - name: Check bundle size
        run: |
          npm run build
          BUNDLE_SIZE=$(du -sh dist | cut -f1)
          echo "Bundle size: $BUNDLE_SIZE"
          if [ $(du -b dist | cut -f1) -gt 52428800 ]; then
            echo "Bundle too large (>50MB)"
            exit 1
          fi

  backend-test:
    name: Backend Tests
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: salesflow_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install pipenv
          pipenv install --dev
      
      - name: Run backend tests
        run: |
          cd backend
          pipenv run pytest --cov=app tests/
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/salesflow_test
      
      - name: Run Alembic migrations
        run: |
          cd backend
          pipenv run alembic upgrade head
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/salesflow_test
```

---

### Workflow 2: EAS Build (runs on release)

**File:** `.github/workflows/eas-build.yml`

```yaml
name: EAS Build

on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to build'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - ios
          - android
      profile:
        description: 'Build profile'
        required: true
        default: 'preview'
        type: choice
        options:
          - development
          - preview
          - production

jobs:
  build:
    name: EAS Build
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for iOS
        if: ${{ github.event.inputs.platform == 'ios' || github.event.inputs.platform == 'all' }}
        run: eas build --platform ios --profile ${{ github.event.inputs.profile }} --non-interactive
      
      - name: Build for Android
        if: ${{ github.event.inputs.platform == 'android' || github.event.inputs.platform == 'all' }}
        run: eas build --platform android --profile ${{ github.event.inputs.profile }} --non-interactive
      
      - name: Submit to TestFlight
        if: ${{ github.event.inputs.profile == 'production' && github.event.inputs.platform == 'ios' }}
        run: eas submit --platform ios --latest --non-interactive
      
      - name: Submit to Play Store Internal Testing
        if: ${{ github.event.inputs.profile == 'production' && github.event.inputs.platform == 'android' }}
        run: eas submit --platform android --latest --track internal --non-interactive
```

---

### Workflow 3: E2E Tests (Detox)

**File:** `.github/workflows/e2e.yml`

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  e2e-ios:
    name: E2E Tests (iOS)
    runs-on: macos-13
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Detox
        run: |
          brew tap wix/brew
          brew install applesimutils
          npm install -g detox-cli
      
      - name: Build app for testing
        run: detox build --configuration ios.sim.debug
      
      - name: Run E2E tests
        run: detox test --configuration ios.sim.debug --cleanup
      
      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: detox-artifacts
          path: artifacts/

  e2e-android:
    name: E2E Tests (Android)
    runs-on: macos-13
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Build app for testing
        run: detox build --configuration android.emu.debug
      
      - name: Run E2E tests
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          script: detox test --configuration android.emu.debug
      
      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: detox-artifacts
          path: artifacts/
```

---

### Workflow 4: Deploy Backend

**File:** `.github/workflows/deploy-backend.yml`

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install pipenv
          pipenv install
      
      - name: Run database migrations
        run: |
          cd backend
          pipenv run alembic upgrade head
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      
      - name: Deploy to Railway (or your platform)
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: salesflow-api
      
      # Alternative: Deploy to Heroku
      # - name: Deploy to Heroku
      #   uses: akhileshns/heroku-deploy@v3.12.14
      #   with:
      #     heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
      #     heroku_app_name: "salesflow-api"
      #     heroku_email: "your@email.com"
      #     appdir: "backend"
      
      # Alternative: Deploy to AWS
      # - name: Deploy to AWS Elastic Beanstalk
      #   uses: einaregilsson/beanstalk-deploy@v21
      #   with:
      #     aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
      #     aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      #     application_name: salesflow-api
      #     environment_name: salesflow-prod
      #     version_label: ${{ github.sha }}
      #     region: us-east-1
      #     deployment_package: backend.zip
```

---

### Workflow 5: Security Scan

**File:** `.github/workflows/security.yml`

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: Run npm audit
        run: npm audit --audit-level=high
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

---

## PART 2: EAS BUILD CONFIGURATION

### eas.json

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true,
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD1234"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## PART 3: SECRETS CONFIGURATION

### Required GitHub Secrets

Add these in: **Repository Settings → Secrets and variables → Actions**

**Expo & EAS:**
```
EXPO_TOKEN=your_expo_access_token
```

**Backend Deployment:**
```
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/salesflow
RAILWAY_TOKEN=your_railway_token (if using Railway)
HEROKU_API_KEY=your_heroku_key (if using Heroku)
AWS_ACCESS_KEY_ID=your_aws_key (if using AWS)
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

**Security Scanning:**
```
SNYK_TOKEN=your_snyk_token
CODECOV_TOKEN=your_codecov_token
```

**iOS Submission:**
```
APPLE_ID=your_apple_id
APPLE_APP_SPECIFIC_PASSWORD=your_app_password
```

**Android Submission:**
```
GOOGLE_PLAY_SERVICE_ACCOUNT_KEY=base64_encoded_json
```

---

## PART 4: LOCAL SETUP

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Generate Service Account Keys

**iOS:**
1. Go to App Store Connect
2. Users and Access → Keys
3. Generate new key with App Manager role
4. Download `.p8` file

**Android:**
1. Go to Google Play Console
2. Setup → API access
3. Create new service account
4. Grant permissions
5. Download JSON key

---

## PART 5: BUILD PROFILES EXPLAINED

### Development Build
- For local testing with Expo Go
- Includes development tools
- No code signing required

**Usage:**
```bash
eas build --profile development --platform ios
```

### Preview Build
- For internal testing (TestFlight/Internal Testing)
- Optimized but not production
- Can be distributed via QR code

**Usage:**
```bash
eas build --profile preview --platform all
```

### Production Build
- For App Store/Google Play submission
- Fully optimized
- Requires code signing

**Usage:**
```bash
eas build --profile production --platform all
eas submit --platform all --latest
```

---

## PART 6: MONITORING & ALERTS

### Setup Slack Notifications

Add to any workflow:

```yaml
      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "Build failed: ${{ github.workflow }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "❌ *Build Failed*\n*Workflow:* ${{ github.workflow }}\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Setup Email Notifications

GitHub sends emails automatically for:
- Failed workflows
- Security vulnerabilities
- Dependabot alerts

Configure in: **Settings → Notifications**

---

## PART 7: DEPLOYMENT CHECKLIST

### Before Every Deployment

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Bundle size acceptable (<50MB)
- [ ] Environment variables set
- [ ] Database migrations tested
- [ ] Backend deployed first
- [ ] App version incremented

### iOS Deployment Steps

```bash
# 1. Build
eas build --profile production --platform ios

# 2. Wait for build to complete (~15-30 min)

# 3. Submit to TestFlight (internal testing)
eas submit --platform ios --latest

# 4. Test in TestFlight

# 5. Submit for App Store review
# (Do this manually in App Store Connect)
```

### Android Deployment Steps

```bash
# 1. Build
eas build --profile production --platform android

# 2. Wait for build to complete (~15-30 min)

# 3. Submit to Internal Testing
eas submit --platform android --latest --track internal

# 4. Test internal release

# 5. Promote to production
# (Do this in Google Play Console)
```

---

## PART 8: ROLLBACK STRATEGY

### Frontend Rollback

```bash
# Rollback to previous version in App Store Connect
# or Google Play Console

# Re-deploy previous build
eas build --profile production --platform all
```

### Backend Rollback

```bash
# Rollback database migration
cd backend
alembic downgrade -1

# Redeploy previous version
git checkout <previous-commit>
git push production main
```

---

## TROUBLESHOOTING

### Build Fails

**Error:** "Bundle size too large"
**Solution:** 
```bash
# Analyze bundle
npx react-native-bundle-visualizer

# Remove unused dependencies
npm prune

# Optimize images
```

**Error:** "Code signing failed"
**Solution:**
- Check provisioning profiles in App Store Connect
- Regenerate certificates if needed
- Run `eas credentials` to reset

### Tests Fail

**Error:** "Cannot connect to database"
**Solution:**
- Check DATABASE_URL secret
- Ensure PostgreSQL service is healthy
- Verify migrations are up to date

**Error:** "Detox tests timeout"
**Solution:**
- Increase timeout in .detoxrc.js
- Check simulator is running
- Clear Detox cache: `detox clean-framework-cache`

---

## CONCLUSION

This CI/CD setup provides:
- ✅ Automated testing on every commit
- ✅ Automated builds for releases
- ✅ One-command deployment
- ✅ Security scanning
- ✅ Monitoring & alerts

**Next Steps:**
1. Add all secrets to GitHub
2. Run test workflow
3. Test preview build
4. Deploy to production

**Resources:**
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- GitHub Actions: https://docs.github.com/en/actions
- Detox: https://wix.github.io/Detox/
