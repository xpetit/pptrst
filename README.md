### Setup

Dans ce dossier :

1. Installer les dépendances : `npm i`
2. Lancer le navigateur : `node server.js --dev` (enlever `--dev` en production)

### Usage

Appeler l'API : `curl localhost:8080`

```
curl --get localhost:8080/goto  --data-urlencode 'arg=google.fr'
curl --get localhost:8080/click --data-urlencode 'arg=Tout refuser'
curl --get localhost:8080/fill  --data-urlencode 'arg=Rechercher' --data-urlencode 'arg=€'
curl --get localhost:8080/click --data-urlencode 'arg=Recherche Google'
curl --get localhost:8080/click --data-urlencode 'arg=Symbole euro'
curl --get localhost:8080/close
```
