const API_BASE =
  new URLSearchParams(location.search).get("api") ||
  "https://inmoovi-backend-production.up.railway.app";
const PUBLIC_WHATSAPP = "5534992423942";

const mapEl = document.getElementById("map");
const mapSkeleton = document.getElementById("map-skeleton");
const placesGrid = document.getElementById("places-grid");
const overlay = document.getElementById("overlay");
const sheet = document.getElementById("bottom-sheet");
const sheetContent = document.getElementById("sheet-content");
const mapBadges = document.querySelector(".map-badges");

const chipButtons = document.querySelectorAll(".chip");
const modalTriggers = document.querySelectorAll("[data-open-modal]");
const modalCloseButtons = document.querySelectorAll("[data-close-modal]");
const whatsappCtas = document.querySelectorAll("[data-whatsapp]");

const mocks = {
  places: [
    {
      id: "p1",
      name: "Parque do Sabia",
      lat: -19.744,
      lng: -47.936,
      image: "",
      tags: ["plano", "iluminado"],
      bestTime: "18-20h",
      description: "Otimo pra corrida leve e longao.",
    },
    {
      id: "p2",
      name: "Pista Sul",
      lat: -19.758,
      lng: -47.928,
      image: "",
      tags: ["tiros", "rapido"],
      bestTime: "06-08h",
      description: "Pista mais rapida da cidade.",
    },
    {
      id: "p3",
      name: "Avenida Azul",
      lat: -19.752,
      lng: -47.918,
      image: "",
      tags: ["longao", "seguro"],
      bestTime: "19-21h",
      description: "Ideal para longoes e ritmo constante.",
    },
  ],
};

const state = {
  territories: [],
  places: [],
  challenges: [],
  activeChip: "places",
  map: null,
  territoryLayer: null,
  placesLayer: null,
  challengeLayer: null,
};

const getWhatsAppLink = (text) => {
  const message = encodeURIComponent(text);
  return `https://wa.me/${PUBLIC_WHATSAPP}?text=${message}`;
};

const setWhatsappLinks = () => {
  const baseText = "inmoovi:start source=landing";
  whatsappCtas.forEach((el) => {
    el.href = getWhatsAppLink(baseText);
  });
};

const fetchTerritories = async ({ bbox, z }) => {
  const url = `${API_BASE}/api/map/territories?bbox=${bbox.join(",")}&z=${z}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("territories fetch failed");
  return response.json();
};

const fetchPlaces = async ({ city }) => {
  const url = `${API_BASE}/api/map/places?city=${encodeURIComponent(city)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("places fetch failed");
  return response.json();
};

const fetchChallenges = async () => {
  const url = `${API_BASE}/api/challenges`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("challenges fetch failed");
  return response.json();
};

const showSkeleton = () => {
  mapSkeleton.classList.add("is-visible");
};

const hideSkeleton = () => {
  mapSkeleton.classList.remove("is-visible");
};

const openSheet = (html) => {
  sheetContent.innerHTML = html;
  sheet.classList.add("is-visible");
  overlay.classList.add("is-visible");
  sheet.setAttribute("aria-hidden", "false");
  overlay.setAttribute("aria-hidden", "false");
};

const closeSheet = () => {
  sheet.classList.remove("is-visible");
  overlay.classList.remove("is-visible");
  sheet.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-hidden", "true");
};

const openModal = (id) => {
  const modal = document.getElementById(`modal-${id}`);
  if (!modal) return;
  modal.classList.add("is-visible");
  modal.setAttribute("aria-hidden", "false");
};

const closeModal = (modal) => {
  modal.classList.remove("is-visible");
  modal.setAttribute("aria-hidden", "true");
};

const buildTerritorySheet = (territory) => {
  const dominance = territory.consistency >= 90 ? "Consistencia" : "Velocidade";
  const link = getWhatsAppLink(
    `inmoovi:start source=landing territory=${territory.id} takeover=true`
  );
  return `
    <h4>🟦 ${territory.label}</h4>
    <div class="place-meta">Dominio: ${dominance}</div>
    <div class="place-meta">Streak: ${territory.streakWeeks} semanas</div>
    <div class="place-meta">Consistencia: ${territory.consistency}/100</div>
    <div class="place-meta">Pico: ${territory.peak}</div>
    <div class="place-meta">Bom pra: ${territory.goodFor}</div>
    <div class="sheet-actions">
      <a class="btn btn-primary" href="${link}">Tomar posto</a>
      <button class="btn btn-ghost" data-scroll="lugares">Ver lugares perto</button>
    </div>
  `;
};

const buildPlaceSheet = (place) => {
  const link = getWhatsAppLink(`inmoovi:start source=landing place=${place.id}`);
  return `
    <h4>${place.name}</h4>
    <div class="place-meta">${place.description}</div>
    <div class="place-meta">Tags: ${place.tags.join(" / ")}</div>
    <div class="place-meta">Melhor horario: ${place.bestTime}</div>
    <div class="sheet-actions">
      <a class="btn btn-primary" href="${link}">Enviar pro meu WhatsApp</a>
      <button class="btn btn-ghost" data-scroll="mapa">Voltar ao mapa</button>
    </div>
  `;
};

const buildChallengeSheet = (challenge) => {
  const link = getWhatsAppLink(`inmoovi:start source=landing challenge=${challenge.id}`);
  return `
    <h4>🏁 ${challenge.title}</h4>
    <div class="place-meta">${challenge.goal}</div>
    <div class="place-meta">Tag: ${challenge.tag}</div>
    <div class="sheet-actions">
      <a class="btn btn-primary" href="${link}">Entrar no desafio</a>
      <button class="btn btn-ghost" data-scroll="mapa">Voltar ao mapa</button>
    </div>
  `;
};

const renderPlaces = (places) => {
  placesGrid.innerHTML = "";
  places.forEach((place) => {
    const card = document.createElement("article");
    card.className = "place-card";
    card.innerHTML = `
      <button class="place-button" data-place-id="${place.id}">
        <div class="place-image"></div>
        <h3>${place.name}</h3>
        <div class="place-tags">
          ${place.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
        <div class="place-meta">Melhor horario: ${place.bestTime}</div>
      </button>
    `;
    placesGrid.appendChild(card);
  });
};

const initMap = () => {
  const map = L.map(mapEl, { zoomControl: false }).setView([-19.752, -47.932], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  L.tileLayer("https://heatmap-external-{s}.strava.com/tiles/run/hot/{z}/{x}/{y}.png", {
    maxZoom: 18,
    opacity: 0.65,
    attribution: "Heatmap data &copy; Strava",
  }).addTo(map);
  state.map = map;
  state.territoryLayer = L.layerGroup().addTo(map);
  state.placesLayer = L.layerGroup().addTo(map);
  state.challengeLayer = L.layerGroup().addTo(map);
  return map;
};

const renderTerritories = (territories) => {
  state.territoryLayer.clearLayers();
  territories.forEach((territory) => {
    const icon = L.divIcon({
      className: "",
      html: `<div class="hex-marker" data-id="${territory.id}"></div>`,
      iconSize: [34, 30],
      iconAnchor: [17, 15],
    });
    const marker = L.marker([territory.lat, territory.lng], { icon });
    marker.on("click", () => {
      openSheet(buildTerritorySheet(territory));
    });
    marker.addTo(state.territoryLayer);
  });
};

const renderPlacesPins = (places) => {
  state.placesLayer.clearLayers();
  places.forEach((place) => {
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin-marker"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
    const marker = L.marker([place.lat, place.lng], { icon });
    marker.on("click", () => {
      openSheet(buildPlaceSheet(place));
    });
    marker.addTo(state.placesLayer);
  });
};

const renderChallenges = (challenges) => {
  state.challengeLayer.clearLayers();
  challenges.forEach((challenge) => {
    if (typeof challenge.lat !== "number" || typeof challenge.lng !== "number") {
      return;
    }
    const icon = L.divIcon({
      className: "",
      html: `<div class="challenge-marker">🏁</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const marker = L.marker([challenge.lat, challenge.lng], { icon });
    marker.on("click", () => {
      openSheet(buildChallengeSheet(challenge));
    });
    marker.addTo(state.challengeLayer);
  });
};

const highlightDominant = () => {
  const top = [...state.territories].sort((a, b) => b.score - a.score).slice(0, 2);
  document.querySelectorAll(".hex-marker").forEach((hex) => {
    const match = top.find((item) => item.id === hex.dataset.id);
    if (match) {
      hex.classList.add("is-dominant");
    } else {
      hex.classList.remove("is-dominant");
    }
  });
};

const highlightBestTime = () => {
  const hour = new Date().getHours();
  const matchIds = state.territories
    .filter((territory) => {
      const parts = territory.peak.split("-");
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      return hour >= start && hour <= end;
    })
    .map((territory) => territory.id);

  document.querySelectorAll(".hex-marker").forEach((hex) => {
    if (matchIds.includes(hex.dataset.id)) {
      hex.classList.add("is-dominant");
    } else {
      hex.classList.remove("is-dominant");
    }
  });
};

const renderChallengesBadges = (challenges) => {
  mapBadges.innerHTML = "";
  challenges.forEach((challenge) => {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = challenge.tag || challenge.title;
    mapBadges.appendChild(badge);
  });
};

const updateChipState = (chip) => {
  chipButtons.forEach((button) => button.classList.remove("is-active"));
  chip.classList.add("is-active");
  state.activeChip = chip.dataset.chip;

  mapBadges.classList.toggle("is-visible", state.activeChip === "challenges");

  if (state.activeChip === "places") {
    state.map.addLayer(state.placesLayer);
    state.map.removeLayer(state.challengeLayer);
    highlightDominant();
  }

  if (state.activeChip === "dominance") {
    highlightDominant();
    state.map.removeLayer(state.placesLayer);
    state.map.removeLayer(state.challengeLayer);
  }

  if (state.activeChip === "best-time") {
    highlightBestTime();
    state.map.removeLayer(state.placesLayer);
    state.map.removeLayer(state.challengeLayer);
  }

  if (state.activeChip === "challenges") {
    highlightDominant();
    state.map.addLayer(state.placesLayer);
    state.map.addLayer(state.challengeLayer);
  }
};

const setupChipListeners = () => {
  chipButtons.forEach((chip) => {
    chip.addEventListener("click", () => updateChipState(chip));
  });
};

const setupPlaceListeners = () => {
  placesGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".place-button");
    if (!button) return;
    const place = state.places.find((item) => item.id === button.dataset.placeId);
    if (!place) return;
    openSheet(buildPlaceSheet(place));
  });
};

const setupSheetButtons = () => {
  sheet.addEventListener("click", (event) => {
    const scrollTarget = event.target.getAttribute("data-scroll");
    if (!scrollTarget) return;
    closeSheet();
    document.getElementById(scrollTarget).scrollIntoView({ behavior: "smooth" });
  });
};

const setupOverlay = () => {
  overlay.addEventListener("click", closeSheet);
};

const setupModals = () => {
  modalTriggers.forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.openModal));
  });

  modalCloseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const modal = button.closest(".modal");
      if (modal) closeModal(modal);
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });
};

const setupSheetDrag = () => {
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  sheet.addEventListener("touchstart", (event) => {
    startY = event.touches[0].clientY;
    isDragging = true;
  });

  sheet.addEventListener("touchmove", (event) => {
    if (!isDragging) return;
    currentY = event.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      sheet.style.transform = `translateY(${diff}px)`;
    }
  });

  sheet.addEventListener("touchend", () => {
    isDragging = false;
    const diff = currentY - startY;
    sheet.style.transform = "translateY(0)";
    if (diff > 120) closeSheet();
  });
};

const loadData = async () => {
  showSkeleton();
  const map = state.map;
  const bounds = map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];

  const results = await Promise.allSettled([
    fetchTerritories({ bbox, z: map.getZoom() }),
    fetchPlaces({ city: "Uberlandia" }),
    fetchChallenges(),
  ]);

  const [territoriesResult, placesResult, challengesResult] = results;
  state.territories = territoriesResult.status === "fulfilled" ? territoriesResult.value : [];
  state.places = placesResult.status === "fulfilled" ? placesResult.value : mocks.places;
  state.challenges = challengesResult.status === "fulfilled" ? challengesResult.value : [];

  hideSkeleton();

  renderTerritories(state.territories);
  renderPlacesPins(state.places);
  renderChallenges(state.challenges);
  renderPlaces(state.places);
  renderChallengesBadges(state.challenges);
  highlightDominant();
};

const init = () => {
  setWhatsappLinks();
  initMap();
  const activeChip = document.querySelector(".chip.is-active");
  if (activeChip) {
    updateChipState(activeChip);
  }
  setupChipListeners();
  setupPlaceListeners();
  setupSheetButtons();
  setupOverlay();
  setupModals();
  setupSheetDrag();
  loadData();
};

init();
