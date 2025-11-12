## Autenticacion JWT
Proceso de Autenticación
1. # Registro de Usuario
Endpoint: POST /api/auth/register
Validaciones:

Numero de colegiado unico
DPI de 13 dígitos unico
Correo electrónico válido y único
Contraseña con mínimo 8 caracteres, una mayúscula, una minúscula y un número
Fecha de nacimiento válida

Proceso:

Validar formato y unicidad de datos
Hash de contraseña con bcrypt (10 salt rounds)
Crear usuario con rol 'voter' por defecto
Guardar en base de datos
Retornar confirmación (no genera token)

2. # Inicio de Sesión
Endpoint: POST /api/auth/login
Request Body:
json{
  "numeroColegiado": "ADMIN001",
  "dpi": "1234567890101",
  "fechaNacimiento": "1990-01-01",
  "password": "Admin123",
  "userType": "admin"
}
Proceso de Validación:

Verificar que el usuario existe por número de colegiado
Validar DPI coincide exactamente
Validar fecha de nacimiento coincide
Verificar contraseña con bcrypt.compare
Verificar que la cuenta esté activa (isActive: true)
Verificar rol si se especificó userType

Generacion de Token:
Si todas las validaciones pasan:

Generar payload del token:

javascript{
  userId: user._id,
  role: user.role,
  iat: timestamp_generacion,
  exp: timestamp_expiracion
}

Firmar con JWT_SECRET usando algoritmo HS256
Retornar token y datos del usuario

Response Exitoso:
json{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWFiYzEyMy4uLiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwNDk4NzY1MywiZXhwIjoxNzA0OTg3NjgzfQ.signature",
  "role": "admin",
  "name": "Administrador Sistema",
  "numeroColegiado": "ADMIN001",
  "message": "Inicio de sesión exitoso."
}
3. # Uso del Token
Incluir el token en todas las peticiones a rutas protegidas:
Header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
4. # Verificacion de Token
Endpoint: GET /api/auth/verify
Permite verificar si un token es válido sin necesidad de hacer otra operación.
Response:
json{
  "success": true,
  "user": {
    "id": "65abc123...",
    "numeroColegiado": "ADMIN001",
    "nombreCompleto": "Administrador Sistema",
    "correo": "admin@colegio.gt",
    "role": "admin"
  }
}
5. # Cierre de Sesión
Endpoint: POST /api/auth/logout
En JWT, el cierre de sesión se maneja del lado del cliente eliminando el token. El endpoint existe para consistencia pero no invalida tokens activos.

# Endpoints de la API
Autenticación (Públicos)
POST /api/auth/register
Registrar un nuevo usuario votante.
Request:
json{
  "numeroColegiado": "ING004",
  "nombreCompleto": "Carlos López",
  "correo": "clopez@example.com",
  "dpi": "5678901234567",
  "fechaNacimiento": "1995-08-15",
  "password": "Password123"
}
Response 201:
json{
  "success": true,
  "message": "Usuario registrado exitosamente. Ya puedes iniciar sesión."
}
Errores Comunes:

400: Datos faltantes o formato inválido
400: Usuario, correo o DPI ya registrado


# POST /api/auth/login
Iniciar sesión y obtener token JWT.
Request:
json{
  "numeroColegiado": "ADMIN001",
  "dpi": "1234567890101",
  "fechaNacimiento": "1990-01-01",
  "password": "Admin123"
}
Response 200:
json{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "admin",
  "name": "Administrador Sistema",
  "numeroColegiado": "ADMIN001",
  "message": "Inicio de sesión exitoso."
}
Errores Comunes:

400: Campos requeridos faltantes
401: Credenciales inválidas
403: Cuenta desactivada

# Ejemplo cURL:
bashcurl -X POST https://votacion-backend-w7t6.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "numeroColegiado": "ADMIN001",
    "dpi": "1234567890101",
    "fechaNacimiento": "1990-01-01",
    "password": "Admin123"
  }'

# GET /api/auth/verify
Verificar validez del token JWT.
Headers:
Authorization: Bearer <token>
Response 200:
json{
  "success": true,
  "user": {
    "id": "65abc123...",
    "numeroColegiado": "ADMIN001",
    "nombreCompleto": "Administrador Sistema",
    "correo": "admin@colegio.gt",
    "role": "admin"
  }
}

# Campañas (Requieren autenticación de votante)
GET /api/campaigns
Listar todas las campañas disponibles.
Headers:
Authorization: Bearer <token>
Response 200:
json{
  "success": true,
  "campaigns": [
    {
      "_id": "65def456...",
      "titulo": "Elección Junta Directiva 2025",
      "descripcion": "Elección de la nueva Junta Directiva...",
      "estado": "habilitada",
      "fechaInicio": "2024-01-15T00:00:00.000Z",
      "fechaFin": "2024-01-22T23:59:59.000Z",
      "votosDisponibles": 1,
      "totalVotos": 45,
      "candidatos": [
        {
          "_id": "65def789...",
          "nombre": "Ing. Henry Peak",
          "foto": "https://via.placeholder.com/150",
          "propuestas": "Modernizacion de procesos...",
          "votos": 25
        }
      ]
    }
  ]
}

# GET /api/campaigns/:id
Obtener detalles de una campaña específica.
Parámetros de Ruta:

id: ID de la campaña en MongoDB

Response 200:
json{
  "success": true,
  "campaign": {
    "_id": "65def456...",
    "titulo": "Eleccion Junta Directiva 2025",
    "descripcion": "Elección de la nueva Junta Directiva...",
    "estado": "habilitada",
    "fechaInicio": "2024-01-15T00:00:00.000Z",
    "fechaFin": "2024-01-22T23:59:59.000Z",
    "votosDisponibles": 1,
    "totalVotos": 45,
    "candidatos": [...]
  }
}

# GET /api/campaigns/:id/voted
Verificar si el usuario actual ya voto en una campaña.
Response 200:
json{
  "success": true,
  "hasVoted": true,
  "votedAt": "2024-01-16T10:30:00.000Z"
}

## El backend del sistema esta completo, por lo que el JWT_EXPIRATION esta configurado para 5 minutos
# URL
https://votacion-backend-w7t6.onrender.com