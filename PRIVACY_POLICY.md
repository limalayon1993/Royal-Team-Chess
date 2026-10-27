# POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS
**Plataforma:** Royal Team Chess (RTC)  
**Sitio Web:** https://royalteamchess.com  
**Contacto DPO / Privacidad:** contact@royalteamchess.com  
**Última Actualización:** Octubre 2026  
**Marco Normativo:** Reglamento General de Protección de Datos (RGPD - Reglamento UE 2016/679) y Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPD-GDD).

---

## 1. RESPONSABLE DEL TRATAMIENTO

El responsable del tratamiento de los datos personales recabados a través de la plataforma **Royal Team Chess** es la entidad gestora de la plataforma (en adelante, "Royal Team Chess", el "Responsable" o "nosotros").

* **Dirección Electrónica de Contacto:** `contact@royalteamchess.com`
* **Finalidad Principal:** Operación técnica, gestión de usuarios, suscripciones y partidas de ajedrez multijugador en tiempo real.

---

## 2. DATOS PERSONALES QUE RECOPILAMOS

Recopilamos únicamente los datos necesarios para la prestación del servicio deportivo y multijugador:

### 2.1. Datos facilitados directamente por el Usuario
* **Datos de Registro y Autenticación:** Dirección de correo electrónico (`email`), nombre público de jugador (`username`), contraseña encriptada (mediante hash seguro en Supabase Auth) y avatar de perfil opcional (`avatar_url`).
* **Datos de Club y Alianzas:** Nombre, descripción y escudo de clubes o alianzas creadas por el usuario.
* **Comunicaciones de Soporte:** Mensajes y correos electrónicos remitidos a la dirección de soporte o formularios de contacto.

### 2.2. Datos generados automáticamente durante el uso del juego
* **Telemetría y Rendimiento de Juego:** Registro de jugadas en notación algebraica (FEN/PGN), puntuación ELO, estadísticas estacionales de partidas (victorias, derrotas, tablas, piezas capturadas), y tiempos invertidos por jugada.
* **Datos de Conexión y Red:** Dirección IP, identificador de socket (`socket.id`), registros de inicio de sesión (*logs* de seguridad) y agente de usuario (*User-Agent*).
* **Streaming de Voz en Partida:** El chat de voz por equipos se transmite en tiempo real mediante fragmentos codificados en Opus (`audio/webm;codecs=opus`). **Royal Team Chess no graba ni almacena en sus servidores las conversaciones de voz de los jugadores**. Los fragmentos de audio se retransmiten en memoria volátil de forma efímera a los compañeros de equipo autorizados y se destruyen inmediatamente tras su emisión.

### 2.3. Datos de Pago y Facturación (Suscripciones)
* Las transacciones de las suscripciones Básica (5 €) y Profesional (10 €) son gestionadas de forma delegada por la pasarela de pagos certificada **Stripe Inc.**
* Royal Team Chess **no tiene acceso ni almacena los datos de tarjeta bancaria** del usuario. Únicamente recibimos de Stripe un identificador de cliente (`stripe_customer_id`), el estado de la suscripción (`active`, `canceled`) y los datos fiscales obligatorios para la facturación.

---

## 3. FINALIDADES Y BASES LEGALES DEL TRATAMIENTO

| Finalidad del Tratamiento | Categoría de Datos | Base Jurídica (RGPD) |
| :--- | :--- | :--- |
| **Prestación del Servicio de Juego:** Creación de cuenta, emparejamiento (Matchmaking), sincronización de tableros, chats de equipo y cálculo de ligas. | Identificativos, telemetría y conexión. | **Ejecución de un contrato** (Art. 6.1.b RGPD): Cumplimiento de los Términos de Servicio. |
| **Gestión de Suscripciones y Cobros:** Tramitación de pagos mensuales de planes Básico y Profesional, facturación y prevención de fraude. | Transaccionales e identificativos. | **Ejecución contractual** y **Obligación legal** tributaria/contable (Art. 6.1.c RGPD). |
| **Juego Limpio y Seguridad (Anti-Cheat):** Monitorización de patrones de jugadas para evitar el uso de motores de ajedrez (Stockfish/bots) y colusión. | FEN de partidas, tiempos y telemetría. | **Interés legítimo** (Art. 6.1.f RGPD) en garantizar la equidad competitiva del juego. |
| **Soporte y Atención al Jugador:** Resolución de incidencias, consultas técnicas y gestión de seleccionadores nacionales. | Email y comunicaciones. | **Ejecución contractual** y consentimiento. |
| **Publicidad Pasiva (Nivel Gratuito):** Inserción de anuncios comerciales no intrusivos en las interfaces previas a partida para usuarios del nivel gratuito. | Cookies técnicas y de publicidad. | **Consentimiento** (Art. 6.1.a RGPD) e interés legítimo. |

---

## 4. CONSERVACIÓN DE LOS DATOS

* **Cuentas Activas:** Los datos de perfil se conservarán mientras el Usuario mantenga su cuenta activa en la Plataforma.
* **Política de Purga Semestral:** De conformidad con nuestro algoritmo automatizado de retención de datos (`cronJobs.js`), las estadísticas detalladas de temporadas con más de **6 meses de antigüedad** son eliminadas periódicamente de la base de datos para optimizar los registros y minimizar el almacenamiento innecesario.
* **Eliminación Voluntaria:** El usuario puede solicitar el borrado completo de su perfil en cualquier momento desde el botón "Eliminar Cuenta" en el panel de edición de perfil o mediante solicitud por email. En tal caso, sus datos personales serán suprimidos de manera irreversible, anonimizando sus jugadas históricas para preservar la integridad de las tablas de clasificación de sus compañeros de equipo.

---

## 5. DESTINATARIOS Y TRANSFERENCIAS INTERNACIONALES

Royal Team Chess no comercializa ni cede datos personales a terceros con fines publicitarios ajenos. Compartimos datos exclusivamente con proveedores tecnológicos encargados del tratamiento (*Subencargados*):

1. **Supabase Inc. (Base de Datos y Autenticación):** Infraestructura en la nube con centros de datos regulados bajo cláusulas contractuales tipo de la UE.
2. **Stripe Inc. (Pasarela de Pagos):** Certificado bajo el marco de privacidad de datos Data Privacy Framework UE-EE.UU. y estándares bancarios PCI-DSS Nivel 1.
3. **Servicios de Hosting e Infraestructura de Servidores:** Proveedores de computación para la ejecución de los sockets Node.js.

---

## 6. DERECHOS DEL USUARIO (DERECHOS ARCO)

De conformidad con los artículos 15 a 22 del RGPD, el Usuario tiene derecho a:

* **Acceso:** Conocer qué datos personales tratamos sobre su persona.
* **Rectificación:** Modificar datos inexactos o incompletos desde su perfil.
* **Supresión ("Derecho al Olvido"):** Solicitar la eliminación total de su cuenta y datos personales.
* **Limitación del Tratamiento:** Solicitar la suspensión temporal del tratamiento de sus datos en determinados supuestos.
* **Portabilidad:** Recibir sus datos en un formato digital estructurado y de uso común (JSON/CSV).
* **Oposición:** Oponerse al tratamiento de datos basado en el interés legítimo.

Para ejercer cualquiera de estos derechos, el Usuario puede enviar un correo electrónico indicando su nombre de usuario y solicitud a:  
📧 **`contact@royalteamchess.com`**

Asimismo, el Usuario tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) a través de su sede electrónica (www.aepd.es) si considera que sus derechos no han sido debidamente atendidos.

---

## 7. POLÍTICA DE COOKIES Y ALMACENAMIENTO LOCAL

7.1. **Almacenamiento Local (LocalStorage):** La Plataforma utiliza `localStorage` y `sessionStorage` exclusivamente para mantener el token de sesión autenticada de Supabase (`sb-...-auth-token`) y recordar preferencias del jugador (como el idioma seleccionado ES/EN).

7.2. **Cookies de Terceros:**
* Para los usuarios de la Suscripción Básica y Profesional, la plataforma opera **completamente libre de cookies de publicidad**.
* Para los usuarios del nivel Gratuito, se emplean cookies de socios publicitarios autorizados para mostrar anuncios pasivos relevantes conforme a las opciones de consentimiento configuradas en el navegador del usuario.
