// Shared auth helpers. Session is persisted by supabase-js in localStorage.

async function currentSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) return null;
  return data.session;
}

// Páginas que exigem sessão — só nelas faz sentido chutar pro login.
function isProtectedPage() {
  const p = location.pathname.split('/').pop();
  return p === 'app.html' || p === 'dashboard.html';
}

// Refresh token inválido/expirado (ex.: "refresh_token_not_found") faz o
// supabase-js emitir SIGNED_OUT em background. Sem isso a página logada só
// quebrava; aqui redirecionamos pro login em vez de falhar em silêncio.
supabaseClient.auth.onAuthStateChange((event, session) => {
  if ((event === 'SIGNED_OUT' || !session) && isProtectedPage())
    location.replace('index.html');
});

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
