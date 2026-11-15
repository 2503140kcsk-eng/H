export type SavePersistenceMode = "unknown" | "persistent" | "memory-only";

export interface FrameTimeSummary {
  sampleCount: number;
  averageFrameTimeMs: number | null;
  p95FrameTimeMs: number | null;
  worstFrameTimeMs: number | null;
  estimatedFps: number | null;
}

export interface GameDiagnosticsSnapshot extends FrameTimeSummary {
  renderCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  drawingBuffer: { width: number; height: number };
  webgl: {
    version: string;
    maxTextureSize: number;
    maxRenderbufferSize: number;
    maxViewportWidth: number;
    maxViewportHeight: number;
    contextAttributes: {
      alpha: boolean;
      antialias: boolean;
      depth: boolean;
      stencil: boolean;
      preserveDrawingBuffer: boolean;
    } | null;
  } | null;
}

export interface DeviceDiagnosticsReport {
  format: "starlight-wing-diagnostics";
  version: 1;
  capturedAt: string;
  device: {
    userAgent: string;
    language: string;
    viewport: { width: number; height: number };
    screen: { width: number; height: number };
    devicePixelRatio: number;
    touchPoints: number;
    standalone: boolean;
    orientation: string;
  };
  capabilities: {
    webgl2: boolean | null;
    indexedDB: boolean;
    serviceWorker: boolean;
    serviceWorkerControlled: boolean;
    pointerEvents: boolean;
    touchInput: boolean;
    audioContext: boolean;
  };
  storage: {
    persistenceStatus: SavePersistenceMode;
    estimateUsageBytes: number | null;
    estimateQuotaBytes: number | null;
    persisted: boolean | null;
  };
  game: GameDiagnosticsSnapshot | null;
}

export function summarizeFrameTimes(samples: readonly number[]): FrameTimeSummary {
  const valid = samples.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (valid.length === 0) {
    return {
      sampleCount: 0,
      averageFrameTimeMs: null,
      p95FrameTimeMs: null,
      worstFrameTimeMs: null,
      estimatedFps: null
    };
  }

  const averageFrameTimeMs = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const p95Index = Math.min(valid.length - 1, Math.max(0, Math.ceil(valid.length * 0.95) - 1));
  return {
    sampleCount: valid.length,
    averageFrameTimeMs,
    p95FrameTimeMs: valid[p95Index],
    worstFrameTimeMs: valid[valid.length - 1],
    estimatedFps: 1000 / averageFrameTimeMs
  };
}

function flattenReport(value: unknown, prefix: string, rows: Array<[string, string]>): void {
  if (value !== null && typeof value === "object") {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => flattenReport(entry, prefix ? `${prefix}[${index}]` : String(index), rows));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      flattenReport(child, prefix ? `${prefix}.${key}` : key, rows);
    }
    return;
  }

  const rendered = value === null ? "null" : value === undefined ? "" : String(value);
  rows.push([prefix, rendered]);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function diagnosticsToCsv(report: DeviceDiagnosticsReport): string {
  const rows: Array<[string, string]> = [];
  flattenReport(report, "", rows);
  return [
    ["path", "value"],
    ...rows
  ].map(([path, value]) => `${csvCell(path)},${csvCell(value)}`).join("\r\n");
}

export async function collectDeviceDiagnostics(
  persistenceStatus: SavePersistenceMode,
  game: GameDiagnosticsSnapshot | null
): Promise<DeviceDiagnosticsReport> {
  let estimate: StorageEstimate | null = null;
  let persisted: boolean | null = null;
  try {
    estimate = await navigator.storage?.estimate() ?? null;
  } catch {
    estimate = null;
  }
  try {
    persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : null;
  } catch {
    persisted = null;
  }

  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone = Boolean(nav.standalone) || window.matchMedia("(display-mode: standalone)").matches;
  const orientation = window.screen.orientation?.type ??
    (window.matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait");
  const numberOrNull = (value: number | undefined): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  return {
    format: "starlight-wing-diagnostics",
    version: 1,
    capturedAt: new Date().toISOString(),
    device: {
      userAgent: navigator.userAgent.slice(0, 512),
      language: navigator.language,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screen: { width: window.screen.width, height: window.screen.height },
      devicePixelRatio: window.devicePixelRatio || 1,
      touchPoints: navigator.maxTouchPoints || 0,
      standalone,
      orientation
    },
    capabilities: {
      webgl2: game ? game.webgl !== null : null,
      indexedDB: typeof indexedDB !== "undefined",
      serviceWorker: "serviceWorker" in navigator,
      serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
      pointerEvents: "PointerEvent" in window,
      touchInput: navigator.maxTouchPoints > 0 || "ontouchstart" in window,
      audioContext: "AudioContext" in window || "webkitAudioContext" in window
    },
    storage: {
      persistenceStatus,
      estimateUsageBytes: numberOrNull(estimate?.usage),
      estimateQuotaBytes: numberOrNull(estimate?.quota),
      persisted
    },
    game
  };
}
