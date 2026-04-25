const TOKEN_KEY = "hunt_dashboard_token";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  isAuthenticated: false,
  repositories: [],
  selectedRepoId: null,
  currentMetrics: [],
  chartModel: null,
  githubDiscovery: {
    owners: [],
    repositories: [],
    branchMap: {},
  },
};

const els = {
  loginBtn: document.getElementById("login-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  saveTokenBtn: document.getElementById("save-token-btn"),
  tokenInput: document.getElementById("token-input"),
  repoOwnerCombo: document.getElementById("repo-owner-combo"),
  repoOwnerInput: document.getElementById("repo-owner-input"),
  repoOwnerMenu: document.getElementById("repo-owner-menu"),
  repoOwnerToggle: document.getElementById("repo-owner-toggle"),
  repoNameCombo: document.getElementById("repo-name-combo"),
  repoNameInput: document.getElementById("repo-name-input"),
  repoNameMenu: document.getElementById("repo-name-menu"),
  repoNameToggle: document.getElementById("repo-name-toggle"),
  repoIdInput: document.getElementById("repo-id-input"),
  repoBranchCombo: document.getElementById("repo-branch-combo"),
  repoBranchInput: document.getElementById("repo-branch-input"),
  repoBranchMenu: document.getElementById("repo-branch-menu"),
  repoBranchToggle: document.getElementById("repo-branch-toggle"),
  connectRepoBtn: document.getElementById("connect-repo-btn"),
  repoList: document.getElementById("repo-list"),
  repoTitle: document.getElementById("repo-title"),
  repoMeta: document.getElementById("repo-meta"),
  chartTooltip: document.getElementById("chart-tooltip"),
  chart: document.getElementById("clone-chart"),
  statTotalClones: document.getElementById("stat-total-clones"),
  statUniqueCloners: document.getElementById("stat-unique-cloners"),
  statMetricPoints: document.getElementById("stat-metric-points"),
  statLastSync: document.getElementById("stat-last-sync"),
};

function setStatus(text, level = "info") {
  void text;
  void level;
}

function updateAuthControls() {
  els.loginBtn.hidden = state.isAuthenticated;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function resetSummary() {
  els.statTotalClones.textContent = "0";
  els.statUniqueCloners.textContent = "0";
  els.statMetricPoints.textContent = "0";
  els.statLastSync.textContent = "-";
  els.repoMeta.textContent = "Connect and select a repository to view analytics.";
}

function updateSummary(metrics) {
  const totalClones = metrics.reduce((sum, item) => sum + Number(item.totalClones || 0), 0);
  const totalUniqueCloners = metrics.reduce(
    (sum, item) => sum + Number(item.uniqueCloners || 0),
    0,
  );
  const lastCollectedAt = metrics.reduce((latest, item) => {
    const candidate = item.collectedAt || item.windowEnd || item.windowStart;
    if (!latest) return candidate;
    return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
  }, "");

  els.statTotalClones.textContent = totalClones.toLocaleString();
  els.statUniqueCloners.textContent = totalUniqueCloners.toLocaleString();
  els.statMetricPoints.textContent = String(metrics.length);
  els.statLastSync.textContent = formatDate(lastCollectedAt);
}

function updateRepoMeta(repo) {
  els.repoMeta.textContent = `Repo ID: ${repo.githubRepoId} • Default Branch: ${repo.defaultBranch}`;
}

const comboState = {
  openCombo: null,
};

function isConnectedRepo(owner, name) {
  return state.repositories.some(
    (repo) =>
      repo.owner.toLowerCase() === owner.toLowerCase() &&
      repo.name.toLowerCase() === name.toLowerCase(),
  );
}

function optionsForCombo(comboId) {
  if (comboId === "owner") {
    return state.githubDiscovery.owners
      .filter((owner) =>
        state.githubDiscovery.repositories.some(
          (repo) =>
            repo.owner.toLowerCase() === owner.toLowerCase() &&
            !isConnectedRepo(repo.owner, repo.name),
        )
      )
      .sort((a, b) => a.localeCompare(b))
      .map((owner) => ({ value: owner, disabled: false }));
  }
  if (comboId === "repo") {
    const owner = els.repoOwnerInput.value.trim();
    if (!owner) return [];
    return state.githubDiscovery.repositories
      .filter((item) => item.owner.toLowerCase() === owner.toLowerCase())
      .map((item) => ({
        value: item.name,
        disabled: isConnectedRepo(item.owner, item.name),
      }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }
  if (comboId === "branch") {
    const owner = els.repoOwnerInput.value.trim();
    const repoName = els.repoNameInput.value.trim();
    if (!owner || !repoName) return [];
    const discovered = findDiscoveredRepo(owner, repoName);
    if (!discovered) return [];
    const branches = state.githubDiscovery.branchMap[`${discovered.owner}/${discovered.name}`] || [];
    return branches.map((branch) => ({ value: branch, disabled: false }));
  }
  return [];
}

function comboElements(comboId) {
  if (comboId === "owner") {
    return { combo: els.repoOwnerCombo, menu: els.repoOwnerMenu, input: els.repoOwnerInput };
  }
  if (comboId === "repo") {
    return { combo: els.repoNameCombo, menu: els.repoNameMenu, input: els.repoNameInput };
  }
  return { combo: els.repoBranchCombo, menu: els.repoBranchMenu, input: els.repoBranchInput };
}

function closeCombo(comboId) {
  const { combo, menu } = comboElements(comboId);
  combo.classList.remove("open");
  menu.hidden = true;
  menu.innerHTML = "";
  if (comboState.openCombo === comboId) {
    comboState.openCombo = null;
  }
}

function closeAllCombos() {
  closeCombo("owner");
  closeCombo("repo");
  closeCombo("branch");
}

function openCombo(comboId) {
  const { combo, menu, input } = comboElements(comboId);
  const baseOptions = optionsForCombo(comboId);
  const query = input.value.trim().toLowerCase();
  const filtered = query
    ? baseOptions.filter((option) => option.value.toLowerCase().includes(query))
    : baseOptions;

  closeAllCombos();
  combo.classList.add("open");
  menu.hidden = false;
  menu.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "combo-empty";
    empty.textContent = "No matches found";
    menu.appendChild(empty);
    comboState.openCombo = comboId;
    return;
  }

  for (const value of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "combo-option";
    button.textContent = value.value;
    if (value.disabled) {
      button.disabled = true;
      button.classList.add("disabled");
      button.title = "Already connected";
    }
    button.addEventListener("click", () => {
      if (value.disabled) return;
      input.value = value.value;
      if (comboId === "owner") handleOwnerInput();
      if (comboId === "repo") handleRepoInput();
      if (comboId === "branch") {
        // Keep branch input editable while allowing quick selection.
      }
      closeCombo(comboId);
    });
    menu.appendChild(button);
  }
  comboState.openCombo = comboId;
}

function clearConnectForm() {
  els.repoOwnerInput.value = "";
  els.repoNameInput.value = "";
  els.repoIdInput.value = "";
  els.repoBranchInput.value = "master";
  closeAllCombos();
}

function findDiscoveredRepo(owner, repoName) {
  return state.githubDiscovery.repositories.find(
    (item) =>
      item.owner.toLowerCase() === owner.toLowerCase() &&
      item.name.toLowerCase() === repoName.toLowerCase(),
  );
}

function applyDiscoveredRepo(owner, repoName) {
  const discovered = findDiscoveredRepo(owner, repoName);
  if (!discovered) {
    if (!els.repoBranchInput.value.trim()) {
      els.repoBranchInput.value = "master";
    }
    els.repoIdInput.value = "";
    return;
  }
  els.repoNameInput.value = discovered.name;
  els.repoIdInput.value = String(discovered.id);
  els.repoBranchInput.value = discovered.defaultBranch || "master";
}

function handleOwnerInput() {
  const owner = els.repoOwnerInput.value.trim();
  if (!owner) {
    els.repoNameInput.value = "";
    els.repoIdInput.value = "";
    els.repoBranchInput.value = "master";
    return;
  }
  applyDiscoveredRepo(owner, els.repoNameInput.value.trim());
}

function handleRepoInput() {
  const owner = els.repoOwnerInput.value.trim();
  const repoName = els.repoNameInput.value.trim();
  if (!owner || !repoName) {
    els.repoIdInput.value = "";
    if (!els.repoBranchInput.value.trim()) {
      els.repoBranchInput.value = "master";
    }
    return;
  }
  applyDiscoveredRepo(owner, repoName);
}

async function loadGitHubDiscovery() {
  if (!state.isAuthenticated) {
    state.githubDiscovery = {
      owners: [],
      repositories: [],
      branchMap: {},
    };
    clearConnectForm();
    return;
  }

  try {
    const result = await apiRequest("/v1/repos/discovery/github");
    const owners = Array.isArray(result.owners) ? result.owners : [];
    const repositories = Array.isArray(result.repositories) ? result.repositories : [];
    const branchMap = typeof result.branchMap === "object" && result.branchMap
      ? result.branchMap
      : {};
    state.githubDiscovery = {
      owners,
      repositories,
      branchMap,
    };
    if (!els.repoOwnerInput.value.trim() && owners.length > 0) {
      els.repoOwnerInput.value = owners[0];
    }
    handleOwnerInput();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load repository options";
    setStatus(message, "error");
  }
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
    const label = document.createElement("span");
    label.textContent = `${repo.owner}/${repo.name}`;
    btn.appendChild(label);
    if (repo.id === state.selectedRepoId) {
      const check = document.createElement("span");
      check.className = "repo-check";
      check.textContent = "✓";
      btn.appendChild(check);
    }
    btn.addEventListener("click", () => {
      state.selectedRepoId = repo.id;
      renderRepositoryList();
      void loadRepositoryDetails(repo);
    });
    els.repoList.appendChild(btn);
  }
}

function chartSurface(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.max(canvas.clientWidth, 360);
  const cssHeight = 320;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: cssWidth, height: cssHeight };
}

function hideChartTooltip() {
  els.chartTooltip.hidden = true;
}

function handleChartHover(event) {
  if (!state.chartModel) {
    hideChartTooltip();
    return;
  }
  const { rect, sorted, toX, toY, maxValue, padding, width, height } = state.chartModel;
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  if (
    mouseX < padding.left ||
    mouseX > width - padding.right ||
    mouseY < padding.top ||
    mouseY > height - padding.bottom
  ) {
    hideChartTooltip();
    renderChart(state.currentMetrics);
    return;
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < sorted.length; index += 1) {
    const distance = Math.abs(toX(index) - mouseX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  const point = sorted[nearestIndex];
  const x = toX(nearestIndex);
  const totalY = toY(Number(point.totalClones || 0));
  const uniqueY = toY(Number(point.uniqueCloners || 0));

  renderChart(state.currentMetrics, { hoverIndex: nearestIndex });

  const tooltip = els.chartTooltip;
  tooltip.hidden = false;
  tooltip.innerHTML = `
    <strong>${formatDate(point.windowEnd || point.windowStart)}</strong><br />
    Total clones: ${Number(point.totalClones || 0).toLocaleString()}<br />
    Unique cloners: ${Number(point.uniqueCloners || 0).toLocaleString()}
  `;

  const left = Math.min(
    Math.max(x + 14, 10),
    width - tooltip.offsetWidth - 10,
  );
  const top = Math.max(Math.min(Math.min(totalY, uniqueY) - 50, height - 84), 10);
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  void maxValue;
}

function renderChart(metrics, options = {}) {
  const { hoverIndex = null } = options;
  const surface = chartSurface(els.chart);
  if (!surface) return;

  const { ctx, width, height } = surface;
  ctx.clearRect(0, 0, width, height);
  state.chartModel = null;

  if (!metrics || metrics.length === 0) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "13px sans-serif";
    ctx.fillText("No clone metrics yet.", 18, 26);
    hideChartTooltip();
    return;
  }

  const sorted = [...metrics].sort(
    (a, b) => new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime(),
  );
  const maxValue = Math.max(
    1,
    ...sorted.map((item) => Math.max(Number(item.totalClones || 0), Number(item.uniqueCloners || 0))),
  );

  const padding = { top: 20, right: 14, bottom: 48, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  const gridRows = 4;
  for (let row = 0; row <= gridRows; row += 1) {
    const y = padding.top + (row / gridRows) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const labelValue = Math.round(maxValue - (row / gridRows) * maxValue);
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px sans-serif";
    ctx.fillText(String(labelValue), 10, y + 3);
  }

  const toX = (index) =>
    padding.left + (index / Math.max(sorted.length - 1, 1)) * plotWidth;
  const toY = (value) =>
    padding.top + (1 - value / maxValue) * plotHeight;

  const drawSeries = (key, color, dash = []) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.beginPath();
    sorted.forEach((item, index) => {
      const x = toX(index);
      const y = toY(Number(item[key] || 0));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    sorted.forEach((item, index) => {
      const x = toX(index);
      const y = toY(Number(item[key] || 0));
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  drawSeries("totalClones", "#111827");
  drawSeries("uniqueCloners", "#6b7280", [5, 4]);

  if (hoverIndex !== null) {
    const hoverX = toX(hoverIndex);
    ctx.save();
    ctx.strokeStyle = "rgba(31, 41, 55, 0.3)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hoverX, padding.top);
    ctx.lineTo(hoverX, height - padding.bottom);
    ctx.stroke();
    ctx.restore();
  }

  const tickCount = Math.min(6, sorted.length);
  for (let i = 0; i < tickCount; i += 1) {
    const index = Math.floor((i / Math.max(tickCount - 1, 1)) * (sorted.length - 1));
    const item = sorted[index];
    const x = toX(index);
    const label = formatShortDate(item.windowEnd || item.windowStart);
    ctx.fillStyle = "#6b7280";
    ctx.font = "11px sans-serif";
    const textWidth = ctx.measureText(label).width;
    ctx.fillText(label, x - textWidth / 2, height - 20);
  }

  state.chartModel = {
    rect: els.chart.getBoundingClientRect(),
    sorted,
    toX,
    toY,
    maxValue,
    padding,
    width,
    height,
  };
}

async function loadRepositoryDetails(repo) {
  try {
    setStatus(`Loading details for ${repo.owner}/${repo.name}...`, "info");
    els.repoTitle.textContent = `${repo.owner}/${repo.name}`;
    updateRepoMeta(repo);

    const metricsResult = await apiRequest(`/v1/repos/${repo.id}/metrics/clones`);
    state.currentMetrics = metricsResult.items || [];
    renderChart(state.currentMetrics);
    updateSummary(state.currentMetrics);
    setStatus("Repository analytics ready.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to load repo details", "error");
  }
}

async function loadRepositories() {
  try {
    setStatus("Loading repositories...", "info");
    const result = await apiRequest("/v1/repos");
    state.isAuthenticated = true;
    updateAuthControls();
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
      resetSummary();
      hideChartTooltip();
      setStatus("No repositories connected.", "info");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load repositories";
    if (message.toLowerCase().includes("authentication required")) {
      state.isAuthenticated = false;
      updateAuthControls();
      setStatus("Login with GitHub to load your repositories.", "info");
      renderRepositoryList();
      renderChart([]);
      resetSummary();
      clearConnectForm();
      return;
    }
    setStatus(message, "error");
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
    setStatus(error instanceof Error ? error.message : "Login failed", "error");
  }
}

function saveToken() {
  const token = els.tokenInput.value.trim();
  state.token = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    setStatus("Session token saved.", "success");
  } else {
    localStorage.removeItem(TOKEN_KEY);
    setStatus("Session token removed.", "info");
  }
  void loadRepositories();
}

async function connectRepository() {
  try {
    const owner = els.repoOwnerInput.value.trim();
    const name = els.repoNameInput.value.trim();
    const githubRepoId = els.repoIdInput.value.trim();
    const defaultBranch = els.repoBranchInput.value.trim() || "master";

    if (!owner || !name || !githubRepoId) {
      throw new Error("Owner, repository name, and GitHub repository ID are required.");
    }

    setStatus(`Connecting ${owner}/${name}...`, "info");
    const result = await apiRequest("/v1/repos/connect", {
      method: "POST",
      body: JSON.stringify({
        owner,
        name,
        githubRepoId,
        defaultBranch,
      }),
    });
    setStatus(
      `Connected ${owner}/${name}. Store this project token securely: ${result.projectToken}`,
      "success",
    );
    if (result?.repository?.id) {
      state.selectedRepoId = result.repository.id;
    }
    await loadRepositories();
    await loadGitHubDiscovery();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to connect repository", "error");
  }
}

function logout() {
  state.isAuthenticated = false;
  updateAuthControls();
  state.token = "";
  state.repositories = [];
  state.selectedRepoId = null;
  state.currentMetrics = [];
  localStorage.removeItem(TOKEN_KEY);
  els.tokenInput.value = "";
  clearConnectForm();
  renderRepositoryList();
  renderChart([]);
  resetSummary();
  hideChartTooltip();
  setStatus("Logged out.", "info");
  fetch("/auth/logout", { credentials: "same-origin" }).catch(() => undefined);
}

function initialize() {
  els.tokenInput.value = state.token;
  updateAuthControls();
  els.loginBtn.addEventListener("click", () => void login());
  els.saveTokenBtn.addEventListener("click", saveToken);
  els.connectRepoBtn.addEventListener("click", () => void connectRepository());
  els.logoutBtn.addEventListener("click", logout);
  els.repoOwnerInput.addEventListener("input", () => {
    handleOwnerInput();
    openCombo("owner");
  });
  els.repoNameInput.addEventListener("input", () => {
    handleRepoInput();
    openCombo("repo");
  });
  els.repoBranchInput.addEventListener("input", () => {
    openCombo("branch");
  });

  els.repoOwnerInput.addEventListener("focus", () => openCombo("owner"));
  els.repoNameInput.addEventListener("focus", () => openCombo("repo"));
  els.repoBranchInput.addEventListener("focus", () => openCombo("branch"));

  els.repoOwnerToggle.addEventListener("click", () => {
    if (comboState.openCombo === "owner") closeCombo("owner");
    else openCombo("owner");
  });
  els.repoNameToggle.addEventListener("click", () => {
    if (comboState.openCombo === "repo") closeCombo("repo");
    else openCombo("repo");
  });
  els.repoBranchToggle.addEventListener("click", () => {
    if (comboState.openCombo === "branch") closeCombo("branch");
    else openCombo("branch");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (
      els.repoOwnerCombo.contains(target) ||
      els.repoNameCombo.contains(target) ||
      els.repoBranchCombo.contains(target)
    ) {
      return;
    }
    closeAllCombos();
  });

  window.addEventListener("resize", () => {
    renderChart(state.currentMetrics);
    hideChartTooltip();
  });
  els.chart.addEventListener("mousemove", handleChartHover);
  els.chart.addEventListener("mouseleave", () => {
    hideChartTooltip();
    renderChart(state.currentMetrics);
  });

  resetSummary();
  void loadRepositories().then(() => loadGitHubDiscovery());
}

initialize();
