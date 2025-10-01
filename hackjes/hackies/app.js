const app = {
  init() {
    this.cache();
    this.bind();
    this.showWelcome();
  },

  cache() {
    /* removed categories list */
    this.$page = document.getElementById('page');
    this.$breadcrumb = document.getElementById('breadcrumb');
    this.$btnHome = document.getElementById('btn-home');
  },

  bind() {
    this.$btnHome.addEventListener('click', () => this.showWelcome());
  },

  showWelcome() {
    this.$breadcrumb.textContent = 'Welcome';
    this.$page.innerHTML = `
      <h1 style="margin:0 0 6px">Welcome to hacks</h1>
      <div class="breadcrumb" style="margin:0 0 16px;color:var(--muted);font-weight:400">Choose a platform below</div>
      <div class="platform-grid" id="platform-grid"></div>
    `;
    this.renderPlatforms();
  },

  renderPlatforms() {
    const platforms = [
      { id: 'kahoot', title: 'Kahoot', desc: 'kahoot.com', url: 'https://ikhouvankaasq.github.io/hackjes/hackies/kahoot' },
      { id: 'blooket', title: 'Blooket', desc: 'blooket.com', url: 'https://ikhouvankaasq.github.io/hackjes/hackies/blooket' },
      { id: 'gimkit', title: 'Gimkit', desc: 'gimkit.com', url: 'https://ikhouvankaasq.github.io/hackjes/hackies/gimkit' },
    ];
    const grid = document.getElementById('platform-grid') || (() => {
      const el = document.createElement('div');
      el.id = 'platform-grid';
      el.className = 'platform-grid';
      this.$page.appendChild(el);
      return el;
    })();
    grid.innerHTML = '';
    platforms.forEach(p => {
      const card = document.createElement('button');
      card.className = 'platform-card platform-' + p.id;
      card.innerHTML = `<div class="platform-title">${p.title}</div><div class="platform-desc">${p.desc}</div>`;
      card.addEventListener('click', () => { window.location.href = p.url; });
      grid.appendChild(card);
    });
  },

  openPlatform(p) {
    this.$breadcrumb.textContent = p.title;
    this.$page.innerHTML = `
      <h2>${p.title}</h2>
      <p class="muted">Choose a tool or script for ${p.title}.</p>
      <div style="height:12px"></div>
      <div class="platform-grid">
        <div class="platform-card" style="cursor:default">
          <div class="platform-title">Example action</div>
          <div class="platform-desc">This is a placeholder for ${p.title} tools.</div>
        </div>
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
