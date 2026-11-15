import "./iphone-quality-gate.css";

export type QualityStatus = "pass" | "warn" | "fail" | "manual";
export type PersistenceState = "unknown" | "persistent" | "memory-only";

export interface QualityGateSnapshot {
  secureContext: boolean;
  webgl2: boolean;
  pointerEvents: boolean;
  maxTouchPoints: number;
  landscape: boolean;
  viewportWidth: number;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  manifestPresent: boolean;
  persistence: PersistenceState;
  audioState: string;
  contextLostCount: number;
  contextRestoredCount: number;
  pointerDownCount: number;
  pointerUpCount: number;
  lifecycleTransitions: number;
}

export interface QualityCheck {
  id: string;
  category: string;
  status: QualityStatus;
  title: string;
  detail: string;
  action: string;
}

export interface QualitySummary {
  score: number;
  blockingFailures: number;
  warnings: number;
  manualPending: number;
  disposition: "ready" | "device-check-required" | "blocked";
}

export interface ManualCheck {
  id: string;
  label: string;
  verified: boolean;
}

export interface DiagnosticPacket {
  schema: "starlight-wing-q-trace";
  version: 1;
  generatedAt: string;
  summary: QualitySummary;
  checks: QualityCheck[];
  manualChecks: ManualCheck[];
  environment: Record<string, string | number | boolean | null>;
}

const MANUAL_CHECKS: ReadonlyArray<Omit<ManualCheck, "verified">> = [
  { id: "touch-drag", label: "実機でドラッグ移動し、指を離した後に入力が残らないことを確認" },
  { id: "background-resume", label: "別アプリへ移動して戻り、停止状態から明示的に再開できることを確認" },
  { id: "pwa-install", label: "Safariのホーム画面に追加し、単独起動とオフライン起動を確認" },
  { id: "backup-transfer", label: "JSONを別端末へ渡し、旧セーブを保持したまま復元できることを確認" },
  { id: "sustained-session", label: "10分以上プレイし、発熱・FPS・音声・タッチ遅延を確認" }
];

const statusLabel: Record<QualityStatus, string> = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL",
  manual: "実機確認"
};

export function evaluateQualityGate(snapshot: QualityGateSnapshot): QualityCheck[] {
  const checks: QualityCheck[] = [];
  const add = (check: QualityCheck) => checks.push(check);

  add({
    id: "secure-context",
    category: "platform",
    status: snapshot.secureContext ? "pass" : "fail",
    title: "HTTPS / Secure Context",
    detail: snapshot.secureContext ? "安全な実行コンテキストです。" : "安全なコンテキストではありません。",
    action: snapshot.secureContext ? "追加操作は不要です。" : "HTTPSで公開されたURLから開き直してください。"
  });
  add({
    id: "webgl2",
    category: "graphics",
    status: snapshot.webgl2 ? "pass" : "fail",
    title: "WebGL 2",
    detail: snapshot.webgl2 ? "WebGL 2コンテキストを取得できました。" : "WebGL 2コンテキストを取得できません。",
    action: snapshot.webgl2 ? "追加操作は不要です。" : "Safari設定・コンテンツ制限・端末のGPU対応を確認してください。"
  });
  add({
    id: "pointer-events",
    category: "input",
    status: snapshot.pointerEvents ? "pass" : "fail",
    title: "Pointer Events",
    detail: snapshot.pointerEvents ? "Pointer Events APIを利用できます。" : "Pointer Events APIがありません。",
    action: snapshot.pointerEvents ? "追加操作は不要です。" : "対応ブラウザーで開き直してください。"
  });
  add({
    id: "touch-capability",
    category: "input",
    status: snapshot.maxTouchPoints > 0 ? "pass" : "warn",
    title: "Touch capability",
    detail: snapshot.maxTouchPoints > 0
      ? `最大同時タッチ数の申告値: ${snapshot.maxTouchPoints}`
      : "タッチポイントが申告されていません。エミュレーターまたはマウス環境の可能性があります。",
    action: snapshot.maxTouchPoints > 0 ? "ゲーム画面でドラッグを実測してください。" : "iPhone実機のSafari / Braveで再診断してください。"
  });
  add({
    id: "landscape-viewport",
    category: "layout",
    status: snapshot.landscape && snapshot.viewportWidth >= 667 ? "pass" : "warn",
    title: "Landscape viewport",
    detail: `${snapshot.viewportWidth}px / ${snapshot.landscape ? "横向き" : "縦向き"}`,
    action: "iPhoneを横向きにし、HUDとセーフエリアが操作を妨げないか確認してください。"
  });
  add({
    id: "service-worker",
    category: "delivery",
    status: snapshot.serviceWorkerSupported && snapshot.serviceWorkerRegistered ? "pass" : "warn",
    title: "Service Worker",
    detail: !snapshot.serviceWorkerSupported
      ? "Service Worker APIに対応していません。"
      : snapshot.serviceWorkerRegistered ? "Service Worker登録を確認しました。" : "Service Worker登録を確認できませんでした。",
    action: "HTTPSで再読み込みし、初回登録完了後にもう一度診断してください。"
  });
  add({
    id: "web-manifest",
    category: "delivery",
    status: snapshot.manifestPresent ? "pass" : "warn",
    title: "Web App Manifest",
    detail: snapshot.manifestPresent ? "manifest linkを検出しました。" : "manifest linkを検出できません。",
    action: "配布ページのmanifestとアイコンのURLを確認してください。"
  });
  add({
    id: "local-persistence",
    category: "storage",
    status: snapshot.persistence === "persistent" ? "pass" : snapshot.persistence === "memory-only" ? "warn" : "manual",
    title: "Local save persistence",
    detail: snapshot.persistence === "persistent"
      ? "IndexedDBへの永続保存が利用可能です。"
      : snapshot.persistence === "memory-only" ? "メモリ保存のみです。再起動で進行が失われる可能性があります。" : "永続保存状態が未確定です。",
    action: "設定画面の保存ステータスを確認し、必要ならJSONバックアップを保存してください。"
  });
  add({
    id: "audio-state",
    category: "audio",
    status: snapshot.audioState === "running" ? "pass" : snapshot.audioState === "unavailable" || snapshot.audioState === "closed" ? "warn" : "manual",
    title: "Web Audio state",
    detail: `AudioContext: ${snapshot.audioState}`,
    action: "画面上の「音声を再開して確認」をタップし、runningになるか確認してください。"
  });

  const lost = Math.max(0, snapshot.contextLostCount);
  const restored = Math.max(0, snapshot.contextRestoredCount);
  const recoveryStatus: QualityStatus = lost === 0 && restored === 0
    ? "manual"
    : restored >= lost && lost > 0 ? "pass" : "fail";
  add({
    id: "webgl-recovery",
    category: "graphics",
    status: recoveryStatus,
    title: "WebGL context recovery",
    detail: `lost ${lost} / restored ${restored}`,
    action: recoveryStatus === "manual"
      ? "通常プレイでは自然に発生しないため、実機でGPU負荷・画面復帰を確認してください。"
      : recoveryStatus === "fail" ? "復旧できていないコンテキストがあります。再起動後に再現条件を記録してください。" : "復旧イベントの対が観測されました。実機でも復帰操作を確認してください。"
  });

  const downs = Math.max(0, snapshot.pointerDownCount);
  const ups = Math.max(0, snapshot.pointerUpCount);
  const pointerStatus: QualityStatus = downs === 0 && ups === 0
    ? "manual"
    : ups < downs ? "fail" : "pass";
  add({
    id: "game-canvas-pointer",
    category: "input",
    status: pointerStatus,
    title: "Game canvas pointer sequence",
    detail: `down ${downs} / up-or-cancel ${ups}`,
    action: pointerStatus === "manual"
      ? "ゲームを開始してキャンバスを指で操作すると、イベントが記録されます。"
      : pointerStatus === "fail" ? "pointerup / pointercancelが不足しています。指を離した際の入力残留を調べてください。" : "イベント列を観測しました。長いドラッグと画面端での操作も確認してください。"
  });
  add({
    id: "lifecycle-resume",
    category: "lifecycle",
    status: snapshot.lifecycleTransitions > 0 ? "pass" : "manual",
    title: "Page lifecycle transitions",
    detail: `観測した表示状態・ページ遷移: ${snapshot.lifecycleTransitions}`,
    action: "別アプリへの切替、画面ロック、Safariへの復帰を実機で確認してください。"
  });
  return checks;
}

export function summarizeQualityGate(checks: QualityCheck[], uncheckedFieldChecks = 0): QualitySummary {
  const blockingFailures = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  const manualPending = checks.filter((check) => check.status === "manual").length + Math.max(0, uncheckedFieldChecks);
  const measured = checks.filter((check) => check.status !== "manual");
  const passed = measured.filter((check) => check.status === "pass").length;
  const score = measured.length === 0 ? 0 : Math.round((passed / measured.length) * 100);
  return {
    score,
    blockingFailures,
    warnings,
    manualPending,
    disposition: blockingFailures > 0 ? "blocked" : warnings > 0 || manualPending > 0 ? "device-check-required" : "ready"
  };
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createDiagnosticCsv(packet: DiagnosticPacket): string {
  const rows: unknown[][] = [["id", "category", "status", "title", "detail", "action"]];
  rows.push(["meta:schema", "metadata", "INFO", "Schema", packet.schema, ""]);
  rows.push(["meta:version", "metadata", "INFO", "Version", packet.version, ""]);
  rows.push(["meta:generated-at", "metadata", "INFO", "Generated at", packet.generatedAt, ""]);
  rows.push(["summary:score", "summary", "INFO", "Automated score", packet.summary.score, ""]);
  rows.push(["summary:disposition", "summary", "INFO", "Disposition", packet.summary.disposition, ""]);
  rows.push(["summary:manual-pending", "summary", "INFO", "Manual pending", packet.summary.manualPending, ""]);
  for (const check of packet.checks) {
    rows.push([check.id, check.category, statusLabel[check.status], check.title, check.detail, check.action]);
  }
  for (const item of packet.manualChecks) {
    rows.push([item.id, "field", item.verified ? "PASS" : "実機確認", item.label, item.verified ? "確認済み" : "未確認", "iPhone実機で確認してから再出力してください。"]);
  }
  for (const [key, value] of Object.entries(packet.environment)) {
    rows.push([`env:${key}`, "environment", "INFO", key, value, ""]);
  }
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

export interface AudioDiagnostics {
  getDiagnostics(): { supported: boolean; state: string };
  resumeFromGesture(): Promise<string>;
  tone(frequency: number, duration?: number): void;
}

export interface QualityGateMountOptions {
  canvas: HTMLCanvasElement;
  getPersistenceStatus: () => PersistenceState;
  audio: AudioDiagnostics;
}

export function mountIphoneQualityGate(options: QualityGateMountOptions): void {
  const byId = <T extends HTMLElement>(id: string): T => {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing iPhone Quality Gate element: ${id}`);
    return element as T;
  };
  const screen = byId<HTMLElement>("iphone-quality-screen");
  const summaryElement = byId<HTMLDivElement>("quality-summary");
  const checksElement = byId<HTMLDivElement>("quality-checks");
  const manualElement = byId<HTMLDivElement>("quality-manual-checks");
  const openButton = byId<HTMLButtonElement>("iphone-quality-open");
  const refreshButton = byId<HTMLButtonElement>("quality-refresh");
  const resumeAudioButton = byId<HTMLButtonElement>("quality-audio-resume");
  const exportJsonButton = byId<HTMLButtonElement>("quality-export-json");
  const exportCsvButton = byId<HTMLButtonElement>("quality-export-csv");
  const closeButton = byId<HTMLButtonElement>("quality-close");

  let contextLostCount = 0;
  let contextRestoredCount = 0;
  let pointerDownCount = 0;
  let pointerUpCount = 0;
  let lifecycleTransitions = 0;
  let lastVisibility = document.visibilityState;
  const manualChecks: ManualCheck[] = MANUAL_CHECKS.map((item) => ({ ...item, verified: false }));

  options.canvas.addEventListener("webglcontextlost", () => { contextLostCount += 1; }, true);
  options.canvas.addEventListener("webglcontextrestored", () => { contextRestoredCount += 1; }, true);
  options.canvas.addEventListener("pointerdown", () => { pointerDownCount += 1; }, true);
  const pointerEnd = () => { pointerUpCount += 1; };
  options.canvas.addEventListener("pointerup", pointerEnd, true);
  options.canvas.addEventListener("pointercancel", pointerEnd, true);
  document.addEventListener("visibilitychange", () => {
    if (lastVisibility !== document.visibilityState) lifecycleTransitions += 1;
    lastVisibility = document.visibilityState;
  });
  window.addEventListener("pagehide", () => { lifecycleTransitions += 1; });
  window.addEventListener("pageshow", () => { lifecycleTransitions += 1; });

  const probeWebGL2 = (): boolean => {
    const probeCanvas = document.createElement("canvas");
    try {
      const context = probeCanvas.getContext("webgl2");
      if (!context) return false;
      context.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    } catch {
      return false;
    }
  };

  const collectSnapshot = async (): Promise<{ snapshot: QualityGateSnapshot; environment: Record<string, string | number | boolean | null> }> => {
    const navigatorWithTouch = navigator as Navigator & { maxTouchPoints?: number };
    let serviceWorkerRegistered = false;
    if ("serviceWorker" in navigator) {
      try {
        serviceWorkerRegistered = Boolean(await navigator.serviceWorker.getRegistration());
      } catch {
        serviceWorkerRegistered = false;
      }
    }
    const audioState = options.audio.getDiagnostics();
    const snapshot: QualityGateSnapshot = {
      secureContext: window.isSecureContext,
      webgl2: probeWebGL2(),
      pointerEvents: "PointerEvent" in window,
      maxTouchPoints: navigatorWithTouch.maxTouchPoints ?? 0,
      landscape: window.matchMedia("(orientation: landscape)").matches,
      viewportWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
      serviceWorkerSupported: "serviceWorker" in navigator,
      serviceWorkerRegistered,
      manifestPresent: Boolean(document.querySelector('link[rel="manifest"]')),
      persistence: options.getPersistenceStatus(),
      audioState: audioState.supported ? audioState.state : "unavailable",
      contextLostCount,
      contextRestoredCount,
      pointerDownCount,
      pointerUpCount,
      lifecycleTransitions
    };
    const environment: Record<string, string | number | boolean | null> = {
      userAgent: navigator.userAgent,
      platform: navigator.platform ?? null,
      language: navigator.language,
      online: navigator.onLine,
      secureContext: window.isSecureContext,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      visualViewport: `${Math.round(window.visualViewport?.width ?? 0)}×${Math.round(window.visualViewport?.height ?? 0)}`,
      devicePixelRatio: window.devicePixelRatio || 1,
      maxTouchPoints: snapshot.maxTouchPoints,
      orientation: snapshot.landscape ? "landscape" : "portrait",
      persistence: snapshot.persistence,
      audioState: snapshot.audioState,
      serviceWorkerRegistered
    };
    return { snapshot, environment };
  };

  const renderChecks = (checks: QualityCheck[]) => {
    checksElement.replaceChildren();
    for (const check of checks) {
      const card = document.createElement("article");
      card.className = `quality-check status-${check.status}`;
      card.dataset.qualityId = check.id;
      const header = document.createElement("div");
      header.className = "quality-check-header";
      const title = document.createElement("strong");
      title.textContent = check.title;
      const status = document.createElement("span");
      status.className = "quality-status";
      status.textContent = statusLabel[check.status];
      header.append(title, status);
      const detail = document.createElement("p");
      detail.textContent = check.detail;
      const action = document.createElement("small");
      action.textContent = check.action;
      card.append(header, detail, action);
      checksElement.append(card);
    }
  };

  const renderManualChecks = () => {
    manualElement.replaceChildren();
    for (const item of manualChecks) {
      const label = document.createElement("label");
      label.className = "quality-manual-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = item.verified;
      input.addEventListener("change", () => {
        item.verified = input.checked;
        if (latestPacket) {
          latestPacket.manualChecks = manualChecks.map((entry) => ({ ...entry }));
          latestPacket.summary = summarizeQualityGate(
            latestPacket.checks,
            manualChecks.filter((entry) => !entry.verified).length
          );
          renderSummary(latestPacket.summary);
        }
      });
      const text = document.createElement("span");
      text.textContent = item.label;
      label.append(input, text);
      manualElement.append(label);
    }
  };

  let latestPacket: DiagnosticPacket | null = null;
  const renderSummary = (summary: QualitySummary) => {
    summaryElement.replaceChildren();
    const score = document.createElement("strong");
    score.className = "quality-score";
    score.textContent = String(summary.score) + "/100";
    const disposition = document.createElement("span");
    disposition.className = "quality-disposition disposition-" + summary.disposition;
    disposition.textContent = summary.disposition === "ready" ? "自動診断・実機確認: PASS" : summary.disposition === "blocked" ? "自動診断: BLOCKED" : "実機確認が必要";
    const counts = document.createElement("p");
    counts.textContent = "FAIL " + summary.blockingFailures + " · WARN " + summary.warnings + " · 未確認 " + summary.manualPending;
    const caveat = document.createElement("small");
    caveat.textContent = "自動スコアはブラウザー内の観測値です。実機で全項目を確認するまでは候補版のままです。";
    summaryElement.append(score, disposition, counts, caveat);
  };
  const refresh = async () => {
    refreshButton.disabled = true;
    try {
      const { snapshot, environment } = await collectSnapshot();
      const checks = evaluateQualityGate(snapshot);
      const summary = summarizeQualityGate(checks, manualChecks.filter((item) => !item.verified).length);
      latestPacket = {
        schema: "starlight-wing-q-trace",
        version: 1,
        generatedAt: new Date().toISOString(),
        summary,
        checks,
        manualChecks: manualChecks.map((item) => ({ ...item })),
        environment
      };
      renderSummary(summary);
      renderChecks(checks);
      renderManualChecks();
    } finally {
      refreshButton.disabled = false;
    }
  };

  const download = (contents: string, mimeType: string, filename: string) => {
    const blob = new Blob([contents], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const open = () => {
    screen.hidden = false;
    void refresh();
  };
  const close = () => { screen.hidden = true; };
  openButton.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  refreshButton.addEventListener("click", () => { void refresh(); });
  resumeAudioButton.addEventListener("click", async () => {
    const state = await options.audio.resumeFromGesture();
    options.audio.tone(660, 0.12);
    resumeAudioButton.textContent = `音声状態: ${state}`;
    await refresh();
  });
  exportJsonButton.addEventListener("click", async () => {
    if (!latestPacket) await refresh();
    if (latestPacket) {
      latestPacket.manualChecks = manualChecks.map((item) => ({ ...item }));
      download(JSON.stringify(latestPacket, null, 2), "application/json", "starlight-wing-q-trace.json");
    }
  });
  exportCsvButton.addEventListener("click", async () => {
    if (!latestPacket) await refresh();
    if (latestPacket) {
      latestPacket.manualChecks = manualChecks.map((item) => ({ ...item }));
      download(createDiagnosticCsv(latestPacket), "text/csv;charset=utf-8", "starlight-wing-q-trace.csv");
    }
  });
  screen.addEventListener("click", (event) => {
    if (event.target === screen) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !screen.hidden) close();
  });
  renderManualChecks();
}
