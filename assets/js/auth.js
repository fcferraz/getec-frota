// Shared auth helpers. Session is persisted by supabase-js in localStorage.

async function currentSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

// Guard for logged-in pages. Redirects to login if there is no session.
async function requireAuth() {
  const session = await currentSession();
  if (!session) location.replace('index.html');
  return session;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  location.replace('index.html');
}

// Human-readable message for the common auth errors, in pt-BR.
function authErrorMessage(error) {
  const msg = (error && error.message) || '';
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'E-mail ainda não confirmado.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  return 'Não foi possível concluir. Tente novamente.';
}
