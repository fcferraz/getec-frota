// Bottom nav + util de escape, compartilhados por app.html e dashboard.html.
// Chame renderNav(itemAtivo, isAdmin) em cada rota/página.

function renderNav(active, isAdmin) {
  const items = [
    ['home', 'app.html#home', '🏠', 'Início'],
    ['abastecer', 'app.html#abastecer', '⛽', 'Abastecer'],
    ['viagem', 'app.html#viagem', '🚗', 'Viagem'],
    ['historico', 'app.html#historico', '📋', 'Histórico'],
  ];
  if (isAdmin) items.push(['painel', 'app.html#admin', '📊', 'Painel']);
  document.getElementById('bottomnav').innerHTML = items.map(([key, href, ico, label]) =>
    `<a href="${href}"${key === active ? ' class="active"' : ''}>` +
    `<span class="ico">${ico}</span>${label}</a>`).join('');
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
