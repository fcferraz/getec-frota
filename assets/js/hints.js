// Popover de ajuda: um botão .hint[data-hint] abre uma caixinha com o texto.
// Fecha no toque fora ou num segundo toque. Um único elemento reaproveitado.
(function () {
  const pop = document.createElement('div');
  pop.className = 'hint-pop';
  document.body.appendChild(pop);
  let openFor = null;

  function close() { pop.classList.remove('show'); openFor = null; }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.hint');
    if (btn) {
      e.preventDefault();                       // não foca o input associado
      if (openFor === btn) return close();      // segundo toque fecha
      pop.textContent = btn.dataset.hint || '';
      pop.classList.add('show');
      openFor = btn;
      position(btn);
      return;
    }
    if (openFor && !pop.contains(e.target)) close();   // toque fora fecha
  });

  window.addEventListener('resize', close);

  // Posiciona logo abaixo do botão, sem estourar a borda da tela.
  function position(btn) {
    const r = btn.getBoundingClientRect();
    const edge = window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8;
    let left = window.scrollX + r.left;
    left = Math.max(window.scrollX + 8, Math.min(left, edge));
    pop.style.left = left + 'px';
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
  }
})();
