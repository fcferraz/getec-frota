// Gestão de usuários (admin). Não cria contas Auth (exige secret key, fica no
// painel do Supabase) — só ajusta papel e ativo na tabela usuarios. Soft-delete
// via `ativo`. RLS (usuarios_update_admin) é a trava real. Não mexe no próprio
// registro para evitar auto-lockout.

function initUsuarios() {
  loadUsuariosList();
}

async function loadUsuariosList() {
  const tbody = document.querySelector('#usu-list tbody');
  const { data, error } = await supabaseClient.from('usuarios')
    .select('id, nome, email, papel, ativo').order('nome');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Erro ao carregar.</td></tr>';
    return;
  }
  const meId = currentUserId();
  tbody.innerHTML = (data || []).length ? data.map(u => {
    const acoes = u.id === meId
      ? '<span class="muted">você</span>'
      : `<button type="button" class="linkbtn" data-papel="${u.id}" data-cur="${u.papel}">${u.papel === 'admin' ? 'Tornar funcionário' : 'Tornar admin'}</button>
         <button type="button" class="linkbtn" data-ativo="${u.id}" data-val="${u.ativo}">${u.ativo ? 'Remover acesso' : 'Restaurar acesso'}</button>`;
    return `<tr>
      <td>${esc(u.nome)}</td><td>${esc(u.email)}</td>
      <td>${u.papel}</td><td>${u.ativo ? 'Ativo' : 'Inativo'}</td>
      <td>${acoes}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5" class="muted">Nenhum usuário.</td></tr>';

  tbody.querySelectorAll('[data-papel]').forEach(b =>
    b.addEventListener('click', () => setPapel(b.dataset.papel, b.dataset.cur === 'admin' ? 'funcionario' : 'admin')));
  tbody.querySelectorAll('[data-ativo]').forEach(b =>
    b.addEventListener('click', () => setAtivo(b.dataset.ativo, b.dataset.val !== 'true')));
}

async function setPapel(id, papel) {
  const { error } = await supabaseClient.from('usuarios').update({ papel }).eq('id', id);
  if (error) return showToast('Não deu para atualizar o papel.', 'error');
  loadUsuariosList();
}

async function setAtivo(id, ativo) {
  const { error } = await supabaseClient.from('usuarios').update({ ativo }).eq('id', id);
  if (error) return showToast('Não deu para atualizar o status.', 'error');
  loadUsuariosList();
}
