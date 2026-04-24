# DjangoFrontCoti

SPA React + Vite oficial en uso para CotiStore.

## Estado actual
- Este repo/carpeta es el frontend principal que se usa para desarrollo y deploy.
- La API esperada vive en `..\CotiDjangoFinal\backend`.
- Existe otra carpeta `CotiDjangoFinal\frontend`, pero hoy se conserva solo como copia legacy/alternativa y no como fuente principal.

## Desarrollo local
```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

Backend local esperado:
- `http://127.0.0.1:8000`

## Variables utiles
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_upload_preset
```

## Nota
Si se trabaja en catalogo, filtros, login, carrito o admin SPA, este es el frontend que hay que tocar primero.
Para deploy coordinado con backend/VPS, tomar como referencia `..\CotiDjangoFinal\backend\docs\vps-deploy-runbook.md`.
