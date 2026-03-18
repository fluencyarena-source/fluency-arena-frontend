/* ═══════════════════════════════════════════════════════
   FLUENCY ARENA — API Connector
   Drop this file alongside index.html
   Then add <script src="api.js"></script> in your HTML
   
   Set FA_API_URL to your Railway backend URL:
   const FA_API_URL = 'https://your-app.up.railway.app/api';
═══════════════════════════════════════════════════════ */

const FA_API_URL = 'http://localhost:5000/api'; // ← change to Railway URL when deployed

/* ── Token helpers ── */
const FAApi = {
  _token: () => localStorage.getItem('fa_jwt'),
  _setToken: (t) => t ? localStorage.setItem('fa_jwt', t) : localStorage.removeItem('fa_jwt'),

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    const t = this._token();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  },

  async _fetch(method, path, body) {
    try {
      const opts = { method, headers: this._headers() };
      if (body) opts.body = JSON.stringify(body);
      const res  = await fetch(FA_API_URL + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    } catch (err) {
      console.error('API error:', path, err.message);
      throw err;
    }
  },

  get:    (path)        => FAApi._fetch('GET',    path),
  post:   (path, body)  => FAApi._fetch('POST',   path, body),
  put:    (path, body)  => FAApi._fetch('PUT',    path, body),
  delete: (path)        => FAApi._fetch('DELETE', path),

  /* ── Auth ── */
  async signup(firstName, lastName, email, mobile, password) {
    const d = await this.post('/auth/signup', { firstName, lastName, email, mobile, password });
    this._setToken(d.token);
    this._saveSession(d.user);
    return d;
  },

  async login(email, password) {
    const d = await this.post('/auth/login', { email, password });
    this._setToken(d.token);
    this._saveSession(d.user);
    return d;
  },

  async googleAuth(credential) {
    const d = await this.post('/auth/google', { credential });
    this._setToken(d.token);
    this._saveSession(d.user);
    return d;
  },

  async sendOtp(mobile)         { return this.post('/auth/send-otp',    { mobile }); },
  async verifyOtp(mobile, otp)  { return this.post('/auth/verify-otp',  { mobile, otp }); },
  async getMe()                 { return this.get('/auth/me'); },
  async completeProfile(data)   { const d = await this.post('/auth/complete-profile', data); this._setToken(d.token); this._saveSession(d.user); return d; },
  async deleteAccount(password) { return this.post('/auth/delete-account', { password }); },

  logout() {
    this._setToken(null);
    localStorage.removeItem('fa_session');
  },

  /* ── User / Profile ── */
  async getProfile()              { return this.get('/users/profile'); },
  async updateProfile(data)       { return this.put('/users/profile', data); },
  async updateAccount(data)       { return this.put('/users/account', data); },
  async changePassword(newPassword) { return this.put('/users/password', { newPassword }); },
  async subscribe(plan)           { const d = await this.post('/users/subscribe', { plan }); this._saveSession(d.user); return d; },
  async unsubscribe()             { return this.post('/users/unsubscribe'); },

  /* Admin user management */
  async getAllUsers()              { return this.get('/users'); },
  async changeRole(id, role)      { return this.put('/users/' + id + '/role',  { role }); },
  async changePlan(id, plan)      { return this.put('/users/' + id + '/plan',  { plan }); },
  async removeUser(id)            { return this.delete('/users/' + id); },

  /* ── Progress ── */
  async getProgress()             { return this.get('/progress'); },
  async saveProgress(data)        { return this.put('/progress', data); },
  async clearSpeakingHistory()    { return this.delete('/progress/speaking'); },

  /* ── Reviews ── */
  async getReviews()              { return this.get('/reviews'); },
  async submitReview(data)        { return this.post('/reviews', data); },
  async getAdminReviews()         { return this.get('/reviews/admin'); },
  async deleteReview(id)          { return this.delete('/reviews/' + id); },

  /* ── Payments ── */
  async createOrder(plan)         { return this.post('/payments/create-order', { plan }); },
  async verifyPayment(data)       { return this.post('/payments/verify', data); },
  async getPayments()             { return this.get('/payments'); },

  /* ── Announcements ── */
  async getAnnouncements()        { return this.get('/announcements'); },
  async createAnnouncement(data)  { return this.post('/announcements', data); },
  async deleteAnnouncement(id)    { return this.delete('/announcements/' + id); },

  /* ── Feedback ── */
  async submitFeedback(type, message) { return this.post('/feedback', { type, message }); },
  async getFeedback()             { return this.get('/feedback'); },

  /* ── Polls ── */
  async getPolls()                { return this.get('/polls'); },
  async createPoll(data)          { return this.post('/polls', data); },
  async vote(pollId, option)      { return this.post('/polls/' + pollId + '/vote', { option }); },

  /* ── Admin ── */
  async getStats()                { return this.get('/admin/stats'); },
  async getSignupLogs()           { return this.get('/admin/signup-logs'); },
  async getLogs()                 { return this.get('/admin/logs'); },
  async expireSubscriptions()     { return this.post('/admin/expire-subscriptions'); },

  /* ── Session helpers (mirrors localStorage FA module) ── */
  _saveSession(user) {
    if (user) localStorage.setItem('fa_session', JSON.stringify(user));
  },

  currentUser() {
    try { return JSON.parse(localStorage.getItem('fa_session')); } catch { return null; }
  },

  isLoggedIn() { return !!this._token() && !!this.currentUser(); },

  isPlanActive(user) {
    const u = user || this.currentUser();
    if (!u) return false;
    if (['administrator', 'teacher'].includes(u.role)) return true;
    if (u.plan === 'free' || !u.plan_expiry) return false;
    return new Date(u.plan_expiry) > new Date();
  }
};

/* ── Health check on load ── */
(async () => {
  try {
    const res = await fetch(FA_API_URL.replace('/api', '') + '/health');
    if (res.ok) console.log('[FA API] Connected ✅');
  } catch {
    console.warn('[FA API] Backend not reachable — running on localStorage fallback');
  }
})();
