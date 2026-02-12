# Architecture Notes - Conteneurs vs Machines Virtuelles

## Tableau Comparatif : Conteneurs vs Machines Virtuelles

| Critère | Conteneurs | Machines Virtuelles (VMs) |
|---------|-----------|---------------------------|
| **Partage du Kernel** | Partagent le kernel de l'OS hôte. Tous les conteneurs sur un même hôte utilisent le même kernel Linux. | Chaque VM a son propre kernel complet. Isolation totale au niveau du système d'exploitation. |
| **Temps de Démarrage** | Très rapide (quelques secondes, voire millisecondes). Démarrage quasi-instantané car pas de boot de l'OS. | Lent (plusieurs minutes). Nécessite le démarrage complet d'un système d'exploitation. |
| **Overhead de Ressources** | Très léger. Pas de duplication de l'OS. Utilise seulement les ressources nécessaires à l'application. Typiquement quelques Mo de RAM. | Lourd. Chaque VM nécessite une copie complète de l'OS (plusieurs Go de RAM et disque). L'hyperviseur ajoute aussi de l'overhead. |
| **Isolation de Sécurité** | Isolation au niveau processus via namespaces et cgroups. Moins forte car kernel partagé. Une vulnérabilité kernel peut affecter tous les conteneurs. | Isolation très forte au niveau matériel virtuel. Chaque VM est complètement isolée avec son propre kernel. Compromission d'une VM n'affecte pas les autres. |
| **Complexité Opérationnelle** | Plus simple à déployer et gérer. Images légères, orchestration facilitée (Kubernetes). Portabilité élevée. | Plus complexe. Nécessite gestion de l'hyperviseur, provisionnement de VMs complètes, patches OS multiples. Moins portable. |

---

## Quand Préférer une VM plutôt qu'un Conteneur ?

### Cas d'Usage pour les Machines Virtuelles :

1. **Isolation de Sécurité Critique**
   - Applications manipulant des données hautement sensibles (finance, santé, défense)
   - Environnements multi-tenants où l'isolation absolue est requise
   - Exemple : Héberger des applications de clients différents sur la même infrastructure

2. **Systèmes d'Exploitation Différents**
   - Besoin d'exécuter plusieurs OS différents (Linux, Windows, BSD) sur le même matériel
   - Applications legacy nécessitant des versions spécifiques d'OS
   - Exemple : Exécuter une application Windows Server sur un hôte Linux

3. **Contrôle Total du Kernel**
   - Applications nécessitant des modules kernel spécifiques
   - Personnalisation profonde du système d'exploitation
   - Tests de compatibilité kernel
   - Exemple : Développement de drivers ou modules kernel

4. **Conformité et Régulations**
   - Certaines normes de sécurité (PCI-DSS, HIPAA) peuvent exiger une isolation au niveau VM
   - Audits de sécurité nécessitant une séparation physique virtuelle

5. **Applications Monolithiques Legacy**
   - Applications anciennes non conçues pour la conteneurisation
   - Systèmes nécessitant un état système complet
   - Exemple : Anciennes applications d'entreprise avec dépendances système complexes

---

## Quand Combiner Conteneurs et VMs ?

### Architectures Hybrides - Meilleurs des Deux Mondes :

1. **Kubernetes sur VMs**
   - **Architecture** : Cluster Kubernetes déployé sur des VMs
   - **Avantages** :
     - Isolation forte entre les nœuds du cluster (niveau VM)
     - Flexibilité et scalabilité des conteneurs à l'intérieur
     - Sécurité renforcée pour les workloads critiques
   - **Exemple** : Notre application quote-app tourne dans des conteneurs Kubernetes, mais le cluster lui-même peut être déployé sur des VMs cloud (AWS EC2, Azure VMs, GCP Compute Engine)

2. **Environnements Multi-Tenants**
   - **Architecture** : Une VM par client/tenant, conteneurs à l'intérieur de chaque VM
   - **Avantages** :
     - Isolation forte entre clients (VM)
     - Densité et efficacité à l'intérieur de chaque tenant (conteneurs)
   - **Exemple** : Plateforme SaaS où chaque client a sa propre VM, mais déploie plusieurs microservices en conteneurs

3. **Développement et CI/CD**
   - **Architecture** : VMs pour les environnements de build, conteneurs pour les applications
   - **Avantages** :
     - VMs fournissent des environnements de build isolés et reproductibles
     - Conteneurs pour packager et déployer les artefacts
   - **Exemple** : GitLab Runners sur VMs exécutant des pipelines qui buildent des images Docker

4. **Migration Progressive (Lift and Shift)**
   - **Architecture** : Applications legacy en VMs, nouveaux services en conteneurs
   - **Avantages** :
     - Migration progressive sans refonte complète
     - Modernisation incrémentale de l'infrastructure
   - **Exemple** : Base de données Oracle en VM, nouvelle API REST en conteneurs Kubernetes

5. **Sécurité en Profondeur (Defense in Depth)**
   - **Architecture** : Conteneurs sensibles exécutés dans des VMs dédiées
   - **Avantages** :
     - Double couche d'isolation (VM + conteneur)
     - Réduction de la surface d'attaque
   - **Exemple** : Conteneurs traitant des paiements dans des VMs isolées du reste de l'infrastructure

6. **Cloud Hybride et Edge Computing**
   - **Architecture** : VMs dans le datacenter on-premise, conteneurs pour les workloads cloud et edge
   - **Avantages** :
     - Compatibilité avec infrastructure existante (VMs)
     - Portabilité et légèreté pour le cloud/edge (conteneurs)
   - **Exemple** : Système de gestion centralisé en VMs, capteurs IoT avec conteneurs légers

---

## Résumé des Décisions

### Choisir les Conteneurs quand :
- ✅ Vous développez des microservices modernes
- ✅ Vous avez besoin de scalabilité rapide
- ✅ Vous voulez optimiser l'utilisation des ressources
- ✅ Vous privilégiez la portabilité et le DevOps

### Choisir les VMs quand :
- ✅ Vous avez besoin d'isolation de sécurité maximale
- ✅ Vous devez exécuter différents OS
- ✅ Vous gérez des applications legacy
- ✅ Vous devez respecter des contraintes de conformité strictes

### Combiner les deux quand :
- ✅ Vous voulez la sécurité des VMs ET l'agilité des conteneurs
- ✅ Vous gérez une infrastructure multi-tenant
- ✅ Vous êtes en phase de migration/modernisation
- ✅ Vous construisez une architecture cloud-native sur infrastructure existante

---

## Application à Notre Projet Quote-App

Dans notre architecture Kubernetes actuelle :
- **Conteneurs** : `quote-app` et `postgres` tournent en conteneurs pour la portabilité et l'orchestration
- **Potentiel VM** : Le cluster Kubernetes lui-même pourrait tourner sur des VMs pour :
  - Isolation entre environnements (dev/staging/prod)
  - Sécurité renforcée si déployé en production
  - Compatibilité avec infrastructure cloud existante

**Architecture typique en production** :
```
Cloud Provider (AWS/GCP/Azure)
    └── VMs (nœuds Kubernetes)
        └── Pods (conteneurs quote-app et postgres)
            └── Conteneurs applicatifs
```

Cette approche hybride combine la robustesse des VMs avec l'agilité des conteneurs.

---

## Scaling Horizontal (Horizontal Scaling)

### Mise en Pratique avec quote-app

Le scaling horizontal consiste à augmenter le nombre de réplicas (instances) d'une application pour gérer plus de charge, plutôt que d'augmenter les ressources d'une seule instance (scaling vertical).

#### Commandes Exécutées

```bash
# Scaler le deployment à 3 réplicas
kubectl scale deployment quote-app --replicas=3

# Vérifier les pods
kubectl get pods
```

#### Résultat Observé

```
NAME                         READY   STATUS    RESTARTS   AGE
postgres-6f759cbf79-qs8bx    1/1     Running   0          56m
quote-app-6bbcb5cb87-tc6g7   0/1     Evicted   0          4h31m
quote-app-7f87bc4dc6-g5cx9   1/1     Running   0          10s
quote-app-7f87bc4dc6-pbr2v   1/1     Running   0          10s
quote-app-7f87bc4dc6-rrrq4   1/1     Running   0          3h17m
```

**Observations** :
- ✅ 3 pods `quote-app` actifs (g5cx9, pbr2v, rrrq4)
- ✅ Démarrage rapide des nouveaux pods (10 secondes)
- ✅ 1 pod postgres (pas scalé, car base de données stateful)
- ⚠️ 1 pod évincé (Evicted) - manque de ressources précédemment

---

### Ce Qui Change Quand On Scale

#### 1. **Nombre de Pods**
- Passage de 1 à 3 instances de `quote-app`
- Kubernetes crée automatiquement les nouveaux pods selon le template du Deployment

#### 2. **Distribution de la Charge (Load Balancing)**
- Le Service `quote-app` distribue automatiquement les requêtes entre les 3 réplicas
- Chaque rafraîchissement de page peut être servi par un pod différent
- Utilisation du mécanisme de load balancing round-robin ou aléatoire de Kubernetes

#### 3. **Résilience et Haute Disponibilité**
- Si un pod tombe, les 2 autres continuent de servir les requêtes
- Kubernetes redémarre automatiquement le pod défaillant
- Pas d'interruption de service (downtime réduit)

#### 4. **Capacité de Traitement**
- Capacité théorique multipliée par 3
- Peut gérer 3x plus de requêtes simultanées
- Meilleure utilisation des ressources du cluster

#### 5. **Consommation de Ressources**
- CPU et mémoire utilisés multipliés par ~3
- Chaque pod consomme ses propres ressources
- Important de surveiller les limites du cluster

---

### Ce Qui NE Change PAS Quand On Scale

#### 1. **Le Service (Endpoint Unique)**
- L'adresse du service reste identique : `quote-app:80`
- Les clients n'ont pas besoin de connaître le nombre de réplicas
- Le DNS interne Kubernetes pointe toujours vers le même service

#### 2. **La Base de Données**
- Un seul pod PostgreSQL (volontairement)
- Les 3 réplicas `quote-app` se connectent à la même instance de base de données
- Les données restent cohérentes et centralisées

#### 3. **La Configuration**
- Variables d'environnement identiques pour tous les pods
- Même image Docker utilisée (`quote-app:local`)
- Même configuration de probes (readiness/liveness)

#### 4. **Le Code de l'Application**
- L'application elle-même n'a pas besoin d'être modifiée
- Pas de logique spéciale pour gérer le scaling
- L'application reste stateless (sans état local)

#### 5. **Les Volumes Persistants**
- Le PersistentVolumeClaim postgres reste unique
- Pas de duplication des données
- Seul le pod postgres y accède

---

### Comportement Observé lors du Test

#### Test avec Port-Forward

```bash
kubectl port-forward svc/quote-app 8080:80
```

En rafraîchissant la page plusieurs fois :

**Réponses Cohérentes** ✅
- Les données affichées sont identiques (même base de données)
- Les citations proviennent de la même source PostgreSQL
- Pas de divergence de données entre les réplicas

**Réponses Potentiellement Différentes** ⚠️
- Le pod qui répond peut changer à chaque requête
- Si l'application loggait l'ID du pod, on verrait des IDs différents
- Les temps de réponse peuvent varier légèrement selon le pod

---

### Quand Scaler Horizontalement ?

#### ✅ Scaler Quand :
- Le trafic augmente (plus d'utilisateurs)
- Vous avez besoin de haute disponibilité
- Vous voulez réduire le risque de downtime
- L'application est stateless (sans état local)
- Vous voulez distribuer la charge

#### ❌ Ne PAS Scaler Quand :
- L'application est stateful avec état local (comme une base de données traditionnelle)
- Les ressources du cluster sont limitées
- L'application n'est pas thread-safe ou a des problèmes de concurrence
- Le bottleneck est ailleurs (base de données, réseau)

---

### Différence : Scaling Horizontal vs Vertical

| Aspect | Scaling Horizontal | Scaling Vertical |
|--------|-------------------|------------------|
| **Méthode** | Ajouter plus de pods/instances | Augmenter CPU/RAM d'un pod |
| **Commande** | `kubectl scale --replicas=N` | Modifier `resources.limits` dans le deployment |
| **Limite** | Limitée par les nœuds du cluster | Limitée par la taille maximale d'un nœud |
| **Résilience** | Haute (plusieurs instances) | Faible (single point of failure) |
| **Coût** | Linéaire avec le nombre d'instances | Peut être exponentiel (grandes VMs coûteuses) |
| **Cas d'usage** | Applications stateless, microservices | Applications stateful, bases de données |

---

### Application à Notre Architecture

Dans notre cas **quote-app** :
- ✅ **Scalable horizontalement** : Application Node.js stateless
- ✅ **Service load balancer** : Distribue automatiquement les requêtes
- ❌ **PostgreSQL non scalé** : Base de données stateful, nécessite une stratégie différente (réplication, clustering)

**Architecture après scaling** :
```
Service: quote-app (port 80)
    ├── Pod: quote-app-1 (port 3000)
    ├── Pod: quote-app-2 (port 3000)
    └── Pod: quote-app-3 (port 3000)
         ↓ (tous se connectent à)
Service: postgres (port 5432)
    └── Pod: postgres (unique)
```

**Point d'Attention** : La base de données devient un potentiel bottleneck. Pour scaler PostgreSQL, il faudrait :
- Utiliser une solution de réplication (Primary-Replica)
- Utiliser un opérateur Kubernetes (CloudNativePG, Zalando Postgres Operator)
- Ou utiliser une base de données managée (AWS RDS, Google Cloud SQL)
