# Back na AWS

O back sobe com o perfil `aws` (`back/src/main/resources/application-aws.properties`). Tudo que muda
por ambiente vem de variável de ambiente (modelo: `apae-aws.env.exemplo`). Sem `APAE_DB_URL`,
`APAE_DB_SENHA`, `APAE_JWT_SEGREDO` ou `APAE_CORS_ORIGENS`, ele não sobe.

## Desenho

```
navegador ──HTTPS──> CloudFront/S3 (front)        ┐
navegador ──HTTPS──> ALB :443 (certificado ACM) ──HTTP──> back :8080 (EC2/ECS, sub-rede privada) ──TLS──> RDS PostgreSQL
                                                                     └──papel IAM──> S3 (arquivos)
```

Se front e back ficarem no **mesmo domínio** (CloudFront com o comportamento `/api/*` apontando para o
ALB), o front não precisa de nada. Se a API ficar em outro domínio, gere o front com
`VITE_API_URL=https://api.seudominio/api` e coloque o domínio do front em `APAE_CORS_ORIGENS`.

## Rotas

| Rota | Acesso |
|---|---|
| `POST /api/autenticacao/entrar`, `/renovar`, `/sair` | públicas, com limite por IP (429 ao passar) |
| `GET /actuator/health` (e `/liveness`, `/readiness`) | pública, só `{"status":"UP"}` — use no health check do ALB |
| `/api/**` | JWT obrigatório + permissão por rota (`@PreAuthorize`) |
| `/api/arquivos-locais/**` | desligada no perfil `aws` (só desenvolvimento) |
| qualquer outra | negada (403) |

## Checklist de segurança na AWS

- **ALB**: listener 443 com certificado do ACM; listener 80 só redireciona para 443.
  Health check: `GET /actuator/health`, código 200.
- **Security groups**: back aceita a porta 8080 **só do SG do ALB**; RDS aceita a 5432 **só do SG do back**.
  Back e RDS em sub-redes privadas; RDS sem acesso público.
- **RDS**: criptografia em repouso ligada, backups automáticos, `sslmode=require` na URL.
- **Segredos**: `APAE_DB_SENHA` e `APAE_JWT_SEGREDO` no SSM Parameter Store (SecureString) ou Secrets Manager.
- **S3**: papel IAM da instância/tarefa com `politica-iam-s3.json` (sem chaves no ambiente).
  Bucket com "Block all public access" ligado — os arquivos abrem por link assinado de 5 minutos.
- **Opcional**: AWS WAF no ALB com a regra gerenciada de rate limit por IP (o limite do back é por instância).

## Imagem

```bash
docker build -t apae-back ./back
docker run --env-file deploy/aws/apae-aws.env -p 8080:8080 apae-back
curl http://localhost:8080/actuator/health   # {"status":"UP"}
```

Sem Docker (EC2/Beanstalk Java): `./mvnw package -DskipTests` e rodar
`java -jar target/central-secretaria-1.0.0.jar` com `SPRING_PROFILES_ACTIVE=aws` e as variáveis acima.

O schema do banco é o mesmo de sempre: `back/src/main/resources/db/apae.sql` + `deploy/migracoes/`.
