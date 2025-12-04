# APP STORE & GOOGLE PLAY SUBMISSION GUIDE

**Complete checklists for iOS and Android deployment + Environment Setup + Security Audit**

---

## 📱 PART 1: APP STORE SUBMISSION (iOS)

### Prerequisites

**Required Accounts:**
- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect access
- [ ] Xcode installed (Mac required)

### Step 1: Prepare App Assets

**App Icons (all required):**
- [ ] 1024x1024 px (App Store)
- [ ] 180x180 px (iPhone)
- [ ] 120x120 px (iPhone)
- [ ] 167x167 px (iPad Pro)
- [ ] 152x152 px (iPad)
- [ ] 76x76 px (iPad)

**Screenshots (all device sizes):**
- [ ] iPhone 6.7" (1290 x 2796) - 3 minimum
- [ ] iPhone 6.5" (1242 x 2688) - 3 minimum
- [ ] iPhone 5.5" (1242 x 2208) - 3 minimum
- [ ] iPad Pro 12.9" (2048 x 2732) - 3 minimum

**Preview Video (optional but recommended):**
- [ ] Max 30 seconds
- [ ] Portrait or landscape
- [ ] H.264 or HEVC codec

### Step 2: App Information

**Basic Info:**
- [ ] App Name (max 30 characters)
- [ ] Subtitle (max 30 characters)
- [ ] Bundle ID (e.g., com.company.salesflow)
- [ ] SKU (internal ID)
- [ ] Primary Language

**Description:**
```
Title: SalesFlow AI - MLM Growth Platform

Subtitle: AI-Powered Team & Lead Management

Description (max 4000 chars):
Transform your MLM business with SalesFlow AI - the intelligent platform 
designed for network marketers. Manage leads, track team performance, and 
grow your downline with AI-powered insights.

KEY FEATURES:
• Smart Lead Management - Track and prioritize your contacts with AI scoring
• Team Analytics - Monitor your downline's performance in real-time
• AI Coach - Get personalized recommendations for every lead
• Message Templates - Send professional messages with one tap
• Calendar Integration - Never miss a follow-up
• Offline Mode - Work anywhere, sync when online

PERFECT FOR:
✓ Network Marketers
✓ MLM Distributors
✓ Direct Sales Professionals
✓ Team Leaders

BOOST YOUR RESULTS:
- Increase conversion rates with AI-driven insights
- Save hours with automated follow-ups
- Build stronger teams with better coaching
- Stay organized with integrated tools

Privacy Policy: https://your-domain.com/privacy
Terms of Service: https://your-domain.com/terms
```

**Keywords (max 100 characters):**
```
MLM, network marketing, lead management, sales CRM, team tracking, AI coach, downline
```

**Category:**
- Primary: Business
- Secondary: Productivity

**Age Rating:**
- [ ] 4+ (no objectionable content)

### Step 3: Pricing & Availability

**Pricing Model:**
- [ ] Free (with in-app purchases)
- [ ] Paid ($X.XX)
- [ ] Subscription

**In-App Purchases (if applicable):**
```
1. Pro Monthly - $9.99/month
   - Unlimited leads
   - Advanced analytics
   - Priority support

2. Pro Annual - $99.99/year (save 16%)
   - All Pro Monthly features
   - Annual billing

3. Team Plan - $29.99/month
   - Up to 10 team members
   - Team analytics dashboard
   - Admin controls
```

**Availability:**
- [ ] All countries (recommended)
- [ ] Or select specific countries

### Step 4: App Privacy

**Privacy Policy URL:**
- [ ] https://your-domain.com/privacy

**Data Collection (be honest!):**

**Data Linked to User:**
- [ ] Contact Info (name, email, phone)
- [ ] User Content (messages, notes)
- [ ] Usage Data (analytics)
- [ ] Identifiers (user ID)

**Data Not Linked to User:**
- [ ] Diagnostics (crash reports)

**Data Used for Tracking:**
- [ ] None (if using only first-party analytics)

**Third-Party SDKs to Declare:**
- [ ] Expo
- [ ] Sentry (if using)
- [ ] Google Analytics (if using)

### Step 5: App Review Information

**Contact Information:**
- [ ] First Name
- [ ] Last Name
- [ ] Phone Number
- [ ] Email Address

**Demo Account (REQUIRED for review):**
```
Username: reviewer@test.com
Password: ReviewPass123!

Notes for reviewer:
- This is a test account with sample data
- All features are unlocked
- Network connectivity required for some features
```

**Notes:**
```
This app requires an account to use. A demo account is provided above.

The app uses OpenAI API for AI coaching features. No offensive content is generated.

Push notifications are used for reminders and team updates only.

The app works offline - data syncs when connectivity is restored.
```

### Step 6: Build Upload

**Using EAS:**
```bash
# Update version in app.json
{
  "version": "1.0.0",
  "ios": {
    "buildNumber": "1"
  }
}

# Build for production
eas build --profile production --platform ios

# Submit to App Store Connect
eas submit --platform ios --latest
```

**Manual Upload (if needed):**
1. Open Xcode
2. Archive the app
3. Upload to App Store Connect
4. Wait for processing (~10-30 minutes)

### Step 7: Submit for Review

**Before Submitting:**
- [ ] All info filled out
- [ ] Screenshots uploaded
- [ ] Build selected
- [ ] Privacy info complete
- [ ] Demo account tested
- [ ] App tested on real device

**Review Times:**
- Initial review: 24-48 hours typically
- Updates: 24 hours typically

**Common Rejection Reasons:**
1. ❌ Missing demo account
2. ❌ Crashes on launch
3. ❌ Incomplete app info
4. ❌ Privacy policy issues
5. ❌ In-app purchase not working

**If Rejected:**
- Read rejection reason carefully
- Fix the issue
- Reply in Resolution Center
- Resubmit

---

## 🤖 PART 2: GOOGLE PLAY SUBMISSION (Android)

### Prerequisites

**Required Accounts:**
- [ ] Google Play Console ($25 one-time)
- [ ] Google account

### Step 1: Create App

**In Play Console:**
1. Create app
2. Select "App" (not Game)
3. Choose "Free" or "Paid"
4. Fill in app name

### Step 2: Store Listing

**App Details:**
- [ ] App name (max 50 characters)
- [ ] Short description (max 80 characters)
- [ ] Full description (max 4000 characters)

**Example:**
```
App Name: SalesFlow AI

Short Description:
AI-powered MLM & network marketing platform. Manage leads, track team, grow faster.

Full Description:
(Same as iOS but can be longer)
```

**Graphics:**

**App Icon:**
- [ ] 512 x 512 px (PNG, 32-bit, no transparency)

**Feature Graphic:**
- [ ] 1024 x 500 px (JPG or PNG, no transparency)

**Phone Screenshots:**
- [ ] Minimum 2, maximum 8
- [ ] 16:9 or 9:16 aspect ratio
- [ ] Min dimension: 320px
- [ ] Max dimension: 3840px

**7-inch Tablet Screenshots (optional):**
- [ ] Same requirements as phone

**10-inch Tablet Screenshots (optional):**
- [ ] Same requirements as phone

**Promo Video (optional):**
- [ ] YouTube URL

**Categorization:**
- Primary: Business
- Tags: Add relevant tags

### Step 3: Content Rating

**Complete Questionnaire:**
- [ ] No violence
- [ ] No sexual content
- [ ] No bad language
- [ ] No drug/alcohol references
- [ ] No gambling
- [ ] Shares user location: YES
- [ ] Allows user communication: YES

**Expected Rating:** Everyone or Teen

### Step 4: App Content

**Privacy Policy:**
- [ ] URL: https://your-domain.com/privacy

**Data Safety:**

**Location:**
- [ ] Approximate location collected
- [ ] Used for app functionality
- [ ] Optional (user can decline)

**Personal Info:**
- [ ] Name, email collected
- [ ] Used for account functionality
- [ ] Required for app to work

**Messages:**
- [ ] User messages stored
- [ ] Used for app functionality

**All Data:**
- [ ] Encrypted in transit
- [ ] Can be deleted on request
- [ ] Committed to Google Play Families Policy

### Step 5: Target Audience & Content

**Target Age:**
- [ ] 18+ (business app)

**App Access:**
- [ ] All or most functionality available without restrictions
- [ ] Or: Provide instructions for restricted content

**Ads:**
- [ ] No ads (recommended for Pro app)
- [ ] Or: Contains ads

### Step 6: Upload APK/AAB

**Using EAS:**
```bash
# Update version in app.json
{
  "version": "1.0.0",
  "android": {
    "versionCode": 1
  }
}

# Build for production
eas build --profile production --platform android

# Submit to Play Store
eas submit --platform android --latest --track internal
```

**Manual Upload:**
1. Go to Release → Production
2. Create new release
3. Upload AAB file
4. Add release notes

### Step 7: Release Tracks

**Internal Testing (recommended first):**
- For your team only
- Up to 100 testers
- Fast review (few hours)

**Closed Testing:**
- Up to 10,000 testers
- Use for beta testing
- Review required

**Open Testing:**
- Anyone can join
- Good for public beta

**Production:**
- Full public release
- Longer review (1-7 days typically)

### Step 8: Release Notes

**Version 1.0.0:**
```
🎉 Welcome to SalesFlow AI!

Transform your MLM business with:
• Smart lead management with AI scoring
• Real-time team analytics
• AI-powered coaching for every lead
• One-tap message templates
• Offline mode - work anywhere

Get started today and grow your network faster!
```

### Step 9: Submit for Review

**Before Submitting:**
- [ ] All store listing complete
- [ ] APK/AAB uploaded
- [ ] Content rating completed
- [ ] Data safety filled
- [ ] App tested on real device
- [ ] Privacy policy live

**Review Times:**
- Internal: Few hours
- Production: 1-7 days
- Updates: 1-2 days typically

---

## 🔐 PART 3: ENVIRONMENT CONFIGURATION

### Development Environment

**File:** `.env.development`
```bash
# API
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_API_TIMEOUT=10000
EXPO_PUBLIC_USE_MOCK_API=true

# Database (Backend)
DATABASE_URL=postgresql://postgres:password@localhost:5432/salesflow_dev

# OpenAI
OPENAI_API_KEY=sk-test-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=development
SENTRY_ENABLED=false

# Feature Flags
FEATURE_AI_COACH=true
FEATURE_VOICE_NOTES=true
FEATURE_GEOLOCATION=true

# Logging
LOG_LEVEL=debug
```

### Staging Environment

**File:** `.env.staging`
```bash
# API
EXPO_PUBLIC_API_URL=https://staging-api.your-domain.com
EXPO_PUBLIC_API_TIMEOUT=15000
EXPO_PUBLIC_USE_MOCK_API=false

# Database (Backend)
DATABASE_URL=postgresql://user:pass@staging-db.your-domain.com:5432/salesflow_staging

# OpenAI
OPENAI_API_KEY=sk-prod-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1500

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://staging.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=staging
SENTRY_ENABLED=true

# Feature Flags
FEATURE_AI_COACH=true
FEATURE_VOICE_NOTES=true
FEATURE_GEOLOCATION=true

# Logging
LOG_LEVEL=info
```

### Production Environment

**File:** `.env.production`
```bash
# API
EXPO_PUBLIC_API_URL=https://api.your-domain.com
EXPO_PUBLIC_API_TIMEOUT=20000
EXPO_PUBLIC_USE_MOCK_API=false

# Database (Backend)
DATABASE_URL=postgresql://user:pass@prod-db.your-domain.com:5432/salesflow_prod

# OpenAI
OPENAI_API_KEY=sk-prod-...
OPENAI_MODEL=gpt-4o-2024-08-06
OPENAI_MAX_TOKENS=2000

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://prod.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_ENABLED=true

# Feature Flags
FEATURE_AI_COACH=true
FEATURE_VOICE_NOTES=true
FEATURE_GEOLOCATION=true

# Logging
LOG_LEVEL=error

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Security
JWT_EXPIRATION=7d
REFRESH_TOKEN_EXPIRATION=30d
PASSWORD_MIN_LENGTH=8
```

### Environment Management

**Using direnv (recommended):**
```bash
# Install direnv
brew install direnv

# Add to ~/.zshrc or ~/.bashrc
eval "$(direnv hook zsh)"

# Create .envrc in project root
echo "dotenv .env.development" > .envrc
direnv allow
```

**Using .env files:**
```bash
# Load environment
export $(cat .env.development | xargs)

# Or use with npm scripts
"scripts": {
  "start:dev": "ENV_FILE=.env.development expo start",
  "start:staging": "ENV_FILE=.env.staging expo start",
  "start:prod": "ENV_FILE=.env.production expo start"
}
```

---

## 🔒 PART 4: SECURITY AUDIT CHECKLIST

### Authentication & Authorization

- [ ] Passwords hashed with bcrypt (cost >= 12)
- [ ] JWT tokens expire (7 days max)
- [ ] Refresh tokens used
- [ ] Token stored in secure storage (not AsyncStorage)
- [ ] Biometric auth available
- [ ] Session timeout implemented (30 min inactivity)
- [ ] Password requirements enforced (8+ chars, upper, lower, number)
- [ ] No hardcoded credentials
- [ ] API keys in environment variables only
- [ ] No credentials in version control (.gitignore configured)

### Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] All API calls use HTTPS
- [ ] SSL/TLS certificates valid
- [ ] No sensitive data in logs
- [ ] PII redacted in error messages
- [ ] Database backups encrypted
- [ ] RLS policies enabled (PostgreSQL)
- [ ] Input sanitization on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (escaped output)

### Network Security

- [ ] Certificate pinning implemented (optional but recommended)
- [ ] Timeout configured on all requests
- [ ] Rate limiting enabled (100 requests/minute)
- [ ] CORS configured correctly
- [ ] API versioning implemented
- [ ] DDoS protection (Cloudflare/similar)
- [ ] No sensitive data in URL parameters
- [ ] Request validation (size limits, content-type)

### Mobile App Security

- [ ] App Transport Security (ATS) enabled (iOS)
- [ ] ProGuard/R8 enabled (Android)
- [ ] No sensitive data in app binary
- [ ] Secure keychain usage (iOS)
- [ ] Encrypted shared preferences (Android)
- [ ] Root/jailbreak detection (optional)
- [ ] Code obfuscation enabled
- [ ] Reverse engineering protections
- [ ] No debug logs in production

### API Security

- [ ] Authentication required on all endpoints
- [ ] Authorization checks (user can only access own data)
- [ ] Input validation on all endpoints
- [ ] Output encoding
- [ ] Error handling doesn't leak info
- [ ] API documentation not publicly accessible
- [ ] Versioning strategy in place
- [ ] Deprecation policy defined

### Third-Party Security

- [ ] All dependencies up to date
- [ ] No known vulnerabilities (npm audit passes)
- [ ] License compliance checked
- [ ] Third-party SDKs vetted
- [ ] Minimal permissions requested
- [ ] Data sharing agreements in place
- [ ] Privacy policies linked

### Infrastructure Security

- [ ] Database access restricted by IP
- [ ] Firewall configured
- [ ] Regular security patches applied
- [ ] Monitoring & logging enabled
- [ ] Incident response plan in place
- [ ] Regular backups (daily)
- [ ] Backup restoration tested
- [ ] Disaster recovery plan
- [ ] Access control (least privilege)
- [ ] Multi-factor authentication for admin

### Compliance

- [ ] GDPR compliant (if EU users)
- [ ] CCPA compliant (if California users)
- [ ] Data retention policy defined
- [ ] User data export available
- [ ] User data deletion available
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent (if applicable)
- [ ] Age verification (13+ or 18+)

### Testing

- [ ] Security penetration testing done
- [ ] Vulnerability scanning automated
- [ ] Code review process in place
- [ ] Security checklist for PRs
- [ ] Threat modeling completed
- [ ] Security training for team

### Incident Response

- [ ] Security contact email published
- [ ] Incident response plan documented
- [ ] Team roles defined
- [ ] Communication templates ready
- [ ] Post-mortem process
- [ ] Regular drills conducted

---

## 📊 MONITORING & MAINTENANCE

### Performance Monitoring

**Setup Sentry:**
```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative
```

**Configure:**
```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000
});
```

### Analytics

**Setup Google Analytics:**
```bash
npx expo install expo-firebase-analytics
```

**Track Events:**
```typescript
import * as Analytics from 'expo-firebase-analytics';

Analytics.logEvent('lead_created', {
  source: 'manual',
  segment: 'warm'
});
```

### Health Checks

**Backend Health Endpoint:**
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }
```

**Monitor:**
- Uptime (>99.9%)
- Response time (<200ms)
- Error rate (<1%)
- Database connections

---

## 🚀 POST-LAUNCH CHECKLIST

### Week 1

- [ ] Monitor crash rate (<1%)
- [ ] Monitor reviews (respond within 24h)
- [ ] Check analytics (daily active users)
- [ ] Verify all features working
- [ ] Monitor server load
- [ ] Check error logs daily

### Month 1

- [ ] Collect user feedback
- [ ] Analyze usage patterns
- [ ] Plan first update
- [ ] Review performance metrics
- [ ] Optimize slow queries
- [ ] Improve onboarding if needed

### Ongoing

- [ ] Monthly security audits
- [ ] Quarterly dependency updates
- [ ] Regular feature releases
- [ ] A/B testing new features
- [ ] User interviews
- [ ] Competitor analysis

---

## CONCLUSION

This guide covers complete app submission for both platforms plus environment setup and security best practices.

**Key Takeaways:**
1. Prepare all assets before starting
2. Test thoroughly with demo accounts
3. Follow security checklist strictly
4. Monitor closely post-launch
5. Respond to reviews quickly

**Resources:**
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Policies: https://play.google.com/console/about/guides/
- GDPR Info: https://gdpr.eu/
- OWASP Mobile Top 10: https://owasp.org/www-project-mobile-top-10/

**Good luck with your launch! 🎉**
