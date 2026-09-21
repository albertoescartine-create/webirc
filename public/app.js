const $ = id => document.getElementById(id);
let ws, currentChannel = null;
const channels = new Set();

function addMessage(text, cls="") {
  const el = document.createElement("div");
  el.className = "msg " + cls;
  el.textContent = text;
  $("messages").appendChild(el);
  $("messages").scrollTop = $("messages").scrollHeight;
}

function parseIRC(line) {
  let prefix = "", rest = line;
  if (rest.startsWith(":")) {
    const i = rest.indexOf(" ");
    prefix = rest.slice(1, i);
    rest = rest.slice(i + 1);
  }
  const space = rest.indexOf(" ");
  const command = (space < 0 ? rest : rest.slice(0, space)).toUpperCase();
  let params = space < 0 ? [] : rest.slice(space + 1).split(" ");
  if (params.includes(":")) {
    const i = params.indexOf(":");
    params = params.slice(0, i).concat([params.slice(i + 1).join(" ")]);
  } else if (params.length && params[params.length-1].startsWith(":")) {
    params[params.length-1] = params[params.length-1].slice(1);
  }
  return {prefix, command, params};
}

function addChannel(name) {
  if (!name || !name.startsWith("#")) return;
  channels.add(name);
  renderChannels();
}
function renderChannels() {
  $("channels").innerHTML = "";
  for (const ch of channels) {
    const d = document.createElement("div");
    d.className = "channel" + (ch === currentChannel ? " active" : "");
    d.textContent = ch;
    d.onclick = () => { currentChannel = ch; renderChannels(); };
    $("channels").appendChild(d);
  }
}

function send(line) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({action:"send", line}));
}

$("connect").onclick = () => {
  if (ws) ws.close();
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}`);
  $("status").textContent = "Conectando...";
  ws.onopen = () => ws.send(JSON.stringify({
    action:"connect",
    host:$("host").value.trim(),
    port:Number($("port").value),
    nick:$("nick").value.trim(),
    username:$("username").value.trim(),
    tls:$("tls").checked
  }));
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.type === "status") addMessage(m.message, "system");
    if (m.type === "connected") {
      $("status").textContent = `Conectado a ${m.host}:${m.port}`;
      $("login").classList.add("hidden"); $("app").classList.remove("hidden");
      addMessage(`Conectado a ${m.host}:${m.port}`, "system");
    }
    if (m.type === "disconnected") $("status").textContent = "Desconectado";
    if (m.type === "error") addMessage("ERROR: " + m.message, "error");
    if (m.type === "irc") handleIRC(m.line);
  };
  ws.onerror = () => addMessage("No se pudo abrir la conexión WebSocket.", "error");
};

function handleIRC(line) {
  const x = parseIRC(line);
  if (x.command === "PING") { send("PONG :" + (x.params.at(-1) || "")); return; }
  if (x.command === "JOIN") {
    const ch = x.params[0] || "";
    addChannel(ch);
    if (!currentChannel) currentChannel = ch;
  }
  if (x.command === "PRIVMSG") {
    const target = x.params[0], msg = x.params[1] || "";
    const nick = x.prefix.split("!")[0];
    if (target?.startsWith("#")) addChannel(target);
    addMessage(`[${target}] ${nick}: ${msg}`);
  } else if (x.command === "NOTICE") {
    addMessage(`[NOTICE] ${x.params[0] || ""}: ${x.params[1] || ""}`, "system");
  } else if (/^\d+$/.test(x.command)) {
    addMessage(x.params.join(" "), "system");
  } else if (x.command !== "PING") {
    addMessage(line, "system");
  }
}

$("form").onsubmit = e => {
  e.preventDefault();
  const value = $("input").value.trim();
  if (!value) return;
  if (value.startsWith("/")) {
    const cmd = value.slice(1);
    const p = cmd.split(" ");
    const c = p.shift().toUpperCase();
    const rest = p.join(" ");
    if (c === "JOIN" && p[0]) { addChannel(p[0]); currentChannel=p[0]; renderChannels(); }
    send(c === "MSG" && p.length >= 2 ? `PRIVMSG ${p[0]} :${p.slice(1).join(" ")}` : `${c}${rest ? " " + rest : ""}`);
  } else if (currentChannel) {
    send(`PRIVMSG ${currentChannel} :${value}`);
    addMessage(`Tú: ${value}`);
  } else addMessage("Únete a un canal primero.", "error");
  $("input").value = "";
};

$("joinBtn").onclick = () => {
  const ch = prompt("Canal, por ejemplo #chat:");
  if (ch) { addChannel(ch); currentChannel=ch; renderChannels(); send(`JOIN ${ch}`); }
};
