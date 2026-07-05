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

## Telas

### 1. Login
Email/senha via Supabase Auth. Sem cadastro público — usuários são criados pelo admin (via painel do Supabase, Authentication → Users).

Inclui um link **"Esqueci minha senha"** que chama `supabase.auth.resetPasswordForEmail(email)`. Fluxo de primeiro acesso:
1. Admin cria a conta do funcionário no Supabase com email real e senha temporária.
2. Admin insere a linha correspondente na tabela `usuarios` (nome, email, papel).
3. Funcionário usa "Esqueci minha senha" no primeiro acesso e define a própria senha.

Precisa de uma tela simples de "Redefinir senha" (`reset-senha.html`) que recebe o token do link do email e permite salvar a nova senha via `supabase.auth.updateUser({ password })`.

### 2. Home do funcionário
Dois botões grandes: **Abastecer** e **Registrar viagem**. Lista curta com os últimos lançamentos próprios.

### 3. Formulário de abastecimento
Campos: veículo (select), data, km do odômetro, litros, valor total, posto, foto do recibo (`<input type="file" accept="image/*" capture="environment">` para abrir a câmera direto no celular), observação.
Upload da foto vai para o bucket `recibos` no caminho `{usuario_id}/{timestamp}.jpg`; salva a URL em `foto_recibo_url`.

### 4. Formulário de viagem
Campos: veículo (select), data, km inicial, km final (km rodado calculado automaticamente pelo banco), destino, motivo, observação.

### 5. Dashboard do admin
- Gasto total de combustível por veículo/período
- Km rodado por veículo/período
- Custo médio por km
- Ranking de uso por funcionário
- Filtros por veículo, funcionário e intervalo de datas

### 6. Gestão de veículos (admin)
CRUD simples: placa, modelo, apelido, ativo/inativo.

### 7. Gestão de usuários (admin)
Lista de usuários, papel (admin/funcionario), ativar/desativar acesso.

## Regras de negócio

- `valor_por_litro` e `km_rodado` são calculados pelo banco (colunas geradas) — o front não precisa calcular, só exibir.
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
