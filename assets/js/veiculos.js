// Gestão de veículos (admin). CRUD com soft-delete via `ativo` — nunca apaga,
// pois abastecimentos/viagens referenciam veiculo_id. RLS (veiculos_all_admin)
// é a trava real. esc, showToast globais; veiculosCache é o cache dos dropdowns.

let _veicData = [];

function initVeiculos() {
  const form = document.getElementById('veic-form');
  if (!form.dataset.wired) {
    form.dataset.wired = '1';
    form.addEventListener('submit', saveVeiculo);
    document.getElementById('veic-cancel').addEventListener('click', resetVeicForm);
  }
  loadVeiculosList();
}

async function loadVeiculosList() {
  const tbody = document.querySelector('#veic-list tbody');
  const { data, error } = await supabaseClient.from('veiculos')
    .select('id, placa, modelo, apelido, km_atual, ativo').order('apelido');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Erro ao carregar.</td></tr>';
    return;
  }
  _veicData = data || [];
  tbody.innerHTML = _veicData.length ? _veicData.map(v => `
    <tr>
      <td>${esc(v.placa)}</td><td>${esc(v.modelo)}</td><td>${esc(v.apelido || '—')}</td>
      <td>${v.km_atual}</td><td>${v.ativo ? 'Ativo' : 'Inativo'}</td>
      <td>
        <button type="button" class="linkbtn" data-edit="${v.id}">Editar</button>
        <button type="button" class="linkbtn" data-toggle="${v.id}" data-ativo="${v.ativo}">${v.ativo ? 'Desativar' : 'Ativar'}</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="6" class="muted">Nenhum veículo.</td></tr>';

  tbody.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => editVeiculo(b.dataset.edit)));
  tbody.querySelectorAll('[data-toggle]').forEach(b =>
    b.addEventListener('click', () => toggleVeiculo(b.dataset.toggle, b.dataset.ativo === 'true')));
}

async function saveVeiculo(e) {
  e.preventDefault();
  const id = document.getElementById('veic-id').value;
  const placa = document.getElementById('veic-placa').value.trim();
  const modelo = document.getElementById('veic-modelo').value.trim();
  const apelido = document.getElementById('veic-apelido').value.trim();
  const km_atual = document.getElementById('veic-km').value;

  if (!placa) return showToast('Informe a placa.', 'error');
  if (!modelo) return showToast('Informe o modelo.', 'error');
  if (km_atual === '') return showToast('Informe o km atual.', 'error');

  const btn = document.getElementById('veic-submit');
  btn.disabled = true; btn.textContent = 'Salvando…';
  try {
    const payload = { placa, modelo, apelido: apelido || null, km_atual };
    const res = id
      ? await supabaseClient.from('veiculos').update(payload).eq('id', id)
      : await supabaseClient.from('veiculos').insert({ ...payload, ativo: true });
    if (res.error) throw res.error;
    showToast(id ? 'Veículo atualizado.' : 'Veículo adicionado.', 'ok');
    veiculosCache = null;   // dropdowns de abastecimento/viagem revalidam
    resetVeicForm();
    loadVeiculosList();
  } catch (err) {
    showToast('Não deu para salvar: ' + (err.message || 'tente de novo.'), 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar veículo';
  }
}

function editVeiculo(id) {
  const v = _veicData.find(x => x.id === id);
  if (!v) return;
  document.getElementById('veic-id').value = v.id;
  document.getElementById('veic-placa').value = v.placa;
  document.getElementById('veic-modelo').value = v.modelo;
  document.getElementById('veic-apelido').value = v.apelido || '';
  document.getElementById('veic-km').value = v.km_atual;
  document.getElementById('veic-submit').textContent = 'Salvar alterações';
  document.getElementById('veic-cancel').hidden = false;
  window.scrollTo(0, 0);
}

function resetVeicForm() {
  document.getElementById('veic-form').reset();
  document.getElementById('veic-id').value = '';
  document.getElementById('veic-submit').textContent = 'Salvar veículo';
  document.getElementById('veic-cancel').hidden = true;
}

async function toggleVeiculo(id, ativoAtual) {
  const { error } = await supabaseClient.from('veiculos').update({ ativo: !ativoAtual }).eq('id', id);
  if (error) return showToast('Não deu para atualizar.', 'error');
  veiculosCache = null;
  loadVeiculosList();
}
