// Formulário de abastecimento: carrega veículos, envia foto do recibo e grava.
// `supabaseClient`, `loadVeiculos`, `currentUserId` e `showToast` são globais (app.html).

function initAbastecimento() {
  const form = document.getElementById('ab-form');
  if (form.dataset.wired) return;   // ponytail: idempotente, o router pode reentrar
  form.dataset.wired = '1';

  const veiculoEl = document.getElementById('ab-veiculo');
  const dataEl = document.getElementById('ab-data');
  const fotoEl = document.getElementById('ab-foto');
  const submitBtn = document.getElementById('ab-submit');

  loadVeiculos(veiculoEl);
  dataEl.value = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const veiculo_id = veiculoEl.value;
    const km_odometro = document.getElementById('ab-km').value;
    const litros = document.getElementById('ab-litros').value;
    const valor_total = document.getElementById('ab-valor').value;
    const posto = document.getElementById('ab-posto').value.trim();
    const observacao = document.getElementById('ab-obs').value.trim();
    const foto = fotoEl.files[0];

    if (!veiculo_id) return showToast('Escolha o veículo.', 'error');
    if (!km_odometro) return showToast('Informe o km do odômetro.', 'error');
    if (!(Number(litros) > 0)) return showToast('Informe quantos litros.', 'error');
    if (!(Number(valor_total) > 0)) return showToast('Informe o valor total.', 'error');
    if (!foto) return showToast('A foto do recibo é obrigatória.', 'error');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando…';
    try {
      const uid = currentUserId();
      // Convenção de caminho: {usuario_id}/{timestamp}.<ext>
      const ext = (foto.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${uid}/${Date.now()}.${ext}`;
      const up = await supabaseClient.storage.from('recibos').upload(path, foto, {
        contentType: foto.type || 'image/jpeg',
      });
      if (up.error) throw up.error;

      const { error } = await supabaseClient.from('abastecimentos').insert({
        veiculo_id, usuario_id: uid,
        data: dataEl.value,
        km_odometro, litros, valor_total,
        posto: posto || null,
        // ponytail: bucket é privado — guardamos o path (a URL assinada é gerada na leitura, fase 4)
        foto_recibo_url: up.data.path,
        observacao: observacao || null,
      });
      if (error) throw error;

      showToast('Abastecimento salvo.', 'ok');
      form.reset();
      dataEl.value = new Date().toISOString().slice(0, 10);
      location.hash = '#home';
    } catch (err) {
      showToast('Não deu para salvar: ' + (err.message || 'tente de novo.'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar abastecimento';
    }
  });
}
