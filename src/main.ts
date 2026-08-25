import "./style.css";

type Mode = "cookie" | "isolated";

type PendingSearchState = {
  customerId: string;
  searchInput: string;
  source: "search";
};

const KEY = "pending_search_state";
let memoryState: PendingSearchState | null = null;

const modeInputs = document.querySelectorAll<HTMLInputElement>('input[name="mode"]');
const input = requiredElement<HTMLInputElement>("search-input");
const searchButton = requiredElement<HTMLButtonElement>("search-button");
const detailButton = requiredElement<HTMLButtonElement>("detail-button");
const clearButton = requiredElement<HTMLButtonElement>("clear-button");
const savedState = requiredElement<HTMLParagraphElement>("saved-state");
const detailPanel = requiredElement<HTMLElement>("detail-panel");
const customerId = requiredElement<HTMLElement>("customer-id");
const stateSource = requiredElement<HTMLElement>("state-source");
const detailExplanation = requiredElement<HTMLParagraphElement>("detail-explanation");

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} が見つかりません。`);
  return element as T;
}

function currentMode(): Mode {
  const selected = document.querySelector<HTMLInputElement>('input[name="mode"]:checked');
  return selected?.value === "isolated" ? "isolated" : "cookie";
}

function syncModeFromLocation(): void {
  const selectedMode = new URLSearchParams(window.location.search).get("mode");
  const isolatedInput = document.querySelector<HTMLInputElement>('input[name="mode"][value="isolated"]');
  const cookieInput = document.querySelector<HTMLInputElement>('input[name="mode"][value="cookie"]');
  if (!isolatedInput || !cookieInput) throw new Error("実験条件の入力欄が見つかりません。");
  isolatedInput.checked = selectedMode === "isolated";
  cookieInput.checked = !isolatedInput.checked;
}

function persistModeInLocation(mode: Mode): void {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", mode);
  window.history.replaceState({}, "", url);
}

function readCookieState(): PendingSearchState | null {
  const encoded = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${KEY}=`))
    ?.slice(KEY.length + 1);
  return parseState(encoded ? decodeURIComponent(encoded) : null);
}

function saveCookieState(state: PendingSearchState): void {
  document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(state))}; Path=/; SameSite=Lax`;
}

function clearCookieState(): void {
  document.cookie = `${KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readSessionState(): PendingSearchState | null {
  return parseState(window.sessionStorage.getItem(KEY));
}

function saveSessionState(state: PendingSearchState): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(state));
}

function clearSessionState(): void {
  window.sessionStorage.removeItem(KEY);
}

function parseState(raw: string | null): PendingSearchState | null {
  if (!raw) return null;

  try {
    const candidate = JSON.parse(raw) as Partial<PendingSearchState>;
    if (
      typeof candidate.customerId !== "string" ||
      typeof candidate.searchInput !== "string" ||
      candidate.source !== "search"
    ) {
      return null;
    }
    return candidate as PendingSearchState;
  } catch {
    return null;
  }
}

function hydrateIsolatedTab(): void {
  const restored = readSessionState();
  if (!restored) return;
  memoryState = restored;
  input.value = restored.searchInput;
  renderSavedState();
}

function renderSavedState(): void {
  const state = currentMode() === "cookie" ? readCookieState() : memoryState ?? readSessionState();
  savedState.textContent = state
    ? `保存済み: ${state.customerId} (${currentMode() === "cookie" ? "Cookieは他タブと共有" : "このタブに限定"})`
    : "まだ検索状態はありません。";
}

function runSearch(): void {
  const customer = input.value.trim();
  if (!customer) {
    savedState.textContent = "検索条件を入力してください。";
    input.focus();
    return;
  }

  const state: PendingSearchState = { customerId: customer, searchInput: customer, source: "search" };
  if (currentMode() === "cookie") {
    saveCookieState(state);
  } else {
    memoryState = state;
    saveSessionState(state);
  }
  detailPanel.hidden = true;
  renderSavedState();
}

function showDetail(): void {
  const mode = currentMode();
  const state = mode === "cookie" ? readCookieState() : memoryState ?? readSessionState();
  detailPanel.hidden = false;

  if (!state) {
    customerId.textContent = "状態なし";
    stateSource.textContent = "該当なし";
    detailExplanation.textContent = "検索画面で状態を保存してから詳細を開いてください。";
    return;
  }

  customerId.textContent = state.customerId;
  stateSource.textContent = mode === "cookie" ? "Cookie（同一オリジンのタブ間で共有）" : "メモリ（このタブだけ）";
  detailExplanation.textContent = mode === "cookie"
    ? "詳細表示の時点でCookieを読むため、別タブが最後に保存した値が表示されます。"
    : "同じタブで保持しているメモリ状態を優先するため、別タブの検索結果は混入しません。";
}

function clearCurrentMode(): void {
  if (currentMode() === "cookie") {
    clearCookieState();
  } else {
    memoryState = null;
    clearSessionState();
  }
  detailPanel.hidden = true;
  renderSavedState();
}

function switchMode(): void {
  detailPanel.hidden = true;
  persistModeInLocation(currentMode());
  if (currentMode() === "isolated") {
    hydrateIsolatedTab();
  } else {
    input.value = "";
  }
  renderSavedState();
}

modeInputs.forEach((mode) => mode.addEventListener("change", switchMode));
searchButton.addEventListener("click", runSearch);
detailButton.addEventListener("click", showDetail);
clearButton.addEventListener("click", clearCurrentMode);
input.addEventListener("keydown", (event) => { if (event.key === "Enter") runSearch(); });

syncModeFromLocation();
if (currentMode() === "isolated") hydrateIsolatedTab();
renderSavedState();
