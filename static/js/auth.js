/**
 * auth.js — SmartCare EMR
 *
 * Single responsibility per section:
 *   Auth          → IIFE module: token storage, refresh, logout, apiFetch
 *   DOMContentLoaded → mounts the login form handler (index.html only)
 *
 * Used on login page:  <script src="/static/js/auth.js"></script>
 * Used on app pages:   <script src="/static/js/auth.js"></script>
 *                      Auth.requireAuth();
 */

const Auth = (() => {

  const KEY_TOKEN   = 'emr_token';
  const KEY_REFRESH = 'emr_refresh';
  const KEY_USER    = 'emr_user';

  let _token        = localStorage.getItem(KEY_TOKEN)   || null;
  let _refreshToken = localStorage.getItem(KEY_REFRESH) || null;
  let _user         = JSON.parse(localStorage.getItem(KEY_USER) || 'null');
  let _refreshTimer = null;

  /* ── Decode JWT payload (no signature check needed client-side) ── */
  function _decodePayload(jwt) {
    try {
      const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64));
    } catch {
      return null;
    }
  }

  /* ── Persist tokens + user, then schedule the next silent refresh ── */
  function _storeSession(accessToken, refreshToken, user) {
    _token        = accessToken;
    _refreshToken = refreshToken || null;
    _user         = user;
    localStorage.setItem(KEY_TOKEN,   _token);
    localStorage.setItem(KEY_REFRESH, _refreshToken || '');
    localStorage.setItem(KEY_USER,    JSON.stringify(_user));
    _scheduleRefresh();
  }

  /* ── Schedule a silent refresh 60 s before the access token expires ── */
  function _scheduleRefresh() {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    const payload = _decodePayload(_token);
    if (!payload) return;
    const delay = Math.max((payload.exp * 1000) - Date.now() - 60_000, 0);
    _refreshTimer = setTimeout(_silentRefresh, delay);
  }

  /* ── Exchange refresh token for a fresh access token ── */
  async function _silentRefresh() {
    if (!_refreshToken) { logout(); return; }
    try {
      const res = await fetch('/api/token/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh: _refreshToken }),
      });
      if (!res.ok) { logout(); return; }
      const data = await res.json();
      _storeSession(data.token, data.refresh, _user);
    } catch {
      logout();
    }
  }

  /* ── Wipe session and send user to the login page ── */
  function logout() {
    if (_refreshToken) {
      fetch('/api/logout', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${_token}`,
        },
        body: JSON.stringify({ refresh: _refreshToken }),
      }).catch(() => {});
    }
    if (_refreshTimer) clearTimeout(_refreshTimer);
    _token = _refreshToken = _user = null;
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_REFRESH);
    localStorage.removeItem(KEY_USER);
    window.location.href = '/';
  }

  /* ── Public API ── */
  return {

    /**
     * Call at the top of every protected page.
     * Returns false and redirects to login if no valid session.
     */
    requireAuth() {
      if (!_token || !_user) {
        window.location.href = '/';
        return false;
      }
      _scheduleRefresh();
      return true;
    },

    getUser()         { return _user; },
    getToken()        { return _token; },
    getRefreshToken() { return _refreshToken; },

    /** Authenticated fetch — retries once after a silent refresh on 401. */
    async apiFetch(path, opts = {}) {
      const doFetch = (t) => fetch(path, {
        ...opts,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${t}`,
          ...(opts.headers || {}),
        },
      });

      let res = await doFetch(_token);

      if (res.status === 401 && _refreshToken) {
        await _silentRefresh();
        if (!_token) return null;
        res = await doFetch(_token);
        if (res.status === 401) { logout(); return null; }
      } else if (res.status === 401) {
        logout();
        return null;
      }

      return res.json();
    },

    logout,

    updateUser(updates) {
      _user = { ..._user, ...updates };
      localStorage.setItem(KEY_USER, JSON.stringify(_user));
    },

    /** Expose for the login form handler below */
    _storeSession,
    _scheduleRefresh,
  };

})();

/* ════════════════════════════════════════════════════════════
   LOGIN FORM HANDLER  — only active on index.html
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  const form   = document.getElementById('login-form');
  if (!form) return; /* not the login page — nothing to do */

  const errBox = document.getElementById('l-err');
  const btn    = document.getElementById('signin-btn');

  /* Already logged in → go straight to the app */
  const savedToken = localStorage.getItem('emr_token');
  const savedUser  = JSON.parse(localStorage.getItem('emr_user') || 'null');
  if (savedToken && savedUser) {
    window.location.href = '/app';
    return;
  }

  /* ── Submit handler ── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('l-user').value.trim();
    const password = document.getElementById('l-pass').value;

    showErr('');

    if (!username || !password) {
      showErr('Please enter your username and password.');
      return;
    }

    setLoading(true);

    try {
      const res  = await fetch('/api/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showErr(data.error || 'Invalid username or password.');
        return;
      }

      /* Validate role before storing anything */
      const allowedRoles = ['doctor', 'nurse', 'admin'];
      if (!allowedRoles.includes(data.user.role)) {
        showErr('Your account has an unrecognised role. Contact your administrator.');
        return;
      }

      /* Persist session via Auth module */
      Auth._storeSession(data.token, data.refresh, data.user);

      /* Every role lands on the same app shell; the shell renders the
         correct dashboard based on the stored role. */
      window.location.href = '/app';

    } catch {
      showErr(
        'Cannot reach the server. ' +
        'If on the free Render plan, wait 30 s for it to wake up, then try again.'
      );
    } finally {
      setLoading(false);
    }
  });

  /* ── Helpers ── */
  function showErr(msg) {
    errBox.textContent   = msg;
    errBox.style.display = msg ? 'block' : 'none';
  }

  function setLoading(on) {
    btn.disabled  = on;
    btn.innerHTML = on
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…'
      : '<i class="fa-solid fa-sign-in-alt"></i> Sign In';
  }
});
