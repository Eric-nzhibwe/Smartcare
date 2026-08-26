/* ============================================================
   SMARTCARE AI  — Groq-powered assistant
   Professional UI  ·  Works for doctor / nurse / admin
   ============================================================ */

/* ── State ── */
let _aiMessages  = [];
let _aiSending   = false;
let _aiTab       = 'chat';
let _aiInsight   = { content: '', loading: false, error: '' };

/* ── Role config ── */
const AI_CFG = {
  doctor: {
    color:           'var(--primary)',
    colorHex:        '#0f4c81',
    colorLight:      'var(--primary-ghost)',
    gradientFrom:    '#0f4c81',
    gradientTo:      '#1a69b3',
    label:           'Clinical AI Assistant',
    subtitle:        'Differential diagnoses · Decision support',
    icon:            'fa-user-doctor',
    insightLabel:    'Clinical Insights',
    insightIcon:     'fa-stethoscope',
    insightEndpoint: '/api/ai/doctor-insights',
    suggestions: [
      { icon: 'fa-heart-pulse',     text: 'Common causes of chest pain in adults?' },
      { icon: 'fa-droplet',         text: 'How do I manage hypertensive urgency?' },
      { icon: 'fa-lungs',           text: 'Investigations for suspected pulmonary TB?' },
      { icon: 'fa-circle-radiation',text: 'Differential diagnosis for acute abdomen?' },
    ],
  },
  nurse: {
    color:           'var(--accent)',
    colorHex:        '#00a878',
    colorLight:      'var(--accent-light)',
    gradientFrom:    '#00a878',
    gradientTo:      '#00956a',
    label:           'Triage AI Assistant',
    subtitle:        'Patient care coordination · Triage support',
    icon:            'fa-user-nurse',
    insightLabel:    'Triage Summary',
    insightIcon:     'fa-clipboard-list',
    insightEndpoint: '/api/ai/triage',
    suggestions: [
      { icon: 'fa-heart',           text: 'Normal vital sign ranges for adults?' },
      { icon: 'fa-triangle-exclamation', text: 'When should I escalate a patient urgently?' },
      { icon: 'fa-lungs-virus',     text: 'How to manage SpO₂ below 92%?' },
      { icon: 'fa-bacterium',       text: 'Early warning signs of sepsis during triage?' },
    ],
  },
  admin: {
    color:           'var(--warn)',
    colorHex:        '#d97706',
    colorLight:      'var(--warn-light)',
    gradientFrom:    '#d97706',
    gradientTo:      '#b45309',
    label:           'Health Analytics AI',
    subtitle:        'Operational insights · System performance',
    icon:            'fa-shield-halved',
    insightLabel:    'System Insights',
    insightIcon:     'fa-chart-line',
    insightEndpoint: '/api/ai/admin',
    suggestions: [
      { icon: 'fa-database',        text: 'How can I improve EMR data quality?' },
      { icon: 'fa-chart-bar',       text: 'What metrics indicate a well-performing facility?' },
      { icon: 'fa-calendar-check',  text: 'How to improve patient follow-up compliance?' },
      { icon: 'fa-arrow-trend-up',  text: 'How to interpret encounter volume trends?' },
    ],
  },
};

/* ═══════════════════════════════════════
   Entry point
   ═══════════════════════════════════════ */
function navigateAI() {
  const role = currentUser?.role || 'doctor';
  const cfg  = AI_CFG[role] || AI_CFG.doctor;
  currentPage = 'ai';
  document.getElementById('page-title').textContent = cfg.label;
  if (typeof setActiveNav === 'function') setActiveNav('ai');
  _aiMessages = [];
  _aiTab      = 'chat';
  _aiInsight  = { content: '', loading: false, error: '' };
  _renderAIShell(cfg, role);
  _aiAddWelcome(cfg);
}

/* ═══════════════════════════════════════
   Shell
   ═══════════════════════════════════════ */
function _renderAIShell(cfg, role) {
  document.getElementById('page-content').innerHTML = `
  <div id="ai-shell">

    <!-- ── Hero header ── -->
    <div class="ai-hero">
      <div class="ai-hero__glow" style="background:linear-gradient(135deg,${cfg.gradientFrom}22,${cfg.gradientTo}11)"></div>
      <div class="ai-hero__inner">
        <div class="ai-hero__icon" style="background:linear-gradient(135deg,${cfg.gradientFrom},${cfg.gradientTo})">
          <i class="fa-solid ${cfg.icon}"></i>
        </div>
        <div class="ai-hero__text">
          <h1 class="ai-hero__title">${cfg.label}</h1>
          <p class="ai-hero__sub">
            <span class="ai-status-dot"></span>
            <span>${cfg.subtitle}</span>
            <span class="ai-hero__divider">·</span>
            <span class="ai-hero__meta-badge">
              <i class="fa-solid fa-bolt" style="font-size:9px"></i>
              Groq · GPT-OSS 120B
            </span>
          </p>
        </div>
        <div class="ai-hero__actions">
          <button class="ai-icon-btn" onclick="_clearAIChat()" title="New conversation">
            <i class="fa-solid fa-rotate-right"></i>
            <span>New Chat</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── Tab bar ── -->
    <div class="ai-tabs" role="tablist">
      <button id="ai-tab-chat" role="tab" aria-selected="${_aiTab === 'chat'}"
        class="ai-tab ${_aiTab === 'chat' ? 'ai-tab--active' : ''}"
        style="${_aiTab === 'chat' ? `--tab-color:${cfg.colorHex}` : ''}"
        onclick="_switchAITab('chat','${role}')">
        <i class="fa-solid fa-comments"></i>
        <span>AI Chat</span>
      </button>
      <button id="ai-tab-insights" role="tab" aria-selected="${_aiTab === 'insights'}"
        class="ai-tab ${_aiTab === 'insights' ? 'ai-tab--active' : ''}"
        style="${_aiTab === 'insights' ? `--tab-color:${cfg.colorHex}` : ''}"
        onclick="_switchAITab('insights','${role}')">
        <i class="fa-solid ${cfg.insightIcon}"></i>
        <span>${cfg.insightLabel}</span>
      </button>
    </div>

    <!-- ── Chat panel ── -->
    <div id="ai-chat-panel" class="ai-chat-panel" style="display:${_aiTab === 'chat' ? 'flex' : 'none'}">

      <!-- messages -->
      <div id="ai-messages" class="ai-messages"></div>

      <!-- input area -->
      <div class="ai-input-area">
        <div class="ai-input-row">
          <div class="ai-input-wrap" style="--focus-color:${cfg.colorHex}">
            <textarea id="ai-input" rows="1"
              placeholder="Ask SmartCare AI…"
              class="ai-textarea"
              onkeydown="_aiInputKeydown(event,'${role}')"
              oninput="_aiAutoResize(this)"></textarea>
            <div class="ai-input-hint">
              <i class="fa-solid fa-keyboard"></i> Enter to send &nbsp;·&nbsp; Shift+Enter for newline
            </div>
          </div>
          <button id="ai-send-btn"
            class="ai-send-btn"
            style="background:linear-gradient(135deg,${cfg.gradientFrom},${cfg.gradientTo})"
            onclick="_sendAIMessage(null,'${role}')"
            title="Send message (Enter)">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <p class="ai-disclaimer">
          <i class="fa-solid fa-shield-halved"></i>
          AI responses are for clinical support only — not a substitute for professional judgement.
        </p>
      </div>
    </div>

    <!-- ── Insights panel ── -->
    <div id="ai-insights-panel" class="ai-insights-panel" style="display:${_aiTab === 'insights' ? 'flex' : 'none'}">
      ${_renderInsightsPanel(cfg, role)}
    </div>

  </div>`;

  _renderSuggestions(cfg, role);
}

/* ═══════════════════════════════════════
   Suggestion chips
   ═══════════════════════════════════════ */
function _renderSuggestions(cfg, role) {
  const el = document.getElementById('ai-messages');
  if (!el || _aiMessages.length > 1) return;

  const chips = cfg.suggestions.map(s => `
    <button class="ai-chip"
      style="--chip-color:${cfg.colorHex}"
      onclick="_sendAIMessage(${JSON.stringify(s.text)},'${role}')">
      <span class="ai-chip__icon"><i class="fa-solid ${s.icon}"></i></span>
      <span class="ai-chip__text">${s.text}</span>
      <i class="fa-solid fa-arrow-right ai-chip__arrow"></i>
    </button>`).join('');

  const div = document.createElement('div');
  div.id = 'ai-suggestions';
  div.className = 'ai-suggestions';
  div.innerHTML = `
    <p class="ai-suggestions__label">
      <i class="fa-solid fa-lightbulb"></i> Suggested questions
    </p>
    <div class="ai-chips-grid">${chips}</div>`;
  el.appendChild(div);
}

/* ═══════════════════════════════════════
   Welcome message
   ═══════════════════════════════════════ */
function _aiAddWelcome(cfg) {
  _aiMessages = [{
    role:    'assistant',
    content: `Hello! I'm **SmartCare AI**, your ${cfg.subtitle.toLowerCase()}.\n\nHow can I assist you today?`,
    ts:      new Date(),
  }];
  _renderAIMessages(cfg);
}

/* ═══════════════════════════════════════
   Render messages
   ═══════════════════════════════════════ */
function _renderAIMessages(cfg) {
  const el = document.getElementById('ai-messages');
  if (!el) return;

  const suggestHtml = _aiMessages.length <= 1
    ? (document.getElementById('ai-suggestions')?.outerHTML || '') : '';

  el.innerHTML = _aiMessages.map(m => _renderBubble(m, cfg)).join('') + suggestHtml;
  el.scrollTop = el.scrollHeight;
}

/* ── Single bubble ── */
function _renderBubble(m, cfg) {
  const isUser = m.role === 'user';
  const time   = m.ts
    ? m.ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (m.isLoading) {
    return `
    <div class="ai-bubble-row ai-bubble-row--ai">
      <div class="ai-avatar ai-avatar--ai" style="background:${cfg.colorHex}18;color:${cfg.colorHex}">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="ai-bubble ai-bubble--ai">
        <div class="ai-typing">
          <span class="ai-dot"></span>
          <span class="ai-dot" style="animation-delay:.18s"></span>
          <span class="ai-dot" style="animation-delay:.36s"></span>
        </div>
      </div>
    </div>`;
  }

  const bodyHtml = `<div class="ai-bubble__text">${_fmtAIText(m.content)}</div>
    <div class="ai-bubble__footer">
      <span class="ai-bubble__time">${time}</span>
      ${!isUser ? `<button class="ai-copy-btn" onclick="_copyAIMsg(this)" title="Copy response">
        <i class="fa-regular fa-copy"></i>
      </button>` : ''}
    </div>`;

  if (isUser) return `
    <div class="ai-bubble-row ai-bubble-row--user">
      <div class="ai-bubble ai-bubble--user" style="background:linear-gradient(135deg,${cfg.gradientFrom},${cfg.gradientTo})">
        ${bodyHtml}
      </div>
      <div class="ai-avatar ai-avatar--user" style="background:linear-gradient(135deg,${cfg.gradientFrom},${cfg.gradientTo})">
        <i class="fa-solid fa-user"></i>
      </div>
    </div>`;

  return `
    <div class="ai-bubble-row ai-bubble-row--ai">
      <div class="ai-avatar ai-avatar--ai" style="background:${cfg.colorHex}18;color:${cfg.colorHex}">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="ai-bubble ai-bubble--ai">${bodyHtml}</div>
    </div>`;
}

/* ── Copy message text ── */
function _copyAIMsg(btn) {
  const bubble = btn.closest('.ai-bubble');
  const text   = bubble?.querySelector('.ai-bubble__text')?.innerText || '';
  navigator.clipboard?.writeText(text).then(() => {
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 1800);
  });
}

/* ── Markdown-ish formatter ── */
function _fmtAIText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    .replace(/^#{1,3}\s+(.+)/gm, '<p class="ai-heading">$1</p>')
    .replace(/^(\d+)\.\s+(.+)/gm,
      '<div class="ai-list-item"><span class="ai-list-num">$1</span><span>$2</span></div>')
    .replace(/^[-•*]\s+(.+)/gm,
      '<div class="ai-list-item"><span class="ai-list-bullet">•</span><span>$1</span></div>')
    .replace(/\n{2,}/g, '</p><p class="ai-para">')
    .replace(/\n/g, '<br>');
}

/* ═══════════════════════════════════════
   Send message
   ═══════════════════════════════════════ */
async function _sendAIMessage(text, role) {
  const cfg   = AI_CFG[role] || AI_CFG.doctor;
  const input = document.getElementById('ai-input');
  const msg   = (text || input?.value || '').trim();
  if (!msg || _aiSending) return;

  document.getElementById('ai-suggestions')?.remove();
  if (input) { input.value = ''; input.style.height = ''; }

  _aiMessages.push({ role: 'user',      content: msg,  ts: new Date() });
  _aiMessages.push({ role: 'assistant', content: '',   ts: new Date(), isLoading: true });
  _aiSending = true;
  _renderAIMessages(cfg);
  _setAISendBtn(true, cfg);

  const history = _aiMessages
    .filter(m => !m.isLoading)
    .map(m => ({ role: m.role, content: m.content }));

  try {
    const res  = await fetch('/api/ai/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    _aiMessages.pop();
    if (!res.ok) throw new Error(data.error || 'AI error');
    _aiMessages.push({ role: 'assistant', content: data.reply, ts: new Date() });
  } catch (err) {
    _aiMessages.pop();
    _aiMessages.push({
      role: 'assistant',
      content: `⚠ ${err.message || 'Unable to reach AI. Check your connection.'}`,
      ts: new Date(),
      isError: true,
    });
  } finally {
    _aiSending = false;
    _setAISendBtn(false, cfg);
    _renderAIMessages(cfg);
  }
}

function _setAISendBtn(loading, cfg) {
  const btn = document.getElementById('ai-send-btn');
  if (!btn) return;
  btn.disabled     = loading;
  btn.style.opacity = loading ? '0.65' : '1';
  btn.innerHTML    = loading
    ? '<i class="fa-solid fa-spinner fa-spin"></i>'
    : '<i class="fa-solid fa-paper-plane"></i>';
}

function _aiInputKeydown(e, role) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    _sendAIMessage(null, role);
  }
}

function _aiAutoResize(el) {
  el.style.height = '';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function _clearAIChat() {
  const role = currentUser?.role || 'doctor';
  const cfg  = AI_CFG[role] || AI_CFG.doctor;
  _aiMessages = [];
  _aiInsight  = { content: '', loading: false, error: '' };
  _aiAddWelcome(cfg);
  _renderSuggestions(cfg, role);
}

/* ═══════════════════════════════════════
   Tab switching
   ═══════════════════════════════════════ */
function _switchAITab(tab, role) {
  _aiTab = tab;
  const cfg      = AI_CFG[role] || AI_CFG.doctor;
  const chat     = document.getElementById('ai-chat-panel');
  const insights = document.getElementById('ai-insights-panel');
  const tabChat  = document.getElementById('ai-tab-chat');
  const tabIns   = document.getElementById('ai-tab-insights');

  [tabChat, tabIns].forEach(t => {
    t.classList.remove('ai-tab--active');
    t.removeAttribute('style');
    t.setAttribute('aria-selected', 'false');
  });

  if (tab === 'chat') {
    chat.style.display     = 'flex';
    insights.style.display = 'none';
    tabChat.classList.add('ai-tab--active');
    tabChat.style.setProperty('--tab-color', cfg.colorHex);
    tabChat.setAttribute('aria-selected', 'true');
  } else {
    chat.style.display     = 'none';
    insights.style.display = 'flex';
    tabIns.classList.add('ai-tab--active');
    tabIns.style.setProperty('--tab-color', cfg.colorHex);
    tabIns.setAttribute('aria-selected', 'true');
    if (!_aiInsight.content && !_aiInsight.loading) _loadAIInsights(cfg, role);
  }
}

/* ═══════════════════════════════════════
   Insights panel
   ═══════════════════════════════════════ */
function _renderInsightsPanel(cfg, role) {
  return `
  <!-- Insights hero -->
  <div class="ai-insights-hero" style="background:linear-gradient(135deg,${cfg.gradientFrom}14,${cfg.gradientTo}08)">
    <div class="ai-insights-hero__icon" style="background:linear-gradient(135deg,${cfg.gradientFrom},${cfg.gradientTo})">
      <i class="fa-solid ${cfg.insightIcon}"></i>
    </div>
    <div>
      <h2 class="ai-insights-hero__title">${cfg.insightLabel}</h2>
      <p class="ai-insights-hero__sub">AI-generated from live system data</p>
    </div>
  </div>

  <!-- Insights card -->
  <div class="ai-insights-card" style="--accent-color:${cfg.colorHex}">
    <div class="ai-insights-card__header">
      <div class="ai-insights-card__label">
        <div class="ai-insights-card__icon" style="background:${cfg.colorHex}18;color:${cfg.colorHex}">
          <i class="fa-solid ${cfg.insightIcon}"></i>
        </div>
        <span>${cfg.insightLabel}</span>
      </div>
      <button class="ai-refresh-btn" onclick="_loadAIInsights(AI_CFG['${role}'],'${role}')">
        <i class="fa-solid fa-arrows-rotate"></i> Refresh
      </button>
    </div>
    <div id="ai-insight-body" class="ai-insights-card__body">
      ${_renderInsightBody()}
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="ai-insights-disclaimer">
    <i class="fa-solid fa-circle-info"></i>
    <span>Insights are generated from aggregate, de-identified data and refreshed on demand.
    Always apply professional judgement before acting on AI-generated content.</span>
  </div>`;
}

function _renderInsightBody() {
  if (_aiInsight.loading) return `
    <div class="ai-insight-state">
      <div class="ai-insight-state__spinner">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
      <div>
        <p class="ai-insight-state__title">Analysing live data…</p>
        <p class="ai-insight-state__sub">This may take a few seconds</p>
      </div>
    </div>`;

  if (_aiInsight.error) return `
    <div class="ai-insight-state ai-insight-state--error">
      <div class="ai-insight-state__spinner ai-insight-state__spinner--error">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <div>
        <p class="ai-insight-state__title">Unable to load insights</p>
        <p class="ai-insight-state__sub">${_aiInsight.error}</p>
      </div>
    </div>`;

  if (!_aiInsight.content) return `
    <div class="ai-insight-state">
      <div class="ai-insight-state__spinner ai-insight-state__spinner--idle">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <div>
        <p class="ai-insight-state__title">No insights yet</p>
        <p class="ai-insight-state__sub">Click <strong>Refresh</strong> to generate insights from current system data.</p>
      </div>
    </div>`;

  return `<div class="ai-insight-content">${_fmtAIText(_aiInsight.content)}</div>`;
}

async function _loadAIInsights(cfg, role) {
  _aiInsight = { content: '', loading: true, error: '' };
  _updateInsightBody();
  try {
    const res  = await fetch(cfg.insightEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Insight error');
    _aiInsight = { content: data.insights || data.summary || '', loading: false, error: '' };
  } catch (err) {
    _aiInsight = { content: '', loading: false, error: err.message || 'Could not load insights' };
  }
  _updateInsightBody();
}

function _updateInsightBody() {
  const el = document.getElementById('ai-insight-body');
  if (el) el.innerHTML = _renderInsightBody();
}
