# DOCUMENTO DE REQUISITOS DEL PRODUCTO Y DISEÑO TÉCNICO (PRD)
## PROYECTO: ROYAL TEAM CHESS
**Versión de Planos:** 1.1 (Especificaciones de Negocio, Suscripciones y Circuitos Integradas)  
**Fecha de Emisión:** Octubre 2026  
**Clasificación:** Nivel 3 (Multijugador en tiempo real con WebSockets y persistencia en la nube)  
**Estado:** Base funcional implementada y auditada con arquitectura comercial formalizada.

---

## ÍNDICE GENERAL

1. [PILAR 1: VISIÓN GENERAL, GÉNERO Y ALCANCE DE LA VERSIÓN 1.0](#pilar-1-visión-general-género-y-alcance-de-la-versión-10)
   - 1.1 Nombre y Definición de Producto
   - 1.2 Género y Propuesta de Valor Única
   - 1.3 Clasificación de Complejidad Técnica
   - 1.4 Alcance Oficial de la Versión 1.0
2. [PILAR 2: MAPA DE PANTALLAS Y NAVEGACIÓN (HUD Y MENÚS)](#pilar-2-mapa-de-pantallas-y-navegación-hud-y-menús)
   - 2.1 Arquitectura de Navegación y Enrutamiento (React Router DOM)
   - 2.2 Pantalla 1: Landing Page y Acceso Invitado (`LandingPage.jsx`)
   - 2.3 Pantalla 2: Menú Principal (`renderMainMenu`)
   - 2.4 Pantalla 3: Menú de Modos de Juego (`renderPlayMenu`)
   - 2.5 Pantalla 4: Creación de Servidor / Sala (`renderCreateServer`)
   - 2.6 Pantalla 5: Explorador de Servidores (`renderBrowser`)
   - 2.7 Pantalla 6: Emparejamiento Rápido / Matchmaking (`renderQuickMatch`)
   - 2.8 Pantalla 7: Salas de Espera / Lobby Estándar y Encuentro (`Lobby.jsx` y `EncuentroLobby.jsx`)
   - 2.9 Pantalla 8: Sala de Partida por Equipos (`GameRoom.jsx` & `ChessBoard.jsx`)
   - 2.10 Pantalla 9: Fin de Partida y Desglose de Puntuación (`gameState.matchResult`)
   - 2.11 Pantalla 10: Perfil de Usuario y Estadísticas (`UserProfile.jsx`, `UserStatistics.jsx`)
   - 2.12 Pantalla 11: Sistema de Clubes y Alianzas (`ClubProfile.jsx`, `CreateClub.jsx`, `ClubStatistics.jsx`)
   - 2.13 Pantalla 12: Ligas y Clasificación Estacional (`RankingLeagues.jsx`)
   - 2.14 Pantallas Legales: Términos de Servicio y Política de Privacidad (`/terms`, `/privacy`)
   - 2.15 Modales Transversales y HUD Flotante (Party, Chat Social, Contacto, Auth)
3. [PILAR 3: FUNCIONAMIENTO INTERNO, MECÁNICAS Y REGLAS EXACTAS (CORE LOOP)](#pilar-3-funcionamiento-interno-mecánicas-y-reglas-exactas-core-loop)
   - 3.1 El Ciclo Central del Juego (Core Game Loop)
   - 3.2 Modos de Juego: Estándar vs. Encuentro (Match de Clubes)
   - 3.3 Asignación de Bandos y Ordenamiento por ELO
   - 3.4 El Reloj Compartido de Equipo y Tasa de Consumo Simúltáneo
   - 3.5 Flujo de Turnos y Validación de Jugadas (Chess.js)
   - 3.6 Condiciones de Victoria, Derrota, Tablas y Abandono
   - 3.7 Sistema de Telemetría Abstracta (Visualizadores Tácticos)
   - 3.8 Matchmaking y ELO Dinámico
   - 3.9 Sistema de Partys y Lazy Party Creation
   - 3.10 Mecánicas de Clubes vs. Alianzas, Puntos Estacionales y Periodo de Fichajes
   - 3.11 Sistema de Ligas (Divisiones 1 a 6 + División 0 Pool)
   - 3.12 Transición de Temporada y Algoritmo de Ascensos/Descensos (Waterfall)
   - 3.13 Sistema de Premiación y Vitrina de Trofeos Oficiales
   - 3.14 Circuito Profesional y Selecciones Nacionales (Copa de Países)
4. [PILAR 4: DISEÑO VISUAL, INTERFAZ, ANIMACIONES Y RESPONSIVE](#pilar-4-diseño-visual-interfaz-animaciones-y-responsive)
   - 4.1 Identidad Estética y Paleta de Colores
   - 4.2 Tablero de Ajedrez y Representación Gráfica
   - 4.3 Arquitectura Responsive (PC Escritorio vs. Dispositivos Móviles)
   - 4.4 Estados de Conexión, Indicadores en Vivo y Badges
   - 4.5 Telemetría Visual Detallada
5. [PILAR 5: GESTIÓN DE DATOS, CUENTAS Y BASE DE DATOS](#pilar-5-gestión-de-datos-cuentas-y-base-de-datos)
   - 5.1 Arquitectura de Backend e Infraestructura Supabase
   - 5.2 Esquema Completo de Tablas y Relaciones
   - 5.3 Funciones Almacenadas (RPC) y Triggers Automatizados (Límite 16 Miembros)
   - 5.4 Políticas de Seguridad RLS (Row Level Security)
   - 5.5 Ciclo de Retención de Datos (Data Retention Cleanup)
6. [PILAR 6: ARQUITECTURA DE MONETIZACIÓN](#pilar-6-arquitectura-de-monetización)
   - 6.1 Matriz de Niveles de Suscripción (Gratis, Básica 5 €, Profesional 10 €)
   - 6.2 Integración Técnica de Pasarela de Pagos (Stripe Billing)
   - 6.3 Modelo de Publicidad Pasiva
   - 6.4 Marco Regulatorio y Textos Legales
7. [PILAR 7: STACK TECNOLÓGICO Y ÁRBOL MODULAR DE ARCHIVOS](#pilar-7-stack-tecnológico-y-árbol-modular-de-archivos)
   - 7.1 Stack Tecnológico Exhaustivo
   - 7.2 Variables de Entorno del Ecosistema
   - 7.3 Árbol Anotado de Carpetas y Archivos

---

# PILAR 1: VISIÓN GENERAL, GÉNERO Y ALCANCE DE LA VERSIÓN 1.0

### 1.1 Nombre y Definición de Producto
* **Nombre Oficial:** Royal Team Chess (RTC).
* **Versión de Lanzamiento:** `v1.0.0_Launch` (identificador emitido en handshake Socket.io `server_version`).
* **Definición:** Plataforma competitiva de ajedrez táctico multijugador en tiempo real basada en la cooperación coordinada por equipos sobre múltiples tableros paralelos sincronizados con un reloj común.

### 1.2 Género y Propuesta de Valor Única
* **Género:** Ajedrez táctico multijugador por equipos (Team-Based Tactical Chess).
* **Propuesta de Valor Única (PVP):**
  1. **Reloj Global de Equipo con Drenaje Acumulativo:** Los miembros de un mismo bando (Blancas o Negras) comparten una bolsa de tiempo común. Por cada tablero en el que sea el turno de pensar de un integrante del equipo, el reloj drena a velocidad multiplicada por el número de tableros activos en su turno.
  2. **Telemetría Táctica Compartida (Visualizadores Abstractos):** Sin necesidad de mirar manualmente los tableros completos de los compañeros, cada jugador dispone de telemetría en tiempo real:
     - *Heatmap*: Mapa matricial de calor y presión táctica sobre casillas críticas y rayos X.
     - *Thermometer*: Evaluación material de posición en tiempo real.
     - *King Shield*: Indicador de seguridad, jaque y enroque del Rey.
     - *Burn Flame*: Indicador de consumo excesivo de tiempo individual respecto al promedio del equipo.
  3. **Comunicaciones Segregadas por Bando:** Canales de chat de texto y streaming de audio de voz WebRTC en baja latencia (250 ms) filtrados estrictamente entre compañeros de equipo para evitar el espionaje del rival.
  4. **Modo Encuentro (Club Matches):** Sistema de competición interclubes con elección de Capitán, presentación de alineaciones (titulares y suplentes), rotación de colores entre rondas, descansos con sustituciones tácticas y rondas de desempate por reducción de tiempo.
  5. **Ecosistema de Ligas Piramidales y Clubes:** Sistema estacional mensual (zona horaria Europe/Madrid) con 6 Divisiones, zona de ascenso y descenso automático, pool de reserva y vitrina digital de trofeos.

### 1.3 Clasificación de Complejidad Técnica
* **Nivel de Complejidad:** **Nivel 3 (Multijugador en tiempo real con WebSockets y persistencia en la nube)**.
* **Componentes de Nivel 3 Implementados:**
  - Comunicación bidireccional basada en WebSockets con Socket.io v4.
  - Sincronización continua de tableros de ajedrez mediante FEN y notación algebraica validada por `chess.js`.
  - Servidor con lógica autoritativa de estados de partida, temporizadores milimétricos y desempates.
  - Streaming de fragmentos de audio (`audio/webm;codecs=opus`) y decodificación en cola Web Audio API.
  - Sistema de base de datos relacional PostgreSQL con Supabase (RLS, Realtime Channels, Triggers PL/pgSQL).
  - Tareas programadas en servidor (Cron Jobs) con evaluación estacional y archivado de estadísticas.

### 1.4 Alcance Oficial de la Versión 1.0
* **Soporte de Jugadores:**
  - Partidas 1 vs 1, 2 vs 2, 3 vs 3 y 4 vs 4 en modo Estándar.
  - Encuentros de 2, 3, 4, 6 y 8 tableros por ronda en modo Encuentro (hasta 8 jugadores activos + banquillo por equipo).
  - Espectadores ilimitados en modo observación con vista multicampo.
* **Idiomas de Plataforma:**
  - Bilingüe completo e intercambiable en caliente: **Español (ES)** e **Inglés (EN)** con catálogo de traducciones estandarizado (`translations.js`).

---

# PILAR 2: MAPA DE PANTALLAS Y NAVEGACIÓN (HUD Y MENÚS)

### 2.1 Arquitectura de Navegación y Enrutamiento (React Router DOM)
La aplicación utiliza `react-router-dom` v7 integrado con un gestor de estados interno en `App.jsx` y `LandingPage.jsx`:

| Ruta URL | Componente Raíz | Descripción y Condiciones de Renderizado |
| :--- | :--- | :--- |
| `/` | `RoyalTeamChess` / `LandingPage` | Punto de entrada. Muestra `LandingPage` si no hay sala activa; `Lobby` si se unió a una sala inactiva; `GameRoom` si la sala está activa; o pantalla de victoria si `matchResult` existe. |
| `/main` | `LandingPage (menuView='main')` | Acceso directo al Menú Principal con usuario autenticado. |
| `/profile/:userId` | `UserProfile` | Vista de perfil público o propio, vitrina de trofeos y club actual. |
| `/profile/:userId/stats`| `UserStatistics` | Estadísticas individuales avanzadas y desglose de victorias/derrotas. |
| `/ranking-leagues` | `RankingLeagues` | Tabla de clasificación por Divisiones (1 a 6) e histórico mensual. |
| `/club/create` | `CreateClub` | Formulario de registro y fundación de un nuevo club. |
| `/club/:clubId` | `ClubProfile` | Perfil del club, lista de integrantes, solicitudes, estadísticas y chat de club. |
| `/terms` | `TermsOfService` | Términos y Condiciones Oficiales de Uso, Contratación y Suscripciones. |
| `/privacy` | `PrivacyPolicy` | Política de Privacidad, Protección de Datos (RGPD) y Cookies. |
| `*` (Catch-All) | `RoyalTeamChess` | Redirección protectora a la raíz manteniendo el estado del WebSocket. |

---

### 2.2 Pantalla 1: Landing Page y Acceso Invitado (`LandingPage.jsx`)
* **Estado:** `menuView === 'landing'`.
* **Propósito:** Presentación de bienvenida, branding, propuesta técnica y punto de autenticación.
* **Componentes y Elementos de Interfaz:**
  - **Barra Superior (Top Nav):**
    - Logotipo con icono de Corona (`Crown`) y tipografía con degradado `Royal Team Chess`.
    - Botón de Soporte/Contacto: Abre `ContactModal` (`contact@royalteamchess.com`).
    - Selector de Idioma: Alterna dinámicamente entre Inglés y Español.
    - Botón "Sign In / Register": Abre `AuthModal` (si no hay sesión).
    - Menú de Usuario (si está logueado): Muestra avatar, nombre de usuario y botón de Sign Out.
  - **Banner Principal (Hero Section):**
    - Titular: "El ajedrez por equipos reinventado".
    - Subtítulo descriptivo del reloj compartido y visualizadores.
    - Botón CTA Principal: "JUGAR AHORA" (si logueado -> navega a `menuView='main'`; si invitado -> abre modal de login).
    - Botón Secundario: "Acceso Invitado" o exploración libre.
  - **Sección de Características (Features Grid):**
    - Tarjeta 1: Reloj de Equipo con indicador animado.
    - Tarjeta 2: Telemetría Táctica (Heatmap y presión).
    - Tarjeta 3: Comunicación en vivo (Voz y texto seguro).
    - Tarjeta 4: Clubes y Ligas competitivas.

---

### 2.3 Pantalla 2: Menú Principal (`renderMainMenu`)
* **Estado:** `menuView === 'main'`.
* **Propósito:** Hub central del jugador registrado para seleccionar actividades, gestionar amistades y acceder a clubes.
* **Componentes y Acciones:**
  - **Barra de Búsqueda Global Superior:**
    - Input de búsqueda predictiva con dropdown interactivo de usuarios y clubes.
    - Filtro selector: "Jugador" (`player`) o "Equipo/Club" (`team`).
    - Clic en resultado: Redirige a `/profile/:userId` o `/club/:clubId`.
  - **Grid de Tarjetas de Acción Rápida (3 columnas):**
    1. **Tarjeta Ligas y Clasificación:** Navega a `/ranking-leagues`.
    2. **Tarjeta Jugar (Play):** Cambia vista a `menuView = 'play_modes'`.
    3. **Tarjeta Perfil:** Navega a `/profile/:userId` propio.
    4. **Tarjeta Club:** Verifica si el usuario tiene club (`POST /api/clubs/my-club`); si existe navega a `/club/:id`, si no existe navega a `/club/create`.
    5. **Tarjeta Mensajes:** Abre `ChatModal` flotante con badge dinámico de mensajes no leídos (`unreadCount`).
    6. **Tarjeta Party (Banner Inferior):** Si no hay party, botón en reposo para invitar amigos. Si la party está activa (`party !== null`), muestra estado de miembros y botón para abrir `PartyModal`.
  - **Panel Social Lateral Derecho (`SocialPanel.jsx`):**
    - Pestaña "Amigos": Lista de amigos con indicador de conexión en tiempo real (`online` / `offline`), botón para abrir chat directo y botón para invitar a Party.
    - Pestaña "Club": Lista de compañeros de club con sus respectivos estados de conexión.
  - **Botón de Cierre de Sesión:** Cierra sesión Supabase (`signOut()`) y retorna a `landing`.

---

### 2.4 Pantalla 3: Menú de Modos de Juego (`renderPlayMenu`)
* **Estado:** `menuView === 'play_modes'`.
* **Propósito:** Selección del método de emparejamiento.
* **Opciones y Botones:**
  - **1. Partida Rápida (Quick Match):** Cambia a `menuView = 'quick'`. Emparejamiento automatizado por cola ELO.
  - **2. Explorador de Servidores (Server Browser):** Cambia a `menuView = 'browser'`. Lista salas públicas personalizadas creadas por la comunidad.
  - **3. Crear Servidor (Create Server):** Cambia a `menuView = 'create'`. Panel de configuración para hostear una sala.
  - **Botón Volver:** Regresa al menú principal (`menuView = 'main'`).

---

### 2.5 Pantalla 4: Creación de Servidor / Sala (`renderCreateServer`)
* **Estado:** `menuView === 'create'`.
* **Propósito:** Configuración paramétrica de una sala privada o comunitaria.
* **Controles y Selectores del Formulario:**
  - **Nombre de Sala:** Input de texto (placeholder predeterminado o asignación aleatoria).
  - **Selector de Modo de Juego:**
    - `standard`: Ajedrez por equipos clásico.
    - `encuentro`: Match competitivo por rondas y capitanes.
  - **Parámetros en Modo Estándar (`standard`):**
    - Tamaño de Equipo: 1 vs 1, 2 vs 2, 3 vs 3, 4 vs 4.
    - Tiempo por Bando: 5, 10, 20, 30, 40, 50, 60 minutos.
    - Modo de Visualizador: `board` (tablero auxiliar) o `indicators` (solo telemetría).
  - **Parámetros en Modo Encuentro (`encuentro`):**
    - Partidas/Rondas (`matches`): 1, 2, 3, 4, 6 u 8 rondas.
    - Tableros por Ronda (`boards`): 2, 3, 4, 6 u 8 tableros paralelos.
    - Sustituciones Permitidas: 0, 2, 4, 6, 8 o 10 cambios por bando.
    - Tiempo por Ronda: 10, 20, 30, 40 o 60 minutos.
    - Checkbox Desempates: Activa rondas extra con reducción de tiempo a la mitad (mínimo 10 min).
    - Tiempo de Descanso entre Rondas: 1, 3, 5, 10, 20, 30, 40, 50 o 60 minutos.
    - Tiempo de Descanso previo a Desempate: 1 a 60 minutos.
    - Cambios Extra en Desempates: 0 a 6 sustituciones adicionales.
    - Modo de Vista de Banquillo: `board` o `indicators`.
  - **Parámetros Comunes:**
    - Idioma de Sala: Español / Inglés.
    - Chat de Voz: Activado / Desactivado.
    - Switch Sala Privada con Contraseña: Campo desplegable de contraseña segura.
  - **Botones de Acción:**
    - "Cancelar": Retorna a `play_modes`.
    - "Crear y Lanzar": Emite evento `createRoom` a Socket.io y transiciona a la sala de espera.

---

### 2.6 Pantalla 5: Explorador de Servidores (`renderBrowser`)
* **Estado:** `menuView === 'browser'`.
* **Propósito:** Explorar, filtrar y unirse a salas creadas por otros usuarios.
* **Componentes:**
  - Barra de filtro por nombre de sala.
  - Botón "Actualizar" (`onRefreshRooms` -> `socket.emit('getRooms')`).
  - Lista de salas activas en tarjetas con indicadores:
    - Nombre de sala y creador.
    - Modo de juego (Estándar / Encuentro).
    - Estado de candado (Pública / Protegida con Password).
    - Ocupación de jugadores (ej. 3/4).
    - Control de tiempo y soporte de voz.
  - Modal emergente para ingresar contraseña si la sala seleccionada es privada.
  - Botón "Unirse": Emite `joinRoom` con `password` opcional.

---

### 2.7 Pantalla 6: Emparejamiento Rápido / Matchmaking (`renderQuickMatch`)
* **Estado:** `menuView === 'quick'`.
* **Propósito:** Búsqueda automática basada en ELO y preferencias.
* **Controles y Restricciones:**
  - Selector de Tiempo: Cualquiera (`any`), 5, 10, 20, 30, 40, 50, 60 minutos.
  - Selector de Tamaño de Equipo: 1v1, 2v2, 3v3, 4v4 o Cualquiera. *(Bloqueado automáticamente al tamaño de la party si se busca en grupo)*.
  - Selector de Idioma: Español / Inglés / Cualquiera.
  - Selector de Chat de Voz: Sí / No / Cualquiera.
  - Checkbox "Jugar por Club": Disponible únicamente si el jugador (o todos los miembros de la party) pertenecen al mismo club.
  - **Estado de Búsqueda:**
    - Indicador visual animado (pulso radar).
    - Cronómetro de tiempo en cola de espera.
    - Botón "Cancelar Búsqueda": Emite `cancelMatchmaking` al servidor.

---

### 2.8 Pantalla 7: Salas de Espera / Lobby Estándar y Encuentro (`Lobby.jsx` y `EncuentroLobby.jsx`)
* **Enrutamiento Condicional en `App.jsx`:** Cuando la sala no está activa (`!roomData.active`), la aplicación bifurca dinámicamente según el modo configurado:
  - Si `roomData.settings?.mode === 'encuentro'`, renderiza `EncuentroLobby.jsx`.
  - En cualquier otro caso (modo por defecto), renderiza `Lobby.jsx`.
* **Componentes:**
  - **En Modo Estándar (`Lobby.jsx`):**
    - Cabecera con Nombre de Sala, Tag "RANKED" (si es matchmaking) y botón "Abandonar Sala".
    - Toggle de Micrófono para chat de voz en sala de espera.
    - Resumen de reglas (Tiempo por bando y número de jugadores).
    - **Panel Equipo Blanco:** Lista de ranuras con avatar, username, badge de ELO y estado "READY" / "NOT READY". Botón "Unirse a Blancas" / "Dejar Bando".
    - **Panel Equipo Negro:** Misma estructura para el bando negro.
    - **Panel de Espectadores:** Ranuras para observadores pasivos.
    - **Botón "Listo" (Toggle Ready):** Marca al usuario como preparado.
    - **Botón "Iniciar Partida" (Host Only):** Habilitado solo cuando todos los jugadores de ambos equipos están listos y los equipos están completos e igualados.
    - **Banner de Cuenta Regresiva:** Al emitirse `matchStarting`, se activa una cuenta regresiva de 5 segundos previa al inicio simultáneo de tableros.
  - **En Modo Encuentro (`EncuentroLobby.jsx`):**
    - Fase de Votación de Capitán: Panel interactivo donde cada miembro de bando vota a un compañero como Capitán con mayoría simple requerida.
    - Fase de Alineación (Capitán Only): Interfaz de arrastrar y soltar (o selección posicional) para asignar titulares a los Tableros 1..N y enviar el resto al Banquillo (`bench`).
    - Panel de Descanso: Cronómetro de descanso entre rondas (`breakTime`) y contador de sustituciones disponibles.
    - Marcador en vivo y sincronización con `encuentroUpdate` y `encuentroTimer`.

---

### 2.9 Pantalla 8: Sala de Partida por Equipos (`GameRoom.jsx` & `ChessBoard.jsx`)
* **Propósito:** El entorno central de combate táctico.
* **Componentes del HUD:**
  - **Barra Superior (Top Status Bar):**
    - Botón "Abandonar" (Leave match).
    - Identificador de sala y etiqueta de rol asignado (Blancas / Negras / Espectador).
    - En modo Encuentro: Marcador de Ronda y Puntos de Match (`R1 | Blancas: 3 - Negras: 0`).
    - **Relojes de Equipo en Tiempo Real:** Visualizadores gemelos de minutos:segundos con alerta roja pulsante cuando restan menos de 60 segundos.
    - Botón "Ofrecer Tablas" (`offerDraw`) con confirmación.
    - Botón "Rendirse" (`resign`) con confirmación.
    - Toggle de Micrófono en vivo (indicador verde activo, gris silenciado).
  - **Área Central Superior (Mi Tablero de Juego):**
    - Renderizado mediante `ChessBoard.jsx` montado sobre `react-chessboard`.
    - Orientación automática según el color del jugador (Blancas abajo o Negras abajo).
    - Validación de jugadas estrictas de turno.
    - Soporte de enroque estándar y "drag-to-rook" (soltar el rey sobre la torre).
    - Resaltado visual en rojo con degradado radial y caja de sombra sobre el Rey cuando se encuentra en Jaque (`inCheck()`).
    - Barra de piezas capturadas por el jugador y por el adversario.
  - **Modal de Oferta de Tablas:** Diálogo emergente con botones Aceptar/Rechazar cuando el oponente directo ofrece tablas.
  - **Área Inferior Desplegable (Visualizadores de Compañeros de Equipo):**
    - Pestaña colapsable "Team Visualizer" con flecha indicadora.
    - Para cada tablero de compañero activo se renderiza un módulo compacto:
      - Vista seleccionable: Tablero miniatura o Heatmap de casillas.
      - Termómetro vertical de ventaja posicional.
      - Escudo de seguridad del Rey.
      - Llama de consumo de tiempo.
      - Lista de piezas capturadas en ese tablero.
  - **Panel Lateral Derecho: Chat de Equipo y Notificaciones:**
    - Historial de chat filtrado exclusivamente para miembros del propio bando.
    - Input de envío con tecla Enter o botón de envío (`Send`).
    - Mensajes del sistema (avisos de tiempo, desconexiones, rendiciones).

---

### 2.10 Pantalla 9: Fin de Partida y Desglose de Puntuación (`gameState.matchResult`)
* **Propósito:** Resumen de resultados tras finalizar todos los tableros o por tiempo agotado.
* **Elementos Visuales:**
  - Gran cabecera de victoria: "BLANCAS GANAN", "NEGRAS GANAN" o "TABLAS".
  - Marcador numérico de puntos totales (`Blancas: X | Negras: Y`).
  - **Desglose Tablero por Tablero:**
    - Indicador de color de bando.
    - Nombre del jugador de Blancas y Negras.
    - Número de tablero.
    - Condición de fin (Jaque mate, Tiempo, Rendición, Acuerdo de tablas).
    - Puntos otorgados a cada jugador (+3 pts victoria, +1 pto tablas, 0 derrota).
  - Botón inferior: "Volver al Lobby / Inicio".

---

### 2.11 Pantalla 10: Perfil de Usuario y Estadísticas (`UserProfile.jsx`, `UserStatistics.jsx`)
* **Ruta:** `/profile/:userId` y `/profile/:userId/stats`.
* **Componentes:**
  - Encabezado con Avatar personalizado, Username, Club actual y fecha de alta.
  - Puntuación ELO actual (rating oficial).
  - Acciones sociales (si es perfil ajeno): Botón "Enviar Solicitud de Amistad" (abre `FriendRequestModal`) o "Eliminar Amigo"; botón de Mensaje Directo (abre `ChatModal`).
  - Acciones propias (si es perfil propio): Botón "Editar Perfil" (abre `EditProfileModal` para actualizar username, avatar o borrar cuenta).
  - **Vitrina de Trofeos (`TrophyList.jsx`):** Despliegue en cuadrícula de trofeos individuales y de club ganados, con modal descriptivo al hacer clic.
  - **Pestaña de Estadísticas Avanzadas (`UserStatistics.jsx`):**
    - Filtro selector por temporada mensual (últimos 6 meses).
    - Enfrentamientos individuales jugados, ganados, perdidos y empatados.
    - Porcentaje de victoria global (Win Rate).
    - Puntos de temporada acumulados.
    - Piezas capturadas totales.
    - Desglose de victorias por tipo: Jaque Mate (`wins_checkmate`), Tiempo (`wins_time`) y Rendición del rival (`wins_resignation`).
    - Desglose de derrotas por tipo: Jaque Mate (`losses_checkmate`), Tiempo (`losses_time`) y Rendición propia (`losses_resignation`).

---

### 2.12 Pantalla 11: Sistema de Clubes (`ClubProfile.jsx`, `CreateClub.jsx`, `ClubStatistics.jsx`)
* **Ruta:** `/club/:clubId` y `/club/create`.
* **Componentes:**
  - **Creación de Club (`CreateClub.jsx`):** Formulario con Nombre de Club (mínimo 3 caracteres, validación de nombre único), Descripción (hasta 200 caracteres) y URL de Escudo/Logo.
  - **Perfil de Club (`ClubProfile.jsx`):**
    - Escudo del club, Nombre, Descripción, Propietario (Owner) y División de Liga actual.
    - Resumen de Liga: División, Puntos estacionales, Partidas ganadas, empatadas y perdidas.
    - Vitrina de Trofeos del Club.
    - **Pestaña Miembros:** Lista de integrantes con sus ELOs, fecha de incorporación, rol y **Puntos de Contribución Estacional** aportados al club.
    - **Opciones de Propietario (Owner):**
      - Modal de Invitación a Usuarios con búsqueda predictiva por username.
      - Pestaña de Solicitudes Pendientes para aceptar o declinar aspirantes.
      - Modo Expulsión (`isKickMode`) para eliminar miembros del club.
      - Configuración y botón destructivo "Eliminar Club".
    - **Opciones de Usuario Externo:** Botón "Solicitar Unirse" con mensaje de presentación.
    - **Chat de Club Integrado (`ClubChat.jsx`):** Chat en tiempo real exclusivo para los miembros del club con Supabase Realtime Channels.

---

### 2.13 Pantalla 12: Ligas y Clasificación Estacional (`RankingLeagues.jsx`)
* **Ruta:** `/ranking-leagues`.
* **Componentes:**
  - Selector de Temporada (mes actual y últimos 6 meses en formato `YYYY-MM`).
  - Selector de División: Divisiones 1, 2, 3, 4, 5 y 6.
  - **Tabla de Clasificación Oficial:**
    - Columnas: Posición (`Rank`), Club (Logo y Nombre), Puntos de Temporada (`PTS`), Partidas Ganadas (`W`), Empatadas (`D`), Perdidas (`L`), Diferencia de Partidas (`DIFF`).
    - Indicadores de Color de Zona:
      - **División 1:** Fondo rojo / franja roja en las últimas 3 posiciones (Zona de Descenso).
      - **Divisiones 2 a 6:** Fondo verde / franja verde en las 3 primeras posiciones (Zona de Ascenso directo); fondo rojo / franja roja en las 3 últimas posiciones (Zona de Descenso).
  - Leyenda inferior explicativa de ascensos y descensos.

---

### 2.14 Pantallas Legales: Términos de Servicio y Política de Privacidad (`/terms`, `/privacy`)
* **Rutas:** `/terms` y `/privacy`.
* **Componentes:**
  - Vistas formales de lectura y cumplimiento normativo (RGPD / LOPD-GDD / Comercio Electrónico de la UE).
  - Desglose de derechos de usuario, modelo de suscripciones de 5 € y 10 €, política de renovación y cancelación, política anti-trampas (Fair Play) y uso de cookies publicitarias para el nivel gratuito.
  - Enlaces de navegación desde el pie de página de la Landing Page y el formulario de registro.

---

### 2.15 Modales Transversales y HUD Flotante (Party, Chat Social, Contacto, Auth)
1. **Modal de Party (`PartyModal.jsx`):**
   - Gestión de grupo cooperativo de 1 a 4 jugadores.
   - Lista de miembros de la party con corona dorada para el Líder.
   - Ranuras vacías (Empty Slots).
   - Chat exclusivo de Party en tiempo real.
   - Botón "Abandonar Party".
2. **Modal de Chat Directo y Notificaciones (`ChatModal.jsx`):**
   - Sistema de mensajería privada 1 a 1 en tiempo real.
   - Bandeja de entrada con historial de conversaciones y búsqueda de chats.
   - **Tarjetas de Acción Interactivas en el Mensaje:**
     - `PARTY_INVITE:::partyId`: Botón "Unirse a la Party".
     - `PARTY_PROPOSAL:::username`: Botón "Aceptar Propuesta" (crea party automáticamente entre ambos).
     - `club_invite`: Botones "Aceptar y Unirse al Club" y "Rechazar".
     - `club_join_request`: Botones para el dueño del club: "Aceptar Solicitud" y "Rechazar".
     - `friend_request`: Solicitudes de amistad interactiva.
3. **Modal de Autenticación (`AuthModal.jsx`):**
   - Vistas conmutables: Iniciar Sesión, Registro de Cuenta, Recuperar Contraseña (`forgotPassword`), Actualizar Contraseña (`updatePassword`).
   - Envío y reenvío de confirmación de email con Supabase Auth.
4. **Modal de Contacto (`ContactModal.jsx`):**
   - Soporte oficial y botón "Copiar Email" (`contact@royalteamchess.com`).
5. **Modal de Información y Demo (`InfoModal.jsx`):**
   - Guía interactiva de controles y reglas de la plataforma.

---

# PILAR 3: FUNCIONAMIENTO INTERNO, MECÁNICAS Y REGLAS EXACTAS (CORE LOOP)

### 3.1 El Ciclo Central del Juego (Core Game Loop)
```
[Lobby / Matchmaking] 
       │
       ▼
[Emparejamiento & Validación de ELO] 
       │
       ▼
[Asignación de Color y Ordenamiento de Tableros por ELO]
       │
       ▼
[Cuenta Regresiva 5s]
       │
       ▼
[Inicio Simultáneo de Tableros & Activación de Reloj de Equipo] ◄───┐
       │                                                            │
       ├─► Movimientos de Ajedrez (Validación autoritativa FEN)     │ Bucle
       ├─► Drenaje de Reloj Acumulativo según turnos activos        │ de
       ├─► Telemetría Visual (Heatmap, Shield, Flame, Termómetro)   │ Juego
       ├─► Chat y Voz aislados por equipo                           │
       │                                                            │
       ▼                                                            │
[Resolución de Tableros Individuales (Mate / Tablas / Abandono)] ───┘
       │
       ▼ (Cuando todos los tableros finalizan)
[Evaluación de Puntuación Global & Fin de Partida / Ronda]
       │
       ├─► Actualización de ELO Individual (K-factor 32)
       ├─► Actualización de Estadísticas Estacionales de Usuario
       └─► Actualización de Puntos de Temporada de Clubes (3/1/0)
```

---

### 3.2 Modos de Juego: Estándar vs. Encuentro (Match de Clubes)
El servidor (`server/gameManager.js`) opera bajo dos motores de reglas:

#### A. Modo Estándar (`standard`)
* Partida única en paralelo sobre N tableros (1 a 4 tableros según `teamSize`).
* Emparejamiento simétrico: La cantidad de jugadores blancos debe ser exactamente igual a la de negros.
* Finalización: La partida concluye en cuanto todos los tableros han alcanzado una condición de fin o cuando el reloj de un equipo llega a 0.
* Puntuación del match: Suma directa de los puntos de tablero. Gana el equipo con mayor puntuación acumulada.

#### B. Modo Encuentro (`encuentro`)
Diseñado para competiciones oficiales y torneos interclubes.
1. **Requisitos de Entrada:** Mínimo de jugadores por equipo igual a `boardsPerRound` (2 a 8 jugadores).
2. **Fase de Votación de Capitán:** Los jugadores de cada bando votan a su capitán en el socket `vote_captain`. Se requiere mayoría simple de los jugadores presentes (`Math.floor(playersInTeam / 2) + 1`). En caso de empate técnico con el 100% de votos emitidos, se selecciona un candidato al azar entre los más votados.
3. **Fase de Alineación:** El capitán envía la lista de titulares (`lineup`) asignando un jugador a cada tablero y enviando los restantes al banquillo (`bench`).
4. **Rondas Competitivas:** Se disputan de 1 a 8 rondas (`totalRounds`).
   - Cada tablero ganado otorga **3 Puntos de Ronda** al equipo ganador.
   - Cada tablero empatado otorga **1 Punto de Ronda** a cada equipo.
   - El equipo que acumula más Puntos de Ronda al final de la ronda recibe **3 Puntos de Match**. En caso de empate en puntos de ronda, cada equipo recibe **1 Punto de Match**.
5. **Alternancia de Colores:** En rondas impares (1, 3, 5...), el equipo "Blanco" juega con piezas blancas. En rondas pares (2, 4, 6...), el equipo "Blanco" juega con piezas negras en todos sus tableros.
6. **Descanso y Sustituciones:**
   - Al finalizar cada ronda, la sala entra en estado `break` y corre el temporizador de descanso (`restTime`).
   - El capitán puede realizar cambios tácticos entre titulares y suplentes restando de su bolsa de `substitutionsLeft`.
   - Si ambos capitanes confirman su alineación antes de que expire el tiempo de descanso, la siguiente ronda se inicia de inmediato sin esperar al temporizador.
7. **Desempates Automáticos (`tiebreaker`):**
   - Si finalizan todas las rondas pactadas y existe empate en Puntos de Match, si `desempates !== false`, se activa el nivel de desempate 1 (`tiebreakerLevel = 1`).
   - El tiempo de la ronda de desempate se reduce a la mitad respecto al tiempo original:  
     $$\text{Tiempo Desempate} = \max\left(600\text{ s}, \left\lfloor \frac{\text{Tiempo Base}}{2^{\text{Nivel}}} \right\rfloor \right)$$
   - Se otorgan sustituciones adicionales configuradas (`tiebreakSubstitutions`, por defecto 2).
   - De persistir el empate tras la ronda extra, se avanza sucesivamente a `tiebreakerLevel = 2` hasta romper la paridad.

---

### 3.3 Asignación de Bandos y Ordenamiento por ELO
* **Ordenamiento Autoritativo en Matchmaking:** Antes de comenzar el conteo de 5 segundos, el servidor ordena a los jugadores de cada bando en orden descendente de su ELO registrado en Supabase:
  - Tablero 1: Mayor ELO Blanco vs. Mayor ELO Negro.
  - Tablero 2: Segundo mayor ELO Blanco vs. Segundo mayor ELO Negro.
  - Tablero N: Jugadores con menor ELO de la escuadra.
* **Memoria de Color:** El servidor mantiene un registro en memoria (`lastPlayedColor`) de los colores jugados previamente por cada usuario para favorecer la alternancia en partidas consecutivas.

---

### 3.4 El Reloj Compartido de Equipo y Tasa de Consumo Simultáneo
* **Estructura del Reloj:** Cada sala posee `room.timer = { white: S, black: S }` donde $S$ es el tiempo configurado en segundos.
* **Algoritmo de Drenaje:** El temporizador autoritativo corre en `handleTimeRunOut` a través de un `setInterval` de 1000 ms:
  $$\Delta t = \frac{\text{Date.now()} - \text{lastMoveTime}}{1000}$$
  Para cada tablero activo:
  - Si `board.game.turn() === 'w'`, se incrementa `whiteToMoveCount` en 1 y se acumula `board.whiteTimeSpent += \Delta t`.
  - Si `board.game.turn() === 'b'`, se incrementa `blackToMoveCount` en 1 y se acumula `board.blackTimeSpent += \Delta t`.
* **Fórmula de Descuento de Reloj de Equipo:**
  $$\text{timer.white} \leftarrow \text{timer.white} - (\Delta t \times \text{whiteToMoveCount})$$
  $$\text{timer.black} \leftarrow \text{timer.black} - (\Delta t \times \text{blackToMoveCount})$$
  > **Ejemplo:** En un 3 vs 3, si en los 3 tableros es el turno de las Blancas, el reloj de Blancas consume **3 segundos de tiempo por cada segundo real de reloj transcurrido**.
* **Condición de Caída de Bandera (Timeout):**
  - Si `room.timer.white <= 0`, el servidor fuerza el fin inmediato de todos los tableros activos mediante `forceEndAllActiveBoards(roomId, 'white', 'timeout')`. Las Negras ganan automáticamente todos los tableros pendientes con 3 puntos cada uno.
  - Si `room.timer.black <= 0`, ocurre la misma penalización en favor de las Blancas.

---

### 3.5 Flujo de Turnos y Validación de Jugadas (Chess.js)
1. El cliente envía el movimiento vía Socket.io: `makeMove({ roomId, move: { from, to, promotion: 'q' } })`.
2. El servidor valida:
   - Que la sala y el tablero del socket emisor estén activos.
   - Que el color de la pieza corresponda al bando del jugador emisor (`board.game.turn() === 'w'` para jugador blanco).
3. `board.game.move(move)` ejecuta la validación física reglamentaria de Ajedrez (FIDE). Si es ilegal, el movimiento se descarta silenciosamente.
4. Si la jugada es legal:
   - Se actualiza el `Heatmap` táctico de la posición.
   - Se ejecuta el análisis de balance de material en `analyzePosition`.
   - Se retransmite el estado FEN actualizado a ambos jugadores (`gameState`).
   - Se envían actualizaciones a los visualizadores de los compañeros (`visualizerUpdate`) y espectadores (`spectatorUpdate`).

---

### 3.6 Condiciones de Victoria, Derrota, Tablas y Abandono
Al ejecutar cada movimiento, el servidor evalúa las condiciones de fin de tablero mediante `board.game`:

| Condición | Método Chess.js / Evento | Ganador | Puntos Ganador | Puntos Perdedor | Razón Registrada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Jaque Mate** | `isCheckmate()` | Quien dio mate | 3 pts | 0 pts | `checkmate` |
| **Tiempo Agotado** | `timer <= 0` | Bando rival | 3 pts (por tablero) | 0 pts | `timeout` |
| **Rendición** | Evento `resign` | Rival directo | 3 pts | 0 pts | `resignation` |
| **Rey Ahogado** | `isStalemate()` | Nadie (Tablas) | 1 pto | 1 pto | `draw` |
| **Triple Repetición**| `isThreefoldRepetition()`| Nadie (Tablas) | 1 pto | 1 pto | `draw` |
| **Material Insuficiente**| `isDraw()` | Nadie (Tablas) | 1 pto | 1 pto | `draw` |
| **Acuerdo Mutuo** | `offerDraw` + `acceptDraw` | Nadie (Tablas) | 1 pto | 1 pto | `agreement` |

---

### 3.7 Sistema de Telemetría Abstracta (Visualizadores Tácticos)
El servidor calcula métricas analíticas sobre cada tablero activo para generar los 4 visualizadores abstractos:

#### 1. Heatmap (Mapa de Presión Táctica):
* Malla de $8 \times 8$ casillas calculada en `server/heatmap.js`.
* Calcula el número de ataques de piezas blancas y negras sobre cada coordenada:
  - Peones: Ataques diagonales según dirección de avance.
  - Caballos y Reyes: Casillas de salto geométrico válidas.
  - Piezas deslizantes (Torres, Alfiles, Damas): Rayos de ataque ortogonales y diagonales continuos. Admite efecto Rayos X (baterías sobre piezas amigas en la misma línea).
* Representación en cliente (`Visualizer/Heatmap.jsx`):
  - Casillas bajo control exclusivo blanco: Color Azul (intensidad según número de atacantes).
  - Casillas bajo control exclusivo negro: Color Rojo.
  - Casillas en disputa igualada ($W = B$): Borde blanco y fondo Amarillo/Dorado.
  - Casillas en disputa con ventaja blanca: Borde blanco y gradiente Púrpura hacia Azul.
  - Casillas en disputa con ventaja negra: Borde blanco y gradiente Púrpura hacia Rojo.

#### 2. Thermometer (Termómetro de Balance Material):
* Valores de pieza FIDE: Peón = 1, Caballo = 3, Alfil = 3, Torre = 5, Dama = 9, Rey = 0.
* Puntuación neta calculada en `analyzePosition`:
  $$\text{Score} = \sum \text{Piezas Blancas} - \sum \text{Piezas Negras}$$
* Rango acotado: $[-10, +10]$.
* En cliente (`Visualizer/Thermometer.jsx`): Barra vertical con orientación invertida para que el color del equipo propio siempre se ubique en la base de la barra.

#### 3. King Shield (Escudo de Seguridad del Rey):
* Determinado en `server/heatmap.js` sobre la posición de cada monarca:
  - `safe`: El rey no está bajo ataque directo.
  - `warning`: Casillas perimetrales del rey bajo control enemigo.
  - `danger`: Rey en jaque directo.
* Iconografía en cliente (`Visualizer/Shield.jsx`):
  - Escudo verde con check: Seguro y enrocado.
  - Escudo verde con contorno rojo: Seguro pero sin enrocar (`isCastled === false`).
  - Escudo naranja: Advertencia de presión.
  - Escudo rojo pulsante rápido: Jaque / peligro inminente.

#### 4. Burn Flame (Llama de Consumo de Tiempo):
* Se calcula el tiempo promedio invertido por jugador en el equipo:
  $$\overline{T}_{\text{equipo}} = \frac{\sum_{i=1}^{N} \text{TimeSpent}_i}{N}$$
* Si `board.timeSpent > \overline{T}_{\text{equipo}}`, el nivel de quemado se asigna a `2` (rojo pulsante en `Visualizer/Flame.jsx`).
* Si el jugador gasta igual o menos del promedio, nivel `0` (verde normal).

---

### 3.8 Matchmaking y ELO Dinámico
* **Motor ELO:** Librería `elo-rank` con factor K fijo de 32:
  ```javascript
  const EloRank = require('elo-rank');
  const elo = new EloRank(32);
  ```
* **Ventana de Tolerancia ELO Adaptativa:**
  A medida que un jugador o party espera en la cola, el rango de ELO aceptable para emparejar se amplía linealmente segundo a segundo:
  $$\text{Tolerancia ELO}(\text{WaitTime}) = 100 + (\lfloor \text{WaitTime} \rfloor \times 10)$$
  - Al segundo 0: Tolerancia de $\pm 100$ puntos ELO.
  - Al segundo 20: Tolerancia de $\pm 300$ puntos ELO.
* **Balanceo de Color:** Si la espera supera los 10 segundos, las preferencias estrictas de bando (Blancas/Negras) se relajan para priorizar el emparejamiento.

---

### 3.9 Sistema de Partys y Lazy Party Creation
* **Capacidad Máxima de Party:** 4 integrantes.
* **Lazy Creation (Creación Perezosa de Party):**
  - Un usuario sin grupo no necesita crear previamente una party vacía para invitar a un amigo.
  - Al pulsar "Invitar" desde el Panel Social, se emite una propuesta `proposeParty`.
  - Cuando el destinatario pulsa "Aceptar Propuesta" desde el chat, el servidor instancia atómicamente una nueva Party UUID con el emisor como Líder (`leaderId`) y ambos como miembros iniciales.
* **Persistencia por Desconexión:** Si un miembro o líder se desconecta brevemente, al reconectarse su `socketId` se remapea automáticamente al registro de la party sin expulsarlo del grupo.

---

### 3.10 Mecánicas de Clubes vs. Alianzas, Puntos Estacionales y Periodo de Fichajes
* **Diferenciación Estructural: Alianzas vs. Clubes:**
  - **Alianzas (Nivel Gratuito):** Agrupaciones sociales abiertas y libres de jugadores. No tienen coste de suscripción, admiten un número indefinido de miembros y están orientadas a la coordinación en partidas y torneos/ligas casuales.
  - **Clubes Oficiales (Nivel Profesional - 10 €/mes):** Entidades deportivas oficiales con personería competitiva en el sistema de ligas. Requieren suscripción Profesional tanto para su fundación como para la membresía.
* **Límite Estricto de 16 Jugadores:** Cada Club admite un máximo inquebrantable de **16 jugadores** en su plantilla oficial (actualizando el límite de prueba previo de 30).
* **Regla de Exclusividad:** Cada jugador puede pertenecer únicamente a **un (1) solo club** al mismo tiempo.
* **Periodo de Fichajes (*Transfer Window*):**
  - Los jugadores solo pueden cambiar de club durante la ventana oficial de traspasos habilitada **entre temporada y temporada** (coincidiendo con el cierre y reset mensual).
  - Durante el transcurso de la temporada competitiva, la plantilla queda blindada y bloqueada para salvaguardar la legitimidad de las clasificaciones.
* **Regla de Participación de Club:**
  - Para disputar partidas rankeadas como Club, el jugador individual debe pertenecer a dicho Club.
  - En party, **el 100% de los integrantes de la escuadra deben pertenecer estrictamente al mismo Club**.
* **Puntuación de Club:**
  - Victoria de match de Club: **+3 Puntos Estacionales**.
  - Empate de match de Club: **+1 Punto Estacional**.
  - Derrota de match de Club: **0 Puntos**.
* **Contribución Individual:**
  - En la tabla `club_members`, la columna `season_points_contribution` registra los puntos generados por cada miembro individual para su club (sumando los puntos de sus propios tableros ganados o empatados).

---

### 3.11 Sistema de Ligas (Divisiones 1 a 6 + División 0 Pool)
* **Estructura Piramidal:** 6 Divisiones activas numeradas del 1 al 6, más la División 0 que actúa como Pool o Reserva de expansión de nuevos clubes.
* **Capacidad de División:** Máximo de 20 clubes por División (`DIVISION_CAPACITY = 20`).
* **Temporadas Mensuales:** Cada temporada se identifica por el código `YYYY-MM` basado en la hora oficial de España peninsular (`Europe/Madrid`).
* **Fecha de Corte:** Día 1 de cada mes a las 00:00 horas España (`0 0 1 * *`).

---

### 3.12 Transición de Temporada y Algoritmo de Ascensos/Descensos (Waterfall)
El gestor `server/leagueManager.js` ejecuta un algoritmo en cascada (Waterfall) de arriba hacia abajo (División 1 a 6):

1. **Constantes del Algoritmo:**
   - Plazas de Ascenso Fijas: `PROMOTION_COUNT = 3`.
   - Capacidad Máxima: `DIVISION_CAPACITY = 20`.
2. **Cálculo de Flujo Neto Virtual por División ($D$):**
   - Clubes iniciales en la división: $\text{Start}_D$.
   - Promovidos que salieron hacia la división superior ($D-1$): $\text{PromotedOut}_D$.
   - Relegados que cayeron desde la división superior ($D-1$): $\text{RelegatedIn}_D$.
   - Promovidos que ascienden desde la división inferior ($D+1$): $\text{PromotedIn}_D = \min(\text{Clubs}_{D+1}, 3)$.
   - Población Virtual resultante:
     $$\text{VirtualCount}_D = \text{Start}_D - \text{PromotedOut}_D + \text{RelegatedIn}_D + \text{PromotedIn}_D$$
3. **Cálculo de Descenso por Exceso:**
   $$\text{Excess}_D = \text{VirtualCount}_D - 20$$
   - Si $\text{Excess}_D > 0$, los últimos $\text{Excess}_D$ clubes de la tabla descienden a la división $D+1$ (o a la División 0 si descienden desde la División 6).
4. **Traspaso a la Nueva Temporada:** Todos los clubes reubicados y los que mantienen la categoría son inicializados en la tabla `club_seasonal_stats` para el nuevo mes con estadísticas en 0.

---

### 3.13 Sistema de Premiación y Vitrina de Trofeos Oficiales
* **Acceso Exclusivo a Trofeos y Medallas:** Conforme al modelo de suscripción, los trofeos, medallas y condecoraciones oficiales solo pueden ser obtenidos por usuarios con suscripción **Básica (5 €)** o **Profesional (10 €)** en torneos y competiciones oficiales organizadas por Royal Team Chess.
* **Trofeo de Primera División:**
  - Al cerrarse la temporada, el club clasificado en el Puesto 1 de la División 1 recibe formalmente el trofeo estacional:
  - **Nombre Oficial:** `'Campeón de Primera División'`.
  - **Registro:** Se inserta en la tabla `club_trophies` asociado a la `season_id`.
  - **Visualización:** Aparece en la vitrina pública del club (`TrophyList.jsx`) con contador acumulativo (`x2`, `x3`...) en caso de múltiples campeonatos.

---

### 3.14 Circuito Profesional y Selecciones Nacionales (Copa de Países)
* **Circuito Profesional de Clubes:**
  - Estructura análoga al fútbol profesional: Ligas Nacionales por país, Competiciones Continentales e Internacionales (Mundial de Clubes RTC).
  - Exclusivo para clubes cuyos integrantes cuenten con suscripción Profesional (10 €/mes).
* **Selecciones Nacionales Oficiales:**
  - Royal Team Chess crea y mantiene una Selección Nacional oficial para cada país reconocido.
  - **Figura del Seleccionador Nacional:** Cada país cuenta con un Seleccionador oficial que debe ser de la misma nacionalidad que la selección que dirige.
  - **Designación de Seleccionador:** Al inicio, los aspirantes postulan formalmente mediante correo electrónico a `contact@royalteamchess.com`, acreditando su idoneidad.
  - **Potestad de Convocatoria:** El seleccionador tiene la facultad exclusiva de convocar a los jugadores más sobresalientes de su país con suscripción Profesional para representar a su nación en las Copas y Torneos Internacionales de Selecciones.

---

# PILAR 4: DISEÑO VISUAL, INTERFAZ, ANIMACIONES Y RESPONSIVE

### 4.1 Identidad Estética y Paleta de Colores
* **Tema Visual:** Dark Mode Táctico Futurista ("Glassmorphism Deportivo").
* **Colores Base (Tailwind CSS):**
  - Fondo Global: `bg-slate-900` (#0f172a) con paneles `bg-slate-800/50` y bordes `border-slate-700/50`.
  - Acento Primario (Acción / Blancas): Azul Real (`from-blue-400 to-purple-500`, `bg-blue-600`).
  - Acento Secundario (Negras / Alerta): Rojo Táctico (`text-red-400`, `bg-red-600`).
  - Acento de Gloria / Ligas: Oro y Ámbar (`text-yellow-400`, `from-yellow-400 to-amber-600`).
  - Acento de Clubes: Verde Esmeralda (`bg-emerald-600`, `text-emerald-400`).
  - Acento de Party / Social: Índigo / Púrpura (`bg-indigo-600`, `border-indigo-500`).

### 4.2 Tablero de Ajedrez y Representación Gráfica
* **Librería de Render:** `react-chessboard` v4.3 / v5.8.
* **Estilo de Tablero:** Casillas oscuras pizarra y claras marfil suave, con sombras de elevación `boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'`.
* **Feedback de Jaque:** Resaltado directo en rojo con degradado radial en la casilla exacta del Rey amenazado.

### 4.3 Arquitectura Responsive (PC Escritorio vs. Dispositivos Móviles)
* **Escritorio (> 1024px):**
  - Menú Principal con grid de 3 columnas de tarjetas de 400px de altura más panel social permanente en lateral derecho.
  - Game Room: Distribución vertical optimizada; tablero principal en mitad superior (hasta 50vh) y carrusel horizontal con scroll de visualizadores de compañeros en mitad inferior (45vh). Chat colapsable en lateral.
* **Móviles y Tablets (< 1024px):**
  - Grid de menús colapsa a 1 columna apilada.
  - Tablero de ajedrez se adapta al 100% del ancho con relación de aspecto cuadrada (1:1).
  - Visualizadores secundarios colapsables mediante acordeón para maximizar el área táctil del tablero.
  - Barra superior de relojes compacta con visualización simplificada.

### 4.4 Estados de Conexión, Indicadores en Vivo y Badges
* **Presencia en Tiempo Real:** Badges circulares verde (`online`) y gris (`offline`) sincronizados vía eventos Socket.io `userStatusUpdate`.
* **Badge de Mensajes No Leídos:** Círculo rojo flotante con animación `animate-pulse` sobre el icono de Mensajes en el menú principal cuando `unreadCount > 0`.
* **Indicadores de Turno:** Borde resplandeciente e iluminación de reloj cuando es el turno de juego del bando.

### 4.5 Telemetría Visual Detallada
* Transiciones suaves mediante clases de animación personalizadas: `animate-fade-in`, `animate-bounce-in`, `animate-pulse-fast`.
* Desglose numérico claro sobre celdas en conflicto con tipografía de alto contraste (números blancos con sombra negra para blancas, números negros con halo blanco para negras).

---

# PILAR 5: GESTIÓN DE DATOS, CUENTAS Y BASE DE DATOS

### 5.1 Arquitectura de Backend e Infraestructura Supabase
* **Plataforma:** PostgreSQL gestionado en la nube con Supabase.
* **Autenticación:** `Supabase Auth` (GoTrue) integrado con tabla pública de perfiles (`profiles`).
* **Acceso Backend:** Cliente con `SUPABASE_SERVICE_KEY` para operaciones administrativas y sanitización de registros (bypasseando RLS en sincronizaciones críticas).
* **Acceso Frontend:** Cliente anónimo con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` controlado estrictamente por políticas RLS.

---

### 5.2 Esquema Completo de Tablas y Relaciones

#### 1. Tabla `profiles` (Perfiles Públicos de Usuario)
| Columna | Tipo de Dato | Modificadores | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK, FK -> `auth.users(id)` ON DELETE CASCADE | Identificador único del usuario |
| `username` | `TEXT` | UNIQUE, NOT NULL | Nombre público del jugador |
| `avatar_url` | `TEXT` | NULLABLE | URL de la imagen de perfil |
| `tier` | `TEXT` | DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')) | Nivel de suscripción del usuario |
| `elo` | `INTEGER` | DEFAULT 300 | Puntuación ELO general |
| `points` | `INTEGER` | DEFAULT 0 | Puntos históricos acumulados |
| `wins` | `INTEGER` | DEFAULT 0 | Victorias individuales históricas |
| `losses` | `INTEGER` | DEFAULT 0 | Derrotas individuales históricas |
| `draws` | `INTEGER` | DEFAULT 0 | Tablas individuales históricas |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Fecha de registro |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | Última modificación |

#### 2. Tabla `clubs` (Clubes / Equipos Oficiales)
| Columna | Tipo de Dato | Modificadores | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | Identificador único del club |
| `name` | `TEXT` | UNIQUE, NOT NULL | Nombre oficial del club |
| `description`| `TEXT` | NULLABLE | Lema o descripción |
| `logo_url` | `TEXT` | NULLABLE | URL del escudo/emblema |
| `owner_id` | `UUID` | FK -> `profiles(id)` ON DELETE SET NULL | Fundador y capitán propietario |
| `division` | `INTEGER` | DEFAULT 1 | División actual en las ligas (0 a 6) |
| `trophies` | `JSONB` | DEFAULT '[]'::jsonb | Historial serializado de trofeos |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Fecha de fundación |

#### 3. Tabla `club_members` (Membresías de Club)
| Columna | Tipo de Dato | Modificadores | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` / `UUID` | PK | Identificador de membresía |
| `club_id` | `UUID` | FK -> `clubs(id)` ON DELETE CASCADE | Club al que pertenece |
| `user_id` | `UUID` | FK -> `profiles(id)` ON DELETE CASCADE | Usuario integrante |
| `role` | `TEXT` | DEFAULT 'member' | Rol: 'owner', 'captain', 'member' |
| `season_points_contribution` | `INTEGER` | DEFAULT 0 | Puntos generados para el club |
| `joined_at` | `TIMESTAMPTZ` | DEFAULT now() | Fecha de incorporación |

#### 4. Tabla `club_seasonal_stats` (Estadísticas Estacionales de Club)
| Columna | Tipo de Dato | Modificadores | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | Identificador del registro estacional |
| `club_id` | `UUID` | FK -> `clubs(id)` ON DELETE CASCADE | Club evaluado |
| `season_id` | `TEXT` | NOT NULL (Formato 'YYYY-MM') | Temporada mensual evaluada |
| `division` | `INTEGER` | DEFAULT 1 | División en la que compitió este mes |
| `matches_played` | `INTEGER` | DEFAULT 0 | Partidas/Encuentros jugados |
| `matches_won` | `INTEGER` | DEFAULT 0 | Partidas ganadas |
| `matches_lost` | `INTEGER` | DEFAULT 0 | Partidas perdidas |
| `matches_drawn` | `INTEGER` | DEFAULT 0 | Partidas empatadas |
| `season_points` | `INTEGER` | DEFAULT 0 | Puntos de liga sumados (3/1/0) |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Fecha de creación del registro |
*(Restricción UNIQUE combinada en `club_id, season_id`)*.

#### 5. Tabla `user_stats` (Estadísticas Estacionales de Jugador)
| Columna | Tipo de Dato | Modificadores | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | PK, DEFAULT uuid_generate_v4() | Identificador |
| `user_id` | `UUID` | FK -> `profiles(id)` ON DELETE CASCADE | Jugador evaluado |
| `season_id` | `TEXT` | NOT NULL (Formato 'YYYY-MM') | Temporada mensual evaluada |
| `confrontations_played` | `INTEGER`| DEFAULT 0 | Enfrentamientos en tableros jugados |
| `wins` | `INTEGER` | DEFAULT 0 | Victorias |
| `losses` | `INTEGER` | DEFAULT 0 | Derrotas |
| `draws` | `INTEGER` | DEFAULT 0 | Tablas |
| `season_points` | `INTEGER` | DEFAULT 0 | Puntos individuales ganados |
| `pieces_eaten` | `INTEGER` | DEFAULT 0 | Piezas capturadas |
| `wins_checkmate` | `INTEGER` | DEFAULT 0 | Victorias por Jaque Mate |
| `wins_time` | `INTEGER` | DEFAULT 0 | Victorias por Caída de Tiempo |
| `wins_resignation`| `INTEGER`| DEFAULT 0 | Victorias por Rendición rival |
| `losses_checkmate`| `INTEGER`| DEFAULT 0 | Derrotas por Jaque Mate |
| `losses_time` | `INTEGER` | DEFAULT 0 | Derrotas por Tiempo |
| `losses_resignation`| `INTEGER`| DEFAULT 0 | Derrotas por Rendición propia |

#### 6. Tabla `club_messages` (Chat de Club)
| Columna | Tipo de Dato | Modificadores | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | PK, IDENTITY | Identificador de mensaje |
| `club_id` | `UUID` | FK -> `clubs(id)` ON DELETE CASCADE | Club receptor |
| `sender_id` | `UUID` | FK -> `profiles(id)` ON DELETE SET NULL | Autor del mensaje |
| `content` | `TEXT` | NOT NULL | Texto del mensaje |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Marca temporal de envío |

#### 7. Tabla `messages` (Mensajes Directos y Notificaciones de Acción)
| Columna | Tipo de Dato | Modificadores | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` / `UUID` | PK | Identificador del mensaje |
| `sender_id` | `UUID` | FK -> `profiles(id)` | Emisor |
| `receiver_id` | `UUID` | FK -> `profiles(id)` | Destinatario |
| `content` | `TEXT` | NOT NULL | Contenido o payload (`PARTY_INVITE:::id`) |
| `type` | `TEXT` | NULLABLE | Tipo ('club_invite', 'club_join_request', 'friend_request') |
| `metadata` | `JSONB` | DEFAULT '{}'::jsonb | Estado interactivo ('pending', 'accepted', 'declined') |
| `is_read` | `BOOLEAN` | DEFAULT false | Indicador de lectura |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | Fecha de envío |

#### 8. Tablas de Solicitudes e Invitaciones
* `club_join_requests`: `(id, club_id, user_id, message, status, created_at)`.
* `club_invites`: `(id, club_id, user_id, sender_id, status, created_at)`.
* `friends`: `(user_id, friend_id, created_at)`.

#### 9. Tablas de Trofeos
* `trophies`: `(id, name, description, image_url, type ['CLUB', 'PLAYER'], created_at)`.
* `club_trophies`: `(id, club_id, trophy_id, season_id, metadata, awarded_at)`.
* `player_trophies`: `(id, user_id, trophy_id, season_id, metadata, awarded_at)`.

#### 10. Tablas de Alianzas (Nivel Gratuito)
* `alliances`: `(id UUID, name TEXT UNIQUE, description TEXT, logo_url TEXT, leader_id UUID, created_at TIMESTAMPTZ)`.
* `alliance_members`: `(id BIGINT, alliance_id UUID, user_id UUID, joined_at TIMESTAMPTZ)`. *(Sin límite de miembros por diseño)*.

#### 11. Tabla de Suscripciones (`subscriptions`)
* `subscriptions`: `(id UUID, user_id UUID REFERENCES profiles(id), plan TEXT CHECK (plan IN ('basic', 'pro')), status TEXT ['active', 'canceled', 'past_due'], stripe_customer_id TEXT, stripe_subscription_id TEXT, current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ)`.

#### 12. Tablas de Selecciones Nacionales (Copa de Países)
* `national_teams`: `(id UUID, country_code TEXT UNIQUE, country_name TEXT, flag_url TEXT, head_coach_id UUID REFERENCES profiles(id), created_at TIMESTAMPTZ)`.
* `national_team_roster`: `(id BIGINT, national_team_id UUID REFERENCES national_teams(id), player_id UUID REFERENCES profiles(id), selected_at TIMESTAMPTZ, is_active BOOLEAN)`.

---

### 5.3 Funciones Almacenadas (RPC) y Triggers Automatizados

#### Trigger de Límite Estricto de 16 Miembros por Club:
Actualizado conforme a las reglas del modelo Profesional:
```sql
CREATE OR REPLACE FUNCTION check_club_member_limit()
RETURNS trigger AS $$
DECLARE
    member_count int;
BEGIN
    SELECT count(*) INTO member_count
    FROM club_members
    WHERE club_id = new.club_id;

    -- Límite estricto oficial de 16 jugadores por club en el circuito profesional
    IF member_count >= 16 THEN
        RAISE EXCEPTION 'Club limit reached: A club can have a maximum of 16 members.';
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_club_member_limit
BEFORE INSERT ON club_members
FOR EACH ROW
EXECUTE FUNCTION check_club_member_limit();
```

#### Procedimiento de Eliminación de Amistad:
* `remove_friend(user_a, user_b)`: Elimina bidireccionalmente la relación en la tabla `friends`.

---

### 5.4 Políticas de Seguridad RLS (Row Level Security)
* `club_messages`:
  - **Lectura:** Exclusiva para usuarios que pertenecen a `club_members` para ese `club_id`.
  - **Inserción:** Exclusiva para miembros del club con `auth.uid() = sender_id`.
* `club_seasonal_stats`:
  - Política `"Public Read Access"` con acceso `SELECT` para roles `anon`, `authenticated` y `service_role`.
* Publicación Realtime:
  - `ALTER PUBLICATION supabase_realtime ADD TABLE club_messages;`
  - `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`

---

### 5.5 Ciclo de Retención de Datos (Data Retention Cleanup)
Implementado en `server/cronJobs.js` y ejecutado el día 1 de cada mes:
* Se calcula la fecha de corte retrospectiva a **6 meses** (`cutoffSeasonId`).
* Se ejecuta:
  - `db.deleteOldClubStats(cutoffSeasonId)`
  - `db.deleteOldUserStats(cutoffSeasonId)`
* Mantiene la base de datos optimizada eliminando estadísticas de temporadas con más de medio año de antigüedad.

---

# PILAR 6: ARQUITECTURA DE MONETIZACIÓN

### 6.1 Matriz Oficial de Niveles de Suscripción y Monetización
El modelo de negocio de Royal Team Chess se estructura en tres niveles comerciales transparentes, orientados a garantizar accesibilidad global, sostenibilidad mediante publicidad pasiva e ingresos recurrentes para sostener la infraestructura multijugador en tiempo real:

| Característica / Beneficio | Nivel 1: GRATIS (Free-to-Play) | Nivel 2: BÁSICA (5,00 € / mes) | Nivel 3: PROFESIONAL (10,00 € / mes) |
| :--- | :---: | :---: | :---: |
| **Precio Oficial** | **0,00 €** | **5,00 € / mes** | **10,00 € / mes** |
| **Partidas Casuales (1v1 a 4v4)** | Ilimitadas | Ilimitadas | Ilimitadas |
| **Creación de Salas y Servidores Casuales**| Sí | Sí | Sí |
| **Creación de Torneos y Ligas Casuales** | Sí | Sí | Sí |
| **Chat de Voz WebRTC y Telemetría Abstracta** | Sí | Sí | Sí |
| **Pertenencia a Alianzas Libres** | Sí (miembros ilimitados) | Sí | Sí |
| **Presencia de Publicidad (Ads Pasivos)**| **Sí (Con Anuncios)** | **No (100% Ad-Free)** | **No (100% Ad-Free)** |
| **Torneos Oficiales de Royal Team Chess** | No | **Sí** | **Sí** |
| **Obtención de Trofeos y Medallas Oficiales**| No | **Sí** | **Sí** |
| **Fundar y Gestionar Clubes Oficiales** | No | No | **Sí (Propietario)** |
| **Membresía en Clubes Oficiales** | No | No | **Sí (Máx. 16 jugadores)** |
| **Ventana de Fichajes Oficial entre Temporadas**| No | No | **Sí** |
| **Acceso al Circuito Profesional (Ligas/Copas)**| No | No | **Sí** |
| **Elegibilidad para Selecciones Nacionales** | No | No | **Sí** |
| **Postulación para Seleccionador Nacional** | No | No | **Sí (Vía email)** |

---

### 6.2 Detalle de Niveles de Suscripción

#### Nivel 1: Gratuito (Casual y Alianzas con Publicidad)
* **Objetivo:** Adquisición masiva de jugadores y democratización del ajedrez en equipo.
* **Derechos y Capacidades:**
  - Jugar partidas casuales sin límite de tiempo ni de enfrentamientos.
  - Crear servidores privados o públicos para partidas con amigos.
  - Crear y disputar torneos y ligas casuales entre comunidades.
  - Fundar o unirse a **Alianzas**: Colectivos abiertos que no tienen restricción en el número de miembros pero que no participan en el circuito profesional.
* **Monetización:** Financiado mediante publicidad pasiva no intrusiva (banners estáticos en menús y descansos de rondas, sin interrupciones en medio de partidas activas).

#### Nivel 2: Suscripción Básica (5,00 € / mes - Competitivo Oficial y Sin Publicidad)
* **Objetivo:** Jugadores competitivos que buscan condecoraciones oficiales y una experiencia limpia sin anuncios.
* **Derechos y Capacidades:**
  - **Eliminación Total de Publicidad (Ad-Free):** Interfaz despejada y fluida en todas las pantallas.
  - **Torneos Oficiales RTC:** Acceso irrestricto a los torneos oficiales organizados, certificados y arbitrados periódicamente por Royal Team Chess.
  - **Condecoraciones Exclusivas:** Acceso a ganar y lucir Trofeos y Medallas oficiales en la vitrina pública del perfil de jugador.

#### Nivel 3: Suscripción Profesional (10,00 € / mes - Circuito Pro, Clubes y Selecciones)
* **Objetivo:** La cúspide deportiva del ecosistema, pensada para equipos y aspirantes a la élite internacional.
* **Derechos y Capacidades:**
  - Todo lo incluido en las suscripciones Gratuita y Básica.
  - **Fundación y Membresía en Clubes:** Facultad de crear un Club oficial (previo pago de suscripción) o de incorporarse como jugador federado. Cada Club admite un máximo estricto de **16 jugadores** y ningún jugador puede militar en más de un club simultáneo.
  - **Periodo Oficial de Fichajes:** Participación en la ventana de traspasos habilitada exclusivamente entre el cierre de una temporada y el inicio de la siguiente.
  - **Circuito Profesional de Clubes:** Competición en las Ligas Nacionales por países, Copas Continentales y el Campeonato Mundial de Clubes RTC (estructura idéntica al fútbol profesional).
  - **Selecciones Nacionales y Copa de Países:** Elegibilidad para ser convocado por la Selección Nacional de su país de origen. Opción de postular para el cargo de **Seleccionador Nacional Oficial** (del mismo país) mediante solicitud remitida a la dirección técnica (`contact@royalteamchess.com`).

---

### 6.3 Integración Técnica de Pasarela de Pagos (Stripe Billing)
* **Proveedor Seleccionado:** **Stripe** (Stripe Checkout y Stripe Customer Portal).
* **Flujo de Pago y Activación:**
  1. El cliente inicia suscripción en la interfaz hacia el endpoint backend `POST /api/billing/create-checkout-session` indicando el `priceId` de la tarifa (Básica 5 € o Pro 10 €).
  2. Stripe procesa el cobro con soporte de Tarjetas de Crédito/Débito, Apple Pay, Google Pay y domiciliación SEPA europea.
  3. Stripe Webhook (`POST /api/webhooks/stripe`) recibe los eventos `checkout.session.completed`, `customer.subscription.updated` y `customer.subscription.deleted`.
  4. El servidor actualiza autoritativamente la columna `profiles.tier` a `'basic'` o `'pro'`, o la degrada a `'free'` en caso de cancelación o impago.

---

### 6.4 Modelo de Publicidad Pasiva
* Ubicación de espacios publicitarios limitada a:
  - Marco lateral de la Landing Page y Menú Principal.
  - Pantalla de espera del Explorador de Servidores.
  - Pantalla de estadísticas post-partida.
* **Prohibición Estricta:** Ningún anuncio se mostrará dentro del área activa de juego durante la disputa de una partida (`GameRoom`) para salvaguardar la concentración y el tiempo de juego de los participantes.

---

### 6.5 Marco Regulatorio y Textos Legales Obligatorios
Para operar formalmente bajo el ordenamiento jurídico de la Unión Europea y el Reino de España, la plataforma incorpora los siguientes instrumentos normativos vinculantes:
1. **Términos y Condiciones Generales de Uso y Contratación (`TERMS_OF_SERVICE.md` / `/terms`):** Regulan el alta, el régimen de suscripciones mensuales, derecho de desistimiento de 14 días (Directiva 2011/83/UE), política de juego limpio (prohibición de motores de ajedrez / Stockfish y trampas) y régimen disciplinario.
2. **Política de Privacidad y Protección de Datos (`PRIVACY_POLICY.md` / `/privacy`):** Conforme al RGPD (Reglamento UE 2016/679) y la LOPD-GDD 3/2018, delimitando la recopilación de datos, el uso de WebSockets, bases de legitimación y ejercicio de derechos ARCO.
3. **Política de Cookies:** Gestión de cookies técnicas y de personalización/publicidad para usuarios gratuitos.

---

# PILAR 7: STACK TECNOLÓGICO Y ÁRBOL MODULAR DE ARCHIVOS

### 7.1 Stack Tecnológico Exhaustivo

#### Frontend (Cliente)
* **Framework y Bundler:** React 18.3.1 con Vite 7.2.4.
* **Enrutamiento:** `react-router-dom` v7.9.6.
* **Estilos:** Tailwind CSS v3.4.17 con PostCSS y Autoprefixer.
* **Motor de Ajedrez (Cliente):** `chess.js` v1.4.0 (validación reglamentaria de jugadas y estados de FEN).
* **Renderizado de Tablero:** `react-chessboard` v4.3.0.
* **Iconografía:** `lucide-react` v0.555.0.
* **Cliente WebSocket:** `socket.io-client` v4.8.1.
* **Cliente Backend / BD:** `@supabase/supabase-js` v2.86.0.
* **Audio y Voz:** Web Audio API (`AudioContext`) con decodificación de `audio/webm;codecs=opus` y `MediaRecorder`.

#### Backend (Servidor)
* **Entorno de Ejecución:** Node.js (CommonJS).
* **Framework Web:** Express v5.1.0 con Middleware CORS.
* **Servidor de WebSockets:** `socket.io` v4.8.1.
* **Motor de Ajedrez (Servidor):** `chess.js` v1.4.0 (análisis FEN, movimientos, mates, tablas).
* **Cálculo de Rating:** `elo-rank` v1.0.4 (factor K=32).
* **Base de Datos y Auth:** `@supabase/supabase-js` v2.87.1.
* **Programador de Tareas (Cron):** `node-cron` v4.2.1.
* **Identificadores:** `uuid` v13.0.0.
* **Variables de Entorno:** `dotenv` v17.2.3.

---

### 7.2 Variables de Entorno del Ecosistema

#### Raíz y Servidor (`server/.env` y `.env`)
```ini
PORT=3000
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_KEY=eyJ... (Service Role Key con permisos elevados)
ADMIN_SECRET=clave_secreta_para_endpoints_administrativos
```

#### Cliente (`client/.env`)
```ini
VITE_SERVER_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (Public Anon Key)
```

---

### 7.3 Árbol Anotado de Carpetas y Archivos

```
royal-team-chess/
├── .env                              # Variables globales del entorno
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore                        # Reglas de exclusión de Git
├── club_chat_schema.sql              # Esquema DDL de la tabla club_messages y políticas RLS
├── limit_members_trigger.sql         # Función y Trigger PL/pgSQL para límite de 30 miembros
├── package.json                      # Scripts de orquestación raíz y dependencias
├── package-lock.json                 # Árbol de versiones bloqueadas de raíz
├── PRD_VERSION_1.0.md                # [ESTE DOCUMENTO] Documento de Requisitos de Producto Oficial
├── ranking_leagues_schema.sql        # Esquema DDL de clubs, seasonal stats e índices de ligas
├── terminology_migration.sql         # Script SQL de alineación de nombres (matches/confrontations)
├── trophy_schema.sql                 # Esquema DDL de definición y asignación de trofeos
│
├── client/                           # APLICACIÓN FRONTEND (React + Vite + Tailwind)
│   ├── .env                          # Configuración local de cliente
│   ├── .env.example                  # Plantilla de configuración cliente
│   ├── eslint.config.js              # Reglas de linter ESLint
│   ├── index.html                    # Entry point HTML de la aplicación web
│   ├── package.json                  # Dependencias frontend (React, Vite, Tailwind, chess.js)
│   ├── postcss.config.js             # Configuración de procesado CSS
│   ├── tailwind.config.js            # Configuración de diseño y paleta Tailwind
│   ├── vercel.json                   # Configuración para despliegue serverless en Vercel
│   ├── vite.config.js                # Configuración del empaquetador Vite
│   ├── public/
│   │   ├── queen.png                 # Icono gráfico de la dama de ajedrez
│   │   ├── vite.svg                  # Isotipo de Vite
│   │   └── assets/
│   │       └── trophies/
│   │           └── first_division_gold.png # Insignia oficial del trofeo de Primera División
│   └── src/
│       ├── App.css                   # Estilos CSS globales y animaciones de partida
│       ├── App.jsx                   # Orquestador raíz de vistas, socket listeners y rutas
│       ├── index.css                 # Importaciones directivas Tailwind
│       ├── main.jsx                  # Punto de montaje del DOM (`createRoot`)
│       ├── supabaseClient.js         # Instancia inicializada del SDK de Supabase (Anon)
│       ├── translations.js           # Diccionario completo bilingüe Español/Inglés (800+ líneas)
│       ├── context/
│       │   └── AuthContext.jsx       # Contexto React de autenticación y sesión Supabase
│       ├── hooks/
│       │   └── useVoiceRecorder.js   # Hook para captura de audio con MediaRecorder cada 250ms
│       ├── utils/
│       │   └── AudioQueue.js         # Reproductor de audio con Web Audio API y drift correction
│       └── components/
│           ├── AuthModal.jsx         # Modal conmutador de Login, Registro y Recuperación
│           ├── ChatModal.jsx         # Modal de mensajería privada 1 a 1 y tarjetas interactivas
│           ├── ChessBoard.jsx        # Componente de tablero interactivo (`react-chessboard`)
│           ├── ClubChat.jsx          # Panel de chat exclusivo para miembros del club
│           ├── ClubProfile.jsx       # Perfil del club, lista de miembros y gestión de owner
│           ├── ClubStatistics.jsx    # Gráficos y resumen numérico de desempeño del club
│           ├── ContactModal.jsx      # Modal con datos de contacto y copia de email
│           ├── CreateClub.jsx        # Pantalla de creación y fundación de nuevos clubes
│           ├── EditProfileModal.jsx  # Modal para editar avatar, username o eliminar cuenta
│           ├── EncuentroLobby.jsx    # Lobby del modo Encuentro: votación y alineación de capitán
│           ├── ErrorBoundary.jsx     # Atrapador de excepciones de renderizado React
│           ├── FriendRequestModal.jsx# Diálogo para enviar solicitud de amistad personalizada
│           ├── GameRoom.jsx          # HUD de la partida en vivo: tablero, relojes y visualizadores
│           ├── InfoModal.jsx         # Manual de instrucciones y reglas de juego
│           ├── LandingPage.jsx       # Hub y menús: Landing, Main, Play, Create, Browser, Quick
│           ├── Lobby.jsx             # Sala de espera estándar: elección de bando y toggle ready
│           ├── PartyModal.jsx        # Ventana de gestión de grupo y chat de party
│           ├── RankingLeagues.jsx    # Clasificación de clubes en 6 Divisiones e histórico
│           ├── SocialPanel.jsx       # Barra lateral de amigos y compañeros de club en línea
│           ├── TrophyList.css        # Estilos de la vitrina de trofeos
│           ├── TrophyList.jsx        # Vitrina interactiva de trofeos agrupados
│           ├── UserProfile.jsx       # Perfil de usuario con estadísticas y vitrina
│           ├── UserStatistics.jsx    # Estadísticas individuales detalladas por temporada
│           └── Visualizer/           # Módulos de telemetría táctica abstracta
│               ├── Flame.jsx         # Indicador visual de consumo excesivo de tiempo (Llama)
│               ├── Heatmap.jsx       # Mapa de calor de presión sobre casillas de ajedrez
│               ├── Metrics.jsx       # Tarjeta de métricas compactas
│               ├── Shield.jsx        # Indicador de seguridad y jaque del rey (Escudo)
│               └── Thermometer.jsx   # Barra visual de balance y ventaja material
│
├── server/                           # SERVIDOR BACKEND (Node.js + Express + Socket.io)
│   ├── .env                          # Variables de entorno backend
│   ├── cron.js                       # Entry point de cron standalone
│   ├── cronJobs.js                   # Programador node-cron para cierre de ligas y purga semestral
│   ├── db.js                         # Capa de acceso y persistencia en Supabase (1400+ líneas)
│   ├── fix_league_permissions.sql    # Script correctivo de permisos RLS para club_seasonal_stats
│   ├── gameManager.js                # Motor autoritativo de partidas, reglas y matchmaking (2100+ l)
│   ├── heatmap.js                    # Algoritmo de cálculo de presión y rayos X de ajedrez
│   ├── index.js                      # Servidor HTTP Express, endpoints admin y handlers Socket.io
│   ├── leagueManager.js              # Algoritmo Waterfall de ascensos/descensos en ligas (200+ l)
│   ├── package.json                  # Dependencias backend (Express, Socket.io, chess.js, elo-rank)
│   ├── partyManager.js               # Gestor en memoria de partys, estados de presencia y sockets
│   └── scripts/                      # Utilidades de simulación y testing de algoritmos de ligas
│       ├── check_bot_stats.js
│       ├── debug_league_stats.js
│       ├── fix_2026_01.js
│       ├── inspect_policies.js
│       ├── simulate_3_season_amnesty.js
│       ├── simulate_full_season.js
│       ├── simulate_multi_season_stress.js
│       ├── test_encuentro.js
│       ├── verify_db_fixes.js
│       ├── verify_encuentro_fix.js
│       └── verify_scoring_simulation.js
│
└── scripts/
    └── debug_league_stats.js         # Script auxiliar de verificación de estadísticas
```

---
*Fin del Documento Oficial de Planos PRD Versión 1.0 — Royal Team Chess.*
