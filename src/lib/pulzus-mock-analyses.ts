// PULZUS — Szonda mock adatok
// 4 propaganda cikk + 1 normál referencia cikk + 1 penzugyi clickbait pelda
// Beilleszthető: fact-check.ts vagy egy külön mockData.ts fájlba

export type Verdict = "IGAZOLT" | "CÁFOLT" | "TORZÍTOTT";
export type Stance = "SUPPORTS" | "CONTRADICTS" | "MIXED" | "IRRELEVANT";
export type EmotionalTarget = "félelem" | "harag" | "bizonytalanság" | "büszkeség" | "megvetés";

export interface PsychologicalQuote {
  quote: string;
  technique: string;
  emotional_target: EmotionalTarget;
  analysis: string;
}

export interface HeadlineAnalysis {
  original: string;
  clickbait_score: number;         // 0-100
  accuracy_score: number;          // 0-100 (mennyire fedi a valóságot)
  psychological_hook: string;      // pl. "titok + veszély kombináció"
  vs_body_summary: string;         // mit ígér a cím vs mit mond a cikk
  missing_context: string;         // mit hallgat el szándékosan
}

export interface Source {
  url: string;
  domain: string;
  credibility: number;             // 0-100
  bias: string;
  label: string;
  stance: Stance;
  summary: string;
}

export interface ManipulationIndex {
  clickbait: number;
  emotional_amplification: number;
  omitted_context: number;
  false_urgency: number;
  misleading_framing: number;
  overall: number;
  dominant_technique: string;
}

export interface NarrativeChain {
  first_seen: string;
  appearances: number;
  domains: string[];
  mutation_summary: string;
  coordination_level: "Koordinált terjesztés" | "Párhuzamos megjelenés" | "Első előfordulás";
}

export interface TargetAudienceAnalysis {
  primary_target: string;
  exploited_fears: string[];
  assumed_prejudices: string[];
  conclusion: string;
}

export interface FactCheckResult {
  id: string;
  url: string;
  submitted_at: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  portal_rating: {
    domain: string;
    credibility: number;
    bias: string;
    why_trusted_or_not: string;
  };
  headline_analysis: HeadlineAnalysis;
  psychological_quotes: PsychologicalQuote[];
  psychological_conclusion: string;
  manipulation_index: ManipulationIndex;
  sources: Source[];
  omitted_context: string;
  target_audience: TargetAudienceAnalysis;
  narrative_chain: NarrativeChain;
}

// ─────────────────────────────────────────────
// CIKK 1 — Magyar Nemzet: „Tisza titkos terve"
// ─────────────────────────────────────────────
export const analysis_1: FactCheckResult = {
  id: "mock-001",
  url: "https://magyarnemzet.hu/kulfold/2026/04/tisza-titkos-terve-kiszivargott-vereseg-majdan-magyar",
  submitted_at: "2026-04-20T10:00:00Z",
  verdict: "TORZÍTOTT",
  confidence: 82,
  explanation:
    "A cikk egyetlen, ellenőrizhetetlen forrásra — Csercsa Balázs, egy volt párttag — támaszkodik, akinek szavahihetősége erősen megkérdőjelezhető. A dokumentum autenticitását semmilyen független szervezet nem erősítette meg. A Majdan-párhuzam tudatos framet jelent: a 2014-es ukrán eseményeket a köztudatban erőszakos puccsal azonosítják, holott az valójában tömegdemonstrációk sorozata volt. Az Igor Moszijcsuk-idézet forrása egy pro-orosz ukrán ellenzéki politikus, akinek megbízhatósága vitás. A cikk ezeket az állításokat valós tényként kezeli, anélkül hogy bármilyen ellenvéleményt vagy cáfolatot bemutatna.",
  portal_rating: {
    domain: "magyarnemzet.hu",
    credibility: 18,
    bias: "extreme-right-government",
    why_trusted_or_not:
      "A Magyar Nemzet a Mediaworks Hungary Zrt. tulajdonában van, amely közvetetten állami médiavagyonhoz kötődik. Az MBFC (Media Bias/Fact Check) adatbázisa szerint erősen jobboldali elfogultsággal és alacsony tényszerűségi pontszámmal rendelkezik. A cikkek rendszeresen tükrözik a kormánypárti narratívát, elsődleges forrásként jellemzően kormányközeli vagy ellenőrizhetetlen anyagokat használnak.",
  },
  headline_analysis: {
    original: "Itt a Tisza Párt titkos dokumentuma – zavargásokat szervezhetnek",
    clickbait_score: 91,
    accuracy_score: 22,
    psychological_hook: "Titok + fenyegetés + bizonyosság látszata",
    vs_body_summary:
      "A cím 'titkos dokumentumot' és 'zavargásokat' állít, de a cikk törzsszövege maga is elismeri, hogy az egyetlen forrás egy disgruntled ex-párttag, és hogy a dokumentum valódiságát senki nem igazolta. A cím tényt sugall ott, ahol csak feltételezés van.",
    missing_context:
      "Nem kerül szóba, hogy Csercsa Balázs személyes érdeke fűződhet a Tisza lejáratásához. Nincs megjelenítve a Tisza Párt cáfolata. Nincs független forrás a dokumentum hitelességéről.",
  },
  psychological_quotes: [
    {
      quote: "az eseményeknek az ukrajnai 2014-es Majdanhoz hasonló zavargások irányába kell elmozdulniuk",
      technique: "False equivalence + Fear appeal",
      emotional_target: "félelem",
      analysis:
        "A Majdan-hivatkozás tudatosan aktiválja azt a narratívát, hogy az ellenzéki tüntetés = külföldi irányítású puccs. Ez az összekapcsolás automatikusan a 'hazaáruló' keretet hozza működésbe az olvasóban.",
    },
    {
      quote: "ukrán menekülteket próbálnak bevonni tiltakozó akciókba Magyarországon",
      technique: "Out-group threat + Manufactured conspiracy",
      emotional_target: "harag",
      analysis:
        "A 'külföldi beavatkozás' narratíva klasszikus autoriter propaganda-elem: a belső ellenzéket idegen érdekek kiszolgálójává degradálja. A forrás (Moszijcsuk) egy pro-orosz politikus, akinek hitelessége nyugati körökben minimális.",
    },
    {
      quote: "toborzást ukrán szolgálatok végeznek, hogy politikai nyomást gyakoroljanak Magyarországon",
      technique: "Unverified claim as fact + Authority appeal",
      emotional_target: "félelem",
      analysis:
        "Titkosszolgálati összeesküvés-állítás, amelyet semmilyen bizonyíték nem támaszt alá. A 'szolgálatok' szó megjelenése automatikusan komolyságot és veszélyt sugall az olvasónak.",
    },
  ],
  psychological_conclusion:
    "A cikk háromrétegű félelempumpa: egyszerre aktiválja a külföldi fenyegetéstől, az utcai erőszaktól és a demokratikus intézmények megkerülésétől való félelmet. A Majdan-keret azt sugallja, hogy az ellenzéki szavazás automatikusan instabilitáshoz vezet. Ez tipikus 'choice suppression' technika választások előtt: a saját szavazók mobilizálása félelemen keresztül.",
  manipulation_index: {
    clickbait: 91,
    emotional_amplification: 88,
    omitted_context: 85,
    false_urgency: 79,
    misleading_framing: 90,
    overall: 87,
    dominant_technique: "Fear appeal + False equivalence (Majdan-frame)",
  },
  sources: [
    {
      url: "https://ellenpont.hu",
      domain: "ellenpont.hu",
      credibility: 15,
      bias: "extreme-right-pro-government",
      label: "Kormányközeli propagandaportál",
      stance: "SUPPORTS",
      summary:
        "Az Ellenpont a Magyar Nemzet fő hivatkozási forrása ebben a cikkben — tehát egy kormányközeli lap egy másik kormányközeli lapot idéz. Ez nem független forrásmegerősítés.",
    },
    {
      url: "https://en.wikipedia.org/wiki/Igor_Mosiychuk",
      domain: "wikipedia.org",
      credibility: 72,
      bias: "neutral-encyclopedic",
      label: "Enciklopédiai forrás",
      stance: "MIXED",
      summary:
        "Moszijcsuk volt ukrán képviselő, akit 2017-ben korrupció miatt elítéltek, és pro-orosz beállítottsága közismert. Állításai különösen megkérdőjelezhetők.",
    },
  ],
  omitted_context:
    "A cikk nem közli: (1) Csercsa Balázs miért hagyta el a Tisza Pártot és milyen motivációja lehet a nyilvánosságra hozatalra; (2) a Tisza Párt cáfolatát a dokumentummal kapcsolatban; (3) hogy Moszijcsuk pro-orosz politikus; (4) hogy hasonló 'választási zavargás' narratívát Oroszország rendszeresen alkalmaz nyugati demokráciák destabilizálására.",
  target_audience: {
    primary_target: "Idősebb, vidéki, Fidesz-szimpatizáns szavazók",
    exploited_fears: [
      "Külföldi beavatkozástól való félelem",
      "Utcai erőszaktól való félelem",
      "Ukrajna-ellenesség",
      "Politikai instabilitástól való félelem",
    ],
    assumed_prejudices: [
      "Az ellenzék külföldi érdekeket szolgál",
      "A tüntetések automatikusan veszélyesek",
      "Ukrajna = instabilitás",
    ],
    conclusion:
      "A cikk célja a Fidesz-szavazók választási motivációjának növelése a fenyegetettség-érzet erősítésével, valamint az ellenzéki szavazók elbizonytalanítása.",
  },
  narrative_chain: {
    first_seen: "2026-04-08",
    appearances: 7,
    domains: ["ellenpont.hu", "magyarnemzet.hu", "origo.hu", "pesti.srácok.hu", "alapjogokert.hu"],
    mutation_summary:
      "A narratíva az Ellenponton jelent meg először mint 'belső dokumentum', majd a Magyar Nemzet és az Origo átvette és fokozatosan erősítette: 'titkos terv' → 'Majdanra készülnek' → 'ukrán toborzás' → 'bizonyított összeesküvés'. Minden iterációban bizonyosabbá vált az eredeti állítás.",
    coordination_level: "Koordinált terjesztés",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// CIKK 2 — Magyar Nemzet: „Brüsszel és Magyar Péter háborúba sodornának"
// ─────────────────────────────────────────────────────────────────────────
export const analysis_2: FactCheckResult = {
  id: "mock-002",
  url: "https://magyarnemzet.hu/belfold/2026/04/brusszel-es-magyar-peter-haboruba-sodornak-magyarorszagot-allitsuk-meg-oket",
  submitted_at: "2026-04-20T10:05:00Z",
  verdict: "TORZÍTOTT",
  confidence: 91,
  explanation:
    "Ez a cikk lényegében egy Fidesz-kampányüzenet újraközlése sajtó formájában, szerkesztői értékelés és kontextus nélkül. Az állítás — miszerint Magyar Péter és Brüsszel háborúba sodorná Magyarországot — sem tényekkel, sem oksági logikával nincs alátámasztva. A hivatkozott 'botrányos hangfelvétel' kontextusából kiragadott mondat, amelyet a Magyar Nemzet tényként kezel. A 'háborúba sodor' framing valós politikai vitákat (védelempolitika, NATO-kötelezettségek) leegyszerűsíti életveszélyes fekete-fehér választássá.",
  portal_rating: {
    domain: "magyarnemzet.hu",
    credibility: 18,
    bias: "extreme-right-government",
    why_trusted_or_not:
      "Azonos a fenti értékeléssel: állami médiavagyonhoz kötődő, erősen kormánypárti portál. Ez a konkrét cikk különösen aggályos, mert nyíltan kampányüzenetet közöl ('Csak a Fidesz a biztos választás!') hírként csomagolva.",
  },
  headline_analysis: {
    original: "Brüsszel és Magyar Péter háborúba sodornák Magyarországot, állítsuk meg őket!",
    clickbait_score: 95,
    accuracy_score: 8,
    psychological_hook: "Egzisztenciális fenyegetés + Cselekvésre szólítás (call to action)",
    vs_body_summary:
      "A cím háborút ígér tényként, de a cikk törzse csupán egy Fidesz-videót és egy kontextusából kiragadott Magyar Péter-idézetet tartalmaz. Semmiféle konkrét politikai lépést nem nevez meg, ami háborúhoz vezet.",
    missing_context:
      "Nem kerül szóba, hogy Magyarország NATO-tag, ami kötelezettségekkel jár. Nem jelenik meg, hogy az EU egységes védelempolitikája többtagállami egyeztetés eredménye. Magyar Péter tényleges hadügyi programja nem szerepel.",
  },
  psychological_quotes: [
    {
      quote: "Brüsszel és Magyar Péter háborúba sodornák Magyarországot",
      technique: "False cause + Catastrophizing",
      emotional_target: "félelem",
      analysis:
        "A 'háborúba sodor' ige cselekvő, szándékos károkozást sugall — mintha az ellenzék és Brüsszel aktívan akarna Magyarországnak ártani. Ez nem politikai kritika, hanem ellenségkép-konstruálás.",
    },
    {
      quote: "Ha te sem szeretnél háborút, akkor vasárnap menj el, és szavazz a Fideszre!",
      technique: "False dichotomy + Appeal to fear",
      emotional_target: "félelem",
      analysis:
        "Klasszikus hamis dichotómia: Fidesz = béke, ellenzék = háború. Ez a keret teljesen kizárja a komplex védelempolitikai kérdések érdemi vitáját, és az élet vs. halál szintjére egyszerűsíti a szavazói döntést.",
    },
    {
      quote: "G…ci nagy háború lesz",
      technique: "Selective quoting + Context stripping",
      emotional_target: "félelem",
      analysis:
        "Egy privát hangfelvételből kiragadott mondat, amelyet a Magyar Nemzet bizonyítékként kezel arra, hogy Magyar Péter 'tudja' és 'akarja' a háborút. A kontextus — valószínűleg egy általános geopolitikai helyzetértékelés — teljes mértékben hiányzik.",
    },
  ],
  psychological_conclusion:
    "Ez a cikk a propaganda legtisztább formája: kampányüzenet, amely hírcikk formáját ölti. Az egzisztenciális fenyegetés (háború) és az egyetlen megoldás (Fidesz-szavazat) kombinációja a legősibb politikai manipulációs technika. A cél nem tájékoztatás, hanem az amygdala aktiválása — a félelemközpont bekapcsolt állapotában az emberek a biztonságot ígérő ismerős felé fordulnak.",
  manipulation_index: {
    clickbait: 95,
    emotional_amplification: 97,
    omitted_context: 92,
    false_urgency: 98,
    misleading_framing: 96,
    overall: 96,
    dominant_technique: "Existential threat framing + False dichotomy",
  },
  sources: [
    {
      url: "https://magyarnemzet.hu/kulfold/2026/04/haboru-europa-keszul-magyar-peter",
      domain: "magyarnemzet.hu",
      credibility: 18,
      bias: "extreme-right-government",
      label: "Saját korábbi cikk — körköros hivatkozás",
      stance: "SUPPORTS",
      summary: "A cikk önmagára hivatkozik korábbi cikken keresztül. Ez nem független forrásmegerősítés.",
    },
  ],
  omitted_context:
    "Nem szerepel: (1) Magyarország NATO-tagságából eredő védelmi kötelezettségek; (2) mi a Tisza Párt tényleges hadügyi és külpolitikai programja; (3) hogy az EU védelempolitikai döntéseit tagállami szavazással hozzák; (4) hogy a 'háborúba sodor' narratívát az orosz állami média is aktívan terjeszti hasonló formában.",
  target_audience: {
    primary_target: "Bizzonytalan, békepárti, idősebb szavazók",
    exploited_fears: [
      "Háborútól való egzisztenciális félelem",
      "Gyermekeik/unokáik katonai behívásától való félelem",
      "EU-tól és 'Brüsszeltől' való idegenkedés",
    ],
    assumed_prejudices: [
      "Az EU beavatkozik Magyarország ügyeibe",
      "Az ellenzék nem hazafias",
      "A béke csak az aktuális kormánnyal tartható fenn",
    ],
    conclusion:
      "Maximális hatékonyságú rövid kampányüzenet, amely a legegyszerűbb érzelmi triggerrel — a fizikai biztonság fenyegetésével — operál, közvetlen szavazásra buzdítással zárva.",
  },
  narrative_chain: {
    first_seen: "2026-03-15",
    appearances: 34,
    domains: ["magyarnemzet.hu", "origo.hu", "hirado.hu", "pestisracok.hu", "mandiner.hu"],
    mutation_summary:
      "A 'háborúba sodor' narratíva a kampány egyik legtöbbet ismételt üzenete. Márciusban még 'Brüsszel háborút akar' formában jelent meg, majd Magyar Péter személye egyre erőteljesebben belekerült, végül a kampányzárón a két szereplő (Brüsszel + Magyar Péter) összeolvadt egyetlen ellenségképpé.",
    coordination_level: "Koordinált terjesztés",
  },
};

// ─────────────────────────────────────────────────────────────────
// CIKK 3 — Origo: „Katasztrófához vezetne Magyar Péter energiaterve"
// ─────────────────────────────────────────────────────────────────
export const analysis_3: FactCheckResult = {
  id: "mock-003",
  url: "https://www.origo.hu/belpol/2026/04/magyar-peter-tisza-part-energiaterv-csercsa-balazs",
  submitted_at: "2026-04-20T10:10:00Z",
  verdict: "TORZÍTOTT",
  confidence: 78,
  explanation:
    "A cikk valós tény körül épít torz narratívát: igaz, hogy a Tisza Párt energiaátállási programja tartalmaz az orosz energiáról való leválásra vonatkozó terveket, és ez rövid távon áremelkedéssel járna. Azonban a '145 000 Ft/hó' és az '1000 Ft/l benzin' számok a szintén kormányközeli Ellenpont által készített szcenáriókból származnak, amelyek a legrosszabb esetet veszik alapul, és nem tükrözik a tervezett szociális kompenzációs mechanizmusokat. A 'katasztrófa' és 'ellehetetlenítés' szavak súlyosan elfogult keretet alkotnak ahhoz képest, amit a cikk tényszerűen alátámaszt.",
  portal_rating: {
    domain: "origo.hu",
    credibility: 16,
    bias: "extreme-right-government",
    why_trusted_or_not:
      "Az Origo 2015-ben vált kormányközeli médiummá. Az MBFC adatbázisa 'Very Low' tényszerűségi besorolást ad a portálnak. Számos alkalommal közölt szerkesztett vagy kontextusából kiragadott információkat politikai célokra, amit a független médiaügyeleti szervezetek dokumentáltak.",
  },
  headline_analysis: {
    original: "Katasztrófához vezetne Magyar Péter energiaterve – ennyivel fizetnének többet a családok",
    clickbait_score: 83,
    accuracy_score: 31,
    psychological_hook: "Pénzügyi veszteség + Bizonyosság látszata ('ennyivel')",
    vs_body_summary:
      "A cím 'katasztrófát' és pontos számokat ígér. A cikk azonban egyetlen forrásból (Ellenpont) és egyetlen forgatókönyvből (legrosszabb eset, kompenzáció nélkül) dolgozik. A 'katasztrófa' szó nem szerepel a hivatkozott tanulmányban — a cikk adja hozzá.",
    missing_context:
      "Nem jelenik meg a Tisza Párt válasza ezekre a számokra. Nincs szó arról, hogy az energiaátállás EU-s szinten zajlik és uniós finanszírozás kíséri. Nem szerepel az összehasonlítás: más EU-tagállamok hogyan kezelték az energiaátállást.",
  },
  psychological_quotes: [
    {
      quote: "egy átlagos család kiadásai akár havi 145 ezer forinttal is növekedhetnek",
      technique: "Selective worst-case + False precision",
      emotional_target: "félelem",
      analysis:
        "A 'akár' szó elvész az olvasó számára — a szám konkrétumként rögzül. Ez a módszer klasszikus: a lehetséges maximumot valószínűként kommunikálják, miközben az 'akár' fedezi az újságírót.",
    },
    {
      quote: "A benzin ára literenként akár ezer forint környékére emelkedhet",
      technique: "Anchoring + Fear of economic collapse",
      emotional_target: "bizonytalanság",
      analysis:
        "Az ezer forintos szám horgonyhatásként működik: az olvasó ezután minden energiaár-emelkedést ehhez a referenciapont-hoz fog viszonyítani, még ha a valós szám alacsonyabb is.",
    },
    {
      quote: "ellehetetlenítenék a magyar családok mindennapjait",
      technique: "Catastrophizing + Us vs. Them",
      emotional_target: "harag",
      analysis:
        "Az 'ellehetelenít' ige szándékos kártevést sugall — mintha a Tisza Párt tudatosan akarna ártani a 'magyar családoknak'. Ez dehumanizálja az ellenzéki politikát és demonizálja annak képviselőit.",
    },
  ],
  psychological_conclusion:
    "A cikk a pénzügyi biztonságtól való félelmet és a 'megszorítás' szótól való klasszikus kondicionált reakciót használja. A konkrét számok (145 ezer forint, ezer forint/liter) megadják a hitelességet, miközben a forrás megbízhatóságát és a kontextust elhallgatják. Az olvasó úgy érzi, számokat látott, valójában propagandát olvasott.",
  manipulation_index: {
    clickbait: 83,
    emotional_amplification: 79,
    omitted_context: 88,
    false_urgency: 71,
    misleading_framing: 84,
    overall: 81,
    dominant_technique: "False precision + Worst-case-as-norm framing",
  },
  sources: [
    {
      url: "https://ellenpont.hu/tarsadalmi-katasztrofahoz-vezetne-magyar-peterek-energiaatallasi-terve",
      domain: "ellenpont.hu",
      credibility: 15,
      bias: "extreme-right-pro-government",
      label: "Kormányközeli propagandaportál",
      stance: "SUPPORTS",
      summary:
        "Az egyetlen forrás a szintén kormányközeli Ellenpont. Az Origo tehát egy másik kormánypárti médiumot idéz tényként. Független energiagazdasági elemzés nem szerepel.",
    },
    {
      url: "https://www.iea.org/topics/energy-security",
      domain: "iea.org",
      credibility: 95,
      bias: "neutral-international",
      label: "Nemzetközi Energiaügynökség",
      stance: "MIXED",
      summary:
        "Az IEA adatai szerint az EU-szintű energiaátállás rövid távon 15-30%-os rezsiemelkedéssel jár, nem a cikkben szereplő 200-400%-ossal. A különbséget a szociális kompenzációs mechanizmusok tompítják.",
    },
  ],
  omitted_context:
    "Hiányzik: (1) a Tisza Párt saját energiatervének részletei, amelyek kompenzációs mechanizmusokat is tartalmaznak; (2) összehasonlítás más EU-tagállamok energiaátállási tapasztalataival; (3) az EU energiaátállási támogatási csomagjai; (4) hogy Magyarország jelenlegi energiafüggősége Oroszországtól geopolitikai kockázatot jelent.",
  target_audience: {
    primary_target: "Gazdaságilag kiszolgáltatott, rezsicsökkentés-kedvezményezett háztartások",
    exploited_fears: [
      "Rezsi megemelkedésétől való félelem",
      "Életszínvonal csökkenésétől való félelem",
      "Megszorításoktól való kondicionált félelem",
    ],
    assumed_prejudices: [
      "A rezsicsökkentés a kormány jótékonysága, nem politikai eszköz",
      "Az energiaátállás csak árat jelent, hasznot nem",
      "Az ellenzék megszorításokat hoz",
    ],
    conclusion:
      "A cikk a Fidesz leghatékonyabb kampányüzenetének — a rezsicsökkentés védelmének — megerősítésére épül, a jövőbeli fájdalomtól való félelemmel operálva.",
  },
  narrative_chain: {
    first_seen: "2026-03-20",
    appearances: 18,
    domains: ["ellenpont.hu", "origo.hu", "magyarnemzet.hu", "hirado.hu"],
    mutation_summary:
      "A Tisza energiaterv-kritika az Ellenponton jelent meg először 'megszorítás' keretben, majd az Origo 'katasztrófa'-ként definiálta, a Magyar Nemzet pedig a konkrét számokat emelte ki ismételten. A három platform összehangoltan adagolta a narratívát.",
    coordination_level: "Koordinált terjesztés",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CIKK 4 — Magyar Nemzet (Poszt-trauma): „Magyar Péter még kormányra se került"
// ─────────────────────────────────────────────────────────────────────────────
export const analysis_4: FactCheckResult = {
  id: "mock-004",
  url: "https://magyarnemzet.hu/poszt-trauma/2026/04/magyar-peter-kormany-tisza-akkumulator-gyar",
  submitted_at: "2026-04-20T10:15:00Z",
  verdict: "TORZÍTOTT",
  confidence: 85,
  explanation:
    "A cikk egy valós tényt — a Greenpeace visszavont akkumulátorgyár-aggályát — úgy interpretálja, mintha ez bizonyítaná, hogy a Tisza Párt kampányhazugságokat terjesztett. Valójában a Greenpeace saját mérési eredményeire alapozva módosította álláspontját, ami a tudományos önkritika normális működése — nem politikai lejáratás visszavonása. A cikk ezenkívül a Barátság kőolajvezeték megjavulását összeesküvés-elmélettel köti össze ('furcsa módon megjavult'), és a választási eredménnyel hozza kapcsolatba. Ez ellenőrizhetetlen inszinuáció.",
  portal_rating: {
    domain: "magyarnemzet.hu",
    credibility: 18,
    bias: "extreme-right-government",
    why_trusted_or_not:
      "Azonos az előző értékeléssel. Külön figyelmet érdemel, hogy ez a 'Poszt-trauma' rovatban jelent meg, amely nyíltan véleményes tartalmakat közöl — mégis hírszerűen terjesztik.",
  },
  headline_analysis: {
    original: "Magyar Péter még kormányra se került, máris magyarázkodhat – nem akárhonnan rántották le a leplet",
    clickbait_score: 88,
    accuracy_score: 19,
    psychological_hook: "Lelepleződés narratíva + Titokzatos forrás ígérete ('nem akárhonnan')",
    vs_body_summary:
      "A cím azt sugallja, hogy Magyar Péter valami komolyat kénytelen magyarázni, és hogy fontos forrástól szivárgott ki valami kompromittáló. A cikk törzse egy Greenpeace-mérést és egy csővezeték-javítást tartalmaz, amelyek valójában nem bizonyítják a Tisza Párt tudatos hazugságát.",
    missing_context:
      "A cím nem közli, hogy véleménycikkről van szó. Nem jelenik meg, hogy a Greenpeace független civil szervezet, nem a Tisza Párt eszköze. A 'leplet rántják le' framing büntetlenül sugall hazugságot anélkül, hogy bizonyítaná.",
  },
  psychological_quotes: [
    {
      quote: "Úgy rácuppantak a történetre, hogy olyat rég nem látott a világ",
      technique: "Ridicule + Hyperbole",
      emotional_target: "megvetés",
      analysis:
        "A 'rácuppant' szó az ellenzéket kizárólag opportunista, vérszomjas politikusként jeleníti meg. A hiperbola ('olyat rég nem látott a világ') a gúny eszközével érvényteleníteni igyekszik a tényleges aggodalmat.",
    },
    {
      quote: "a balliberális sajtó kezdte állítólagos jegyzőkönyvekkel",
      technique: "Discrediting by association + Scare quotes",
      emotional_target: "megvetés",
      analysis:
        "Az 'állítólagos' jelző alapos bizonyíték nélkül kérdőjelezi meg más médiumok forrásait. A 'balliberális sajtó' összefoglalás egységes ellenségképet alkotva utasít el minden kritikus médiát.",
    },
    {
      quote: "Nem mondhatok el mindent, mert akkor megbukunk!",
      technique: "Selective quote as proof of conspiracy",
      emotional_target: "harag",
      analysis:
        "Egyetlen, kontextusából teljesen kiragadott mondatot tesz a cikk lezárásává — mintha ez bizonyítaná a teljes ellenzéki program titkos, káros valóságát. Az olvasó ezt záróakkordként, igazolásként érzékeli.",
    },
  ],
  psychological_conclusion:
    "A cikk a 'lelepleződött hazug' narratívát építi fel, amely különösen hatékony, mert az olvasóban azt az érzetet kelti, hogy 'már tudta, hogy hazudnak'. Ez a megerősítési torzítás (confirmation bias) célzott kiaknázása — nem új információt közöl, hanem a meglévő hitet erősíti meg látszólagos bizonyítékkal.",
  manipulation_index: {
    clickbait: 88,
    emotional_amplification: 76,
    omitted_context: 90,
    false_urgency: 62,
    misleading_framing: 87,
    overall: 81,
    dominant_technique: "Confirmation bias exploitation + False revelation framing",
  },
  sources: [
    {
      url: "https://www.greenpeace.org/hungary",
      domain: "greenpeace.org",
      credibility: 78,
      bias: "center-left-environmental",
      label: "Független civil szervezet",
      stance: "CONTRADICTS",
      summary:
        "A Greenpeace egy független civil szervezet, nem politikai párt eszköze. A mérési eredmény módosítása a tudományos önkritika, nem 'leleplezés'. A cikk ezt téves kontextusban értelmezi.",
    },
  ],
  omitted_context:
    "Hiányzik: (1) a Greenpeace nyilatkozata arról, hogy miért módosítottak; (2) más független mérések eredményei az akkumulátorgyárak szennyezéséről; (3) hogy a Barátság-kőolajvezeték leállásának technikai okai dokumentáltak és nem összefüggnek választásokkal; (4) hogy véleménycikkről van szó.",
  target_audience: {
    primary_target: "Fidesz-szimpatizánsok, akik megerősítést keresnek",
    exploited_fears: [
      "Félelem az 'álhírektől' (ironikusan fordítva az ellenzékre)",
      "Megcsalástól, becsapástól való félelem",
    ],
    assumed_prejudices: [
      "A civil szervezetek az ellenzék politikai eszközei",
      "A külföldi finanszírozású szervezetek Magyarország ellen dolgoznak",
      "Az ellenzék hazudik, csak nem tudnak bizonyítani",
    ],
    conclusion:
      "Ez a cikk elsősorban a már meggyőzött olvasóknak szól — nem megtér, hanem megerősít. A választás előtti utolsó motiváció: 'látod, megint bebizonyosodott'.",
  },
  narrative_chain: {
    first_seen: "2026-04-17",
    appearances: 5,
    domains: ["magyarnemzet.hu", "origo.hu", "pestisracok.hu"],
    mutation_summary:
      "Friss narratíva, amely a választás előtti 48 órában jelent meg. A Greenpeace-mérés visszavonásából fakadt, és gyorsan terjedt a kormánypárti médiumokon 'a Tisza lebukott' keretben.",
    coordination_level: "Koordinált terjesztés",
  },
};

// ──────────────────────────────────────────────────────────────────────────────────────
// CIKK 5 — Telex / G7: „Napi hat tehervonat használja az ezer milliárdból felújított vonalat"
// ──────────────────────────────────────────────────────────────────────────────────────
export const analysis_5: FactCheckResult = {
  id: "mock-005",
  url: "https://telex.hu/g7/vallalat/2026/04/20/budapest-belgrad-kelebia-vasutvonal-tehervonatok-szemelyszallitas-etcs",
  submitted_at: "2026-04-20T10:20:00Z",
  verdict: "IGAZOLT",
  confidence: 94,
  explanation:
    "A cikk adatai iparági forrásokból, hatósági nyilatkozatokból és nyilvános közleményekből származnak. A teherforgalmi adatok (napi 6,3 vonat átlag, rekordnapon 14 vonat) egybeesnek a MÁV publikált adataival. Az ETCS-átadás késedelmét a minisztériumi közlemények maguk is elismerik. A szerző által bemutatott idővonal (5 csúszott határidő 2025-2026 között) nyilvános sajtóközleményekből dokumentált. A cikk politikai következtetései (a Fidesz szerette volna a választás előtt megnyitni) véleményelemek, de ezeket elkülöníti a tényektől, és nem állítja bizonyítottabb szinten, mint amit az adatok alátámasztanak.",
  portal_rating: {
    domain: "telex.hu",
    credibility: 84,
    bias: "center-left",
    why_trusted_or_not:
      "A Telex 2020-ban jött létre, részben az Indexről elbocsátott újságírók által. Olvasói és reklámbevételekből finanszírozódik, nem kötődik állami vagy pártforráshoz. Az MBFC szerint 'High' tényszerűségi besorolással rendelkezik. A G7 gazdasági szerkesztőség különösen adatintenzív, forrásokra épülő módszertanáról ismert. A portál bal-közép szerkesztői vonalvezetése jellemző, de ez a cikkben nem befolyásolja a tényállást.",
  },
  headline_analysis: {
    original: "Napi hat tehervonat használja az ezer milliárdból felújított Budapest–Kelebia-vonalat",
    clickbait_score: 12,
    accuracy_score: 96,
    psychological_hook: "Adatvezérelt meglepetés — a szám önmagáért beszél",
    vs_body_summary:
      "A cím pontosan közli a cikk fő megállapítását. A törzs részletesen alátámasztja a számot, összehasonlítja más határátkelőkkel, és elmagyarázza a kapacitás-kihasználatlanság okait.",
    missing_context:
      "A cikk megemlíti, de részletesebben kifejthetné a szerbiai oldal infrastrukturális korlátait mint a forgalom egyik fő akadályát. Ez azonban nem manipulatív elhallgatás, hanem terjedelmi döntés.",
  },
  psychological_quotes: [
    {
      quote: "A kapacitás szempontjából nem indokolható tehát a kétszer két vágányos átépítés",
      technique: "Data-driven conclusion",
      emotional_target: "bizonytalanság",
      analysis:
        "Ez nem manipulációs technika, hanem logikus következtetés adatokból. Az olvasó bizonytalansága ez esetben a cél: a közpénzek hatékony felhasználásának kérdése jogos közügy.",
    },
    {
      quote: "szerencsés esetben is csak idén ősszel sikerülhet az ETCS vonatbefolyásoló rendszer engedélyeztetési eljárását lezárni",
      technique: "Honest uncertainty communication",
      emotional_target: "bizonytalanság",
      analysis:
        "A feltételes mód és az 'ősszel' időbecslés az újságíró becsületes kommunikációját mutatja: nem állít többet, mint amennyit az adatok alátámasztanak. Ez az újságírás bevett módszere.",
    },
  ],
  psychological_conclusion:
    "A cikk alacsony manipulációs szintje éppen azáltal hatásos, hogy tényekre épít és nem érzelmi triggert alkalmaz. Az adatok önmagukban teszik fel a kérdést: megérte-e az ezer milliárd forint? Ez jogos újságírói kérdés, nem propaganda.",
  manipulation_index: {
    clickbait: 12,
    emotional_amplification: 8,
    omitted_context: 14,
    false_urgency: 5,
    misleading_framing: 9,
    overall: 10,
    dominant_technique: "Nincs domináns technika — adatalapú újságírás",
  },
  sources: [
    {
      url: "https://www.mav.hu",
      domain: "mav.hu",
      credibility: 75,
      bias: "neutral-official",
      label: "MÁV sajtóosztály — hivatalos forrás",
      stance: "SUPPORTS",
      summary: "A MÁV idézett nyilatkozatai konzisztensek a cikk megállapításaival. Az ETCS-csúszásokat maga a MÁV ismeri el.",
    },
    {
      url: "https://www.era.europa.eu",
      domain: "era.europa.eu",
      credibility: 93,
      bias: "neutral-eu-regulatory",
      label: "Európai Vasúti Ügynökség",
      stance: "SUPPORTS",
      summary: "Az ERA dokumentációja alátámasztja az engedélyeztetési idővonalra vonatkozó becsléseket.",
    },
    {
      url: "https://www.portfolio.hu",
      domain: "portfolio.hu",
      credibility: 81,
      bias: "center-economic",
      label: "Gazdasági hírportál",
      stance: "SUPPORTS",
      summary: "A Portfolio által közölt miniszteri bejelentések konzisztensek a cikk idővonalával.",
    },
  ],
  omitted_context:
    "A cikk részletesebben tárgyalhatná a szerbiai vasúti fejlesztések állását, amely szintén kulcstényező a forgalom növekedéséhez. Ez azonban nem érdemi hiányosság.",
  target_audience: {
    primary_target: "Közgazdasági érdeklődésű, kritikus gondolkodású olvasók",
    exploited_fears: [],
    assumed_prejudices: [],
    conclusion:
      "A cikk nem célcsoportot manipulál, hanem közérdekű kérdésre keres adatalapú választ. Az olvasó maga vonhatja le a következtetéseket.",
  },
  narrative_chain: {
    first_seen: "2026-04-20",
    appearances: 1,
    domains: ["telex.hu"],
    mutation_summary: "Első és egyelőre egyetlen megjelenés, friss cikk.",
    coordination_level: "Első előfordulás",
  },
};

// ──────────────────────────────────────────────────────────────────────────────────────
// CIKK 6 — Pénzcentrum: „Megszólaltak a tőzsdeguruk: ilyen részvényeket kell venni"
// ──────────────────────────────────────────────────────────────────────────────────────
export const analysis_6: FactCheckResult = {
  id: "mock-006",
  url: "https://www.penzcentrum.hu/vilag/20251127/megszolaltak-a-tozsdeguruk-ilyen-reszvenyeket-kell-most-venni-ha-valaki-nagyot-akar-kaszalni-1189422",
  submitted_at: "2026-04-20T10:25:00Z",
  verdict: "TORZÍTOTT",
  confidence: 74,
  explanation:
    "A cikk valós, ellenőrizhető adatokat közöl a JP Morgan ajánlásáról és a kínai részvénypiacról, azonban a cím súlyosan félrevezető: a 'tőzsdeguruk' kifejezés és a 'nagyot akar kaszálni' framing egy szakmai elemzői ajánlást kockázatmentes nyerési lehetőségként pozicionál. A JP Morgan ajánlása maga is tartalmaz fenntartásokat és kockázatokat, amelyek a cikkből szinte teljesen hiányoznak. A 15%-os növekedési előrejelzés az MSCI Ázsia ex-Japán indexre vonatkozik, nem egyedi részvényekre; ezt a különbséget a cikk nem hangsúlyozza. Pénzügyi tartalmak esetén ez a fajta leegyszerűsítés és kockázatelhallgatás potenciálisan káros olvasói döntésekhez vezethet.",
  portal_rating: {
    domain: "penzcentrum.hu",
    credibility: 58,
    bias: "center-financial-clickbait",
    why_trusted_or_not:
      "A Pénzcentrum egy független, kereskedelmi pénzügyi hírportál. Alapvetően nem politikai propagandát közöl, azonban bevételi modellje erősen épít a kattintásvezérelt tartalomra. Az MBFC és hasonló adatbázisokban nincs besorolva, de a pénzügyi újságírás etikai standardjai szerint a kockázatok elhallgatása és a 'nagyot kaszálni' típusú clickbait headline-ok problémásak. Nem rosszhiszemű portál, de anyagi motivációja van a szenzációs tálalásra.",
  },
  headline_analysis: {
    original: "Megszólaltak a tőzsdeguruk: ilyen részvényeket kell most venni, ha valaki nagyot akar kaszálni",
    clickbait_score: 86,
    accuracy_score: 34,
    psychological_hook: "Tekintélyre hivatkozás ('guruk') + Azonnaliság ('most') + Nyereségvágy aktiválása",
    vs_body_summary:
      "A cím 'tőzsdegurukat' és konkrét részvényvásárlási tanácsot ígér. A cikk valójában egyetlen bank (JP Morgan) egy indexre vonatkozó, feltételes módú elemzői ajánlását tartalmazza, amelyet egy hírügynökségi összefoglaló alapján közöl. Sem 'guruk' (többes szám), sem konkrét részvényajánlás nincs a cikkben.",
    missing_context:
      "Teljesen hiányzik: (1) a befektetés kockázatára való figyelmeztetés; (2) hogy a JP Morgan érdekelt lehet a kínai piac felpumpálásában; (3) hogy az indexajánlás nem egyenlő egyedi részvényvásárlási tanáccsal; (4) hogy a kínai piac politikai kockázatai (szabályozói beavatkozás, geopolitikai feszültség) jelentősek.",
  },
  psychological_quotes: [
    {
      quote: "nagyobb esély van a jelentős hozamra, mint a számottevő veszteségekre",
      technique: "Selective framing + Loss aversion reversal",
      emotional_target: "bizonytalanság",
      analysis:
        "Ez a mondat technikailag igaz lehet, de pszichológiailag a veszteség lehetőségét minimalizálja. Az olvasó azt viszi magával, hogy 'valószínűleg nyerni fogok', holott egy 51-49%-os esélykülönbség is teljesíti ezt az állítást.",
    },
    {
      quote: "vonzó beszállási pontot teremt a befektetők számára",
      technique: "FOMO trigger + Authority laundering",
      emotional_target: "bizonytalanság",
      analysis:
        "A 'vonzó beszállási pont' egy banki elemzői zsargon, amely az olvasóban azt a benyomást kelti, hogy most kell cselekedni, különben lemarad. Ez a FOMO (fear of missing out) klasszikus pénzügyi alkalmazása.",
    },
    {
      quote: "több támogató tényező is megjelenhet, köztük a mesterséges intelligencia elterjedése",
      technique: "Buzzword stacking + Optimism bias exploitation",
      emotional_target: "büszkeség",
      analysis:
        "Az AI-hivatkozás 2024-2025-ben automatikus hitelességnövelő eszközzé vált, bármilyen befektetési tézisbe beleszőve pozitív asszociációkat aktivál az olvasóban, függetlenül a valódi relevanciától.",
    },
  ],
  psychological_conclusion:
    "A cikk a pénzügyi clickbait egyik legtisztább példája: valós adatot vesz alapul, de a tálalás minden eleme a nyereségvágy és a kimaradástól való félelem kombinált aktiválására irányul. Ez nem politikai propaganda, hanem kereskedelmi manipuláció - a cél nem vélemény befolyásolása, hanem kattintás és olvasói elköteleződés maximalizálása. A hatás azonban hasonlóan káros lehet: megalapozatlan pénzügyi döntésekhez vezet.",
  manipulation_index: {
    clickbait: 86,
    emotional_amplification: 71,
    omitted_context: 82,
    false_urgency: 78,
    misleading_framing: 75,
    overall: 78,
    dominant_technique: "FOMO trigger + kockázatelhallgatás",
  },
  sources: [
    {
      url: "https://www.bloomberg.com",
      domain: "bloomberg.com",
      credibility: 88,
      bias: "center-financial",
      label: "Bloomberg - megbízható pénzügyi hírforrás",
      stance: "MIXED",
      summary:
        "A cikk a Bloombergre hivatkozik mint eredeti forrásra, amely valóban közölte a JP Morgan ajánlást. A Bloomberg eredeti cikke azonban valószínűleg részletesebb kockázati figyelmeztetéseket tartalmazott, amelyek a Pénzcentrum összefoglalójából kimaradtak.",
    },
    {
      url: "https://www.msci.com",
      domain: "msci.com",
      credibility: 92,
      bias: "neutral-financial-index",
      label: "MSCI - indexszolgáltató",
      stance: "SUPPORTS",
      summary:
        "Az MSCI China index valóban esett 6,2%-ot a hivatkozott negyedévben - ez az adat ellenőrizhető és helyes.",
    },
  ],
  omitted_context:
    "Hiányzik: (1) kötelező kockázati figyelmeztetés ('a múltbeli hozam nem garantálja a jövőbelit'); (2) a JP Morgan saját érdekeltségei a kínai piacon; (3) Kína szabályozói kockázatai (az Alibaba, Didi és más cégek elleni korábbi kormányzati lépések); (4) a geopolitikai kockázat (tajvani feszültség, szankciók lehetősége); (5) az index vs. egyedi részvény különbsége.",
  target_audience: {
    primary_target: "Pénzügyileg aktív, de nem professzionális befektetők, különösen 30-50 éves urbánus olvasók",
    exploited_fears: [
      "Kimaradástól való félelem (FOMO)",
      "Inflációtól és megtakarítások elértéktelenedésétől való félelem",
    ],
    assumed_prejudices: [
      "A nagy bankok elemzői tudják, mi fog történni",
      "Aki nem fektet be, az veszít",
      "Az AI-kapcsolatos befektetések biztonságosak",
    ],
    conclusion:
      "A cikk elsősorban azokat célozza, akik szeretnének befektetni, de nem rendelkeznek mélyebb pénzügyi ismeretekkel. A 'guruk' tekintélyére és a 'most kell cselekedni' üzenetre fogékonyak.",
  },
  narrative_chain: {
    first_seen: "2025-11-27",
    appearances: 3,
    domains: ["penzcentrum.hu", "portfolio.hu", "mfor.hu"],
    mutation_summary:
      "A JP Morgan kínai részvényajánlása több magyar pénzügyi portálon is megjelent ugyanazon a napon Bloomberg-összefoglaló alapján. A Pénzcentrum verziója a legszenzációsabb cím választásával tűnik ki, a többi portál mérsékeltebb, kockázatokat is megemlítő módon közölte ugyanazt az információt.",
    coordination_level: "Párhuzamos megjelenés",
  },
};

// ─────────────────────────────────────────
// Exportálható összesített mock adatbázis
// ─────────────────────────────────────────
export const MOCK_ANALYSES: Record<string, FactCheckResult> = {
  "https://magyarnemzet.hu/kulfold/2026/04/tisza-titkos-terve-kiszivargott-vereseg-majdan-magyar": analysis_1,
  "https://magyarnemzet.hu/belfold/2026/04/brusszel-es-magyar-peter-haboruba-sodornak-magyarorszagot-allitsuk-meg-oket": analysis_2,
  "https://www.origo.hu/belpol/2026/04/magyar-peter-tisza-part-energiaterv-csercsa-balazs": analysis_3,
  "https://magyarnemzet.hu/poszt-trauma/2026/04/magyar-peter-kormany-tisza-akkumulator-gyar": analysis_4,
  "https://telex.hu/g7/vallalat/2026/04/20/budapest-belgrad-kelebia-vasutvonal-tehervonatok-szemelyszallitas-etcs": analysis_5,
  "https://www.penzcentrum.hu/vilag/20251127/megszolaltak-a-tozsdeguruk-ilyen-reszvenyeket-kell-most-venni-ha-valaki-nagyot-akar-kaszalni-1189422": analysis_6,
};

// Használat a fact-check.ts-ben:
// import { MOCK_ANALYSES } from './mockData';
//
// export async function checkFact(url: string): Promise<FactCheckResult | null> {
//   const normalized = url.trim().replace(/\/$/, '');
//   return MOCK_ANALYSES[normalized] ?? null;
// }
