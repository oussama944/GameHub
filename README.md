# GameHub

Plateforme de quiz, histoires interactives et tierlists.

## Développement local sans Docker

Si vous souhaitez exécuter le service en dehors de Docker (pour le développement ou les tests) :

1. Allez dans le dossier du service :
   cd services/quiz-service
2. Installez les dépendances :
    npm install

3. Configurez les variables d'environnement :
    cp .env.example .env
    Modifiez .env pour pointer vers votre base PostgreSQL locale (par défaut postgres://postgres:postgres@localhost:5433/quizdb).

4. Lancez le service en mode développement :
    npm run dev

5. Pour exécuter les tests unitaires :
    npm test

## Démarrage rapide

### Prérequis

- Git
- Docker et Docker Compose

### Installation

1. Clonez le dépôt :

   ```bash
   git clone https://github.com/VotreUsername/GameHub.git
   cd GameHub

   ```

2. Lancez les services avec Docker Compose :
   bash
   docker-compose up --build

3. L’API est accessible sur http://localhost:3001. La base de données PostgreSQL est accessible sur localhost:5433 (identifiants : postgres / postgres).

### Tester l’API

curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/quizzes \
 -H "Content-Type: application/json" \
 -d '{"title":"Quiz de test","description":"Description"}'

### Arrêter les services

bash
docker-compose down

#### Services

Quiz Service : API CRUD pour les quiz.

Auth Service : Authentification JWT.

Story Service : Histoires à choix multiples.

Tierlist Service : Tierlists et votes.

### Architecture

```mermaid
graph TD
    Client[Client React] -->|HTTP| Gateway[API Gateway Nginx]
    Gateway --> Quiz[Quiz Service]
    Gateway --> Auth[Auth Service]
    Gateway --> Story[Story Service]
    Gateway --> Tierlist[Tierlist Service]
    Quiz --> DB[(PostgreSQL)]
    Auth --> DB
    Story --> DB
    Tierlist --> DB


```
