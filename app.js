const API_BASE = "https://inmoovi-backend-production.up.railway.app";
const PUBLIC_WHATSAPP = "5534992423942";

const mapEl = document.getElementById("map");
const mapSkeleton = document.getElementById("map-skeleton");
const overlay = document.getElementById("overlay");
const sheet = document.getElementById("bottom-sheet");
const sheetContent = document.getElementById("sheet-content");
const challengeList = document.getElementById("challenge-list");
const drawerList = document.getElementById("drawer-list");
const challengeEmpty = document.getElementById("challenge-empty");
const drawerEmpty = document.getElementById("drawer-empty");
const drawer = document.getElementById("drawer");
const drawerOpen = document.getElementById("drawer-open");
const drawerClose = document.getElementById("drawer-close");
const modalTriggers = document.querySelectorAll("[data-open-modal]");
const modalCloseButtons = document.querySelectorAll("[data-close-modal]");
const whatsappCtas = document.querySelectorAll("[data-whatsapp]");

const state = {
  map: null,
  challengeLayer: null,
  challenges: [],
  places: [],
  territories: [],
};

const mocks = {
  challenges: [
    {
      id: "c1",
      title: "Parque do Sabia - 5K",
      location: "Parque do Sabia",
      coords: { lat: -19.744, lng: -47.936 },
      rules: "Complete 5 km em qualquer ritmo",
      endsIn: "6 dias",
      link: "inmoovi:start source=landing challenge=c1",
    },
    {
      id: "c2",
      title: "Pista Sul - Ritmo",
      location: "Pista Sul",
      coords: { lat: -19.758, lng: -47.928 },
      rules: "Tente manter o ritmo constante",
      endsIn: "6 dias",
      link: "inmoovi:start source=landing challenge=c2",
    },
    {
      id: "c3",
      title: "Avenida Azul - Longao",
      location: "Avenida Azul",
      coords: { lat: -19.752, lng: -47.918 },
      rules: "Longao acima de 8 km",
      endsIn: "6 dias",
      link: "inmoovi:start source=landing challenge=c3",
    },
  ],
};

const getWhatsAppLink = (text) =>
  `https://wa.me/${PUBLIC_WHATSAPP}?text=${encodeURIComponent(text)}`;

const setWhatsappLinks = () => {
  const baseText = "inmoovi:start source=landing";
  whatsappCtas.forEach((el) => {
    el.href = getWhatsAppLink(baseText);
  });
};

const fetchChallenges = async () => {
  const response = await fetch(`${API_BASE}/api/challenges`);
  if (!response.ok) throw new Error("challenges fetch failed");
  return response.json();
};

const fetchTerritories = async () => {
  const response = await fetch(`${API_BASE}/api/map/territories`);
  if (!response.ok) throw new Error("territories fetch failed");
  return response.json();
};

const fetchPlaces = async () => {
  const response = await fetch(`${API_BASE}/api/map/places`);
  if (!response.ok) throw new Error("places fetch failed");
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

const openDrawer = () => {
  drawer.classList.add("is-visible");
  overlay.classList.add("is-visible");
  drawer.setAttribute("aria-hidden", "false");
  overlay.setAttribute("aria-hidden", "false");
};

const closeDrawer = () => {
  drawer.classList.remove("is-visible");
  overlay.classList.remove("is-visible");
  drawer.setAttribute("aria-hidden", "true");
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

const buildChallengeSheet = (challenge) => {
  const text = challenge.link || `inmoovi:start source=landing challenge=${challenge.id}`;
  const link = getWhatsAppLink(text);
  return `
    <h4>🏁 ${challenge.title}</h4>
    <div class="challenge-meta">${challenge.location || "Uberaba"}</div>
    <div class="challenge-meta">Regras: ${challenge.rules || "Complete o desafio"}</div>
    <div class="challenge-meta">Termina em: ${challenge.endsIn || "-"}</div>
    <div class="sheet-actions">
      <a class="btn btn-primary" href="${link}">Entrar no desafio</a>
      <button class="btn btn-ghost" data-scroll="desafios">Voltar ao mapa</button>
    </div>
  `;
};

const renderChallengeList = (container, challenges) => {
  container.innerHTML = "";
  challenges.forEach((challenge) => {
    const item = document.createElement("div");
    item.className = "challenge-item";
    item.innerHTML = `
      <button type="button" data-challenge-id="${challenge.id}">
        <strong>${challenge.title}</strong>
        <div class="challenge-meta">${challenge.location || "Uberaba"}</div>
        <div class="challenge-meta">${challenge.rules || "Desafio semanal"}</div>
      </button>
    `;
    container.appendChild(item);
  });
};

const handleChallengeClick = (event) => {
  const button = event.target.closest("button[data-challenge-id]");
  if (!button) return;
  const challenge = state.challenges.find((item) => item.id === button.dataset.challengeId);
  if (!challenge) return;
  const coords = getChallengeCoords(challenge);
  if (coords) {
    state.map.setView([coords.lat, coords.lng], 14, { animate: true });
  }
  openSheet(buildChallengeSheet(challenge));
};

const getChallengeCoords = (challenge) => {
  if (challenge.coords && typeof challenge.coords.lat === "number") {
    return { lat: challenge.coords.lat, lng: challenge.coords.lng };
  }
  if (typeof challenge.lat === "number" && typeof challenge.lng === "number") {
    return { lat: challenge.lat, lng: challenge.lng };
  }
  if (challenge.location) {
    const place = state.places.find((item) => item.name === challenge.location);
    if (place) {
      return { lat: place.lat, lng: place.lng };
    }
  }
  return null;
};

const initMap = () => {
  const map = L.map(mapEl, { zoomControl: false }).setView([-19.75, -47.93], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
  L.tileLayer("https://heatmap-external-{s}.strava.com/tiles/run/hot/{z}/{x}/{y}.png", {
    maxZoom: 18,
    opacity: 0.55,
    attribution: "Heatmap data &copy; Strava",
  }).addTo(map);
  state.map = map;
  state.challengeLayer = L.layerGroup().addTo(map);
  return map;
};

const renderChallengesOnMap = (challenges) => {
  state.challengeLayer.clearLayers();
  challenges.forEach((challenge) => {
    const coords = getChallengeCoords(challenge);
    if (!coords) return;
    const icon = L.divIcon({
      className: "",
      html: `<div class="challenge-marker">🏁</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    const marker = L.marker([coords.lat, coords.lng], { icon });
    marker.on("click", () => openSheet(buildChallengeSheet(challenge)));
    marker.addTo(state.challengeLayer);
  });
};

const ensureChallenges = (challenges, places, fallbackPool) => {
  if (challenges.length >= 3) return challenges;
  const needed = 3 - challenges.length;
  const source = places.length ? places : fallbackPool;
  const picks = [...source]
    .filter((item) => typeof item.lat === "number" && typeof item.lng === "number")
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, needed)
    .map((item, index) => ({
      id: `fallback-${index + 1}`,
      title: `${item.name} - Desafio da semana`,
      location: item.name,
      coords: { lat: item.lat, lng: item.lng },
      rules: "Complete 5 km em qualquer ritmo",
      endsIn: "6 dias",
      link: `inmoovi:start source=landing challenge=fallback-${index + 1}`,
    }));
  return [...challenges, ...picks];
};

const hydrateChallenges = () => {
  const hasChallenges = state.challenges.length > 0;
  challengeEmpty.classList.toggle("is-visible", !hasChallenges);
  drawerEmpty.classList.toggle("is-visible", !hasChallenges);
  if (!hasChallenges) return;
  renderChallengeList(challengeList, state.challenges);
  renderChallengeList(drawerList, state.challenges);
  renderChallengesOnMap(state.challenges);
};

const setupEvents = () => {
  overlay.addEventListener("click", () => {
    closeSheet();
    closeDrawer();
  });

  sheet.addEventListener("click", (event) => {
    const scrollTarget = event.target.getAttribute("data-scroll");
    if (!scrollTarget) return;
    closeSheet();
    document.getElementById(scrollTarget).scrollIntoView({ behavior: "smooth" });
  });

  drawerOpen.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);

  challengeList.addEventListener("click", handleChallengeClick);
  drawerList.addEventListener("click", handleChallengeClick);

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

const loadData = async () => {
  showSkeleton();
  const results = await Promise.allSettled([fetchChallenges(), fetchTerritories(), fetchPlaces()]);
  const [challengesResult, territoriesResult, placesResult] = results;

  state.places = placesResult.status === "fulfilled" ? placesResult.value : [];
  state.territories = territoriesResult.status === "fulfilled" ? territoriesResult.value : [];

  const baseChallenges = challengesResult.status === "fulfilled" ? challengesResult.value : mocks.challenges;
  const fallbackPool = mocks.challenges.map((item) => ({
    name: item.location || item.title,
    lat: item.coords?.lat,
    lng: item.coords?.lng,
  }));
  state.challenges = ensureChallenges(baseChallenges, state.places, fallbackPool);

  hideSkeleton();
  hydrateChallenges();
};

const init = () => {
  setWhatsappLinks();
  initMap();
  setupEvents();
  loadData();
};

init();
