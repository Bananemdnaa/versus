# Versus in den Microsoft Store bringen

Dauer: etwa eine Stunde Klickarbeit, dann 1–3 Werktage Prüfung durch Microsoft.
Die Texte zum Kopieren stehen in [LISTING.md](LISTING.md), die Bilder in `shots/`.

Wichtig vorab: Die Store-App ist eine Hülle um https://bananemdnaa.github.io/versus/.
**Updates kommen weiter über GitHub Pages**, ein neues Store-Paket braucht es nur, wenn sich Name,
Icons oder das Manifest ändern.

## 1. Entwicklerkonto anlegen (gratis)

1. https://storedeveloper.microsoft.com → „Get started“ → **Einzelperson** (Individual).
2. Mit einem Microsoft-Konto anmelden, Name und Adresse angeben, Ausweis prüfen lassen.
   Der Vertrag braucht eine volljährige Person. Wer jünger ist, macht das mit den Eltern.
3. Den **Anzeigenamen des Herausgebers** wählen (steht im Store unter dem App-Namen),
   Gewählt: **Flixos Studios** (das Studio für Versus und kommende Spiele).

## 2. App-Namen reservieren

1. Im Partner Center: **Apps und Spiele → Neues Produkt → „MSIX- oder PWA-App“**.
2. Namen **Versus** reservieren. Ist er vergeben: „Versus – Spiele für 2 bis 4“.
3. Danach **Produktverwaltung → Produktidentität** öffnen und diese drei Werte notieren:
   - Package/Identity/Name (z. B. `12345FlixosStudios.Versus`)
   - Package/Identity/Publisher (beginnt mit `CN=`)
   - Package/Properties/PublisherDisplayName

## 3. Paket mit PWABuilder bauen

1. https://www.pwabuilder.com → URL `https://bananemdnaa.github.io/versus/` eingeben → „Start“.
   Das Manifest sollte grün sein (Icons, Screenshots, Service Worker sind vorhanden).
2. **Package for stores → Windows → Generate Package**, dann „Options“:
   - Package ID, Publisher ID, Publisher display name: die drei Werte aus Schritt 2
   - App name: `Versus`, App version: `1.0.0`
   - Sprache: `de` (die englische Oberfläche schaltet die App selbst um)
3. ZIP herunterladen. Darin sind `.msixbundle` und `.classic.appxbundle`. **Beide** werden hochgeladen.

## 4. Einreichung ausfüllen

Im Partner Center unter dem Produkt **„Einreichung starten“**:

**Preise und Verfügbarkeit:** kostenlos, alle Märkte, öffentlich sichtbar.

**Eigenschaften:** Kategorie, Datenschutz-URL, Website, Support-Kontakt und Spieleigenschaften
wie in der Tabelle unten in [LISTING.md](LISTING.md).
Bei „Diese App greift auf persönliche Daten zu, speichert sie oder überträgt sie“: **Ja**
(Konto mit Benutzername, Online-Partien).

**Altersfreigaben** (IARC-Fragebogen, ehrlich beantworten):
| Frage | Antwort | Warum |
|---|---|---|
| Art der App | Spiel | |
| Gewalt, Angst, Sexualität, Sprache, Drogen | Nein | |
| Simuliertes Glücksspiel | **Ja** | Poker (ohne echtes Geld) |
| Echtes Glücksspiel / Einsatz von Geld | Nein | |
| Nutzer können miteinander interagieren | **Ja** | Online-Partien, Benutzernamen, feste Sätze, Zeichnen & Raten |
| Teilt den Standort | Nein | |
| Käufe in der App | Nein | |
| Uneingeschränkter Internetzugang | Nein | |

Wegen Poker wird die Freigabe vermutlich etwas höher (z. B. PEGI 12) als bei reinen Brettspielen.
Wer das vermeiden will, müsste Poker herausnehmen; bewusst entscheiden, nicht verschweigen.

**Pakete:** beide Dateien aus dem PWABuilder-ZIP hochladen. Gerätefamilie: Desktop
(Xbox nicht anhaken, Holographic auch nicht).

**Store-Einträge:** Sprachen Deutsch und Englisch hinzufügen, Texte aus [LISTING.md](LISTING.md)
einfügen, Bilder aus `shots/` hochladen:
- Desktop-Screenshots: `wide-de-*.png` bzw. `wide-en-*.png` (1920 × 1080)
- Store-Logos: `poster-*.png` (2:3), `box-*.png` (1:1), `logo300-*.png` (300 × 300)

**Übermittlungsoptionen:** Veröffentlichung „sobald die Zertifizierung bestanden ist“
oder „manuell“, wenn du den Start selbst bestimmen willst.

Dann **An den Store übermitteln**.

## 5. Nach der Freigabe

- Den Store-Link (`https://apps.microsoft.com/detail/…`) an Claude geben: Dann kommt ein
  Store-Knopf auf die Website und ins Installieren-Menü für Windows.
- Neue Version im Store nur nötig bei Änderungen an Name, Icons oder Manifest:
  in PWABuilder dieselben Werte, Version hochzählen (1.0.1), neues Paket hochladen.
- Bewertungen im Store sind öffentlich; das Partner Center zeigt sie unter „Bewertungen“.

## Neue Bilder machen

Nach größeren Änderungen an der Optik:

```
py -3 -m pip install websocket-client pillow
py -3 tools/store-shots.py
```

Der lokale Server (`.claude/launch.json`, „versus“) muss laufen. Das Skript spielt die Partien mit der
KI auf allen Plätzen und schreibt nach `store/shots/` und `icons/screens/` (Manifest-Screenshots).
