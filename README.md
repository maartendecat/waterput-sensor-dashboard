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

```bash
git clone git@github.com:maartendecat/waterput-sensor-dashboard.git
cd waterput-sensor-dashboard
cp .env.example .env
```

Zet een echt token in `.env`:

```bash
echo "INGEST_TOKEN=$(openssl rand -hex 32)" > .env
```

Zoek het stabiele pad van de USB-adapter op en zet het in `docker-compose.yml`
bij `devices:` — het linkerdeel is het pad op de host, het rechterdeel de naam
binnen de container:

```bash
ls -l /dev/serial/by-id/
```

Dan:

```bash
docker compose up -d
```

Het dashboard staat op `http://<ip-van-de-pi>:3000`. Er is geen login: de
opstelling hoort enkel op het eigen netwerk bereikbaar te zijn.

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
