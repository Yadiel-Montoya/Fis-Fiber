# API de Indicadores · FIS FIBER

API independiente y **siempre viva** que se conecta al WMS, junta los datos
en segundo plano y los entrega al instante al dashboard. Vive en tu servidor.

## ¿Por qué existe?

El WMS tarda ~30 s en juntar todos los reprogramados (hay que recorrer ~120
folios, uno por uno). Eso es demasiado para una función serverless de Vercel
(corta a los 10-60 s → error 504). Esta API resuelve el problema:

- Hace el trabajo pesado **en segundo plano**, no cuando el usuario pregunta.
- Guarda el resultado y lo sirve al **instante**.
- Se **actualiza sola** cada mañana / cada 30 min.
- Sigue sirviendo el último dato bueno aunque el WMS falle un momento.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/reprogramados` | Embarques reprogramados (cacheados) |
| GET | `/api/estado` | Cuándo se actualizó cada dato |
| GET | `/health` | Devuelve `OK` (para monitoreo) |
| POST | `/api/refrescar` | Fuerza una actualización ya (token opcional) |

## Instalar y correr

```bash
cd servidor-api
pip install -r requirements.txt
cp .env.example .env        # edita credenciales/puerto si hace falta
python app.py               # arranca en el puerto 3001
```

### En producción (Linux, recomendado)

Con **gunicorn** y UN solo worker (el planificador debe correr una vez):

```bash
gunicorn -w 1 --threads 8 -b 0.0.0.0:3001 app:app
```

> Importante: usa `-w 1` (un worker). Con varios workers, cada uno abriría su
> propia conexión al WMS y lo consultaría en paralelo de más.

### Que arranque solo (systemd)

`/etc/systemd/system/fis-api.service`:

```ini
[Unit]
Description=API Indicadores FIS FIBER
After=network.target

[Service]
WorkingDirectory=/ruta/a/servidor-api
EnvironmentFile=/ruta/a/servidor-api/.env
ExecStart=/usr/bin/gunicorn -w 1 --threads 8 -b 0.0.0.0:3001 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now fis-api
```

## Configuración (variables de entorno)

Ver `.env.example`. Las principales:

- `PORT` — puerto (default 3001)
- `REFRESH_MIN` — cada cuántos minutos se actualiza (default 30)
- `WMS_BASE`, `WMS_EMAIL`, `WMS_PASS` — conexión al WMS
- `REFRESH_TOKEN` — protege `/api/refrescar` (opcional)

## Conectar el dashboard

En el repo del dashboard, edita `js/config.js`:

```js
const EMBARQUES_PROXY_URL = 'http://TU-SERVIDOR:3001';
```

(usa la URL/IP pública o de red donde quede esta API).

## Agregar más datos en el futuro

Está diseñada para crecer. Para exponer un dato nuevo:

1. Escribe la función que lo obtiene (en `wms_client.py` u otro módulo).
2. En `app.py`, añade una línea:  `register('foraneos', wms.get_foraneos)`
3. Queda disponible en `GET /api/foraneos`, con caché y refresco automático.
