const filters = document.querySelectorAll('[data-filter]');
const count = document.querySelector('#project-count');
let selectedCategory = 'all';
function applyFilter() {
  const projects = document.querySelectorAll('[data-category]');
  let visible = 0;
  for (const project of projects) {
    const show = selectedCategory === 'all' || project.dataset.category.split(' ').includes(selectedCategory);
    project.hidden = !show;
    if (show) visible++;
  }
  count.textContent = `${visible} 个公开项目`;
  document.querySelector('[data-filter="all"] span').textContent = String(projects.length).padStart(2, '0');
}
for (const button of filters) {
  button.addEventListener('click', () => {
    selectedCategory = button.dataset.filter;
    for (const filter of filters) {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    }
    applyFilter();
  });
}
document.querySelector('#year').textContent = new Date().getFullYear();

// Public data only. README text is rendered as textContent, never executable HTML.
const owner = 'Liqingqing001';
const status = document.createElement('p');
status.className = 'sync-status';
status.setAttribute('role', 'status');
status.textContent = '正在读取 GitHub 最新项目说明…';
document.querySelector('.filter-row').after(status);

async function githubJSON(url, accept = 'application/vnd.github+json') {
  const response = await fetch(url, {headers: {Accept: accept}, signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json();
}

function readmeSummary(markdown) {
  const paragraphs = markdown.replace(/\r/g, '').replace(/```[\s\S]*?```/g, '').split(/\n\s*\n/);
  for (const paragraph of paragraphs) {
    const source = paragraph.trim();
    if (!source || /^(?:#|>|\||<|!\[|[-*+]\s|\d+\.)/.test(source)) continue;
    const plain = source.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '')
      .replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
    if (plain.length >= 25) return plain.length > 180 ? plain.slice(0, 180) + '…' : plain;
  }
  return '';
}

function repositoryCategory(repo) {
  const words = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const categories = [];
  if (/agent|rag|人工智能|智能|\bai\b|llm/.test(words)) categories.push('ai');
  if (/automat|skill|testing|browser|自动化/.test(words)) categories.push('automation');
  if (!categories.length || /web|blog|vue|react|全栈/.test(words)) categories.push('web');
  return categories.join(' ');
}

function makeProject(repo) {
  const card = document.createElement('article');
  card.className = 'project-card compact';
  card.dataset.category = repositoryCategory(repo);
  card.dataset.repo = repo.name;
  const top = document.createElement('div');
  top.className = 'compact-top';
  const icon = document.createElement('span');
  icon.className = 'project-icon sage'; icon.textContent = '↗';
  const label = document.createElement('span');
  label.className = 'project-number'; label.textContent = 'FROM GITHUB';
  top.append(icon, label);
  const info = document.createElement('div'); info.className = 'project-info';
  const heading = document.createElement('h3'); heading.textContent = repo.name;
  const description = document.createElement('p');
  description.textContent = repo.description || '项目说明与最新进展请查看 GitHub 仓库。';
  const tags = document.createElement('div'); tags.className = 'tags';
  if (repo.language) {const tag = document.createElement('span'); tag.textContent = repo.language; tags.append(tag);}
  const links = document.createElement('div'); links.className = 'project-links';
  const link = document.createElement('a');
  link.href = `https://github.com/${owner}/${encodeURIComponent(repo.name)}`;
  link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '查看项目 ↗';
  links.append(link); info.append(heading, description, tags, links); card.append(top, info);
  document.querySelector('.project-grid').append(card);
  return card;
}

async function syncProjects() {
  try {
    const repos = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await githubJSON(`https://api.github.com/users/${owner}/repos?type=owner&sort=updated&per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw new Error('Invalid repository response');
      repos.push(...batch);
      if (batch.length < 100) break;
    }
    const publicProjects = repos.filter(repo => !repo.private && !repo.fork && repo.name.toLowerCase() !== `${owner}.github.io`.toLowerCase());
    const names = new Set(publicProjects.map(repo => repo.name));
    for (const card of document.querySelectorAll('[data-repo]')) {
      if (!names.has(card.dataset.repo)) card.remove();
    }
    let readmeFailures = 0;
    await Promise.all(publicProjects.map(async repo => {
      const card = [...document.querySelectorAll('[data-repo]')].find(el => el.dataset.repo === repo.name) || makeProject(repo);
      const info = card.querySelector('.project-info');
      let summary = repo.description || '';
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(repo.name)}/readme`, {
          headers: {Accept: 'application/vnd.github.raw+json'}, signal: AbortSignal.timeout(12000)
        });
        if (response.ok) summary = readmeSummary(await response.text()) || summary;
        else if (response.status !== 404) readmeFailures++;
      } catch { readmeFailures++; }
      if (summary) info.querySelector('p').textContent = summary;
      let stamp = info.querySelector('.repo-updated');
      if (!stamp) {stamp = document.createElement('small'); stamp.className = 'repo-updated'; info.querySelector('.tags').after(stamp);}
      stamp.textContent = `仓库更新于 ${new Date(repo.pushed_at || repo.updated_at).toLocaleDateString('zh-CN')}`;
    }));
    applyFilter();
    status.textContent = readmeFailures
      ? '仓库列表已同步；部分 README 暂时无法读取，保留已有介绍。'
      : '已同步 GitHub 最新公开项目与 README · 每次打开自动检查';
  } catch {
    status.textContent = '暂时无法读取 GitHub 最新信息，当前展示已有项目快照。可稍后刷新。';
    status.classList.add('sync-unavailable');
  }
}
syncProjects();
