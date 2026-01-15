# Uptime Monitoring Setup Guide

> **Get alerted when MetaDJ Nexus goes down before users notice**

**Last Modified**: 2026-01-14 21:55 EST
**Version**: 0.8.0
**Status**: Ready to implement (Set up after launch when domain is finalized)

## Overview

This guide walks through setting up uptime monitoring for MetaDJ Nexus using UptimeRobot (free tier). Uptime monitoring alerts you immediately when the site goes down, allowing you to respond before users are impacted.

**Goal**: Proactive downtime detection and alerting with 5-minute check intervals.

## Why Uptime Monitoring Matters

**Benefits**:
- **Early detection**: Know about outages before users complain
- **SLA tracking**: Measure actual uptime against targets
- **Status page**: Public transparency for users during incidents
- **Peace of mind**: Sleep well knowing you'll be alerted

**Real-world scenarios**:
- Replit infrastructure issues
- Cloudflare R2 connectivity problems
- Next.js build failures
- DNS/domain issues
- Resource exhaustion

---

## Service Selection: UptimeRobot

**Why UptimeRobot?**

✅ **Free tier includes**:
- 50 monitors (we need 1-3)
- 5-minute check intervals
- Email/SMS/Slack/Discord alerts
- Public status page
- 90-day monitoring logs
- 99.98% monitoring reliability

🎯 **Alternative services** (if needed):
- **Better Uptime** (more features, paid)
- **Pingdom** (enterprise-grade, expensive)
- **StatusCake** (similar to UptimeRobot)

**Decision**: UptimeRobot's free tier is perfect for MetaDJ Nexus's needs.

---

## Setup Guide

### Step 1: Create UptimeRobot Account

```markdown
1. Visit: https://uptimerobot.com/
2. Sign up with email (no credit card required)
3. Confirm email address
4. Log in to dashboard
```

**Account setup time**: 2 minutes

---

### Step 2: Create Primary Monitor

**Monitor Configuration**:

```yaml
Monitor Type: HTTP(s)
Friendly Name: MetaDJ Nexus - Health Check
URL: https://your-repl-url.replit.app/api/health
Monitoring Interval: 5 minutes (free tier)
Monitor Timeout: 30 seconds
HTTP Method: GET (default)
Expected Status Code: 200
```

**Advanced Settings**:

```yaml
# Optional: Check response content
Keyword Type: Required
Keyword: "healthy"
# The /api/health endpoint returns {"status": "healthy"}

# Optional: Follow redirects
Follow Redirects: Yes (Replit may redirect)

# Optional: Ignore SSL errors
Ignore SSL Errors: No (keep SSL validation)
```

**Setup steps**:
1. Click "Add New Monitor" in dashboard
2. Select "HTTP(s)" monitor type
3. Enter MetaDJ Nexus details above
4. Click "Create Monitor"
5. Wait 5 minutes for first check

**Monitor setup time**: 3 minutes

---

### Step 3: Configure Alert Contacts

**Email Alerts** (Primary):

```yaml
Type: Email
Address: your-email@domain.com
Name: Primary Email
Alert When: Down (2 consecutive failures)
Alert When: Up (after downtime)
Alert For: All Monitors
```

**Slack/Discord Alerts** (Optional):

```yaml
# Slack Integration
Type: Slack
Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Channel: #metadj-alerts
Alert When: Down + Up
Alert For: MetaDJ Nexus - Health Check

# Discord Integration
Type: Discord
Webhook URL: https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
Alert When: Down + Up
Alert For: MetaDJ Nexus - Health Check
```

**Alert thresholds**:
- **Down**: Requires 2 consecutive failures (10 minutes total)
- **Up**: Single success after downtime period
- **Rationale**: Prevents false alarms from transient network issues

**Alert setup time**: 5 minutes

---

### Step 4: Create Public Status Page (Optional)

**Status Page Benefits**:
- Transparency for users during incidents
- Reduces support inquiries
- Builds trust with audience
- Professional branding

**Setup steps**:

```markdown
1. Navigate to "Status Pages" in UptimeRobot
2. Click "Add Status Page"
3. Configure:
   - Page URL: metadj-nexus (verify slug in status provider settings)
   - Custom Domain: status.metadjnexus.ai (requires DNS setup)
   - Monitors: Select "MetaDJ Nexus - Health Check"
   - Design: Choose dark theme to match brand
4. Enable:
   - Show uptime percentage
   - Show response times
   - Show incident history (last 30 days)
5. Save and publish
```

**Custom domain setup** (optional):

```dns
# DNS CNAME record
Type: CNAME
Host: status
Value: stats.uptimerobot.com
TTL: 3600
```

**Status page setup time**: 10 minutes (5 minutes + custom domain)

---

## Health Check Endpoint

MetaDJ Nexus includes a built-in health check endpoint at `/api/health`.

### Endpoint Details

**URL**: `https://your-repl-url.replit.app/api/health`

**Response Format** (Public):

```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T12:00:00Z"
}
```

**Status Codes**:
- `200 OK` → System healthy or degraded
- `503 Service Unavailable` → System unhealthy (critical checks failed)

**Checks**:
- Environment validation (`getEnv`)
- Database connectivity (Neon `SELECT 1`)
- R2 bucket availability
- AI provider configuration

### Implementation

**File**: `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 }
    );
  }
}
```

**Endpoint already exists** ✅ (implemented in v0.90)

### Internal Health Endpoints (Protected)

MetaDJ Nexus also ships internal-only health endpoints:

- `/api/health/ai` — AI spending + rate limiting status
- `/api/health/providers` — provider health + cache metrics

**Auth**: send `x-internal-request: <INTERNAL_API_SECRET>` for all environments.

---

## Uptime Targets

### v0.90 (Current)

**Target**: 99.5% uptime
- Allows ~3.6 hours downtime per month
- Acceptable for early beta/MVP
- Focus on stability over perfection

**Expected downtime sources**:
- Replit maintenance windows
- Deployment cycles
- Bug fixes and hotfixes
- R2 hiccups

### v1.0 (Production Launch)

**Target**: 99.9% uptime
- Allows ~43 minutes downtime per month
- Production-grade reliability
- Zero-downtime deployments required

**Improvements needed**:
- Blue-green deployments (Replit feature)
- Health check during deployment
- Graceful degradation patterns
- R2 availability monitoring

### v1.5+ (Mature Product)

**Target**: 99.95% uptime
- Allows ~21 minutes downtime per month
- Enterprise-grade reliability
- Multi-region fallbacks
- Advanced monitoring

---

## Alert Response Workflow

### When You Receive "Down" Alert

**Immediate Actions** (< 5 minutes):

```markdown
1. Verify alert is real:
   - Visit site in browser
   - Check /api/health directly
   - Confirm availability from multiple networks

2. Check Replit dashboard:
   - Is Repl running?
   - Any error logs visible?
   - Recent deployments?

3. Check GitHub Actions:
   - Did CI pass?
   - Any failed builds?
   - Recent commits causing issues?

4. Quick fixes to try:
   - Restart Repl (if frozen)
   - Redeploy last known good version
   - Check environment variables
```

**If still down after 10 minutes**:

```markdown
5. Deep dive:
   - Check Replit status page: https://status.replit.com/
   - Review server logs in Replit
   - Check R2 connectivity
   - Verify DNS resolution

6. Communicate:
   - Update status page (if public)
   - Post to social media if prolonged
   - Notify early access users if needed

7. Escalate:
   - Contact Replit support if infrastructure issue
   - File GitHub issue if application bug
   - Document incident for post-mortem
```

### When You Receive "Up" Alert

**Post-Incident Actions**:

```markdown
1. Verify full functionality:
   - Audio streaming works
   - Cinema video loads
   - Analytics firing
   - No console errors

2. Document incident:
   - Duration of downtime
   - Root cause identified
   - Resolution steps taken
   - Prevention measures needed

3. Update status page:
   - Mark incident as resolved
   - Add brief explanation
   - Link to post-mortem if public

4. Review and improve:
   - Add new monitors if needed
   - Adjust alert thresholds
   - Update runbooks
```

---

## Monitoring Dashboard

### Key Metrics to Track

**UptimeRobot Dashboard**:
- Current status (up/down)
- Response time (last 24 hours)
- Uptime percentage (30/60/90 days)
- Incident count and duration
- Average response time

**Recommended Review Cadence**:
- **Daily**: Quick glance at status
- **Weekly**: Review response times, check for patterns
- **Monthly**: Calculate uptime %, review all incidents
- **Quarterly**: Assess monitoring strategy, adjust targets

### Setting Up Dashboard

**Custom dashboard view**:
1. Favorite important monitors
2. Set up monitor groups (production, staging)
3. Configure custom date ranges
4. Enable dark mode (matches brand)

---

## Advanced Monitoring (Optional)

### Additional Monitors

**API Endpoint Monitors**:

```yaml
Monitor 1:
  Name: Audio Streaming
  URL: https://your-repl.replit.app/api/audio/majestic-ascent/01-track.mp3
  Expected: 200 or 206 (range request)
  Interval: 10 minutes

Monitor 2:
  Name: Video Streaming
  URL: https://your-repl.replit.app/api/video/MetaDJ%20v7.0%20Performance%20Loop%202%20(v0)_prob4.mp4
  Expected: 200 or 206
  Interval: 15 minutes

Monitor 3:
  Name: Analytics Endpoint
  URL: https://plausible.io/api/event
  Expected: 202 (Plausible accepts events)
  Interval: 15 minutes
```

**Multi-location checks** (Pro feature):
- North America
- Europe
- Asia
- Catches regional issues

---

## Integration with Other Tools

### Plausible Analytics

**Custom event on downtime**:
```typescript
// Track downtime incidents in analytics
if (monitorDown) {
  plausible('Downtime', {
    props: {
      duration: downtimeDuration,
      cause: downtimeCause,
    },
  });
}
```

### Sentry Error Tracking

**Link uptime to error spikes**:
```typescript
// Correlate downtime with error rates
if (errorRate > threshold) {
  checkUptimeRobotIncidents(timestamp);
}
```

---

## Troubleshooting

### Common Issues

**Issue**: False positive "down" alerts
```markdown
Cause: Transient network issues, Replit cold starts
Solution:
  - Increase failure threshold to 3 consecutive (15 min)
  - Reduce monitor timeout to 15 seconds
  - Add keyword check for more accuracy
```

**Issue**: No alerts received
```markdown
Cause: Email filtering, incorrect contact configuration
Solution:
  - Check spam folder
  - Verify email address in UptimeRobot
  - Test alert contact with "Send Test Alert"
  - Add alerts@uptimerobot.com to contacts
```

**Issue**: High response times reported
```markdown
Cause: Replit cold starts, heavy traffic, R2 latency
Solution:
  - Implement keep-alive endpoint (ping every 4 min)
  - Optimize API routes (caching, lazy loading)
  - Monitor Replit resource usage
```

---

## Cost Summary

**UptimeRobot Free Tier**:
- Cost: $0/month
- Monitors: 50 included (using 1-3)
- Checks: 5-minute intervals
- Alerts: Unlimited email + integrations
- Status page: 1 public page included
- Data retention: 90 days

**Upgrade to Pro** ($7/month):
- 1-minute intervals
- Multi-location monitoring
- Advanced notifications
- Custom domains for status pages
- SMS alerts (additional cost)

**Recommendation**: Free tier is sufficient for v0.90-v1.0

---

## Checklist

### Initial Setup
- [ ] Create UptimeRobot account
- [ ] Add primary health check monitor
- [ ] Configure email alerts
- [ ] Test alert with "Pause Monitor" feature
- [ ] Verify first successful check
- [ ] Document monitor ID and webhook URLs

### Optional Enhancements
- [ ] Set up Slack/Discord webhooks
- [ ] Create public status page
- [ ] Configure custom domain for status page
- [ ] Add secondary API monitors (audio, video)
- [ ] Set up incident post-mortem template (`docs/operations/INCIDENT-POSTMORTEM-TEMPLATE.md`)
- [ ] Create alert response runbook

### Ongoing Maintenance
- [ ] Review uptime metrics weekly
- [ ] Audit alert contacts quarterly
- [ ] Test alert system monthly
- [ ] Update monitor URLs after domain changes
- [ ] Adjust thresholds based on real data

---

## Next Steps

After implementing uptime monitoring:

1. **Set up error tracking** → See `3-projects/5-software/metadj-nexus/docs/operations/ERROR-TRACKING.md`
2. **Document deployment workflow** → See `3-projects/5-software/resources/workflows/DEPLOYMENT-WORKFLOW.md`
3. **Add security scanning** → See `3-projects/5-software/metadj-nexus/docs/security/SECURITY-SCANNING.md`
4. **Create incident response playbook**

---

## Support Resources

**UptimeRobot Documentation**:
- Getting started: https://uptimerobot.com/help/
- API reference: https://uptimerobot.com/api/
- Status page setup: https://blog.uptimerobot.com/status-pages/

**Community**:
- UptimeRobot blog: https://blog.uptimerobot.com/
- Twitter: @uptimerobot

**MetaDJ Nexus Health Check**:
- Endpoint: `/api/health`
- Implementation: `src/app/api/health/route.ts`
- Documentation: This file

---

Remember: Uptime monitoring is your first line of defense against user-facing issues. The 15 minutes spent setting this up will save hours of debugging production problems and maintain user trust.
