# 🤖 CURSOR AI PROMPTS - SALES FLOW AI PHASE A

## 📋 HOW TO USE

1. Öffne Cursor AI
2. Kopiere einen der Prompts unten
3. Paste in Cursor Chat (Cmd/Ctrl+L)
4. Cursor baut dir die Component!

---

## 🎯 PROMPT 1: TEMPLATE PERFORMANCE DASHBOARD

```
I'm building Sales Flow AI - an AI-native CRM for Network Marketing.

CONTEXT:
I have a Supabase database with these tables:
- template_performance (tracks message template success rates)
- v_top_templates (view with aggregated performance data)

TASK:
Build a Template Performance Dashboard with these features:

1. Overview Cards:
   - Total templates used
   - Average open rate
   - Average conversion rate
   - Best performing template

2. Performance Chart:
   - Bar chart showing open_rate, response_rate, conversion_rate per template
   - Use Recharts library
   - Color code by performance (green > 70%, yellow 40-70%, red < 40%)

3. Templates Table:
   - Show template_id, company_name, performance_score, times_used, times_converted
   - Sortable columns
   - Filter by company

4. AI Recommendations Section:
   - Analyze user's data
   - Suggest which templates to use more
   - Highlight underperforming templates
   - Compare to platform average

TECH STACK:
- Next.js 14 with App Router
- TypeScript
- Supabase Client
- Tailwind CSS
- Recharts for charts
- shadcn/ui components

IMPORTANT:
- Use Supabase RLS (user can only see their own data)
- Add loading states
- Add error handling
- Make it mobile-responsive

Give me the complete component with proper TypeScript types.
```

---

## 🏆 PROMPT 2: SUCCESS STORIES FEED

```
I'm building Sales Flow AI - the best AI sales tool for Network Marketing.

CONTEXT:
I have a company_success_stories table in Supabase with:
- story_title, story_text, achievement_type
- metrics (JSON: rank, income, team_size)
- location_country, timeframe_months
- likes_count, views_count, featured flag

TASK:
Build a Success Stories Feed Component:

1. Grid Layout (3 columns on desktop):
   - Card design with title, excerpt, metrics
   - "Featured" badge for featured stories
   - Company logo/name
   - Location & timeframe

2. Filtering:
   - By company (dropdown)
   - By achievement_type (rank, income, team_growth, product_results)
   - By region (DACH, UK, US, etc.)

3. Story Card Features:
   - Like button (increments likes_count)
   - Share button
   - View count tracking
   - Click to expand full story (modal)

4. Metrics Display:
   - Show rank badge (if available)
   - Show monthly income (if available)
   - Show team size (if available)
   - Timeframe badge ("8 months")

5. Empty States:
   - When no stories match filters
   - Motivational message to create first story

DESIGN:
- Modern, inspirational, testimonial-style
- Use gradient backgrounds for featured stories
- Achievement type icons (🏆 rank, 💰 income, 👥 team, 💪 product)

TECH STACK:
- Next.js 14
- TypeScript
- Supabase
- Tailwind CSS
- Framer Motion for animations
- shadcn/ui Dialog for modals

Include proper error handling and loading states.
```

---

## 💬 PROMPT 3: COMMUNITY FORUM FEATURE

```
I'm building a community feature for Sales Flow AI.

CONTEXT:
Database tables:
- community_posts (id, user_id, title, content, post_type, category, tags, likes_count, comments_count)
- community_comments (id, post_id, user_id, content, likes_count, parent_comment_id for replies)

TASK:
Build a Reddit/LinkedIn-style community forum with:

1. Post Feed:
   - Infinite scroll or pagination
   - Sort options: Latest, Hot (most comments), Top (most likes)
   - Post type icons (❓ question, 💡 tip, 🎉 success, 🎯 challenge)
   - Show: title, excerpt, tags, engagement metrics

2. Create Post Modal:
   - Type selector (question, tip, success, challenge, discussion, resource)
   - Title input (required)
   - Rich text editor for content (markdown support)
   - Tag selector (existing tags + create new)
   - Company selector (optional)
   - Preview mode

3. Post Detail Page:
   - Full post content with markdown rendering
   - Like/Bookmark buttons
   - Comments section with nested replies (max 2 levels)
   - "Mark as solution" button for questions (OP only)
   - Share functionality

4. Engagement Features:
   - Real-time like counter
   - Comment threading
   - @mentions in comments
   - Edit/Delete own posts (with history)

5. Filters & Search:
   - Filter by category (objection_handling, recruiting, product_knowledge, mindset)
   - Filter by company
   - Filter by tags
   - Search in titles and content

6. User Features:
   - Display user avatar & name
   - Show user's "contributor level" (based on likes received)
   - Link to user profile

DESIGN:
- Clean, modern forum aesthetic
- Clear visual hierarchy
- Mobile-first responsive
- Dark mode support

TECH STACK:
- Next.js 14 App Router
- TypeScript
- Supabase (with RLS policies)
- Tailwind CSS
- shadcn/ui (Dialog, Dropdown, Textarea, etc.)
- react-markdown for content rendering
- @tiptap/react for rich text editor

IMPORTANT:
- Implement optimistic UI updates for likes
- Add real-time updates for new comments (Supabase Realtime)
- Proper error boundaries
- Loading skeletons

Give me:
1. PostFeed component
2. CreatePostModal component
3. PostDetail component
4. CommentThread component
```

---

## 📊 PROMPT 4: ANALYTICS DASHBOARD

```
I'm building an analytics dashboard for Sales Flow AI.

CONTEXT:
User needs to see:
- Their template performance vs platform average
- Success stories impact on their motivation
- Community engagement metrics
- Daily/weekly/monthly trends

TASK:
Build a comprehensive Analytics Dashboard:

1. Overview Section (4 KPI Cards):
   - Total messages sent (with trend ↑↓)
   - Average conversion rate (with benchmark)
   - Active templates count
   - Community contributions

2. Performance Trends (Charts):
   - Line chart: Conversion rate over time (last 30 days)
   - Bar chart: Messages sent per day (last 7 days)
   - Pie chart: Performance by company
   - Area chart: Template usage distribution

3. Comparison Widget:
   - Your avg conversion rate: X%
   - Platform average: Y%
   - Top 10% performers: Z%
   - Show where user stands (percentile)

4. Recommendations Engine:
   - AI-generated insights based on data
   - "Your best performing day is Tuesday at 10am"
   - "Template X has 40% higher conversion - use it more"
   - "Users similar to you converted 23% more by doing Y"

5. Export Features:
   - Export data as CSV
   - Generate PDF report
   - Share dashboard link

DESIGN:
- Modern SaaS dashboard aesthetic
- Use charts from Recharts
- Color-coded performance indicators
- Responsive grid layout

TECH STACK:
- Next.js 14
- TypeScript
- Supabase
- Tailwind CSS
- Recharts
- date-fns for date handling
- jsPDF for PDF export

Include:
- Date range selector (last 7/30/90 days, custom range)
- Loading states
- Empty states with helpful messages
```

---

## 🎨 PROMPT 5: ONBOARDING FLOW

```
I'm building an onboarding flow for new Sales Flow AI users.

CONTEXT:
New users need to:
1. Select their company (from 49 Network Marketing companies)
2. Set their monthly sales goal
3. Choose their primary channel (WhatsApp, Email, LinkedIn)
4. See their first "Daily Command" (recommended actions)

TASK:
Build a multi-step onboarding wizard:

STEP 1: Welcome
- Hero message: "Welcome to Sales Flow AI"
- Subheading: "The AI-powered sales OS for Network Marketing"
- Video tutorial (optional skip)
- "Get Started" button

STEP 2: Select Your Company
- Search/filter through 49 companies
- Show company logo, name, industry
- Popular companies highlighted (Herbalife, Zinzino, Amway, etc.)
- "I don't see my company" option

STEP 3: Set Your Goal
- "What's your monthly sales goal?"
- Input field with currency
- Slider for number of customers/recruits per month
- AI calculates daily actions needed
- Show preview: "To reach €5000/month, you need ~3 sales/week"

STEP 4: Choose Your Channel
- Cards for: WhatsApp, Email, LinkedIn, Instagram DM
- Multi-select allowed
- Show pros/cons of each channel
- Load relevant templates for selected channels

STEP 5: Your First Daily Command
- Show personalized task list for today
- Example: "Send 5 messages using template X"
- "Book 2 follow-up calls"
- "Review 3 success stories for motivation"
- "Start Daily Command" button → takes to main dashboard

DESIGN:
- Smooth transitions between steps
- Progress bar at top
- Beautiful illustrations/icons
- Encouraging copy
- Mobile-responsive

TECH STACK:
- Next.js 14
- TypeScript
- Framer Motion for animations
- Tailwind CSS
- shadcn/ui (Card, Input, Select)
- Supabase to save onboarding data

FEATURES:
- Can skip steps (but marked as incomplete)
- Can go back to previous step
- Auto-save progress
- Send welcome email after completion
```

---

## 🔥 PROMPT 6: DAILY COMMAND CENTER

```
I'm building the core feature of Sales Flow AI - the Daily Command Center.

CONCEPT:
Every morning, the AI tells the user EXACTLY what to do today to hit their monthly goal.

CONTEXT:
User has:
- Monthly goal (e.g., €5000 revenue, 10 new customers)
- Current progress (tracked in DB)
- Available templates, playbooks
- Lead pipeline with statuses

TASK:
Build the Daily Command Center dashboard:

1. Hero Section:
   - Greeting: "Good morning, Alex! 👋"
   - Goal progress bar: "€2,400 of €5,000 (48%)"
   - Days left in month: "15 days remaining"
   - Status: "On track" / "Behind pace" / "Ahead"

2. Today's Priority Actions (AI-Generated):
   - Action 1: "Follow up with 3 warm leads" 
     - Click to see leads + suggested message
     - Mark as done checkbox
   - Action 2: "Send cold outreach to 5 new prospects"
     - Click to auto-generate messages
   - Action 3: "Book 2 product demos for this week"
     - Opens calendar integration

3. Smart Suggestions:
   - "Sarah hasn't replied in 3 days - send this follow-up?"
   - "You have 3 leads stuck in 'Interested' stage - here's what to do"
   - "Your conversion rate is 15% higher on Tuesdays - schedule important calls then"

4. Quick Actions Bar:
   - "Send Message" → opens template picker
   - "Log Activity" → quick form
   - "View Pipeline" → go to CRM
   - "Check Analytics" → dashboard

5. Motivation Section:
   - Success story of the day
   - Your streak: "5 days of hitting daily goals 🔥"
   - Community highlight: "Top tip from the forum"

DESIGN:
- Clean, action-oriented
- Big, clear buttons
- Progress visualization
- Gamification elements (streaks, achievements)

TECH STACK:
- Next.js 14
- TypeScript
- Supabase
- Tailwind CSS
- Framer Motion
- recharts for progress charts

INTELLIGENCE:
- Calculate daily actions needed based on goal
- Prioritize leads based on lead_score
- Use historical data to optimize timing
- Recommend templates based on performance

Include drag-and-drop to reorder priorities.
```

---

## 💡 HOW TO USE THESE PROMPTS IN CURSOR

1. **Copy the prompt you need**
2. **Open Cursor** (Cmd/Ctrl+K)
3. **Paste the prompt**
4. **Cursor will generate the component**
5. **Review, refine, integrate**

---

## 🚀 BONUS: MASTER PROMPT FOR ENTIRE APP

```
I'm building Sales Flow AI - the world's best AI-native sales tool for Network Marketing.

FULL CONTEXT:
- Supabase backend with 49 Network Marketing companies
- 12 MLM-specific tables (events, 3-way calls, lead scoring, etc.)
- Template performance tracking
- Success stories & community features
- Multi-language support planned (DE, EN, ES, PT)

TASK:
Generate the complete Next.js 14 app structure with:

1. App Router structure
2. Layout with navigation
3. Authentication (Supabase Auth)
4. Dashboard page (Daily Command Center)
5. Templates page (browse & track performance)
6. Community page (forum)
7. Analytics page
8. Settings page

REQUIREMENTS:
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui components
- Supabase client
- RLS policies enforced
- Mobile-responsive
- Dark mode support
- SEO optimized
- Error boundaries
- Loading states everywhere

Give me:
1. Folder structure
2. Core layout components
3. Navigation component
4. Auth flow
5. Main pages (stubbed)
6. Supabase client setup
7. TypeScript types
8. Utility functions

Make it production-ready with best practices.
```

---

## ✅ READY TO BUILD!

Use these prompts to let Cursor AI build your entire Phase A frontend! 🚀
