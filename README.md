# WebIRC — cliente IRC web gratuito

Cliente IRC web con Node.js + WebSocket. La misma aplicación sirve la interfaz web y hace de puente WebSocket → IRC.

## Qué incluye
- Conexión a servidores IRC distintos.
- IRC TCP y TLS.
- Canales y mensajes privados mediante comandos.
- Interfaz adaptable a PC/móvil.
- `/join`, `/part`, `/nick`, `/msg`, `/quit`, etc. se envían como comandos IRC.
- Endpoint `/health` para comprobar el servicio.

## Publicarlo gratis en Render
1. Crea un repositorio en GitHub y sube todos estos archivos.
2. En Render crea **New → Web Service** y conecta el repositorio.
3. Render detectará Node.js; usa `npm install` como build y `npm start` como start.
4. El servicio queda disponible con una URL `*.onrender.com`.
5. Abre esa URL y prueba el cliente.

También puedes usar el `render.yaml` incluido.

## Nota sobre el plan gratuito
El servicio puede quedarse dormido después de 15 minutos sin tráfico entrante y tardar aproximadamente un minuto en despertar. Las conexiones IRC activas pueden cerrarse cuando Render reinicia la instancia.

## Seguridad
El puente limita los destinos a puertos IRC habituales para evitar convertir el sitio en un proxy TCP genérico. No guardes contraseñas de NickServ en el código.


## Configuración ComoGamers

Servidor predeterminado: `comogamers.irc-server.org`
Puerto: `6697`
TLS: activado
