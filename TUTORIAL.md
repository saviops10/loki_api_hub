# 🐍 L.O.K.I API Hub - Tutorial de Instalação e Uso

Bem-vindo ao **L.O.K.I API Hub** (Logging, Operation, Key-access, and Integration). Este guia ajudará você a instalar, configurar e utilizar a plataforma, além de explicar como verificar a integração com os recursos do Cloudflare.

---

## 🚀 1. Instalação e Execução Local

Para rodar a aplicação em seu ambiente de desenvolvimento local, siga os passos abaixo:

### Pré-requisitos
- **Node.js** (v18 ou superior)
- **npm** ou **yarn**

### Passos para Instalação
1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto (ou use o `.env.example` como base):
   ```bash
   cp .env.example .env
   ```
   *Nota: O sistema já vem pré-configurado com chaves padrão para desenvolvimento.*

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:3000`.

---

## 🔑 2. Acesso e Primeiro Uso

### Credenciais Padrão
O sistema é inicializado automaticamente com um usuário administrador para testes:
- **Usuário:** `admin`
- **Senha:** `root123!`

### Requisitos de Senha para Novos Cadastros
Ao criar uma nova conta, sua senha deve atender aos seguintes critérios de segurança:
- Mínimo de **8 caracteres**.
- Pelo menos uma **letra maiúscula**.
- Pelo menos uma **letra minúscula**.
- Pelo menos um **número**.
- Pelo menos um **caractere especial** (ex: `@$!%*?&`).

### Fluxo de Uso
1. **Login:** Acesse a página de login e entre com as credenciais acima ou crie uma nova conta.
2. **Dashboard:** No painel principal, você verá suas APIs registradas e estatísticas de uso.
3. **Registrar API:** Clique em "Add New API" para conectar um serviço externo.
   - Configure o **Auth Type** (None, API Key ou OAuth2).
   - Se usar OAuth2, o Loki gerenciará a renovação automática dos tokens para você.
4. **Gerenciar Endpoints:** Dentro de cada API, adicione os caminhos (ex: `/users`, `/orders`) que deseja expor através do Hub.
5. **Proxy Loki:** Use a URL do Hub para fazer chamadas aos seus serviços. O Loki injetará as credenciais necessárias e registrará os logs.

---

## ☁️ 3. Integração Cloudflare (D1, KV, R2)

A aplicação está preparada para ser implantada no **Cloudflare Pages** e utilizar o ecossistema de alto desempenho da Cloudflare.

### Configuração no `wrangler.toml`
O arquivo `wrangler.toml` já contém as definições necessárias:
- **D1 Database:** Armazenamento relacional para usuários e configurações.
- **KV Storage:** Cache de sessões e tokens de alta velocidade.
- **R2 Storage:** Armazenamento de payloads e logs extensos.

### Como Verificar a Integração
Se você estiver implantando ou testando a integração, siga estes passos para validar:

#### A. Verificação via Admin Panel
1. Faça login como **Administrador**.
2. Vá para o **Admin Panel** (ícone de escudo no menu de perfil).
3. Acesse a aba **System Status**.
4. Esta aba exibe o status de conexão com o banco D1, KV e R2.
   - *Nota: Em ambiente local (Node.js), o sistema simula estas conexões usando SQLite local (`data.db`).*

#### B. Verificação via CLI (Wrangler)
Para testar se os bindings estão corretos antes do deploy:
```bash
# Verificar D1
npx wrangler d1 execute loki-db-prod --command "SELECT 1"

# Verificar KV
npx wrangler kv:key get --binding=SESSION "test-key"

# Verificar R2
npx wrangler r2 object list loki-r2-payloads
```

#### C. Logs do Servidor
Ao iniciar a aplicação, o servidor registra no console a inicialização do banco de dados. Procure por:
- `[DATABASE] SQLite initialized` (Local)
- `[CLOUDFLARE] D1 Binding detected` (Ao rodar via Wrangler/Pages)

---

## 🛠️ 4. Uso da CLI Loki

O Loki possui uma ferramenta de linha de comando para desenvolvedores localizada no diretório `cli/`.

1. **Instale a CLI globalmente (opcional):**
   ```bash
   cd cli
   npm install -g .
   ```

2. **Comandos básicos:**
   ```bash
   loki login          # Autentica na sua instância do Hub
   loki list           # Lista suas APIs e Endpoints
   loki call <path>    # Faz uma chamada via proxy Loki
   ```

---

## ❓ 5. Solução de Problemas

**Não consigo criar conta:**
- Verifique se o arquivo `data.db` tem permissões de escrita.
- Certifique-se de que o servidor está rodando (`npm run dev`).
- Se estiver no Cloudflare Pages, verifique se o banco D1 foi criado e vinculado corretamente no painel da Cloudflare.

**Erro de Permissão (403):**
- Certifique-se de estar enviando o header `x-loki-api-key` ou o token de sessão correto.

---
*L.O.K.I API Hub - Segurança e Performance em um só lugar.*
