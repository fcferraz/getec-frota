# GETEC Frota — Spec técnico

Gestão de km e abastecimento da frota de veículos da GETEC. App web responsivo, mobile-first, para funcionários lançarem dados pelo celular e o administrador acompanhar tudo.

## Contexto

- Projeto paralelo, pontual, para a empresa GETEC.
- Administrador gerencia gastos e frota; funcionários lançam dados via celular.
- Todo mundo loga (Supabase Auth) — sem acesso anônimo.
- Frota com mais de um veículo.
- Sempre com internet — não precisa de suporte offline.
- Fotos de recibo de abastecimento são obrigatórias no fluxo.

## Stack

- **Frontend**: HTML + CSS + JS puro (vanilla), sem build/npm. Supabase JS SDK via CDN.
- **Backend**: Supabase (Postgres + Auth + Storage). Ver `schema.sql` para o schema completo com RLS.
- **Deploy**: GitHub Pages (repo próprio, `git push` para publicar).
- **Repositório**: novo repo, sugestão `getec-frota`.

## Estrutura de pastas sugerida

```
getec-frota/
├── index.html          # login
├── app.html             # shell logado (home, roteamento client-side simples)
├── assets/
│   ├── css/style.css
│   ├── js/
│   │   ├── supabase-client.js   # inicialização do client (url + anon key)
│   │   ├── auth.js
│   │   ├── abastecimento.js
│   │   ├── viagem.js
│   │   ├── dashboard.js
│   │   └── admin.js
│   └── img/
├── schema.sql            # referência do schema Supabase (não é executado no app)
└── README.md
```

## Papéis

- **funcionario**: cria abastecimentos e viagens; vê apenas o próprio histórico.
- **admin**: vê e gerencia tudo, cadastra veículos e usuários, acessa dashboard e relatórios.

RLS já garante isso no banco (ver `schema.sql`) — o front só precisa esconder/mostrar telas conforme o papel do usuário logado (tabela `usuarios.papel`).

## Navegação

Barra de navegação fixa no rodapé (padrão mobile), igual em todas as telas, com destaque no item ativo e respeito à safe-area:

- **Início**, **Abastecer**, **Viagem**, **Histórico** — para todos.
- **Painel** — 5º item, só aparece para `papel = 'admin'`. Abre um hub de administração com três atalhos: **Painel do admin** (`dashboard.html`), **Veículos** e **Usuários**. Funcionário nunca vê esse item (barra com 4 itens).

A visibilidade é só de UI; o RLS é a trava real. As telas de admin (`#veiculos`, `#usuarios`, hub) e o `dashboard.html` também redirecionam/bloqueiam não-admin.

## Telas

### 1. Login e autocadastro
Abas **"Entrar"** e **"Criar conta"** no mesmo cartão, mesmo visual.

**Entrar**: email/senha via `signInWithPassword`. Link **"Esqueci minha senha"** chama `resetPasswordForEmail(email)`; a tela `reset-senha.html` recebe o token do email e salva a nova senha via `updateUser({ password })`.

**Criar conta (autocadastro)**: campos nome, email, senha. `signUp({ email, password, options: { data: { nome } } })` e, com sessão, insere a linha em `usuarios` (id, nome, email). Todo autocadastro entra como **funcionario/ativo** — forçado pelo trigger `forcar_papel_funcionario_autocadastro` no banco (não dá pra burlar nem via API direta; ver Regras de negócio). O admin promove a admin depois, se precisar, pela tela de usuários.

Confirmação de e-mail (Supabase Auth → "Confirm email"):
- **Desligada**: `signUp` já devolve sessão → cria a linha em `usuarios` e vai pro app.
- **Ligada**: `signUp` não devolve sessão → mostra "confirme seu e-mail". A linha em `usuarios` é criada no primeiro login (app.html cria se não existir, usando o `nome` do metadata). Assim o fluxo funciona nas duas configurações.

O admin ainda pode criar contas manualmente pelo Supabase (Authentication → Users) quando quiser — os dois caminhos convivem.

### 2. Home do funcionário
Dois botões grandes: **Abastecer** e **Registrar viagem**. Lista curta com os últimos lançamentos próprios.

### 3. Formulário de abastecimento
Campos: veículo (select), data, km do odômetro, litros, valor total, posto, foto do recibo (`<input type="file" accept="image/*" capture="environment">` para abrir a câmera direto no celular), observação.
Upload da foto vai para o bucket `recibos` no caminho `{usuario_id}/{timestamp}.jpg`; salva a URL em `foto_recibo_url`.

### 4. Formulário de viagem
Campos: veículo (select), data, km final, foto do odômetro (obrigatória), destino, motivo, observação.

**Km inicial não é digitado pelo motorista** — é derivado automaticamente pelo banco (trigger `definir_km_inicial_viagem`, `before insert`): pega o `km_final` da última viagem daquele veículo ou, se for a primeira viagem, o `km_atual` do veículo. O front apenas **exibe** esse valor esperado (mesma consulta) como campo somente-leitura antes do envio; a fonte da verdade é o trigger, então nem enviamos `km_inicial` no insert. Isso fecha a brecha de fraude de o motorista digitar um km inicial menor que o real.

A **foto do odômetro no km final é obrigatória** (mesmo padrão da foto de recibo: `capture="environment"`). Upload no bucket `recibos` com prefixo `km-` no nome (`{usuario_id}/km-{timestamp}.jpg`); o caminho é salvo em `foto_km_final_url`. Assim o km final de cada viagem — que vira o km inicial da próxima — fica sempre comprovado por foto.

`km_rodado` continua calculado pelo banco (`km_final - km_inicial`). Viagens seguem individuais (várias por dia no mesmo veículo são normais); cada km final fotografado encadeia no início da próxima.

### 5. Dashboard do admin
- Gasto total de combustível por veículo/período
- Km rodado por veículo/período
- Custo médio por km
- Ranking de uso por funcionário
- Filtros por veículo, funcionário e intervalo de datas

### 6. Histórico (todos)
Histórico completo do próprio usuário — abastecimentos + viagens combinados, ordenados por data desc, com "Carregar mais" (limite crescente). Admin vê o próprio histórico aqui (a visão cruzada de todos fica no dashboard).

### 7. Gestão de veículos (admin)
CRUD: placa, modelo, apelido, km atual. Editar e alternar ativo/inativo. **Soft-delete apenas** (nunca apaga de verdade — abastecimentos/viagens referenciam `veiculo_id`). Veículos inativos somem dos selects de abastecimento/viagem, mas continuam nos registros históricos e no dashboard.

### 8. Gestão de usuários (admin)
Lista de usuários (nome, email, papel, ativo). Admin alterna papel (admin ↔ funcionario) e ativo/inativo (soft-delete, mesma razão dos veículos). **Não cria contas** — criar conta Auth exige a secret key, que não pode ir pro front. A conta é criada manualmente no Supabase (Authentication → Users) e a linha adicionada na tabela `usuarios`; a UI traz uma nota curta explicando isso. O admin não consegue mexer no próprio registro (evita auto-lockout).

## Regras de negócio

- `valor_por_litro` e `km_rodado` são calculados pelo banco (colunas geradas) — o front não precisa calcular, só exibir.
- Autocadastro é sempre `funcionario`/`ativo`: o trigger `forcar_papel_funcionario_autocadastro` (`before insert` em `usuarios`) sobrescreve `papel` e `ativo` quando quem insere não é admin. Só admin consegue criar/promover admin. Não dá pra burlar mandando `papel: 'admin'` na chamada.
- `viagens.km_inicial` é definido pelo banco via trigger `before insert` (`km_final` da última viagem do veículo, ou `km_atual` na primeira) — o front nunca envia esse valor, só exibe o esperado. Todo km final exige foto do odômetro (`foto_km_final_url`). Antifraude: motorista não consegue forjar o km inicial nem por chamada direta à API.
- Trigger no banco atualiza `veiculos.km_atual` automaticamente a cada novo lançamento.
- Funcionário só enxerga e edita os próprios registros (garantido por RLS, mas o front deve refletir isso na UI).

## Fases de implementação (para o Claude Code seguir em ordem)

1. **Setup**: criar projeto no Supabase, rodar `schema.sql`, criar bucket `recibos` (já incluso no script), configurar Auth (email/senha, desabilitar signup público).
2. **Estrutura do repo + login**: scaffolding das pastas, tela de login funcionando, sessão persistida, link "esqueci minha senha" e tela `reset-senha.html`.
3. **Fluxo do funcionário**: home, formulário de abastecimento (com upload de foto) e formulário de viagem.
4. **Dashboard do admin**: agregações e filtros.
5. **Gestão de veículos e usuários** (admin).
6. **Polimento mobile**: testar em viewport de celular, ajustar toques/botões grandes, validar formulários.
7. **Deploy**: publicar no GitHub Pages, configurar domínio/subpasta se necessário.

## Padrões de copy e UI

- Sentence case, tom direto, sem jargão técnico nos rótulos.
- Botões descrevem a ação: "Salvar abastecimento", não "Enviar".
- Erros de formulário: explicar o que falta, nunca genérico tipo "erro ao salvar".
- Mobile-first: botões grandes, campos numéricos com teclado numérico (`inputmode="decimal"`), foto via câmera nativa do celular.
