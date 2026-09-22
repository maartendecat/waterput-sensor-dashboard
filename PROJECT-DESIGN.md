# Componenten
 
## Sensor
 
* https://www.seeedstudio.com/RS485-500cm-Ultrasonic-Level-Sensor-p-5588.html
* [datasheet](<sensor/101991042-RS485-500cm-Ultrasonic-Level-Sensor-datasheet.pdf>)
* [samenvatting](<sensor/101991042-RS485-500cm-Ultrasonic-Level-Sensor-summary.pdf>)
## Server
 
**Raspberry Pi 4 Model B — 4 GB** ([Kiwi KW-2504](https://www.kiwi-electronics.com/nl/raspberry-pi-4-model-b-4gb-4268), €89,99 excl. btw).
Draait Home Assistant, leest de sensor uit, houdt de historiek bij.
 
Waarom 4 GB: door de geheugenprijzen van 2026 kost 8 GB €134,99 en 2 GB €48,99
(die laatste is bovendien uitverkocht). Home Assistant met een stel integraties
zit comfortabel onder 2 GB in gebruik; 4 GB geeft ruimte voor een extra
container of twee zonder €45 te betalen voor geheugen dat nooit wordt
aangeraakt.
 
### Deze Pi is een appliance
 
Bewuste afbakening: **deze Pi draait Home Assistant en verder niets zwaars.**
Geen Minecraft-server, geen Plex, geen mediabibliotheek. Dat is geen dogma maar
volgt uit drie dingen die elders in dit document staan:
 
* **Warmte.** De thermische analyse bij open punt 3 gaat uit van idle-belasting:
  ±50 °C in een dichte behuizing. Een Pi 4 die onder volle CPU-belasting draait
  komt in diezelfde dichte behuizing op 84 °C en gaat throttlen. Minecraft *is*
  in de praktijk een stresstest.
* **Vermogen.** 802.3af garandeert 12,95 W. Pi onder echte belasting 6–7 W plus
  een USB-SSD 2,5 W past nog; daar een mediaschijf van 2,5–4,5 W bij hangen niet.
  Het USB-budget van de Pi 4 is bovendien 1,2 A totaal.
* **Koppeling.** De uptime van een waterpeilmeting hoort niet af te hangen van
  of er iemand aan het spelen is, of van een Plex-bibliotheekscan.
Voor de volledigheid, mocht je ooit anders beslissen: een Pi 4 met 8 GB en
PaperMC haalt 5–8 spelers (CPU is de beperking, niet geheugen), en Plex doet
3–4 gelijktijdige 1080p-streams **mits direct play** — de Pi 4 heeft geen
hardware-encoder, dus transcoderen is 0 tot 1 stream. Voor die taken is een
mini-PC met een N100 (±€150–200) een veel betere machine, en dan blijft dit
kastje wat het moet zijn.
 
## Voeding — PoE
 
De switch is een **Netgear GS305P v1** — typeplaatje zegt `55.5W`. Die doet
standaardconforme, actieve PoE (geen passieve 24 V), dus de handshake is geen
open vraag. Specificatie: 802.3af, 15,4 W per poort, 55,5 W totaal over vier
PoE-poorten.
 
De Pi piekt op ±9 W, dus dat is ruim. Wat de v1 wél bepaalt, is welke HAT kan:
**de officiële Raspberry Pi PoE+ HAT valt af.** Die is een Class 4-toestel dat
802.3at / 20 W vraagt, terwijl 802.3af maar 12,95 W aan het toestel garandeert —
hij negotieert niet.
 
### Waveshare PoE HAT (B)
 
**[Kiwi WS-18014](https://www.kiwi-electronics.com/en/power-over-ethernet-hat-b-for-rpi-3bplus-4b-802-3af-poe-network-11413)**, €18,99 excl. btw.
802.3af, volledig geïsoleerde SMPS, 37–57 V in / 5 V — 2,5 A uit, ventilator met
automatische regeling via een schakelaartje, en een 0,91" OLED die temperatuur,
IP-adres en ventilatorstatus toont.
 
Nadeel tegenover de officiële HAT: de ventilator en het OLED hangen aan een
PCF8574 op de I²C-bus en worden door Waveshare met een eigen script aangestuurd.
Zet de ventilator daarom op de **hardwarematige automatische stand** en laat
software erbuiten — zie "Ventilator van de PoE HAT" verderop.
 
### Een 802.3at-switch kopen? Niet voor dit project
 
De GS305P bestaat ook als v2/v3 (802.3at, 30 W per poort, 63 W totaal,
fabrikantscode `GS305P-300EUS`, ±€56). Daarmee zou de
[officiële PoE+ HAT](https://www.kiwi-electronics.com/en/raspberry-pi-poeplus-hat-10597)
(KW-2975, €17,99) kunnen, die €1 goedkoper is en waarvan de ventilator door de
Raspberry Pi-firmware zelf wordt geregeld via de `rpi-poe-plus` overlay — dus
zonder Waveshare-script.
 
**Dat is de switch niet waard.** €56 voor €1 korting en een netter geregelde
ventilator. De v1 heeft ruim genoeg vermogen en de HAT (B) is precies voor dit
geval gemaakt.
 
Wat de upgrade wél zou rechtvaardigen, los van dit project: een WiFi 6/7 access
point (vraagt vaak 802.3at), een camera met verwarming, of een 55,5 W-budget dat
al vol zit. Vervang je de switch ooit om zo'n reden, dan is de officiële HAT een
losse upgrade van €18 — de rest van dit ontwerp verandert er niet door.
 
*Let op bij het bestellen:* Netgear zet de versie niet in de modelnaam, wel in de
fabrikantscode. `GS305P-300EUS` = v3.
 
### Hoe dan ook
 
**Er staat geen 230 V in de kast.** Eén CAT-kabel binnen, verder alles DC. Dat
scheelt een DIN-voeding, drie modules op de rail, en netbekabeling naar de kast
toe.
 
## RS485 naar de Pi
 
**Waveshare Industrial USB to RS485 Converter**
([Kiwi WS-17286](https://www.kiwi-electronics.com/en/industrial-usb-to-rs485-converter-9944), €11,99 excl. btw).
FT232RL, schroefklem A / B / GND, 600 W surge-onderdrukking en 15 kV ESD,
300–921600 bps. Prikt in een USB-poort van de Pi en verschijnt als een seriële
poort.
 
Het is een pure niveau-omzetter: hij zet USB om naar het differentiële
A/B-paar en verder niets. **Alle Modbus-logica draait in software op de Pi** —
frame opbouwen, CRC berekenen, antwoord parsen — via de `modbus`-integratie van
Home Assistant in serial-modus.
 
Geen galvanische isolatie. Op 7 m binnen hetzelfde gebouw is dat geen bezwaar
(zie "Galvanische scheiding" verderop). Wil je het toch: de
[geïsoleerde variant WS-15817](https://www.kiwi-electronics.com/en/usb-to-rs232-rs485-ttl-industrial-isolated-converter-10878)
kost €22,99 excl. en heeft echte ADI magnetische isolatie plus een gescheiden
voeding.
 
> **Eerder plan: Waveshare RS485 TO ETH (B).** Die seriële server is vervangen
> door de USB-adapter nu er een Pi in dezelfde kast staat. Zie
> [Overwogen alternatieven](#waveshare-rs485-to-eth-b--seri%C3%ABle-server-op-het-netwerk).
 
## Behuizing
 
**Italtronic Modulbox 4M voor Raspberry Pi 4**
([Kiwi KW-2771](https://www.kiwi-electronics.com/en/din-rail-case-for-raspberry-pi-4-10369), €13,39 excl. btw).
4 DIN-modules breed (71,3 mm), 90,5 mm diep, **36 mm vrije hoogte boven de
print**, UL94V-0, doorzichtige uitneembare kap, DIN-haak en klikvoet.
 
Die 36 mm is precies waarom deze behuizing werkt met een HAT erop: de PoE HAT
staat op ±11 mm afstandsbussen, de print zelf is 1,6 mm en de ventilator komt
daar nog ±10 mm bovenop — ruwweg 23 mm in totaal. Het past, maar **meet het na
bij ontvangst**, dit is een van de open punten.
 
**Vraag na of het de geventileerde uitvoering is.** De Modulbox XTS bestaat met
en zonder ventilatiesleuven in de zijkanten (aanduiding `H53V`); dat kost niets
extra en is de enige echte koelmaatregel in dit ontwerp. De ventilator op de
PoE HAT verplaatst lucht binnen de doos maar voert geen warmte af — zie open
punt 3.
 
---
 
# Opstelling
 
**Afstand huis → put: 7 m.**
 
Alle elektronica staat binnen in een DIN-railkast. Alleen de sensor en zijn
kabel gaan naar buiten. Er komt één CAT-kabel de kast binnen, die zowel het
netwerk als de voeding levert.
 
```
┌─── technische ruimte — DIN-railkast, geen netspanning ─────────────────┐
│                                                                        │
│   Netgear GS305P                                                       │
│   PoE ────────CAT────► ┌────────────────────────────┐                  │
│                        │  Raspberry Pi 4 (4 GB)     │                  │
│                        │  + PoE HAT                 │                  │
│                        │  in Italtronic 4M          │                  │
│                        │                            │                  │
│                        │  USB ►┌──────────────────┐ │                  │
│                        │       │ USB→RS485        │ │                  │
│                        │       │  A ──────────────┼─┼──► wit           │
│                        │       │  B ──────────────┼─┼──► geel          │
│                        │       │  GND ────────────┼─┼──┐               │
│                        │       └──────────────────┘ │  │               │
│                        │                            │  │               │
│                        │  USB ►┌──────────────────┐ │  │               │
│                        │       │ USB-voedingstap  │ │  │               │
│                        │       │  rood (+5 V) ──[polyfuse 100 mA]──► rood
│                        │       │  zwart (GND) ────┼─┼──┤               │
│                        │       └──────────────────┘ │  │               │
│                        └────────────────────────────┘  │               │
│                                                        ▼               │
│                                          ┌──────────────────┐          │
│                                          │ massa rijgklem   │──► zwart │
│                                          │ + afscherming    │          │
│                                          └──────────────────┘          │
└────────────────────────────────────────────────────┬───────────────────┘
                                                     │
                              7 m afgeschermde kabel (4 aders)
                                                     │
┌─── regenwaterput ───────────────────────────────────┼──────────────────┐
│                                                     ▼                  │
│                  gelmof (onder het deksel, boven max. waterpeil)       │
│                          │ Grove-schroefklemprintje                    │
│                          ▼                                             │
│                  ultrasone sensor ↓ (naar beneden gericht)             │
│                  ~~~~~~~~~~ water ~~~~~~~~~~                           │
└────────────────────────────────────────────────────────────────────────┘
```
 
## Alles komt uit de Pi
 
Met PoE is de Pi het enige voedingspunt in de kast. Er lopen drie dingen naar de
sensor en ze komen alle drie uit een USB-poort:
 
| Wat | Vertrekt bij | Gaat naar |
|-----|--------------|-----------|
| +5 V | USB-voedingstap, via polyfuse 100 mA | sensor VCC (rode ader) |
| massa | USB-voedingstap → massa rijgklem | sensor GND (zwarte ader) |
| A / B | schroefklem van de USB→RS485-adapter | sensor A/B (wit, geel) |
 
De massa's van beide USB-apparaten zijn hoe dan ook dezelfde — het is de massa
van de Pi. Ze samenbrengen op één rijgklem is er vooral voor de netheid, voor
de afscherming van de kabel, en om een meetpunt te hebben.
 
## De polyfuse is niet optioneel
 
Bij een opstelling met een eigen DIN-voeding sloeg een kortsluiting in de
ingegraven kabel gewoon die voeding uit. Nu komt zo'n kortsluiting op de
USB-rail van de Pi terecht.
 
De Pi 4 detecteert overstroom op USB — je ziet dan `over-current change` in de
kernel-log, en het totale USB-budget is 1,2 A — maar daar wil je niet blind op
vertrouwen voor een kabel die 7 m ondergronds ligt tussen een pomp en een put
vol water.
 
**Zet een polyfuse (PTC) van 100 mA in serie met de +5 V-ader**, in de kast, vóór
de rijgklem. De sensor trekt 10 mA typisch en 50 mA bij piek, dus 100 mA
houdstroom geeft ruim marge; hij slaat af rond 200 mA. Kostprijs €0,50, en het
verschil tussen "server plat" en "sensor even weg tot het ding is afgekoeld".
 
## Waarom de elektronica binnen staat en niet aan de put
 
RS485 is gespecificeerd tot 1200 m bij 9600 baud. Met 7 m zit je op 0,6 % van de
specificatie — de afstand is dus geen enkel probleem, en er is geen technische
reden om iets naar buiten te duwen. Binnen houden levert op:
 
* Geen condensatie. Een dichtgemaakte kast in een natte put is doodsoorzaak
  nummer één van hobbyelektronica buiten.
* Geen IP66-behuizing, wartels, droogmiddel of industriële temperatuuronderdelen.
* Firmware-updates en herinstallaties doe je in een kast binnen, niet onder een
  deksel in de regen.
Wat het kost: een 4-aderige afgeschermde kabel in de wachtbuis in plaats van een
CAT-kabel. Dezelfde sleuf, dezelfde namiddag.
 
---
 
# Voeding
 
## De keten
 
```
230 V ──► GS305P ──CAT──► PoE HAT ──► Pi 4 5 V-rail
                                                   │
                                                   ├──► USB-poorten (1,2 A totaal)
                                                   │       ├──► USB→RS485 (±20 mA)
                                                   │       └──► voedingstap ──► sensor (10 mA)
                                                   └──► de Pi zelf
```
 
Er zit geen enkele voeding meer in de kast. De laatste keer dat het 230 V is,
is in de switch.
 
## Waarom 5 V voor de sensor volstaat
 
De sensor doet **3,3–24 V DC**, op vier plaatsen bevestigd in de datasheet van
de fabrikant:
 
* §1.1.1 features — "Wide voltage power supply, suitable for 3.3~24 v"
* §5.1 working parameters — Operating voltage `3.3~24 V DC`
* §5.3 rated electrical condition — min `3.2` / typ **`5.0`** / max `24` V
* §7 reliability tests — testexemplaren draaien `power ON@24V` gedurende 72 u
  bij 65 °C/85 % RV en opnieuw bij −20 °C
Let op die **typische** waarde in §5.3: `5,0 V`. Op 5 V draaien is niet de rand
van de specificatie, het is precies het midden ervan.
 
*Erratum:* de samenvattings-PDF van Seeed vermeldt in de pintabel op p.3
`1 Red VCC 3.3V〜5V power input`, terwijl de specificatietabel op dezelfde
pagina `Operating voltage 3.3〜24 V` zegt. Overnamefout uit een andere variant
van de DYP A-reeks. Voor deze opstelling maakt het niet uit — 5 V valt binnen
beide lezingen.
 
Spanning aan de sensor: USB-VBUS zit rond 5,0 V, min ±60 mV spanningsval over
7 m van 24 AWG bij de piek van 50 mA, min de doorlaatweerstand van de polyfuse
(±1 Ω, dus nog eens 50 mV). De sensor ziet ±4,9 V tegenover een ondergrens van
3,2 V. Geen enkel probleem.
 
## De USB-voedingstap maken
 
Je hebt +5 V en massa nodig uit een USB-poort. Twee wegen:
 
* **Snijd een oude USB-A-kabel door.** De kleuren zijn gestandaardiseerd: rood
  = VBUS, zwart = massa, groen = D+, wit = D−. Knip groen en wit af en isoleer
  ze. Gratis, en de stekker past gewoon.
* **[SparkFun USB Type A Female Breakout](https://www.kiwi-electronics.com/en/sparkfun-usb-type-a-female-breakout-2921)**
  (SF-BOB-12700, €5,19 excl.) als je liever iets soldeerbaars hebt — maar dat is
  een *female* connector, dus je hebt er alsnog een kabel bij nodig.
**Meet de polariteit na met een multimeter** voor je hem aansluit. Kleurcodes in
goedkope kabels zijn meestal correct, maar "meestal" is geen argument als er een
sensor van €39 aan hangt.
 
## Vermogensbudget
 
| Verbruiker | Typisch | Piek |
|------------|---------|------|
| Raspberry Pi 4 + HAOS | 3 W | 8 W |
| Ventilator PoE HAT | 0,3 W | 0,5 W |
| USB→RS485-adapter | 0,1 W | 0,1 W |
| Ultrasone sensor | 0,05 W | 0,25 W |
| **Totaal** | **±3,5 W** | **±9 W** |
 
Zelfs in het krapste scenario — GS305P v1, 802.3af, 12,95 W gegarandeerd aan
het toestel — blijft daar ruim marge over, ook met een SSD erbij later.
 
**Wel nakijken:** het *totale* budget van de switch is 55,5 W (v1) of 63 W
(v2/v3), gedeeld over vier poorten die elk 15,4 respectievelijk 30 W kunnen
leveren. Hangt er al een camera of access point aan, tel het dan even op — vier
volle PoE+-poorten passen niet in 63 W.
 
## Opslag — capaciteit en slijtage
 
**Capaciteit is niet het knelpunt.** Ruwe verdeling bij een draaiende HAOS:
±4 GB voor het besturingssysteem en zijn partities, 2–5 GB voor een handvol
add-ons, 1–3 GB database. De `recorder` bewaart standaard 10 dagen volledige
historiek en ruimt de rest op, dus die database loopt naar een evenwicht in
plaats van eindeloos te groeien. Langetermijnstatistieken blijven wél voor
altijd bewaard, maar dat zijn uurwaarden — deze twee sensoren om de vijf minuten
dragen daar kilobytes per dag aan bij.
 
**Wat kaarten wél vol laat lopen zijn backups.** Home Assistant zet volledige
backups lokaal weg, elk 100 MB tot 1 GB. Een dagelijkse backup zonder
opruimbeleid vult binnen een half jaar elke kaart. Stel dus een bewaartermijn
in, of schrijf backups naar een netwerkschijf.
 
Dat deze Pi bewust een appliance blijft (zie "Deze Pi is een appliance") houdt
het schrijfvolume laag: één Home Assistant plus een handvol lichte containers.
Zou er alsnog een mediabibliotheek of een gameserver op komen, dan verschuift
deze hele afweging.
 
**De echte langetermijnvraag is slijtage.** Home Assistant schrijft continu naar
zijn database en flash heeft een eindig aantal schrijfcycli; een kaart die na
twee of drie jaar corrupt raakt is het klassieke einde van een Pi-server. Daarom
staat er 64 GB in de lijst en geen 32: **een grotere kaart heeft meer
reserveblokken voor wear leveling**, dus dezelfde schrijfbelasting wordt over
meer geheugen uitgesmeerd. Neem een A2-kaart, geen willekeurige uit een schuif.
 
**Koop een blanco kaart, geen kaart met voorgeïnstalleerd OS.** Kiwi verkoopt
microSD's met Raspberry Pi OS erop voor €32,99, maar dat image gooi je meteen
weg — je flasht Home Assistant OS. De blanco
[Silicon Power Superior A2 64 GB](https://www.kiwi-electronics.com/en/silicon-power-superior-a2-64gb-microsdxc-uhs-i-memory-card-with-adapter-20789)
kost €21,84 en is beter geschikt.
 
*Voor deze workload zou een high-endurance-kaart eigenlijk nog beter passen* —
Samsung PRO Endurance of SanDisk Max Endurance, gebouwd voor schrijfcycli in
plaats van doorvoer, hetzelfde profiel als een dashcam. Kiwi voert die niet
meer; elders ±€15–20 voor 64 GB. Wil je alles in één bestelling, neem dan de
Silicon Power.
 
**Het echte antwoord op slijtage is een USB-SSD.** Eén afweging die specifiek is
voor de PoE-variant: een SSD trekt 0,5–0,9 A, terwijl het USB-budget van de Pi 4
1,2 A totaal is, gedeeld met de RS485-adapter en de sensorvoeding. En op 802.3af
deel je diezelfde 12,5 W van de HAT ook nog met de Pi zelf. Het past — Pi idle
±0,6 A plus SSD ±0,9 A blijft onder de 2,5 A die de HAT levert — maar de marge
is krapper dan bij een DIN-voeding van 6,5 A.
 
*Bijkomend voordeel van PoE:* hang je de switch aan een UPS, dan hangt de Pi er
meteen ook aan. Geen aparte UPS nodig, en stroomuitval — de andere manier
waarop SD-kaarten sneuvelen — is dan ook afgedekt.
 
---
 
# DIN-rail indeling
 
Modulebreedte is 17,5 mm per module.
 
| Positie | Onderdeel | Modules | Breedte |
|---------|-----------|---------|---------|
| 1 | Raspberry Pi 4 + PoE HAT in Italtronic 4M | 4 | 71,3 mm |
| 2 | Rijgklem massa (+ afscherming) | 1 | ±6 mm |
| 3 | Rijgklem +5 V | 1 | ±6 mm |
| 4 | Reserve / tweede sensor later | 2 | 35 mm |
|   | **Totaal** | **±8** | **±120 mm** |
 
Neem een **opbouwkast van 12 modules** — dat is de standaardmaat net boven wat
je nodig hebt, en de reserveruimte vult zich vanzelf.
 
**Er zit geen netspanning in deze kast.** Dat maakt de keuze losser dan bij een
verdeelkast: elke goedkope opbouwkast met een 35 mm DIN-rail volstaat, en je
hoeft niets te laten keuren. Wil je later toch een relais voor de pomp
bijzetten, dan verandert dat wel — dan is 230 V terug in beeld en hoort er een
degelijke kast met afdekking te staan.
 
Twee losse onderdelen zitten niet op de rail:
 
* **USB→RS485-adapter** — een dongle met USB-A aan de ene kant en schroefklemmen
  aan de andere. Steek hem in de Pi en zet hem met een colson vast in de
  kabelruimte. Een korte USB-verlengkabel van 15 cm geeft vrijheid om hem netjes
  te leggen.
* **Polyfuse** — soldeer hem in de rode ader tussen de voedingstap en de
  rijgklem, en krimpkous eromheen.
**Kasten, rails en rijgklemmen koop je niet bij Kiwi** — dat is een
elektrogroothandel of bouwmarkt (Rexel, Cebeo, Hubo, Brico).
 
---
 
# Bedrading
 
## De connector van de sensor — lees dit eerst
 
Dit is het punt waar dit project het meeste tijd heeft gekost, dus hier staat
het volledige verhaal.
 
De datasheet noemt de stekker aan het uiteinde van de sensorkabel een
**HY2.0-4Y plug** (§2.1, "① Sensor ② Wire ③ HY2.0-4Y plug"). Drie dingen die je
moet weten voor je iets bestelt:
 
**1. HY2.0 *is* Grove.** De Grove-connector van Seeed is exact deze 4-pins
2,0 mm HY-connector; leveranciers verkopen het onderdeel letterlijk als
*"Grove Female Header – HY2.0-4P"*. Zoeken op "Grove" levert je in Europa veel
meer op dan zoeken op "HY2.0". Dat de datasheet toch "HY2.0" zegt komt doordat
dit geen Seeed-ontwerp is maar een gerebadgede DYP A12A-module — de datasheet is
van de Chinese sensorfabrikant en gebruikt de generieke onderdeelnaam. Je ziet
dat ook aan de productnaam: echte Grove-producten heten bij Seeed *"Grove - ..."*
en deze niet.
 
**2. Het uiteinde van de sensorkabel is de *vrouwelijke* zijde** — een huisje met
gekrompen contactjes, dezelfde soort stekker als het uiteinde van een
Grove-kabel. Je kunt er dus **geen Grove-kabel op aansluiten**; twee
vrouwelijke uiteinden koppelen niet. Grove is geen draad-naar-draad-systeem:
elk kabeluiteinde is ontworpen om in een *socket op een printje* te gaan. Het
standaardonderdeel dat je zoekt is daarom een breakout board, geen kabel.
 
**3. De pinvolgorde wijkt af van de Grove-conventie.** Zie de tabel hieronder.
Het voedingspaar en het signaalpaar staan omgewisseld van positie ten opzichte
van standaard Grove. **Ga dus altijd af op de pinpositie, nooit op de
draadkleur.** Let op: ook die pinpositie is spiegelbeeldig afhankelijk van
welke kant van het huisje je bekijkt — de mating-zijde en de kabel-/wire-zijde
verwisselen links en rechts. "De linkse draad" betekent dus niets zonder erbij
te zeggen van welke kant je kijkt. Vertrouw noch op kleur, noch op links/rechts
— verifieer altijd met een multimeter (zie "De lasverbinding" verderop). Wel
goed nieuws: bij deze sensor is de kleur-naar-functie-toewijzing van het
voedingspaar zelf gewoon standaard gebleven — rood is en blijft VCC, zwart is
en blijft massa. Enkel de *positie* van dat paar in de connector (en dus ook
van het signaalpaar) wijkt af van Grove.
 
| Pin | Grove-standaard | Deze sensor |
|-----|-----------------|-------------|
| 1   | geel — SIG1     | **rood — VCC**     |
| 2   | wit — SIG2      | **zwart — massa**  |
| 3   | rood — VCC      | **geel — RS485-B** |
| 4   | zwart — GND     | **wit — RS485-A**  |
 
## Aansluitingen
 
| Sensor         | Gaat naar                                        |
|----------------|--------------------------------------------------|
| wit (A)        | USB→RS485-adapter, klem `A`                      |
| geel (B)       | USB→RS485-adapter, klem `B`                      |
| rood (VCC)     | +5 V rijgklem ← polyfuse ← rood van de voedingstap |
| zwart (massa)  | massa rijgklem                                   |
| afscherming    | massa rijgklem, **enkel aan de huiskant**        |
 
Op de massa rijgklem komen dus vier dingen samen: het zwart van de voedingstap,
de GND-klem van de RS485-adapter, de zwarte ader naar de sensor en de
afscherming.
 
Sla de GND-klem van de RS485-adapter niet over met het argument "die massa loopt
toch al via USB naar de Pi". Dat klopt elektrisch, maar die klem is wat de
transceiver als referentie gebruikt en hij hoort expliciet aangesloten. Heb je
(nog) geen rijgklem — bijvoorbeeld tijdens een test op de werkbank — dan is dat
verder geen probleem: de rijgklem is puur een fysiek gemak om meerdere massa's
samen te brengen, geen elektrische vereiste. Een paar massadraden gewoon samen
verdraaien (en eventueel solderen of een lever-nut gebruiken) werkt evengoed,
zolang de verbinding stevig is — meerdere losse draden onder één klein
schroefklemmetje proppen zonder ze eerst te verdraaien geeft een onbetrouwbaar
contact.
 
**Geen antwoord? Wissel A en B om** — nog altijd de meest voorkomende oorzaak.
 
## Kabel
 
7 m afgeschermd getwist aderpaar. Beide voldoen:
 
* **Afgeschermde CAT5e, massieve ader** — ±€0,50–0,80/m. Als de wachtbuis nat
  kan staan of de kabel rechtstreeks de grond in gaat, neem dan de
  grondkabelversie met PE-mantel in plaats van pvc voor binnen. Een oude
  patchkabel uit een schuif volstaat als de wachtbuis droog is — controleer wel
  dat het massieve ader is en geen soepele, anders heb je adereindhulzen nodig
  aan de huiskant.
* **LIYCY 2×2×0,34** of gelijkwaardig — de "nette" keuze, even goed.
Spanningsval bij 5 V: 7 m van 24 AWG heen en terug is ±1,2 Ω, dus de piek van
50 mA kost 60 mV. Aders parallel zetten is niet nodig.
 
*Wil je toch marge:* leg het bruine paar parallel met het blauwe voor de
voeding. Halveert de weerstand, kost niets, maar je houdt dan één reservepaar
in plaats van twee over. Op 7 m is dat overbodig.
 
### Wat je niet moet kopen
 
Generieke parallelle ("platte") 4-aderige montagekabel, bv.
[Kiwi Electronics 11457](https://www.kiwi-electronics.com/nl/4-aderige-kabel-26-awg-0-14-mm2-1-meter-11457)
— 4× 26 AWG, niet afgeschermd, aders parallel in plaats van getwist, pvc,
−5…+70 °C, €1,29/m. Afgevoerd om drie redenen:
 
1. **Niet getwist, niet afgeschermd.** RS485 werkt doordat de ontvanger enkel
   naar het *verschil* tussen A en B kijkt, zodat stoorsignaal dat beide draden
   even hard raakt wegvalt. Twisten is wat dat garandeert: de draden wisselen
   voortdurend van plaats, zodat een extern veld ze identiek raakt. Parallelle
   aders op ±1 mm van elkaar zien bijna hetzelfde veld, dus bij 7 m / 9600 baud
   zou dit waarschijnlijk gewoon werken. Maar het tracé passeert netbekabeling
   en waarschijnlijk een regenwaterpomp, en pompmotoren zijn precies de
   inductieve schakelende belasting die spanningspieken op nabije kabels zet.
2. **Ondergrens −5 °C.** Belgische winters gaan daaronder. Het grootste deel van
   het tracé zit in de grond waar het milder is, maar het is een krappe
   specificatie voor iets dat je definitief wegwerkt.
3. **€1,29/m — duurder dan afgeschermde CAT5e.** Er valt hier dus niets af te
   wegen: getwist aderpaar is goedkoper, beter, en houdt reserveaders over.
Voor alle duidelijkheid: twisten is bij 7 m niet strikt *noodzakelijk*. Het is
goedkope verzekering tegen het ene faalmechanisme dat hier echt vervelend is —
sporadische CRC-fouten op een kabel die al in gel zit onderaan een schacht.
 
### Aderindeling met CAT5e
 
Acht aders, vier nodig. **De enige regel die telt: A en B moeten hetzelfde
getwiste paar delen.** Ze over verschillende paren verdelen gooit precies de
common-mode-onderdrukking weg die RS485 doet werken.
 
| Paar         | Gebruik                               |
|--------------|----------------------------------------|
| oranje       | A (wit/oranje ader) / B (oranje ader) |
| blauw        | +5 V / massa                          |
| groen, bruin | reserve                               |
 
Sluit de afscherming aan op de massaklem **enkel aan de huiskant**. Knip de
afschermdraad af aan de putkant en isoleer hem; aan beide kanten aarden maakt
een aardlus.
 
## Huiskant — afwerken in de kast
 
Strip ±5 cm buitenmantel weg en waaier de aders uit:
 
* **wit + geel** → `A` / `B` op de USB→RS485-adapter. 6–7 mm strippen, insteken,
  aandraaien.
* **rood** → +5 V rijgklem.
* **zwart** → massa rijgklem.
* **afscherming** → massa rijgklem.
Twee details:
 
* **Adereindhulzen bij soepele aders.** Schroefklemmen bijten ongelijk op
  soepele draad en losse draadjes waaieren uit richting de buurklem. Krimp er
  adereindhulzen op; een assortiment plus krimptang kost ±€15 en gaat eeuwig
  mee. **Massieve CAT5e heeft geen hulzen nodig** — die gaat er rechtstreeks in.
* **Trekontlasting.** Zet de kabel met een colson vast aan de rail of de kast,
  binnen 10 cm van de klemmen. Een ruk aan 7 m kabel mag nooit tot bij de
  schroeven komen.
## Afsluitweerstand — niet nodig
 
Bij 7 m en 9600 baud: **laat de 120 Ω-afsluitweerstanden weg.** De vuistregel is
dat afsluiting pas telt zodra de kabel lang wordt ten opzichte van de stijgtijd
van het signaal; 9600 baud met traag schakelende transceivers over 7 m zit daar
mijlenver vandaan, en een overbodige 120 Ω belast de driver alleen maar.
 
Zet *enkel* een 120 Ω over A/B aan beide uiteinden als het uitlezen herhaaldelijk
CRC-fouten toont.
 
## Galvanische scheiding
 
De WS-17286 heeft geen isolatie, wel TVS-diodes en 600 W surge-onderdrukking op
de RS485-kant — dat vangt precies het soort inductieve piek op waar je in een
ingegraven tracé naast een pomp last van kunt krijgen.
 
Met PoE is er een bijkomend voordeel dat er bij een DIN-voeding niet was: **de
PoE-standaard schrijft galvanische scheiding voor aan de toestelkant**, en
beide HAT's voldoen daaraan. De hele DC-kant — Pi, beide USB-apparaten, de
sensor — zweeft dus los van de netaarde. Een aardlus tussen
huis en put kan daardoor niet ontstaan, want er is maar één aardpunt in het
hele circuit: de afscherming aan de huiskant.
 
Wil je echte scheiding op de RS485-lijn zelf, dan is de
[WS-15817](https://www.kiwi-electronics.com/en/usb-to-rs232-rs485-ttl-industrial-isolated-converter-10878)
(€22,99 excl.) de directe vervanger: zelfde FT232RL, zelfde schroefklem, plus
ADI magnetische isolatie. Op deze afstand, met de PoE-kant die al isoleert, €11
die je niet hoeft uit te geven. *Let op: er lagen er nog maar 3 op voorraad.*
 
---
 
# In de put
 
## De lasverbinding
 
De eigen kabel van de sensor is maar ±1 m lang, dus een verbinding daar beneden
is onvermijdelijk. Met het juiste onderdeel is dat één printje en geen
knutselwerk:
 
1. **[Grove - Screw Terminal](https://www.kiwi-electronics.com/en/grove-screw-terminal-1907)**
   (Seeed 103020007, Kiwi SS-103020007, €1,59 excl.) — een printje van een paar
   vierkante centimeter met aan de ene kant een Grove-socket en aan de andere
   kant vier schroefklemmen van 3,5 mm, geschikt voor 30–20 AWG.
2. **De sensor plugt er rechtstreeks in.** Zijn stekker klikt in de socket, dus
   de sensor blijft een vervangbaar onderdeel zonder dat er iets geknipt,
   gesoldeerd of gekrompen wordt.
3. **De vier CAT5e-aders gaan in de schroefklemmen.** Massieve ader gaat er
   rechtstreeks in; geen adereindhulzen nodig.
4. **Een gelbox eromheen** — een met gel gevulde behuizing, IP68.
**Meet de pinvolgorde na met een multimeter.** Seeed documenteert nergens welke
schroefklem bij welke Grove-pin hoort. Plug de sensor in het printje en piep door
welke klem bij de rode ader uitkomt — dat is VCC. Doe dat op de werkbank, niet
onderaan de schacht.
 
**De gelbox is het onderdeel dat er echt toe doet.** Een gewone IP67-lasdoos in
een put verzamelt binnenin alsnog condens: 100 % vochtigheid plus dagelijkse
temperatuurschommelingen duwen over de maanden heen vocht langs de
wartelschroefdraad naar binnen. De gel vult de holle ruimte op, zodat er niets
overblijft waarin water kan condenseren. Hetzelfde product als voor
tuinverlichting en aansluitingen van dompelpompen, en herbruikbaar mocht je er
opnieuw bij moeten.
 
*Gekozen gelbox:* **Gotron Ready Box IP68** (120×100×50 mm, met klemmenblok en
kabelwartels, ±€38 incl. btw —
[gotron.be](https://www.gotron.be/ready-box-ip68-met-gel-gevulde-kabeldoos-met-klemmenblok-kabelwartels-120-x-100-x-50-mm.html)).
Vermoedelijk groter dan strikt nodig voor een printje van een paar vierkante
centimeter, maar de kleinere gelboxen — WAGO-gemaat op 221-klemmen, of losse
gel-caps zoals UY2 — bleken lastig te combineren met het Grove-schroefklemprintje:
die zijn gemaakt voor losse verdraaide of geklemde aders zonder printje erbij,
niet voor een board met een ingeplugde stekker erop. Een gelbox is verder
gewoon een met gel gevulde doos met klemmenblok — het printje past er gewoon
in, ook al is er ruimte over.
 
Monteer ze onder het deksel, **boven het maximale waterpeil**, en draag de sensor
op een eigen montagebeugel zodat zijn gewicht nooit aan de lasverbinding hangt.
 
De Grove-connector zelf is **niet** waterdicht, ook al is het sensorhuis IP67 —
precies dat is wat de gel beschermt.
 
## Montage
 
* Monteer de sensor **recht naar beneden** gericht op het water.
* **De dode zone is 0–25 cm.** Monteer hoog genoeg zodat een volledig gevulde put
  nooit binnen 25 cm van de transducer komt, anders slaat de meting nergens meer
  op precies op het moment dat het je interesseert.
* Detectiehoek ±21°, dus houd de kegel vrij van de wand, de toevoer en eventuele
  pompslangen.
---
 
# Modbus-instellingen
 
9600 8N1, geen pariteit. Slave-adres standaard `0x01`, functiecode `0x03` lezen /
`0x06` schrijven, CRC-16/MODBUS.
 
| Register | Decimaal | Omschrijving        | Type   | Opmerkingen              |
|----------|----------|---------------------|--------|--------------------------|
| `0x0100` | 256      | gefilterde afstand  | UINT16 | mm, ±500 ms responstijd  |
| `0x0101` | 257      | actuele afstand     | UINT16 | mm, ±100 ms responstijd  |
| `0x0102` | 258      | temperatuur         | INT16  | 0,1 °C                   |
| `0x0200` | 512      | slave-adres         | UINT16 | 0x01–0xFE, lezen/schrijven |
 
Gebruik `0x0100` (gefilterd) — het peil van een regenwaterput heeft niets te
zoeken in een update sneller dan om de paar minuten.
 
**Let op de verschuiving met één:** datasheets nummeren registers vaak vanaf 1
(stijl 40001), terwijl de adressen op de lijn vanaf 0 tellen. Levert `0x0100`
niets op, probeer dan eerst het naburige adres voor je aanneemt dat de sensor
stuk is. Een Modbus-*exception* als antwoord is goed nieuws: het toestel leeft
en praat.
 
## Testen met mbpoll — losstaande Modbus-check vóór Home Assistant
 
Voor je de sensor in Home Assistant hangt, is het de moeite om er losstaand een
Modbus-request naartoe te sturen vanaf de Pi zelf. Dit is een veel harder bewijs
dat de hele keten klopt dan alleen maar voeding of USB-enumeratie controleren:
een geldig antwoord bevestigt in één keer voeding, RS485-bedrading (A/B én GND),
en de Modbus-instellingen.
 
**Installeren** (zit in de standaard Raspberry Pi OS/Debian-repo's):
 
```
sudo apt update
sudo apt install -y mbpoll
```
 
**Eenmalige poll** van de gefilterde afstand (register `0x0100` = 256):
 
```
mbpoll -m rtu -a 1 -b 9600 -d 8 -s 1 -P none -t 4 -r 256 -c 1 -1 -0 /dev/ttyUSB0
```
 
Uitleg van de vlaggen: `-m rtu` (RTU, geen TCP), `-a 1` (slave-adres 1),
`-b 9600 -d 8 -s 1 -P none` (9600 8N1, geen pariteit), `-t 4` (holding register,
functiecode 03), `-r 256` (`0x0100`), `-c 1` (1 register lezen), `-0` (behandel
`-r` als het letterlijke protocol-adres, niet als Modicon-achtige 1-gebaseerde
nummering — anders speelt de off-by-one hierboven ook hier op), `-1` (één keer
pollen en stoppen in plaats van blijven lussen).
 
Een regel als `[256]: 1959` betekent een geslaagde meting (1959 mm). Een
Modbus-exceptie is ook een goed teken — het toestel leeft en antwoordt, enkel
het register/adres klopt niet. Geen antwoord: wissel eerst A en B om.
 
**Elke seconde herhalen**, met tijdstempel, om een paar minuten lang de
foutratio op te volgen (zoals aangeraden bij de testvalkuilen verderop):
 
```
while true; do
  echo "$(date '+%H:%M:%S') $(mbpoll -m rtu -a 1 -b 9600 -d 8 -s 1 -P none -t 4 -r 256 -c 1 -1 -0 /dev/ttyUSB0 2>&1 | tail -n2 | head -n1)"
  sleep 1
done
```
 
`mbpoll` drukt bij elke aanroep een copyright-preamble af vóór het resultaat;
`tail -n2 | head -n1` houdt enkel de nuttige regel over (bij deze mbpoll-versie
de op-één-na-laatste regel van de uitvoer) en negeert de rest. Ctrl-C om te
stoppen. Draait Home Assistant al in Docker en houdt dat de seriële poort vast,
stop dan eerst de container (`docker compose down`) — anders geeft `mbpoll`
"device busy".
 
## Software — Raspberry Pi OS Lite + Docker
 
**Home Assistant Container**, niet Home Assistant OS. HAOS is een appliance die
de hele kaart opeist en waar je geen eigen containers naast kunt zetten; met
Container is Home Assistant gewoon één container op een normale Linux-machine.
 
Sinds mei 2025 zijn dat ook de enige twee overgebleven methodes — Home Assistant
heeft [Core en Supervised afgevoerd](https://www.home-assistant.io/blog/2025/05/22/deprecating-core-and-supervised-installation-methods-and-32-bit-systems/),
en Supervised was net de tussenweg met zowel de app-store als eigen containers.
De keuze is dus binair.
 
| | Home Assistant OS | Home Assistant Container |
|---|---|---|
| Beslag op het systeem | de hele kaart | één container |
| Eigen containers ernaast | nee | ja |
| Apps / add-onstore | ja | nee |
| Ingebouwde backups | ja | zelf regelen |
| Updates | één klik | jij bepaalt wanneer |
 
Wat je inlevert klinkt erger dan het is: die "apps" zijn zelf gewoon containers.
Mosquitto, ESPHome, InfluxDB, Grafana — allemaal reguliere images die je in
dezelfde `docker-compose.yml` zet. Eén bestand dat je hele installatie beschrijft
en dat je in git kunt zetten, in plaats van klikwerk in een webinterface. Wat je
wél echt mist zijn de ingebouwde backups; dat wordt een `tar` van je config-map
in een cronjob.
 
*Overweeg HAOS alsnog* als je deze Pi puur als appliance wil en er nooit meer
naar wil omkijken — één-klik-updates en automatische backups zijn op een kastje
dat vijf jaar in een kelder moet staan geen kleinigheid.
 
**Onderliggend systeem: Raspberry Pi OS Lite, 64-bit.** Lite, want er komt geen
scherm aan te pas. 64-bit, want 32-bit is in diezelfde aankondiging afgevoerd.
 
### docker-compose.yml
 
```yaml
services:
  homeassistant:
    container_name: homeassistant
    image: ghcr.io/home-assistant/home-assistant:stable
    restart: unless-stopped
    network_mode: host
    privileged: true
    environment:
      TZ: Europe/Brussels
    volumes:
      - ./homeassistant:/config
      - /run/dbus:/run/dbus:ro
    devices:
      - /dev/serial/by-id/usb-FTDI_FT232R_USB_UART_XXXX-if00-port0:/dev/ttyUSB0
```
 
Die laatste regel is de elegante oplossing voor het hernummerprobleem: **op de
host map je het stabiele `by-id`-pad, in de container heet het gewoon
`/dev/ttyUSB0`.** Docker lost de symlink op bij het starten van de container.
Je krijgt dus de stabiliteit van `by-id` én een simpele naam in je configuratie.
 
Zoek het exacte pad op met `ls -l /dev/serial/by-id/` nadat je de adapter hebt
ingeplugd.
 
## Home Assistant — configuratie
 
Met de USB-adapter praat HA rechtstreeks Modbus RTU over de seriële poort —
geen TCP-gateway ertussen.
 
```yaml
modbus:
  - name: regenwaterput
    type: serial
    port: /dev/ttyUSB0        # de naam ín de container, zie devices-mapping
    baudrate: 9600
    bytesize: 8
    parity: N
    stopbits: 1
    sensors:
      - name: Regenwaterput afstand
        slave: 1
        address: 256          # 0x0100, gefilterd
        input_type: holding
        unit_of_measurement: mm
        scan_interval: 300
      - name: Regenwaterput temperatuur
        slave: 1
        address: 258          # 0x0102
        input_type: holding
        data_type: int16
        scale: 0.1
        precision: 1
        unit_of_measurement: "°C"
        scan_interval: 300
```
 
**Draai je HA rechtstreeks op de host in plaats van in een container**, zet dan
hier het volledige `/dev/serial/by-id/...`-pad. Nooit kaal `/dev/ttyUSB0` op de
host: dat hernummert zodra er een tweede USB-apparaat bij komt, en dan is je
sensor op een dinsdag zomaar weg.
 
De sensor geeft de **afstand tot het water**, niet het peil. Reken om met een
template-sensor zodra je de put hebt opgemeten:
 
```yaml
template:
  - sensor:
      - name: Regenwaterput peil
        unit_of_measurement: cm
        state: >
          {{ (MONTAGEHOOGTE_MM - states('sensor.regenwaterput_afstand') | float(0)) / 10 }}
```
 
## Ventilator van de PoE HAT
 
**Officiële PoE+ HAT:** niets te doen. De Raspberry Pi-firmware regelt de
ventilator op processortemperatuur via de `rpi-poe-plus` device tree overlay,
en die zit in Home Assistant OS. Dat is de belangrijkste praktische reden om
deze te verkiezen boven de Waveshare.
 
**Waveshare HAT (B):** die stuurt zijn ventilator via een PCF8574 IO-expander op
de I²C-bus, met een Waveshare-script. **Zet het schakelaartje op de
hardwarematige automatische stand en laat dat script erbuiten.** Home Assistant
OS is een afgesloten systeem, en je wil niet dat de koeling van je server
afhangt van een Python-script dat een update moet overleven.
 
Het OLED-schermpje op de (B) is dan een extraatje dat niets doet. Wil je het
toch gebruiken, dan is dat een argument om Home Assistant Supervised op
Raspberry Pi OS te draaien in plaats van HAOS — meer onderhoud voor een
schermpje in een dichte kast.
 
---
 
# Volgorde van werken
 
1. **Eerst op de werkbank.** Pi, PoE HAT, USB-adapter, voedingstap,
   Grove-schroefklemprintje, sensor en 2 m restdraad op de keukentafel, gevoed
   vanaf een PoE-poort. Kijk eerst op het typeplaatje van de GS305P welke versie
   het is, zodat je de juiste HAT bestelt.
2. **Lok de USB-belasting uit.** Beide USB-apparaten erin, dan
   `dmesg | grep -i current`. Meet ook de USB-VBUS na onder belasting voor je
   de sensor definitief aanhangt.
3. **Schrijf Raspberry Pi OS Lite 64-bit met de Raspberry Pi Imager.** Klik in
   de Imager door naar de **aanpassingsinstellingen** vóór je schrijft: hostname,
   gebruikersnaam, en **SSH aan met je publieke sleutel** in plaats van een
   wachtwoord. Dat is precies wat de waarschuwing op de webshop bedoelt met
   "niet geschikt voor headless gebruik" — een kant-en-klaar image met desktop
   heeft die instellingen niet, en dan sta je zonder scherm voor een gesloten
   deur. Wifi kun je overslaan, je hangt aan de kabel.
4. **Docker installeren** (`curl -fsSL https://get.docker.com | sh`), de
   `docker-compose.yml` uit dit document neerzetten, `docker compose up -d`.
   Zoek eerst het `by-id`-pad van de adapter op met `ls -l /dev/serial/by-id/`
   en vul dat in bij `devices:`.
5. Laat de `modbus`-integratie de sensor binnenhalen. Haal er een afstandsmeting
   uit, ijk tegen een rolmeter, en test tegen water in een emmer.
6. Meet de put op: maximaal waterpeil tot montagepunt, controleer >25 cm marge
   op de dode zone. Noteer de montagehoogte voor de template-sensor.
7. Bouw de kast op: rail, Pi-behuizing, rijgklemmen, polyfuse in de rode ader.
8. Pas dan de 7 m kabel afknippen, trekken, de huiskant afwerken en de gelbox
   maken.
Een bedradingsfout opsporen is een heel ander karwei zodra ze in gel zit
onderaan een schacht.
 
Testvalkuilen om te onthouden:
 
* **Controleer de versie van de switch vóór je bestelt.** Een officiële PoE+ HAT
  op een GS305P v1 gaat niet aan — dat is geen defect, hij weigert terecht.
* **Test de USB-poorten mét de HAT erop**, niet los. Dat is een ander circuit.
* **Meet de polariteit van de USB-voedingstap** met een multimeter. Rood/zwart
  is gestandaardiseerd, maar niet gegarandeerd.
* **Piep de schroefklemmen van het Grove-printje door** met de sensor erin
  geplugd, vóór je iets aansluit. De klemmen zijn niet gedocumenteerd en de
  pinvolgorde van deze sensor wijkt af van de Grove-conventie.
* **Geen antwoord → wissel A en B om** voor je iets anders verdenkt.
* **Vergeet de GND-klem van de RS485-adapter niet.**
* **IJk op drie bekende afstanden** (0,5 / 1,0 / 2,0 m) met een rolmeter, zo
  krijg je schaal en offset.
* **Test tegen water, niet tegen een muur.** Een wateroppervlak weerkaatst
  anders dan een vlakke vaste stof; richt van ±1 m naar beneden op een emmer.
* **Blijf buiten de dode zone van 0–25 cm** tijdens het testen, anders lijken de
  metingen kapot terwijl de sensor perfect werkt.
* **Laat het een paar minuten uitlezen** en let op de foutratio. Sporadische
  CRC-fouten wijzen op kabel, afsluitweerstand of voeding — niet op de sensor.
* **Gebruik `mbpoll` voor een losstaande Modbus-check** (zie "Testen met mbpoll"
  hierboven) vóór je de sensor in Home Assistant hangt — een geldig antwoord
  bevestigt in één keer voeding, A/B-bedrading, GND en de Modbus-instellingen.
---
 
# Materiaallijst
 
Prijzen bij Kiwi zijn **exclusief 21 % btw**, zoals hun webshop ze toont.
Geverifieerd op 19 augustus 2026; het Grove-schroefklemprintje op 22 augustus 2026.
 
## Bij Kiwi Electronics
 
| # | Onderdeel | Artikel | Excl. btw | Voorraad |
|---|-----------|---------|-----------|----------|
| 1 | Raspberry Pi 4 Model B — 4 GB | [KW-2504](https://www.kiwi-electronics.com/nl/raspberry-pi-4-model-b-4gb-4268) | €89,99 | op voorraad |
| 2 | Power over Ethernet HAT (B), 802.3af | [WS-18014](https://www.kiwi-electronics.com/en/power-over-ethernet-hat-b-for-rpi-3bplus-4b-802-3af-poe-network-11413) | €18,99 | 10 st. |
| 3 | DIN-rail behuizing Italtronic 4M voor Pi 4 | [KW-2771](https://www.kiwi-electronics.com/en/din-rail-case-for-raspberry-pi-4-10369) | €13,39 | 27 st. |
| 4 | Industrial USB naar RS485 converter | [WS-17286](https://www.kiwi-electronics.com/en/industrial-usb-to-rs485-converter-9944) | €11,99 | 90 st. |
| 5 | microSD 64 GB blanco — Silicon Power Superior A2 | [Kiwi](https://www.kiwi-electronics.com/en/silicon-power-superior-a2-64gb-microsdxc-uhs-i-memory-card-with-adapter-20789) | €21,84 | 27 st. |
| 6 | Grove - Screw Terminal (sensoraansluiting in de put) | [SS-103020007](https://www.kiwi-electronics.com/en/grove-screw-terminal-1907) | €1,59 | 68 st. |
|   | **Subtotaal Kiwi** | | **€157,79** | |
|   | *incl. 21 % btw* | | *±€191* | |
 
## Elders
 
| # | Onderdeel | Waar | Raming |
|---|-----------|------|--------|
| 7 | Opbouwkast DIN-rail, 12 modules | elektrogroothandel / bouwmarkt | €15–25 |
| 8 | 2× doorvoerrijgklem 2,5 mm² | idem | €3 |
| 9 | Polyfuse PTC 100 mA | elektronicawinkel / uit de schuif | €0,50 |
| 10 | USB-A-kabel om door te knippen (voedingstap) | uit de schuif | — |
| 11 | 10 m afgeschermde CAT5e, massieve ader | bouwmarkt | €5–10 |
| 12 | Gelbox: Gotron Ready Box IP68 (120×100×50 mm, klemmenblok + 4 kabelwartels) | [Gotron](https://www.gotron.be/ready-box-ip68-met-gel-gevulde-kabeldoos-met-klemmenblok-kabelwartels-120-x-100-x-50-mm.html) | €38 (incl. btw, actieprijs) |
| 13 | Montagebeugel sensor | bouwmarkt / 3D-print | €5 |
|   | **Subtotaal elders** | | **€66–82** |
 
**Totaal ±€257–273 incl. btw**, waarvan €109 de Raspberry Pi zelf is. De sensor
(€39) heb je al.
 
## Optioneel / situationeel
 
| Onderdeel | Wanneer | Raming |
|-----------|---------|--------|
| Geïsoleerde USB→RS485 [WS-15817](https://www.kiwi-electronics.com/en/usb-to-rs232-rs485-ttl-industrial-isolated-converter-10878) i.p.v. WS-17286 | als je isolatie op de lijn zelf wil | +€11 |
| USB-verlengkabel 15 cm | om de adapter netjes te leggen | €3 |
| [SparkFun USB-A female breakout](https://www.kiwi-electronics.com/en/sparkfun-usb-type-a-female-breakout-2921) | als je liever soldeert dan knipt | €5,19 |
| Adereindhulzen + krimptang | enkel bij soepele aders | €15 |
| 2× weerstand 120 Ω | enkel als de test herhaaldelijk CRC-fouten toont | €0,20 |
| 18-modulekast i.p.v. 12 | als je later pomp of tweede sensor wil | +€10 |
| USB-SSD als bootmedium | als SD-corruptie een probleem wordt | €30+ |
 
---
 
# Overwogen alternatieven
 
## Manieren om de sensor aan te sluiten
 
Drie routes bekeken voor de verbinding tussen de Grove-stekker van de sensor en
de 7 m kabel. Het schroefklemprintje wint met ruime voorsprong.
 
| | Grove - Screw Terminal | Board-connector + solderen | Contactjes uit het huisje |
|---|---|---|---|
| Prijs | €1,59 | ±€3 per 10 | gratis |
| Werk | insteken en aandraaien | 4 draden aan 2 mm-pootjes solderen, op perfboard | vier vergrendelingen terugduwen |
| Sensor blijft insteekbaar | ja | ja | nee, tenzij je de contacten terugschuift |
| Extra nodig | niets | perfboard, krimpkous, soldeerbout | niets |
| Verkrijgbaar | Kiwi, zelfde bestelling | Kiwi | — |
 
**Board-connector + solderen** ([Grove - Universal 4-Pin
Connector](https://www.kiwi-electronics.com/en/grove-universal-4-pin-connector-10-pack-2413),
10-pack) werkt wel degelijk: het is de tegenhanger waar de sensorstekker in
klikt, en je soldeert vier draden aan de pootjes. Maar de pootjes staan op 2 mm
van elkaar en zijn dun, dus je hebt een stukje perfboard nodig om er iets
mechanisch degelijks van te maken. Meer werk voor hetzelfde resultaat.
 
**Contactjes uit het huisje halen** is wat je doet als je het printje niet hebt:
met een fijn schroevendraaiertje duw je de vier vergrendelingen terug en
schuiven de gekrompen draden eruit. Volledig omkeerbaar, want je kunt ze er
later weer inschuiven. Prima noodoplossing, maar het printje kost €1,59.
 
**Wat níét werkt, en waar dit project op vastliep:** een Grove-kabel kopen om op
de sensor te steken. Elk Grove-kabeluiteinde is vrouwelijk, net als dat van de
sensor. Grove is een board-ecosysteem, geen draad-naar-draad-systeem — het
standaardonderdeel is altijd een printje met een socket.
 
## DIN-railvoeding in plaats van PoE
 
De vorige versie van dit design gebruikte een
[Mean Well HDR-60-5](https://www.kiwi-electronics.com/en/din-rail-power-supply-5v-6-5a-20392)
(KW-3517, €19,99 excl., 5,0–5,5 V instelbaar, 6,5 A, 3 modules) die zowel de Pi
als de sensor voedde: 5 V op GPIO-pin 4 en massa op pin 6 voor de Pi, en een
parallelle tak via rijgklemmen naar de sensor.
 
| | PoE-HAT | DIN-voeding |
|---|---------|-------------|
| 230 V in de kast | nee | ja |
| Modules op de rail | ±8 | ±11 |
| Voeding sensor | USB-poort van de Pi + polyfuse | eigen rail, los van de Pi |
| Warmte in de kast | ventilator op de HAT | open vraag |
| GPIO-header | bezet door de HAT | vrij |
| Extra faalpunt | de HAT | geen |
| Prijs | €18,99 | €19,99 |
 
**Niet gekozen**, omdat de prijs een wasstraat is en PoE twee dingen oplost die
anders open bleven: netbekabeling naar de kast, en koeling van de Pi in een
dichte behuizing. Wat je ervoor inlevert is dat de sensorvoeding aan de USB-rail
van de Pi hangt in plaats van aan een eigen voeding — vandaar de polyfuse.
 
Terugvallen op deze variant is eenvoudig: HDR-60-5 op de rail, twee draadjes
naar GPIO-pin 4 en 6, en de rode ader van de sensor naar de +5 V-rijgklem in
plaats van naar de USB-voedingstap. Doe dat als de PoE HAT niet blijkt te
negotiëren met de switch.
 
## PoE-splitter naar USB-C
 
[PoE Splitter — Gigabit — USB-C](https://www.kiwi-electronics.com/en/poe-splitter-gigabit-usb-c-10868)
(KW-2894, €9,99 excl., 802.3af/at, 5 V / 2,4 A). Goedkoper dan een HAT, laat de
GPIO-header vrij en past in elke behuizing.
 
**Niet gekozen**: niet op voorraad, en een splitter is een los kastje met een
USB-C-kabel erin — een Pi 4 is kieskeurig over wat er op zijn USB-C hangt en
zakt bij spanningsdip weg met onderspanningsmeldingen. De HAT voedt de Pi via
de GPIO-header en omzeilt dat probleem.
 
## Waveshare RS485 TO ETH (B) — seriële server op het netwerk
 
Een eerdere versie van dit design gebruikte deze gateway
([Kiwi WS-20978](https://www.kiwi-electronics.com/en/rs485-to-rj45-ethernet-tcp-ip-to-serial-rail-mount-support-20109), €19,49 excl., DIN-rail).
Nu er een Pi in dezelfde kast staat, is de USB-adapter de eenvoudiger weg.
 
Wat de gateway erbovenop doet: hij is een zelfstandig netwerkapparaat met eigen
IP, webinterface, firmware en een Modbus RTU↔TCP-vertaling. Voor Home Assistant
is het eindresultaat identiek — dezelfde registers, dezelfde entiteit. Het
verschil zit in waar de RS485-draad fysiek eindigt:
 
| | USB-adapter | Gateway |
|---|-------------|---------|
| Draad eindigt op | de Pi | een eigen kastje op de rail |
| Pi uit / herinstallatie | sensor onbereikbaar | sensor blijft op het LAN |
| Voeding | USB van de Pi | 9–24 V → **eigen voeding nodig** |
| Configuratie | `/dev/serial/by-id/...` in YAML | IP-adres, webinterface, firmware |
| Prijs | €11,99 | €19,49 + voeding |
 
**Niet gekozen**, omdat het voordeel — de sensor overleeft een Pi die je
herinstalleert — bij één sensor in eigen huis weinig waard is, terwijl de kost
concreet is: 230 V terug in de kast, een IP-adres om te beheren en een apparaat
meer dat firmware heeft. De kabel omprikken van de ene adapter naar de andere is
drie minuten werk als je ooit van gedacht verandert.
 
## Geïsoleerde RS485 HAT i.p.v. USB
 
[Waveshare 2-Channel Isolated RS485 HAT](https://www.kiwi-electronics.com/en/2-channel-isolated-rs485-expansion-hat-for-raspberry-pi-11412)
(WS-17221, €18,49 excl.) — SC16IS752 over SPI, echte isolatie. Netter in de kast
dan een dongle uit een USB-poort.
 
**Niet gekozen**: niet op voorraad met onbekende leverdatum, en — beslissend —
de GPIO-header is nu bezet door de PoE HAT. Twee HAT's stapelen kan alleen met
een doorvoerheader en genoeg hoogte in de behuizing; dat is meer gedoe dan een
USB-dongle waard is.
 
## SenseCAP S2110 — Grove naar Modbus RS485
 
[SenseCAP S2110 Sensor Builder](https://www.kiwi-electronics.com/en/sensecap-s2110-grove-to-modbus-rs485-converter-11264) —
Seeeds eigen kastje dat een Grove-sensor omzet naar Modbus RS485, bedoeld om
LoRaWAN-sensoren mee te bouwen.
 
**Niet gekozen**: deze sensor *spreekt* al Modbus RS485; er valt niets om te
zetten. Het is een oplossing voor het omgekeerde probleem, en veel duurder dan
het schroefklemprintje van €1,59.
 
## Kant-en-klare ultrasone sensor met PoE en ethernet
 
Die bestaan, maar enkel in de industriële klasse — niets in het hobbysegment:
 
* [HAWK Sultan Acoustic Wave PoE](https://www.hawkmeasurement.com/product/AW-PoE/)
  — echt PoE met Modbus over TCP/IP, tot 60 m. Enkel op offerte, industriële
  prijzen, hopeloos overgedimensioneerd voor een regenwaterput.
* [InfraSensing ultrasone niveausensor](https://infrasensing.com/sensors/sensor_fuel_level.asp)
  + [BASE-5 gateway](https://infrasensing.com/sensors/baseunit.asp) — PoE-basisunit
  die SNMP en Modbus TCP spreekt. Nog altijd twee componenten, datacenterprijzen.
* [APG web-enabled ultrasone niveausensor](https://apgsensors.com/product/web-enabled-ultrasonic-level-sensor-and-modbus-controller/)
  — ethernet + Modbus, opnieuw controller plus sensor.
**Waarom er niets goedkoops bestaat:** een PoE-PD-ingang plus een ethernet-PHY
kost meer dan een ultrasone sensor van €39, en de volumemarkt voor
tankbewaking is naar batterij + LoRaWAN / wifi getrokken.
 
## Olimex ESP32-POE-ISO als tussenstap
 
Één bordje van ±€30: PoE in, ethernet uit, rechtstreeks in Home Assistant via
ESPHome. Heeft nog een RS485-transceivermodule nodig (MAX3485, ±€2).
 
**Niet gekozen**, omdat met de Pi in dezelfde kast er niets tussen hoeft te
zitten. Blijft interessant als je ooit een tweede meetpunt hebt op een plaats
zonder Pi — dan heb je daar wel al PoE nodig, wat na dit project geen probleem
meer is.
 
## LoRaWAN — afgevoerd
 
Bv. [Milesight EM400-UDL](https://www.milesight.com/iot/product/lorawan-sensor/em400-udl),
een echt kant-en-klare IP67 ultrasone niveausensor. Batterij, geen kabel, maar
een LoRaWAN-gateway nodig.
 
Afgevoerd omwille van de betonnen put. Strikt genomen geen kooi van Faraday — bij
868 MHz is de golflengte ±35 cm en staat de wapening typisch op 15–20 cm, dus de
openingen zitten rond λ/2: aanzienlijke verzwakking, maar geen volledige
afsluiting. De echte doodsoorzaken voor de verbinding zijn:
 
* **nat beton** — erg verliesrijk bij 868 MHz; een permanent vochtige putwand
  kost veel meer dan de ±10 dB van een droge muur
* **het deksel** — een betonnen deksel ±20–30 dB; een gietijzeren mangatdeksel is
  in feite een massavlak en zo goed als fataal
* **de grondlaag**, indien ingegraven — natte grond verzwakt tientallen dB per
  meter bij 868 MHz; zelfs 30 cm boven het deksel is een zware klap
* **het water zelf** absorbeert sterk, en het volume ervan is nu net de variabele
  die je meet — een volle put betekent dus een slechtere verbinding
LoRaWAN in watermeterputten en mangaten *is* een gangbare commerciële toepassing
en SF12 geeft een enorm linkbudget, maar het is daar ook faalmechanisme nummer
één en moeilijk te voorspellen zonder ter plaatse te meten. De gebruikelijke
oplossing is een externe antenne aan een staartje door het deksel — en dan trek
je alsnog een kabel en verdampt het voordeel van draadloos.
 
Op 7 m van het huis is de kabel triviaal, dus LoRaWAN zou betekenen dat je het
RF-risico betaalt zonder er iets voor terug te krijgen.
 
*Goedkope controle mocht je het ooit heroverwegen:* leg een gsm op 4G in de
gesloten put. Andere band, maar als 800/900 MHz mobiel er niet uit raakt, zal
868 MHz LoRa het ook moeilijk krijgen.
 
---
 
# Open vragen
 
1. **Resterend PoE-budget.** 55,5 W gedeeld over vier poorten. Hangt er al een
   camera of access point aan, tel dan op wat er nog over is voor de Pi (±9 W
   bij piek).
2. **Verdraagt de HAT de USB-belasting?** Dit verdient meer aandacht dan de
   negotiatie zelf. De oorspronkelijke officiële PoE HAT uit 2018 had een
   [berucht probleem](https://forums.raspberrypi.com/viewtopic.php?t=220984)
   waarbij de USB-poorten `over-current` meldden en USB-apparaten niet werkten;
   opgelost met een hardware-revisie, maar het faalmechanisme is precies wat
   hier telt. De schakelvoeding op een PoE-HAT moet de inschakelstroom van
   USB-apparaten aankunnen, en in dit ontwerp hangt de sensor aan USB.
   **Controle:** HAT erop, beide USB-apparaten erin, dan
   `dmesg | grep -i current`.
3. **Is de Italtronic-variant geventileerd?** De Modulbox XTS bestaat in een
   uitvoering met ventilatiesleuven in de zijkanten (aanduiding `H53V`) en
   eentje zonder. Uit de Kiwi-pagina blijkt niet welke zij verkopen. Vraag het
   na of kijk bij ontvangst.
   *Waarom dit ertoe doet:* de ventilator op de PoE HAT lost de warmtevraag
   **niet** op. Een ventilator in een dichte doos verplaatst lucht, hij voert
   geen warmte af — die moet er nog altijd uit door de kunststof wanden. Wat de
   ventilator wel doet is de stilstaande luchtlaag boven de SoC wegblazen en de
   warmte naar de wanden brengen; dat scheelt, maar het is geen ventilatie.
   *Waarom het waarschijnlijk toch goed komt:* gemeten waarden voor een Pi 4 in
   een dichte behuizing zonder ventilatie zijn 50 °C idle en 84 °C onder een
   volledige stresstest op vier kernen. Home Assistant doet dat laatste nooit —
   een paar procent CPU, met pieken bij een update of databaseherbouw. Realistisch
   werkpunt: 55–65 °C in een warme technische ruimte, ruim onder de 80 °C waar
   throttling begint.
   Meet `vcgencmd measure_temp` na een week. Zit je boven 70 °C, dan is de
   volgorde: geventileerde variant → kap open of sleuven bijboren → koelvinnen.
   Het vervangen van de HAT helpt niet.
4. **Past de Pi met PoE HAT in de Italtronic 4M?** 36 mm vrije hoogte tegen naar
   schatting 23 mm HAT-hoogte inclusief ventilator. Zou moeten passen, maar
   meet na bij ontvangst — en kijk meteen of de ventilator nog lucht krijgt met
   de kap dicht.
5. **Poorttoegang Italtronic.** Blijven USB en RJ45 bereikbaar met de kap dicht?
   De USB-adapter én de voedingstap moeten er permanent in blijven zitten, dus
   er moeten twee USB-poorten bruikbaar zijn.
6. **Montagehoogte sensor.** De put opmeten: van maximaal waterpeil tot deksel
   moet er >25 cm marge op de dode zone overblijven. Nodig voor de
   template-sensor die afstand naar peil omrekent.
7. **Wachtbuis.** Ligt er al een buis van het huis naar de put, of moet er een
   sleuf gegraven worden?
## Opgelost
 
* ~~Spanningsbereik sensor~~ — **3,3–24 V**, typisch 5,0 V. Draait rechtstreeks
  op 5 V vanaf een USB-poort van de Pi.
* ~~Welke connector heeft de sensor, en hoe sluit je hem aan?~~ — een
  **HY2.0-4Y**, oftewel een **Grove**-connector, en het is de *vrouwelijke*
  zijde. Aansluiten doe je met een [Grove - Screw
  Terminal](https://www.kiwi-electronics.com/en/grove-screw-terminal-1907)
  (€1,59, Kiwi): sensor erin pluggen, CAT5e in de schroefklemmen. Zie "De
  connector van de sensor" en "De lasverbinding". Een Grove-*kabel* werkt niet —
  die is aan beide uiteinden vrouwelijk.
* ~~Voeding van de Pi~~ — PoE via een HAT. Geen 230 V in de kast.
* ~~Doet de switch actieve of passieve PoE?~~ — actief. De GS305P is
  standaardconform (802.3af bij v1, 802.3at bij v2/v3), dus de handshake werkt.
* ~~Officiële PoE+ HAT of Waveshare?~~ — hangt van de switchversie af. Bij
  GS305P v2/v3 de officiële (Class 4 / 802.3at, goedkoper, firmware regelt de
  ventilator); bij v1 de Waveshare HAT (B), want de officiële negotieert niet
  op 802.3af.
* ~~Loopt de sensorvoeding door de Pi?~~ — Ja, bij PoE onvermijdelijk: via een
  USB-poort. Vandaar de polyfuse van 100 mA in de +5 V-ader.
* ~~HAOS of Docker?~~ — **Home Assistant Container** op Raspberry Pi OS Lite
  64-bit. HAOS eist de hele kaart op en laat geen eigen containers toe; de
  tussenweg "Supervised" is sinds mei 2025 afgevoerd.
* ~~Draait er meer op deze Pi?~~ — nee, bewust niet. Minecraft, Plex en
  mediaopslag gaan naar een aparte machine; zie "Deze Pi is een appliance" voor
  de drie redenen (warmte, PoE-vermogensbudget, en het koppelen van de uptime
  van een sensor aan een gameserver).
* ~~Welke HAT lost de koeling op?~~ — geen van beide. Een ventilator in een
  dichte doos verplaatst lucht, hij voert geen warmte af. Koeling is een vraag
  over de behuizing, niet over de HAT. Zie open punt 3.
* ~~Kan de Waveshare gateway de sensor voeden?~~ — Niet van toepassing meer.
* ~~Keuze PoE-splitter~~ — HAT in plaats van splitter; de Pi 4 is kieskeurig
  over USB-C-voeding.
* ~~Plaats van de seriële server~~ — binnen, met 7 m RS485 naar de put. De
  RS485-specificatie gaat tot 1200 m.
* ~~Afsluitweerstand 120 Ω~~ — niet nodig bij 7 m / 9600 baud.
* ~~Aantal voedingen~~ — nul. Alles komt van PoE.
* ~~Hoe controleer je dat de sensor überhaupt iets doet, los van Home
  Assistant?~~ — een losstaande Modbus-read met `mbpoll` rechtstreeks vanaf de
  Pi. Zie "Testen met mbpoll" — een geldig antwoord (of zelfs een
  Modbus-exceptie) bewijst in één keer voeding, RS485-bedrading en de
  Modbus-instellingen, zonder dat er iets ultrasoons hoeft te worden
  opgevangen. Bevestigd werkend: `[256]: 1959` (1959 mm) op de eerste poging.
* ~~Past het Grove-schroefklemprintje in de gelbox?~~ — gekozen: **Gotron Ready
  Box IP68** (120×100×50 mm, klemmenblok + 4 kabelwartels, ±€38 incl. btw).
  Waarschijnlijk ruimer dan strikt nodig voor dit printje, maar de kleinere
  gelboxen (WAGO-gemaat op 221-klemmen, of gel-caps zoals UY2) zijn onhandig te
  combineren met het Grove-schroefklemprintje: die zijn gemaakt voor losse
  aders zonder printje erbij, niet voor een board met een ingeplugde stekker
  erop. Zie "De lasverbinding" en "Materiaallijst".