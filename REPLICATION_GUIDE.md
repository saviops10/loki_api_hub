# Guia de Replicação e Restauração - L.O.K.I API HUB

Este documento detalha como replicar o ambiente e restaurar a aplicação utilizando os recursos da Cloudflare.

## 1. Configuração de Recursos Cloudflare (Sugestões)

Para uma arquitetura escalável e resiliente, utilize os seguintes nomes e configurações:

| Recurso | Nome Sugerido | Finalidade |
| :--- | :--- | :--- |
| **D1 Database** | `loki-db-prod` | Armazenamento relacional (Usuários, APIs, Endpoints). |
| **KV Namespace** | `loki-kv-sessions` | Cache de sessões e controle de Rate Limit distribuído. |
| **R2 Bucket** | `loki-r2-payloads` | Armazenamento de corpos de resposta grandes (>1MB) para manter o D1 leve. |

## 2. Arquivo de Configuração (wrangler.toml)

```yaml
name: loki-api-hub
main: server.ts
compatibility_date: "2024-01-01"

# Configuração do D1
d1_databases:
  - binding: DB
    database_name: loki-db-prod
    database_id: 50816303-3353-45dd-9b31-d85d65ff138a

# Configuração do KV
kv_namespaces:
  - binding: SESSIONS
    id: <ID_GERADO_NO_DASHBOARD>

# Configuração do R2
r2_buckets:
  - binding: PAYLOADS
    bucket_name: loki-r2-payloads

[env.production]
vars:
  NODE_ENV: "production"
  ENCRYPTION_KEY: "SUA_CHAVE_MESTRA_AQUI"
```

## 3. Passos para Restauração

1. **Provisionamento**: Crie os recursos no dashboard da Cloudflare com os nomes acima.
2. **Schema**: Execute o arquivo `database/schema.sql` no console do D1:
   ```bash
   npx wrangler d1 execute loki-db-prod --file=./database/schema.sql
   ```
3. **Variáveis de Ambiente**: Configure a `ENCRYPTION_KEY` no painel de Secrets da Cloudflare para garantir que os tokens criptografados no banco antigo possam ser lidos.
4. **Deploy**:
   ```bash
   npm run build
   npx wrangler deploy
   ```

## 4. Estratégia de Backup
- **D1**: Utilize o recurso de "Backups" automático do Cloudflare (retenção de 30 dias).
- **R2**: Configure políticas de ciclo de vida para deletar logs antigos (ex: após 90 dias) para controle de custos.
