# Pico W Chrono (MVP)

Chronometre web heberge directement sur un Raspberry Pi Pico W.

## Fonctionnalites

- Start / Stop / Reset
- Affichage en centiemes
- Controle depuis telephone ou ordinateur via navigateur
- Mode point d'acces Wi-Fi (par defaut), ou connexion a votre Wi-Fi

## Structure

- `main.py` : application MicroPython complete (serveur + interface HTML)

## Prerequis

- Raspberry Pi Pico W
- Firmware MicroPython installe sur le Pico W
- Thonny (ou `mpremote`) pour copier `main.py`

## Installation rapide

1. Flasher MicroPython sur le Pico W (si ce n'est pas deja fait).
2. Copier `main.py` sur la carte en tant que `main.py`.
3. Redemarrer le Pico W.

## Connexion

Par defaut, l'appli cree un point d'acces:

- SSID: `PicoChrono`
- Mot de passe: `chronopico`
- URL: `http://192.168.4.1/`

Si vous voulez utiliser votre Wi-Fi local, editez ces variables dans `main.py`:

- `USE_ACCESS_POINT = False`
- `WIFI_SSID = "YOUR_WIFI_SSID"`
- `WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"`

## Mise en ligne sur GitHub

```bash
git init
git add .
git commit -m "feat: pico w web chrono mvp"
git branch -M main
git remote add origin https://github.com/<votre-user>/<votre-repo>.git
git push -u origin main
```

Si `gh` est configure:

```bash
gh repo create pico-w-chrono --public --source=. --remote=origin --push
```
