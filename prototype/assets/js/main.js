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
  const number = (name) => parseFloat(form.elements[name].value.replace(",", ".")) || 0;

  const update = () => {
    const lengte = number("lengte");
    const breedte = number("breedte");
    const hoogte = number("hoogte");
    const lagen = number("lagen") || 2;

    if (!lengte || !breedte || !hoogte) {
      result.innerHTML = "Vul je afmetingen in, dan rekenen we het meteen uit.";
      return;
    }

    let oppervlakte = 2 * (lengte + breedte) * hoogte;
    if (form.elements.plafond.checked) oppervlakte += lengte * breedte;

    const netto = oppervlakte * 0.88;
    const liter = Math.ceil(((netto * lagen) / 10) * 2) / 2;

    result.innerHTML =
      `<strong>Ongeveer ${liter.toLocaleString("nl-BE")} liter</strong>` +
      `Voor zo'n ${Math.round(netto)} m² in ${lagen} lagen. Kom gerust langs met dit cijfer, ` +
      `dan mengen we je kleur terwijl je wacht.`;
  };

  form.addEventListener("input", update);
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
  const blok = document.querySelector("[data-winkelstatus]");
  if (!blok) return;

  const doel = blok.querySelector("[data-winkelstatus-tekst]");
  if (!doel) return;

  const { status, tekst } = winkelStatus();
  blok.dataset.winkelstatus = status;
  doel.textContent = tekst;
}

initNav();
initCalculator();
initDemoForms();
initReveal();
markToday();
toonWinkelStatus();
