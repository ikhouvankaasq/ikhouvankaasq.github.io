const CATEGORIES = [
  "Global",
  "Crypto-Hack",
  "Gold-Quest",
  "Fishing-Frenzy",
  "Tower-Defense-2",
  "Monster-Brawl",
  "Deceptive-Dinos",
  "Battle-Royale",
  "Tower-Defense",
  "Cafe",
  "Factory",
  "Racing",
  "Classic"
];

// define which categories have content (others show 'developing' message)
const READY = new Set([
  "Global",
  "Crypto-Hack",
  "Gold-Quest",
  // keep others as developing for demo
]);

/* ...existing code... */

// simple router using hash
function navigateTo(name) {
  location.hash = encodeURIComponent(name);
  render();
}

function createCategoryButton(name) {
  const btn = document.createElement('button');
  btn.className = 'cat-btn' + (READY.has(name) ? '' : ' empty');
  const left = document.createElement('div');
  left.className = 'name';
  left.textContent = name;
  const badge = document.createElement('div');
  badge.className = 'cat-badge ' + (READY.has(name) ? 'live' : '');
  badge.textContent = READY.has(name) ? 'LIVE' : 'DEV';
  btn.appendChild(left);
  btn.appendChild(badge);
  btn.addEventListener('click', () => navigateTo(name));
  return btn;
}

function renderSidebar() {
  const list = document.getElementById('category-list');
  list.innerHTML = '';
  CATEGORIES.forEach(name => {
    list.appendChild(createCategoryButton(name));
  });
}

function renderHome() {
  const page = document.getElementById('page');
  page.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'grid';
  CATEGORIES.forEach(name => {
    const card = document.createElement('div');
    card.className = 'card';
    const h = document.createElement('h4');
    h.textContent = name;
    const p = document.createElement('p');
    p.textContent = READY.has(name) ? 'Available tools & quick links' : 'Page under development';
    const actions = document.createElement('div');
    actions.className = 'actions';
    const open = document.createElement('button');
    open.className = 'btn primary';
    open.textContent = 'Open';
    open.addEventListener('click', () => navigateTo(name));
    const info = document.createElement('button');
    info.className = 'btn ghost';
    info.textContent = READY.has(name) ? 'Explore' : 'Info';
    actions.appendChild(open);
    actions.appendChild(info);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(actions);
    grid.appendChild(card);
  });
  page.appendChild(grid);
  document.getElementById('breadcrumb').textContent = 'Home';
}

function renderCategory(name) {
  const page = document.getElementById('page');
  page.innerHTML = '';
  document.getElementById('breadcrumb').textContent = `Category — ${name}`;
  if (!READY.has(name)) {
    const msg = document.createElement('div');
    msg.className = 'message';
    const s = document.createElement('strong');
    s.textContent = 'Sorry, but we are currently developing this page';
    const p = document.createElement('div');
    p.textContent = `Category: ${name}`;
    msg.appendChild(s);
    msg.appendChild(p);
    page.appendChild(msg);
    return;
  }

  // Simple placeholder content for ready categories
  const title = document.createElement('h2');
  title.textContent = name;
  title.style.marginTop = '0';
  const desc = document.createElement('p');
  desc.textContent = `Tools and quick links for ${name}. This demo shows a clean "hacker" UI.`;
  const list = document.createElement('div');
  list.style.marginTop = '14px';
  list.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" onclick="alert('Launch tool: Scanner')">Launch Scanner</button>
      <button class="btn ghost" onclick="alert('Open logs')">Open Logs</button>
      <button class="btn ghost" onclick="alert('Settings')">Settings</button>
    </div>
  `;
  page.appendChild(title);
  page.appendChild(desc);
  page.appendChild(list);
}

function currentRoute() {
  const raw = decodeURIComponent((location.hash || '').replace('#',''));
  return raw || '';
}

function render() {
  renderSidebar();
  const route = currentRoute();
  if (!route) {
    renderHome();
    return;
  }
  // if category exists
  if (CATEGORIES.includes(route)) {
    renderCategory(route);
  } else {
    // unknown route -> home
    renderHome();
  }
}

window.addEventListener('hashchange', render);
document.getElementById('btn-home').addEventListener('click', () => {
  location.hash = '';
  render();
});

render();

/* ...existing code... */
