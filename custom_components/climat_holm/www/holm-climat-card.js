/* HOLM Climat Card — carte de l'intégration Climat HOLM
 * Programmation du chauffage / de la climatisation pièce par pièce :
 * - vue d'ensemble : toutes les pièces, température, consigne, prochain changement, frise du jour ;
 * - pièce : consigne +/-, Auto / Manuel / Arrêt, boost, créneau suivant, planning de la semaine ;
 * - journée : frise 0-24 h, créneaux à glisser, température ou arrêt, copie vers d'autres jours / pièces ;
 * - profils (Normal, Vacances…), saison chauffage / clim, absence, tout arrêter.
 * Tout se règle à la souris ou au doigt, sans YAML.
 */
(() => {
  // ---- HOLM i18n : textes écrits en français, traduits à l'affichage (en, de, es, it, nl, pt, pl) ----
  // Langue : option `language` de la carte, sinon celle du profil Home Assistant ; anglais si la langue n'est pas traduite.
  const HOLM_LANGS = ["en", "de", "es", "it", "nl", "pt", "pl"];
  const LANG_NAMES = { fr: "Français", en: "English", de: "Deutsch", es: "Español", it: "Italiano", nl: "Nederlands", pt: "Português", pl: "Polski" };
  const LOCALES = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", nl: "nl-NL", pt: "pt-PT", pl: "pl-PL" };
  const I18N = {
    "Automatique (profil)": ["Automatic (profile)", "Automatisch (Profil)", "Automático (perfil)", "Automatica (profilo)", "Automatisch (profiel)", "Automático (perfil)", "Automatycznie (profil)"],
    "Langue": ["Language", "Sprache", "Idioma", "Lingua", "Taal", "Idioma", "Język"],
    "Titre": ["Title", "Titel", "Título", "Titolo", "Titel", "Título", "Tytuł"],
    "Titre (optionnel)": ["Title (optional)", "Titel (optional)", "Título (opcional)", "Titolo (facoltativo)", "Titel (optioneel)", "Título (opcional)", "Tytuł (opcjonalnie)"],
    "Nom": ["Name", "Name", "Nombre", "Nome", "Naam", "Nome", "Nazwa"],
    "Nom affiché": ["Display name", "Anzeigename", "Nombre mostrado", "Nome visualizzato", "Weergavenaam", "Nome apresentado", "Wyświetlana nazwa"],
    "Icône": ["Icon", "Symbol", "Icono", "Icona", "Pictogram", "Ícone", "Ikona"],
    "Couleur": ["Colour", "Farbe", "Color", "Colore", "Kleur", "Cor", "Kolor"],
    "Couleurs": ["Colours", "Farben", "Colores", "Colori", "Kleuren", "Cores", "Kolory"],
    "Entité": ["Entity", "Entität", "Entidad", "Entità", "Entiteit", "Entidade", "Encja"],
    "Entités": ["Entities", "Entitäten", "Entidades", "Entità", "Entiteiten", "Entidades", "Encje"],
    "Chargement…": ["Loading…", "Wird geladen…", "Cargando…", "Caricamento…", "Laden…", "A carregar…", "Ładowanie…"],
    "Erreur": ["Error", "Fehler", "Error", "Errore", "Fout", "Erro", "Błąd"],
    "Fermer": ["Close", "Schließen", "Cerrar", "Chiudi", "Sluiten", "Fechar", "Zamknij"],
    "Annuler": ["Cancel", "Abbrechen", "Cancelar", "Annulla", "Annuleren", "Cancelar", "Anuluj"],
    "Enregistrer": ["Save", "Speichern", "Guardar", "Salva", "Opslaan", "Guardar", "Zapisz"],
    "Supprimer": ["Delete", "Löschen", "Eliminar", "Elimina", "Verwijderen", "Eliminar", "Usuń"],
    "Ajouter": ["Add", "Hinzufügen", "Añadir", "Aggiungi", "Toevoegen", "Adicionar", "Dodaj"],
    "Monter": ["Move up", "Nach oben", "Subir", "Sposta su", "Omhoog", "Mover para cima", "W górę"],
    "Descendre": ["Move down", "Nach unten", "Bajar", "Sposta giù", "Omlaag", "Mover para baixo", "W dół"],
    "Afficher le cadre de la carte": ["Show the card frame", "Kartenrahmen anzeigen", "Mostrar el marco de la tarjeta", "Mostra la cornice della scheda", "Kaartkader tonen", "Mostrar a moldura do cartão", "Pokaż ramkę karty"],
    "Indisponible": ["Unavailable", "Nicht verfügbar", "No disponible", "Non disponibile", "Niet beschikbaar", "Indisponível", "Niedostępne"],
    "Aujourd'hui": ["Today", "Heute", "Hoy", "Oggi", "Vandaag", "Hoje", "Dziś"],
    "Hier": ["Yesterday", "Gestern", "Ayer", "Ieri", "Gisteren", "Ontem", "Wczoraj"],
    "Demain": ["Tomorrow", "Morgen", "Mañana", "Domani", "Morgen", "Amanhã", "Jutro"],
    "Batterie": ["Battery", "Batterie", "Batería", "Batteria", "Batterij", "Bateria", "Bateria"],
    "Aucune donnée sur cette période.": ["No data for this period.", "Keine Daten für diesen Zeitraum.", "No hay datos en este periodo.", "Nessun dato per questo periodo.", "Geen gegevens voor deze periode.", "Sem dados neste período.", "Brak danych w tym okresie."],
    "à l'instant": ["just now", "gerade eben", "ahora mismo", "proprio ora", "zojuist", "agora mesmo", "przed chwilą"],
    "il y a {n} min": ["{n} min ago", "vor {n} Min.", "hace {n} min", "{n} min fa", "{n} min geleden", "há {n} min", "{n} min temu"],
    "il y a {n} h": ["{n} h ago", "vor {n} Std.", "hace {n} h", "{n} h fa", "{n} u geleden", "há {n} h", "{n} godz. temu"],
    "il y a {n} j": ["{n} d ago", "vor {n} T.", "hace {n} d", "{n} g fa", "{n} d geleden", "há {n} d", "{n} dni temu"],
    "Lun": ["Mon", "Mo", "Lun", "Lun", "Ma", "Seg", "Pon"],
    "Mar": ["Tue", "Di", "Mar", "Mar", "Di", "Ter", "Wt"],
    "Mer": ["Wed", "Mi", "Mié", "Mer", "Wo", "Qua", "Śr"],
    "Jeu": ["Thu", "Do", "Jue", "Gio", "Do", "Qui", "Czw"],
    "Ven": ["Fri", "Fr", "Vie", "Ven", "Vr", "Sex", "Pt"],
    "Sam": ["Sat", "Sa", "Sáb", "Sab", "Za", "Sáb", "Sob"],
    "Dim": ["Sun", "So", "Dom", "Dom", "Zo", "Dom", "Nd"],
    "Lundi": ["Monday", "Montag", "Lunes", "Lunedì", "Maandag", "Segunda-feira", "Poniedziałek"],
    "Mardi": ["Tuesday", "Dienstag", "Martes", "Martedì", "Dinsdag", "Terça-feira", "Wtorek"],
    "Mercredi": ["Wednesday", "Mittwoch", "Miércoles", "Mercoledì", "Woensdag", "Quarta-feira", "Środa"],
    "Jeudi": ["Thursday", "Donnerstag", "Jueves", "Giovedì", "Donderdag", "Quinta-feira", "Czwartek"],
    "Vendredi": ["Friday", "Freitag", "Viernes", "Venerdì", "Vrijdag", "Sexta-feira", "Piątek"],
    "Samedi": ["Saturday", "Samstag", "Sábado", "Sabato", "Zaterdag", "Sábado", "Sobota"],
    "Dimanche": ["Sunday", "Sonntag", "Domingo", "Domenica", "Zondag", "Domingo", "Niedziela"],
    "Chauffage": ["Heating", "Heizung", "Calefacción", "Riscaldamento", "Verwarming", "Aquecimento", "Ogrzewanie"],
    "Chauffe": ["Heat", "Heizen", "Calor", "Caldo", "Warmte", "Calor", "Grzanie"],
    "Climatisation": ["Air conditioning", "Klimaanlage", "Climatización", "Climatizzazione", "Airco", "Climatização", "Klimatyzacja"],
    "Clim": ["A/C", "Klima", "A/A", "Clima", "Airco", "A/C", "Klima"],
    "Chaud / froid": ["Heat / cool", "Heizen / Kühlen", "Calor / frío", "Caldo / freddo", "Warm / koud", "Calor / frio", "Grzanie / chłodzenie"],
    "Chaud/froid": ["Heat/cool", "Heiz./Kühl.", "Calor/frío", "Caldo/freddo", "Warm/koud", "Calor/frio", "Grz./chł."],
    "Automatique": ["Automatic", "Automatisch", "Automático", "Automatico", "Automatisch", "Automático", "Automatyczny"],
    "Auto": ["Auto", "Auto", "Auto", "Auto", "Auto", "Auto", "Auto"],
    "Déshumidification": ["Dry", "Entfeuchtung", "Deshumidificación", "Deumidificazione", "Ontvochtigen", "Desumidificação", "Osuszanie"],
    "Déshum.": ["Dry", "Entf.", "Deshum.", "Deumid.", "Ontv.", "Desum.", "Osusz."],
    "Ventilation seule": ["Fan only", "Nur Lüftung", "Solo ventilación", "Solo ventilazione", "Alleen ventilatie", "Só ventilação", "Tylko wentylacja"],
    "Ventilation": ["Fan", "Lüftung", "Ventilación", "Ventilazione", "Ventilatie", "Ventilação", "Wentylacja"],
    "Ventil.": ["Fan", "Lüft.", "Ventil.", "Ventil.", "Ventil.", "Ventil.", "Went."],
    "Préréglage": ["Preset", "Voreinstellung", "Preajuste", "Preset", "Voorinstelling", "Predefinição", "Ustawienie"],
    "Oscillation verticale": ["Vertical swing", "Vertikales Schwenken", "Oscilación vertical", "Oscillazione verticale", "Verticaal zwenken", "Oscilação vertical", "Wahanie pionowe"],
    "Oscillation horizontale": ["Horizontal swing", "Horizontales Schwenken", "Oscilación horizontal", "Oscillazione orizzontale", "Horizontaal zwenken", "Oscilação horizontal", "Wahanie poziome"],
    "Silencieux": ["Quiet", "Leise", "Silencioso", "Silenzioso", "Stil", "Silencioso", "Cichy"],
    "Faible": ["Low", "Niedrig", "Baja", "Bassa", "Laag", "Baixa", "Niski"],
    "Moyen": ["Medium", "Mittel", "Media", "Media", "Middel", "Média", "Średni"],
    "Fort": ["High", "Hoch", "Alta", "Alta", "Hoog", "Alta", "Wysoki"],
    "Arrêt": ["Off", "Aus", "Apagado", "Spento", "Uit", "Desligado", "Wył."],
    "arrêt": ["off", "aus", "apagado", "spento", "uit", "desligado", "wył."],
    "Balayage": ["Swing", "Schwenken", "Barrido", "Oscillazione", "Zwenken", "Oscilação", "Wahanie"],
    "Les deux": ["Both", "Beide", "Ambos", "Entrambi", "Beide", "Ambos", "Oba"],
    "Vertical": ["Vertical", "Vertikal", "Vertical", "Verticale", "Verticaal", "Vertical", "Pionowo"],
    "Horizontal": ["Horizontal", "Horizontal", "Horizontal", "Orizzontale", "Horizontaal", "Horizontal", "Poziomo"],
    "Flux confort": ["Comfort airflow", "Komfort-Luftstrom", "Flujo confort", "Flusso comfort", "Comfortluchtstroom", "Fluxo conforto", "Komfortowy przepływ"],
    "Aucun": ["None", "Keine", "Ninguno", "Nessuno", "Geen", "Nenhum", "Brak"],
    "Absence": ["Away", "Abwesenheit", "Ausencia", "Assenza", "Afwezig", "Ausência", "Nieobecność"],
    "Boost": ["Boost", "Boost", "Boost", "Boost", "Boost", "Boost", "Boost"],
    "Éco": ["Eco", "Eco", "Eco", "Eco", "Eco", "Eco", "Eko"],
    "Confort": ["Comfort", "Komfort", "Confort", "Comfort", "Comfort", "Conforto", "Komfort"],
    "Nuit": ["Sleep", "Nacht", "Noche", "Notte", "Nacht", "Noite", "Noc"],
    "Maison": ["Home", "Zuhause", "Casa", "Casa", "Thuis", "Casa", "Dom"],
    "Activité": ["Activity", "Aktivität", "Actividad", "Attività", "Activiteit", "Atividade", "Aktywność"],
    "Vitesse ": ["Speed ", "Stufe ", "Velocidad ", "Velocità ", "Stand ", "Velocidade ", "Prędkość "],
    "demain ": ["tomorrow ", "morgen ", "mañana ", "domani ", "morgen ", "amanhã ", "jutro "],
    "L'intégration Climat HOLM n'est pas installée.": ["The Climat HOLM integration is not installed.", "Die Integration Climat HOLM ist nicht installiert.", "La integración Climat HOLM no está instalada.", "L'integrazione Climat HOLM non è installata.", "De integratie Climat HOLM is niet geïnstalleerd.", "A integração Climat HOLM não está instalada.", "Integracja Climat HOLM nie jest zainstalowana."],
    "Action impossible": ["Action failed", "Aktion nicht möglich", "Acción imposible", "Azione non riuscita", "Actie mislukt", "Ação impossível", "Działanie niemożliwe"],
    "Programmation en pause — Climat HOLM ne pilote rien": ["Scheduling paused — Climat HOLM controls nothing", "Planung pausiert — Climat HOLM steuert nichts", "Programación en pausa — Climat HOLM no controla nada", "Programmazione in pausa — Climat HOLM non comanda nulla", "Planning gepauzeerd — Climat HOLM stuurt niets aan", "Programação em pausa — o Climat HOLM não comanda nada", "Harmonogram wstrzymany — Climat HOLM niczym nie steruje"],
    "Tout est arrêté": ["Everything is off", "Alles ist aus", "Todo está apagado", "Tutto è spento", "Alles staat uit", "Está tudo desligado", "Wszystko wyłączone"],
    " jusqu'à {t}": [" until {t}", " bis {t}", " hasta {t}", " fino a {t}", " tot {t}", " até {t}", " do {t}"],
    "Profil {p}": ["Profile {p}", "Profil {p}", "Perfil {p}", "Profilo {p}", "Profiel {p}", "Perfil {p}", "Profil {p}"],
    "{n} pièce en chauffe": ["{n} room heating", "{n} Raum heizt", "{n} estancia calentando", "{n} stanza in riscaldamento", "{n} kamer verwarmt", "{n} divisão a aquecer", "{n} pokój się nagrzewa"],
    "{n} pièces en chauffe": ["{n} rooms heating", "{n} Räume heizen", "{n} estancias calentando", "{n} stanze in riscaldamento", "{n} kamers verwarmen", "{n} divisões a aquecer", "{n} pokoje się nagrzewają"],
    "{n} pièce en refroidissement": ["{n} room cooling", "{n} Raum kühlt", "{n} estancia enfriando", "{n} stanza in raffreddamento", "{n} kamer koelt", "{n} divisão a arrefecer", "{n} pokój się chłodzi"],
    "{n} pièces en refroidissement": ["{n} rooms cooling", "{n} Räume kühlen", "{n} estancias enfriando", "{n} stanze in raffreddamento", "{n} kamers koelen", "{n} divisões a arrefecer", "{n} pokoje się chłodzą"],
    "Réglages": ["Settings", "Einstellungen", "Ajustes", "Impostazioni", "Instellingen", "Definições", "Ustawienia"],
    "Mettre en pause": ["Pause", "Pausieren", "Pausar", "Metti in pausa", "Pauzeren", "Pausar", "Wstrzymaj"],
    "Activer la programmation": ["Turn scheduling on", "Planung aktivieren", "Activar la programación", "Attiva la programmazione", "Planning inschakelen", "Ativar a programação", "Włącz harmonogram"],
    "Tout arrêter": ["Stop everything", "Alles ausschalten", "Detener todo", "Ferma tutto", "Alles stoppen", "Parar tudo", "Zatrzymaj wszystko"],
    "Nouveau profil": ["New profile", "Neues Profil", "Nuevo perfil", "Nuovo profilo", "Nieuw profiel", "Novo perfil", "Nowy profil"],
    "Nouveau profil (copie du profil actif)": ["New profile (copy of the active profile)", "Neues Profil (Kopie des aktiven Profils)", "Nuevo perfil (copia del perfil activo)", "Nuovo profilo (copia del profilo attivo)", "Nieuw profiel (kopie van het actieve profiel)", "Novo perfil (cópia do perfil ativo)", "Nowy profil (kopia aktywnego profilu)"],
    "Renommer / supprimer le profil actif": ["Rename / delete the active profile", "Aktives Profil umbenennen / löschen", "Renombrar / eliminar el perfil activo", "Rinomina / elimina il profilo attivo", "Actief profiel hernoemen / verwijderen", "Mudar o nome / eliminar o perfil ativo", "Zmień nazwę / usuń aktywny profil"],
    "Profil « {p} »": ["Profile “{p}”", "Profil „{p}“", "Perfil «{p}»", "Profilo «{p}»", "Profiel ‘{p}’", "Perfil «{p}»", "Profil „{p}”"],
    "Renommer": ["Rename", "Umbenennen", "Renombrar", "Rinomina", "Hernoemen", "Mudar o nome", "Zmień nazwę"],
    "Aucune pièce pour l'instant": ["No rooms yet", "Noch keine Räume", "Aún no hay estancias", "Nessuna stanza per ora", "Nog geen kamers", "Ainda não há divisões", "Brak pokoi"],
    "Importer depuis Climate Scheduler": ["Import from Climate Scheduler", "Aus Climate Scheduler importieren", "Importar desde Climate Scheduler", "Importa da Climate Scheduler", "Importeren uit Climate Scheduler", "Importar do Climate Scheduler", "Importuj z Climate Scheduler"],
    "Ajouter une pièce": ["Add a room", "Raum hinzufügen", "Añadir una estancia", "Aggiungi una stanza", "Kamer toevoegen", "Adicionar uma divisão", "Dodaj pokój"],
    "Programmation en pause": ["Scheduling paused", "Planung pausiert", "Programación en pausa", "Programmazione in pausa", "Planning gepauzeerd", "Programação em pausa", "Harmonogram wstrzymany"],
    "Tout arrêté": ["Everything off", "Alles aus", "Todo apagado", "Tutto spento", "Alles uit", "Tudo desligado", "Wszystko wyłączone"],
    "Fenêtre ouverte — arrêt": ["Window open — off", "Fenster offen — aus", "Ventana abierta — apagado", "Finestra aperta — spento", "Raam open — uit", "Janela aberta — desligado", "Okno otwarte — wył."],
    "Boost · encore {t}": ["Boost · {t} left", "Boost · noch {t}", "Boost · quedan {t}", "Boost · ancora {t}", "Boost · nog {t}", "Boost · faltam {t}", "Boost · jeszcze {t}"],
    "Manuel · {v}": ["Manual · {v}", "Manuell · {v}", "Manual · {v}", "Manuale · {v}", "Handmatig · {v}", "Manual · {v}", "Ręcznie · {v}"],
    "{v} jusqu'à {t} (dérogation)": ["{v} until {t} (override)", "{v} bis {t} (Übersteuerung)", "{v} hasta {t} (excepción)", "{v} fino a {t} (deroga)", "{v} tot {t} (afwijking)", "{v} até {t} (exceção)", "{v} do {t} (odstępstwo)"],
    "{a} · puis {b} à {t}": ["{a} · then {b} at {t}", "{a} · dann {b} um {t}", "{a} · luego {b} a las {t}", "{a} · poi {b} alle {t}", "{a} · daarna {b} om {t}", "{a} · depois {b} às {t}", "{a} · potem {b} o {t}"],
    "Réglages de la pièce": ["Room settings", "Raumeinstellungen", "Ajustes de la estancia", "Impostazioni della stanza", "Kamerinstellingen", "Definições da divisão", "Ustawienia pokoju"],
    "Actuelle": ["Current", "Aktuell", "Actual", "Attuale", "Huidig", "Atual", "Obecna"],
    "Refroidit": ["Cooling", "Kühlt", "Enfría", "Raffredda", "Koelt", "Arrefece", "Chłodzi"],
    "Consigne": ["Setpoint", "Sollwert", "Consigna", "Setpoint", "Setpoint", "Temperatura alvo", "Nastawa"],
    "Manuel": ["Manual", "Manuell", "Manual", "Manuale", "Handmatig", "Manual", "Ręcznie"],
    "Mode manuel": ["Manual mode", "Manueller Modus", "Modo manual", "Modalità manuale", "Handmatige modus", "Modo manual", "Tryb ręczny"],
    "Arrêter le boost": ["Stop the boost", "Boost beenden", "Detener el boost", "Ferma il boost", "Boost stoppen", "Parar o boost", "Zatrzymaj boost"],
    "Boost {n} min": ["Boost {n} min", "Boost {n} Min.", "Boost {n} min", "Boost {n} min", "Boost {n} min", "Boost {n} min", "Boost {n} min"],
    "Créneau suivant": ["Next slot", "Nächstes Zeitfenster", "Siguiente tramo", "Fascia successiva", "Volgend tijdvak", "Intervalo seguinte", "Następny przedział"],
    "Revenir au planning": ["Back to schedule", "Zurück zum Plan", "Volver al horario", "Torna al programma", "Terug naar schema", "Voltar ao horário", "Wróć do harmonogramu"],
    "Planning · profil {p}": ["Schedule · profile {p}", "Plan · Profil {p}", "Horario · perfil {p}", "Programma · profilo {p}", "Schema · profiel {p}", "Horário · perfil {p}", "Harmonogram · profil {p}"],
    "Touchez un jour pour le modifier": ["Tap a day to edit it", "Tippen Sie auf einen Tag, um ihn zu bearbeiten", "Toca un día para modificarlo", "Tocca un giorno per modificarlo", "Tik op een dag om te bewerken", "Toque num dia para o alterar", "Dotknij dnia, aby go edytować"],
    "Sonde : {n}": ["Sensor: {n}", "Sensor: {n}", "Sonda: {n}", "Sonda: {n}", "Sensor: {n}", "Sonda: {n}", "Czujnik: {n}"],
    "{n} ouvrant surveillé": ["{n} opening watched", "{n} Öffnung überwacht", "{n} apertura vigilada", "{n} apertura monitorata", "{n} opening bewaakt", "{n} abertura vigiada", "{n} monitorowane otwarcie"],
    "{n} ouvrants surveillés": ["{n} openings watched", "{n} Öffnungen überwacht", "{n} aperturas vigiladas", "{n} aperture monitorate", "{n} openingen bewaakt", "{n} aberturas vigiadas", "{n} monitorowanych otwarć"],
    "Mode": ["Mode", "Modus", "Modo", "Modalità", "Modus", "Modo", "Tryb"],
    "Saison ({s})": ["Season ({s})", "Jahreszeit ({s})", "Temporada ({s})", "Stagione ({s})", "Seizoen ({s})", "Estação ({s})", "Sezon ({s})"],
    "Par défaut": ["Default", "Standard", "Por defecto", "Predefinito", "Standaard", "Padrão", "Domyślnie"],
    "Créneau précédent (←)": ["Previous slot (←)", "Vorheriges Zeitfenster (←)", "Tramo anterior (←)", "Fascia precedente (←)", "Vorig tijdvak (←)", "Intervalo anterior (←)", "Poprzedni przedział (←)"],
    "Créneau suivant (→)": ["Next slot (→)", "Nächstes Zeitfenster (→)", "Tramo siguiente (→)", "Fascia successiva (→)", "Volgend tijdvak (→)", "Intervalo seguinte (→)", "Następny przedział (→)"],
    "Créneau {i} / {n}": ["Slot {i} / {n}", "Zeitfenster {i} / {n}", "Tramo {i} / {n}", "Fascia {i} / {n}", "Tijdvak {i} / {n}", "Intervalo {i} / {n}", "Przedział {i} / {n}"],
    "Début": ["Start", "Beginn", "Inicio", "Inizio", "Begin", "Início", "Początek"],
    "Fin": ["End", "Ende", "Fin", "Fine", "Einde", "Fim", "Koniec"],
    "Sans consigne": ["No setpoint", "Ohne Sollwert", "Sin consigna", "Senza setpoint", "Geen setpoint", "Sem temperatura alvo", "Bez nastawy"],
    "Température": ["Temperature", "Temperatur", "Temperatura", "Temperatura", "Temperatuur", "Temperatura", "Temperatura"],
    "Rallumer": ["Turn back on", "Wieder einschalten", "Volver a encender", "Riaccendi", "Weer aanzetten", "Voltar a ligar", "Włącz ponownie"],
    "Touchez une plage de la frise pour la régler, ou faites glisser les poignées pour changer les horaires.": ["Tap a range on the timeline to set it, or drag the handles to change the times.", "Tippen Sie auf einen Bereich der Zeitleiste, um ihn einzustellen, oder ziehen Sie die Griffe, um die Zeiten zu ändern.", "Toca un tramo de la línea de tiempo para ajustarlo, o arrastra los tiradores para cambiar los horarios.", "Tocca una fascia della linea temporale per regolarla, o trascina le maniglie per cambiare gli orari.", "Tik op een tijdvak in de tijdlijn om het in te stellen, of sleep de grepen om de tijden te wijzigen.", "Toque num intervalo da cronologia para o ajustar, ou arraste as pegas para mudar os horários.", "Dotknij przedziału na osi czasu, aby go ustawić, lub przeciągnij uchwyty, aby zmienić godziny."],
    "Parcourir les créneaux": ["Browse the slots", "Zeitfenster durchgehen", "Recorrer los tramos", "Scorri le fasce", "Tijdvakken doorlopen", "Percorrer os intervalos", "Przeglądaj przedziały"],
    "Ajouter un créneau": ["Add a slot", "Zeitfenster hinzufügen", "Añadir un tramo", "Aggiungi una fascia", "Tijdvak toevoegen", "Adicionar um intervalo", "Dodaj przedział"],
    "Copier ce jour vers": ["Copy this day to", "Diesen Tag kopieren nach", "Copiar este día a", "Copia questo giorno su", "Deze dag kopiëren naar", "Copiar este dia para", "Kopiuj ten dzień do"],
    "Lun → Ven": ["Mon → Fri", "Mo → Fr", "Lun → Vie", "Lun → Ven", "Ma → Vr", "Seg → Sex", "Pon → Pt"],
    "Week-end": ["Weekend", "Wochenende", "Fin de semana", "Weekend", "Weekend", "Fim de semana", "Weekend"],
    "Tous": ["All", "Alle", "Todos", "Tutti", "Alle", "Todos", "Wszystkie"],
    "Appliquer aussi la semaine à": ["Also apply the week to", "Woche auch anwenden auf", "Aplicar también la semana a", "Applica la settimana anche a", "De week ook toepassen op", "Aplicar também a semana a", "Zastosuj tydzień także do"],
    "Réglages · ": ["Settings · ", "Einstellungen · ", "Ajustes · ", "Impostazioni · ", "Instellingen · ", "Definições · ", "Ustawienia · "],
    "Nouvelle pièce": ["New room", "Neuer Raum", "Nueva estancia", "Nuova stanza", "Nieuwe kamer", "Nova divisão", "Nowy pokój"],
    "Créer la pièce": ["Create the room", "Raum erstellen", "Crear la estancia", "Crea la stanza", "Kamer aanmaken", "Criar a divisão", "Utwórz pokój"],
    "Confirmer la suppression": ["Confirm deletion", "Löschen bestätigen", "Confirmar la eliminación", "Conferma l'eliminazione", "Verwijderen bevestigen", "Confirmar a eliminação", "Potwierdź usunięcie"],
    "Supprimer la pièce": ["Delete the room", "Raum löschen", "Eliminar la estancia", "Elimina la stanza", "Kamer verwijderen", "Eliminar a divisão", "Usuń pokój"],
    "Réglages généraux": ["General settings", "Allgemeine Einstellungen", "Ajustes generales", "Impostazioni generali", "Algemene instellingen", "Definições gerais", "Ustawienia ogólne"],
    "carte": ["card", "Karte", "tarjeta", "scheda", "kaart", "cartão", "karta"],
    "Température du boost": ["Boost temperature", "Boost-Temperatur", "Temperatura del boost", "Temperatura del boost", "Boosttemperatuur", "Temperatura do boost", "Temperatura boostu"],
    "Durée du boost": ["Boost duration", "Boost-Dauer", "Duración del boost", "Durata del boost", "Boostduur", "Duração do boost", "Czas boostu"],
    "Température en absence": ["Away temperature", "Abwesenheitstemperatur", "Temperatura en ausencia", "Temperatura in assenza", "Afwezigheidstemperatuur", "Temperatura de ausência", "Temperatura podczas nieobecności"],
    "Mode manuel (par défaut)": ["Manual mode (default)", "Manueller Modus (Standard)", "Modo manual (por defecto)", "Modalità manuale (predefinita)", "Handmatige modus (standaard)", "Modo manual (padrão)", "Tryb ręczny (domyślny)"],
    "Délai avant arrêt si fenêtre ouverte": ["Delay before stopping if a window is open", "Verzögerung vor dem Ausschalten bei offenem Fenster", "Retardo antes de parar si hay una ventana abierta", "Ritardo prima dello spegnimento con finestra aperta", "Vertraging vóór uitschakelen bij open raam", "Atraso antes de parar com janela aberta", "Opóźnienie wyłączenia przy otwartym oknie"],
    "Arrêter la clim pendant une absence": ["Turn the A/C off while away", "Klimaanlage bei Abwesenheit ausschalten", "Apagar la climatización durante una ausencia", "Spegni il clima durante un'assenza", "Airco uitzetten bij afwezigheid", "Desligar o ar condicionado durante uma ausência", "Wyłącz klimatyzację podczas nieobecności"],
    "Ne pas changer": ["Don't change", "Nicht ändern", "No cambiar", "Non cambiare", "Niet wijzigen", "Não alterar", "Nie zmieniaj"],
    "Réglages par défaut des appareils": ["Device default settings", "Standardeinstellungen der Geräte", "Ajustes por defecto de los dispositivos", "Impostazioni predefinite dei dispositivi", "Standaardinstellingen van de apparaten", "Definições padrão dos dispositivos", "Domyślne ustawienia urządzeń"],
    "Nom de la pièce": ["Room name", "Raumname", "Nombre de la estancia", "Nome della stanza", "Naam van de kamer", "Nome da divisão", "Nazwa pokoju"],
    "Appareils (radiateurs, clims…)": ["Devices (heaters, air conditioners…)", "Geräte (Heizkörper, Klimaanlagen…)", "Dispositivos (radiadores, aires…)", "Dispositivi (radiatori, climatizzatori…)", "Apparaten (radiatoren, airco's…)", "Dispositivos (radiadores, ar condicionado…)", "Urządzenia (grzejniki, klimatyzatory…)"],
    "Sonde de température (facultatif)": ["Temperature sensor (optional)", "Temperatursensor (optional)", "Sonda de temperatura (opcional)", "Sonda di temperatura (facoltativa)", "Temperatuursensor (optioneel)", "Sonda de temperatura (opcional)", "Czujnik temperatury (opcjonalnie)"],
    "Fenêtres / portes : arrêt si ouvert (facultatif)": ["Windows / doors: off when open (optional)", "Fenster / Türen: aus, wenn offen (optional)", "Ventanas / puertas: apagado si se abren (opcional)", "Finestre / porte: spento se aperte (facoltativo)", "Ramen / deuren: uit bij open (optioneel)", "Janelas / portas: desliga se abertas (opcional)", "Okna / drzwi: wyłącz, gdy otwarte (opcjonalnie)"],
    "Cette plage vient de la veille : ajoutez un créneau à 00:00 pour la modifier.": ["This range comes from the previous day: add a slot at 00:00 to change it.", "Dieser Bereich stammt vom Vortag: Fügen Sie um 00:00 ein Zeitfenster hinzu, um ihn zu ändern.", "Este tramo viene del día anterior: añade un tramo a las 00:00 para modificarlo.", "Questa fascia viene dal giorno prima: aggiungi una fascia alle 00:00 per modificarla.", "Dit tijdvak komt van de vorige dag: voeg om 00:00 een tijdvak toe om het te wijzigen.", "Este intervalo vem do dia anterior: adicione um intervalo às 00:00 para o alterar.", "Ten przedział pochodzi z poprzedniego dnia: dodaj przedział o 00:00, aby go zmienić."],
    "Modifications non enregistrées : touchez encore ‹ pour les abandonner": ["Unsaved changes: tap ‹ again to discard them", "Nicht gespeicherte Änderungen: Tippen Sie erneut auf ‹, um sie zu verwerfen", "Cambios sin guardar: toca ‹ otra vez para descartarlos", "Modifiche non salvate: tocca di nuovo ‹ per annullarle", "Niet-opgeslagen wijzigingen: tik nogmaals op ‹ om ze te verwerpen", "Alterações não guardadas: toque de novo em ‹ para as descartar", "Niezapisane zmiany: dotknij ‹ ponownie, aby je odrzucić"],
    "Programmation activée": ["Scheduling on", "Planung aktiviert", "Programación activada", "Programmazione attivata", "Planning ingeschakeld", "Programação ativada", "Harmonogram włączony"],
    "Retour à la maison": ["Back home", "Zurück zu Hause", "De vuelta en casa", "Ritorno a casa", "Weer thuis", "De volta a casa", "Powrót do domu"],
    "Mode absence activé": ["Away mode on", "Abwesenheitsmodus aktiv", "Modo ausencia activado", "Modalità assenza attivata", "Afwezigheidsmodus aan", "Modo ausência ativado", "Tryb nieobecności włączony"],
    "Chauffage relancé": ["Heating restarted", "Heizung wieder gestartet", "Calefacción reanudada", "Riscaldamento riavviato", "Verwarming herstart", "Aquecimento retomado", "Ogrzewanie wznowione"],
    "Profil supprimé": ["Profile deleted", "Profil gelöscht", "Perfil eliminado", "Profilo eliminato", "Profiel verwijderd", "Perfil eliminado", "Profil usunięty"],
    "Profil renommé": ["Profile renamed", "Profil umbenannt", "Perfil renombrado", "Profilo rinominato", "Profiel hernoemd", "Perfil renomeado", "Zmieniono nazwę profilu"],
    "Profil « {p} » créé (copie de {q})": ["Profile “{p}” created (copy of {q})", "Profil „{p}“ erstellt (Kopie von {q})", "Perfil «{p}» creado (copia de {q})", "Profilo «{p}» creato (copia di {q})", "Profiel ‘{p}’ aangemaakt (kopie van {q})", "Perfil «{p}» criado (cópia de {q})", "Utworzono profil „{p}” (kopia {q})"],
    "{n} pièce(s) importée(s)": ["{n} room(s) imported", "{n} Raum/Räume importiert", "{n} estancia(s) importada(s)", "{n} stanza/e importata/e", "{n} kamer(s) geïmporteerd", "{n} divisão(ões) importada(s)", "Zaimportowano pokoje: {n}"],
    "Rien de nouveau à importer": ["Nothing new to import", "Nichts Neues zu importieren", "Nada nuevo que importar", "Niente di nuovo da importare", "Niets nieuws om te importeren", "Nada de novo para importar", "Nic nowego do zaimportowania"],
    "Consigne modifiée jusqu'au prochain créneau": ["Setpoint changed until the next slot", "Sollwert bis zum nächsten Zeitfenster geändert", "Consigna modificada hasta el siguiente tramo", "Setpoint modificato fino alla prossima fascia", "Setpoint gewijzigd tot het volgende tijdvak", "Temperatura alvo alterada até ao próximo intervalo", "Nastawa zmieniona do następnego przedziału"],
    "Boost lancé": ["Boost started", "Boost gestartet", "Boost iniciado", "Boost avviato", "Boost gestart", "Boost iniciado", "Boost uruchomiony"],
    "Créneau suivant appliqué": ["Next slot applied", "Nächstes Zeitfenster angewendet", "Siguiente tramo aplicado", "Fascia successiva applicata", "Volgend tijdvak toegepast", "Intervalo seguinte aplicado", "Zastosowano następny przedział"],
    "Retour au planning": ["Back to schedule", "Zurück zum Plan", "De vuelta al horario", "Ritorno al programma", "Terug naar schema", "De volta ao horário", "Powrót do harmonogramu"],
    "Copié vers {d}": ["Copied to {d}", "Kopiert nach {d}", "Copiado a {d}", "Copiato su {d}", "Gekopieerd naar {d}", "Copiado para {d}", "Skopiowano do {d}"],
    "Planning enregistré": ["Schedule saved", "Plan gespeichert", "Horario guardado", "Programma salvato", "Schema opgeslagen", "Horário guardado", "Zapisano harmonogram"],
    "Planning enregistré (+ {n} pièce)": ["Schedule saved (+ {n} room)", "Plan gespeichert (+ {n} Raum)", "Horario guardado (+ {n} estancia)", "Programma salvato (+ {n} stanza)", "Schema opgeslagen (+ {n} kamer)", "Horário guardado (+ {n} divisão)", "Zapisano harmonogram (+ {n} pokój)"],
    "Planning enregistré (+ {n} pièces)": ["Schedule saved (+ {n} rooms)", "Plan gespeichert (+ {n} Räume)", "Horario guardado (+ {n} estancias)", "Programma salvato (+ {n} stanze)", "Schema opgeslagen (+ {n} kamers)", "Horário guardado (+ {n} divisões)", "Zapisano harmonogram (+ {n} pokoje)"],
    "Indiquez un nom et au moins un appareil": ["Enter a name and at least one device", "Geben Sie einen Namen und mindestens ein Gerät an", "Indica un nombre y al menos un dispositivo", "Indica un nome e almeno un dispositivo", "Geef een naam en minstens één apparaat op", "Indique um nome e pelo menos um dispositivo", "Podaj nazwę i co najmniej jedno urządzenie"],
    "Pièce enregistrée": ["Room saved", "Raum gespeichert", "Estancia guardada", "Stanza salvata", "Kamer opgeslagen", "Divisão guardada", "Zapisano pokój"],
    "Pièce créée": ["Room created", "Raum erstellt", "Estancia creada", "Stanza creata", "Kamer aangemaakt", "Divisão criada", "Utworzono pokój"],
    "Pièce supprimée": ["Room deleted", "Raum gelöscht", "Estancia eliminada", "Stanza eliminata", "Kamer verwijderd", "Divisão eliminada", "Usunięto pokój"],
    "Réglages enregistrés": ["Settings saved", "Einstellungen gespeichert", "Ajustes guardados", "Impostazioni salvate", "Instellingen opgeslagen", "Definições guardadas", "Zapisano ustawienia"],
    "Plus de place ici : raccourcissez d'abord une plage": ["No room left here: shorten a range first", "Hier ist kein Platz mehr: Kürzen Sie zuerst einen Bereich", "No queda sitio aquí: acorta primero un tramo", "Non c'è più spazio qui: accorcia prima una fascia", "Hier is geen ruimte meer: verkort eerst een tijdvak", "Não há espaço aqui: encurte primeiro um intervalo", "Brak miejsca: najpierw skróć przedział"],
    "Automatique (clair / sombre)": ["Automatic (light / dark)", "Automatisch (hell / dunkel)", "Automático (claro / oscuro)", "Automatico (chiaro / scuro)", "Automatisch (licht / donker)", "Automático (claro / escuro)", "Automatycznie (jasny / ciemny)"],
    "Sombre": ["Dark", "Dunkel", "Oscuro", "Scuro", "Donker", "Escuro", "Ciemny"],
    "Clair": ["Light", "Hell", "Claro", "Chiaro", "Licht", "Claro", "Jasny"],
    "Couleurs de mon thème": ["My theme colours", "Farben meines Themes", "Colores de mi tema", "Colori del mio tema", "Kleuren van mijn thema", "Cores do meu tema", "Kolory mojego motywu"],
    "Titre (vide = Chauffage / Climatisation)": ["Title (empty = Heating / Air conditioning)", "Titel (leer = Heizung / Klimaanlage)", "Título (vacío = Calefacción / Climatización)", "Titolo (vuoto = Riscaldamento / Climatizzazione)", "Titel (leeg = Verwarming / Airco)", "Título (vazio = Aquecimento / Climatização)", "Tytuł (puste = Ogrzewanie / Klimatyzacja)"],
    "Pièces affichées (aucune cochée = toutes)": ["Rooms shown (none ticked = all)", "Angezeigte Räume (keiner angekreuzt = alle)", "Estancias mostradas (ninguna marcada = todas)", "Stanze mostrate (nessuna spuntata = tutte)", "Getoonde kamers (geen aangevinkt = alle)", "Divisões mostradas (nenhuma marcada = todas)", "Wyświetlane pokoje (brak zaznaczenia = wszystkie)"],
    "Apparence": ["Appearance", "Darstellung", "Apariencia", "Aspetto", "Weergave", "Aparência", "Wygląd"],
    "HOLM Climat": ["HOLM Climat", "HOLM Climat", "HOLM Climat", "HOLM Climat", "HOLM Climat", "HOLM Climat", "HOLM Climat"],
    "Programmation du chauffage et de la clim, pièce par pièce (intégration Climat HOLM).": ["Heating and A/C scheduling, room by room (Climat HOLM integration).", "Heizungs- und Klimaplanung, Raum für Raum (Integration Climat HOLM).", "Programación de calefacción y climatización, estancia por estancia (integración Climat HOLM).", "Programmazione di riscaldamento e clima, stanza per stanza (integrazione Climat HOLM).", "Planning van verwarming en airco, kamer per kamer (integratie Climat HOLM).", "Programação do aquecimento e da climatização, divisão a divisão (integração Climat HOLM).", "Harmonogram ogrzewania i klimatyzacji, pokój po pokoju (integracja Climat HOLM)."],
    "Sonde {t}° · correction {o}°": ["Sensor {t}° · correction {o}°", "Fühler {t}° · Korrektur {o}°", "Sonda {t}° · corrección {o}°", "Sonda {t}° · correzione {o}°", "Sensor {t}° · correctie {o}°", "Sonda {t}° · correção {o}°", "Czujnik {t}° · korekta {o}°"],
    "Consigne ajustée d'après la sonde (inactif pour le moment)": ["Setpoint adjusted from the sensor (inactive right now)", "Sollwert nach dem Fühler angepasst (derzeit inaktiv)", "Consigna ajustada según la sonda (inactivo por ahora)", "Setpoint regolato dalla sonda (al momento inattivo)", "Setpoint aangepast op de sensor (nu niet actief)", "Setpoint ajustado pela sonda (inativo de momento)", "Nastawa korygowana wg czujnika (obecnie nieaktywna)"],
    "Programmation du jour": ["Today's schedule", "Heutiger Zeitplan", "Programación del día", "Programmazione del giorno", "Planning van vandaag", "Programação do dia", "Harmonogram dnia"],
    "profil {p}": ["profile {p}", "Profil {p}", "perfil {p}", "profilo {p}", "profiel {p}", "perfil {p}", "profil {p}"],
    "Clic : masquer / afficher · double-clic : seulement cette pièce": ["Click: hide / show · double-click: only this room", "Klick: aus-/einblenden · Doppelklick: nur dieser Raum", "Clic: ocultar / mostrar · doble clic: solo esta estancia", "Clic: nascondi / mostra · doppio clic: solo questa stanza", "Klik: verbergen / tonen · dubbelklik: alleen deze ruimte", "Clique: ocultar / mostrar · duplo clique: só esta divisão", "Klik: ukryj / pokaż · dwuklik: tylko to pomieszczenie"],
    "Tout afficher": ["Show all", "Alle anzeigen", "Mostrar todo", "Mostra tutto", "Alles tonen", "Mostrar tudo", "Pokaż wszystko"],
    "Température mesurée aujourd'hui, en pointillés": ["Temperature measured today, dotted", "Heute gemessene Temperatur, gepunktet", "Temperatura medida hoy, punteada", "Temperatura misurata oggi, tratteggiata", "Vandaag gemeten temperatuur, gestippeld", "Temperatura medida hoje, pontilhada", "Temperatura zmierzona dziś, kropkowana"],
    "Température réelle": ["Actual temperature", "Tatsächliche Temperatur", "Temperatura real", "Temperatura reale", "Werkelijke temperatuur", "Temperatura real", "Temperatura rzeczywista"],
    "Trait plein : consigne programmée · pointillés : température mesurée · trou : arrêt. Les dérogations, boosts et absences ne sont pas tracés.": ["Solid line: scheduled setpoint · dotted: measured temperature · gap: off. Overrides, boosts and absences are not drawn.", "Durchgezogen: geplanter Sollwert · gepunktet: gemessene Temperatur · Lücke: aus. Abweichungen, Boosts und Abwesenheiten werden nicht gezeichnet.", "Línea continua: consigna programada · punteada: temperatura medida · hueco: apagado. Excepciones, boosts y ausencias no se dibujan.", "Linea continua: setpoint programmato · tratteggio: temperatura misurata · vuoto: spento. Deroghe, boost e assenze non sono tracciati.", "Doorgetrokken: geplande setpoint · gestippeld: gemeten temperatuur · gat: uit. Afwijkingen, boosts en afwezigheid worden niet getekend.", "Linha contínua: setpoint programado · pontilhado: temperatura medida · falha: desligado. Exceções, boosts e ausências não são desenhados.", "Linia ciągła: zaplanowana nastawa · kropki: zmierzona temperatura · przerwa: wyłączone. Odstępstwa, boosty i nieobecności nie są rysowane."],
    "Ajuster la consigne des appareils d'après la sonde": ["Adjust the devices' setpoint from the sensor", "Sollwert der Geräte nach dem Fühler anpassen", "Ajustar la consigna de los aparatos según la sonda", "Regola il setpoint dei dispositivi in base alla sonda", "Setpoint van de apparaten aanpassen op de sensor", "Ajustar o setpoint dos aparelhos pela sonda", "Koryguj nastawę urządzeń wg czujnika"],
    "Corrige l'écart entre la sonde et le thermomètre de l'appareil (clim, radiateur) : consigne envoyée = consigne + (température de l'appareil − température de la sonde), au plus ±3°, revue au plus toutes les 10 minutes. Pas en mode Manuel ; sans sonde disponible, consigne normale.": ["Corrects the gap between the sensor and the device's thermometer (A/C, radiator): setpoint sent = setpoint + (device temperature − sensor temperature), at most ±3°, reviewed at most every 10 minutes. Not in Manual mode; without an available sensor, normal setpoint.", "Gleicht die Abweichung zwischen Fühler und Gerätethermometer (Klima, Heizkörper) aus: gesendeter Sollwert = Sollwert + (Gerätetemperatur − Fühlertemperatur), höchstens ±3°, höchstens alle 10 Minuten neu berechnet. Nicht im manuellen Modus; ohne verfügbaren Fühler normaler Sollwert.", "Corrige la diferencia entre la sonda y el termómetro del aparato (aire, radiador): consigna enviada = consigna + (temperatura del aparato − temperatura de la sonda), como máximo ±3°, revisada como mucho cada 10 minutos. No en modo Manual; sin sonda disponible, consigna normal.", "Corregge lo scarto tra la sonda e il termometro del dispositivo (clima, radiatore): setpoint inviato = setpoint + (temperatura del dispositivo − temperatura della sonda), al massimo ±3°, rivisto al massimo ogni 10 minuti. Non in modalità Manuale; senza sonda disponibile, setpoint normale.", "Corrigeert het verschil tussen de sensor en de thermometer van het apparaat (airco, radiator): verzonden setpoint = setpoint + (apparaattemperatuur − sensortemperatuur), hoogstens ±3°, hoogstens elke 10 minuten herzien. Niet in handmatige modus; zonder beschikbare sensor normaal setpoint.", "Corrige a diferença entre a sonda e o termómetro do aparelho (AC, radiador): setpoint enviado = setpoint + (temperatura do aparelho − temperatura da sonda), no máximo ±3°, revisto no máximo a cada 10 minutos. Não no modo Manual; sem sonda disponível, setpoint normal.", "Koryguje różnicę między czujnikiem a termometrem urządzenia (klimatyzator, grzejnik): wysłana nastawa = nastawa + (temperatura urządzenia − temperatura czujnika), maks. ±3°, zmieniana najwyżej co 10 minut. Nie w trybie ręcznym; bez dostępnego czujnika nastawa normalna."],
    "Replié (s'ouvre d'un clic)": ["Collapsed (opens with a click)", "Eingeklappt (öffnet per Klick)", "Plegado (se abre con un clic)", "Chiuso (si apre con un clic)", "Ingeklapt (opent met een klik)", "Recolhido (abre com um clique)", "Zwinięty (otwiera się kliknięciem)"],
    "Ouvert": ["Open", "Geöffnet", "Abierto", "Aperto", "Open", "Aberto", "Otwarty"],
    "Masqué": ["Hidden", "Ausgeblendet", "Oculto", "Nascosto", "Verborgen", "Oculto", "Ukryty"],
    "Graphique de la journée": ["Day chart", "Tagesdiagramm", "Gráfico del día", "Grafico del giorno", "Dagdiagram", "Gráfico do dia", "Wykres dnia"],
  };
  let LANG = "fr", NUMLOC = "fr-FR";
  const langOf = (hass, c) => { const l = String((c && c.language) || (hass && ((hass.locale && hass.locale.language) || hass.language)) || navigator.language || "en").toLowerCase().split(/[-_]/)[0]; return l === "fr" || HOLM_LANGS.includes(l) ? l : "en"; };
  const setLang = (hass, c) => { LANG = langOf(hass, c); const p = hass && hass.locale && hass.locale.language; NUMLOC = !(c && c.language) && p && p.toLowerCase().startsWith(LANG) ? p : LOCALES[LANG]; return LANG; };
  const _ = (s, v) => { let o = LANG === "fr" ? s : ((I18N[s] && I18N[s][HOLM_LANGS.indexOf(LANG)]) || s); if (v) for (const k in v) o = o.split("{" + k + "}").join(v[k]); return o; };
  // champ « Langue » pour les éditeurs visuels (ha-form)
  const langField = () => ({ name: "language", selector: { select: { mode: "dropdown", options: [{ value: "", label: _("Automatique (profil)") }, ...Object.entries(LANG_NAMES).map(([value, label]) => ({ value, label }))] } } });
  // traduit les titres de sections et les libellés d'options d'un schéma ha-form (écrits en français)
  const locSchema = (sc) => (sc || []).map((x) => { const o = { ...x }; if (o.title) o.title = _(o.title); if (o.schema) o.schema = locSchema(o.schema);
    if (o.selector && o.selector.select && o.name !== "language") o.selector = { ...o.selector, select: { ...o.selector.select, options: (o.selector.select.options || []).map((op) => (typeof op === "string" ? op : { ...op, label: _(op.label) })) } };
    if (o.name === "language" && o.selector && o.selector.select) o.selector = { ...o.selector, select: { ...o.selector.select, options: o.selector.select.options.map((op) => (op.value ? op : { ...op, label: _("Automatique (profil)") })) } };
    return o; });
  const VERSION = "1.3.0";
  const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const _T = (o) => new Proxy(o, { get: (t, k) => { const v = t[k]; return typeof v === "string" ? _(v) : v && typeof v === "object" ? _T(v) : v; } });
  const DAY_S_RAW = { mon: _("Lun"), tue: _("Mar"), wed: _("Mer"), thu: _("Jeu"), fri: _("Ven"), sat: _("Sam"), sun: _("Dim") };
  const DAY_L_RAW = { mon: _("Lundi"), tue: _("Mardi"), wed: _("Mercredi"), thu: _("Jeudi"), fri: _("Vendredi"), sat: _("Samedi"), sun: _("Dimanche") };
  const DAY_S = _T(DAY_S_RAW), DAY_L = _T(DAY_L_RAW);
  const SNAP = 15;   // pas des boutons −/+
  const DRAG = 5;    // pas du glissement des poignées
  const GAP = 5;     // écart minimal entre deux créneaux

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mins = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
  const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const fmtT = (v, d = 1) => (v == null || isNaN(v) ? "–" : Number(v).toFixed(d).replace(".", ","));

  // modes et options d'appareil
  const HVAC_RAW = {
    heat: { l: _("Chauffage"), s: _("Chauffe"), i: "mdi:fire" },
    cool: { l: _("Climatisation"), s: _("Clim"), i: "mdi:snowflake" },
    heat_cool: { l: _("Chaud / froid"), s: _("Chaud/froid"), i: "mdi:sun-snowflake-variant" },
    auto: { l: _("Automatique"), s: _("Auto"), i: "mdi:thermostat-auto" },
    dry: { l: _("Déshumidification"), s: _("Déshum."), i: "mdi:water-percent" },
    fan_only: { l: _("Ventilation seule"), s: _("Ventilation"), i: "mdi:fan" },
  };
  const HVAC = _T(HVAC_RAW);
  const HVAC_ORDER = ["heat", "cool", "heat_cool", "auto", "dry", "fan_only"];
  const OPTS_RAW = [
    { k: "preset", attr: "preset_modes", l: _("Préréglage"), i: "mdi:tune-variant" },
    { k: "fan", attr: "fan_modes", l: _("Ventilation"), i: "mdi:fan" },
    { k: "swing", attr: "swing_modes", l: _("Oscillation verticale"), i: "mdi:arrow-up-down" },
    { k: "hswing", attr: "swing_horizontal_modes", l: _("Oscillation horizontale"), i: "mdi:arrow-left-right" },
  ];
  const OPTS = _T(OPTS_RAW);
  const VAL_L_RAW = {
    auto: _("Auto"), quiet: _("Silencieux"), silence: _("Silencieux"), low: _("Faible"), medium: _("Moyen"), high: _("Fort"),
    off: _("Arrêt"), stop: _("Arrêt"), on: _("Balayage"), swing: _("Balayage"), both: _("Les deux"), vertical: _("Vertical"), horizontal: _("Horizontal"),
    "comfort airflow": _("Flux confort"), windnice: _("Flux confort"), none: _("Aucun"), away: _("Absence"), boost: _("Boost"), eco: _("Éco"), comfort: _("Confort"), sleep: _("Nuit"), home: _("Maison"), activity: _("Activité"),
  };
  const VAL_L = _T(VAL_L_RAW);
  const valL = (k, v) => { const x = String(v); if (k === "fan" && /^\d+$/.test(x)) return _("Vitesse ") + x; return VAL_L[x.toLowerCase()] || x.charAt(0).toUpperCase() + x.slice(1); };
  const slotOn = (s) => !!s && !s.off;
  // couleur d'un créneau / d'un état selon le mode
  const modeColor = (hvac, t, cool) => {
    if (hvac === "fan_only") return "rgb(52,211,153)";
    if (hvac === "dry") return "rgb(34,211,238)";
    if (hvac === "heat_cool" || hvac === "auto") return "rgb(167,139,250)";
    return tempColor(t, hvac ? hvac === "cool" : cool);
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const haptic = (t = "light") => window.dispatchEvent(new CustomEvent("haptic", { detail: t }));
  const todayKey = () => DAYS[(new Date().getDay() + 6) % 7];
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const timeOf = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleTimeString(NUMLOC, { hour: "2-digit", minute: "2-digit" }); };
  const dayOf = (iso) => {
    if (!iso) return "";
    const d = new Date(iso), n = new Date();
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000);
    return diff === 0 ? "" : diff === 1 ? _("demain ") : d.toLocaleDateString(NUMLOC, { weekday: "long" }) + " ";
  };
  const left = (iso) => { const s = (new Date(iso) - Date.now()) / 60000; return s <= 0 ? "" : s < 60 ? `${Math.ceil(s)} min` : `${Math.floor(s / 60)} h ${String(Math.round(s % 60)).padStart(2, "0")}`; };

  // couleur d'une température (bleu froid → ambre → rouge chaud)
  const tempColor = (t, cool) => {
    if (t == null) return null;
    const stops = cool
      ? [[18, [99, 102, 241]], [22, [56, 189, 248]], [26, [125, 211, 252]]]
      : [[15, [96, 165, 250]], [18, [45, 212, 191]], [19.5, [251, 191, 36]], [21, [249, 115, 22]], [23, [239, 68, 68]]];
    if (t <= stops[0][0]) return `rgb(${stops[0][1]})`;
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i], k = (t - a) / (b - a);
        return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * k)).join(",")})`;
      }
    }
    return `rgb(${stops[stops.length - 1][1]})`;
  };

  // segments d'une journée : [{from, to, off, temp, idx}] (idx = index du créneau, -1 = report de la veille)
  const segments = (week, day) => {
    const di = DAYS.indexOf(day);
    const slots = week[day] || [];
    let carry = null;
    for (let b = 1; b <= 7 && !carry; b++) {
      const prev = week[DAYS[(di - b + 7) % 7]] || [];
      if (prev.length) carry = prev[prev.length - 1];
    }
    const out = [];
    let start = 0, cur = carry, idx = -1;
    slots.forEach((s, i) => {
      const m = mins(s.t);
      if (m > start) out.push({ from: start, to: m, off: !slotOn(cur), temp: slotOn(cur) ? cur.temp : null, hvac: slotOn(cur) ? cur.hvac : null, o: slotOn(cur) ? cur : null, idx });
      start = m; cur = s; idx = i;
    });
    out.push({ from: start, to: 1440, off: !slotOn(cur), temp: slotOn(cur) ? cur.temp : null, hvac: slotOn(cur) ? cur.hvac : null, o: slotOn(cur) ? cur : null, idx });
    return out.filter((s) => s.to > s.from);
  };

  const barHTML = (week, day, cool, opts = {}) => {
    const segs = segments(week, day);
    const now = day === todayKey() ? nowMin() : null;
    return `<div class="bar${opts.big ? " big" : ""}">${segs.map((s, i) => {
      const c = s.off ? "" : modeColor(s.hvac, s.temp, cool);
      const w = ((s.to - s.from) / 1440) * 100;
      const sel = opts.sel === s.idx && s.idx >= 0 ? " sel" : "";
      const txt = opts.big ? (opts.label ? opts.label(s) : s.off ? _("Arrêt") : s.hvac === "fan_only" ? _("Ventil.") : fmtT(s.temp) + "°") : "";
      return `<span class="seg${s.off ? " off" : ""}${sel}" data-idx="${s.idx}"${txt ? ` title="${esc(txt)}"` : ""} style="left:${(s.from / 1440) * 100}%;width:${w}%;${c ? `--sc:${c}` : ""};--d:${i * 40}ms">${opts.big && w > 2.5 ? `<b>${esc(txt)}</b>` : ""}</span>`;
    }).join("")}${now != null ? `<i class="now" style="left:${(now / 1440) * 100}%"></i>` : ""}</div>`;
  };

  // graphique de la journée : une couleur par pièce, choix mémorisés par le navigateur
  const DC_PAL = ["#f97316", "#38bdf8", "#a78bfa", "#34d399", "#f472b6", "#facc15", "#60a5fa", "#fb7185", "#2dd4bf", "#c084fc", "#a3e635", "#fbbf24"];
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } };

  // ======================================================================
  class HolmClimatCard extends HTMLElement {
    static getConfigElement() { return document.createElement("holm-climat-card-editor"); }
    static getStubConfig() { return { type: "custom:holm-climat-card" }; }
    setConfig(config) {
      this._config = { title: "", ...config };
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._view = this._view || { name: "home" };
      this._render();
    }
    getCardSize() { return 8; }
    getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

    set hass(hass) {
      const first = !this._hass;
      this._hass = hass;
      { const _l = setLang(hass, this._config); if (this._lang && _l !== this._lang) this._render(); this._lang = _l; }
      this._tone();
      if (first) this._load();
      if (hass && hass.connection !== this._conn) { this._conn = hass.connection; this._unsub && this._unsub(); this._unsub = null; this._subscribe(); }
    }
    connectedCallback() {
      if (!this._keyH) {
        this._keyH = (ev) => {
          if (this._view.name !== "day" || !this._edit || !this.isConnected) return;
          if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
          const t = ev.composedPath()[0];
          if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || "")) return;
          ev.preventDefault();
          this._slotNav(ev.key === "ArrowRight" ? 1 : -1);
        };
      }
      window.addEventListener("keydown", this._keyH);
      this._clock = setInterval(() => this._view.name === "home" && this._data && this._render(), 60000);
      if (this._hass && !this._unsub) this._subscribe();
    }
    disconnectedCallback() {
      clearInterval(this._clock);
      if (this._keyH) window.removeEventListener("keydown", this._keyH);
      if (this._unsub) { this._unsub(); this._unsub = null; }
    }
    async _subscribe() {
      if (!this._hass || this._subscribing) return;
      this._subscribing = true;
      try {
        const u = await this._hass.connection.subscribeMessage(() => this._soon(), { type: "climat_holm/subscribe" });
        this._unsub = () => { try { u(); } catch (e) { /* */ } };
      } catch (e) { /* intégration absente */ }
      this._subscribing = false;
    }
    _soon() { clearTimeout(this._t); this._t = setTimeout(() => this._load(), 250); }
    async _load() {
      try {
        this._data = await this._hass.callWS({ type: "climat_holm/data" });
        this._error = null;
      } catch (e) {
        this._error = e.code === "unknown_command" ? _("L'intégration Climat HOLM n'est pas installée.") : e.message || _("Erreur");
      }
      this._render();
    }
    async _ws(msg, okToast) {
      try {
        const r = await this._hass.callWS(msg);
        if (okToast) this._toast(okToast);
        await this._load();
        return r;
      } catch (e) {
        this._toast(e.message || _("Action impossible"), true);
        throw e;
      }
    }
    _tone() {
      const t = this._config && this._config.theme || "auto";
      let dark = !!(this._hass && this._hass.themes && this._hass.themes.darkMode);
      try {
        const bg = getComputedStyle(this).getPropertyValue("--primary-background-color").trim();
        const m = bg.match(/^#([0-9a-f]{6})$/i) || bg.match(/rgba?\(([^)]+)\)/i);
        if (m) {
          const rgb = bg.startsWith("#") ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : m[1].split(",").slice(0, 3).map(Number);
          if (rgb.every((x) => !isNaN(x))) dark = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 < 0.5;
        }
      } catch (e) { /* */ }
      const tone = t === "auto" ? (dark ? "dark" : "light") : t;
      if (this.dataset.tone !== tone) this.dataset.tone = tone;
    }
    _rooms() {
      const d = this._data;
      if (!d) return [];
      const only = this._config.rooms;
      return d.rooms.filter((r) => !only || !only.length || only.includes(r.id));
    }
    _room(id) { return this._data && this._data.rooms.find((r) => r.id === id); }
    get _cool() { return this._data && this._data.global.season === "cool"; }
    // ce que savent faire les appareils d'une pièce (union)
    _caps(room) {
      const c = { hvac: new Set(), opts: {}, temp: false, st: {} };
      OPTS.forEach((o) => (c.opts[o.k] = []));
      (room.climates || []).forEach((eid) => {
        const st = this._hass && this._hass.states[eid];
        if (!st) return;
        (st.attributes.hvac_modes || []).forEach((m) => m !== "off" && c.hvac.add(m));
        if (st.attributes.min_temp != null || st.attributes.temperature != null) c.temp = true;
        OPTS.forEach((o) => {
          if ((st.attributes[o.attr] || []).length && !c.st[o.k]) c.st[o.k] = st;
          (st.attributes[o.attr] || []).forEach((v) => !c.opts[o.k].includes(v) && c.opts[o.k].push(v));
        });
      });
      c.hvac = HVAC_ORDER.filter((m) => c.hvac.has(m));
      return c;
    }
    // texte court d'une consigne : « 21,0° », « Clim 24,0° », « Ventilation », « Arrêt »
    _val(hvac, temp, off) {
      if (off || hvac === "off") return _("Arrêt");
      if (hvac === "fan_only") return _("Ventilation");
      const season = this._cool ? "cool" : "heat";
      const pre = hvac && hvac !== season && HVAC[hvac] ? HVAC[hvac].s + " " : "";
      return pre + (temp != null ? fmtT(temp) + "°" : "").trim() || pre.trim();
    }
    _optsTxt(opts, caps) { return OPTS.filter((o) => opts && opts[o.k]).map((o) => `${o.l} : ${this._vl(caps, o.k, opts[o.k])}`).join(" · "); }
    // libellé d'une valeur : traduction officielle de l'intégration (comme dans HA), sinon la nôtre
    _vl(caps, k, v) {
      const o = OPTS.find((x) => x.k === k), st = caps && caps.st[k];
      const own = valL(k, v);
      if (VAL_L[String(v).toLowerCase()] || (k === "fan" && /^\d+$/.test(String(v)))) return own;
      try {
        if (st && this._hass.formatEntityAttributeValue) {
          const t = this._hass.formatEntityAttributeValue(st, o.attr.replace(/s$/, ""), v);
          if (t && t !== v) return t;
        }
      } catch (e) { /* libellé brut */ }
      return own;
    }
    _week(room) { const g = this._data.global; return room.schedules[g.profile] || Object.values(room.schedules)[0] || {}; }

    // ------------------------------------------------------------------ rendu
    _render() {
      const r = this.shadowRoot;
      if (!r || !this._config) return;
      setLang(this._hass, this._config);
      if (!this._shell) {
        r.innerHTML = `<style>${HolmClimatCard.css()}</style><ha-card><div class="glow"></div><div id="v" class="view"></div><div class="toast" id="toast"></div></ha-card>`;
        this._shell = true;
        r.getElementById("v").addEventListener("click", (e) => this._click(e));
        r.getElementById("v").addEventListener("dblclick", (e) => {   // légende du graphique : seulement cette pièce
          const b = e.target.closest('[data-a="dc-room"]'); if (!b) return;
          const st = this._dcState(); st.hidden = this._rooms().map((x) => x.id).filter((id) => id !== b.dataset.id); lsSet("holm-climat-dc-hidden", st.hidden); this._render();
        });
      }
      const v = r.getElementById("v");
      const html = this._error ? this._empty("mdi:thermometer-off", this._error)
        : !this._data ? `<div class="load"><span></span><span></span><span></span></div>`
          : this._view.name === "room" ? this._roomView()
            : this._view.name === "day" ? this._dayView()
              : this._view.name === "edit" ? this._editView()
                : this._view.name === "settings" ? this._settingsView()
                  : this._homeView();
      const key = this._view.name + (this._view.id || "") + (this._view.day || "");
      if (key !== this._lastKey) { v.classList.remove("in"); void v.offsetWidth; v.classList.add("in"); this._lastKey = key; this._anim = true; } else this._anim = false;
      v.innerHTML = html;
      v.classList.toggle("anim", this._anim);
      if (this._view.name === "day") this._bindDay();
      if (this._view.name === "home") this._bindDc();
      if (this._view.name === "edit" || this._view.name === "settings") this._mountForm();
    }
    // texte de l'ajustement d'après la sonde (#2) : « Sonde 21,0° · correction +1,5° »
    _sensorTxt(s) {
      const a = s.sensor_adjust || {};
      const o = Number(a.offset || 0);
      return _("Sonde {t}° · correction {o}°", { t: fmtT(a.temp), o: (o > 0 ? "+" : o < 0 ? "−" : "") + fmtT(Math.abs(o)) });
    }

    // ---------- graphique de la journée : consigne programmée de chaque pièce (et température réelle en option)
    _dcState() {
      if (!this._dc) this._dc = { open: lsGet("holm-climat-dc-open", this._config.day_chart === "open"), hidden: lsGet("holm-climat-dc-hidden", []), real: lsGet("holm-climat-dc-real", this._config.day_chart_real === true) };
      return this._dc;
    }
    _dayChart(rooms) {
      if (this._config.day_chart === "hide") return "";
      const st = this._dcState(), cool = this._cool, day = todayKey();
      const head = `<button class="dch-h" data-a="dc-open"><ha-icon icon="mdi:chart-timeline-variant"></ha-icon><b>${_("Programmation du jour")}</b><small>${esc(DAY_L[day])} · ${_("profil {p}", { p: esc(this._data.global.profile) })}</small><ha-icon class="chev${st.open ? " up" : ""}" icon="mdi:chevron-down"></ha-icon></button>`;
      if (!st.open) return `<div class="dch">${head}</div>`;
      // pièce sur « Arrêt » : pas de trait ; en mode Manuel : sa consigne manuelle toute la journée
      const daySegs = (r) => r.mode === "off" ? [{ from: 0, to: 1440, off: true, temp: null }]
        : r.mode === "manual" ? [{ from: 0, to: 1440, off: false, temp: r.manual_temp ?? this._data.settings.manual_temp }]
          : segments(this._week(r), day);
      const lines = rooms.map((r, i) => ({ r, col: DC_PAL[i % DC_PAL.length], segs: daySegs(r), hid: st.hidden.includes(r.id) }));
      const vis = lines.filter((l) => !l.hid);
      if (st.real) this._dcLoad(rooms);
      const real = st.real && this._dh ? this._dh.data : {};
      // échelle verticale : consignes et températures réelles visibles
      const vals = [];
      vis.forEach((l) => { l.segs.forEach((g) => !g.off && g.temp != null && vals.push(Number(g.temp))); (real[l.r.entity_id] || []).forEach((p) => vals.push(p.v)); });
      let lo = vals.length ? Math.floor(Math.min(...vals) - 0.5) : 16, hi = vals.length ? Math.ceil(Math.max(...vals) + 0.5) : 22;
      if (hi - lo < 4) { const m = (hi + lo) / 2; lo = Math.floor(m - 2); hi = Math.ceil(m + 2); }
      const X = (m) => (m / 1440) * 1000, Y = (t) => 100 - ((t - lo) / (hi - lo)) * 100;
      const step = hi - lo > 8 ? 2 : 1;
      const grid = []; for (let t = lo; t <= hi; t += step) grid.push(t);
      // pièces au même programme : leurs traits sont décalés de 3 px pour rester tous visibles (ruban)
      const H = 170, gap = 3;
      const paths = vis.map((l, vi) => {
        const dy = (((vi - (vis.length - 1) / 2) * gap) / H) * 100;
        let d = "", prev = null;
        l.segs.forEach((g) => {
          if (g.off || g.temp == null) { prev = null; return; }
          const y = Y(Number(g.temp));
          d += prev != null && prev.to === g.from ? ` L${X(g.from)},${y}` : ` M${X(g.from)},${y}`;
          d += ` L${X(g.to)},${y}`; prev = g;
        });
        const pts = (real[l.r.entity_id] || []).map((p) => `${X(p.m).toFixed(1)},${Y(p.v).toFixed(2)}`);
        return `${d ? `<path class="sp" d="${d.trim()}" transform="translate(0 ${dy.toFixed(3)})" style="--lc:${l.col}"/>` : ""}${pts.length > 1 ? `<polyline class="rp" points="${pts.join(" ")}" style="--lc:${l.col}"/>` : ""}`;
      }).join("");
      const now = nowMin();
      this._dcLines = lines; this._dcScale = { lo, hi };
      return `<div class="dch open">${head}
        <div class="dcb">
          <div class="plot" data-dc="plot">
            ${grid.map((t) => `<span class="gy" style="top:${Y(t)}%"><em>${t}°</em></span>`).join("")}
            <svg viewBox="0 0 1000 100" preserveAspectRatio="none">${paths}</svg>
            <i class="dnow" style="left:${(now / 1440) * 100}%"></i>
            <div class="dtip" hidden></div>
          </div>
          <div class="dhours"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
          <div class="dleg">${lines.map((l) => `<button class="dl${l.hid ? " off" : ""}" data-a="dc-room" data-id="${l.r.id}" title="${_("Clic : masquer / afficher · double-clic : seulement cette pièce")}"><i style="background:${l.col}"></i>${esc(l.r.name)}${l.r.mode === "off" ? `<small>${_("Arrêt")}</small>` : l.r.mode === "manual" ? `<small>${_("Manuel")}</small>` : ""}</button>`).join("")}
            ${st.hidden.length ? `<button class="dl all" data-a="dc-all">${_("Tout afficher")}</button>` : ""}
            <button class="dl real${st.real ? " on" : ""}" data-a="dc-real" title="${_("Température mesurée aujourd'hui, en pointillés")}"><ha-icon icon="mdi:thermometer"></ha-icon>${_("Température réelle")}</button>
          </div>
          <div class="dnote">${_("Trait plein : consigne programmée · pointillés : température mesurée · trou : arrêt. Les dérogations, boosts et absences ne sont pas tracés.")}</div>
        </div></div>`;
    }
    // températures réelles du jour : historique des entités « pièce » de Climat HOLM (attribut current_temperature)
    async _dcLoad(rooms) {
      const ids = rooms.map((r) => r.entity_id).filter(Boolean);
      const key = ids.join(",");
      if (!ids.length || this._dhBusy || (this._dh && this._dh.key === key && Date.now() - this._dh.at < 300000)) return;
      this._dhBusy = true;
      try {
        const d0 = new Date(); d0.setHours(0, 0, 0, 0);
        const res = await this._hass.callWS({ type: "history/history_during_period", start_time: d0.toISOString(), entity_ids: ids, minimal_response: false, no_attributes: false, significant_changes_only: false });
        const data = {};
        for (const id of ids) {
          data[id] = (res[id] || []).map((h) => {
            const v = h.a && h.a.current_temperature != null ? Number(h.a.current_temperature) : null;
            const t = new Date(((h.lu || h.lc) || 0) * 1000);
            const m = Math.max(0, (t - d0) / 60000);
            return v == null || isNaN(v) ? null : { m: Math.min(1440, m), v };
          }).filter(Boolean);
          const cur = this._hass.states[id], cv = cur && cur.attributes.current_temperature;
          if (cv != null) data[id].push({ m: nowMin(), v: Number(cv) });
        }
        this._dh = { key, at: Date.now(), data };
        if (this._view.name === "home") this._render();
      } catch (e) { this._dh = { key, at: Date.now(), data: {} }; }
      this._dhBusy = false;
    }
    _bindDc() {
      const plot = this.shadowRoot.querySelector('[data-dc="plot"]');
      if (!plot || !this._dcLines) return;
      const tip = plot.querySelector(".dtip");
      const move = (ev) => {
        const r = plot.getBoundingClientRect(), x = Math.max(0, Math.min(r.width, ev.clientX - r.left));
        const m = Math.round((x / r.width) * 1440 / 5) * 5;
        const real = this._dc.real && this._dh ? this._dh.data : {};
        const rows = this._dcLines.filter((l) => !l.hid).map((l) => {
          const g = l.segs.find((z) => m >= z.from && m < z.to) || l.segs[l.segs.length - 1];
          const rr = (real[l.r.entity_id] || []).filter((p) => p.m <= m).pop();
          return `<div><i style="background:${l.col}"></i><span>${esc(l.r.name)}</span><b>${g.off || g.temp == null ? _("Arrêt") : fmtT(g.temp) + "°"}</b>${rr && m <= nowMin() ? `<small>${fmtT(rr.v)}°</small>` : ""}</div>`;
        });
        tip.innerHTML = `<div class="th">${hhmm(Math.min(m, 1439))}</div>${rows.join("")}`;
        tip.hidden = false;
        tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, x + 12)) + "px";
        plot.style.setProperty("--hx", x + "px");
        plot.classList.add("hov");
      };
      plot.addEventListener("pointermove", move);
      plot.addEventListener("pointerdown", move);
      plot.addEventListener("pointerleave", () => { tip.hidden = true; plot.classList.remove("hov"); });
    }
    _empty(icon, text, sub = "") { return `<div class="empty"><ha-icon icon="${icon}"></ha-icon><b>${esc(text)}</b>${sub ? `<small>${sub}</small>` : ""}</div>`; }

    // ---------- accueil
    _homeView() {
      const d = this._data, g = d.global, rooms = this._rooms();
      const title = this._config.title || (g.season === "cool" ? _("Climatisation") : _("Chauffage"));
      const heatingN = rooms.filter((r) => r.state.action === "heating" || r.state.action === "cooling").length;
      const sub = !g.running ? _("Programmation en pause — Climat HOLM ne pilote rien")
        : g.all_off ? _("Tout est arrêté")
          : g.away ? _("Absence") + (g.away_until ? _(" jusqu'à {t}", { t: dayOf(g.away_until) + timeOf(g.away_until) }) : "")
            : `${_("Profil {p}", { p: esc(g.profile) })}${heatingN ? ` · ${_(g.season === "cool" ? (heatingN > 1 ? _("{n} pièces en refroidissement") : _("{n} pièce en refroidissement")) : (heatingN > 1 ? _("{n} pièces en chauffe") : _("{n} pièce en chauffe")), { n: heatingN })}` : ""}`;
      return `
        <div class="hd">
          <div class="hic ${g.season === "cool" ? "cool" : "heat"}${g.running && heatingN ? " live" : ""}"><ha-icon icon="${g.season === "cool" ? "mdi:snowflake" : "mdi:fire"}"></ha-icon></div>
          <div class="ht"><b>${esc(title)}</b><small>${sub}</small></div>
          <button class="ibtn" data-a="settings" title="${_("Réglages")}"><ha-icon icon="mdi:cog-outline"></ha-icon></button>
          <button class="tgl${g.running ? " on" : ""}" data-a="running" title="${g.running ? _("Mettre en pause") : _("Activer la programmation")}"><i></i></button>
        </div>
        <div class="chips">
          <div class="seg2"><button data-a="season" data-v="heat" class="${g.season !== "cool" ? "on heat" : ""}"><ha-icon icon="mdi:fire"></ha-icon>${_("Chauffage")}</button><button data-a="season" data-v="cool" class="${g.season === "cool" ? "on cool" : ""}"><ha-icon icon="mdi:snowflake"></ha-icon>${_("Clim")}</button></div>
          <button class="chip${g.away ? " on warn" : ""}" data-a="away"><ha-icon icon="mdi:home-export-outline"></ha-icon>${_("Absence")}</button>
          <button class="chip${g.all_off ? " on bad" : ""}" data-a="alloff"><ha-icon icon="mdi:power"></ha-icon>${_("Tout arrêter")}</button>
        </div>
        <div class="profiles">
          <ha-icon icon="mdi:calendar-clock"></ha-icon>
          ${d.profiles.map((p) => `<button class="pchip${p === g.profile ? " on" : ""}" data-a="profile" data-v="${esc(p)}">${esc(p)}</button>`).join("")}
          ${this._pedit ? `<span class="pin"><input id="pname" placeholder="${this._pedit.op === "rename" ? esc(this._pedit.name) : _("Nouveau profil")}" value="${this._pedit.op === "rename" ? esc(this._pedit.name) : ""}" maxlength="30"><button class="mini" data-a="pok"><ha-icon icon="mdi:check"></ha-icon></button><button class="mini" data-a="pcancel"><ha-icon icon="mdi:close"></ha-icon></button></span>`
          : `<button class="pchip add" data-a="padd" title="${_("Nouveau profil (copie du profil actif)")}"><ha-icon icon="mdi:plus"></ha-icon></button>${d.profiles.length ? `<button class="pchip add" data-a="pmenu" title="${_("Renommer / supprimer le profil actif")}"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>` : ""}`}
        </div>
        ${this._pmenu ? `<div class="pmenu"><span>${_("Profil « {p} »", { p: esc(g.profile) })}</span><button class="mini txt" data-a="prename">${_("Renommer")}</button><button class="mini txt danger" data-a="pdelete"${d.profiles.length < 2 ? " disabled" : ""}>${_("Supprimer")}</button><button class="mini" data-a="pmenu"><ha-icon icon="mdi:close"></ha-icon></button></div>` : ""}
        ${rooms.length ? `<div class="grid">${rooms.map((room, i) => this._tile(room, i)).join("")}</div>${this._dayChart(rooms)}` : this._empty("mdi:home-thermometer-outline", _("Aucune pièce pour l'instant"), d.has_climate_scheduler ? `<button class="pbtn" data-a="import">${_("Importer depuis Climate Scheduler")}</button>` : "")}
        <button class="add" data-a="new"><ha-icon icon="mdi:plus"></ha-icon>${_("Ajouter une pièce")}</button>`;
    }

    _status(room) {
      const s = room.state, g = this._data.global;
      const at = (iso) => (iso ? `${dayOf(iso)}${timeOf(iso)}` : "");
      switch (s.source) {
        case "paused": return { t: _("Programmation en pause"), i: "mdi:pause-circle-outline", c: "mute" };
        case "all_off": return { t: _("Tout arrêté"), i: "mdi:power", c: "mute" };
        case "window": return { t: _("Fenêtre ouverte — arrêt"), i: "mdi:window-open-variant", c: "warn" };
        case "room_off": return { t: _("Arrêt"), i: "mdi:power", c: "mute" };
        case "boost": return { t: _("Boost · encore {t}", { t: left(s.until) }), i: "mdi:rocket-launch-outline", c: "hot" };
        case "away": return { t: `${_("Absence")}${s.temp != null ? " · " + fmtT(s.temp) + "°" : ""}${s.until ? _(" jusqu'à {t}", { t: at(s.until) }) : ""}`, i: "mdi:home-export-outline", c: "warn" };
        case "manual": return { t: _("Manuel · {v}", { v: this._val(s.hvac, s.temp) }), i: "mdi:hand-back-right-outline", c: "" };
        case "override": return { t: _("{v} jusqu'à {t} (dérogation)", { v: this._val(s.hvac, s.temp), t: at(s.until) }), i: "mdi:timer-sand", c: "hot" };
        default: {
          const now = this._val(s.hvac, s.temp);
          if (s.next_at) {
            const nxt = s.next_off ? _("arrêt") : this._val(s.next_hvac, s.next_temp);
            return { t: _("{a} · puis {b} à {t}", { a: now, b: nxt, t: at(s.next_at) }), i: "mdi:calendar-clock", c: "" };
          }
          return { t: now, i: "mdi:calendar-clock", c: "" };
        }
      }
    }

    _tile(room, i) {
      const s = room.state, cool = this._cool, st = this._status(room);
      const act = s.action === "heating" ? "heating" : s.action === "cooling" ? "cooling" : "";
      const off = s.hvac === "off";
      const col = off ? "rgb(148,163,184)" : modeColor(s.hvac, s.temp, cool);
      return `<button class="tile ${act}${off ? " isoff" : ""}" data-a="room" data-id="${room.id}" style="--tc:${col};--i:${i}">
        <div class="tt"><ha-icon icon="${esc(room.icon || "mdi:radiator")}"></ha-icon><span>${esc(room.name)}</span>${act ? `<ha-icon class="fx" icon="${act === "heating" ? "mdi:fire" : "mdi:snowflake"}"></ha-icon>` : ""}</div>
        <div class="tv"><span class="cur">${fmtT(s.current)}<small>°</small></span>${!off ? `<span class="tgt"><ha-icon icon="${HVAC[s.hvac] && s.hvac !== (cool ? "cool" : "heat") ? HVAC[s.hvac].i : "mdi:arrow-right-thin"}"></ha-icon>${s.temp != null ? fmtT(s.temp) + "°" : s.hvac === "fan_only" ? _("Ventil.") : esc(HVAC[s.hvac] ? HVAC[s.hvac].s : "")}</span>` : `<span class="tgt off"><ha-icon icon="mdi:power"></ha-icon>${_("Arrêt")}</span>`}</div>
        <div class="ts ${st.c}"><ha-icon icon="${st.i}"></ha-icon><span>${esc(st.t)}</span></div>
        ${s.sensor_adjust && s.sensor_adjust.offset ? `<div class="ts mute"><ha-icon icon="mdi:thermometer-check"></ha-icon><span>${esc(this._sensorTxt(s))}</span></div>` : ""}
        ${barHTML(this._week(room), todayKey(), cool)}
      </button>`;
    }

    // ---------- pièce
    _roomView() {
      const room = this._room(this._view.id);
      if (!room) { this._view = { name: "home" }; return this._homeView(); }
      const s = room.state, g = this._data.global, cool = this._cool, st = this._status(room);
      const week = this._week(room);
      const tgt = room.mode === "manual" ? room.manual_temp : s.temp != null ? s.temp : (s.slot_temp ?? this._data.settings.comfort_temp);
      const act = s.action === "heating" ? "heating" : s.action === "cooling" ? "cooling" : "";
      const special = s.source === "override" || s.source === "boost";
      const off = s.hvac === "off", noTemp = s.hvac === "fan_only" || (room.mode === "manual" && room.manual_hvac === "fan_only");
      const caps = this._caps(room);
      const optsTxt = !off ? this._optsTxt(s.opts, caps) : "";
      return `
        <div class="nav"><button class="ibtn" data-a="home"><ha-icon icon="mdi:chevron-left"></ha-icon></button><b><ha-icon icon="${esc(room.icon || "mdi:radiator")}"></ha-icon>${esc(room.name)}</b><button class="ibtn" data-a="edit" title="${_("Réglages de la pièce")}"><ha-icon icon="mdi:cog-outline"></ha-icon></button></div>
        <div class="thermo ${act}" style="--tc:${off ? "rgb(148,163,184)" : modeColor(s.hvac, s.temp, cool)}">
          <div class="ring"><svg viewBox="0 0 120 120"><circle class="rt" cx="60" cy="60" r="52"/><circle class="rv" cx="60" cy="60" r="52" style="stroke-dasharray:${Math.max(4, Math.min(1, ((s.current ?? 15) - 10) / 20) * 327)} 327"/></svg>
            <div class="rc"><small>${_("Actuelle")}</small><span>${fmtT(s.current)}°</span>${act ? `<em><ha-icon icon="${act === "heating" ? "mdi:fire" : "mdi:snowflake"}"></ha-icon>${act === "heating" ? _("Chauffe") : _("Refroidit")}</em>` : ""}</div>
          </div>
          <div class="setp">
            <small>${_("Consigne")}</small>
            <div class="pm"><button class="rbtn" data-a="tminus"${room.mode === "off" || noTemp ? " disabled" : ""}><ha-icon icon="mdi:minus"></ha-icon></button><span class="big">${noTemp ? _("Ventil.") : off && room.mode !== "manual" ? _("Arrêt") : fmtT(tgt) + "°"}</span><button class="rbtn" data-a="tplus"${room.mode === "off" || noTemp ? " disabled" : ""}><ha-icon icon="mdi:plus"></ha-icon></button></div>
            <div class="ts ${st.c}"><ha-icon icon="${st.i}"></ha-icon><span>${esc(st.t)}</span></div>
            ${optsTxt ? `<div class="ts mute"><ha-icon icon="mdi:tune-variant"></ha-icon><span>${esc(optsTxt)}</span></div>` : ""}
          </div>
        </div>
        <div class="seg3">${[["auto", "mdi:calendar-clock", _("Auto")], ["manual", "mdi:hand-back-right-outline", _("Manuel")], ["off", "mdi:power", _("Arrêt")]].map(([k, ic, l]) => `<button data-a="mode" data-v="${k}" class="${room.mode === k ? "on" : ""}"><ha-icon icon="${ic}"></ha-icon>${l}</button>`).join("")}</div>
        ${room.mode === "manual" ? `<div class="sec"><ha-icon icon="mdi:hand-back-right-outline"></ha-icon>${_("Mode manuel")}</div>${this._modePicker(caps, room.manual_hvac, "mhvac")}${this._optPicker(caps, room.manual_opts || {}, "mopt")}` : ""}
        <div class="acts">
          ${s.source === "boost" ? `<button class="act on hot" data-a="cancel"><ha-icon icon="mdi:rocket-launch"></ha-icon>${_("Arrêter le boost")}</button>` : `<button class="act" data-a="boost"${room.mode === "off" ? " disabled" : ""}><ha-icon icon="mdi:rocket-launch-outline"></ha-icon>${_("Boost {n} min", { n: this._data.settings.boost_minutes })}</button>`}
          <button class="act" data-a="next"${room.mode !== "auto" ? " disabled" : ""}><ha-icon icon="mdi:skip-next-outline"></ha-icon>${_("Créneau suivant")}</button>
          ${special && s.source !== "boost" ? `<button class="act" data-a="cancel"><ha-icon icon="mdi:backup-restore"></ha-icon>${_("Revenir au planning")}</button>` : ""}
        </div>
        <div class="sec"><ha-icon icon="mdi:calendar-week"></ha-icon>${_("Planning · profil {p}", { p: esc(g.profile) })}<small>${_("Touchez un jour pour le modifier")}</small></div>
        <div class="week">${DAYS.map((d, i) => `<button class="wrow${d === todayKey() ? " today" : ""}" data-a="day" data-day="${d}" style="--i:${i}"><span>${DAY_S[d]}</span>${barHTML(week, d, cool)}<ha-icon icon="mdi:chevron-right"></ha-icon></button>`).join("")}
          <div class="hours"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>24h</span></div>
        </div>
        ${(room.windows || []).length || room.temp_sensor ? `<div class="meta">${room.temp_sensor ? `<span><ha-icon icon="mdi:thermometer"></ha-icon>${_("Sonde : {n}", { n: esc(this._name(room.temp_sensor)) })}</span>` : ""}${room.temp_sensor && room.sensor_regulate ? `<span><ha-icon icon="mdi:thermometer-check"></ha-icon>${s.sensor_adjust ? esc(this._sensorTxt(s)) : _("Consigne ajustée d'après la sonde (inactif pour le moment)")}</span>` : ""}${(room.windows || []).length ? `<span><ha-icon icon="mdi:window-closed-variant"></ha-icon>${_(room.windows.length > 1 ? _("{n} ouvrants surveillés") : _("{n} ouvrant surveillé"), { n: room.windows.length })}</span>` : ""}</div>` : ""}`;
    }
    // choix du mode (null = celui de la saison)
    _modePicker(caps, cur, act) {
      if (caps.hvac.length < 2) return "";
      const season = this._cool ? "cool" : "heat";
      return `<div class="opt"><small><ha-icon icon="mdi:thermostat"></ha-icon>${_("Mode")}</small><div class="ochips">
        <button class="pchip${!cur ? " on" : ""}" data-a="${act}" data-v="">${_("Saison ({s})", { s: HVAC[season].s })}</button>
        ${caps.hvac.map((m) => `<button class="pchip${cur === m ? " on" : ""}" data-a="${act}" data-v="${m}"><ha-icon icon="${HVAC[m].i}"></ha-icon>${HVAC[m].s}</button>`).join("")}
      </div></div>`;
    }
    _optPicker(caps, cur, act) {
      return OPTS.filter((o) => caps.opts[o.k].length).map((o) => `<div class="opt"><small><ha-icon icon="${o.i}"></ha-icon>${o.l}</small><div class="ochips">
        <button class="pchip${!cur[o.k] ? " on" : ""}" data-a="${act}" data-k="${o.k}" data-v="">${_("Par défaut")}</button>
        ${caps.opts[o.k].map((v) => `<button class="pchip${cur[o.k] === v ? " on" : ""}" data-a="${act}" data-k="${o.k}" data-v="${esc(v)}">${esc(this._vl(caps, o.k, v))}</button>`).join("")}
      </div></div>`).join("");
    }
    _name(eid) { const s = this._hass.states[eid]; return (s && s.attributes.friendly_name) || eid; }

    // ---------- journée
    _dayView() {
      const room = this._room(this._view.id);
      if (!room) { this._view = { name: "home" }; return this._homeView(); }
      const e = this._edit;
      const day = this._view.day, cool = this._cool, g = this._data.global;
      const slots = e.week[day] || [];
      const sel = e.sel != null && slots[e.sel] ? e.sel : null;
      const s = sel != null ? slots[sel] : null;
      const others = this._data.rooms.filter((r) => r.id !== room.id);
      const caps = this._caps(room);
      const sNoT = s && s.hvac === "fan_only";
      return `
        <div class="nav"><button class="ibtn" data-a="back-room"><ha-icon icon="mdi:chevron-left"></ha-icon></button><b>${DAY_L[day]}<small>${esc(room.name)} · ${esc(g.profile)}</small></b><button class="pbtn sm${e.dirty ? "" : " ghost"}" data-a="save">${_("Enregistrer")}</button></div>
        <div class="daynav">${DAYS.map((d) => `<button class="dn${d === day ? " on" : ""}${JSON.stringify(e.week[d]) !== JSON.stringify(e.orig[d]) ? " mod" : ""}" data-a="goday" data-day="${d}">${DAY_S[d]}</button>`).join("")}</div>
        <div class="dbar" id="dbar">${barHTML(e.week, day, cool, { big: true, sel, label: (sg) => this._segLabel(sg, caps, cool) })}${slots.map((sl, i) => `<span class="handle${i === sel ? " on" : ""}" data-h="${i}" style="left:${(mins(sl.t) / 1440) * 100}%"><i></i><em>${sl.t}</em></span>`).join("")}</div>
        <div class="hours big"><span>0h</span><span>3h</span><span>6h</span><span>9h</span><span>12h</span><span>15h</span><span>18h</span><span>21h</span><span>24h</span></div>
        ${s ? `<div class="slot">
          <div class="snav"><button class="rbtn sm" data-a="sprev"${sel > 0 ? "" : " disabled"} title="${_("Créneau précédent (←)")}"><ha-icon icon="mdi:chevron-left"></ha-icon></button><span>${_("Créneau {i} / {n}", { i: sel + 1, n: slots.length })}<small>${esc(this._segLabel({ off: !!s.off, hvac: s.hvac, temp: s.temp, o: s.off ? null : s }, caps, cool))}</small></span><button class="rbtn sm" data-a="snext"${sel < slots.length - 1 ? "" : " disabled"} title="${_("Créneau suivant (→)")}"><ha-icon icon="mdi:chevron-right"></ha-icon></button></div>
          <div class="sf"><small>${_("Début")}</small><div class="pm"><button class="rbtn sm" data-a="st-" ><ha-icon icon="mdi:minus"></ha-icon></button><span>${s.t}</span><button class="rbtn sm" data-a="st+"><ha-icon icon="mdi:plus"></ha-icon></button></div></div>
          <div class="sf"><small>${_("Fin")}</small><div class="pm"><button class="rbtn sm" data-a="en-"${sel === slots.length - 1 && s.off ? " disabled" : ""}><ha-icon icon="mdi:minus"></ha-icon></button><span>${sel < slots.length - 1 ? slots[sel + 1].t : "24:00"}</span><button class="rbtn sm" data-a="en+"${sel < slots.length - 1 ? "" : " disabled"}><ha-icon icon="mdi:plus"></ha-icon></button></div></div>
          <div class="sf"><small>${s.off ? _("Arrêt") : sNoT ? _("Sans consigne") : _("Température")}</small><div class="pm"><button class="rbtn sm" data-a="sv-"${s.off || sNoT ? " disabled" : ""}><ha-icon icon="mdi:minus"></ha-icon></button><span style="color:${s.off || sNoT ? "inherit" : modeColor(s.hvac, s.temp, cool)}">${s.off || sNoT ? "—" : fmtT(s.temp) + "°"}</span><button class="rbtn sm" data-a="sv+"${s.off || sNoT ? " disabled" : ""}><ha-icon icon="mdi:plus"></ha-icon></button></div></div>
          ${!s.off ? `<div class="sopts">${this._modePicker(caps, s.hvac || null, "shvac")}${this._optPicker(caps, s, "sopt")}</div>` : ""}
          <div class="sa"><button class="act${s.off ? " on" : ""}" data-a="soff"><ha-icon icon="mdi:power"></ha-icon>${s.off ? _("Rallumer") : _("Arrêt")}</button><button class="act danger" data-a="sdel"><ha-icon icon="mdi:delete-outline"></ha-icon>${_("Supprimer")}</button></div>
        </div>` : `<div class="hint"><ha-icon icon="mdi:gesture-tap"></ha-icon>${_("Touchez une plage de la frise pour la régler, ou faites glisser les poignées pour changer les horaires.")}${slots.length ? `<button class="pchip" data-a="sfirst">${_("Parcourir les créneaux")}</button>` : ""}</div>`}
        <button class="add" data-a="sadd"><ha-icon icon="mdi:plus"></ha-icon>${_("Ajouter un créneau")}</button>
        <div class="sec"><ha-icon icon="mdi:content-copy"></ha-icon>${_("Copier ce jour vers")}</div>
        <div class="copy">${DAYS.filter((d) => d !== day).map((d) => `<button class="pchip" data-a="copyday" data-day="${d}">${DAY_S[d]}</button>`).join("")}<button class="pchip" data-a="copyset" data-v="week">${_("Lun → Ven")}</button><button class="pchip" data-a="copyset" data-v="weekend">${_("Week-end")}</button><button class="pchip" data-a="copyset" data-v="all">${_("Tous")}</button></div>
        ${others.length ? `<div class="sec"><ha-icon icon="mdi:home-group"></ha-icon>${_("Appliquer aussi la semaine à")}</div><div class="copy">${others.map((r) => `<button class="pchip${e.also.includes(r.id) ? " on" : ""}" data-a="also" data-id="${r.id}">${esc(r.name)}</button>`).join("")}</div>` : ""}`;
    }
    _bindDay() {
      const bar = this.shadowRoot.getElementById("dbar");
      if (!bar) return;
      bar.querySelectorAll(".handle").forEach((h) => {
        h.addEventListener("pointerdown", (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          const i = Number(h.dataset.h), day = this._view.day, slots = this._edit.week[day];
          const rect = bar.getBoundingClientRect();
          const wasSel = this._edit.sel === i;
          this._edit.sel = i;
          const x0 = ev.clientX;
          let moved = false;
          const move = (e2) => {
            if (!moved && Math.abs(e2.clientX - x0) < 3) return;
            moved = true;
            let m = Math.round((((e2.clientX - rect.left) / rect.width) * 1440) / DRAG) * DRAG;
            const lo = i > 0 ? mins(slots[i - 1].t) + GAP : 0;
            const hi = i < slots.length - 1 ? mins(slots[i + 1].t) - GAP : 1440 - GAP;
            m = Math.max(lo, Math.min(hi, m));
            if (hhmm(m) !== slots[i].t) { slots[i].t = hhmm(m); this._edit.dirty = true; this._render(); }
          };
          // suivi sur la fenêtre : la frise est redessinée pendant le glissement, la poignée d'origine disparaît
          const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); haptic(); if (!moved && !wasSel) this._render(); };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
          window.addEventListener("pointercancel", up);
        });
      });
    }

    // ---------- réglages pièce / nouvelle pièce (ha-form)
    _editView() {
      const room = this._view.id ? this._room(this._view.id) : null;
      return `
        <div class="nav"><button class="ibtn" data-a="${room ? "back-room" : "home"}"><ha-icon icon="mdi:chevron-left"></ha-icon></button><b>${room ? _("Réglages · ") + esc(room.name) : _("Nouvelle pièce")}</b><span></span></div>
        <div class="form" id="form"></div>
        <div class="fbtns"><button class="pbtn" data-a="rsave">${room ? _("Enregistrer") : _("Créer la pièce")}</button>${room ? `<button class="act danger" data-a="rdel"><ha-icon icon="mdi:delete-outline"></ha-icon>${this._confirmDel ? _("Confirmer la suppression") : _("Supprimer la pièce")}</button>` : ""}</div>`;
    }
    _settingsView() {
      return `
        <div class="nav"><button class="ibtn" data-a="home"><ha-icon icon="mdi:chevron-left"></ha-icon></button><b>${_("Réglages généraux")}</b><span></span></div>
        <div class="form" id="form"></div>
        <div class="fbtns"><button class="pbtn" data-a="ssave">${_("Enregistrer")}</button>${this._data.has_climate_scheduler ? `<button class="act" data-a="import"><ha-icon icon="mdi:import"></ha-icon>${_("Importer depuis Climate Scheduler")}</button>` : ""}</div>
        <div class="about">Climat HOLM ${esc(this._data.version)} · ${_("carte")} ${VERSION}</div>`;
    }
    _mountForm() {
      const host = this.shadowRoot.getElementById("form");
      if (!host) return;
      const f = document.createElement("ha-form");
      f.hass = this._hass;
      if (this._view.name === "settings") {
        const s = this._data.settings;
        f.schema = [
          { type: "grid", name: "", schema: [
            { name: "boost_temp", selector: { number: { min: 10, max: 30, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
            { name: "boost_minutes", selector: { number: { min: 10, max: 480, step: 10, mode: "box", unit_of_measurement: "min" } } },
          ] },
          { type: "grid", name: "", schema: [
            { name: "away_temp", selector: { number: { min: 5, max: 25, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
            { name: "manual_temp", selector: { number: { min: 5, max: 30, step: 0.5, mode: "box", unit_of_measurement: "°C" } } },
          ] },
          { name: "window_delay", selector: { number: { min: 0, max: 1800, step: 10, mode: "box", unit_of_measurement: "s" } } },
          { name: "cool_away_off", selector: { boolean: {} } },
        ];
        f.data = { ...s };
        const L = { boost_temp: _("Température du boost"), boost_minutes: _("Durée du boost"), away_temp: _("Température en absence"), manual_temp: _("Mode manuel (par défaut)"), window_delay: _("Délai avant arrêt si fenêtre ouverte"), cool_away_off: _("Arrêter la clim pendant une absence") };
        f.computeLabel = (x) => L[x.name] || x.name;
      } else {
        const room = this._view.id ? this._room(this._view.id) : null;
        const cl = (room && room.climates) || [];
        const caps = this._caps({ climates: cl });
        const optF = OPTS.filter((o) => caps.opts[o.k].length).map((o) => ({ name: "opt_" + o.k, selector: { select: { mode: "dropdown", options: [{ value: "", label: _("Ne pas changer") }, ...caps.opts[o.k].map((v) => ({ value: v, label: this._vl(caps, o.k, v) }))] } } }));
        f.schema = [
          { type: "grid", name: "", schema: [{ name: "name", required: true, selector: { text: {} } }, { name: "icon", selector: { icon: {} } }] },
          { name: "climates", required: true, selector: { entity: { multiple: true, filter: { domain: "climate" } } } },
          { name: "temp_sensor", selector: { entity: { filter: { domain: "sensor", device_class: "temperature" } } } },
          { name: "sensor_regulate", selector: { boolean: {} } },
          { name: "windows", selector: { entity: { multiple: true, filter: { domain: "binary_sensor" } } } },
          ...(optF.length ? [{ type: "expandable", name: "", flatten: true, title: _("Réglages par défaut des appareils"), icon: "mdi:tune-variant", expanded: true, schema: optF }] : []),
        ];
        f.data = room ? { name: room.name, icon: room.icon, climates: room.climates, temp_sensor: room.temp_sensor || "", sensor_regulate: !!room.sensor_regulate, windows: room.windows || [], ...Object.fromEntries(OPTS.map((o) => ["opt_" + o.k, (room.opts || {})[o.k] || ""])) } : { name: "", icon: "mdi:radiator", climates: [], windows: [] };
        const L = { name: _("Nom de la pièce"), icon: _("Icône"), climates: _("Appareils (radiateurs, clims…)"), temp_sensor: _("Sonde de température (facultatif)"), sensor_regulate: _("Ajuster la consigne des appareils d'après la sonde"), windows: _("Fenêtres / portes : arrêt si ouvert (facultatif)"), ...Object.fromEntries(OPTS.map((o) => ["opt_" + o.k, o.l])) };
        f.computeLabel = (x) => L[x.name] || x.name;
        f.computeHelper = (x) => (x.name === "sensor_regulate" ? _("Corrige l'écart entre la sonde et le thermomètre de l'appareil (clim, radiateur) : consigne envoyée = consigne + (température de l'appareil − température de la sonde), au plus ±3°, revue au plus toutes les 10 minutes. Pas en mode Manuel ; sans sonde disponible, consigne normale.") : undefined);
      }
      this._form = { ...f.data };
      f.addEventListener("value-changed", (ev) => { this._form = ev.detail.value; f.data = ev.detail.value; });
      host.appendChild(f);
    }

    // ------------------------------------------------------------------ interactions
    async _click(e) {
      const b = e.target.closest("[data-a]");
      if (!b || b.disabled) {
        const seg = e.target.closest(".dbar .seg");
        if (seg && this._view.name === "day") { const i = Number(seg.dataset.idx); if (i >= 0) { this._edit.sel = i; haptic(); this._render(); } else this._toast(_("Cette plage vient de la veille : ajoutez un créneau à 00:00 pour la modifier.")); }
        return;
      }
      const a = b.dataset.a, d = this._data, g = d && d.global;
      const room = this._view.id ? this._room(this._view.id) : null;
      haptic();
      switch (a) {
        case "home": this._view = { name: "home" }; this._confirmDel = false; return this._render();
        case "settings": this._view = { name: "settings" }; return this._render();
        case "dc-open": { const st = this._dcState(); st.open = !st.open; lsSet("holm-climat-dc-open", st.open); return this._render(); }
        case "dc-room": { const st = this._dcState(), id = b.dataset.id; st.hidden = st.hidden.includes(id) ? st.hidden.filter((x) => x !== id) : [...st.hidden, id]; lsSet("holm-climat-dc-hidden", st.hidden); return this._render(); }
        case "dc-all": { const st = this._dcState(); st.hidden = []; lsSet("holm-climat-dc-hidden", []); return this._render(); }
        case "dc-real": { const st = this._dcState(); st.real = !st.real; lsSet("holm-climat-dc-real", st.real); return this._render(); }
        case "room": this._view = { name: "room", id: b.dataset.id }; return this._render();
        case "edit": this._view = { name: "edit", id: room.id }; this._confirmDel = false; return this._render();
        case "new": this._view = { name: "edit" }; return this._render();
        case "back-room":
          if (this._view.name === "day" && this._edit && this._edit.dirty && !this._leaveOk) { this._leaveOk = true; return this._toast(_("Modifications non enregistrées : touchez encore ‹ pour les abandonner")); }
          this._leaveOk = false; this._view = { name: "room", id: this._view.id }; return this._render();
        case "running": return this._ws({ type: "climat_holm/global", running: !g.running }, g.running ? _("Programmation en pause") : _("Programmation activée"));
        case "season": return this._ws({ type: "climat_holm/global", season: b.dataset.v });
        case "away": return this._ws({ type: "climat_holm/global", away: !g.away }, g.away ? _("Retour à la maison") : _("Mode absence activé"));
        case "alloff": return this._ws({ type: "climat_holm/global", all_off: !g.all_off }, g.all_off ? _("Chauffage relancé") : _("Tout est arrêté"));
        case "profile": this._pmenu = false; return this._ws({ type: "climat_holm/global", profile: b.dataset.v }, _("Profil {p}", { p: b.dataset.v }));
        case "padd": this._pedit = { op: "add" }; this._pmenu = false; this._render(); return this.shadowRoot.getElementById("pname").focus();
        case "pmenu": this._pmenu = !this._pmenu; return this._render();
        case "prename": this._pedit = { op: "rename", name: g.profile }; this._pmenu = false; this._render(); return this.shadowRoot.getElementById("pname").focus();
        case "pdelete": this._pmenu = false; return this._ws({ type: "climat_holm/profile", op: "delete", name: g.profile }, _("Profil supprimé")).then(() => this._resub());
        case "pcancel": this._pedit = null; return this._render();
        case "pok": {
          const v = (this.shadowRoot.getElementById("pname").value || "").trim();
          if (!v) return;
          const pe = this._pedit; this._pedit = null;
          const msg = pe.op === "add" ? { type: "climat_holm/profile", op: "add", name: v } : { type: "climat_holm/profile", op: "rename", name: pe.name, new_name: v };
          return this._ws(msg, pe.op === "add" ? _("Profil « {p} » créé (copie de {q})", { p: v, q: g.profile }) : _("Profil renommé")).then(() => this._resub());
        }
        case "import": return this._ws({ type: "climat_holm/import_climate_scheduler" }).then((r) => { this._toast(r && r.imported ? _("{n} pièce(s) importée(s)", { n: r.imported }) : _("Rien de nouveau à importer")); this._resub(); });
        // pièce
        case "mode": return this._ws({ type: "climat_holm/action", room_id: room.id, action: "mode", mode: b.dataset.v });
        case "tminus": case "tplus": {
          const s = room.state;
          const base = room.mode === "manual" ? room.manual_temp : s.temp != null ? s.temp : (s.slot_temp ?? d.settings.comfort_temp);
          const t = Math.round((Number(base) + (a === "tplus" ? 0.5 : -0.5)) * 2) / 2;
          this._pendingT = t;
          clearTimeout(this._tT);
          this.shadowRoot.querySelector(".setp .big").textContent = fmtT(t) + "°";
          this._tT = setTimeout(() => this._ws({ type: "climat_holm/action", room_id: room.id, action: "temp", temp: t }, room.mode === "manual" ? null : _("Consigne modifiée jusqu'au prochain créneau")), 700);
          room.state = { ...s, temp: t };
          if (room.mode === "manual") room.manual_temp = t;
          return;
        }
        case "boost": return this._ws({ type: "climat_holm/action", room_id: room.id, action: "boost" }, _("Boost lancé"));
        case "next": return this._ws({ type: "climat_holm/action", room_id: room.id, action: "next_slot" }, _("Créneau suivant appliqué"));
        case "cancel": return this._ws({ type: "climat_holm/action", room_id: room.id, action: "cancel" }, _("Retour au planning"));
        case "day": {
          const week = clone(this._week(room));
          DAYS.forEach((x) => (week[x] = week[x] || []));
          this._edit = { week, orig: clone(week), sel: null, dirty: false, also: [] };
          this._view = { name: "day", id: room.id, day: b.dataset.day };
          return this._render();
        }
        // journée
        case "goday": this._view.day = b.dataset.day; this._edit.sel = null; return this._render();
        case "st-": case "st+": case "en-": case "en+": case "sv-": case "sv+": case "soff": case "sdel": return this._slotEdit(a);
        case "sprev": return this._slotNav(-1);
        case "snext": return this._slotNav(1);
        case "sfirst": return this._slotNav(1);
        case "shvac": case "sopt": return this._slotEdit(a, b.dataset.k, b.dataset.v);
        case "mhvac": return this._ws({ type: "climat_holm/action", room_id: room.id, action: "manual_opts", hvac: b.dataset.v || null });
        case "mopt": return this._ws({ type: "climat_holm/action", room_id: room.id, action: "manual_opts", opts: { ...(room.manual_opts || {}), [b.dataset.k]: b.dataset.v || null } });
        case "sadd": return this._slotAdd();
        case "copyday": case "copyset": {
          const src = clone(this._edit.week[this._view.day]);
          const targets = a === "copyday" ? [b.dataset.day] : b.dataset.v === "week" ? DAYS.slice(0, 5) : b.dataset.v === "weekend" ? ["sat", "sun"] : DAYS;
          targets.filter((x) => x !== this._view.day).forEach((x) => (this._edit.week[x] = clone(src)));
          this._edit.dirty = true;
          this._toast(_("Copié vers {d}", { d: targets.filter((x) => x !== this._view.day).map((x) => DAY_S[x]).join(", ") }));
          return this._render();
        }
        case "also": { const id = b.dataset.id, al = this._edit.also; al.includes(id) ? al.splice(al.indexOf(id), 1) : al.push(id); this._edit.dirty = true; return this._render(); }
        case "save": {
          await this._ws({ type: "climat_holm/schedule", room_id: room.id, days: this._edit.week, apply_to: this._edit.also }, this._edit.also.length ? _(this._edit.also.length > 1 ? _("Planning enregistré (+ {n} pièces)") : _("Planning enregistré (+ {n} pièce)"), { n: this._edit.also.length }) : _("Planning enregistré"));
          this._edit.orig = clone(this._edit.week); this._edit.dirty = false; this._leaveOk = false;
          return this._render();
        }
        // formulaires
        case "rsave": {
          const f = this._form || {};
          if (!f.name || !(f.climates || []).length) return this._toast(_("Indiquez un nom et au moins un appareil"), true);
          const payload = { name: f.name, icon: f.icon || "mdi:radiator", climates: f.climates, temp_sensor: f.temp_sensor || null, sensor_regulate: !!(f.temp_sensor && f.sensor_regulate), windows: f.windows || [], opts: Object.fromEntries(OPTS.map((o) => [o.k, f["opt_" + o.k] || null]).filter(([, v]) => v)) };
          if (this._view.id) payload.id = this._view.id;
          const r = await this._ws({ type: "climat_holm/room/save", room: payload }, this._view.id ? _("Pièce enregistrée") : _("Pièce créée"));
          this._resub();
          this._view = { name: "room", id: (r && r.id) || this._view.id };
          return this._render();
        }
        case "rdel":
          if (!this._confirmDel) { this._confirmDel = true; return this._render(); }
          this._confirmDel = false;
          await this._ws({ type: "climat_holm/room/delete", room_id: room.id }, _("Pièce supprimée"));
          this._view = { name: "home" };
          return this._render();
        case "ssave": return this._ws({ type: "climat_holm/settings", settings: this._form || {} }, _("Réglages enregistrés"));
      }
    }
    _resub() { setTimeout(() => { if (this._unsub) { this._unsub(); this._unsub = null; } this._subscribe(); this._load(); }, 1500); }

    _slotEdit(a, k, v) {
      const e = this._edit, slots = e.week[this._view.day], i = e.sel;
      if (i == null || !slots[i]) return;
      const s = slots[i];
      const step = (m, up) => (up ? Math.floor(m / SNAP) * SNAP + SNAP : Math.ceil(m / SNAP) * SNAP - SNAP); // cale sur le quart d'heure
      if (a === "st-" || a === "st+") {
        const lo = i > 0 ? mins(slots[i - 1].t) + GAP : 0, hi = i < slots.length - 1 ? mins(slots[i + 1].t) - GAP : 1440 - GAP;
        const m = Math.max(lo, Math.min(hi, step(mins(s.t), a === "st+")));
        if (hhmm(m) === s.t) return;
        s.t = hhmm(m);
      } else if (a === "en-" || a === "en+") {
        const nx = slots[i + 1];
        if (!nx) {
          // dernier créneau de la journée : « − » ajoute un arrêt avant minuit
          if (a === "en+" || s.off) return;
          const m = step(1440, false);
          if (m - mins(s.t) < GAP) return;
          slots.push({ t: hhmm(m), off: true });
        } else {
          const lo = mins(s.t) + GAP, hi = slots[i + 2] ? mins(slots[i + 2].t) - GAP : 1440 - GAP;
          const m = Math.max(lo, Math.min(hi, step(mins(nx.t), a === "en+")));
          if (hhmm(m) === nx.t) return;
          nx.t = hhmm(m);
        }
      } else if (a === "sv-" || a === "sv+") {
        s.temp = Math.max(5, Math.min(30, Math.round(((s.temp ?? 19) + (a === "sv+" ? 0.5 : -0.5)) * 2) / 2));
      } else if (a === "shvac") {
        if (v) s.hvac = v; else delete s.hvac;
        if (v !== "fan_only" && s.temp == null) s.temp = s._t || this._data.settings.comfort_temp || 19.5;
      } else if (a === "sopt") {
        if (v) s[k] = v; else delete s[k];
      } else if (a === "soff") {
        const keep = ["hvac", ...OPTS.map((o) => o.k)];
        if (s.off) { delete s.off; s.temp = s._t || this._data.settings.comfort_temp || 19.5; Object.assign(s, s._o || {}); delete s._o; }
        else { s._t = s.temp; s._o = Object.fromEntries(keep.filter((x) => s[x]).map((x) => [x, s[x]])); keep.forEach((x) => delete s[x]); s.off = true; delete s.temp; }
      } else if (a === "sdel") {
        slots.splice(i, 1);
        e.sel = null;
      }
      e.dirty = true;
      this._render();
    }
    _slotNav(d) {
      const e = this._edit, slots = e.week[this._view.day] || [];
      if (!slots.length) return;
      const i = e.sel == null ? (d > 0 ? 0 : slots.length - 1) : Math.max(0, Math.min(slots.length - 1, e.sel + d));
      if (i === e.sel) return;
      e.sel = i;
      haptic();
      this._render();
    }
    // libellé d'une plage dans la frise : mode, consigne et options (« Ventil. · Vitesse 1 · Balayage »)
    _segLabel(sg, caps, cool) {
      if (sg.off) return _("Arrêt");
      const hv = sg.hvac;
      let base = hv === "fan_only" ? _("Ventil.") : (hv && HVAC[hv] && hv !== (cool ? "cool" : "heat") ? HVAC[hv].s + " " : "") + (sg.temp != null ? fmtT(sg.temp) + "°" : "");
      const extra = sg.o ? OPTS.filter((o) => sg.o[o.k]).map((o) => this._vl(caps, o.k, sg.o[o.k])) : [];
      return [base.trim(), ...extra].filter(Boolean).join(" · ");
    }
    _slotAdd() {
      const e = this._edit, day = this._view.day, slots = e.week[day];
      const segs = segments(e.week, day);
      // on coupe la plus longue plage (ou la plage sélectionnée) en son milieu
      let seg = e.sel != null ? segs.find((s) => s.idx === e.sel) : null;
      if (!seg) seg = segs.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
      const mid = Math.round((seg.from + (seg.to - seg.from) / 2) / SNAP) * SNAP;
      if (seg.to - seg.from < SNAP * 2 || slots.some((s) => mins(s.t) === mid)) return this._toast(_("Plus de place ici : raccourcissez d'abord une plage"), true);
      const ns = seg.off ? { t: hhmm(mid), temp: this._data.settings.comfort_temp || 19.5 } : { t: hhmm(mid), off: true };
      slots.push(ns);
      slots.sort((a, b) => mins(a.t) - mins(b.t));
      e.sel = slots.indexOf(ns);
      e.dirty = true;
      this._render();
    }
    _toast(msg, bad) {
      const t = this.shadowRoot && this.shadowRoot.getElementById("toast");
      if (!t) return;
      t.textContent = _(msg);
      t.classList.toggle("bad", !!bad);
      t.classList.add("show");
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove("show"), 2600);
    }

    // ------------------------------------------------------------------ styles
    static css() {
      return `
      :host { display: block; }
      ha-card { display: block; position: relative; overflow: hidden; padding: 14px; border-radius: var(--ha-card-border-radius, 22px);
        --ink: 255,255,255; --tx: #e8f1f5; --tx2: rgba(222,236,242,.62); --hi: #fff; --acc: 249,115,22;
        background: linear-gradient(160deg, rgba(22,30,40,.94), rgba(10,15,22,.97)); color: var(--tx);
        border: 1px solid rgba(var(--ink), .08); box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(var(--ink), .05); }
      :host([data-tone="light"]) ha-card { --ink: 15,23,42; --tx: #0f172a; --tx2: rgba(15,23,42,.6); --hi: #0f172a;
        background: linear-gradient(160deg, rgba(255,255,255,.97), rgba(241,245,249,.98)); box-shadow: 0 10px 30px rgba(15,23,42,.1); }
      :host([data-tone="theme"]) ha-card { --tx: var(--primary-text-color); --tx2: var(--secondary-text-color); --hi: var(--primary-text-color); background: var(--ha-card-background, var(--card-background-color)); }
      .glow { position: absolute; inset: -40% -20% auto auto; width: 70%; height: 70%; pointer-events: none; background: radial-gradient(closest-side, rgba(var(--acc), .16), transparent); filter: blur(10px); }
      button { font: inherit; color: inherit; border: 0; background: none; padding: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
      button:disabled { opacity: .35; cursor: default; }
      .view { position: relative; display: flex; flex-direction: column; gap: 12px; }
      .view.in { animation: vin .35s cubic-bezier(.3,1.2,.5,1); }
      @keyframes vin { from { opacity: 0; transform: translateX(14px); } }
      .load { display: flex; gap: 6px; justify-content: center; padding: 40px; }
      .load span { width: 8px; height: 8px; border-radius: 50%; background: rgb(var(--acc)); animation: ld 1s ease-in-out infinite; }
      .load span:nth-child(2) { animation-delay: .15s; } .load span:nth-child(3) { animation-delay: .3s; }
      @keyframes ld { 50% { transform: translateY(-6px); opacity: .4; } }
      .empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 10px; text-align: center; color: var(--tx2); }
      .empty ha-icon { --mdc-icon-size: 40px; opacity: .6; }
      .empty b { color: var(--tx); }
      /* en-tête */
      .hd { display: flex; align-items: center; gap: 12px; }
      .hic { flex: 0 0 44px; height: 44px; border-radius: 15px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #fb923c, #ef4444); box-shadow: 0 6px 18px -6px rgba(239,68,68,.7); }
      .hic.cool { background: linear-gradient(135deg, #38bdf8, #6366f1); box-shadow: 0 6px 18px -6px rgba(56,189,248,.7); }
      .hic.live ha-icon { animation: flick 1.6s ease-in-out infinite; }
      @keyframes flick { 0%,100% { transform: scale(1) rotate(0); } 30% { transform: scale(1.12) rotate(-5deg); } 60% { transform: scale(.95) rotate(4deg); } }
      .ht { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .ht b { font-size: 18px; font-weight: 800; letter-spacing: -.01em; }
      .ht small { font-size: 12px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ibtn { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: var(--tx2); background: rgba(var(--ink), .06); transition: background .2s; }
      .ibtn:hover { background: rgba(var(--ink), .12); }
      .tgl { flex: none; position: relative; width: 50px; height: 28px; border-radius: 14px; background: rgba(var(--ink), .14); transition: background .3s; }
      .tgl i { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.35); transition: transform .35s cubic-bezier(.3,1.5,.5,1); }
      .tgl.on { background: linear-gradient(90deg, #22c55e, #16a34a); } .tgl.on i { transform: translateX(22px); }
      .chips, .profiles, .copy, .acts { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .profiles > ha-icon { --mdc-icon-size: 18px; color: var(--tx2); }
      .seg2, .seg3 { display: flex; padding: 3px; border-radius: 14px; background: rgba(var(--ink), .06); box-shadow: inset 0 0 0 1px rgba(var(--ink), .06); }
      .seg3 { display: grid; grid-template-columns: repeat(3, 1fr); }
      .seg2 button, .seg3 button { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 11px; border-radius: 11px; font-size: 12.5px; font-weight: 700; color: var(--tx2); transition: background .3s, color .3s; }
      .seg2 ha-icon, .seg3 ha-icon, .chip ha-icon, .act ha-icon, .add ha-icon { --mdc-icon-size: 17px; }
      .seg2 button.on.heat { color: #fff; background: linear-gradient(135deg, #fb923c, #ef4444); }
      .seg2 button.on.cool { color: #fff; background: linear-gradient(135deg, #38bdf8, #6366f1); }
      .seg3 button.on { color: #fff; background: rgb(var(--acc)); box-shadow: 0 4px 14px -6px rgb(var(--acc)); }
      .chip, .act { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 12px; font-size: 12.5px; font-weight: 700; background: rgba(var(--ink), .06); box-shadow: inset 0 0 0 1px rgba(var(--ink), .07); transition: background .25s, transform .15s; }
      .chip:active, .act:active, .tile:active { transform: scale(.96); }
      .chip.on.warn { color: #fff; background: #f59e0b; } .chip.on.bad, .act.danger { color: #fff; background: #ef4444; box-shadow: none; }
      .act.on.hot { color: #fff; background: linear-gradient(135deg, #fb923c, #ef4444); }
      .act.on { color: #fff; background: #64748b; }
      .pchip { padding: 6px 12px; border-radius: 20px; font-size: 12.5px; font-weight: 700; color: var(--tx2); background: rgba(var(--ink), .05); box-shadow: inset 0 0 0 1px rgba(var(--ink), .08); transition: all .25s; }
      .pchip.on { color: #fff; background: rgb(var(--acc)); box-shadow: 0 4px 12px -5px rgb(var(--acc)); }
      .pchip.add { padding: 5px 8px; display: grid; place-items: center; } .pchip.add ha-icon { --mdc-icon-size: 16px; }
      .pin { display: inline-flex; align-items: center; gap: 4px; }
      .pin input { width: 130px; padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(var(--acc), .6); background: rgba(var(--ink), .06); color: var(--tx); font: inherit; font-size: 13px; outline: none; }
      .mini { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; background: rgba(var(--ink), .08); }
      .mini ha-icon { --mdc-icon-size: 16px; } .mini.txt { width: auto; padding: 0 10px; font-size: 12px; font-weight: 700; } .mini.danger { color: #ef4444; }
      .pmenu { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-radius: 12px; background: rgba(var(--ink), .05); font-size: 12.5px; color: var(--tx2); animation: vin .25s; }
      .pmenu span { flex: 1; }
      /* tuiles */
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 10px; }
      .dch { margin-top: 12px; border-radius: 18px; background: rgba(var(--ink), .04); box-shadow: inset 0 0 0 1px rgba(var(--ink), .07); overflow: hidden; }
      .dch-h { width: 100%; display: flex; align-items: center; gap: 8px; padding: 11px 14px; color: var(--tx); text-align: left; }
      .dch-h > ha-icon { --mdc-icon-size: 18px; color: var(--tx2); } .dch-h b { font-size: 13.5px; } .dch-h small { flex: 1; font-size: 12px; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dch-h .chev { transition: transform .25s; } .dch-h .chev.up { transform: rotate(180deg); }
      .dcb { padding: 2px 14px 12px 40px; }
      .plot { position: relative; height: 170px; touch-action: pan-y; cursor: crosshair; }
      .plot svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
      .plot .sp { fill: none; stroke: var(--lc); stroke-width: 2.6; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
      .plot .rp { fill: none; stroke: var(--lc); stroke-width: 1.5; stroke-dasharray: 2 4; opacity: .75; vector-effect: non-scaling-stroke; }
      .gy { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(var(--ink), .09); }
      .gy em { position: absolute; right: calc(100% + 6px); top: -7px; font-style: normal; font-size: 10.5px; color: var(--tx2); white-space: nowrap; }
      .dnow { position: absolute; top: -4px; bottom: 0; width: 2px; margin-left: -1px; border-radius: 2px; background: rgb(var(--acc)); box-shadow: 0 0 8px rgba(var(--acc), .7); }
      .plot.hov::after { content: ""; position: absolute; top: 0; bottom: 0; left: var(--hx); border-left: 1px solid rgba(var(--ink), .35); pointer-events: none; }
      .dtip { position: absolute; top: 4px; z-index: 3; min-width: 150px; padding: 8px 10px; border-radius: 12px; background: rgba(12,18,26,.94); color: #e8f1f5; font-size: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.35); pointer-events: none; }
      :host([data-tone="light"]) .dtip { background: rgba(255,255,255,.97); color: #0f172a; }
      .dtip .th { font-weight: 800; margin-bottom: 4px; } .dtip div:not(.th) { display: flex; align-items: center; gap: 6px; line-height: 1.6; }
      .dtip i { width: 8px; height: 8px; border-radius: 50%; flex: none; } .dtip span { flex: 1; } .dtip b { font-variant-numeric: tabular-nums; } .dtip small { opacity: .65; min-width: 34px; text-align: right; }
      .dhours { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--tx2); margin-top: 4px; }
      .dleg { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0 -26px; }
      .dl { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 16px; font-size: 12px; font-weight: 700; color: var(--tx); background: rgba(var(--ink), .06); transition: opacity .2s; user-select: none; }
      .dl i { width: 9px; height: 9px; border-radius: 50%; } .dl.off { opacity: .4; } .dl.off i { background: transparent !important; box-shadow: inset 0 0 0 1.5px var(--tx2); }
      .dl small { font-weight: 600; color: var(--tx2); } .dl.all { color: var(--tx2); } .dl.real { margin-left: auto; color: var(--tx2); } .dl.real.on { color: var(--tx); box-shadow: inset 0 0 0 1px rgba(var(--ink), .25); } .dl ha-icon { --mdc-icon-size: 14px; }
      .dnote { margin: 8px 0 0 -26px; font-size: 11px; color: var(--tx2); }
      @media (max-width: 500px) { .dcb { padding-left: 34px; padding-right: 10px; } .plot { height: 150px; } .dl.real { margin-left: 0; } }
      .tile { --tc: rgb(148,163,184); position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 18px; text-align: left;
        background: linear-gradient(160deg, rgba(var(--ink), .07), rgba(var(--ink), .025)); box-shadow: inset 0 0 0 1px rgba(var(--ink), .07); transition: transform .2s, box-shadow .3s; }
      .anim .tile { animation: tin .45s cubic-bezier(.3,1.3,.5,1) backwards; animation-delay: calc(var(--i) * 45ms); }
      @keyframes tin { from { opacity: 0; transform: translateY(10px) scale(.97); } }
      .tile::before { content: ""; position: absolute; inset: auto -30% -60% auto; width: 90%; height: 90%; border-radius: 50%; background: radial-gradient(closest-side, var(--tc), transparent); opacity: .16; transition: opacity .5s; pointer-events: none; }
      .tile.heating::before, .tile.cooling::before { opacity: .45; animation: breathe 2.8s ease-in-out infinite; }
      @keyframes breathe { 50% { transform: scale(1.18); opacity: .28; } }
      .tile.heating, .tile.cooling { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tc) 50%, transparent), 0 6px 20px -10px var(--tc); }
      .tt { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; }
      .tt > ha-icon { --mdc-icon-size: 18px; color: var(--tc); } .tt span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tt .fx { --mdc-icon-size: 18px; color: var(--tc); animation: flick 1.4s ease-in-out infinite; }
      .cooling .tt .fx { animation: spin 6s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .tv { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
      .cur { font-size: 30px; font-weight: 900; letter-spacing: -.03em; line-height: 1; color: var(--hi); font-variant-numeric: tabular-nums; }
      .cur small { font-size: .55em; font-weight: 700; opacity: .7; }
      .tgt { display: inline-flex; align-items: center; gap: 1px; padding: 2px 8px 2px 4px; border-radius: 10px; font-size: 13px; font-weight: 800; color: #fff; background: var(--tc); box-shadow: 0 3px 10px -4px var(--tc); min-width: 0; max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .tgt ha-icon { --mdc-icon-size: 16px; } .tgt.off { background: rgba(var(--ink), .12); color: var(--tx2); box-shadow: none; gap: 4px; padding-left: 7px; } .tgt.off ha-icon { --mdc-icon-size: 13px; }
      .ts { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--tx2); min-width: 0; }
      .ts ha-icon { --mdc-icon-size: 14px; flex: none; } .ts span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ts.hot { color: #fb923c; } .ts.warn { color: #f59e0b; } .ts.mute { opacity: .8; }
      /* frises */
      .bar { position: relative; height: 8px; border-radius: 5px; background: rgba(var(--ink), .07); overflow: hidden; }
      .seg { position: absolute; top: 0; bottom: 0; background: var(--sc); opacity: .9; transform-origin: left; }
      .anim .seg, .dbar .seg { animation: grow .6s cubic-bezier(.3,1,.4,1) backwards; animation-delay: var(--d); }
      @keyframes grow { from { transform: scaleX(0); } }
      .seg.off { background: repeating-linear-gradient(135deg, rgba(var(--ink), .08) 0 4px, transparent 4px 8px); }
      .now { position: absolute; top: -2px; bottom: -2px; width: 2px; margin-left: -1px; background: var(--hi); box-shadow: 0 0 6px var(--hi); border-radius: 2px; }
      .bar.big { height: 54px; border-radius: 14px; overflow: visible; }
      .bar.big .seg { display: grid; place-items: center; border-right: 1px solid rgba(0,0,0,.18); cursor: pointer; transition: filter .2s, box-shadow .2s; }
      .bar.big .seg:first-child { border-radius: 14px 0 0 14px; } .bar.big .seg:last-child { border-radius: 0 14px 14px 0; border-right: 0; }
      .bar.big .seg b { font-size: 11.5px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; padding: 0 5px; box-sizing: border-box; }
      .bar.big .seg.off b { color: var(--tx2); text-shadow: none; }
      .bar.big .seg.sel { box-shadow: inset 0 0 0 3px var(--hi); z-index: 1; }
      /* pièce */
      .nav { display: flex; align-items: center; gap: 10px; }
      .nav b { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; }
      .nav b ha-icon { --mdc-icon-size: 20px; color: rgb(var(--acc)); }
      .nav b small { font-size: 12px; font-weight: 600; color: var(--tx2); margin-left: 4px; }
      .thermo { --tc: rgb(148,163,184); display: grid; grid-template-columns: 140px 1fr; gap: 14px; align-items: center; padding: 12px; border-radius: 20px; background: linear-gradient(135deg, color-mix(in srgb, var(--tc) 16%, transparent), rgba(var(--ink), .03)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tc) 30%, transparent); }
      .ring { position: relative; width: 140px; height: 140px; }
      .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
      .ring circle { fill: none; stroke-width: 9; stroke-linecap: round; }
      .rt { stroke: rgba(var(--ink), .08); } .rv { stroke: var(--tc); transition: stroke-dasharray 1s cubic-bezier(.3,1,.4,1); filter: drop-shadow(0 0 6px var(--tc)); }
      .thermo.heating .rv, .thermo.cooling .rv { animation: pulse 2s ease-in-out infinite; }
      @keyframes pulse { 50% { opacity: .6; } }
      .rc { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .rc small { font-size: 11px; color: var(--tx2); } .rc span { font-size: 32px; font-weight: 900; letter-spacing: -.03em; color: var(--hi); font-variant-numeric: tabular-nums; }
      .rc em { display: flex; align-items: center; gap: 2px; font-style: normal; font-size: 11px; font-weight: 800; color: var(--tc); } .rc em ha-icon { --mdc-icon-size: 14px; animation: flick 1.4s infinite; }
      .setp { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .setp > small, .sf small { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--tx2); }
      .pm { display: flex; align-items: center; gap: 10px; }
      .pm .big { min-width: 86px; text-align: center; font-size: 30px; font-weight: 900; letter-spacing: -.02em; color: var(--hi); font-variant-numeric: tabular-nums; }
      .rbtn { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: rgba(var(--ink), .08); box-shadow: inset 0 0 0 1px rgba(var(--ink), .1); transition: transform .15s, background .2s; }
      .rbtn:active { transform: scale(.88); background: rgba(var(--acc), .3); } .rbtn.sm { width: 34px; height: 34px; }
      .sec { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--tx2); }
      .sec ha-icon { --mdc-icon-size: 16px; color: rgb(var(--acc)); } .sec small { margin-left: auto; font-size: 10.5px; font-weight: 600; text-transform: none; letter-spacing: 0; opacity: .8; }
      .week { display: flex; flex-direction: column; gap: 4px; }
      .wrow { display: grid; grid-template-columns: 36px 1fr 18px; align-items: center; gap: 8px; padding: 6px 6px 6px 8px; border-radius: 12px; transition: background .2s; }
      .wrow:hover { background: rgba(var(--ink), .05); }
      .anim .wrow { animation: tin .4s cubic-bezier(.3,1.3,.5,1) backwards; animation-delay: calc(var(--i) * 35ms); }
      .wrow span { font-size: 12.5px; font-weight: 800; color: var(--tx2); } .wrow.today span { color: rgb(var(--acc)); }
      .wrow.today { background: rgba(var(--acc), .08); } .wrow ha-icon { --mdc-icon-size: 16px; color: var(--tx2); }
      .wrow .bar { height: 12px; }
      .hours { display: flex; justify-content: space-between; padding: 0 26px 0 52px; font-size: 10px; color: var(--tx2); }
      .hours.big { padding: 0 2px; margin-top: -6px; }
      .meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 11.5px; color: var(--tx2); } .meta span { display: flex; align-items: center; gap: 4px; } .meta ha-icon { --mdc-icon-size: 14px; }
      /* journée */
      .daynav { display: flex; gap: 4px; }
      .dn { flex: 1; padding: 7px 0; border-radius: 10px; font-size: 12px; font-weight: 800; color: var(--tx2); background: rgba(var(--ink), .05); position: relative; }
      .dn.on { color: #fff; background: rgb(var(--acc)); } .dn.mod::after { content: ""; position: absolute; top: 4px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; }
      .dbar { position: relative; margin: 26px 0 4px; touch-action: none; }
      .handle { position: absolute; top: -24px; bottom: -4px; width: 18px; margin-left: -9px; display: flex; flex-direction: column; align-items: center; cursor: ew-resize; z-index: 2; touch-action: none; }
      .handle em { order: -1; font-style: normal; font-size: 10.5px; font-weight: 800; padding: 1px 5px; border-radius: 6px; background: rgba(var(--ink), .12); color: var(--tx); white-space: nowrap; }
      .handle i { flex: 1; width: 4px; border-radius: 2px; background: var(--hi); box-shadow: 0 0 0 2px rgba(0,0,0,.25); opacity: .85; }
      .handle.on em { background: rgb(var(--acc)); color: #fff; } .handle.on i { background: rgb(var(--acc)); }
      .sopts { grid-column: 1 / -1; display: grid; gap: 8px; }
      .opt { display: grid; gap: 6px; margin: 2px 0 6px; }
      .opt > small { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--tx2); }
      .opt > small ha-icon { --mdc-icon-size: 15px; }
      .ochips { display: flex; flex-wrap: wrap; gap: 6px; }
      .ochips .pchip { display: inline-flex; align-items: center; }
      .ochips .pchip ha-icon { --mdc-icon-size: 15px; margin-right: 4px; }
      .snav { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; }
      .snav span { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; font-size: 12.5px; font-weight: 800; }
      .snav span small { font-size: 11.5px; font-weight: 600; color: var(--tx2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
      .hint .pchip { margin-left: auto; flex: none; }
      .slot { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; padding: 12px; border-radius: 16px; background: rgba(var(--ink), .05); box-shadow: inset 0 0 0 1px rgba(var(--ink), .07); animation: vin .3s; }
      .sf { display: flex; flex-direction: column; gap: 6px; } .sf .pm span { min-width: 58px; text-align: center; font-size: 20px; font-weight: 900; font-variant-numeric: tabular-nums; }
      .sa { grid-column: 1 / -1; display: flex; gap: 8px; }
      .hint { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 14px; font-size: 12px; color: var(--tx2); background: rgba(var(--ink), .04); }
      .hint ha-icon { --mdc-icon-size: 20px; color: rgb(var(--acc)); flex: none; }
      .copy .pchip.on { color: #fff; background: #6366f1; }
      /* boutons */
      .add { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 14px; font-size: 13px; font-weight: 700; color: var(--tx2); border: 1.5px dashed rgba(var(--ink), .18); transition: background .2s, color .2s; }
      .add:hover { color: var(--tx); background: rgba(var(--ink), .04); }
      .pbtn { padding: 9px 16px; border-radius: 12px; font-size: 13px; font-weight: 800; color: #fff; background: rgb(var(--acc)); box-shadow: 0 6px 16px -8px rgb(var(--acc)); }
      .pbtn.sm { padding: 7px 12px; font-size: 12.5px; } .pbtn.ghost { background: rgba(var(--ink), .1); color: var(--tx2); box-shadow: none; }
      .form { padding: 4px 0; } .fbtns { display: flex; flex-wrap: wrap; gap: 8px; }
      .about { font-size: 11px; color: var(--tx2); text-align: right; opacity: .7; }
      .toast { position: absolute; left: 50%; bottom: 12px; transform: translate(-50%, 20px); max-width: calc(100% - 30px); padding: 9px 14px; border-radius: 14px; font-size: 12.5px; font-weight: 700; color: #fff; background: rgba(15,23,42,.92); box-shadow: 0 8px 24px rgba(0,0,0,.35); opacity: 0; pointer-events: none; transition: opacity .3s, transform .35s cubic-bezier(.3,1.4,.5,1); z-index: 5; text-align: center; }
      .toast.show { opacity: 1; transform: translate(-50%, 0); } .toast.bad { background: #b91c1c; }
      @media (max-width: 420px) { .thermo { grid-template-columns: 1fr; justify-items: center; } .setp { align-items: center; } .hours { padding: 0 24px 0 50px; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`;
    }
  }

  // ======================================================================
  class HolmClimatCardEditor extends HTMLElement {
    setConfig(config) { this._config = { ...config }; if (this._form) this._form.data = this._data(); }
    set hass(hass) { this._hass = hass; const _l = setLang(hass, this._config); if (this._form && _l !== this._lang) { this._form.remove(); this._form = null; } this._lang = _l; if (!this._form) { if (!this._building) { this._building = true; this._build().finally(() => (this._building = false)); } } else this._form.hass = hass; }
    _data() { return { theme: "auto", day_chart: "collapsed", ...this._config }; }
    async _build() {
      let rooms = [];
      try { rooms = (await this._hass.callWS({ type: "climat_holm/data" })).rooms || []; } catch (e) { /* */ }
      const f = document.createElement("ha-form");
      f.hass = this._hass;
      f.schema = [
        langField(),
        { name: "title", selector: { text: {} } },
        { name: "rooms", selector: { select: { multiple: true, mode: "list", options: rooms.map((r) => ({ value: r.id, label: r.name })) } } },
        { name: "day_chart", selector: { select: { mode: "dropdown", options: [{ value: "collapsed", label: _("Replié (s'ouvre d'un clic)") }, { value: "open", label: _("Ouvert") }, { value: "hide", label: _("Masqué") }] } } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: _("Automatique (clair / sombre)") }, { value: "dark", label: _("Sombre") }, { value: "light", label: _("Clair") }, { value: "theme", label: _("Couleurs de mon thème") }] } } },
      ];
      const L = { language: _("Langue"), title: _("Titre (vide = Chauffage / Climatisation)"), rooms: _("Pièces affichées (aucune cochée = toutes)"), theme: _("Apparence"), day_chart: _("Graphique de la journée") };
      f.computeLabel = (s) => L[s.name] || s.name;
      f.data = this._data();
      f.addEventListener("value-changed", (e) => {
        const v = { ...e.detail.value };
        if (!v.title) delete v.title;
        if (!v.rooms || !v.rooms.length) delete v.rooms;
        if (v.theme === "auto") delete v.theme;
        if (!v.day_chart || v.day_chart === "collapsed") delete v.day_chart;
        if (!v.language) delete v.language;
        this._config = { type: this._config.type || "custom:holm-climat-card", ...v };
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this._form = f;
      this.appendChild(f);
    }
  }

  if (!customElements.get("holm-climat-card")) customElements.define("holm-climat-card", HolmClimatCard);
  if (!customElements.get("holm-climat-card-editor")) customElements.define("holm-climat-card-editor", HolmClimatCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "holm-climat-card")) {
    setLang(document.querySelector("home-assistant")?.hass);
    window.customCards.push({ type: "holm-climat-card", name: _("HOLM Climat"), description: _("Programmation du chauffage et de la clim, pièce par pièce (intégration Climat HOLM)."), preview: false });
  }
  console.info(`%c HOLM-CLIMAT %c ${VERSION} `, "background:#f97316;color:#fff;border-radius:3px 0 0 3px", "background:#123;color:#fff;border-radius:0 3px 3px 0");
})();
