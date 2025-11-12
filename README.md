# Sistema de Votacion Electronica

Sistema web de votacion en tiempo real para el Colegio de Ingenieros de Guatemala. Permite la gestion completa de campañas electorales, emision de votos y generacion de reportes con actualizacion instantanea via WebSocket.

---

##  Características Principales

- **Autenticación segura** con JWT
- **Dos roles**: Administrador y Votante
- **Actualización en tiempo real** mediante WebSocket
- **Gestión completa de campañas** (CRUD)
- **Reportes detallados** con gráficos y estadísticas
- **Control de participación** por usuario
- **Cierre automático** de votaciones
- **Interfaz responsive** y moderna

---

##  Tecnologías

### Frontend
- **React 18** + **TypeScript**
- **React Router** para navegación
- **Axios** para peticiones HTTP
- **Chart.js** para gráficos
- **WebSocket** (nativo) para tiempo real
- **SCSS** para estilos

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT** para autenticación
- **WebSocket (ws)** para tiempo real
- **bcrypt** para encriptación

---

## Estructura del Proyecto

```
proyecto/
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas (admin y voter)
│   │   ├── services/        # API y WebSocket
│   │   └── styles/          # Estilos SCSS
│   └── package.json
│
└── backend/                 # API Node.js
    ├── models/              # Modelos Mongoose
    ├── routes/              # Rutas de la API
    ├── middleware/          # Autenticación JWT
    ├── config/              # Configuración DB
    └── server.js            # Servidor principal + WebSocket
```

---

##  Instalación y Uso

### Prerrequisitos
- Node.js 18+
- MongoDB Atlas (o local)
- npm o yarn

### Backend

```bash
cd backend
npm install
```

Crear archivo `.env`:
```env
PORT=5000
MONGODB_URI=tu_mongodb_uri
JWT_SECRET=tu_secreto_jwt
JWT_EXPIRATION=5m
FRONTEND_URL=http://localhost:5174
```

Iniciar servidor:
```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
```

Crear archivo `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

Iniciar aplicación:
```bash
npm run dev
```

---

##  Roles y Funcionalidades

###  Administrador
- Crear, editar y eliminar campañas
- Gestionar candidatos
- Habilitar/deshabilitar campañas
- Ver reportes detallados con gráficos
- Gestionar votantes (activar/desactivar)
- Exportar reportes (impresión)

###  Votante
- Ver campañas disponibles
- Emitir voto (solo una vez por campaña)
- Ver resultados en tiempo real
- Filtrar campañas (activas/finalizadas)

---

## WebSocket - Tiempo Real

El sistema utiliza WebSocket para actualizaciones instantáneas:

### Eventos implementados:
- `vote_cast` - Nuevo voto emitido
- `campaign_updated` - Campaña modificada
- `campaign_toggled` - Estado de campaña cambiado
- `new_campaign` - Nueva campaña creada
- `campaign_deleted` - Campaña eliminada

### Flujo:
1. Cliente se conecta y autentica con JWT
2. Se suscribe a campañas específicas
3. Servidor envía actualizaciones solo a suscriptores
4. Cliente actualiza UI automáticamente

**Fallback**: Si WebSocket no esta disponible, usa polling cada 3-5 segundos.

---

## Flujo de una Votacion

```
1. Admin crea campaña
   ├─ Define título, descripción, candidatos
   ├─ Establece fecha/hora de cierre
   └─ Estado: "deshabilitada"

2. Admin habilita campaña
   ├─ fechaInicio = ahora (automatico)
   ├─ Estado: "habilitada"
   └─ Notifica vía WebSocket a todos

3. Votantes emiten votos
   ├─ Sistema valida: usuario activo, no votó antes
   ├─ Registra voto con timestamp
   └─ Actualiza contadores en tiempo real

4. Cierre automático
   ├─ Al llegar a fechaFin, estado = "finalizada"
   └─ No se permiten más votos

5. Reportes disponibles
   ├─ Resultados por candidato
   ├─ Graficos (pastel y barras)
   ├─ Listado completo de votos
   └─ Tasa de participación
```

---

##  Seguridad

- Contraseñas encriptadas con **bcrypt**
- Autenticacion con **JWT** (5 min de expiración)
- Middleware de verificacion de roles
- Validacion de datos en frontend y backend
- Proteccion contra voto duplicado (indice unico en DB)
- Verificacion de identidad (DPI + fecha nacimiento)
- CORS configurado para dominio específico

---

## Características Avanzadas

### Gestion de Campañas
- Inicio automático al habilitar
- Cierre programado con fecha/hora exacta
- No se puede eliminar si tiene votos
- Edición bloqueada si hay votos emitidos

### Control de Votantes
- Activar/desactivar usuarios
- Historial de votos por usuario
- Estadísticas de participación
- Búsqueda y filtros avanzados

### Reportes
- Reporte general del sistema
- Reporte detallado por campaña
- Graficos visuales (Chart.js)
- Exportacion imprimible
- Tasa de participación real

---

## Despliegue (Render.com)

### Backend
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=tu_secreto_produccion
FRONTEND_URL=https://tu-frontend.onrender.com
```

### Frontend
```env
VITE_API_URL=https://tu-backend.onrender.com/api
VITE_WS_URL=wss://tu-backend.onrender.com
```

**Nota**: Usar `wss://` (WebSocket Secure) en produccion.

---

## Variables de Entorno

### Backend (.env)
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `5000` |
| `MONGODB_URI` | Conexión a MongoDB | `mongodb+srv://...` |
| `JWT_SECRET` | Clave secreta JWT | `mi_secreto_123` |
| `JWT_EXPIRATION` | Tiempo expiración token | `5m` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:5174` |

### Frontend (.env)
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend API | `http://localhost:5000/api` |
| `VITE_WS_URL` | URL del WebSocket | `ws://localhost:5000` |

---

## Solucion de Problemas

### WebSocket no conecta
- Verificar que `VITE_WS_URL` sea correcto
- En producción usar `wss://` no `ws://`
- Verificar que el backend tenga WebSocket activo

### Error 401 - Token expirado
- El sistema muestra mensaje automatico
- Redirige al login
- Usuario debe iniciar sesion nuevamente

### Votos no se actualizan
- Verificar conexion WebSocket en consola
- Si falla, el sistema usa polling como respaldo

---

## Frontend
https://zero6-sistema-de-votacion.onrender.com/

## Backend
https://votacion-backend-w7t6.onrender.com


---
## Enlace al Manual Tecnico
https://drive.google.com/drive/folders/1gr56Ih2bEZAPQqnKao3ffmhNOPIO6Hu7?usp=sharing

## Enlace al Manual de Usuario
https://drive.google.com/drive/folders/1VyD1ORFHw93SdVxuCaThzd1qHznYgPd_?usp=sharing

##  Desarrollado por

- Edwar Daniel Calderon Cinco 9490-20-26601
- Henry David Cabrera Virula 9490-20-6611