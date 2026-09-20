import express from "express";
import { WebSocketServer } from "ws";
import net from "node:net";
import tls from "node:tls";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.json({ ok: true, service: "irc-web-client" }));

const server = app.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log(`IRC web client listening on ${process.env.PORT || 10000}`);
});

const wss = new WebSocketServer({ server });

const ALLOWED_PORTS = new Set([6667, 6697, 7000, 7001, 9999]);

function validHost(host) {
  return typeof host === "string" &&
    host.length > 0 && host.length <= 253 &&
    /^[a-zA-Z0-9.-]+$/.test(host) &&
    !host.includes("..");
}

function cleanLine(line) {
  return String(line).replace(/[\r\n\0]/g, "").slice(0, 2048);
}

wss.on("connection", (ws) => {
  let socket = null;
  let connected = false;

  const send = (type, data = {}) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, ...data }));
  };

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch {
      return send("error", { message: "Mensaje inválido." });
    }

    if (msg.action === "connect") {
      if (socket) socket.destroy();

      const host = String(msg.host || "").trim();
      const port = Number(msg.port);
      const useTls = Boolean(msg.tls);
      const nick = String(msg.nick || "WebIRC").replace(/[^A-Za-z0-9_\-\[\]\\`^{}|]/g, "").slice(0, 30) || "WebIRC";
      const username = String(msg.username || nick).replace(/[^A-Za-z0-9_\-]/g, "").slice(0, 30) || nick;

      if (!validHost(host)) return send("error", { message: "Servidor IRC no válido." });
      if (!ALLOWED_PORTS.has(port)) {
        return send("error", { message: "Por seguridad, usa un puerto IRC permitido: 6667, 6697, 7000, 7001 o 9999." });
      }

      send("status", { message: `Conectando a ${host}:${port}${useTls ? " (TLS)" : ""}...` });

      const onConnect = () => {
        connected = true;
        send("connected", { host, port, tls: useTls });
        socket.write(`NICK ${nick}\r\n`);
        socket.write(`USER ${username} 0 * :Web IRC User\r\n`);
      };

      const onData = (buf) => {
        const text = buf.toString("utf8");
        for (const line of text.split(/\r?\n/)) {
          if (!line) continue;
          send("irc", { line });
          if (line.startsWith("PING ")) socket.write(`PONG ${line.slice(5)}\r\n`);
        }
      };

      const onError = (err) => send("error", { message: err.message || "Error de conexión." });
      const onClose = () => {
        connected = false;
        send("disconnected");
      };

      socket = useTls
        ? tls.connect({ host, port, servername: host, rejectUnauthorized: true }, onConnect)
        : net.createConnection({ host, port }, onConnect);

      socket.setTimeout(120000, () => socket.destroy(new Error("Tiempo de espera agotado.")));
      socket.on("data", onData);
      socket.on("error", onError);
      socket.on("close", onClose);
      return;
    }

    if (msg.action === "send" && connected && socket) {
      const line = cleanLine(msg.line);
      if (line) socket.write(line + "\r\n");
    }
  });

  ws.on("close", () => {
    if (socket) socket.destroy();
  });
});
