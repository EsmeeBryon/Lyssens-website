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

initNav();
initCalculator();
initDemoForms();
initReveal();
markToday();
