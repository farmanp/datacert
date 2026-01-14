# FEAT-033: Profile History (Local Storage)

## 1. Intent (Required)

**User Story:**
As a data analyst
I want to see my recent profiling history
So that I can quickly re-access previous results without re-uploading files

**Success Looks Like:**
Click "History" → See last 10 profiles with filename, date, key stats → Click to restore full profile view.

## 2. Context & Constraints (Required)

**Background:**
Currently, refreshing the page loses all profiling work. Users must re-upload files to see results again. Profile history would:
- Enable quick access to recent work
- Support comparison between historical profiles
- Reduce redundant profiling of same files
- Persist across browser sessions

**Scope:**
- **In Scope:**
  - Store last 20 profiles in IndexedDB
  - Show history panel with previews
  - Click to restore full profile
  - Delete individual history items
  - Clear all history option
  - Storage quota management (~50MB limit)
  - Export history to JSON backup

- **Out of Scope:**
  - Cloud sync of history
  - Search within historical profiles
  - Automatic re-profiling on file change
  - Raw data storage (profiles only)

**Constraints:**
- IndexedDB storage limit varies by browser (~50MB-100MB)
- Must handle quota exceeded gracefully
- Privacy: all data stays local
- No PII in stored profiles

## 3. Acceptance Criteria (Required)

**Scenario: Auto-save profile**
Given I have just profiled a file
When profiling completes
Then the profile is automatically saved to history
And history shows the new entry at top

**Scenario: View history**
Given I have profiled 5 files previously
When I click "History" button
Then I see 5 entries with filename, date, row count, column count
And entries are sorted newest-first

**Scenario: Restore from history**
Given I have a profile in history
When I click on it
Then the full profile is restored
And I can view all statistics, histograms, etc.

**Scenario: Delete history item**
Given I have a profile in history
When I click the delete icon on that item
Then the item is removed from history
And storage is freed

**Scenario: Storage quota**
Given history storage is near limit (>45MB)
When I profile a new file
Then oldest profiles are auto-deleted to make room
And a toast warns "Removed old profiles to save space"

**Scenario: Compare with history**
Given I have a current profile and a historical profile
When I select "Compare with history" and choose a historical entry
Then I see the diff view between current and historical

## 4. AI Execution Instructions (Required)

**Allowed to Change:**
- Create `src/app/stores/historyStore.ts`
- Create `src/app/components/HistoryPanel.tsx`
- Create `src/app/utils/indexedDb.ts`
- Modify ProfileReport to add History button
- Modify profileStore to auto-save on complete

**Must NOT Change:**
- Profile computation logic
- Raw data handling (never store raw data)
- Export formats

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)

- feat(history): add IndexedDB storage utility
- feat(history): add historyStore with CRUD operations
- feat(history): add HistoryPanel component
- feat(history): auto-save profiles on completion
- feat(history): add storage quota management
- feat(history): add compare with history feature

## 6. Verification & Definition of Done (Required)

- [ ] Profiles auto-save to IndexedDB
- [ ] History panel shows recent profiles
- [ ] Click restores full profile view
- [ ] Can delete individual items
- [ ] Storage quota handled gracefully
- [ ] Works after browser restart
- [ ] Can export history as backup
- [ ] Compare with history works

## 7. Technical Design

### IndexedDB Schema

```typescript
interface StoredProfile {
  id: string;              // UUID
  filename: string;
  profiledAt: string;      // ISO timestamp
  rowCount: number;
  columnCount: number;
  healthScore: number;
  sizeBytes: number;       // Storage size of this entry
  profile: ProfileResult;  // Full profile data (sanitized)
}
```

### Storage Management

```typescript
const MAX_STORAGE_MB = 50;
const MAX_ENTRIES = 20;

async function saveToHistory(profile: ProfileResult, filename: string) {
  const db = await openHistoryDb();

  // Check current usage
  const usage = await getStorageUsage(db);
  const newSize = estimateSize(profile);

  // Remove old entries if needed
  while (usage + newSize > MAX_STORAGE_MB * 1024 * 1024) {
    await removeOldestEntry(db);
    usage = await getStorageUsage(db);
  }

  // Remove if exceeds entry count
  const count = await getEntryCount(db);
  if (count >= MAX_ENTRIES) {
    await removeOldestEntry(db);
  }

  await db.add('profiles', {
    id: crypto.randomUUID(),
    filename,
    profiledAt: new Date().toISOString(),
    rowCount: profile.total_rows,
    columnCount: profile.column_profiles.length,
    healthScore: calculateHealthScore(profile),
    sizeBytes: newSize,
    profile: sanitizeForStorage(profile)
  });
}
```

### History Panel UI

```tsx
<HistoryPanel>
  <HistoryHeader>
    <Title>Recent Profiles</Title>
    <ClearAllButton />
  </HistoryHeader>

  <HistoryList>
    {histories.map(h => (
      <HistoryItem
        filename={h.filename}
        date={h.profiledAt}
        stats={`${h.rowCount} rows, ${h.columnCount} cols`}
        healthScore={h.healthScore}
        onClick={() => restore(h)}
        onDelete={() => remove(h.id)}
      />
    ))}
  </HistoryList>

  <ExportButton onClick={exportHistory} />
</HistoryPanel>
```

### Sanitization (Remove Sensitive Data)

```typescript
function sanitizeForStorage(profile: ProfileResult): ProfileResult {
  return {
    ...profile,
    column_profiles: profile.column_profiles.map(col => ({
      ...col,
      sample_values: [],     // Remove raw samples
      missing_rows: [],      // Remove row indices
      pii_rows: [],
      outlier_rows: []
    }))
  };
}
```

## 8. Resources

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [idb library](https://github.com/jakearchibald/idb) (lightweight wrapper)
- [Storage Quota API](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)
