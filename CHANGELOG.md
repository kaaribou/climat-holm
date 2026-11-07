# Changelog

## 1.3.0
- **Consigne ajustée d'après la sonde** ([#2](https://github.com/kaaribou/climat-holm/issues/2)) : nouvelle option de pièce `sensor_regulate` (« Ajuster la consigne des appareils d'après la sonde »). Consigne envoyée = consigne + (température de l'appareil − température de la sonde), bornée à ±3 °C, arrondie au pas de l'appareil, changée au plus toutes les 10 minutes et seulement si elle varie d'au moins un pas. Inactive en mode Manuel, à l'arrêt, et si la sonde ou l'appareil n'a pas de température (consigne normale). Correction affichée sur la tuile et dans la pièce (attribut `sensor_adjust` de l'état de la pièce). Sans l'option, rien ne change.
- **Programmation du jour** : graphique sous les pièces, consigne programmée de chaque pièce de 0 h à 24 h (profil actif), heure actuelle, bulle au survol, légende cliquable (clic : masquer / afficher, double-clic : seulement cette pièce), température réelle du jour en option. Replié par défaut ; options de carte `day_chart` (`collapsed`, `open`, `hide`) et `day_chart_real`. Choix mémorisés par le navigateur.

## 1.2.0
- **8 langues** : traductions allemand, espagnol, italien, néerlandais, portugais et polonais ajoutées (configuration, options, entités, actions), en plus du français et de l'anglais. Carte HOLM Climat traduite elle aussi (éditeur compris), avec une nouvelle option `language` ; elle suit sinon la langue du profil Home Assistant (anglais si la langue n'est pas traduite).
- README en anglais (`README.en.md`).

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
