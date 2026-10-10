# Waterput-dashboard

Meet en toont het peil van de regenwaterput. De hardware, de bekabeling en de
keuzes daarachter staan in [PROJECT-DESIGN.md](PROJECT-DESIGN.md); dit bestand
gaat enkel over de software.

## Wat het is

Twee containers die samen op de Raspberry Pi draaien:

| Container | Taak |
|---|---|
| `poller` | Leest om de vijf minuten register `0x0100` van de ultrasone sensor over Modbus RTU en POST het resultaat naar het dashboard. |
| `dashboard` | Next.js-webserver met een SQLite-database. Toont het peil en het verloop, en biedt de configuratiepagina. |

De poller is bewust een apart proces. Een herdeploy van het dashboard mag de
meting niet stilleggen — een ontbrekende minuut dashboard is niets, een
ontbrekende minuut meetgegevens is voorgoed weg.

De poller kent het databaseschema niet en linkt geen SQLite: hij praat enkel
HTTP. Daardoor heeft zijn image geen native modules nodig en blijft het
dashboard de enige schrijver.

## Gegevens

De database bewaart **enkel de ruwe millimeters** die de sensor levert. De
omrekening naar procent en liter gebeurt bij het tonen. Je mag de kalibratie dus
later bijstellen zonder dat de historiek onbruikbaar wordt.

```sql
measurements(ts INTEGER PRIMARY KEY, distance_mm INTEGER, error TEXT)
config(key TEXT PRIMARY KEY, value TEXT)
```

`ts` als primaire sleutel maakt het opnieuw aanbieden van een meting
onschadelijk: de poller die zijn buffer leegmaakt na een onderbreking, telt geen
metingen dubbel.

Een mislukte uitlezing wordt als rij bewaard, met `distance_mm = NULL` en de
foutmelding in `error`. Uitval van de sensor is daardoor een zichtbaar gat in de
grafiek in plaats van een stilzwijgend rechte lijn.

### Buckets

De grafiek vat samen per bucket: 10 minuten over 24 uur, een uur over 7 dagen,
drie uur over 30 dagen, een dag over 12 maanden. Buckets liggen op veelvouden van
UTC, ook de dagbuckets — eenvoudig en immuun voor zomertijd, maar een "dag"
begint daardoor om 01:00 of 02:00 Belgische tijd. Voor een daggemiddelde over een
jaar maakt dat niets uit; de tabel toont bij de jaarweergave daarom enkel de
datum en geen kloktijd.

De samenvatting gebruikt `ts - (ts % :bucket)` en niet `(ts / :bucket) * :bucket`:
better-sqlite3 bindt JS-getallen als REAL, waardoor die deling een kommadeling
wordt en elke meting in haar eigen bucket valt. De modulo-operator van SQLite
cast zijn operanden wel eerst naar INTEGER.

## Kalibratie

De sensor hangt aan het plafond en meet naar beneden, dus **veel water is een
kleine afstand**. De configuratiepagina vraagt drie getallen:

| Veld | Betekenis |
|---|---|
| Afstand bij volle put | wat de sensor meet op het maximumpeil (mm) |
| Afstand bij lege put | wat de sensor meet op het minimumpeil (mm) |
| Inhoud tussen beide peilen | het volume dat daar tussen zit (liter) |

Het vulniveau is dan `(leeg - gemeten) / (leeg - vol)`, afgekapt op 0–100 %.

**Dit rekent lineair.** Bij een put met rechte wanden klopt dat. Heeft de jouwe
een ronde bodem of een andere doorsnede over de hoogte, dan wijkt de literwaarde
af in de buurt van de uitersten; het percentage blijft wel correct als maat voor
de waterhoogte.

## Draaien op de Pi

**`docker-compose.yml` uit de repo wordt ongewijzigd gedeployed.** Alles wat
per machine verschilt — het token, het pad van de USB-adapter, de
Healthchecks-URL, eventuele afwijkende sensorinstellingen — staat in `.env`
naast dat bestand, en nergens anders. Pas `docker-compose.yml` op de Pi dus
nooit met de hand aan: zo blijft een update gewoon "nieuwste versie ophalen",
en kan je eigen instelling niet verloren gaan. Welke variabelen er zijn, staat
in [`.env.example`](.env.example) en onder
[Omgevingsvariabelen](#omgevingsvariabelen).

```bash
git clone git@github.com:maartendecat/waterput-sensor-dashboard.git waterput-sensor
cd waterput-sensor
cp .env.example .env
```

Vervang het voorbeeldtoken in `.env` door een echt:

```bash
sed -i "s/^INGEST_TOKEN=.*/INGEST_TOKEN=$(openssl rand -hex 32)/" .env
```

Zoek het stabiele pad van de USB-adapter op en zet het als `MODBUS_DEVICE` in
`.env` — niet in `docker-compose.yml`, want dat bestand staat onder
versiebeheer en je instelling zou elke `git pull` overleven moeten:

```bash
ls -l /dev/serial/by-id/
```

`docker-compose.yml` leest verder `MODBUS_SLAVE_ID`, `MODBUS_REGISTER`,
`POLL_INTERVAL_SECONDS`, `SENSOR_MIN_MM`, `SENSOR_MAX_MM`, `HEALTHCHECK_URL` en
`HEALTHCHECK_FOUTEN_VOOR_ALARM` uit `.env`. Die zijn
allemaal optioneel: laat je ze weg, dan geldt de waarde uit `.env.example`.
`INGEST_TOKEN` en `MODBUS_DEVICE` zijn dat niet — ontbreken ze, dan weigert
Compose te starten met een melding die zegt wat er mist.

Let op dat een variabele die al in je shell staat, voorrang heeft op `.env`.

Dan:

```bash
docker compose up -d
```

Het dashboard staat op `http://<ip-van-de-pi>:3000`. Er is geen login: de
opstelling hoort enkel op het eigen netwerk bereikbaar te zijn.

### Bijwerken

Vanaf je eigen machine:

```bash
make deploy
```

Dat doet op de Pi `git pull` (voor een nieuwe `docker-compose.yml`),
`docker compose pull` (de nieuwste images uit CI) en `docker compose up -d`,
dat enkel de containers herstart waarvan image of configuratie veranderde.
Daarna ruimt het oude images op. Het adres van de Pi en de map staan
bovenaan de `Makefile`; geef ze desnoods per keer mee met
`make deploy PI=pi@192.168.0.42`.

Komt er een nieuwe variabele bij, dan staat die in `.env.example`. Zet hem in
`.env` als je hem nodig hebt — de standaardwaarde geldt anders.

### Home Assistant moet de poort loslaten

Slechts één proces kan `/dev/ttyUSB0` openhouden. Draait er nog een Home
Assistant met de `modbus:`-sensor uit PROJECT-DESIGN.md, haal die dan uit de
configuratie voor je de poller start — anders krijgt een van de twee "device
busy".

## Ontwikkelen

Node 22 of nieuwer.

```bash
cd apps/dashboard
npm install
WATERPUT_DB_PATH=./waterput.db npm run dev
```

Zonder poller is de database leeg. Je kunt met de hand metingen invoeren:

```bash
curl -X POST http://localhost:3000/api/measurements \
  -H 'Content-Type: application/json' \
  -d '{"readings":[{"ts":'"$(date +%s)"',"distanceMm":1959,"error":null}]}'
```

Staat er een `INGEST_TOKEN` in de omgeving, zet er dan
`-H "Authorization: Bearer $INGEST_TOKEN"` bij.

De poller apart draaien:

```bash
cd apps/poller
npm install
MODBUS_PORT=/dev/ttyUSB0 DASHBOARD_URL=http://localhost:3000 npm run build && npm start
```

## API

| Route | Methode | Doel |
|---|---|---|
| `/api/measurements` | POST | Metingen aanleveren. Vereist `Authorization: Bearer <INGEST_TOKEN>` zodra dat token gezet is. |
| `/api/history?periode=24u\|7d\|30d\|12m` | GET | Verloop, samengevat per bucket. |
| `/api/config` | GET / PUT | De kalibratie lezen en schrijven. |
| `/api/export?periode=...` | GET | Dezelfde reeks als CSV, met `Content-Disposition` zodat de browser ze bewaart. |

### CSV

De export levert wat de detailtabel toont: de samengevatte reeks voor de
gekozen periode, dus daggemiddelden bij 12 maanden en geen ruwe metingen.

Scheidingsteken is een puntkomma, decimalen een komma, en het bestand begint
met een UTF-8 BOM — dat is de combinatie waarbij dubbelklikken in Excel met
Belgische regio-instellingen meteen goede kolommen geeft. Een RFC4180-bestand
met punt-decimalen komt daar in één kolom binnen.

Er staan twee tijdkolommen in: `unix_ts` (eenduidig) en `tijdstip` (lokale tijd,
door Excel herkend als tijdstip). Bij de jaarweergave staat daar `02:00`, want
dagbuckets liggen op UTC-middernacht — zie hierboven.

Een mislukte meting levert een regel met lege waardevelden, zodat een gat in de
reeks ook in een spreadsheet een gat blijft.

## Omgevingsvariabelen

**Dashboard**

| Naam | Standaard | Betekenis |
|---|---|---|
| `WATERPUT_DB_PATH` | `/data/waterput.db` | Pad naar het SQLite-bestand |
| `INGEST_TOKEN` | *(leeg)* | Gedeeld geheim voor `/api/measurements`. Leeg betekent open. |
| `TZ` | `Europe/Brussels` | Tijdzone |

**Poller**

| Naam | Standaard | Betekenis |
|---|---|---|
| `MODBUS_PORT` | `/dev/ttyUSB0` | Seriële poort binnen de container |
| `MODBUS_SLAVE_ID` | `1` | Slave-adres van de sensor |
| `MODBUS_REGISTER` | `256` | `0x0100`, de gefilterde afstand |
| `MODBUS_BAUDRATE` | `9600` | 8N1, geen pariteit |
| `MODBUS_TIMEOUT_MS` | `2000` | Time-out per uitlezing |
| `POLL_INTERVAL_SECONDS` | `300` | Vijf minuten |
| `DASHBOARD_URL` | `http://dashboard:3000` | Waar de metingen heen gaan |
| `INGEST_TOKEN` | *(leeg)* | Moet overeenkomen met dat van het dashboard |
| `BUFFER_MAX` | `2016` | Metingen die bewaard blijven als het dashboard weg is (een week) |
| `SENSOR_MIN_MM` | `200` | Ondergrens van de sensor; daaronder komt geen echo terug |
| `SENSOR_MAX_MM` | `5000` | Bovengrens; daarboven haalt de echo niets |
| `HEALTHCHECK_URL` | *(leeg)* | Ping-URL van een check op Healthchecks.io. Leeg betekent geen pings. |
| `HEALTHCHECK_FOUTEN_VOOR_ALARM` | `6` | Mislukte rondes op rij voor de check op "down" gaat (een half uur) |

## Wat de poller logt als er iets misgaat

Een mislukte uitlezing zegt op zich weinig. De poller classificeert de fout en
zet er de raad bij die bij die faalmodus hoort:

| Soort | Wat het betekent |
|---|---|
| `timeout` | Geen antwoord. Wissel eerst A en B om; controleer daarna 5 V, massa en slave-adres. |
| `crc` | Antwoord komt beschadigd aan: baudrate, afscherming, of half verwisselde aders. |
| `modbus-exceptie` | Het toestel leeft en weigert het verzoek — bijna altijd het verkeerde registeradres. |
| `poort` | De seriële poort is weg. USB-adapter los, of Home Assistant houdt hem nog vast. |
| `bereik` | Er kwam een getal binnen dat geen meting kan zijn. |

De volledige uitleg verschijnt bij de **eerste** fout van een reeks; daarna
volgt een compacte regel met hoeveel pogingen op rij mislukt zijn en sinds
wanneer. Zodra het weer lukt komt er een herstelregel met de duur van de
storing. Zo blijft `docker compose logs poller` leesbaar bij een storing die
een nacht duurt.

**`bereik` verdient aparte aandacht.** De sensor meet van 200 mm tot 5 m en kan
daarbuiten een keurig Modbus-antwoord geven met een onmogelijke waarde — `0 mm`
betekent bij een ultrasone sensor meestal dat de echo niet is teruggekomen.

Die 200 mm is de sensorspecificatie en niet de montagemarge van 25 cm uit
PROJECT-DESIGN.md: die laatste zegt hoe hoog je ophangt, deze zegt welk antwoord
onmogelijk is. Zonder controle rekent dat door als
een *volle* put, want een kleine afstand is veel water. Zo'n antwoord wordt
daarom als storing bewaard, met de ruwe waarde in de foutmelding, en niet als
meting.

## Verwittigd worden bij een storing

De poller pingt [Healthchecks.io](https://healthchecks.io) na elke ronde. Het
alarm komt van buitenaf: blijven de pings weg, dan verwittigt Healthchecks je.
Zo valt ook een gecrashte poller, een Pi zonder stroom of een weggevallen
internetverbinding op — storingen waarbij niets op de Pi zelf nog iets kan
melden.

Per ronde:

| Toestand | Ping | Gevolg |
|---|---|---|
| Meting gelukt en in de database | `<url>` | Check is "up" |
| Mislukt, minder dan `HEALTHCHECK_FOUTEN_VOOR_ALARM` keer op rij | `<url>/log` | Enkel een regel in het logboek van de check; één fout is ruis |
| Mislukt, vanaf die drempel | `<url>/fail` | Check gaat "down", met foutsoort, foutmelding en raad in de melding |

Een sensor die werkt achter een onbereikbaar dashboard telt ook als mislukt: de
vraag is of de meting in de database staat.

Opzetten:

1. Maak op healthchecks.io een check aan met **Period** 5 minuten (gelijk aan
   `POLL_INTERVAL_SECONDS`) en **Grace** 30 minuten.
2. Koppel onder *Integrations* het kanaal waarop je verwittigd wilt worden
   (e-mail, de app, Signal, Telegram, ntfy…).
3. Zet de ping-URL in `.env` als `HEALTHCHECK_URL` en herstart:
   `docker compose up -d`.

In de log van de poller verschijnt dan `healthcheck aan`. Is healthchecks.io
zelf onbereikbaar, dan staat dat één keer in de log en niet bij elke ronde.

## Back-up

Alles zit in één bestand. Met de containers actief is `sqlite3 ... .backup` de
veilige manier — een kopie met `cp` tijdens een schrijfactie kan een halve
transactie meenemen:

```bash
docker run --rm -v waterput-sensor-dashboard_waterput-data:/data -v "$PWD":/uit \
  nouchka/sqlite3 /data/waterput.db ".backup '/uit/waterput-backup.db'"
```

## CI

`.github/workflows/build.yml` bouwt beide images voor `linux/amd64` en
`linux/arm64` en pusht ze naar `ghcr.io`. Padfilters zorgen dat een wijziging
aan het dashboard de poller-image niet opnieuw bouwt.
