# OrgScript Handbuch (Deutsch)

OrgScript ist eine menschenlesbare, KI-freundliche Beschreibungssprache fuer Geschaeftslogik, Workflows, Rollen, Regeln und Zustandsuebergaenge.

Dieses Handbuch ist der kurze praktische Einstieg. Die kanonische Sprachdefinition steht in `spec/language-spec.md`.

## Wofuer OrgScript gedacht ist

Nutze OrgScript, wenn du eine textbasierte gemeinsame Quelle fuer Folgendes brauchst:

- operative Prozesse
- Freigabelogik
- Berechtigungsgrenzen
- Zustandsuebergaenge
- Eskalationsregeln
- Kennzahlen
- KI- und Tooling-Kontexte

OrgScript liegt zwischen Fliesstext-Dokumentation und Implementierungscode. Es beschreibt Logik, es fuehrt sie nicht aus.

## Zentrale Bausteine

### `process`

Nutze `process` fuer Schritt-fuer-Schritt-Ablaeufe.

Typische Beispiele:

- Lead-Qualifizierung
- Angebot zu Auftrag
- Onboarding
- Rueckerstattungsprozess

### `stateflow`

Nutze `stateflow` fuer zulaessige Zustaende und erlaubte Uebergaenge.

Typische Beispiele:

- Auftragslebenszyklus
- Ticket-Lebenszyklus
- Lead-Lebenszyklus

### `rule`

Nutze `rule` fuer Regeln und Bedingungen, die immer gelten sollen, wenn eine Bedingung zutrifft.

### `role`

Nutze `role` fuer Berechtigungen und Grenzen mit `can` und `cannot`.

### `policy`

Nutze `policy` fuer kontext- oder zeitabhaengiges Organisationsverhalten.

### `event`

Nutze `event` fuer benannte Ausloeser mit Standardreaktionen.

### `metric`

Nutze `metric` fuer Kennzahlen mit Formel, Owner und Zielwert.

## Erste nuetzliche Befehle

```bash
orgscript check ./examples/craft-business-lead-to-order.orgs
orgscript export mermaid ./examples/craft-business-lead-to-order.orgs
orgscript export markdown ./examples/lead-qualification.orgs --with-annotations
orgscript export context ./examples/lead-qualification.orgs
orgscript export bpmn ./examples/lead-qualification.orgs
orgscript export littlehorse ./examples/lead-qualification.orgs
orgscript export graph ./examples/lead-qualification.orgs
orgscript export plantuml ./examples/lead-qualification.orgs
orgscript export contract ./examples/lead-qualification.orgs
```

Was sie tun:

- `check` prueft Syntax, Lint-Regeln und kanonische Formatierung
- `export mermaid` erzeugt ein diagrammfreundliches Artefakt
- `export markdown` erzeugt eine kurze menschenlesbare Zusammenfassung
- `export context` erzeugt ein strukturiertes Paket fuer KI und Tooling
- `export bpmn` erzeugt ein BPMN-XML-Skelett fuer Prozessbloecke
- `export littlehorse` erzeugt ein LittleHorse-Workflow-Skelett (Pseudo-Code)
- `export graph` erzeugt ein kompaktes Graph-JSON (Nodes + Edges)
- `export plantuml` erzeugt PlantUML-Skelette fuer Prozesse und Stateflows
- `export contract` erzeugt ein OpenAPI-aehnliches Prozess-Contract-JSON

Hilfe: `orgscript --help` oder `orgscript help <command>`.

## Kommentare und Annotationen

OrgScript unterstuetzt einen optionalen Dokument-Sprachheader plus zwei Dokumentationsebenen:

- `orgscript 1`
- `source-language "en"` / `comment-language "de"` / `annotation-language "de"` / `context-language "de"`
- `# comment`
- `@key "value"`

Kommentare:

- sind nur fuer Menschen gedacht
- muessen in v1 als eigene ganze Zeile `# ...` stehen
- sind nicht normativ
- werden nicht in kanonischen Export, KI-Kontext oder Analyse uebernommen

Annotationen:

- sind parsebare Metadaten
- haengen sich an den folgenden unterstuetzten Block oder die folgende Anweisung
- werden in AST und kanonisches Modell uebernommen
- aendern die Semantik nicht

Erlaubte Annotation-Keys in v1:

- `@note`
- `@owner`
- `@todo`
- `@source`
- `@status`
- `@review`

Beispiel:

```orgs
orgscript 1

source-language "en"
comment-language "de"
annotation-language "de"

# Gemeinsamer Lead-Qualifizierungspfad fuer eingehende Leads.
@owner "sales_ops"
@status "active"
process LeadQualification

  when lead.created

  @note "Referral-Leads separat auswerten."
  if lead.source = "referral" then
    assign lead.priority = "high"
    notify sales with "New referral lead"
```

Wichtige Regel:

Wenn Geschaeftslogik wichtig ist, muss sie als OrgScript-Logik formuliert werden, nicht als Kommentar.

Schlecht:

```orgs
# Immer Anzahlung vor Bestaetigung verlangen.
```

Gut:

```orgs
if order.deposit_received = false then
  require finance_clearance
  stop
```

## Exportverhalten

Standardverhalten der Exporter:

- Kommentare bleiben aus allen maschinenorientierten Exporten draussen
- Kommentare erscheinen standardmaessig nicht in Markdown, Mermaid oder HTML
- Dokument-Sprachmetadaten sind im kanonischen JSON und in `export context` enthalten
- Annotationen sind im kanonischen JSON enthalten
- Annotationen sind in `export context` enthalten
- Annotationen erscheinen in Markdown und HTML nur mit `--with-annotations`
- BPMN- und LittleHorse-Exporter sind Skelette und brauchen manuelle Nacharbeit
- Graph-JSON-Export ist ein kompaktes Integrationsartefakt fuer Tooling und Visualisierung
- PlantUML- und Contract-Exporter sind leichte Skelette fuer Kommunikation und Tooling
- Graph-Export ist eine kompakte Strukturansicht, kein semantischer Ersatz fuer das kanonische Modell

So bleibt Geschaeftslogik explizit und Kommentare werden keine versteckte zweite Sprache.

## Exporter-Reifegrad-Matrix

| Exporter | Status | Hinweis |
| --- | --- | --- |
| `json` | stabil | kanonisches Modell |
| `context` | stabil | KI-/Tooling-Paket |
| `markdown` | stabil | Zusammenfassung |
| `html` | stabil | Doku-Seite |
| `graph` | stabil | Knoten + Kanten |
| `contract` | experimentell | Scaffold |
| `bpmn` | experimentell | Skelett |
| `plantuml` | experimentell | Skelett |
| `littlehorse` | experimentell | Scaffold |

## Schreibregeln

- eine Anweisung pro Zeile
- explizite Logik statt stiller Annahmen
- stabile Namen verwenden
- Bloecke klein halten
- Freigaben, Schwellenwerte und Berechtigungen nicht in Prosa verstecken
- Kommentare sparsam zur Orientierung einsetzen
- Annotationen fuer strukturierte Metadaten nutzen, nicht fuer Semantik

## Empfohlene Lesereihenfolge

Fuer den vollstaendigen Projektkontext:

1. `docs/manifesto.md`
2. `docs/language-principles.md`
3. `spec/language-spec.md`
4. `docs/orgscript-for-humans.md`
5. `docs/orgscript-for-ai.md`

## Praktischer Arbeitsablauf

Fuer die meisten Teams ist dieser sichere Zyklus sinnvoll:

1. Logik in `.orgs` modellieren
2. `orgscript check` ausfuehren
3. Markdown oder Mermaid zur Review erzeugen
4. Context-Export fuer KI- oder Tooling-Nutzung erzeugen
5. die `.orgs`-Datei als gepflegte Quelle der Wahrheit behalten
