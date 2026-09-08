# GameHub

Plateforme de quiz, histoires interactives et tierlists.

## Architecture

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