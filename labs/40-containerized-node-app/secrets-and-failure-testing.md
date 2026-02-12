# Secrets Kubernetes et Test de Panne Contrôlée

## Test de Panne Contrôlée

### Objectif
Introduire une erreur intentionnelle dans le deployment pour observer comment Kubernetes gère les échecs et comprendre les mécanismes de récupération.

---

### Test Effectué : Image Invalide

#### 1. Introduction de l'Erreur

**Modification du deployment.yaml** :
```yaml
# Avant (image valide)
image: quote-app:local

# Après (image invalide)
image: quote-app:invalid-tag-does-not-exist
```

**Application** :
```bash
kubectl apply -f deployment.yaml
```

---

#### 2. Observation de l'Échec

**État des Pods** :
```bash
$ kubectl get pods

NAME                         READY   STATUS             RESTARTS   AGE
postgres-6f759cbf79-qs8bx    1/1     Running            0          105m
quote-app-774db5fc77-j44f8   0/1     ImagePullBackOff   0          2m
quote-app-c87bc649d-5bwx2    1/1     Running            0          19m
```

**Observations** :
- ✅ Ancien pod (`c87bc649d-5bwx2`) continue de fonctionner
- ❌ Nouveau pod (`774db5fc77-j44f8`) en état `ImagePullBackOff`
- ✅ Application reste disponible (rolling update intelligent)

---

#### 3. Détails du Pod en Échec

```bash
$ kubectl describe pod quote-app-774db5fc77-j44f8

Name:             quote-app-774db5fc77-j44f8
Namespace:        quote-lab
Status:           Pending
IP:               10.42.0.24

Containers:
  quote-app:
    Image:          quote-app:invalid-tag-does-not-exist
    State:          Waiting
      Reason:       ImagePullBackOff
    Ready:          False
    Restart Count:  0

Events:
  Type     Reason     Age                  From               Message
  ----     ------     ----                 ----               -------
  Normal   Scheduled  2m13s                default-scheduler  Successfully assigned quote-lab/quote-app-774db5fc77-j44f8
  Normal   Pulling    40s (x4 over 2m13s)  kubelet            Pulling image "quote-app:invalid-tag-does-not-exist"
  Warning  Failed     39s (x4 over 2m12s)  kubelet            Failed to pull image: failed to pull and unpack image
  Warning  Failed     39s (x4 over 2m12s)  kubelet            Error: ErrImagePull
  Normal   BackOff    10s (x7 over 2m11s)  kubelet            Back-off pulling image
  Warning  Failed     10s (x7 over 2m11s)  kubelet            Error: ImagePullBackOff
```

**Analyse des Événements** :
1. **Scheduled** : Pod assigné à un nœud ✅
2. **Pulling** : Tentative de téléchargement de l'image (4 fois)
3. **Failed** : Échec du pull (image n'existe pas) ❌
4. **ErrImagePull** : Erreur initiale
5. **ImagePullBackOff** : Kubernetes attend avant de réessayer (backoff exponentiel)

---

#### 4. Événements Globaux du Cluster

```bash
$ kubectl get events --sort-by='.lastTimestamp' | tail -20

2m46s  Normal   ScalingReplicaSet   deployment/quote-app    Scaled up replica set quote-app-774db5fc77 from 0 to 1
2m46s  Normal   SuccessfulCreate    replicaset/quote-app-774db5fc77   Created pod: quote-app-774db5fc77-j44f8
72s    Normal   Pulling             pod/quote-app-774db5fc77-j44f8    Pulling image "quote-app:invalid-tag-does-not-exist"
71s    Warning  Failed              pod/quote-app-774db5fc77-j44f8    Failed to pull image
71s    Warning  Failed              pod/quote-app-774db5fc77-j44f8    Error: ErrImagePull
15s    Normal   BackOff             pod/quote-app-774db5fc77-j44f8    Back-off pulling image
15s    Warning  Failed              pod/quote-app-774db5fc77-j44f8    Error: ImagePullBackOff
```

---

#### 5. Correction de l'Erreur

**Restauration de l'image correcte** :
```yaml
image: quote-app:local
```

**Application** :
```bash
kubectl apply -f deployment.yaml
```

**Résultat** :
```bash
$ kubectl get pods

NAME                         READY   STATUS    RESTARTS   AGE
postgres-6f759cbf79-qs8bx    1/1     Running   0          115m
quote-app-58d4dd8c85-wpncv   1/1     Running   0          2m
```

✅ Nouveau pod créé avec succès
✅ Ancien pod en échec automatiquement supprimé
✅ Application fonctionne normalement

---

### Leçons Apprises du Test de Panne

#### 1. **Rolling Update Intelligent**
- Kubernetes ne supprime PAS l'ancien pod tant que le nouveau n'est pas prêt
- **Résultat** : Zero-downtime même avec une erreur de configuration

#### 2. **Backoff Exponentiel**
- Kubernetes ne réessaye pas immédiatement
- Délai entre tentatives : 10s, 20s, 40s, 80s... (max 5 minutes)
- **Avantage** : Évite de surcharger le registry avec des requêtes inutiles

#### 3. **Événements Détaillés**
- Tous les événements sont loggés
- Facilite le debugging
- **kubectl describe** est votre meilleur ami !

#### 4. **Résilience par Défaut**
- L'application reste disponible pendant l'échec
- Aucun impact utilisateur
- **Kubernetes protège votre production**

---

## Configuration Basée sur Secrets

### Problème : Credentials en Clair

**Avant (MAUVAIS)** :
```yaml
env:
  - name: DATABASE_URL
    value: "postgres://quoteuser:quotepass@postgres:5432/quotes"
```

**Problèmes** :
- ❌ Mot de passe visible dans le fichier YAML
- ❌ Stocké dans Git (historique permanent)
- ❌ Visible dans `kubectl describe pod`
- ❌ Accessible à quiconque peut lire le deployment
- ❌ Difficile de changer sans redéployer

---

### Solution : Kubernetes Secrets

#### 1. Création du Secret

```bash
kubectl create secret generic quote-db-secret \
  --from-literal=DATABASE_URL="postgres://quoteuser:quotepass@postgres:5432/quotes"
```

**Résultat** :
```bash
secret/quote-db-secret created
```

**Vérification** :
```bash
$ kubectl get secrets

NAME               TYPE     DATA   AGE
quote-db-secret    Opaque   1      10s
```

**Détails du Secret** :
```bash
$ kubectl describe secret quote-db-secret

Name:         quote-db-secret
Namespace:    quote-lab
Type:         Opaque

Data
====
DATABASE_URL:  55 bytes
```

**Note** : La valeur n'est PAS affichée dans `describe` ✅

---

#### 2. Référencer le Secret dans le Deployment

**Modification du deployment.yaml** :
```yaml
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: quote-db-secret
        key: DATABASE_URL
```

**Application** :
```bash
kubectl apply -f deployment.yaml
```

---

#### 3. Vérification du Fonctionnement

**État des Pods** :
```bash
$ kubectl get pods

NAME                         READY   STATUS    RESTARTS   AGE
quote-app-58d4dd8c85-wpncv   1/1     Running   0          2m
```

**Vérification de l'environnement** :
```bash
$ kubectl exec -it quote-app-58d4dd8c85-wpncv -- env | grep DATABASE

DATABASE_URL=postgres://quoteuser:quotepass@postgres:5432/quotes
```

✅ Variable d'environnement correctement injectée
✅ Application fonctionne normalement
✅ Connexion à la base de données OK

---

### Pourquoi les Secrets sont Meilleurs que le Texte en Clair

#### 1. **Séparation des Préoccupations**

```
Code (Git)                    Secrets (Kubernetes)
├── deployment.yaml           ├── quote-db-secret
│   (pas de credentials)      │   (credentials stockés)
└── Public, versionné         └── Privé, non versionné
```

**Avantage** :
- Code peut être public sans exposer les secrets
- Secrets gérés séparément par l'équipe ops

---

#### 2. **Rotation Facile des Credentials**

**Sans Secrets** :
```bash
1. Modifier deployment.yaml
2. Commit dans Git
3. kubectl apply -f deployment.yaml
4. Redémarrage des pods
```

**Avec Secrets** :
```bash
1. kubectl create secret generic quote-db-secret \
     --from-literal=DATABASE_URL="new-password" \
     --dry-run=client -o yaml | kubectl apply -f -
2. kubectl rollout restart deployment/quote-app
```

**Avantage** : Pas de modification de code, pas de commit Git

---

#### 3. **Contrôle d'Accès (RBAC)**

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
    resourceNames: ["quote-db-secret"]
```

**Avantage** :
- Seuls certains utilisateurs peuvent lire les secrets
- Audit trail de qui accède aux secrets
- Principe du moindre privilège

---

#### 4. **Pas de Fuite dans les Logs**

**Avec valeur en clair** :
```bash
$ kubectl describe pod quote-app-xxx

Environment:
  DATABASE_URL: postgres://quoteuser:quotepass@postgres:5432/quotes
```
❌ Mot de passe visible !

**Avec Secret** :
```bash
$ kubectl describe pod quote-app-xxx

Environment:
  DATABASE_URL:  <set to the key 'DATABASE_URL' in secret 'quote-db-secret'>
```
✅ Valeur masquée !

---

### Les Secrets sont-ils Chiffrés par Défaut ?

#### Réponse : **Partiellement**

##### 1. **En Transit : OUI ✅**

```
kubectl → API Server
    ↓
  TLS/HTTPS (chiffré)
    ↓
API Server → etcd
    ↓
  TLS (chiffré)
```

**Toutes les communications sont chiffrées en transit.**

---

##### 2. **Au Repos (etcd) : NON par défaut ❌**

**Par défaut** :
```
etcd (base de données Kubernetes)
└── Secrets stockés en Base64 (PAS chiffré !)
```

**Base64 n'est PAS du chiffrement** :
```bash
$ echo "postgres://user:pass@host:5432/db" | base64
cG9zdGdyZXM6Ly91c2VyOnBhc3NAaG9zdDo1NDMyL2Ri

$ echo "cG9zdGdyZXM6Ly91c2VyOnBhc3NAaG9zdDo1NDMyL2Ri" | base64 -d
postgres://user:pass@host:5432/db
```

**Risque** : Si quelqu'un accède à etcd, il peut lire les secrets !

---

##### 3. **Chiffrement au Repos : Configuration Requise**

**Pour activer le chiffrement** :

```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}  # Fallback pour anciens secrets
```

**Activation** :
```bash
# Modifier le API Server
--encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

**Après activation** :
- ✅ Nouveaux secrets chiffrés avec AES-CBC
- ✅ Anciens secrets progressivement re-chiffrés
- ✅ Clé de chiffrement stockée séparément

---

### Alternatives aux Secrets Kubernetes

#### 1. **HashiCorp Vault**

```
Application → Vault Agent → Vault Server
                              ↓
                         Secrets stockés chiffrés
                         Rotation automatique
                         Audit complet
```

**Avantages** :
- ✅ Chiffrement fort par défaut
- ✅ Rotation automatique des credentials
- ✅ Audit trail complet
- ✅ Support multi-cloud

---

#### 2. **Cloud Provider Secrets**

- **AWS** : Secrets Manager / Parameter Store
- **GCP** : Secret Manager
- **Azure** : Key Vault

**Intégration K8s** :
```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "quote-db-credentials"
        objectType: "secretsmanager"
```

---

### Bonnes Pratiques pour les Secrets

#### 1. **Ne JAMAIS commiter les secrets dans Git**

```bash
# .gitignore
secrets/
*.secret
*-secret.yaml
```

---

#### 2. **Utiliser des Outils de Gestion**

- **Sealed Secrets** : Chiffre les secrets pour Git
- **SOPS** : Chiffrement de fichiers YAML
- **Vault** : Gestion centralisée

---

#### 3. **Rotation Régulière**

```bash
# Rotation mensuelle automatique
0 0 1 * * /scripts/rotate-db-password.sh
```

---

#### 4. **Principe du Moindre Privilège**

```yaml
# Chaque application a ses propres secrets
quote-app → quote-db-secret
admin-app → admin-db-secret
```

---

#### 5. **Monitoring et Audit**

```bash
# Qui a accédé aux secrets ?
kubectl get events --field-selector involvedObject.kind=Secret
```

---

## Résumé : Secrets vs Texte en Clair

| Aspect | Texte en Clair | Secrets Kubernetes |
|--------|----------------|-------------------|
| **Visibilité dans Git** | ❌ Visible | ✅ Caché |
| **Visibilité dans describe** | ❌ Visible | ✅ Masqué |
| **Rotation** | ❌ Difficile | ✅ Facile |
| **RBAC** | ❌ Impossible | ✅ Granulaire |
| **Chiffrement transit** | ❌ Non | ✅ Oui (TLS) |
| **Chiffrement repos** | ❌ Non | ⚠️ Optionnel |
| **Audit** | ❌ Non | ✅ Oui |

---

## Conclusion

### Test de Panne
- ✅ Kubernetes gère intelligemment les échecs
- ✅ Rolling updates protègent la disponibilité
- ✅ Événements détaillés facilitent le debugging

### Secrets
- ✅ Meilleure pratique que le texte en clair
- ✅ Séparation code/configuration
- ⚠️ Chiffrement au repos optionnel (à activer !)
- ✅ Foundation pour une sécurité robuste

**Règle d'or** : Toujours utiliser des Secrets en production, jamais de credentials en clair !
