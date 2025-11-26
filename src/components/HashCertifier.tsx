/* eslint-disable @next/next/no-img-element */
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ProofRecord = {
  id: string;
  filename: string;
  sizeBytes: number;
  sha256Hex: string;
  timestampIso: string;
};

const STORAGE_KEY = "odigo_rcs_proofs_v1";

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function sha256HexOfArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function useLocalProofs() {
  const [proofs, setProofs] = useState<ProofRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProofs(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(proofs));
    } catch {
      // ignore
    }
  }, [proofs]);

  const addProof = useCallback((p: ProofRecord) => {
    setProofs((prev) => [p, ...prev].slice(0, 500));
  }, []);

  const clearProofs = useCallback(() => setProofs([]), []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(proofs, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `odigo-rcs-pruebas-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [proofs]);

  const importJson = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as ProofRecord[];
    setProofs(parsed);
  }, []);

  return { proofs, addProof, clearProofs, exportJson, importJson };
}

export default function HashCertifier() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { proofs, addProof, clearProofs, exportJson, importJson } =
    useLocalProofs();

  const onPickFile = useCallback(() => inputRef.current?.click(), []);

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length) return;
      setError(null);
      setIsHashing(true);
      try {
        for (const file of Array.from(files)) {
          const buffer = await file.arrayBuffer();
          const hex = await sha256HexOfArrayBuffer(buffer);
          const record: ProofRecord = {
            id: `${hex}:${file.name}:${file.size}`,
            filename: file.name,
            sizeBytes: file.size,
            sha256Hex: hex,
            timestampIso: new Date().toISOString()
          };
          addProof(record);
          setLastHash(hex);
        }
      } catch (e: any) {
        setError(e?.message ?? "Error desconocido durante el c?lculo del hash.");
      } finally {
        setIsHashing(false);
      }
    },
    [addProof]
  );

  const lastProof = useMemo(() => proofs[0], [proofs]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="col">
            <span className="title">ODIGO-RCS</span>
            <span className="muted">
              Certifica la existencia de tus archivos calculando su{" "}
              <span className="brand">SHA-256</span> localmente. Los datos se
              preservan en tu navegador.
            </span>
          </div>
          <div className="row">
            <button className="button" onClick={() => window.location.reload()}>
              Refrescar
            </button>
            <button className="button ghost" onClick={exportJson}>
              Exportar JSON
            </button>
            <label className="button ghost" style={{ cursor: "pointer" }}>
              Importar JSON
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => importJson(e.target.files?.[0] as File)}
              />
            </label>
          </div>
        </div>

        <div
          className="row"
          style={{ marginTop: 16, justifyContent: "space-between" }}
        >
          <div className="row" style={{ gap: 12 }}>
            <button
              className="button primary"
              onClick={onPickFile}
              disabled={isHashing}
            >
              {isHashing ? "Procesando?" : "Seleccionar archivo(s)"}
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={(e) => onFiles(e.target.files)}
              style={{ display: "none" }}
            />
            <label className="button ghost" style={{ cursor: "pointer" }}>
              Arrastra archivos aqu?
              <input
                type="file"
                multiple
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "pointer"
                }}
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
          </div>
          <button className="button danger" onClick={clearProofs}>
            Limpiar historial
          </button>
        </div>

        {error && (
          <div
            className="row"
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              background: "rgba(255,0,0,0.08)",
              border: "1px solid rgba(255,0,0,0.2)"
            }}
          >
            <span className="danger">Error: {error}</span>
          </div>
        )}

        {lastProof && (
          <div
            className="card"
            style={{
              marginTop: 16,
              background:
                "linear-gradient(180deg, rgba(25,211,162,0.12), rgba(25,211,162,0.05))"
            }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="accent">?ltima certificaci?n</span>
              <span className="tag">SHA-256</span>
            </div>
            <div className="col" style={{ marginTop: 8 }}>
              <span className="mono">{lastProof.sha256Hex}</span>
              <div className="row" style={{ gap: 10, marginTop: 8 }}>
                <button
                  className="button"
                  onClick={() => copy(lastProof.sha256Hex)}
                >
                  Copiar hash
                </button>
                <button
                  className="button"
                  onClick={() =>
                    copy(
                      JSON.stringify(
                        {
                          filename: lastProof.filename,
                          sizeBytes: lastProof.sizeBytes,
                          sha256Hex: lastProof.sha256Hex,
                          timestampIso: lastProof.timestampIso
                        },
                        null,
                        2
                      )
                    )
                  }
                >
                  Copiar JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <span className="title">Ticker en Tiempo Real</span>
        <span className="muted" style={{ display: "block", marginTop: 6 }}>
          Eventos de certificaci?n sint?ticos v?a SSE para demostraci?n.
        </span>
        <Ticker />
      </div>

      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <span className="title">Historial local</span>
        <div style={{ marginTop: 8 }}>
          {proofs.length === 0 && (
            <span className="muted">No hay registros a?n.</span>
          )}
          {proofs.map((p) => (
            <div key={p.id} className="tickerItem">
              <span className="tag">Prueba</span>
              <div className="col">
                <span className="mono">{p.sha256Hex}</span>
                <span className="muted">
                  {p.filename} ? {formatBytes(p.sizeBytes)} ?{" "}
                  {new Date(p.timestampIso).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ticker() {
  const [events, setEvents] = useState<string[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/ticker");
    esRef.current = es;
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as {
          id: string;
          ts: number;
          kind: string;
          hex: string;
        };
        setEvents((prev) => {
          const next = [`[${data.kind}] ${data.hex}`, ...prev];
          return next.slice(0, 100);
        });
      } catch {
        // ignore
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="ticker" style={{ marginTop: 10 }}>
      {events.length === 0 && (
        <div className="muted">Esperando eventos del servidor?</div>
      )}
      {events.map((e, i) => (
        <div key={i} className="tickerItem">
          <span className="tag">Tick</span>
          <span className="mono">{e}</span>
        </div>
      ))}
    </div>
  );
}

