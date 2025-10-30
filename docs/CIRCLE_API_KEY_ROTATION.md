# Circle API Key Rotation Guide

## Overview

This guide explains how to safely rotate Circle API keys without service disruption. Circle API keys should be rotated regularly for security best practices.

## When to Rotate Keys

- **Regular Schedule**: Every 90 days (recommended)
- **Security Incident**: Immediately if key is compromised
- **Team Changes**: When team members with key access leave
- **Compliance**: As required by security policies

## Circle API Key Format (Post-May 2023)

Circle uses a combined API key format:

```
TEST_API_KEY:key_id:secret
```

## Zero-Downtime Rotation Process

### Step 1: Generate New API Key

1. Log in to Circle Developer Console: https://console.circle.com/
2. Navigate to **API Keys** section
3. Click **"Create New API Key"**
4. Copy the new key immediately (you won't see it again!)
5. Store securely in password manager

### Step 2: Add New Key to Environment (Dual-Key Setup)

Update your `.env` file to support both old and new keys temporarily:

```bash
# Current (old) key
CIRCLE_API_KEY=TEST_API_KEY:old_key_id:old_secret

# New key (for rotation)
CIRCLE_API_KEY_NEW=TEST_API_KEY:new_key_id:new_secret

# Entity Secret (stays the same)
CIRCLE_ENTITY_SECRET=13245ded4af7e489143ba13f1799a498a59fe3bb845614fd209d0607afe89f61
```

### Step 3: Update Application Code (If Needed)

If your application doesn't support dual-key fallback, add it:

```javascript
// services/circle.ts
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

function getCircleClient() {
  // Try new key first, fallback to old key
  const apiKey = process.env.CIRCLE_API_KEY_NEW || process.env.CIRCLE_API_KEY;

  return initiateDeveloperControlledWalletsClient({
    apiKey: apiKey,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET,
  });
}
```

### Step 4: Deploy with Dual Keys

1. **Development Environment**: Update `.env` with new key
2. **Staging Environment**: Deploy with both keys configured
3. **Production Environment**: Deploy with both keys configured
4. Test all Circle API operations

### Step 5: Verify New Key Works

Run verification script:

```bash
node contracts/scripts/verify-task-1.3.mjs
```

Expected output:

```
✓ Circle API Key present
✓ Entity Secret present
✓ Circle API working (X wallet(s) found)
```

### Step 6: Switch to New Key Only

After 24-48 hours of successful operation:

1. Update `.env` to use new key as primary:

   ```bash
   CIRCLE_API_KEY=TEST_API_KEY:new_key_id:new_secret
   # Remove CIRCLE_API_KEY_NEW
   ```

2. Deploy updated configuration

3. Monitor for 24 hours

### Step 7: Revoke Old Key

1. Return to Circle Developer Console
2. Navigate to **API Keys**
3. Find old key by key_id
4. Click **"Revoke"** or **"Delete"**
5. Confirm revocation

### Step 8: Update Documentation

- [ ] Update team password manager
- [ ] Update deployment documentation
- [ ] Update runbooks
- [ ] Log rotation in audit trail
- [ ] Schedule next rotation (90 days)

## Emergency Rotation (Compromised Key)

If a key is compromised, rotate immediately:

1. **Immediately generate new key** in Circle Console
2. **Update production `.env`** directly (don't wait for deployment)
3. **Restart services** to pick up new key
4. **Revoke old key immediately**
5. **Investigate compromise** - check logs for unauthorized usage
6. **Notify team** of security incident

## Entity Secret vs API Key

**Important**: Entity Secret and API Key are separate!

- **API Key**: Rotated regularly (every 90 days)
- **Entity Secret**: Permanent, only regenerate if compromised
- **Entity Secret Rotation**: Requires re-registering all wallets (AVOID unless necessary)

## Testing Key Rotation

Test the rotation process in development first:

```bash
# 1. Save current key
cp .env .env.backup

# 2. Generate test key in Circle Console (testnet)
# 3. Update .env with new key
# 4. Test API operations
node contracts/scripts/test-circle-wallet.mjs

# 5. Verify wallet creation works
node contracts/scripts/create-circle-wallet.mjs

# 6. If successful, apply to production
```

## Key Storage Best Practices

✅ **DO:**

- Store keys in environment variables
- Use secrets management (AWS Secrets Manager, HashiCorp Vault)
- Encrypt keys at rest
- Use separate keys for dev/staging/prod
- Log key usage for audit trail
- Rotate keys regularly

❌ **DON'T:**

- Commit keys to Git (even private repos)
- Share keys via email/Slack
- Use production keys in development
- Store keys in plain text files
- Hard-code keys in application code

## Monitoring After Rotation

Monitor these metrics for 48 hours after rotation:

- [ ] Circle API error rate (should be <0.1%)
- [ ] Wallet creation success rate (should be 100%)
- [ ] Transaction success rate (should be >99%)
- [ ] API response times (should be <500ms p95)

## Rollback Plan

If new key causes issues:

1. Immediately revert to old key:
   ```bash
   CIRCLE_API_KEY=TEST_API_KEY:old_key_id:old_secret
   ```
2. Restart services
3. Verify services are working
4. Investigate why new key failed
5. Contact Circle Support if needed

## Automation (Future Enhancement)

Consider automating key rotation:

```javascript
// Example: Automated rotation check
const KEY_ROTATION_DAYS = 90;
const keyCreatedDate = new Date(process.env.CIRCLE_API_KEY_CREATED);
const daysSinceCreation = (Date.now() - keyCreatedDate) / (1000 * 60 * 60 * 24);

if (daysSinceCreation > KEY_ROTATION_DAYS) {
  console.warn("⚠️  Circle API key is older than 90 days. Please rotate soon!");
  // Send alert to ops team
}
```

## Support Contacts

- **Circle Support**: https://support.circle.com/
- **Developer Discord**: https://discord.gg/buildonarc
- **Documentation**: https://developers.circle.com/

## Checklist for Rotation

Use this checklist for each rotation:

- [ ] Generate new API key in Circle Console
- [ ] Store new key securely in password manager
- [ ] Update development `.env` file
- [ ] Test with verification script
- [ ] Update staging environment
- [ ] Test staging thoroughly (24 hours)
- [ ] Update production environment
- [ ] Monitor production (48 hours)
- [ ] Revoke old key
- [ ] Update documentation
- [ ] Schedule next rotation

## Compliance & Audit

Document each rotation:

| Date       | Old Key ID  | New Key ID  | Rotated By | Reason                    |
| ---------- | ----------- | ----------- | ---------- | ------------------------- |
| 2025-10-29 | N/A         | 72ef67e5... | Setup Team | Initial setup             |
| 2026-01-27 | 72ef67e5... | TBD         | TBD        | Scheduled 90-day rotation |

---

**Last Updated**: October 29, 2025  
**Next Review**: January 27, 2026  
**Owner**: Backend Engineering Team
