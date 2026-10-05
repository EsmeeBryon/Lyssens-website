/* Vragenhulp rechtsonder. Zoekt eerst in data/antwoorden.json en anders in de
   teksten van de website zelf. Er gaat niets naar buiten, alles blijft hier. */

const STOPWOORDEN = new Set([
  "de", "het", "een", "en", "of", "ik", "je", "jij", "u", "we", "wij", "ze", "zij", "is", "zijn",
  "ben", "was", "waren", "heb", "heeft", "hebben", "had", "wat", "hoe", "waar", "wie", "welke",
  "voor", "van", "met", "aan", "op", "in", "bij", "om", "te", "dat", "die", "dit", "deze", "er",
  "niet", "ook", "nog", "al", "maar", "als", "dan", "want", "mijn", "jullie", "ons", "onze", "me",
  "kan", "kunnen", "kun", "mag", "moet", "zou", "wil", "willen", "doen", "doet", "graag", "even",
]);

function woorden(tekst) {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWOORDEN.has(w));
}

/* Hoeveel letters hebben twee woorden vooraan gemeen. Vijf of meer betekent
   meestal hetzelfde woord, zoals schilderen en schilderwerken. Vier is te los:
   dan gaat gevels door voor geven. */
function gemeenschappelijkBegin(a, b) {
  const kort = Math.min(a.length, b.length);
  let i = 0;
  while (i < kort && a[i] === b[i]) i += 1;
  return i;
}

/* Telt hoeveel woorden uit de vraag voorkomen in de tekst, en hoeveel ervan
   gedekt zijn. */
function beoordeel(vraagWoorden, doelWoorden) {
  const doel = new Set(doelWoorden);
  let punten = 0;
  let gedekt = 0;

  vraagWoorden.forEach((w) => {
    let p = 0;
    if (doel.has(w)) {
      p = 2;
    } else if (w.length >= 5) {
      for (const d of doel) {
        if (d.length >= 5 && gemeenschappelijkBegin(d, w) >= 5) {
          p = 1;
          break;
        }
      }
    }
    if (p) {
      punten += p;
      gedekt += 1;
    }
  });

  return { punten, gedekt };
}

class Vragenhulp {
  constructor() {
    this.gegevens = null;
    this.index = null;
    this.open = false;
    this.bezig = false;
  }

  async laadGegevens() {
    if (this.gegevens) return this.gegevens;
    const res = await fetch("data/antwoorden.json");
    if (!res.ok) throw new Error("antwoorden niet gevonden");
    this.gegevens = await res.json();
    return this.gegevens;
  }

  /* Haalt de pagina's op en houdt per alinea bij onder welke titel die staat. */
  async laadIndex() {
    if (this.index) return this.index;
    const gegevens = await this.laadGegevens();
    const ontleder = new DOMParser();
    const stukken = [];

    await Promise.all(
      gegevens.paginas.map(async (pagina) => {
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
              kop,
              pagina: pagina.titel,
              url: sectie ? `${pagina.url}#${sectie.id}` : pagina.url,
              woorden: woorden(tekst),
              kopWoorden: woorden(kop),
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

  async zoekAntwoord(vraag) {
    const vraagWoorden = woorden(vraag);
    if (!vraagWoorden.length) {
      return { tekst: "Kan je je vraag in een paar woorden stellen? Dan zoek ik gerichter." };
    }

    const gegevens = await this.laadGegevens();

    let beste = null;
    gegevens.antwoorden.forEach((item) => {
      const { punten } = beoordeel(vraagWoorden, item.trefwoorden);
      if (punten >= 2 && (!beste || punten > beste.punten)) {
        beste = { punten, item };
      }
    });

    if (beste) {
      return {
        tekst: beste.item.antwoord,
        url: beste.item.link,
        linktekst: beste.item.linktekst,
      };
    }

    const index = await this.laadIndex();
    let bestStuk = null;
    index.forEach((stuk) => {
      const inTekst = beoordeel(vraagWoorden, stuk.woorden);
      const inKop = beoordeel(vraagWoorden, stuk.kopWoorden);
      const samen = beoordeel(vraagWoorden, stuk.woorden.concat(stuk.kopWoorden));
      const punten = inTekst.punten + inKop.punten * 2;
      const dekking = samen.gedekt / vraagWoorden.length;

      /* Staat het woord letterlijk in de titel van een sectie, dan is dat
         sterk genoeg. Anders moet het grootste deel van de vraag terugkomen,
         zodat je geen alinea krijgt die toevallig op één woord matcht. */
      const titelTreffer = inKop.punten >= 2;
      if (!titelTreffer && (dekking < 0.6 || punten < Math.max(1, vraagWoorden.length))) return;
      if (!bestStuk || punten > bestStuk.punten) bestStuk = { punten, stuk };
    });

    if (bestStuk) {
      return {
        tekst: bestStuk.stuk.tekst,
        url: bestStuk.stuk.url,
        linktekst: `Lees verder op ${bestStuk.stuk.pagina}`,
      };
    }

    return {
      tekst:
        "Daar vind ik niets over op de site. Bel gerust 03 644 52 06 of mail naar lyssensdecoratie@skynet.be, dan helpen we je verder.",
      url: "contact.html",
      linktekst: "Naar de contactpagina",
    };
  }

  bouw(gegevens) {
    const wrap = document.createElement("div");
    wrap.className = "vraaghulp";
    wrap.innerHTML = `
      <button class="vraaghulp__knop" type="button" aria-expanded="false" aria-controls="vraaghulp-paneel">
        <span class="vraaghulp__knoptekst">Stel je vraag</span>
      </button>
      <div class="vraaghulp__paneel" id="vraaghulp-paneel" role="dialog" aria-modal="false" aria-label="Stel je vraag" hidden>
        <div class="vraaghulp__kop">
          <p class="vraaghulp__titel">Waarmee kunnen we je helpen?</p>
          <button class="vraaghulp__sluit" type="button" aria-label="Sluit de vragenhulp">&times;</button>
        </div>
        <div class="vraaghulp__gesprek" data-gesprek role="log" aria-live="polite"></div>
        <ul class="vraaghulp__suggesties" data-suggesties></ul>
        <form class="vraaghulp__balk" data-vraagform>
          <label class="visually-hidden" for="vraaghulp-invoer">Je vraag</label>
          <input id="vraaghulp-invoer" type="text" autocomplete="off" placeholder="Typ je vraag" data-vraaginvoer>
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

    this.bericht("hulp", gegevens.begroeting);

    const lijst = wrap.querySelector("[data-suggesties]");
    gegevens.suggesties.forEach((vraag) => {
      const li = document.createElement("li");
      const knop = document.createElement("button");
      knop.type = "button";
      knop.textContent = vraag;
      knop.addEventListener("click", () => this.stel(vraag));
      li.appendChild(knop);
      lijst.appendChild(li);
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
      this.invoer.focus();
      this.laadIndex();
    } else {
      this.knop.focus();
    }
  }

  bericht(soort, tekst, url, linktekst) {
    const blok = document.createElement("div");
    blok.className = `vraaghulp__bericht vraaghulp__bericht--${soort}`;

    const p = document.createElement("p");
    p.textContent = tekst;
    blok.appendChild(p);

    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.textContent = linktekst || "Lees meer";
      blok.appendChild(a);
    }

    this.gesprek.appendChild(blok);
    this.gesprek.scrollTop = this.gesprek.scrollHeight;
    return blok;
  }

  async stel(vraag) {
    const schoon = String(vraag).trim().slice(0, 300);
    if (!schoon || this.bezig) return;

    this.bezig = true;
    this.invoer.value = "";
    this.suggesties.hidden = true;
    this.bericht("jij", schoon);
    const wachten = this.bericht("hulp", "Even zoeken op de site...");

    try {
      const antwoord = await this.zoekAntwoord(schoon);
      wachten.remove();
      this.bericht("hulp", antwoord.tekst, antwoord.url, antwoord.linktekst);
    } catch (e) {
      wachten.remove();
      this.bericht("hulp", "Het zoeken lukte niet. Bel gerust 03 644 52 06.", "contact.html", "Naar de contactpagina");
    } finally {
      this.bezig = false;
    }
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
