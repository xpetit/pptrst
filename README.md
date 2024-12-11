### Setup

-  Installer `git` et `curl`
-  [Installer Node.js](https://nodejs.org/en/download/package-manager)
-  Installer les dépendances de Chrome :
   ```
   apt install --no-install-recommends libdrm2 libgbm1 libgtk-3-0 libnss3
   ```
-  Cloner le dépôt
-  Dans le dossier cloné, installer les dépendances avec `npm install`

### Usage

Lancer le serveur HTTP et le navigateur : `node server.js --dev` (enlever `--dev` en production / sur un serveur distant)

Options (toutes celles commençant par `--chrome-` sont passées à Chrome, voir : [la liste complète](https://peter.sh/experiments/chromium-command-line-switches)):

-  `--dev`: Affiche la fenêtre (désactive le mode _headless_ de puppeteer)
-  `--chrome-start-maximized`: Lance la fenêtre en prenant tout l'écran
-  `--chrome-lang=en`: Change la langue de Chrome en anglais

Une fois le service lancé, appeler l'API : `curl localhost:8080`. Exemple :

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

#### Codes de retour :

| Status code       | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `200` OK          | Tout va bien                                            |
| `400` Bad Request | Quelque chose s'est mal déroulé (voir message d'erreur) |

### TODO

-  Retourner un status "`404` Not Found" quand un élément n'a pas été trouvé
-  Pouvoir utiliser un binaire spécifique de Chrome
-  Pouvoir utiliser le service avec une fenêtre accessible en VNC
-  Implémenter `/screenshot`
-  Gérer proxy SOCKS5 (IP:PORT)
-  Prendre un screenshot en cas d'erreur inattendue
