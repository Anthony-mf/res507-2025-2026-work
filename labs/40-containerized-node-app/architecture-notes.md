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

---

## Simulation de Panne et Auto-Réparation

### Test de Résilience : Suppression d'un Pod

Pour tester les capacités d'auto-réparation de Kubernetes, nous avons supprimé manuellement un pod en cours d'exécution.

#### Commandes Exécutées

```bash
# Supprimer un pod spécifique
kubectl delete pod quote-app-7f87bc4dc6-rrrq4

# Observer immédiatement l'état des pods
kubectl get pods
```

#### Résultat Observé

**Avant la suppression** :
```
NAME                         READY   STATUS    RESTARTS   AGE
quote-app-7f87bc4dc6-g5cx9   1/1     Running   0          9m30s
quote-app-7f87bc4dc6-pbr2v   1/1     Running   0          9m30s
quote-app-7f87bc4dc6-rrrq4   1/1     Running   0          3h17m  ← Pod à supprimer
```

**Après la suppression (8 secondes plus tard)** :
```
NAME                         READY   STATUS    RESTARTS   AGE
postgres-6f759cbf79-qs8bx    1/1     Running   0          66m
quote-app-6bbcb5cb87-tc6g7   0/1     Evicted   0          4h41m
quote-app-7f87bc4dc6-822mr   1/1     Running   0          8s     ← Nouveau pod créé automatiquement
quote-app-7f87bc4dc6-g5cx9   1/1     Running   0          9m30s
quote-app-7f87bc4dc6-pbr2v   1/1     Running   0          9m30s
```

**Observations** :
- ✅ Le pod `rrrq4` a été supprimé
- ✅ Un nouveau pod `822mr` a été créé automatiquement en **8 secondes**
- ✅ Le nombre total de réplicas reste à 3 (comme spécifié dans le Deployment)
- ✅ Les 2 autres pods continuent de fonctionner normalement
- ✅ Aucune interruption de service (les requêtes sont servies par les 2 pods restants)

---

### Qui a Recréé le Pod ?

**Réponse : Le Deployment Controller (Contrôleur de Deployment)**

#### Explication Détaillée

1. **Le Deployment Controller** est un composant du control plane de Kubernetes qui surveille en permanence l'état des Deployments.

2. **État Désiré vs État Actuel** :
   - **État désiré** : 3 réplicas (défini dans `deployment.yaml` : `replicas: 3`)
   - **État actuel après suppression** : 2 réplicas en cours d'exécution
   - **Écart détecté** : Il manque 1 réplica

3. **Boucle de Réconciliation** :
   - Le Deployment Controller détecte l'écart entre l'état désiré et l'état actuel
   - Il demande au Scheduler de créer un nouveau pod
   - Le Scheduler choisit un nœud approprié
   - Le Kubelet sur ce nœud démarre le nouveau conteneur

4. **Processus Automatique** :
   - Aucune intervention humaine nécessaire
   - Temps de réaction : quasi-instantané (quelques secondes)
   - Le nouveau pod utilise le même template que les pods existants

---

### Pourquoi le Pod a-t-il été Recréé ?

**Réponse : Pour maintenir l'état désiré spécifié dans le Deployment**

#### Principes Fondamentaux de Kubernetes

1. **Déclaratif vs Impératif** :
   - Kubernetes fonctionne en mode **déclaratif** : vous déclarez l'état désiré
   - Le système travaille en permanence pour atteindre et maintenir cet état
   - Contrairement au mode impératif où vous donnez des commandes explicites

2. **Self-Healing (Auto-Réparation)** :
   - Kubernetes détecte automatiquement les défaillances
   - Il prend des mesures correctives sans intervention humaine
   - Objectif : garantir la haute disponibilité des applications

3. **Desired State Management** :
   - Le Deployment spécifie `replicas: 3`
   - C'est un contrat : "Je veux toujours 3 pods en cours d'exécution"
   - Kubernetes garantit ce contrat en permanence

4. **Résilience par Design** :
   - Les pods sont éphémères (temporaires) par nature
   - Ils peuvent être supprimés, crasher, ou être évincés
   - Le Deployment assure leur remplacement automatique

---

### Que se Passerait-il si le Nœud Lui-Même Tombait ?

**Réponse : Kubernetes replanifierait automatiquement tous les pods du nœud défaillant sur d'autres nœuds disponibles**

#### Scénario de Défaillance de Nœud

##### 1. **Détection de la Panne**

```
Nœud 1 (défaillant)
    ├── quote-app-pod-1  ← Inaccessible
    └── quote-app-pod-2  ← Inaccessible

Nœud 2 (sain)
    └── quote-app-pod-3  ← Continue de fonctionner
```

- Le **Node Controller** détecte que le nœud ne répond plus
- Délai de détection : ~40 secondes par défaut (`node-monitor-grace-period`)
- Après 5 minutes sans réponse, le nœud est marqué comme `NotReady`

##### 2. **Éviction des Pods**

- Les pods sur le nœud défaillant sont marqués comme `Terminating`
- Après un délai (`pod-eviction-timeout`, ~5 minutes par défaut), ils sont considérés comme perdus
- Le Deployment Controller détecte que l'état actuel (1 pod) ne correspond pas à l'état désiré (3 pods)

##### 3. **Replanification Automatique**

```
Nœud 2 (sain)
    ├── quote-app-pod-3  ← Existant
    ├── quote-app-pod-4  ← Nouveau (remplace pod-1)
    └── quote-app-pod-5  ← Nouveau (remplace pod-2)
```

- Le Scheduler choisit des nœuds sains pour les nouveaux pods
- Les nouveaux pods sont créés sur les nœuds disponibles
- Le nombre total de réplicas revient à 3

##### 4. **Temps de Récupération**

- **Détection** : ~40 secondes à 5 minutes (selon la configuration)
- **Replanification** : Quelques secondes une fois la panne détectée
- **Démarrage des pods** : 10-30 secondes (selon l'application)
- **Total** : ~5-10 minutes dans le pire des cas

#### Limitations et Considérations

##### ⚠️ **Perte de Données Potentielle**

Si le nœud hébergeait le pod PostgreSQL avec un volume local :
- Les données pourraient être inaccessibles jusqu'au retour du nœud
- **Solution** : Utiliser des PersistentVolumes avec stockage réseau (NFS, Ceph, cloud storage)
- Notre configuration utilise un PVC, donc les données persistent même si le nœud tombe

##### ⚠️ **Capacité du Cluster**

- Si les nœuds restants n'ont pas assez de ressources (CPU, RAM), les pods ne pourront pas être replanifiés
- Ils resteront en état `Pending`
- **Solution** : Dimensionner le cluster avec de la capacité de réserve

##### ⚠️ **Affinité et Anti-Affinité**

- Si des règles d'affinité sont configurées, elles peuvent limiter les nœuds disponibles
- **Exemple** : Un pod configuré pour tourner uniquement sur des nœuds avec GPU

##### ⚠️ **StatefulSets vs Deployments**

- Les **StatefulSets** (pour bases de données) ont un comportement différent
- Ils ne replanifient pas automatiquement si le nœud est juste `NotReady` (pour éviter le split-brain)
- Ils attendent que le nœud revienne ou qu'il soit explicitement supprimé

---

### Comparaison : Défaillance Pod vs Défaillance Nœud

| Aspect | Défaillance Pod | Défaillance Nœud |
|--------|----------------|------------------|
| **Détection** | Immédiate | 40s à 5 minutes |
| **Récupération** | ~8 secondes | 5-10 minutes |
| **Impact** | Minimal (autres pods actifs) | Potentiellement plusieurs pods affectés |
| **Cause** | Crash application, OOM, liveness probe | Panne matérielle, réseau, kernel panic |
| **Action Kubernetes** | Redémarre le conteneur ou recrée le pod | Replanifie tous les pods du nœud |

---

### Bonnes Pratiques pour la Résilience

#### 1. **Toujours Utiliser des Deployments**
- Ne jamais créer des pods nus (sans contrôleur)
- Les Deployments garantissent l'auto-réparation

#### 2. **Configurer des Réplicas Multiples**
- Minimum 2-3 réplicas pour les applications critiques
- Permet de survivre aux pannes de pods individuels

#### 3. **Utiliser des PodDisruptionBudgets**
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: quote-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: quote-app
```
- Garantit qu'au moins 2 pods restent disponibles pendant les maintenances

#### 4. **Configurer des Probes Appropriées**
- **Liveness Probe** : Détecte les conteneurs bloqués
- **Readiness Probe** : Évite d'envoyer du trafic aux pods non prêts
- **Startup Probe** : Pour les applications avec démarrage lent

#### 5. **Utiliser des Volumes Persistants Réseau**
- Éviter les volumes locaux pour les données critiques
- Utiliser NFS, Ceph, ou stockage cloud (EBS, Persistent Disk)

#### 6. **Distribuer les Pods sur Plusieurs Nœuds**
```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchLabels:
            app: quote-app
        topologyKey: kubernetes.io/hostname
```
- Évite que tous les pods soient sur le même nœud

---

### Conclusion : Auto-Réparation de Kubernetes

Kubernetes fournit une **résilience automatique** à plusieurs niveaux :

1. ✅ **Niveau Conteneur** : Liveness probes redémarrent les conteneurs défaillants
2. ✅ **Niveau Pod** : Deployment Controller recrée les pods supprimés
3. ✅ **Niveau Nœud** : Scheduler replanifie les pods des nœuds défaillants
4. ✅ **Niveau Application** : Services distribuent la charge entre pods sains

Cette architecture permet de construire des **systèmes hautement disponibles** sans intervention manuelle constante.

