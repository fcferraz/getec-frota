// Mostrar/ocultar senha. Recebe o <span> clicado e alterna o input irmão.
function toggleSenha(el) {
  const input = el.parentElement.querySelector('input');
  input.type = input.type === 'password' ? 'text' : 'password';
}
