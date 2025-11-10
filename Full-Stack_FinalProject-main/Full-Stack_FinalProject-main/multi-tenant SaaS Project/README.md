# Multi-Tenant SaaS Dashboard

Complete multi-tenant SaaS application with data isolation, runtime theming, and JWT authentication.

## Quick Start
```bash
# 1. Start all services
docker-compose up -d

# 2. Access application
open http://localhost:3000

# 3. Login credentials
# ACME: acme / admin@acme.com / password
# TechStart: techstart / admin@techstart.com / password
```

## Features
- ✅ Multi-tenant data isolation
- ✅ JWT authentication with tenant binding
- ✅ Runtime theming (no redeployment)
- ✅ Admin console for customization
- ✅ Compound indexes for performance
- ✅ Rate limiting per tenant
- ✅ Correlation ID tracking
- ✅ Docker containerized

## Testing
```bash
docker-compose exec api npm test
```

## Stop Services
```bash
docker-compose down
```
```

**`.gitignore`**
```
node_modules/
.env
*.log
.DS_Store
build/
dist/
mongo-data/