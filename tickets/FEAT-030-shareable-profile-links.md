# FEAT-030: Shareable Profile Links (No Data Upload)

## 1. Intent (Required)

**User Story:**
As a data analyst
I want to share my profile results with teammates via a link
So that they can view the statistics without me sending files or screenshots

**Success Looks Like:**
Click "Share" → Get a URL like `YOUR_DOMAIN/p/abc123` → Anyone with link sees the profile (but not the raw data).

## 2. Context & Constraints (Required)

**Background:**
Collaboration is a major gap. Currently, users must:
- Export HTML and email it
- Screenshot and paste in Slack
- Re-profile from scratch on another machine

A shareable link would enable instant collaboration while maintaining privacy (no raw data uploaded, only profile statistics).

**Scope:**
- **In Scope:**
  - Generate shareable link for current profile
  - Store only profile JSON (statistics, not raw data)
  - Links expire after 7 days (configurable)
  - View-only access (no editing)
  - Optional password protection
  - Copy link to clipboard
  - Short URL format

- **Out of Scope:**
  - User accounts / authentication
  - Team workspaces
  - Real-time collaboration
  - Edit/comment on shared profiles
  - Storing raw data

**Constraints:**
- Profile JSON only (~50-200KB per profile)
- Privacy-first: No PII, no raw values, only aggregates
- Must work without login (anonymous sharing)
- GDPR-compliant (no cookies, minimal storage)

## 3. Acceptance Criteria (Required)

**Scenario: Generate share link**
Given I have profiled a file
When I click "Share" button
Then a unique short URL is generated
And the URL is copied to clipboard
And a toast confirms "Link copied!"

**Scenario: View shared profile**
Given someone shared a profile link with me
When I open the link in browser
Then I see the full profile report (read-only)
And I see metadata (original filename, profile date)
And I do NOT see raw data values

**Scenario: Link expiration**
Given a shared link was created 8 days ago
When someone opens the link
Then they see "This profile has expired"
And option to "Profile your own data"

**Scenario: Password protection**
Given I enable "Protect with password" when sharing
When I enter a password and share
Then viewers must enter the password to view
And wrong password shows error

**Scenario: Delete shared profile**
Given I created a shared profile
When I click "Delete shared link"
Then the link stops working immediately
And viewers see "Profile not found"

## 4. AI Execution Instructions (Required)

**Allowed to Change:**
- Create `src/app/components/ShareModal.tsx`
- Create `src/app/services/sharing.service.ts`
- Add backend/serverless function for link storage
- Modify ProfileReport to add Share button
- Create `/p/:id` route for viewing shared profiles

**Must NOT Change:**
- Profile computation logic
- Raw data storage (never store raw data)
- Export functionality

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- feat(share): add ShareModal component
- feat(share): add sharing service with link generation
- feat(share): add shared profile viewer route
- feat(share): add password protection option
- feat(share): add link expiration

## 6. Verification & Definition of Done (Required)

- [ ] Share button visible in ProfileReport
- [ ] Click generates unique short URL
- [ ] URL opens profile in read-only view
- [ ] No raw data included in shared profile
- [ ] Links expire after configured time
- [ ] Password protection works
- [ ] Can delete/revoke shared link
- [ ] Works on mobile browsers

## 7. Technical Design

### Storage Options

**Option A: Supabase (Recommended)**
- Free tier: 500MB storage, 2GB transfer
- No server management
- Built-in expiration via TTL
- PostgreSQL backend

**Option B: Cloudflare KV**
- Edge storage, very fast
- 1GB free
- Simple key-value with TTL

**Option C: Firebase Firestore**
- Generous free tier
- Real-time updates (overkill for this)

### Data Model

```typescript
interface SharedProfile {
  id: string;              // Short UUID (8 chars)
  profileJson: string;     // Compressed profile data
  metadata: {
    originalFilename: string;
    createdAt: string;
    expiresAt: string;
    viewCount: number;
  };
  passwordHash?: string;   // bcrypt hash if protected
}
```

### URL Structure

```
https://YOUR_DOMAIN/p/abc123ef

/p/:id - View shared profile
```

### Privacy Safeguards

```typescript
function sanitizeForSharing(profile: ProfileResult): SharableProfile {
  return {
    ...profile,
    column_profiles: profile.column_profiles.map(col => ({
      ...col,
      sample_values: [],        // Remove samples
      missing_rows: [],         // Remove row indices
      pii_rows: [],             // Remove PII row indices
      outlier_rows: [],         // Remove outlier indices
      categorical_stats: col.categorical_stats ? {
        ...col.categorical_stats,
        top_values: col.categorical_stats.top_values.map(tv => ({
          ...tv,
          value: hashValue(tv.value)  // Hash actual values
        }))
      } : null
    }))
  };
}
```

## 8. Resources

- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Short UUID](https://www.npmjs.com/package/short-uuid)
- [bcrypt.js](https://www.npmjs.com/package/bcryptjs)
