function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!toggle || !nav) return;

  const isMobile = () => window.matchMedia("(max-width: 62rem)").matches;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.hidden = !open;
  };

  const applyViewport = () => setOpen(!isMobile());

  applyViewport();
  window.addEventListener("resize", applyViewport);
  toggle.addEventListener("click", () => setOpen(nav.hidden));
}

// Ruwe schatting: een liter muurverf dekt ongeveer 10 m2 per laag.
function initCalculator() {
  const form = document.querySelector("[data-calc]");
  if (!form) return;

  const result = form.querySelector("[data-calc-result]");
  const uitleg = form.querySelector("[data-calc-uitleg]");
  const muren = form.querySelector("[data-muren]");
  const getal = (veld) => parseFloat(String(veld.value).replace(",", ".")) || 0;
  const number = (name) => getal(form.elements[name]);

  const UITLEG = {
    kamer: "Dit is een richtcijfer. We rekenen met ongeveer 10 m² per liter en houden al rekening met ramen en deuren. In de winkel kijken we er graag samen nog eens naar.",
    muren: "Dit is een richtcijfer. We rekenen met ongeveer 10 m² per liter. Zit er een raam of deur in de muur, dan heb je iets minder nodig. In de winkel kijken we er graag samen nog eens naar.",
  };

  // Mensen kennen hun klus beter dan het aantal lagen; daar rekenen we zelf mee.
  const KLUS = {
    weet: { lagen: 2, zin: "wat meestal nodig is" },
    zelfde: { lagen: 1, zin: "wat bij dezelfde kleur vaak volstaat" },
    anders: { lagen: 2, zin: "zodat de oude kleur niet doorschijnt" },
    nieuw: { lagen: 2, zin: "met eerst nog een grondlaag, want een kale muur zuigt de verf op" },
  };

  const update = () => {
    const soort = form.elements.soort.value;
    const klus = KLUS[form.elements.klus.value] || KLUS.weet;
    const lagen = klus.lagen;
    let netto = 0;

    form.querySelectorAll("[data-soort]").forEach((deel) => (deel.hidden = deel.dataset.soort !== soort));
    uitleg.textContent = UITLEG[soort];

    if (soort === "kamer") {
      const lengte = number("lengte");
      const breedte = number("breedte");
      const hoogte = number("hoogte");
      if (!lengte || !breedte || !hoogte) {
        result.innerHTML = "Vul je afmetingen in, dan rekenen we het meteen uit.";
        return;
      }
      let oppervlakte = 2 * (lengte + breedte) * hoogte;
      if (form.elements.plafond.checked) oppervlakte += lengte * breedte;
      netto = oppervlakte * 0.88;
    } else {
      muren.querySelectorAll("[data-muur]").forEach((muur) => {
        netto += getal(muur.querySelector("[data-muur-breedte]")) * getal(muur.querySelector("[data-muur-hoogte]"));
      });
      if (!netto) {
        result.innerHTML = "Vul de breedte en hoogte van je muur in, dan rekenen we het meteen uit.";
        return;
      }
    }

    const liter = Math.max(0.5, Math.ceil(((netto * lagen) / 10) * 2) / 2);
    result.innerHTML =
      `<strong>Ongeveer ${liter.toLocaleString("nl-BE")} liter</strong>` +
      `Voor zo'n ${Math.max(1, Math.round(netto))} m² in ${lagen} ${lagen === 1 ? "laag" : "lagen"}, ${klus.zin}. Kom gerust langs met dit cijfer, ` +
      `dan mengen we je kleur terwijl je wacht.`;
  };

  // Elke extra muur krijgt eigen, unieke velden zodat de labels blijven kloppen.
  let teller = 1;
  form.querySelector("[data-muur-erbij]").addEventListener("click", () => {
    teller += 1;
    const nieuw = muren.querySelector("[data-muur]").cloneNode(true);
    nieuw.querySelectorAll("input").forEach((veld) => {
      const deel = veld.hasAttribute("data-muur-breedte") ? "breedte" : "hoogte";
      veld.id = `muur${teller}-${deel}`;
      veld.value = "";
      veld.previousElementSibling.htmlFor = veld.id;
    });
    const naam = nieuw.querySelector("[data-muur-naam]");
    naam.id = `muur${teller}-naam`;
    nieuw.setAttribute("aria-labelledby", naam.id);
    const weg = document.createElement("button");
    weg.type = "button";
    weg.className = "calc__weg";
    weg.textContent = "Verwijder";
    const nummer = () => {
      muren.querySelectorAll("[data-muur]").forEach((muur, i) => {
        muur.querySelector("[data-muur-naam]").textContent = `Muur ${i + 1}`;
        muur.querySelector(".calc__weg")?.setAttribute("aria-label", `Verwijder muur ${i + 1}`);
      });
    };
    weg.addEventListener("click", () => {
      nieuw.remove();
      nummer();
      form.querySelector("[data-muur-erbij]").focus();
      update();
    });
    naam.after(weg);
    muren.append(nieuw);
    nummer();
    nieuw.querySelector("input").focus();
    update();
  });

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    update();
  });
  update();
}

// In dit voorbeeld is er nog geen server, dus tonen we eerlijk wat er zou gebeuren.
function initDemoForms() {
  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    const notice = form.querySelector("[data-form-notice]");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (notice) notice.hidden = false;
    });
  });
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px" }
  );

  items.forEach((item) => observer.observe(item));
}

function markToday() {
  const days = document.querySelectorAll("[data-day]");
  if (!days.length) return;

  const today = String(new Date().getDay());
  days.forEach((day) => {
    if (day.dataset.day.split(",").includes(today)) {
      day.dataset.today = "true";
    }
  });
}

/* Openingsuren in minuten na middernacht. Pas je deze aan, pas dan ook de
   lijst met uren op winkel.html, over.html en contact.html aan. */
const OPENINGSUREN = {
  0: [],
  1: "afspraak",
  2: [[510, 720], [780, 1080]],
  3: [[510, 720], [780, 1080]],
  4: [[510, 720], [780, 1080]],
  5: [[510, 720], [780, 1080]],
  6: [[540, 900]],
};

const DAGNAMEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

function toonUur(minuten) {
  const u = Math.floor(minuten / 60);
  const m = String(minuten % 60).padStart(2, "0");
  return `${u}.${m}`;
}

function volgendeOpening(vanafDag) {
  for (let i = 1; i <= 7; i += 1) {
    const dag = (vanafDag + i) % 7;
    const uren = OPENINGSUREN[dag];
    if (Array.isArray(uren) && uren.length) {
      return { dag, start: uren[0][0], morgen: i === 1 };
    }
  }
  return null;
}

/* Leest de klok in Brussel, zodat de melding ook klopt voor wie vanuit het
   buitenland kijkt. */
function brusselNu() {
  const delen = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const waarde = (type) => delen.find((d) => d.type === type).value;
  const dagen = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    dag: dagen[waarde("weekday")],
    minuten: Number(waarde("hour")) * 60 + Number(waarde("minute")),
  };
}

function winkelStatus() {
  const nu = brusselNu();
  const vandaag = OPENINGSUREN[nu.dag];

  if (vandaag === "afspraak") {
    return { status: "gesloten", tekst: "Onze winkel is vandaag gesloten, enkel op afspraak" };
  }

  if (Array.isArray(vandaag)) {
    const open = vandaag.find(([start, eind]) => nu.minuten >= start && nu.minuten < eind);
    if (open) {
      return { status: "open", tekst: `Onze winkel is open tot ${toonUur(open[1])}` };
    }

    const straks = vandaag.find(([start]) => nu.minuten < start);
    if (straks) {
      return { status: "straks", tekst: `Onze winkel opent vandaag om ${toonUur(straks[0])}` };
    }
  }

  const volgende = volgendeOpening(nu.dag);
  if (!volgende) return { status: "gesloten", tekst: "Onze winkel is nu gesloten" };

  const wanneer = volgende.morgen ? "morgen" : DAGNAMEN[volgende.dag];
  return {
    status: "gesloten",
    tekst: `Onze winkel is gesloten, ${wanneer} open vanaf ${toonUur(volgende.start)}`,
  };
}

function toonWinkelStatus() {
  const blokken = document.querySelectorAll("[data-winkelstatus]");
  if (!blokken.length) return;

  const { status, tekst } = winkelStatus();
  blokken.forEach((blok) => {
    const doel = blok.querySelector("[data-winkelstatus-tekst]");
    if (!doel) return;
    blok.dataset.winkelstatus = status;
    doel.textContent = tekst;
  });
}

function initKopschaduw() {
  const kop = document.querySelector(".site-header");
  if (!kop) return;
  const zet = () => kop.toggleAttribute("data-gescrold", window.scrollY > 8);
  zet();
  window.addEventListener("scroll", zet, { passive: true });
}

/* Zoals "Vergroten bij klikken" van het Afbeelding-blok in WordPress. Geen foto's in links of banners.
   Foto's uit dezelfde collage of galerij vormen een reeks waar je doorheen bladert. */
function initVergroten() {
  const fotos = [...document.querySelectorAll("main img")].filter(
    (foto) => !foto.closest("a, button, .fotoband, .page-hero, .hero__stage, .person") && !/\.svg$/i.test(foto.getAttribute("src") || "")
  );
  if (!fotos.length || typeof HTMLDialogElement !== "function") return;

  const venster = document.createElement("dialog");
  venster.className = "lichtbak";
  venster.setAttribute("aria-label", "Vergrote foto");
  venster.innerHTML =
    '<button class="lichtbak__sluit" type="button" aria-label="Sluiten">&times;</button>' +
    '<button class="lichtbak__blader lichtbak__blader--vorige" type="button" aria-label="Vorige foto">&lsaquo;</button>' +
    '<button class="lichtbak__blader lichtbak__blader--volgende" type="button" aria-label="Volgende foto">&rsaquo;</button>' +
    '<img alt=""><p class="lichtbak__tekst"><span class="lichtbak__teller"></span><span class="lichtbak__alt"></span></p>';
  document.body.append(venster);
  const groot = venster.querySelector("img");
  const teller = venster.querySelector(".lichtbak__teller");
  const uitleg = venster.querySelector(".lichtbak__alt");

  let reeks = [];
  let plek = 0;
  const toon = (nieuw) => {
    plek = (nieuw + reeks.length) % reeks.length;
    const foto = reeks[plek];
    groot.src = foto.currentSrc || foto.src;
    groot.alt = foto.alt;
    uitleg.textContent = foto.alt;
    teller.textContent = reeks.length > 1 ? `${plek + 1} / ${reeks.length}` : "";
    venster.toggleAttribute("data-reeks", reeks.length > 1);
  };

  venster.querySelector(".lichtbak__sluit").addEventListener("click", () => venster.close());
  venster.querySelector(".lichtbak__blader--vorige").addEventListener("click", () => toon(plek - 1));
  venster.querySelector(".lichtbak__blader--volgende").addEventListener("click", () => toon(plek + 1));
  venster.addEventListener("click", (e) => {
    if (e.target === venster) venster.close();
  });
  venster.addEventListener("close", () => groot.removeAttribute("src"));
  document.addEventListener("keydown", (e) => {
    if (!venster.open) return;
    if (e.key === "Escape") venster.close();
    if (e.key === "ArrowLeft" && reeks.length > 1) toon(plek - 1);
    if (e.key === "ArrowRight" && reeks.length > 1) toon(plek + 1);
  });

  // Vegen op een gsm.
  let startX = null;
  groot.addEventListener("pointerdown", (e) => (startX = e.clientX));
  groot.addEventListener("pointerup", (e) => {
    if (startX === null || reeks.length < 2) return;
    const verschil = e.clientX - startX;
    startX = null;
    if (Math.abs(verschil) > 40) toon(plek + (verschil < 0 ? 1 : -1));
  });

  fotos.forEach((foto) => {
    const groep = foto.closest(".collage, .gallery, .work-grid, .hero__thumbs");
    const leden = groep ? fotos.filter((f) => groep.contains(f)) : [foto];

    const knop = document.createElement("button");
    knop.type = "button";
    knop.className = "vergroot";
    knop.setAttribute("aria-label", `Vergroot de foto: ${foto.alt || "foto"}`);
    foto.replaceWith(knop);
    knop.append(foto);

    // Eén rustig label per reeks, op de eerste foto.
    if (leden.length > 2 && leden[0] === foto) {
      const aantal = document.createElement("span");
      aantal.className = "vergroot__aantal";
      aantal.setAttribute("aria-hidden", "true");
      aantal.textContent = `${leden.length} foto's`;
      knop.append(aantal);
    }

    knop.addEventListener("click", () => {
      reeks = leden;
      toon(leden.indexOf(foto));
      venster.showModal();
    });
  });
}

/* Op een gsm wijkt de belbalk zolang dezelfde knoppen of het formulier al in beeld staan. */
function initBelbalk() {
  const balk = document.querySelector(".call-bar");
  if (!balk || !("IntersectionObserver" in window)) return;

  const doelen = document.querySelectorAll(".hero__actions, #offerte");
  if (!doelen.length) return;

  const inBeeld = new Set();
  const kijker = new IntersectionObserver((items) => {
    items.forEach((item) => (item.isIntersecting ? inBeeld.add(item.target) : inBeeld.delete(item.target)));
    document.documentElement.toggleAttribute("data-belbalk-weg", inBeeld.size > 0);
  });
  doelen.forEach((doel) => kijker.observe(doel));
}

/* Wat iemand in de vragenhulp vertelde, staat al klaar in het offerteformulier. */
function vulAanvraagIn() {
  let aanvraag = null;
  try {
    aanvraag = JSON.parse(sessionStorage.getItem("lyssens-aanvraag"));
    sessionStorage.removeItem("lyssens-aanvraag");
  } catch (e) {
    return;
  }
  if (!aanvraag) return;

  const bericht = document.querySelector("#bericht");
  if (bericht && !bericht.value && typeof aanvraag.bericht === "string") {
    bericht.value = aanvraag.bericht.slice(0, 500);
  }

  const keuze = document.querySelector(`input[name="onderwerp"][value="${CSS.escape(String(aanvraag.onderwerp))}"]`);
  if (keuze) keuze.checked = true;
}

initNav();
initCalculator();
initDemoForms();
initReveal();
markToday();
toonWinkelStatus();
vulAanvraagIn();
initBelbalk();
initKopschaduw();
initVergroten();
