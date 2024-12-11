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

Lancer le serveur HTTP et le navigateur avec sa fenêtre : `node server.js --window`

Options :

-  `--port=8080`: Écoute sur le port 8080 les requêtes HTTP
-  `--window`: Affiche la fenêtre (désactive le mode _headless_ de puppeteer)
-  `--timeout=10`: 10 secondes pour charger les pages, 5 secondes pour trouver des éléments dans les pages

Options pour Chrome (doivent commencer par `--chrome-`, voir : [la liste complète](https://peter.sh/experiments/chromium-command-line-switches)) :

-  `--chrome-start-maximized`: Lance la fenêtre en prenant tout l'écran
-  `--chrome-lang=en`: Change la langue de Chrome en anglais
-  `--chrome-proxy-server="socks5://myproxy:8888"`: Utilise un proxy SOCKS5 (voir [Configuring a SOCKS proxy server in Chrome](https://www.chromium.org/developers/design-documents/network-stack/socks-proxy/))
-  `--chrome-host-resolver-rules="MAP * ~NOTFOUND , EXCLUDE myproxy"`: Utilise un proxy SOCKS5 (voir [Configuring a SOCKS proxy server in Chrome](https://www.chromium.org/developers/design-documents/network-stack/socks-proxy/))

Une fois le service lancé, appeler l'API : `curl localhost:8080`. Exemple :

```bash
curl --get localhost:8080/goto  --data-urlencode 'arg=google.fr'
curl --get localhost:8080/click --data-urlencode 'arg=Tout refuser'
curl --get localhost:8080/fill  --data-urlencode 'arg=Rechercher' --data-urlencode 'arg=€'
curl --get localhost:8080/press --data-urlencode 'arg=Escape' # To prevent autocomplete from covering the search button
curl --get localhost:8080/click --data-urlencode 'arg=Recherche Google'
curl --get localhost:8080/click --data-urlencode 'arg=Symbole euro'
curl --get localhost:8080/close
```

### API

| Path        | Arguments        | Description                                                                        |
| ----------- | ---------------- | ---------------------------------------------------------------------------------- |
| `/close`    |                  | Coupe le service                                                                   |
| `/goto`     | `url`            | Ouvre la page                                                                      |
| `/reload`   |                  | Recharge la page                                                                   |
| `/navigate` | `target`         | Clique sur un lien ou un bouton de navigation (entraînant un changement d'URL)     |
| `/click`    | `target`         | Clique sur un lien ou un bouton                                                    |
| `/fill`     | `target`, `text` | Saisit le texte dans le champ désigné par son label ou placeholder                 |
| `/press`    | `key`            | Appuie sur la touche de clavier ([liste](https://pptr.dev/api/puppeteer.keyinput)) |

#### Codes de retour :

| Status code       | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `200` OK          | Tout va bien                                            |
| `400` Bad Request | Quelque chose s'est mal déroulé (voir message d'erreur) |

### TODO

-  Dump HTML
-  Retourner un status "`404` Not Found" quand un élément n'a pas été trouvé
-  Pouvoir utiliser un binaire spécifique de Chrome
-  Pouvoir utiliser le service avec une fenêtre accessible en VNC
-  Implémenter `/screenshot`
-  Prendre un screenshot en cas d'erreur inattendue
