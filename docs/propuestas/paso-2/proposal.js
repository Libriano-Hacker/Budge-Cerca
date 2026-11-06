(() => {
  "use strict";
  const ideas = window.TBC_IDEAS;
  const byId = new Map(ideas.map((idea) => [idea.id, idea]));
  const stateKey = "tu-barrio-cerca:propuesta-paso2:v1";
  let decisions = Object.create(null);
  try {
    const raw = localStorage.getItem(stateKey) || "{}";
    if (raw.length < 10000) {
      const stored = JSON.parse(raw);
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        for (const idea of ideas) {
          const value = Object.hasOwn(stored, idea.id) ? stored[idea.id] : null;
          if (value === "accepted" || value === "rejected")
            decisions[idea.id] = value;
        }
      }
    }
  } catch {
    /* El bosquejo también funciona sin almacenamiento. */
  }
  const paths = {
    pin: [
      "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z",
      "M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    ],
    phone: [
      "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z",
      "M11 18h2",
    ],
    grid: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
    layers: ["m12 2 10 5-10 5L2 7l10-5ZM2 12l10 5 10-5M2 17l10 5 10-5"],
    check: ["m5 12 4 4L19 6"],
    info: ["M12 8h.01M12 11v6", "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z"],
    user: ["M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2"],
    users: [
      "M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a7 7 0 0 1 14 0v2M18 3a4 4 0 0 1 0 8M21 21v-2a7 7 0 0 0-3-5",
    ],
    chevron: ["m6 9 6 6 6-6"],
    search: ["M19 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM16 16l6 6"],
    sparkle: ["m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"],
    heart: [
      "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
    ],
    arrow: ["M4 12h16m-6-6 6 6-6 6"],
    back: ["M20 12H4m6 6-6-6 6-6"],
    compass: [
      "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0ZM16 8l-3 5-5 3 3-5 5-3Z",
    ],
    tag: ["M20 13 11 22 2 13V2h11l9 9-2 2ZM7 7h.01"],
    download: ["M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"],
    share: ["M12 16V2m-5 5 5-5 5 5M5 10H3v12h18V10h-2"],
    image: ["M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M16 7h.01"],
    calendar: ["M3 5h18v17H3zM7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"],
    chat: ["M21 11a9 9 0 0 1-9 9 11 11 0 0 1-4-1l-6 3 2-6a9 9 0 1 1 17-5Z"],
    bell: ["M18 8a6 6 0 0 0-12 0c0 8-3 8-3 9h18c0-1-3-1-3-9ZM10 21h4"],
    lock: ["M5 10h14v12H5zM8 10V6a4 4 0 1 1 8 0v4M12 15v3"],
    shop: [
      "M3 10h18l-2-7H5l-2 7ZM4 10v12h16V10M9 22v-8h6v8M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0",
    ],
    inbox: ["M4 3h16l3 12v6H1v-6L4 3ZM1 15h6l2 3h6l2-3h6"],
    chart: ["M3 3v18h18M7 16V9M12 16V5M17 16v-4"],
    more: ["M5 12h.01M12 12h.01M19 12h.01"],
    upload: ["M12 16V2m-5 5 5-5 5 5M3 16v6h18v-6"],
    save: ["M4 2h13l4 4v16H3V2h1ZM7 2v7h10V2M7 22v-8h10v8"],
    copy: ["M9 9h13v13H9zM16 5V2H2v14h3"],
    close: ["m5 5 14 14M19 5 5 19"],
    qr: [
      "M2 2h7v7H2zM15 2h7v7h-7zM2 15h7v7H2zM15 15h3v3h4v4h-7v-4M12 2v3M12 9v3H2M22 12h-7v-2M11 22v-7h2",
    ],
  };
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function icons(scope = document) {
    for (const slot of scope.querySelectorAll("[data-icon]")) {
      if (slot.childElementCount) continue;
      const key = slot.dataset.icon;
      if (!Object.hasOwn(paths, key)) continue;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      for (const shape of paths[key]) {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("d", shape);
        svg.append(path);
      }
      slot.append(svg);
    }
  }
  function icon(name) {
    const slot = node("i");
    slot.dataset.icon = name;
    const box = node("span");
    box.append(slot);
    icons(box);
    return slot;
  }
  let toastTimer;
  function toast(message) {
    const target = document.getElementById("toast");
    target.textContent = message;
    target.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      target.hidden = true;
    }, 6500);
  }
  function showScreen(screen, scroll = true) {
    if (!["usuarios", "resumen", "publicar", "lista"].includes(screen)) return;
    for (const pane of document.querySelectorAll(".review-pane")) {
      pane.hidden = pane.id !== screen;
      pane.classList.toggle("active", pane.id === screen);
    }
    for (const button of document.querySelectorAll(
      '.review-tabs [role="tab"]',
    )) {
      button.setAttribute(
        "aria-selected",
        String(button.dataset.screen === screen),
      );
      button.tabIndex = button.dataset.screen === screen ? 0 : -1;
    }
    history.replaceState(null, "", `#${screen}`);
    if (scroll)
      document
        .querySelector(".review-tabs")
        .scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function saveDecision(id, decision) {
    if (!byId.has(id)) return;
    if (decisions[id] === decision) delete decisions[id];
    else decisions[id] = decision;
    try {
      localStorage.setItem(stateKey, JSON.stringify(decisions));
    } catch {
      toast(
        "La elección queda en esta sesión. Podés copiarla para compartirla.",
      );
    }
    renderDecisions();
  }
  function renderDecisions() {
    for (const card of document.querySelectorAll("[data-idea-card]")) {
      card.dataset.decision = decisions[card.dataset.ideaCard] || "";
    }
    for (const button of document.querySelectorAll("button[data-decision]")) {
      const isChosen = decisions[button.dataset.id] === button.dataset.decision;
      button.setAttribute("aria-pressed", String(isChosen));
    }
    document.getElementById("selection-count").textContent = String(
      ideas.filter((idea) => decisions[idea.id] === "accepted").length,
    );
  }
  function decisionButton(id, decision, text) {
    const button = node("button", text);
    button.dataset.id = id;
    button.dataset.decision = decision;
    button.setAttribute("aria-pressed", String(decisions[id] === decision));
    return button;
  }
  function openIdea(id) {
    const idea = byId.get(id);
    if (!idea) return;
    document.getElementById("dialog-eyebrow").textContent =
      `MEJORA ${id} / ${idea.audience.toUpperCase()} / ${idea.priority}`;
    document.getElementById("dialog-title").textContent = idea.title;
    const body = document.getElementById("dialog-body");
    body.replaceChildren();
    for (const [label, value] of [
      ["Hoy", idea.existing],
      ["Propuesta", idea.proposal],
      ["Qué aporta", idea.benefit],
      ["Qué necesita", idea.dependency],
    ]) {
      body.append(node("h3", label), node("p", value));
    }
    const actions = document.getElementById("dialog-actions");
    actions.replaceChildren(
      decisionButton(id, "accepted", "Me interesa"),
      decisionButton(id, "rejected", "Por ahora no"),
    );
    actions.firstElementChild.className = "button primary";
    actions.lastElementChild.className = "button secondary";
    document.getElementById("idea-dialog").showModal();
  }
  function actionDialog(title) {
    const dialog = document.getElementById("action-dialog");
    document.getElementById("action-title").textContent = title;
    const body = document.getElementById("action-body");
    body.replaceChildren();
    dialog.showModal();
    return body;
  }
  function simulateCoupon() {
    const body = actionDialog("Un beneficio, con reglas claras.");
    const box = node("div", undefined, "simulated-coupon");
    box.append(
      icon("qr"),
      node("strong", "15% en corte + barba"),
      node("small", "CUPÓN FICTICIO · SIN CÓDIGO VÁLIDO"),
    );
    body.append(
      box,
      node(
        "p",
        "Ejemplo: un uso por persona, con turno previo y dentro de la vigencia de la promoción. El vecino podría guardarlo y presentarlo en el comercio.",
      ),
      node(
        "p",
        "Este bosquejo no genera un QR de canje ni reserva cupos.",
        "simulation-notice",
      ),
    );
    const button = node("button", "Ver propuesta 03", "button primary");
    button.addEventListener("click", () => {
      document.getElementById("action-dialog").close();
      openIdea("03");
    });
    body.append(button);
  }
  function simulateAppointment() {
    const body = actionDialog("Elegí tu preferencia de turno.");
    body.append(
      node(
        "p",
        "La propuesta permite preparar una solicitud. El comercio confirma el día y horario; elegirlos no reserva automáticamente.",
      ),
    );
    const fields = node("div", undefined, "simulation-fields");
    const serviceLabel = node("label", "Servicio");
    const service = node("select");
    for (const value of ["Corte de cabello", "Corte + barba"]) {
      const option = node("option", value);
      service.append(option);
    }
    serviceLabel.append(service);
    const dateLabel = node("label", "Día preferido · ejemplo");
    const date = node("input");
    date.type = "date";
    date.value = "2026-11-12";
    dateLabel.append(date);
    const timeLabel = node("label", "Franja preferida");
    const time = node("select");
    for (const value of ["Por la mañana", "Por la tarde"])
      time.append(node("option", value));
    timeLabel.append(time);
    fields.append(serviceLabel, dateLabel, timeLabel);
    const notice = node(
      "p",
      "Solicitud pendiente de confirmación. Datos de ejemplo.",
      "simulation-notice",
    );
    const button = node(
      "button",
      "Ver solicitud (demo)",
      "button primary full",
    );
    button.addEventListener("click", () => {
      notice.textContent = `Ejemplo de solicitud: ${service.value}, ${date.value || "día a coordinar"}, ${time.value.toLowerCase()}. No se envió ningún mensaje ni se reservó un turno.`;
    });
    body.append(fields, notice, button);
  }
  function simulatePublish() {
    const body = actionDialog("Así sería revisar y confirmar.");
    body.append(
      node(
        "p",
        "El creador vería los cambios de la ficha antes de publicarlos y podría recuperar una versión anterior.",
      ),
      node(
        "p",
        "Este botón pertenece al bosquejo. No cambia el catálogo ni publica contenido en Internet.",
        "simulation-notice",
      ),
    );
    const button = node(
      "button",
      "Entendido, cerrar simulación",
      "button primary",
    );
    button.addEventListener("click", () => {
      document.getElementById("action-dialog").close();
      toast("Simulación terminada. La web publicada sigue igual.");
    });
    body.append(button);
  }
  function buildIdeas() {
    const grid = document.getElementById("ideas-grid");
    for (const idea of ideas) {
      const card = node("article", undefined, "idea-card");
      card.dataset.ideaCard = idea.id;
      card.dataset.audience = idea.audience.toLowerCase();
      card.dataset.priority = idea.priority;
      const top = node("div", undefined, "idea-card-top");
      top.append(
        node("span", idea.id),
        node("small", idea.audience),
        node(
          "span",
          idea.priority === "P1"
            ? "PRIMERA ENTREGA"
            : idea.priority === "P2"
              ? "SIGUIENTE"
              : "CRECIMIENTO",
          `priority ${idea.priority.toLowerCase()}`,
        ),
      );
      const dependency = node("div", undefined, "dependency");
      dependency.append(
        node("strong", "QUÉ NECESITA"),
        node("span", idea.dependency),
      );
      const actions = node("div", undefined, "idea-card-actions");
      const details = node("button", "Ver detalle");
      details.dataset.idea = idea.id;
      actions.append(
        decisionButton(idea.id, "accepted", "Me interesa"),
        decisionButton(idea.id, "rejected", "Por ahora no"),
        details,
      );
      card.append(
        top,
        node("h3", idea.title),
        node("p", idea.proposal),
        dependency,
        actions,
      );
      grid.append(card);
    }
    renderDecisions();
  }
  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (!target) return;
    if (target.dataset.screen) showScreen(target.dataset.screen);
    else if (target.dataset.idea) openIdea(target.dataset.idea);
    else if (target.dataset.decision && target.dataset.id)
      saveDecision(target.dataset.id, target.dataset.decision);
    else if (target.hasAttribute("data-close"))
      target.closest("dialog").close();
    else if (target.dataset.demo) toast(target.dataset.demo);
    else if (target.dataset.action === "coupon") simulateCoupon();
    else if (target.dataset.action === "appointment") simulateAppointment();
    else if (target.dataset.action === "publish") simulatePublish();
    else if (target.dataset.action === "open-detail") {
      document
        .getElementById("detail-phone")
        .scrollIntoView({ block: "center", behavior: "smooth" });
      toast(
        "Ejemplo de recorrido: de la búsqueda a una ficha con servicios, fotos y beneficios.",
      );
    } else if (target.hasAttribute("data-follow")) {
      const selected = target.getAttribute("aria-pressed") !== "true";
      target.setAttribute("aria-pressed", String(selected));
      toast(
        selected
          ? "Favorito marcado en este bosquejo. La sincronización opcional se propone en la mejora 05."
          : "Favorito de ejemplo desmarcado.",
      );
    } else if (target.hasAttribute("data-alerts")) {
      const selected = target.getAttribute("aria-pressed") !== "true";
      target.setAttribute("aria-pressed", String(selected));
      toast(
        selected
          ? "Preferencia simulada. No se pidieron permisos ni se activaron notificaciones reales."
          : "Preferencia simulada desactivada.",
      );
    } else if (target.dataset.filter) {
      target.classList.toggle("active");
      const count = document.querySelectorAll(".filter.active").length;
      document.getElementById("filter-status").textContent =
        `${count} ${count === 1 ? "filtro de ejemplo" : "filtros de ejemplo"}`;
    } else if (target.dataset.suggestion) {
      document.getElementById("demo-search").value = target.dataset.suggestion;
      document.getElementById("filter-status").textContent =
        "Resultado ficticio";
    } else if (target.dataset.ideaFilter) {
      const filter = target.dataset.ideaFilter;
      for (const button of document.querySelectorAll("[data-idea-filter]"))
        button.classList.toggle("active", button === target);
      for (const card of document.querySelectorAll("[data-idea-card]")) {
        card.hidden = !(
          filter === "todas" ||
          (filter === "P1" && card.dataset.priority === "P1") ||
          (filter === "usuarios" &&
            card.dataset.audience.includes("usuario")) ||
          (filter === "dashboard" &&
            card.dataset.audience.includes("dashboard"))
        );
      }
    }
  });
  document
    .getElementById("preview-name-input")
    .addEventListener("input", (event) => {
      document.getElementById("preview-name").textContent =
        event.target.value.trim() || "Nombre del comercio";
    });
  for (const [inputId, targetId] of [
    ["preview-description-input", "preview-description"],
    ["preview-neighborhood-select", "preview-neighborhood"],
    ["preview-category-select", "preview-category"],
  ]) {
    document.getElementById(inputId).addEventListener("input", (event) => {
      document.getElementById(targetId).textContent = event.target.value.trim();
    });
  }
  document
    .getElementById("demo-neighborhood")
    .addEventListener("change", (event) => {
      for (const label of document.querySelectorAll("[data-neighborhood]"))
        label.textContent = event.target.value;
    });
  document.getElementById("demo-search").maxLength = 60;
  document
    .getElementById("copy-selection")
    .addEventListener("click", async () => {
      const accepted = ideas.filter(
        (idea) => decisions[idea.id] === "accepted",
      );
      const rejected = ideas.filter(
        (idea) => decisions[idea.id] === "rejected",
      );
      const text = `Tu Barrio Cerca · revisión de propuestas\n\nMe interesan:\n${accepted.length ? accepted.map((idea) => `${idea.id}. ${idea.title}`).join("\n") : "Sin selección todavía."}\n\nPor ahora no:\n${rejected.length ? rejected.map((idea) => `${idea.id}. ${idea.title}`).join("\n") : "Sin descartes."}\n\nSon preferencias para revisar; no se ejecutan cambios automáticamente.`;
      document.getElementById("selection-text").value = text;
      document.getElementById("selection-output").hidden = false;
      try {
        await navigator.clipboard.writeText(text);
        toast("Selección copiada. Podés pegarla en este chat.");
      } catch {
        document.getElementById("selection-text").select();
        toast(
          "Podés copiar manualmente el texto que aparece debajo de las propuestas.",
        );
      }
    });
  document
    .querySelector(".review-tabs")
    .addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      const tabs = [...document.querySelectorAll('.review-tabs [role="tab"]')];
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      event.preventDefault();
      showScreen(tabs[next].dataset.screen, false);
      tabs[next].focus();
    });
  buildIdeas();
  icons();
  showScreen(location.hash.slice(1) || "usuarios", false);
})();
