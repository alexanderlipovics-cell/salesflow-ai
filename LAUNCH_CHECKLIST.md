# 🚀 SalesFlow AI - Production Launch Checklist

## Pre-Launch Checklist (T-24h)

### Infrastructure
- [ ] **Domain & DNS**
  - [ ] `salesflow.ai` A record → Load Balancer IP
  - [ ] `www.salesflow.ai` CNAME → `salesflow.ai`
  - [ ] `api.salesflow.ai` A record → Load Balancer IP
  - [ ] `monitoring.salesflow.ai` A record → Internal IP
  - [ ] DNS propagation verified (use `dig` or `nslookup`)
  - [ ] TTL set to 300 (5 minutes) for quick rollback

- [ ] **SSL/TLS Certificates**
  - [ ] Let's Encrypt certificates generated
  - [ ] Certificate auto-renewal configured (certbot timer)
  - [ ] SSL Labs test: A+ rating
  - [ ] HSTS header enabled
  - [ ] Certificate expiry monitoring configured

- [ ] **Load Balancer**
  - [ ] Nginx configuration tested
  - [ ] Health checks configured
  - [ ] Rate limiting tested
  - [ ] Upstream servers responding

### Database
- [ ] **Supabase Production**
  - [ ] Production project created
  - [ ] All migrations applied
  - [ ] RLS policies verified
  - [ ] Connection pooling enabled
  - [ ] Backup schedule configured
  - [ ] Point-in-time recovery enabled

- [ ] **Performance**
  - [ ] All indexes created (002_performance_indexes.sql)
  - [ ] Materialized views created
  - [ ] Query performance tested (<50ms avg)
  - [ ] Connection pool size adequate (20+)

### Application
- [ ] **Backend (FastAPI)**
  - [ ] Production environment variables set
  - [ ] Secret key generated (32+ chars)
  - [ ] CORS configured for production domains
  - [ ] Rate limiting enabled
  - [ ] Sentry DSN configured
  - [ ] Health endpoint responding

- [ ] **Frontend (Next.js)**
  - [ ] Production build successful
  - [ ] Environment variables set
  - [ ] API URL pointing to production
  - [ ] Supabase keys configured
  - [ ] Error boundaries in place

- [ ] **Redis**
  - [ ] Persistence enabled (AOF)
  - [ ] Memory limit configured
  - [ ] Connection to API verified
  - [ ] Cache invalidation tested

### Security
- [ ] **Authentication**
  - [ ] JWT secret configured
  - [ ] Token expiry set appropriately
  - [ ] Password hashing verified (bcrypt)
  - [ ] Brute force protection enabled

- [ ] **API Security**
  - [ ] Rate limiting active
  - [ ] Input validation working
  - [ ] SQL injection prevention verified
  - [ ] XSS protection headers set

- [ ] **Infrastructure Security**
  - [ ] Firewall rules configured
  - [ ] SSH key-only authentication
  - [ ] Non-root user for services
  - [ ] Secrets not in code/logs

### Monitoring
- [ ] **Prometheus**
  - [ ] All targets healthy
  - [ ] Alerting rules loaded
  - [ ] Retention configured (15 days)

- [ ] **Grafana**
  - [ ] Dashboards imported
  - [ ] Admin password changed
  - [ ] Alerting channels configured

- [ ] **Sentry**
  - [ ] Frontend SDK configured
  - [ ] Backend SDK configured
  - [ ] Source maps uploaded
  - [ ] Alert rules configured

### Backup & Recovery
- [ ] **Database Backup**
  - [ ] Automated backup script working
  - [ ] S3 bucket created and accessible
  - [ ] Test restore successful
  - [ ] Backup encryption enabled

- [ ] **Disaster Recovery**
  - [ ] Rollback procedure documented
  - [ ] Recovery time objective (RTO): <15 min
  - [ ] Recovery point objective (RPO): <1 hour

---

## Launch Day Checklist (T-0)

### Pre-Launch (T-2h)
- [ ] Final code review completed
- [ ] All tests passing
- [ ] Staging environment fully tested
- [ ] Team on standby for issues
- [ ] Slack channel for launch communication

### Deployment (T-0)
```bash
# 1. Verify staging is stable
curl https://staging.salesflow.ai/health
curl https://staging-api.salesflow.ai/health

# 2. Create database backup
./scripts/backup.sh

# 3. Deploy to production
git push origin main  # Triggers CI/CD

# 4. Monitor deployment
watch -n 5 'curl -s https://api.salesflow.ai/health | jq'

# 5. Verify all services
curl https://salesflow.ai
curl https://api.salesflow.ai/health
curl https://api.salesflow.ai/metrics | head -20
```

### Post-Launch Verification
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Lead creation works
- [ ] Dashboard loads with data
- [ ] Webhooks receiving data
- [ ] Mobile responsive check
- [ ] Performance acceptable (<500ms P95)

### Monitoring (First Hour)
- [ ] Error rate < 0.1%
- [ ] Response time < 500ms P95
- [ ] No critical Sentry errors
- [ ] Database connections stable
- [ ] Redis cache hit rate > 90%
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%

---

## Rollback Procedure

### Automatic Rollback (CI/CD)
Triggered when:
- Health check fails after deployment
- Error rate > 10% for 2 minutes
- P95 latency > 2s for 5 minutes

### Manual Rollback
```bash
# SSH to production server
ssh deploy@production.salesflow.ai

# Option 1: Rollback via Docker
cd /opt/salesflow
docker-compose -f docker-compose.prod.yml down
cat rollback-images.txt | xargs -I {} docker pull {}
docker-compose -f docker-compose.prod.yml up -d

# Option 2: Rollback via Git
cd /opt/salesflow
git log --oneline -5  # Find previous good commit
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml up -d --build

# Verify rollback
curl https://api.salesflow.ai/health
```

### Database Rollback
```bash
# Restore from latest backup
./scripts/backup.sh restore-db /opt/salesflow/backups/database/latest.sql.gz

# Or restore from S3
aws s3 cp s3://salesflow-backups/database/2024/01/01/salesflow_db_20240101.sql.gz .
./scripts/backup.sh restore-db salesflow_db_20240101.sql.gz
```

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | - | - |
| DevOps | - | - |
| Database Admin | - | - |
| On-Call Engineer | - | PagerDuty |

---

## Post-Launch Tasks (T+24h)

- [ ] Review Sentry errors
- [ ] Analyze performance metrics
- [ ] Review user feedback
- [ ] Update documentation
- [ ] Schedule post-mortem (if needed)
- [ ] Plan first iteration improvements

---

## Useful Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web

# Restart service
docker-compose -f docker-compose.prod.yml restart api

# Scale API
docker-compose -f docker-compose.prod.yml up -d --scale api=5

# Check resource usage
docker stats

# Database connections
psql -h localhost -U salesflow -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
redis-cli INFO | grep -E "(used_memory|connected_clients|keyspace)"

# Nginx status
curl localhost/nginx_status

# SSL certificate expiry
echo | openssl s_client -servername salesflow.ai -connect salesflow.ai:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Success Metrics (First Week)

| Metric | Target | Actual |
|--------|--------|--------|
| Uptime | 99.9% | - |
| Error Rate | < 0.1% | - |
| P95 Latency | < 500ms | - |
| User Signups | 100+ | - |
| Daily Active Users | 50+ | - |
| Leads Created | 500+ | - |
| Support Tickets | < 10 | - |

---

**🎉 Launch Complete! 🎉**

Remember:
1. Stay calm
2. Monitor closely for first 24 hours
3. Respond quickly to issues
4. Celebrate wins!
