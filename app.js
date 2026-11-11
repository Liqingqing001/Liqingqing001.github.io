const filters = document.querySelectorAll('[data-filter]');
const projects = document.querySelectorAll('[data-category]');
const count = document.querySelector('#project-count');
for (const button of filters) {
  button.addEventListener('click', () => {
    const selected = button.dataset.filter;
    for (const filter of filters) {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    }
    let visible = 0;
    for (const project of projects) {
      const show = selected === 'all' || project.dataset.category.split(' ').includes(selected);
      project.hidden = !show;
      if (show) visible++;
    }
    count.textContent = `${visible} 个公开项目`;
  });
}
document.querySelector('#year').textContent = new Date().getFullYear();
