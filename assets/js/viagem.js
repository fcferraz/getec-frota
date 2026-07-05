// Formulário de viagem: carrega veículos e grava. km_rodado é gerado pelo banco.
// `supabaseClient`, `loadVeiculos`, `currentUserId` e `showToast` são globais (app.html).

function initViagem() {
  const form = document.getElementById('vg-form');
  if (form.dataset.wired) return;   // ponytail: idempotente, o router pode reentrar
  form.dataset.wired = '1';

  const veiculoEl = document.getElementById('vg-veiculo');
  const dataEl = document.getElementById('vg-data');
  const submitBtn = document.getElementById('vg-submit');

  loadVeiculos(veiculoEl);
  dataEl.value = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const veiculo_id = veiculoEl.value;
    const km_inicial = document.getElementById('vg-km-ini').value;
    const km_final = document.getElementById('vg-km-fim').value;
    const destino = document.getElementById('vg-destino').value.trim();
    const motivo = document.getElementById('vg-motivo').value.trim();
    const observacao = document.getElementById('vg-obs').value.trim();

    if (!veiculo_id) return showToast('Escolha o veículo.', 'error');
    if (km_inicial === '') return showToast('Informe o km inicial.', 'error');
    if (km_final === '') return showToast('Informe o km final.', 'error');
    if (Number(km_final) < Number(km_inicial))
      return showToast('O km final não pode ser menor que o inicial.', 'error');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando…';
    try {
      const { error } = await supabaseClient.from('viagens').insert({
        veiculo_id, usuario_id: currentUserId(),
        data: dataEl.value,
        km_inicial, km_final,
        destino: destino || null,
        motivo: motivo || null,
        observacao: observacao || null,
      });
      if (error) throw error;

      showToast('Viagem registrada.', 'ok');
      form.reset();
      dataEl.value = new Date().toISOString().slice(0, 10);
      location.hash = '#home';
    } catch (err) {
      showToast('Não deu para salvar: ' + (err.message || 'tente de novo.'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar viagem';
    }
  });
}
