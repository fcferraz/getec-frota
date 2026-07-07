// Histórico completo do próprio usuário (abastecimentos + viagens combinados).
// currentUserId, showToast, fmtDate são globais (app.html).

let histLimit = 25;

function initHistorico() {
  const btn = document.getElementById('hist-more');
  if (!btn.dataset.wired) {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => { histLimit += 25; loadHistorico(); });
  }
  histLimit = 25;
  loadHistorico();
}

async function loadHistorico() {
  const uid = currentUserId();
  const ul = document.getElementById('hist-list');
  const more = document.getElementById('hist-more');

  const [ab, vg] = await Promise.all([
    supabaseClient.from('abastecimentos').select('data, litros, valor_total, criado_em')
      .eq('usuario_id', uid).order('criado_em', { ascending: false }).limit(histLimit),
    supabaseClient.from('viagens').select('data, km_rodado, destino, criado_em')
      .eq('usuario_id', uid).order('criado_em', { ascending: false }).limit(histLimit),
  ]);

  const items = [
    ...(ab.data || []).map(r => ({
      criado_em: r.criado_em,
      text: `⛽ ${fmtDate(r.data)} · ${r.litros} L · R$ ${Number(r.valor_total).toFixed(2)}`,
    })),
    ...(vg.data || []).map(r => ({
      criado_em: r.criado_em,
      text: `🚗 ${fmtDate(r.data)} · ${r.km_rodado} km${r.destino ? ' · ' + r.destino : ''}`,
    })),
  ].sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  ul.innerHTML = items.length
    ? items.map(i => `<li>${i.text}</li>`).join('')
    : '<li class="muted">Nada por aqui ainda.</li>';

  // ponytail: paginação por limite crescente + refetch — ok pra frota pequena;
  // trocar por range/cursor com merge se o volume crescer muito.
  more.hidden = !((ab.data || []).length === histLimit || (vg.data || []).length === histLimit);
}
