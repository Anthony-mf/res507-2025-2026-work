# Architecture de Production - Quote Application

## Design d'Architecture Production-Ready

Cette section présente une architecture de production complète pour l'application quote-app, incluant haute disponibilité, monitoring, sécurité et CI/CD.

---

## Architecture Multi-Nœuds

### Diagramme d'Architecture Complète

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Internet                                                                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Cloud Load Balancer    │
                    │  (AWS ELB / GCP LB)     │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────────┐
│ Kubernetes Cluster (3+ Worker Nodes)                                     │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Ingress Controller (NGINX / Traefik)                             │   │
│  │ - SSL Termination                                                 │   │
│  │ - Rate Limiting                                                   │   │
│  │ - Path-based Routing                                              │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │                                                 │
│  ┌──────────────────────▼───────────────────────────────────────────┐   │
│  │ Service: quote-app (ClusterIP)                                    │   │
│  └──────────────────────┬───────────────────────────────────────────┘   │
│                         │                                                 │
│  ┌──────────────────────▼───────────────────────────────────────────┐   │
│  │ Deployment: quote-app (replicas: 3+)                              │   │
│  │                                                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Pod (Node1) │  │ Pod (Node2) │  │ Pod (Node3) │              │   │
│  │  │ quote-app   │  │ quote-app   │  │ quote-app   │              │   │
│  │  │ CPU: 100m   │  │ CPU: 100m   │  │ CPU: 100m   │              │   │
│  │  │ Mem: 128Mi  │  │ Mem: 128Mi  │  │ Mem: 128Mi  │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ StatefulSet: postgres (replicas: 1 primary + 2 replicas)         │   │
│  │                                                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Primary     │  │ Replica 1   │  │ Replica 2   │              │   │
│  │  │ (Read/Write)│  │ (Read Only) │  │ (Read Only) │              │   │
│  │  │ PVC: 10Gi   │  │ PVC: 10Gi   │  │ PVC: 10Gi   │              │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Monitoring Stack                                                   │   │
│  │  ├── Prometheus (métriques)                                       │   │
│  │  ├── Grafana (dashboards)                                         │   │
│  │  └── AlertManager (alertes)                                       │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Logging Stack                                                      │   │
│  │  ├── Fluentd (collecte logs)                                      │   │
│  │  ├── Elasticsearch (stockage logs)                                │   │
│  │  └── Kibana (visualisation)                                       │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ Stockage Externe (Hors Cluster)                                           │
│  ├── S3 / Cloud Storage (backups base de données)                         │
│  ├── EBS / Persistent Disks (volumes Kubernetes)                          │
│  └── Backup automatique quotidien                                         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CI/CD Pipeline (Hors Cluster)                                             │
│  ├── GitHub Actions / GitLab CI                                           │
│  ├── Docker Registry (ECR / GCR / Docker Hub)                             │
│  └── ArgoCD / Flux (GitOps)                                               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Ce qui Tourne DANS Kubernetes

### 1. **Applications (Workloads)**

#### quote-app (Deployment)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: quote-app
spec:
  replicas: 3  # Minimum pour haute disponibilité
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime deployments
```

**Pourquoi dans K8s** :
- ✅ Application stateless
- ✅ Scaling horizontal facile
- ✅ Rolling updates automatiques
- ✅ Self-healing

#### PostgreSQL (StatefulSet)
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  replicas: 3  # 1 primary + 2 replicas
  serviceName: postgres
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

**Pourquoi dans K8s** :
- ✅ StatefulSet garantit l'ordre et l'identité stable
- ✅ PersistentVolumes pour données
- ✅ Réplication automatique (avec opérateur)
- ⚠️ Alternative : Base de données managée (RDS, Cloud SQL)

---

### 2. **Monitoring (Observabilité)**

#### Prometheus Stack
```yaml
# Prometheus pour collecter les métriques
# Grafana pour les dashboards
# AlertManager pour les alertes
```

**Métriques collectées** :
- CPU/Memory par pod
- Nombre de requêtes HTTP
- Latence des requêtes
- Taux d'erreurs
- Santé des pods (readiness/liveness)

**Alertes configurées** :
- Pod crashloop (> 3 restarts en 5 min)
- Haute latence (> 500ms)
- Taux d'erreur élevé (> 5%)
- Ressources saturées (CPU > 80%)

---

### 3. **Logging (Centralisation des Logs)**

#### EFK Stack (Elasticsearch, Fluentd, Kibana)
```yaml
# Fluentd : DaemonSet sur chaque nœud
# Elasticsearch : StatefulSet pour stockage
# Kibana : Deployment pour visualisation
```

**Logs collectés** :
- Logs applicatifs (stdout/stderr)
- Logs Kubernetes (events, audit)
- Logs d'accès (nginx ingress)

**Rétention** : 30 jours dans Elasticsearch, archivage S3 pour audit

---

### 4. **Ingress Controller**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: quote-app-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
    - hosts:
        - quotes.example.com
      secretName: quotes-tls
  rules:
    - host: quotes.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: quote-app
                port:
                  number: 80
```

**Fonctionnalités** :
- SSL/TLS automatique (cert-manager + Let's Encrypt)
- Rate limiting (protection DDoS)
- Path-based routing
- Load balancing

---

## Ce qui Tourne dans des VMs (Hors Kubernetes)

### 1. **Nœuds Kubernetes Eux-Mêmes**

```
VM 1 (Master Node)
├── OS: Ubuntu 22.04 LTS
├── RAM: 4GB
├── CPU: 2 cores
└── Rôle: Control Plane (API Server, Scheduler, Controller Manager)

VM 2, 3, 4 (Worker Nodes)
├── OS: Ubuntu 22.04 LTS
├── RAM: 8GB
├── CPU: 4 cores
└── Rôle: Exécution des pods
```

**Pourquoi en VMs** :
- Isolation entre nœuds
- Facilité de scaling (ajouter/retirer des VMs)
- Snapshots et backups
- Compatibilité cloud

---

### 2. **Base de Données Managée (Alternative)**

Si vous utilisez un service managé :
```
AWS RDS PostgreSQL
├── Instance: db.t3.medium
├── Multi-AZ: Oui (haute disponibilité)
├── Backups automatiques: Quotidiens
└── Réplication: Read replicas
```

**Avantages** :
- ✅ Backups automatiques
- ✅ Patches automatiques
- ✅ Haute disponibilité built-in
- ✅ Monitoring inclus
- ⚠️ Coût plus élevé
- ⚠️ Moins de contrôle

---

## Ce qui Tourne HORS du Cluster

### 1. **CI/CD Pipeline**

#### GitHub Actions Workflow
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t quote-app:${{ github.sha }} .
      
      - name: Run tests
        run: npm test
      
      - name: Push to registry
        run: docker push quote-app:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/quote-app \
            quote-app=quote-app:${{ github.sha }}
```

**Étapes** :
1. Code push → GitHub
2. Tests automatiques
3. Build image Docker
4. Push vers registry
5. Déploiement Kubernetes (GitOps)

---

### 2. **Docker Registry**

```
AWS ECR / Google GCR / Docker Hub
├── Images versionnées (tags)
├── Scan de sécurité automatique
└── Rétention: 30 dernières versions
```

---

### 3. **Backup et Disaster Recovery**

#### Stratégie de Backup

**Base de Données** :
```bash
# Backup quotidien automatique
0 2 * * * pg_dump quotes > /backup/quotes-$(date +%Y%m%d).sql

# Upload vers S3
aws s3 cp /backup/quotes-$(date +%Y%m%d).sql \
  s3://quote-app-backups/db/
```

**Volumes Kubernetes** :
```yaml
# Velero pour backup de volumes
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
      - quote-lab
```

**Rétention** :
- Quotidien : 7 jours
- Hebdomadaire : 4 semaines
- Mensuel : 12 mois

---

### 4. **DNS et CDN**

```
CloudFlare / Route53
├── DNS: quotes.example.com → Load Balancer
├── CDN: Cache des assets statiques
└── DDoS Protection
```

---

### 5. **Secrets Management**

**HashiCorp Vault (Hors cluster)**
```
Vault Server (VM dédiée)
├── Stockage sécurisé des secrets
├── Rotation automatique des credentials
├── Audit log complet
└── Integration K8s via CSI driver
```

**Alternative** : AWS Secrets Manager, Azure Key Vault

---

## Stratégie de Persistence

### 1. **Volumes Persistants**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd  # SSD pour performance
  resources:
    requests:
      storage: 10Gi
```

**StorageClass** :
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3  # SSD
  iops: "3000"
  throughput: "125"
```

---

### 2. **Backup Strategy**

| Type | Fréquence | Rétention | Stockage |
|------|-----------|-----------|----------|
| **Snapshots DB** | Quotidien | 7 jours | S3 |
| **Full Backup** | Hebdomadaire | 4 semaines | S3 Glacier |
| **Volumes K8s** | Quotidien | 7 jours | EBS Snapshots |
| **Config K8s** | À chaque changement | Git (infini) | GitHub |

---

## Monitoring et Logging

### 1. **Dashboards Grafana**

**Dashboard Application** :
- Requêtes/seconde
- Latence P50, P95, P99
- Taux d'erreurs
- Pods actifs

**Dashboard Infrastructure** :
- CPU/Memory par nœud
- Disk I/O
- Network traffic
- Pod scheduling time

---

### 2. **Alertes Critiques**

```yaml
# AlertManager configuration
groups:
  - name: quote-app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Taux d'erreur élevé (> 5%)"
      
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        annotations:
          summary: "Pod en crash loop"
```

**Canaux d'alerte** :
- Slack (alertes non-critiques)
- PagerDuty (alertes critiques)
- Email (résumé quotidien)

---

## Sécurité

### 1. **Network Policies**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quote-app-policy
spec:
  podSelector:
    matchLabels:
      app: quote-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: nginx-ingress
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

---

### 2. **RBAC (Role-Based Access Control)**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: quote-app-deployer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "update", "patch"]
```

---

### 3. **Pod Security Standards**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: quote-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
    - name: quote-app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
```

---

## Coûts Estimés (AWS)

| Composant | Type | Coût Mensuel |
|-----------|------|--------------|
| **EKS Control Plane** | Managé | $73 |
| **Worker Nodes (3x t3.medium)** | EC2 | $75 |
| **Load Balancer** | ALB | $23 |
| **RDS PostgreSQL (db.t3.small)** | Managé | $30 |
| **EBS Volumes (30GB)** | SSD | $3 |
| **S3 Backups (100GB)** | Standard | $2 |
| **CloudWatch Logs** | Logging | $10 |
| **Total** | | **~$216/mois** |

---

## Conclusion : Architecture Production

**Ce qui tourne dans Kubernetes** :
- ✅ Applications (quote-app)
- ✅ Bases de données (postgres StatefulSet)
- ✅ Monitoring (Prometheus, Grafana)
- ✅ Logging (EFK stack)
- ✅ Ingress (NGINX)

**Ce qui tourne dans des VMs** :
- ✅ Nœuds Kubernetes eux-mêmes
- ✅ Bases de données managées (alternative)

**Ce qui tourne hors du cluster** :
- ✅ CI/CD (GitHub Actions)
- ✅ Docker Registry (ECR/GCR)
- ✅ Backups (S3)
- ✅ DNS/CDN (CloudFlare)
- ✅ Secrets Management (Vault)

**Principes clés** :
1. **Haute disponibilité** : Minimum 3 réplicas
2. **Zero-downtime** : Rolling updates
3. **Observabilité** : Monitoring + Logging complets
4. **Sécurité** : Network policies, RBAC, Secrets
5. **Disaster Recovery** : Backups automatiques quotidiens
