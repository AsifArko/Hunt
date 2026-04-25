const TOKEN_KEY = "hunt_dashboard_token";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  repositories: [],
  selectedRepoId: null,
};

const els = {
  loginBtn: document.getElementById("login-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  saveTokenBtn: document.getElementById("save-token-btn"),
  tokenInput: document.getElementById("token-input"),
  repoList: document.getElementById("repo-list"),
  claimsList: document.getElementById("claims-list"),
  status: document.getElementById("status"),
  repoTitle: document.getElementById("repo-title"),
  chart: document.getElementById("clone-chart"),
};

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.style.color = isError ? "#fca5a5" : "#93c5fd";
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    "content-type": "application/json",
  };
  if (state.token) {
    headers.authorization = `Bearer ${state.token}`;
  }
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || "Request failed";
    throw new Error(message);
  }
  return body;
}

function renderRepositoryList() {
  if (state.repositories.length === 0) {
    els.repoList.innerHTML = "<p>No repositories connected yet.</p>";
    return;
  }

  els.repoList.innerHTML = "";
  for (const repo of state.repositories) {
    const btn = document.createElement("button");
    btn.className = `repo-item ${repo.id === state.selectedRepoId ? "active" : ""}`;
    btn.textContent = `${repo.owner}/${repo.name}`;
    btn.addEventListener("click", () => {
      state.selectedRepoId = repo.id;
      renderRepositoryList();
      void loadRepositoryDetails(repo);
    });
    els.repoList.appendChild(btn);
  }
}

function renderClaims(items) {
  if (!items || items.length === 0) {
    els.claimsList.innerHTML = "<p>No claims found for this repository.</p>";
    return;
  }
  els.claimsList.innerHTML = "";
  for (const claim of items) {
    const div = document.createElement("div");
    div.className = "claim-item";
    div.innerHTML = `
      <div><strong>ID:</strong> ${claim.id}</div>
      <div><strong>User:</strong> ${claim.userId}</div>
      <div><strong>Status:</strong> ${claim.verificationStatus}</div>
      <div><strong>Confidence:</strong> ${claim.confidenceLevel}</div>
    `;
    els.claimsList.appendChild(div);
  }
}

function renderChart(metrics) {
  const canvas = els.chart;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px sans-serif";

  if (!metrics || metrics.length === 0) {
    ctx.fillText("No clone metrics yet.", 20, 30);
    return;
  }

  const points = metrics.map((item) => item.totalClones);
  const max = Math.max(...points, 1);
  const padding = 30;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  ctx.strokeStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  metrics.forEach((item, index) => {
    const x = padding + (index / Math.max(metrics.length - 1, 1)) * width;
    const y = canvas.height - padding - (item.totalClones / max) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

async function loadRepositoryDetails(repo) {
  try {
    setStatus(`Loading details for ${repo.owner}/${repo.name}...`);
    els.repoTitle.textContent = `${repo.owner}/${repo.name}`;
    const [metricsResult, claimsResult] = await Promise.all([
      apiRequest(`/v1/repos/${repo.id}/metrics/clones`),
      apiRequest(`/v1/repos/${repo.id}/claims`),
    ]);
    renderChart(metricsResult.items || []);
    renderClaims(claimsResult.items || []);
    setStatus(`Loaded ${repo.owner}/${repo.name}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to load repo details", true);
  }
}

async function loadRepositories() {
  try {
    setStatus("Loading repositories...");
    const result = await apiRequest("/v1/repos");
    state.repositories = result.items || [];
    if (state.repositories.length > 0 && !state.selectedRepoId) {
      state.selectedRepoId = state.repositories[0].id;
    }
    renderRepositoryList();
    const selected = state.repositories.find((item) => item.id === state.selectedRepoId);
    if (selected) {
      await loadRepositoryDetails(selected);
    } else {
      renderChart([]);
      renderClaims([]);
      setStatus("No repositories connected.");
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load repositories", true);
  }
}

async function login() {
  try {
    const response = await fetch("/auth/github/start");
    const body = await response.json();
    if (!response.ok || !body.authorizeUrl) {
      throw new Error("Failed to start GitHub OAuth.");
    }
    window.location.href = body.authorizeUrl;
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Login failed", true);
  }
}

function saveToken() {
  const token = els.tokenInput.value.trim();
  state.token = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  void loadRepositories();
}

function logout() {
  state.token = "";
  state.repositories = [];
  state.selectedRepoId = null;
  localStorage.removeItem(TOKEN_KEY);
  els.tokenInput.value = "";
  renderRepositoryList();
  renderChart([]);
  renderClaims([]);
  setStatus("Logged out.");
  fetch("/auth/logout", { credentials: "same-origin" }).catch(() => undefined);
}

function initialize() {
  els.tokenInput.value = state.token;
  els.loginBtn.addEventListener("click", () => void login());
  els.saveTokenBtn.addEventListener("click", saveToken);
  els.logoutBtn.addEventListener("click", logout);

  if (state.token) {
    void loadRepositories();
  } else {
    setStatus("Login with GitHub or paste token.");
    void loadRepositories();
  }
}

initialize();
