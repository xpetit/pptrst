### Setup

-  Installer `git` et `curl`
-  [Installer Node.js](https://nodejs.org/en/download/package-manager)
-  Installer les dépendances de Chrome :
   ```
   apt install --no-install-recommends libdrm2 libgbm1 libgtk-3-0 libnss3
   ```

Dans ce dossier :

1. Installer les dépendances : `npm i`
2. Lancer le navigateur : `node server.js --dev` (enlever `--dev` en production / sur un serveur distant)

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

### API

| Path        | Arguments        | Description                                                                    |
| ----------- | ---------------- | ------------------------------------------------------------------------------ |
| `/close`    |                  | Coupe le service                                                               |
| `/goto`     | `url`            | Ouvre la page                                                                  |
| `/reload`   |                  | Recharge la page                                                               |
| `/navigate` | `target`         | Clique sur un lien ou un bouton de navigation (entraînant un changement d'URL) |
| `/click`    | `target`         | Clique sur un lien ou un bouton                                                |
| `/fill`     | `target`, `text` | Saisit le texte dans le champ désigné par son label ou placeholder             |
