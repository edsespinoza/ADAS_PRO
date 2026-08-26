# NEW-VULN-001: Authentication Bypass via User Lookup Failure

**SEVERITY**: CRITICAL
**TITLE**: `_validateSessionRole()` Bypass When User Not Found in `_users` Dictionary
**DESCRIPTION**: The `_validateSessionRole(session)` function at lines 470-478 fails to deny access when the provided `session.userId` does not exist in the `_users` dictionary. The JavaScript short-circuit evaluation causes the entire validation to return `true` when the user object is undefined, allowing forged sessions with arbitrary userIds and elevated roles to pass validation.
**EXPLOIT STEPS**:
1. Open browser console in offline mode (after 5s timeout or when Supabase unreachable)
2. Craft session object: `{ userId: 'nonexistent-user-123', role: 'superadmin', expiresAt: Date.now() + 3600000 }`
3. Inject into localStorage: `localStorage.setItem('adaspro_session', JSON.stringify(session))`
4. Call `AUTH.getSession()` → returns the forged session (line 477 returns true)
5. Call `AUTH.requireAuth('superadmin')` → passes validation → access granted to superadmin panel
6. Full admin control without any credentials
**FILE:LINE**: `js/auth.js:470-478`
**REMEDIATION**: Modify `_validateSessionRole` to return `false` when `!user` (user not found):
```javascript
function _validateSessionRole(session) {
    if (!session) return false;
    const user = _users[session.userId];
    if (!user) return false;  // ← Add this line
    if (user.role !== session.role) {
        localStorage.removeItem(SESSION_KEY);
        return false;
    }
    return true;
}
```

---

# NEW-VULN-002: Race Condition in Session Initialization

**SEVERITY**: HIGH
**TITLE**: `_sbLoadAll()` Overwrites In-Memory User Data After Timeout Fallback
**DESCRIPTION**: The `_sbLoadAll()` function (line 395) continues running asynchronously after the 15s timeout catch block executes. When it completes, it overwrites the in-memory `_users` dictionary with database data (line 130), potentially changing user roles, deleting users, or corrupting permissions while the session is active. This creates a window where the session was validated against one user state but now operates against a completely different state.
**EXPLOIT STEPS**:
1. Configure Supabase connection with intentionally slow network (50+ second latency)
2. Initiate login with valid credentials
3. After 15s timeout fires, offline mode activates, session restored from cache
4. User is now logged in with restored session and offline user data
5. 45 seconds later, `_sbLoadAll()` completes and overwrites `_users` with DB data
6. If user's role was downgraded in DB between steps 1 and 5, the user now has unexpected role in memory
7. On next `requireAuth()` call, validation may fail or succeed depending on new `_users` state
**FILE:LINE**: `js/auth.js:395` (init inner async), `js/auth.js:130` (_sbLoadAll overwrite)
**REMEDIATION**: Add cancellation flag or guard to prevent `_sbLoadAll()` from overwriting after timeout:
```javascript
let _sbAborted = false;
// In init():
.catch((e) => { _sbAborted = true; _mode = 'local'; ... })
// In _sbLoadAll():
if (_sbAborted || _mode !== 'supabase') return;  // Don't overwrite after abort
```

---

# NEW-VULN-003: Unvalidated Pending User Data Injection

**SEVERITY**: HIGH
**TITLE**: Pending User Sync Spreads Arbitrary localStorage Fields Without Validation
**DESCRIPTION**: When syncing a pending user from localStorage (lines 569-575), the entire `adaspro_pending_user` object is spread into `syncUser` without field validation. An attacker who can inject localStorage data (via XSS or another tab) can escalate privileges by planting `role: 'admin'` or `status: 'approved'` fields that are used in-memory before the database validation via `_sbLoadAll()`.
**EXPLOIT STEPS**:
1. Obtain XSS on any ADAS PRO page (or exploit existing DOM vulnerability)
2. Inject into localStorage: `localStorage.setItem('adaspro_pending_user', JSON.stringify({ name: 'Attacker', email: 'attacker@test.com', role: 'admin', status: 'approved' }))`
3. User logs in with their real credentials
4. `_loadFromLocalStorage()` populates `_users` with pending user data (line 568)
5. Pending sync code (line 575) spreads the planted object: `syncUser = { ...pending, id: data.user.id }`
6. In-memory `_users[data.user.id]` now has `role: 'admin'`
7. Login code (line 624) checks `user.role` and redirects to admin panel
8. `_sbLoadAll()` subsequently corrects the database, but brief admin access is achieved
**FILE:LINE**: `js/auth.js:569-575`
**REMEDIATION**: Validate and whitelist fields from pending user sync:
```javascript
syncUser = {
    id: data.user.id,
    name: (pending.name || '').trim().substring(0, 100),
    email: (pending.email || '').trim().substring(0, 255),
    role: 'membro',  // Force default role
    status: 'pending',  // Force pending status
    planId: 'free',  // Force free plan
    phone: (pending.phone || '').trim().substring(0, 20)
};
```

---

# NEW-VULN-004: State Leak After Demo Mode Logout

**SEVERITY**: HIGH
**TITLE**: `logout()` Fails to Reset `_demo` and `_mode` Flags
**DESCRIPTION**: The `logout()` function (lines 788-801) clears the session and localStorage but does not reset the `_demo` or `_mode` flags. After `enterDemoMode()` sets `_demo=true, _mode='local'`, calling `logout()` leaves these flags in an inconsistent state. This creates a window where `getSession()` falls through to localStorage read even when Supabase is configured, allowing localStorage-based session hijacking.
**EXPLOIT STEPS**:
1. Admin calls `AUTH.enterDemoMode()` to test demo data
2. Demo mode activates: `_demo=true, _mode='local'`
3. Admin calls `AUTH.logout()` without realizing it doesn't reset flags
4. After logout, state remains: `_demo=true, _sbConfigured=true`
5. Attacker injects forged session into localStorage via XSS
6. Next `getSession()` call: `(_mode === 'supabase' || (_sbConfigured && !_demo))` evaluates to `(false || (true && false))` → false
7. Falls through to localStorage read → attacker's session loaded
8. Page redirects based on attacker's session role
**FILE:LINE**: `js/auth.js:788-801`
**REMEDIATION**: Reset all flags in `logout()`:
```javascript
async function logout() {
    try {
        // ... existing cleanup ...
        _currentSession = null;
        _demo = false;
        _mode = 'supabase';  // Reset to default
    } catch(e) { console.error('Logout error:', e); }
}
```

---

# NEW-VULN-005: Unprotected JSON.parse in Settings and Content Retrieval

**SEVERITY**: MEDIUM
**TITLE**: `getSettings()` and `getContent()` Lack try/catch Around JSON.parse
**DESCRIPTION**: Both `getSettings()` (line 1213) and `getContent()` (line 1049) use `JSON.parse()` without try/catch blocks. If localStorage contains corrupted or invalid JSON (via XSS, storage failure, or manual injection), these functions throw `SyntaxError` and crash every dependent function in the admin panel and member area.
**EXPLOIT STEPS**:
1. Inject invalid JSON into localStorage: `localStorage.setItem('adaspro_settings', '{invalid json')`
2. Call any function that depends on settings: `AUTH.getSettings()`, `AUTH.getContentForUser()`, `AUTH.canViewContent()`, `AUTH.setUserPlan()`, `AUTH.approveUser()`
3. All functions throw SyntaxError → entire admin panel becomes non-functional
4. Member area crashes when trying to view content
5. User must manually clear localStorage to recover
**FILE:LINE**: `js/auth.js:1213` (getSettings), `js/auth.js:1049` (getContent)
**REMEDIATION**: Add try/catch with fallback defaults:
```javascript
function getSettings() {
    try {
        const r = localStorage.getItem(SETTINGS_KEY);
        return r ? JSON.parse(r) : { ...DEFAULT_SETTINGS };
    } catch (e) {
        console.error('Corrupted settings, resetting to defaults:', e);
        localStorage.removeItem(SETTINGS_KEY);
        return { ...DEFAULT_SETTINGS };
    }
}
```

---

# NEW-VULN-006: Offline Mode User Creation Without Auth Check

**SEVERITY**: MEDIUM
**TITLE**: `createUserDirect()` Accepts Arbitrary Role in Offline Mode
**DESCRIPTION**: The `createUserDirect()` function (lines 991-1039) does not validate caller authorization. In offline/local mode, it accepts any `role` parameter without checking if the current user has permission to create users of that role. Combined with XSS, an attacker can create superadmin users directly.
**EXPLOIT STEPS**:
1. Obtain XSS on any ADAS PRO page
2. Call `AUTH.createUserDirect('Attacker', 'admin@test.com', 'password123', { role: 'superadmin' })`
3. Function creates the user in `_users` with `role: 'superadmin'`
4. Attacker logs in with created credentials → full superadmin access
5. In online mode, RLS would prevent this, but offline mode has no such protection
**FILE:LINE**: `js/auth.js:991-1039`
**REMEDIATION**: Add internal auth check at function start:
```javascript
function createUserDirect(name, email, password, options = {}) {
    const currentSession = getSession();
    if (!currentSession || !['admin','superadmin'].includes(getRole(currentSession))) {
        throw new Error('Permissão negada');
    }
    // ... rest of function
}
```

---

# NEW-VULN-007: Password Hash Export

**SEVERITY**: LOW
**TITLE**: `exportData()` Includes Password Hashes in Export
**DESCRIPTION**: The `exportData()` function (line 1317) exports the entire `_users` dictionary, which includes `passwordHash` fields for all users. If the exported JSON file is leaked or shared, attackers obtain all password hashes for offline brute-force attacks.
**EXPLOIT STEPS**:
1. Admin calls `AUTH.exportData()` to backup user data
2. JSON file contains all users with their passwordHash values
3. File is accidentally shared, uploaded to public repo, or intercepted
4. Attacker extracts all password hashes
5. Attacker performs offline brute-force attacks against PBKDF2 hashes (100k iterations)
6. If weak passwords are used, hashes are cracked within hours/days
**FILE:LINE**: `js/auth.js:1317`
**REMEDIATION**: Strip sensitive fields before export:
```javascript
function exportData() {
    const safeUsers = Object.fromEntries(
        Object.entries(_users).map(([id, user]) => [
            id,
            { ...user, passwordHash: undefined }  // Remove hash
        ])
    );
    const data = { users: safeUsers, ... };
    // ...
}
```

---

# NEW-VULN-008: Client-Side Rate Limit Bypass

**SEVERITY**: LOW
**TITLE**: Login Rate Limiting Enforced Only in localStorage
**DESCRIPTION**: Rate limiting for login attempts (lines 294-316) is stored entirely in localStorage and enforced only in the browser. It can be bypassed by clearing localStorage, using multiple email addresses, or attacking from different browser sessions.
**EXPLOIT STEPS**:
1. Attempt to login with wrong password 5 times → rate limit triggered
2. Clear localStorage: `localStorage.removeItem('adaspro_ratelimit')`
3. Rate limit resets → can attempt 5 more passwords
4. Alternatively, use different email addresses for each attempt
5. Brute-force password without effective rate limiting
**FILE:LINE**: `js/auth.js:294-316`
**REMEDIATION**: Implement server-side rate limiting in Edge Functions:
- Add rate limit tracking in Supabase database or Redis
- Enforce limits in `approve-user` or dedicated rate-limit Edge Function
- Client-side rate limit can remain as UX convenience but not security control

---

# Summary

| ID | Severity | Title |
|---|---|---|
| NEW-VULN-001 | CRITICAL | Authentication Bypass via User Lookup Failure |
| NEW-VULN-002 | HIGH | Race Condition in Session Initialization |
| NEW-VULN-003 | HIGH | Unvalidated Pending User Data Injection |
| NEW-VULN-004 | HIGH | State Leak After Demo Mode Logout |
| NEW-VULN-005 | MEDIUM | Unprotected JSON.parse in Settings and Content |
| NEW-VULN-006 | MEDIUM | Offline Mode User Creation Without Auth Check |
| NEW-VULN-007 | LOW | Password Hash Export |
| NEW-VULN-008 | LOW | Client-Side Rate Limit Bypass |

**Total vulnerabilities found: 8** (1 CRITICAL, 3 HIGH, 2 MEDIUM, 2 LOW)

All findings are NEW vulnerabilities not covered in the previous security audit. The most critical fix needed is NEW-VULN-001, which allows complete authentication bypass in offline mode with a single localStorage injection.