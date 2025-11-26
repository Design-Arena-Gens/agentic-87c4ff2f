import { NextRequest } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime for timers/streams
export const dynamic = "force-dynamic"; // never prerender or statically optimize
export const revalidate = 0;

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(arr);
  } else {
    // Node polyfill
    const nodeCrypto = require("crypto");
    const buf: Buffer = nodeCrypto.randomBytes(bytes);
    buf.forEach((v, i) => (arr[i] = v));
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sseId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function GET(_req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (payload: unknown) => {
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Emit a warmup message
      send({
        id: sseId(),
        ts: Date.now(),
        kind: "INIT",
        hex: randomHex(8)
      });

      const interval = setInterval(() => {
        const payload = {
          id: sseId(),
          ts: Date.now(),
          kind: Math.random() > 0.5 ? "CERT" : "ANCHOR",
          hex: randomHex(16)
        };
        send(payload);
      }, 1500);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 5 * 60 * 1000); // auto-close after 5 minutes

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}

