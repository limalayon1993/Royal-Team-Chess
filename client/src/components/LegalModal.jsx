import React, { useState } from 'react';
import { X, Shield, FileText, Lock, Info, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export function LegalModal({ isOpen, onClose, initialTab = 'terms' }) {
    const [activeTab, setActiveTab] = useState(initialTab);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
                            <Shield size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Centro Legal & Cumplimiento</h2>
                            <p className="text-xs text-slate-400">Royal Team Chess (RTC) &bull; Versión 1.0 (v1.0.0_Launch)</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Cerrar"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('terms')}
                        className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'terms'
                                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <FileText size={16} />
                        Términos de Uso
                    </button>
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'privacy'
                                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Lock size={16} />
                        Privacidad y Cookies
                    </button>
                    <button
                        onClick={() => setActiveTab('notice')}
                        className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'notice'
                                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Info size={16} />
                        Aviso Legal & Servicio
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 text-sm leading-relaxed space-y-6 text-slate-300">
                    {activeTab === 'terms' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                                <h3 className="text-lg font-bold text-white mb-1">Términos y Condiciones Generales de Uso</h3>
                                <p className="text-xs text-slate-400">Última actualización: Octubre 2026 &bull; Ámbito Internacional (LSSI-CE, Directiva UE 2011/83/UE)</p>
                            </div>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">1. Objeto y Capacidad Legal</h4>
                                <p>
                                    El presente documento regula el acceso, uso y participación en la plataforma de videojuegos web y deportiva <strong>Royal Team Chess (RTC)</strong>. El registro o uso del servicio implica la aceptación íntegra de estas cláusulas.
                                </p>
                                <p>
                                    Para registrarse o contratar suscripciones de pago, el usuario declara ser mayor de 14 años (o la edad mínima legal en su jurisdicción). Los menores de edad contractual deberán contar con autorización expresa de sus tutores legales.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h4 className="text-base font-semibold text-white">2. Modalidades de Servicio y Suscripciones</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-lg space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Nivel Gratuito</span>
                                        <p className="text-sm font-bold text-white">0,00 € / mes</p>
                                        <p className="text-xs text-slate-400">Partidas casuales por equipos (1v1 a 4v4), creación de Alianzas libres y chat de voz. Financiado con publicidad pasiva no intrusiva fuera del tablero.</p>
                                    </div>
                                    <div className="p-3.5 bg-slate-800/60 border border-blue-500/40 rounded-lg space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Suscripción Básica</span>
                                        <p className="text-sm font-bold text-white">5,00 € / mes</p>
                                        <p className="text-xs text-slate-400">Experiencia libre de anuncios (Ad-Free), acceso a torneos oficiales certificados y vitrina digital de Trofeos y Medallas en el perfil.</p>
                                    </div>
                                    <div className="p-3.5 bg-slate-800/60 border border-amber-500/40 rounded-lg space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Suscripción Profesional</span>
                                        <p className="text-sm font-bold text-white">10,00 € / mes</p>
                                        <p className="text-xs text-slate-400">Fundación y membresía de Clubes oficiales (límite estricto de 16 jugadores), circuito oficial de Ligas, ventana de fichajes mensual y selecciones nacionales.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">3. Régimen de Fair Play y Tolerancia Cero</h4>
                                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-200 text-xs space-y-1">
                                    <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                                        <AlertTriangle size={16} />
                                        Prohibición Absoluta de Motores y Asistencia Externa
                                    </div>
                                    <p>
                                        Queda estrictamente prohibido el empleo de motores de ajedrez (Stockfish, Komodo, etc.), bots automatizados, extensiones de asistencia en el navegador, cuentas múltiples (smurfing) o colusión deliberada entre jugadores.
                                    </p>
                                    <p>
                                        Cualquier infracción confirmada conllevará la anulación inmediata de partidas, reseteo del ELO a 300 puntos, revocación de trofeos y/o expulsión definitiva de la plataforma sin derecho a reembolso.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">4. Condiciones de Facturación y Cancelación</h4>
                                <p>
                                    Las suscripciones son procesadas de manera cifrada a través de <strong>Stripe</strong> bajo estándares bancarios PCI-DSS. Las renovaciones se efectúan mensualmente de forma automática. El usuario puede cancelar su suscripción en cualquier instante desde su panel de usuario o comunicándolo por correo a <span className="text-blue-400">contact@royalteamchess.com</span>, manteniendo el acceso hasta la conclusión del periodo facturado.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                                <h3 className="text-lg font-bold text-white mb-1">Política de Privacidad y Cookies</h3>
                                <p className="text-xs text-slate-400">Cumplimiento RGPD (Reglamento UE 2016/679) &bull; LOPD-GDD 3/2018</p>
                            </div>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">1. Responsable del Tratamiento</h4>
                                <p>
                                    El responsable del tratamiento de los datos es la plataforma <strong>Royal Team Chess</strong>.
                                    Para cualquier cuestión relativa a la protección de sus datos o el ejercicio de derechos ARCO, puede contactar a través de <span className="text-blue-400 font-mono">contact@royalteamchess.com</span>.
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">2. Datos Recabados y Finalidad</h4>
                                <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                                    <li><strong>Cuenta y Autenticación:</strong> Correo electrónico, nombre de usuario y contraseña cifrada almacenada mediante hash seguro en Supabase Auth.</li>
                                    <li><strong>Telemetría de Juego:</strong> Posiciones FEN/PGN, cálculo de ELO, estadísticas de partida y métricas de tablero para sincronización autoritativa por WebSockets.</li>
                                    <li><strong>Streaming de Voz en Partida:</strong> El chat de audio se retransmite en fragmentos temporales en memoria (Opus 250ms). <strong>Royal Team Chess NO graba ni guarda en disco las conversaciones de voz</strong> de los jugadores.</li>
                                    <li><strong>Datos Transaccionales:</strong> Gestión de cobros delegada en Stripe; Royal Team Chess no tiene acceso ni almacena numeraciones de tarjetas de crédito.</li>
                                </ul>
                            </section>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">3. Purga Semestral y Retención Mínima</h4>
                                <p>
                                    Siguiendo el principio de minimización de datos del RGPD y nuestro algoritmo automatizado en servidor (<code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-blue-300">cronJobs.js</code>), las estadísticas detalladas de temporadas con más de <strong>6 meses de antigüedad</strong> se purgan periódicamente de la base de datos.
                                </p>
                                <p>
                                    El usuario puede eliminar voluntariamente su cuenta en cualquier momento desde su perfil, lo que borrará de manera irrevocable sus datos personales asociados.
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">4. Política de Cookies</h4>
                                <div className="p-3.5 bg-slate-800/60 border border-slate-700 rounded-lg text-xs space-y-1">
                                    <p className="font-semibold text-white">Cookies estrictamente técnicas y esenciales:</p>
                                    <p>
                                        Esta plataforma utiliza únicamente almacenamiento local (LocalStorage / SessionStorage) y cookies técnicas indispensables para mantener la sesión de autenticación activa y las preferencias de idioma (Español / Inglés).
                                    </p>
                                    <p>
                                        No se emplean cookies de rastreo entre sitios (third-party tracking cookies) ni se comercializan perfiles de navegación con empresas de publicidad.
                                    </p>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'notice' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                                <h3 className="text-lg font-bold text-white mb-1">Aviso Legal y Estado del Servicio</h3>
                                <p className="text-xs text-slate-400">Identificador de Versión: <span className="text-emerald-400 font-mono">v1.0.0_Launch</span> &bull; Estado Operativo: Producción</p>
                            </div>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">1. Titularidad y Contacto</h4>
                                <p>
                                    En cumplimiento del artículo 10 de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa que la plataforma web <strong>Royal Team Chess</strong> es un servicio de entretenimiento y ajedrez deportivo por equipos en línea accesible en <span className="text-blue-400">https://royalteamchess.com</span>. Contacto oficial: <span className="text-blue-400 font-mono">contact@royalteamchess.com</span>.
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">2. Estado del Servicio (Versión 1.0)</h4>
                                <p>
                                    La plataforma opera bajo la versión estable <span className="font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">v1.0.0_Launch</span>. Incorpora sincronización de tableros por WebSockets (Socket.IO), motor de reglas FIDE en servidor (<code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-blue-300">chess.js</code>), reloj colectivo acumulativo y ligas automatizadas por divisiones con algoritmo Waterfall.
                                </p>
                                <p>
                                    Las transiciones estacionales y cierres de liga tienen lugar de forma automatizada a las <strong>00:00 del día 1 de cada mes</strong> (horario de Madrid, España). Durante este breve intervalo se aplican ascensos, descensos y asignaciones de trofeos.
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h4 className="text-base font-semibold text-white">3. Disponibilidad y Limitación de Responsabilidad</h4>
                                <p>
                                    Royal Team Chess realiza sus mejores esfuerzos técnicos para garantizar una operatividad continuada superior al 99%. Sin embargo, al tratarse de un entorno interactivo en tiempo real con WebSockets y WebRTC, no se asume responsabilidad por desconexiones derivadas de la latencia o inestabilidad del proveedor de Internet del usuario, caídas de DNS de terceros o microcortes de red locales.
                                </p>
                            </section>

                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
                                <CheckCircle2 size={18} className="shrink-0" />
                                <span>Infraestructura auditada conforme a las directivas europeas de privacidad, seguridad y comercio digital.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Modal Action */}
                <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center text-xs text-slate-400">
                    <span>Royal Team Chess &copy; 2026</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
