// Dashboard do admin: agrega abastecimentos e viagens no período filtrado.
// Só admin chega aqui — a página se autoprotege (RLS já bloqueia os dados).
// `supabaseClient`, `requireAuth`, `signOut` são globais (client + auth.js).

// ------------------------------------------------------------
// Agregação pura (testada no rodapé via: node assets/js/dashboard.js)
// ------------------------------------------------------------
function aggregate(abast, viagens, veiculoNome, usuarioNome) {
  const veic = {};   // veiculo_id -> {spend, km}
  const func = {};   // usuario_id -> {spend, km, lancamentos}
  let totalSpend = 0, totalKm = 0;

  for (const a of abast) {
    const s = Number(a.valor_total) || 0;
    totalSpend += s;
    (veic[a.veiculo_id] ??= { spend: 0, km: 0 }).spend += s;
    const f = (func[a.usuario_id] ??= { spend: 0, km: 0, lancamentos: 0 });
    f.spend += s; f.lancamentos++;
  }
  for (const v of viagens) {
    const km = Number(v.km_rodado) || 0;
    totalKm += km;
    (veic[v.veiculo_id] ??= { spend: 0, km: 0 }).km += km;
    const f = (func[v.usuario_id] ??= { spend: 0, km: 0, lancamentos: 0 });
    f.km += km; f.lancamentos++;
  }

  const perVehicle = Object.entries(veic).map(([id, x]) => ({
    nome: veiculoNome(id), spend: x.spend, km: x.km,
    custoKm: x.km > 0 ? x.spend / x.km : null,
  })).sort((a, b) => b.spend - a.spend);

  const ranking = Object.entries(func).map(([id, x]) => ({
    nome: usuarioNome(id), spend: x.spend, km: x.km, lancamentos: x.lancamentos,
  })).sort((a, b) => b.lancamentos - a.lancamentos || b.km - a.km);

  return {
    totalSpend, totalKm,
    custoMedioKm: totalKm > 0 ? totalSpend / totalKm : null,
    perVehicle, ranking,
  };
}

// Node self-check — não roda no browser.
if (typeof module !== 'undefined' && require.main === module) {
  const assert = require('assert');
  const ab = [
    { veiculo_id: 'v1', usuario_id: 'u1', valor_total: 100 },
    { veiculo_id: 'v1', usuario_id: 'u2', valor_total: 50 },
  ];
  const vg = [
    { veiculo_id: 'v1', usuario_id: 'u1', km_rodado: 200 },
    { veiculo_id: 'v2', usuario_id: 'u1', km_rodado: 100 },
  ];
  const r = aggregate(ab, vg, (id) => id, (id) => id);
  assert.strictEqual(r.totalSpend, 150);
  assert.strictEqual(r.totalKm, 300);
  assert.strictEqual(r.custoMedioKm, 0.5);
  assert.strictEqual(r.perVehicle[0].nome, 'v1');       // maior gasto primeiro
  assert.strictEqual(r.perVehicle.find(x => x.nome === 'v2').custoKm, 0); // 0 gasto / 100 km
  assert.strictEqual(r.ranking[0].nome, 'u1');          // mais lançamentos (3)
  assert.strictEqual(r.ranking[0].lancamentos, 3);
  console.log('ok');
}
if (typeof window === 'undefined') { /* node: para por aqui */ }
else init();

// ------------------------------------------------------------
// UI
// ------------------------------------------------------------
async function init() {
  const session = await requireAuth();
  if (!session) return;

  const { data: me } = await supabaseClient
    .from('usuarios').select('nome, papel').eq('id', session.user.id).maybeSingle();
  if (!me || me.papel !== 'admin') { location.replace('app.html'); return; }
  document.getElementById('who').textContent = `${me.nome} · admin`;
  renderNav('painel', true);   // dashboard é admin-only

  document.getElementById('logout').addEventListener('click', signOut);

  const veiculoNome = {}, usuarioNome = {};
  await loadFilters(veiculoNome, usuarioNome);

  document.getElementById('f-de').value = firstOfMonth();
  document.getElementById('f-ate').value = today();

  const form = document.getElementById('filtros');
  form.addEventListener('submit', (e) => { e.preventDefault(); load(veiculoNome, usuarioNome); });
  load(veiculoNome, usuarioNome);
}

async function loadFilters(veiculoNome, usuarioNome) {
  const [veic, usu] = await Promise.all([
    supabaseClient.from('veiculos').select('id, placa, modelo, apelido').order('apelido'),
    supabaseClient.from('usuarios').select('id, nome').order('nome'),
  ]);
  const vsel = document.getElementById('f-veiculo');
  for (const v of veic.data || []) {
    const label = `${v.apelido || v.modelo} · ${v.placa}`;
    veiculoNome[v.id] = label;
    vsel.insertAdjacentHTML('beforeend', `<option value="${v.id}">${label}</option>`);
  }
  const usel = document.getElementById('f-funcionario');
  for (const u of usu.data || []) {
    usuarioNome[u.id] = u.nome;
    usel.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.nome}</option>`);
  }
}

async function load(veiculoNome, usuarioNome) {
  const de = document.getElementById('f-de').value;
  const ate = document.getElementById('f-ate').value;
  const vid = document.getElementById('f-veiculo').value;
  const uid = document.getElementById('f-funcionario').value;

  let qa = supabaseClient.from('abastecimentos')
    .select('data, veiculo_id, usuario_id, valor_total, foto_recibo_url')
    .gte('data', de).lte('data', ate).order('data', { ascending: false });
  let qv = supabaseClient.from('viagens')
    .select('data, veiculo_id, usuario_id, km_rodado')
    .gte('data', de).lte('data', ate);
  if (vid) { qa = qa.eq('veiculo_id', vid); qv = qv.eq('veiculo_id', vid); }
  if (uid) { qa = qa.eq('usuario_id', uid); qv = qv.eq('usuario_id', uid); }

  const [ra, rv] = await Promise.all([qa, qv]);
  if (ra.error || rv.error) return showToast('Não foi possível carregar os dados.', 'error');

  const abast = ra.data || [], viagens = rv.data || [];
  const nomeV = (id) => veiculoNome[id] || '—';
  const nomeU = (id) => usuarioNome[id] || '—';
  const agg = aggregate(abast, viagens, nomeV, nomeU);

  document.getElementById('m-gasto').textContent = brl(agg.totalSpend);
  document.getElementById('m-km').textContent = `${fmtNum(agg.totalKm)} km`;
  document.getElementById('m-custokm').textContent =
    agg.custoMedioKm == null ? '—' : brl(agg.custoMedioKm) + '/km';

  fillTable('t-veiculos', agg.perVehicle, 4, (r) =>
    `<td>${esc(r.nome)}</td><td>${brl(r.spend)}</td><td>${fmtNum(r.km)}</td>` +
    `<td>${r.custoKm == null ? '—' : brl(r.custoKm)}</td>`);

  fillTable('t-ranking', agg.ranking, 4, (r) =>
    `<td>${esc(r.nome)}</td><td>${r.lancamentos}</td><td>${fmtNum(r.km)}</td><td>${brl(r.spend)}</td>`);

  const recibos = abast.filter(a => a.foto_recibo_url);
  fillTable('t-recibos', recibos, 5, (r) =>
    `<td>${fmtDate(r.data)}</td><td>${esc(nomeV(r.veiculo_id))}</td>` +
    `<td>${esc(nomeU(r.usuario_id))}</td><td>${brl(Number(r.valor_total))}</td>` +
    `<td><button type="button" class="linkbtn" data-path="${esc(r.foto_recibo_url)}">Ver recibo</button></td>`);

  wireRecibos();
}

function fillTable(id, rows, cols, rowHtml) {
  const tbody = document.querySelector('#' + id + ' tbody');
  tbody.innerHTML = rows.length
    ? rows.map(r => `<tr>${rowHtml(r)}</tr>`).join('')
    : `<tr><td colspan="${cols}" class="muted">Nada no período.</td></tr>`;
}

// URL assinada gerada sob demanda (bucket privado), expira em 1h.
function wireRecibos() {
  for (const btn of document.querySelectorAll('#t-recibos button[data-path]')) {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { data, error } = await supabaseClient.storage
        .from('recibos').createSignedUrl(btn.dataset.path, 3600);
      btn.disabled = false;
      if (error || !data) return showToast('Não foi possível abrir o recibo.', 'error');
      window.open(data.signedUrl, '_blank');
    });
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }
function brl(n) { return 'R$ ' + Number(n).toFixed(2); }
function fmtNum(n) { return Number(n).toLocaleString('pt-BR'); }
// esc() vem de nav.js.

let toastTimer;
function showToast(text, kind) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.className = 'msg show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'msg'; }, 4000);
}
