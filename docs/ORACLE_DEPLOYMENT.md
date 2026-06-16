# Veterans Passage Oracle Deployment

This guide keeps the current stack: React frontend, FastAPI backend, and MongoDB.
Do not put real secrets in Git.

## Oracle Setup

1. Create an Oracle Cloud VM, preferably Ubuntu 22.04 or newer.
2. Open ingress for `80`, `443`, and SSH. Keep MongoDB private inside Docker.
3. Install Docker and the Docker Compose plugin.
4. Point DNS records to the VM public IP.
5. Put TLS in front of the containers with Nginx Proxy Manager, Caddy, Traefik, or Oracle Load Balancer.

## Required Environment

Copy `deploy/oracle.env.example` to a private file on the server, for example:

```bash
cp deploy/oracle.env.example .env.production
chmod 600 .env.production
```

Required values:

```bash
JWT_SECRET=replace-with-a-strong-random-32-plus-character-secret
FRONTEND_URL=https://your-domain.example
CORS_ORIGINS=https://your-domain.example,https://www.your-domain.example
PUBLIC_API_URL=https://api.your-domain.example
ADMIN_EMAIL=admin@your-domain.example
ADMIN_PASSWORD=replace-with-a-strong-temporary-password
SUPERADMIN_EMAIL=glolightmedia@gmail.com
SUPERADMIN_PASSWORD=replace-with-a-strong-temporary-superadmin-password
```

Generate `JWT_SECRET` on your workstation or server:

```bash
openssl rand -base64 48
```

If OpenSSL is not available:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use `ENVIRONMENT=production`, `COOKIE_SECURE=true`, and `COOKIE_SAMESITE=none` when frontend and backend are on HTTPS origins.
`SUPERADMIN_PASSWORD` is only needed for first bootstrap or approved recovery. Remove it from the runtime env after confirming the SuperAdmin account works.

Domain examples:

```bash
# Current hosted domain during transition
FRONTEND_URL=https://veteranpassage.org
CORS_ORIGINS=https://veteranpassage.org,https://www.veteranpassage.org,https://veteran-pathways.emergent.host,https://www.veteran-pathways.emergent.host
PUBLIC_API_URL=https://api.your-domain.example

# Future Oracle/Cloudflare deployment
FRONTEND_URL=https://veteranpassage.org
CORS_ORIGINS=https://veteranpassage.org,https://www.veteranpassage.org
PUBLIC_API_URL=https://api.veteranpassage.org
```

SuperAdmin bootstrap:

1. Set `SUPERADMIN_EMAIL=glolightmedia@gmail.com`.
2. Set a strong temporary `SUPERADMIN_PASSWORD`.
3. Start the backend.
4. Log in as `glolightmedia@gmail.com` and verify the SuperAdmin dashboard loads.
5. Remove `SUPERADMIN_PASSWORD` from the server env.
6. Recreate the backend container so the password is no longer present in runtime environment variables.

## Docker Compose Commands

Validate configuration:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Build and start:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

View logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

## MongoDB Persistence

MongoDB data is stored in the named Docker volume `mongodb_data`.
Do not run `docker compose down -v` unless you intentionally want to delete database data.

## Backup Notes

Create a backup:

```bash
docker compose -f docker-compose.prod.yml exec mongodb mongodump --archive=/tmp/veterans-passage.archive
docker cp $(docker compose -f docker-compose.prod.yml ps -q mongodb):/tmp/veterans-passage.archive ./veterans-passage-$(date +%F).archive
```

Restore a backup:

```bash
docker cp ./veterans-passage.archive $(docker compose -f docker-compose.prod.yml ps -q mongodb):/tmp/veterans-passage.archive
docker compose -f docker-compose.prod.yml exec mongodb mongorestore --archive=/tmp/veterans-passage.archive --drop
```

Keep offsite encrypted backups before every deployment.

## Dependency Audits

The frontend deployment path is npm-based because the production Dockerfile uses npm and this repo now includes `frontend/package-lock.json`.
Use the legacy peer resolver until the existing React/CRA/date-fns peer conflicts are cleaned up:

```bash
cd frontend
npm ci --legacy-peer-deps
npm audit --omit=dev
```

For Python dependency scanning, install the scanner locally or in CI, not as a runtime backend dependency:

```bash
python -m pip install pip-audit
cd backend
python -m pip_audit -r requirements.txt
```

Treat high/critical findings as release blockers unless they are proven unreachable in production.

## Production Notes

- The frontend API base is set at build time with `PUBLIC_API_URL`, passed to `REACT_APP_BACKEND_URL`.
- Backend CORS is controlled by `FRONTEND_URL` and `CORS_ORIGINS`.
- Dev admin bootstrap must stay disabled in production.
- `JWT_SECRET`, `ADMIN_PASSWORD`, and `SUPERADMIN_PASSWORD` must be strong in production.
- `SUPERADMIN_EMAIL` defaults to `glolightmedia@gmail.com`; no SuperAdmin is created unless `SUPERADMIN_PASSWORD` is set.
- Stripe, Square, and AI integrations are not required for the Oracle container stack to boot.
