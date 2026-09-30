# Changelog

## 1.1.1
- **Mise à jour de la carte toujours prise en compte** : l'adresse de la ressource Lovelace utilisait un numéro de version resté à 1.0.0, donc un navigateur pouvait continuer d'afficher l'ancienne carte depuis son cache après une mise à jour. Elle contient maintenant la version de l'intégration et une empreinte du fichier de la carte : toute nouvelle version change l'adresse et force le rechargement.

## 1.1.0
Éditeur de journée plus précis ([#1](https://github.com/kaaribou/climat-holm/issues/1)).

- **Réglage de la fin** d'une plage (− / +), à côté du début. Sur la dernière plage de la journée, « − » ajoute un arrêt avant minuit.
- **Glissement fluide** des poignées au pas de 5 minutes (le suivi ne se perd plus pendant le glissement) ; les boutons − / + restent calés sur le quart d'heure.
- **Options visibles dans la frise** : chaque plage affiche mode, consigne et options (« Ventil. · Vitesse 1 · Balayage »), avec le texte complet au survol.
- **Petits créneaux accessibles** : flèches ‹ › « Créneau 2 / 5 » dans le panneau, flèches ← → du clavier, bouton « Parcourir les créneaux », et un toucher sur une poignée sélectionne son créneau. Poignées plus fines pour laisser la place aux plages courtes.

## 1.0.0
Première version.

- **Programmation pièce par pièce** : un planning par jour et par pièce, plusieurs appareils par pièce, sonde de température facultative.
- **Carte Lovelace fournie** (enregistrée automatiquement) : vue d'ensemble, pièce, éditeur de journée à poignées, réglages ; thème automatique clair / sombre.
- **Chauffage et clim** : saison Chauffage / Clim, et mode par créneau (chauffe, clim, chaud/froid, déshumidification, ventilation seule).
- **Options des appareils** par pièce, par créneau et en mode manuel : préréglage, ventilation, oscillation verticale et horizontale.
- **Actions rapides** : boost, créneau suivant, consigne temporaire, Auto / Manuel / Arrêt, absence, tout arrêter.
- **Profils** (création, renommage, suppression), copie de journées et de semaines entre pièces.
- **Fenêtres** : arrêt après un délai réglable.
- Entités : un thermostat par pièce, interrupteurs Programmation / Absence / Tout arrêter, listes Profil et Saison ; actions `boost`, `next_slot`, `cancel_override`, `set_profile`, `set_away`.
- Import des plannings de Climate Scheduler.
