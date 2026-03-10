# 🟢 L.O.K.I. API Hub
### The Shapeshifter of Serverless Architectures.

L.O.K.I. é um Hub de API Serverless de alta performance projetado para centralizar, monitorar e escalar suas integrações de microsserviços sem a necessidade de gerenciar infraestrutura.

## 🛠 O que significa L.O.K.I.?

Mais do que um nome, L.O.K.I. é o nosso manifesto técnico. Cada letra representa um pilar fundamental da nossa arquitetura:

- **[L]ogging**: Rastreabilidade total. Cada requisição é logada em tempo real com metadados detalhados para debugging instantâneo.
- **[O]peration**: Orquestração inteligente. Transforme payloads, valide esquemas e gerencie rotas complexas através de lógica serverless.
- **[K]ey-access**: Segurança em primeiro lugar. Gestão centralizada de chaves de API, scopes de acesso e autenticação robusta.
- **[I]ntegration**: Conectividade universal. Uma ponte fluida entre seus serviços internos, APIs de terceiros e bancos de dados.

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- Cloudflare Wrangler CLI (para deploy em produção)

### Passo a Passo

1. **Clonar o repositório**
   ```bash
   git clone <repository-url>
   cd loki-api-hub
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:
   ```env
   ENCRYPTION_KEY=sua_chave_de_criptografia_32_chars
   NODE_ENV=development
   ```

4. **Inicializar o Banco de Dados (Local)**
   O projeto utiliza SQLite para desenvolvimento local. O esquema será criado automaticamente ao iniciar o servidor pela primeira vez.

5. **Iniciar o servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000` no seu navegador.

### Deploy (Cloudflare Pages)

O projeto está configurado para ser implantado no **Cloudflare Pages**. O arquivo `wrangler.toml` centraliza as configurações de infraestrutura.

1. Autentique-se no Wrangler: `npx wrangler login`
2. Crie os recursos necessários e anote os IDs:
   - `npx wrangler d1 create loki-db-prod`
   - `npx wrangler kv:namespace create loki-kv-sessions`
   - `npx wrangler r2 bucket create loki-r2-payloads`
3. Abra o arquivo `wrangler.toml` e substitua os placeholders `SEU_DATABASE_ID_AQUI` e `SEU_KV_NAMESPACE_ID_AQUI` pelos IDs reais.
4. Execute o deploy:
   ```bash
   npm run build
   npx wrangler pages deploy dist
   ```

---

## 🛡 Segurança

- Todas as senhas são criptografadas usando `bcryptjs`.
- As chaves de API são armazenadas com criptografia AES-256-GCM.
- Logs sensíveis são automaticamente higienizados (scrubbing) antes do armazenamento.

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🗺 Roadmap de Atualizações

### Fase 2: Segurança Avançada & MFA (Próximo Passo)
- **Google Authenticator (2FA):** Implementação de autenticação em duas etapas para login administrativo.
  - Bibliotecas: `speakeasy` (geração/validação de TOTP) e `qrcode` (geração de QR Code para pareamento).
- **Políticas de Rate Limiting:** Controle granular de requisições por API Key.
- **Alertas Críticos:** Notificações via Webhook/E-mail para falhas de integração.

### Fase 3: Ecossistema & Expansão
- **Custom Domains:** Suporte para domínios personalizados no proxy.
- **SDKs Oficiais:** Lançamento de bibliotecas para Node.js, Python e Go.
- **Marketplace de Plugins:** Extensões para transformação de dados on-the-fly.
