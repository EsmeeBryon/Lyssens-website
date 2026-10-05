/* Vragenhulp rechtsonder. Herkent situaties met de woorden uit
   data/antwoorden.json en zoekt anders in de teksten van de site.
   Geen AI en geen externe dienst: alles gebeurt in de browser van de bezoeker. */

const STOPWOORDEN = new Set([
  "de", "het", "een", "en", "of", "ik", "je", "jij", "u", "we", "wij", "ze", "zij", "is", "zijn",
  "ben", "was", "waren", "heb", "heeft", "hebben", "had", "wat", "hoe", "waar", "wie", "welke",
  "voor", "van", "met", "aan", "op", "in", "bij", "om", "te", "dat", "die", "dit", "deze", "er",
  "niet", "ook", "nog", "al", "maar", "als", "dan", "want", "mijn", "jullie", "ons", "onze", "me",
  "kan", "kunnen", "kun", "mag", "moet", "zou", "wil", "willen", "doen", "doet", "graag", "even",
  "wel", "heel", "erg", "echt", "wordt", "worden", "gaat", "gaan", "net", "nu", "zo", "toch",
]);

const AANVRAAG_SLEUTEL = "lyssens-aanvraag";

function normaliseer(tekst) {
  return String(tekst)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function woorden(tekst) {
  return normaliseer(tekst)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWOORDEN.has(w));
}

function gemeenschappelijkBegin(a, b) {
  const kort = Math.min(a.length, b.length);
  let i = 0;
  while (i < kort && a[i] === b[i]) i += 1;
  return i;
}

/* Aantal tikfouten tussen twee woorden. Stopt zodra het plafond overschreden is. */
function afstand(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let vorige = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const huidige = [i];
    let rijMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const kost = a[i - 1] === b[j - 1] ? 0 : 1;
      huidige[j] = Math.min(vorige[j] + 1, huidige[j - 1] + 1, vorige[j - 1] + kost);
      rijMin = Math.min(rijMin, huidige[j]);
    }
    if (rijMin > max) return max + 1;
    vorige = huidige;
  }
  return vorige[b.length];
}

/* 3 = zelfde woord, 2 = zelfde stam of een tikfout, 0 = niets.
   Zelfde stam: het kortste woord (minstens 5 letters) staat vooraan in het
   langste, zoals gordijn en gordijnen, of ze delen 6 letters, zoals
   schilderen en schilderwerk. Losser mag niet: dan wordt nieuwe nieuwbouw. */
function lijkt(w, d) {
  if (w === d) return 3;
  const [kort, lang] = w.length <= d.length ? [w, d] : [d, w];
  if (kort.length >= 5 && lang.startsWith(kort)) return 2;
  if (gemeenschappelijkBegin(w, d) >= 6) return 2;
  if (d.length >= 6 && w[0] === d[0]) {
    const max = d.length >= 9 ? 2 : 1;
    if (afstand(w, d, max) <= max) return 2;
  }
  return 0;
}

/* Per woord van de bezoeker telt enkel de beste treffer, anders wint een
   onderwerp met veel varianten van hetzelfde woord. */
function score(vraag, losseWoorden, zinnen) {
  let punten = 0;
  let gedekt = 0;
  vraag.woorden.forEach((w) => {
    /* "geschilderd" of "geplaatst": zonder "ge" vindt het de stam terug. */
    const zonderGe = w.length > 6 && w.startsWith("ge") ? w.slice(2) : null;
    let best = 0;
    for (const d of losseWoorden) {
      best = Math.max(best, lijkt(w, d), zonderGe ? Math.min(2, lijkt(zonderGe, d)) : 0);
      if (best === 3) break;
    }
    if (best) {
      punten += best;
      gedekt += 1;
    }
  });
  (zinnen || []).forEach((z) => {
    if (vraag.rand.includes(` ${z} `)) punten += 4;
  });
  return { punten, gedekt };
}

function splitsHerken(lijst) {
  const genormaliseerd = lijst.map(normaliseer).filter(Boolean);
  return {
    losseWoorden: genormaliseerd.filter((h) => !h.includes(" ")),
    zinnen: genormaliseerd.filter((h) => h.includes(" ")),
  };
}

function maakVraag(tekst) {
  const norm = normaliseer(tekst);
  return { ruw: tekst, norm, rand: ` ${norm} `, woorden: woorden(tekst) };
}

/* Leest afmetingen zoals "5 op 4 meter", "5x4" of "30 m²". */
function leesMaten(ruw) {
  const t = String(ruw).toLowerCase().replace(/(\d),(\d)/g, "$1.$2");
  const lb = t.match(/(\d+(?:\.\d+)?)\s*(?:m|meter)?\s*(?:op|x|bij|×)\s*(\d+(?:\.\d+)?)\s*(?:m\b|meter)?/);
  if (lb) {
    const lengte = Number(lb[1]);
    const breedte = Number(lb[2]);
    if (lengte > 0 && breedte > 0 && lengte < 40 && breedte < 40) return { lengte, breedte };
  }
  const opp = t.match(/(\d+(?:\.\d+)?)\s*(?:m2|m²|vierkante\s*meter|vierkante\s*m)/);
  if (opp) {
    const vloer = Number(opp[1]);
    if (vloer > 0 && vloer < 500) {
      const zijde = Math.sqrt(vloer);
      return { lengte: zijde, breedte: zijde, vloer };
    }
  }
  return null;
}

/* Zelfde rekenregel als de rekenhulp op de winkelpagina. */
function schatVerf(maten) {
  const muren = 2 * (maten.lengte + maten.breedte) * 2.5;
  const netto = muren * 0.88;
  return Math.ceil(((netto * 2) / 10) * 2) / 2;
}

function getal(n) {
  return n.toLocaleString("nl-BE", { maximumFractionDigits: 1 });
}

class Vragenhulp {
  constructor() {
    this.gegevens = null;
    this.index = null;
    this.open = false;
    this.bezig = false;
    this.wacht = null;
  }

  async laadGegevens() {
    if (this.gegevens) return this.gegevens;
    const res = await fetch("data/antwoorden.json");
    if (!res.ok) throw new Error("antwoorden niet gevonden");
    const g = await res.json();

    g.onderwerpen.forEach((o) => Object.assign(o, splitsHerken(o.herken || [])));
    g.vragen.forEach((v) => Object.assign(v, splitsHerken(v.trefwoorden || [])));
    g.zelf = g.zelfWoorden.map(normaliseer);
    g.laten = g.latenWoorden.map(normaliseer);
    g.ruimteLijst = g.ruimtes.map(normaliseer);

    this.gegevens = g;
    return g;
  }

  /* Haalt de pagina's op en houdt per alinea bij in welke sectie die staat. */
  async laadIndex() {
    if (this.index) return this.index;
    const g = await this.laadGegevens();
    const ontleder = new DOMParser();
    const stukken = [];

    await Promise.all(
      g.paginas.map(async (pagina) => {
        try {
          const res = await fetch(pagina.url);
          if (!res.ok) return;
          const doc = ontleder.parseFromString(await res.text(), "text/html");
          doc.querySelectorAll("header, footer, nav, script, style").forEach((el) => el.remove());

          let kop = "";
          doc.querySelectorAll("h1, h2, h3, p, li").forEach((el) => {
            if (/^H[123]$/.test(el.tagName)) {
              kop = el.textContent.trim();
              return;
            }
            const tekst = el.textContent.trim().replace(/\s+/g, " ");
            if (tekst.length < 50 || tekst.length > 400) return;
            const sectie = el.closest("section[id]");
            stukken.push({
              tekst,
              pagina: pagina.titel,
              url: sectie ? `${pagina.url}#${sectie.id}` : pagina.url,
              woorden: [...new Set(woorden(tekst))],
              kopWoorden: [...new Set(woorden(kop))],
            });
          });
        } catch (e) {
          /* Eén pagina die niet laadt mag de rest niet tegenhouden. */
        }
      })
    );

    this.index = stukken;
    return stukken;
  }

  herkenOnderwerpen(vraag, g) {
    const kandidaten = g.onderwerpen
      .map((o) => ({ o, ...score(vraag, o.losseWoorden, o.zinnen) }))
      .filter((k) => k.punten >= 2)
      .sort((a, b) => b.punten - a.punten);

    if (!kandidaten.length) return [];
    /* Wat ver onder de beste treffer blijft, is meestal toeval. */
    const grens = kandidaten[0].punten * 0.6;
    return kandidaten.filter((k) => k.punten >= grens || k.punten >= 3).slice(0, 4).map((k) => k.o);
  }

  besteVraag(vraag, g) {
    let beste = null;
    g.vragen.forEach((v) => {
      const { punten } = score(vraag, v.losseWoorden, v.zinnen);
      if (punten >= 2 && (!beste || punten > beste.punten)) beste = { punten, v };
    });
    return beste;
  }

  bepaalModus(vraag, g) {
    const tel = (lijst) => lijst.filter((z) => vraag.rand.includes(` ${z} `)).length;
    /* "Zelf" weegt dubbel: "ik wil het zelf plaatsen" is duidelijk doe-het-zelf. */
    const zelf = tel(g.zelf) + (vraag.rand.includes(" zelf ") ? 1 : 0);
    const laten = tel(g.laten);
    if (zelf > laten) return "zelf";
    if (laten > zelf) return "laten";
    return null;
  }

  zoekRuimte(vraag, g) {
    return g.ruimteLijst.find((r) => vraag.rand.includes(` ${r} `)) || null;
  }

  async zoekInSite(vraag) {
    const index = await this.laadIndex();
    let beste = null;
    index.forEach((stuk) => {
      const inTekst = score(vraag, stuk.woorden);
      const inKop = score(vraag, stuk.kopWoorden);
      const dekking = Math.max(inTekst.gedekt, inKop.gedekt, score(vraag, stuk.woorden.concat(stuk.kopWoorden)).gedekt) / vraag.woorden.length;
      const punten = inTekst.punten + inKop.punten * 2;
      const titelTreffer = inKop.punten >= 3;
      if (!titelTreffer && (dekking < 0.6 || punten < vraag.woorden.length * 2)) return;
      if (!beste || punten > beste.punten) beste = { punten, stuk };
    });
    return beste && beste.stuk;
  }

  /* Bouwt een antwoord op een geschetste situatie, eventueel met meerdere onderwerpen. */
  situatie(vraag, onderwerpen, modus, g) {
    const t = g.teksten;
    const werk = onderwerpen.filter((o) => o.id !== "advies");
    const advies = onderwerpen.find((o) => o.id === "advies");
    const totaal = werk.find((o) => o.id === "totaalproject");
    const ruimte = this.zoekRuimte(vraag, g);
    const maten = leesMaten(vraag.ruw);

    if (advies && (!werk.length || onderwerpen[0] === advies)) {
      const antwoord = { tekst: [advies.laten.antwoord], link: { url: advies.laten.link, tekst: advies.laten.linktekst } };
      if (werk.length) antwoord.lijst = werk.map((o) => ({ tekst: o.naam, url: (o.laten || o.zelf).link }));
      return antwoord;
    }

    const heeftKeuze = werk.some((o) => o.zelf && o.laten) && !totaal;
    if (!modus && heeftKeuze) {
      this.wacht = { vraag };
      return {
        tekst: [t.keuzevraag],
        keuzes: [
          { tekst: t.keuzeZelf, modus: "zelf" },
          { tekst: t.keuzeLaten, modus: "laten" },
        ],
      };
    }

    const kant = (o) => o[modus] || o.laten || o.zelf;
    const antwoord = { tekst: [] };
    /* Enkel de grote werken maken samen een totaalproject, niet een klink en een kast. */
    const groot = werk.filter((o) => o.offerte && o.offerte !== "andere");

    if (totaal || (groot.length >= 3 && modus !== "zelf")) {
      const deel = totaal || g.onderwerpen.find((o) => o.id === "totaalproject");
      antwoord.tekst.push(deel.laten.antwoord);
      antwoord.link = { url: deel.laten.link, tekst: deel.laten.linktekst };
      const rest = werk.filter((o) => o.id !== "totaalproject");
      if (rest.length) antwoord.lijst = rest.map((o) => ({ tekst: o.naam, url: kant(o).link }));
      modus = "laten";
    } else if (werk.length === 1) {
      const deel = kant(werk[0]);
      antwoord.tekst.push(deel.antwoord);
      antwoord.link = { url: deel.link, tekst: deel.linktekst };
    } else {
      antwoord.tekst.push(modus === "zelf" && werk.every((o) => o.zelf) ? t.meerZelf : t.meerLaten);
      antwoord.lijst = werk.map((o) => ({ tekst: o.naam, url: kant(o).link }));
    }

    if (maten && werk.some((o) => o.id === "schilderwerk")) {
      const liter = schatVerf(maten);
      const wat = ruimte ? `je ${ruimte}` : "die ruimte";
      const grootte = maten.vloer
        ? `van ongeveer ${getal(maten.vloer)} m²`
        : `van ${getal(maten.lengte)} op ${getal(maten.breedte)} meter`;
      antwoord.tekst.push(
        `Voor de muren van ${wat} ${grootte} reken je in twee lagen op ongeveer ${getal(liter)} liter verf. Met de rekenhulp in de winkelpagina kan je dat verfijnen.`
      );
    }

    if (advies) antwoord.tekst.push(t.adviesExtra);

    const watLaten = werk.filter((o) => kant(o) === o.laten);
    if (modus !== "zelf" && watLaten.length) {
      const hoofd = totaal || watLaten[0];
      antwoord.offerte = { tekst: t.offerteknop, bericht: vraag.ruw, onderwerp: hoofd.offerte || "andere" };
    }

    return antwoord;
  }

  async zoekAntwoord(tekst, gekozenModus) {
    const g = await this.laadGegevens();
    const t = g.teksten;
    const vraag = maakVraag(tekst);

    if (!vraag.woorden.length) return { tekst: [t.teKort] };

    const onderwerpen = this.herkenOnderwerpen(vraag, g);
    const vraagTreffer = this.besteVraag(vraag, g);
    const vraagAntwoord = vraagTreffer && {
      tekst: [vraagTreffer.v.antwoord],
      link: { url: vraagTreffer.v.link, tekst: vraagTreffer.v.linktekst },
    };

    if (!onderwerpen.length) {
      if (vraagAntwoord) return vraagAntwoord;
      const stuk = await this.zoekInSite(vraag);
      if (stuk) return { tekst: [stuk.tekst], link: { url: stuk.url, tekst: `Lees verder op ${stuk.pagina}` } };
      return { tekst: [t.nietsGevonden], link: { url: "contact.html", tekst: "Naar de contactpagina" } };
    }

    /* Een korte praktische vraag zoals "wat kost behang" krijgt het praktische antwoord. */
    if (vraagAntwoord && vraagTreffer.punten >= 3 && vraag.woorden.length <= 4) return vraagAntwoord;

    return this.situatie(vraag, onderwerpen, gekozenModus || this.bepaalModus(vraag, g), g);
  }

  bouw(g) {
    const wrap = document.createElement("div");
    wrap.className = "vraaghulp";
    wrap.innerHTML = `
      <button class="vraaghulp__knop" type="button" aria-expanded="false" aria-controls="vraaghulp-paneel">
        <span class="vraaghulp__knoptekst">Stel je vraag</span>
      </button>
      <div class="vraaghulp__paneel" id="vraaghulp-paneel" role="dialog" aria-modal="false" aria-label="Stel je vraag" tabindex="-1" hidden>
        <div class="vraaghulp__kop">
          <p class="vraaghulp__titel">Waarmee kunnen we je helpen?</p>
          <button class="vraaghulp__sluit" type="button" aria-label="Sluit de vragenhulp">&times;</button>
        </div>
        <div class="vraaghulp__gesprek" data-gesprek role="log" aria-live="polite"></div>
        <ul class="vraaghulp__suggesties" data-suggesties></ul>
        <form class="vraaghulp__balk" data-vraagform>
          <label class="visually-hidden" for="vraaghulp-invoer">Je vraag of situatie</label>
          <input id="vraaghulp-invoer" type="text" autocomplete="off" maxlength="500" placeholder="Vertel wat je van plan bent" data-vraaginvoer>
          <button class="btn btn--primary" type="submit">Vraag</button>
        </form>
        <p class="vraaghulp__voet">Dit zoekt enkel op deze website. Liever iemand spreken? Bel <a href="tel:+3236445206">03 644 52 06</a>.</p>
      </div>
    `;
    document.body.appendChild(wrap);

    this.wrap = wrap;
    this.knop = wrap.querySelector(".vraaghulp__knop");
    this.paneel = wrap.querySelector(".vraaghulp__paneel");
    this.gesprek = wrap.querySelector("[data-gesprek]");
    this.invoer = wrap.querySelector("[data-vraaginvoer]");
    this.suggesties = wrap.querySelector("[data-suggesties]");

    this.bericht("hulp", { tekst: [g.begroeting] });

    g.suggesties.forEach((vraag) => {
      const li = document.createElement("li");
      const knop = document.createElement("button");
      knop.type = "button";
      knop.textContent = vraag;
      knop.addEventListener("click", () => this.stel(vraag));
      li.appendChild(knop);
      this.suggesties.appendChild(li);
    });

    this.knop.addEventListener("click", () => this.wissel());
    wrap.querySelector(".vraaghulp__sluit").addEventListener("click", () => this.wissel(false));
    wrap.querySelector("[data-vraagform]").addEventListener("submit", (e) => {
      e.preventDefault();
      this.stel(this.invoer.value);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open) this.wissel(false);
    });
  }

  wissel(naar) {
    this.open = typeof naar === "boolean" ? naar : !this.open;
    this.paneel.hidden = !this.open;
    this.knop.setAttribute("aria-expanded", String(this.open));
    this.wrap.dataset.open = String(this.open);
    if (this.open) {
      /* Op een gsm zou het toetsenbord meteen het halve scherm innemen. */
      if (window.matchMedia("(pointer: fine)").matches) {
        this.invoer.focus();
      } else {
        this.paneel.focus();
      }
      this.laadIndex();
    } else {
      this.knop.focus();
    }
  }

  bericht(soort, inhoud) {
    const blok = document.createElement("div");
    blok.className = `vraaghulp__bericht vraaghulp__bericht--${soort}`;

    const ballon = document.createElement("div");
    ballon.className = "vraaghulp__ballon";
    const regels = inhoud.tekst || [];
    const voegRegelToe = (regel) => {
      const p = document.createElement("p");
      p.textContent = regel;
      ballon.appendChild(p);
    };
    if (regels.length) voegRegelToe(regels[0]);

    if (inhoud.lijst) {
      const ul = document.createElement("ul");
      inhoud.lijst.forEach((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = item.url;
        a.textContent = item.tekst;
        li.appendChild(a);
        ul.appendChild(li);
      });
      ballon.appendChild(ul);
    }
    regels.slice(1).forEach(voegRegelToe);
    blok.appendChild(ballon);

    if (inhoud.keuzes) {
      const rij = document.createElement("div");
      rij.className = "vraaghulp__keuzes";
      inhoud.keuzes.forEach((keuze) => {
        const knop = document.createElement("button");
        knop.type = "button";
        knop.textContent = keuze.tekst;
        knop.addEventListener("click", () => {
          rij.remove();
          this.kies(keuze);
        });
        rij.appendChild(knop);
      });
      blok.appendChild(rij);
    }

    if (inhoud.offerte) {
      const a = document.createElement("a");
      a.className = "btn btn--primary vraaghulp__offerte";
      a.href = "contact.html#offerte";
      a.textContent = inhoud.offerte.tekst;
      a.addEventListener("click", () => {
        try {
          sessionStorage.setItem(
            AANVRAAG_SLEUTEL,
            JSON.stringify({ bericht: inhoud.offerte.bericht, onderwerp: inhoud.offerte.onderwerp })
          );
        } catch (e) {
          /* Zonder opslag gaat de bezoeker gewoon naar het lege formulier. */
        }
      });
      blok.appendChild(a);
    }

    if (inhoud.link) {
      const a = document.createElement("a");
      a.className = "vraaghulp__link";
      a.href = inhoud.link.url;
      a.textContent = inhoud.link.tekst || "Lees meer";
      blok.appendChild(a);
    }

    this.gesprek.appendChild(blok);
    this.gesprek.scrollTop = this.gesprek.scrollHeight;
    return blok;
  }

  async beantwoord(tekst, modus) {
    this.bezig = true;
    const wachten = this.bericht("hulp", { tekst: [this.gegevens.teksten.wachten] });
    try {
      const antwoord = await this.zoekAntwoord(tekst, modus);
      wachten.remove();
      this.bericht("hulp", antwoord);
    } catch (e) {
      wachten.remove();
      this.bericht("hulp", {
        tekst: ["Het zoeken lukte niet. Bel gerust 03 644 52 06."],
        link: { url: "contact.html", tekst: "Naar de contactpagina" },
      });
    } finally {
      this.bezig = false;
    }
  }

  async stel(vraag) {
    const schoon = String(vraag).trim().slice(0, 500);
    if (!schoon || this.bezig) return;

    this.wacht = null;
    this.invoer.value = "";
    this.suggesties.hidden = true;
    this.bericht("jij", { tekst: [schoon] });
    await this.beantwoord(schoon);
  }

  async kies(keuze) {
    if (!this.wacht || this.bezig) return;
    const { vraag } = this.wacht;
    this.wacht = null;
    this.bericht("jij", { tekst: [keuze.tekst] });
    await this.beantwoord(vraag.ruw, keuze.modus);
  }

  async start() {
    try {
      this.bouw(await this.laadGegevens());
    } catch (e) {
      /* Zonder antwoordenbestand tonen we gewoon niets. */
    }
  }
}

new Vragenhulp().start();
