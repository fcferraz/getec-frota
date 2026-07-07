// Formulário de viagem: km_inicial é derivado pelo banco (trigger), o front só exibe.
// km_final exige foto do odômetro. `supabaseClient`, `loadVeiculos`,
// `currentUserId` e `showToast` são globais (app.html).

function initViagem() {
  const form = document.getElementById('vg-form');
  if (form.dataset.wired) return;   // ponytail: idempotente, o router pode reentrar
  form.dataset.wired = '1';

  const veiculoEl = document.getElementById('vg-veiculo');
  const dataEl = document.getElementById('vg-data');
  const kmIniEl = document.getElementById('vg-km-ini');   // display somente-leitura
  const fotoEl = document.getElementById('vg-foto');
  const submitBtn = document.getElementById('vg-submit');

  loadVeiculos(veiculoEl);
  dataEl.value = new Date().toISOString().slice(0, 10);

  // Ao trocar de veículo, mostra o km inicial esperado (mesma lógica do trigger).
  veiculoEl.addEventListener('change', async () => {
    kmIniEl.textContent = '…';
    delete kmIniEl.dataset.km;
    if (!veiculoEl.value) { kmIniEl.textContent = '—'; return; }
    const km = await expectedKmInicial(veiculoEl.value);
    kmIniEl.textContent = km == null ? '—' : `${km} km`;
    if (km != null) kmIniEl.dataset.km = km;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const veiculo_id = veiculoEl.value;
    const km_final = document.getElementById('vg-km-fim').value;
    const destino = document.getElementById('vg-destino').value.trim();
    const motivo = document.getElementById('vg-motivo').value.trim();
    const observacao = document.getElementById('vg-obs').value.trim();
    const foto = fotoEl.files[0];
    const kmIni = kmIniEl.dataset.km;   // esperado exibido (o banco é a fonte real)

    if (!veiculo_id) return showToast('Escolha o veículo.', 'error');
    if (km_final === '') return showToast('Informe o km final.', 'error');
    if (kmIni != null && Number(km_final) < Number(kmIni))
      return showToast(`O km final não pode ser menor que o km inicial (${kmIni}).`, 'error');
    if (!foto) return showToast('A foto do odômetro é obrigatória.', 'error');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Salvando…';
    try {
      const uid = currentUserId();
      // Reaproveita o bucket recibos; prefixo km- separa das fotos de abastecimento.
      const ext = (foto.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${uid}/km-${Date.now()}.${ext}`;
      const up = await supabaseClient.storage.from('recibos').upload(path, foto, {
        contentType: foto.type || 'image/jpeg',
      });
      if (up.error) throw up.error;

      // km_inicial é preenchido pelo trigger definir_km_inicial_viagem — não enviamos.
      const { error } = await supabaseClient.from('viagens').insert({
        veiculo_id, usuario_id: uid,
        data: dataEl.value,
        km_final,
        foto_km_final_url: up.data.path,
        destino: destino || null,
        motivo: motivo || null,
        observacao: observacao || null,
      });
      if (error) throw error;

      showToast('Viagem registrada.', 'ok');
      form.reset();
      dataEl.value = new Date().toISOString().slice(0, 10);
      kmIniEl.textContent = '—';
      delete kmIniEl.dataset.km;
      location.hash = '#home';
    } catch (err) {
      showToast('Não deu para salvar: ' + (err.message || 'tente de novo.'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar viagem';
    }
  });
}

// Km inicial esperado: km_final da última viagem do veículo, senão km_atual do veículo.
// Espelha o trigger; sob RLS o funcionário vê o mesmo subconjunto que o trigger enxerga.
// Sem maybeSingle: em 0 linhas ele devolvia erro e engolíamos o valor. Lê data[0].
async function expectedKmInicial(veiculoId) {
  const t = await supabaseClient.from('viagens')
    .select('km_final').eq('veiculo_id', veiculoId)
    .order('criado_em', { ascending: false }).limit(1);
  if (t.error) console.warn('km inicial (viagens):', t.error.message);
  if (t.data && t.data.length && t.data[0].km_final != null)
    return Number(t.data[0].km_final);

  const v = await supabaseClient.from('veiculos')
    .select('km_atual').eq('id', veiculoId).limit(1);
  if (v.error) console.warn('km inicial (veiculos):', v.error.message);
  if (v.data && v.data.length && v.data[0].km_atual != null)
    return Number(v.data[0].km_atual);

  return null;
}
