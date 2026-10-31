# Back na AWS

O back sobe com o perfil `aws` (`back/src/main/resources/application-aws.properties`). Tudo que muda
por ambiente vem de variável de ambiente (modelo: `projetos-mamore-aws.env.exemplo`). Sem `PROJETOS_DB_URL`,
`PROJETOS_DB_SENHA`, `PROJETOS_JWT_SEGREDO` ou `PROJETOS_CORS_ORIGENS`, ele não sobe.

## Desenho

```
navegador ──HTTPS──> CloudFront/S3 (front)        ┐
navegador ──HTTPS──> ALB :443 (certificado ACM) ──HTTP──> back :8080 (EC2/ECS, sub-rede privada) ──TLS──> RDS PostgreSQL
                                                                     └──papel IAM──> S3 (arquivos)
```

Se front e back ficarem no **mesmo domínio** (CloudFront com o comportamento `/api/*` apontando para o
ALB), o build do front não precisa de nada. Se a API ficar em outro domínio, gere o front com
`VITE_API_URL=https://api.seudominio/api`. Nos dois casos, `PROJETOS_CORS_ORIGENS` precisa ter o domínio real do
front: origem fora da lista recebe 403, inclusive no login.

**Com CloudFront na frente da API**, o IP que o back enxerga pode ser o da borda do CloudFront, e várias pessoas
passam a dividir o limite de login. Prefira a API em subdomínio próprio, direto no ALB, ou confirme esse limite
antes de abrir o sistema.

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
- **Segredos**: `PROJETOS_DB_SENHA` e `PROJETOS_JWT_SEGREDO` no SSM Parameter Store (SecureString) ou Secrets Manager.
- **S3**: papel IAM da instância/tarefa com `politica-iam-s3.json` (sem chaves no ambiente).
  Bucket com "Block all public access" ligado — os arquivos abrem por link assinado de 5 minutos.
- **Opcional**: AWS WAF no ALB com a regra gerenciada de rate limit por IP (o limite do back é por instância).

## Imagem

```bash
docker build -t projetos-mamore-back ./back
docker run --env-file deploy/aws/projetos-mamore-aws.env -p 8080:8080 projetos-mamore-back
curl http://localhost:8080/actuator/health   # {"status":"UP"}
```

Sem Docker (EC2/Beanstalk Java): `./mvnw package -DskipTests` e rodar
`java -jar target/projetos-mamore-1.0.0.jar` com `SPRING_PROFILES_ACTIVE=aws` e as variáveis acima.

## Banco no RDS

Banco: `projetos_mamore` (sem espaço: o RDS só aceita letras, números e `_` no nome). O banco local não
sobe para a AWS: o RDS começa vazio, só com os usuários iniciais `administrador01` e `usuario`.

1. Crie o RDS PostgreSQL em `sa-east-1` com identificador `projetos-mamore`, usuário `postgres`, banco inicial
   `projetos_mamore`, sem acesso público e com o checklist acima.
2. De uma máquina que alcance o RDS (o security group só libera o back), aplique o schema uma única vez:

   ```bash
   psql "host=<endpoint> dbname=projetos_mamore user=postgres sslmode=require" \
     -v ON_ERROR_STOP=1 -f back/src/main/resources/db/projetos-mamore.sql
   ```

3. Preencha `deploy/aws/projetos-mamore-aws.env` (não versionado) a partir do modelo, com o endpoint em `PROJETOS_DB_URL` e a
   senha em `PROJETOS_DB_SENHA`.
4. Suba o back e confira o health check. O `administrador01` entra direto na página `/admin`. O `usuario` entra nas
   telas do sistema com `Mamore@2026` e define a própria senha: a troca é obrigatória, e até lá ele fica sem
   permissões.

O `projetos-mamore.sql` é o schema completo. Depois do primeiro deploy, toda mudança de schema entra nele e também
em um script de migração, que precisa ser aplicado no RDS antes do novo back subir (a aplicação só valida o
schema; com coluna faltando, ela não sobe).

## S3

Crie o bucket `projetos-mamore` em `sa-east-1`. O nome de bucket é único em toda a AWS: se já existir, use outro
em `PROJETOS_S3_BUCKET` e atualize o ARN em `politica-iam-s3.json`.
