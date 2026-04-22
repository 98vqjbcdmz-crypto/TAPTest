# TAP test - Evaluation mobile

Petite application web mobile pour appliquer le protocole pratique TAP test : TUG, marche 6 m usuelle et marche 6 m rapide, avant et apres ponction depletive.

## Fonctionnalites

- Recueil d'un code libre d'identification anonymisee.
- Saisie par temps de mesure : avant TAP, 2-4 h, 24 h, 48 h si besoin.
- Chronometre integre pour chaque mesure, avec ajout direct du temps.
- Calcul automatique de la vitesse de marche sur 6 m.
- Recueil du nombre de pas et des elements qualitatifs utiles.
- Lecture automatique des seuils pratiques : TUG, temps de marche, nombre de pas.
- Synthese finale partageable, copiable ou prete a envoyer par mail.
- Emplacement pour le logo CHU et QR code de contact extrait du protocole.

## Structure

- `index.html` : interface mobile.
- `style.css` : styles responsives sobres.
- `app.js` : logique de saisie, chrono, calculs et partage.
- `assets/qr-contact.jpg` : QR code de contact.

## Lancer en local

Ouvrir simplement `index.html` dans un navigateur moderne.

## Publier sur GitHub Pages

1. Pousser ce dossier dans un depot GitHub.
2. Ouvrir `Settings` du depot.
3. Aller dans `Pages`.
4. Dans `Build and deployment`, choisir `Deploy from a branch`.
5. Selectionner la branche `main` et le dossier `/ (root)`.
6. Sauvegarder.

L'application sera ensuite disponible a l'URL GitHub Pages du depot.
