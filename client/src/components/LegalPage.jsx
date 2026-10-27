import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowLeft, Shield, FileText, Lock, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export function LegalPage({ initialTab = 'terms', language = 'es' }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(initialTab);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
            {/* Top Navigation */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-semibold"
                    >
                        <ArrowLeft size={18} />
                        <span>Volver a Royal Team Chess</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <Crown className="text-blue-500" size={20} />
                        <span className="font-bold text-white tracking-wide">ROYAL TEAM CHESS</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
                {/* Heading */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Centro Legal y Normativo</h1>
                        <p className="text-sm text-slate-400">Transparencia, cumplimiento RGPD/LSSI y condiciones de servicio (v1.0.0_Launch)</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6 gap-2 overflow-x-auto">
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

                {/* Content Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-300 leading-relaxed text-sm">
                    {activeTab === 'terms' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-white">Términos y Condiciones Generales de Uso y Contratación</h2>
                                <p className="text-xs text-slate-500 mt-1">Plataforma: Royal Team Chess &bull; Contacto: contact@royalteamchess.com</p>
                            </div>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">1. Objeto y Ámbito de Aplicación</h3>
                                <p>
                                    Los presentes Términos regulan el acceso, navegación y uso de la plataforma de ajedrez táctico multijugador por equipos <strong>Royal Team Chess</strong>. La creación de una cuenta implica la aceptación de estas condiciones y de nuestra Política de Privacidad.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-base font-semibold text-white">2. Niveles de Servicio y Membresías</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                                    <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-1">
                                        <div className="text-xs font-bold uppercase text-emerald-400">Nivel Gratuito</div>
                                        <div className="text-lg font-bold text-white">0,00 €</div>
                                        <p className="text-xs text-slate-400">Partidas multijugador casuales 1v1 a 4v4, alianzas comunitarias y chat de voz en partida. Publicidad pasiva no disruptiva.</p>
                                    </div>
                                    <div className="p-4 bg-slate-800/60 border border-blue-500/50 rounded-xl space-y-1">
                                        <div className="text-xs font-bold uppercase text-blue-400">Suscripción Básica</div>
                                        <div className="text-lg font-bold text-white">5,00 € / mes</div>
                                        <p className="text-xs text-slate-400">Eliminación completa de publicidad (Ad-Free), participación en torneos oficiales y vitrina de medallas/trofeos en perfil.</p>
                                    </div>
                                    <div className="p-4 bg-slate-800/60 border border-amber-500/50 rounded-xl space-y-1">
                                        <div className="text-xs font-bold uppercase text-amber-400">Suscripción Profesional</div>
                                        <div className="text-lg font-bold text-white">10,00 € / mes</div>
                                        <p className="text-xs text-slate-400">Fundación y membresía de Clubes oficiales (límite estricto de 16 jugadores), Ligas piramidales y circuito de selecciones nacionales.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">3. Compromiso de Juego Limpio (Fair Play)</h3>
                                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200 text-xs space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
                                        <AlertTriangle size={18} />
                                        Tolerancia Cero frente a Trampas y Motores Externos
                                    </div>
                                    <p>
                                        Se prohíbe de forma terminante el uso de motores de ajedrez (Stockfish, bots o heurísticas externas), colusión entre jugadores o suplantación de identidad.
                                    </p>
                                    <p>
                                        El incumplimiento faculta a la plataforma para el baneo inmediato de la cuenta, reinicio de ELO a 300 puntos y revocación de cualquier trofeo obtenido sin compensación alguna.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">4. Cancelación de Suscripciones</h3>
                                <p>
                                    Los pagos se procesan de forma cifrada mediante Stripe. Las suscripciones pueden cancelarse en cualquier momento desde el perfil del usuario sin penalización, surtiendo efecto al finalizar el ciclo de facturación mensual en curso.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-white">Política de Privacidad y Cookies</h2>
                                <p className="text-xs text-slate-500 mt-1">Conforme al RGPD (Reglamento UE 2016/679) y LOPD-GDD 3/2018</p>
                            </div>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">1. Responsable y Delegado de Privacidad</h3>
                                <p>
                                    La plataforma <strong>Royal Team Chess</strong> es la responsable del tratamiento de los datos personales.
                                    Para ejercer derechos de acceso, rectificación, supresión o limitación, contacte en: <span className="text-blue-400 font-mono">contact@royalteamchess.com</span>.
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">2. Datos Recopilados y No Almacenamiento de Voz</h3>
                                <p>
                                    Recopilamos los datos estrictamente necesarios para el juego: correo de registro, nombre de usuario público y telemetría de jugadas.
                                </p>
                                <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-200 text-xs">
                                    <strong>Streaming de Voz Efímero:</strong> El audio transmitido durante las partidas se envía en fragmentos volátiles de 250ms a los compañeros de equipo autorizados. No se graba ni se conserva en ningún soporte físico de almacenamiento del servidor.
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">3. Política de Purga Semestral</h3>
                                <p>
                                    De conformidad con nuestras políticas de retención de datos, las estadísticas detalladas de temporadas con más de 6 meses de antigüedad se depuran periódicamente de nuestros servidores para garantizar la minimización de datos.
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">4. Cookies y Almacenamiento Local</h3>
                                <p>
                                    No utilizamos cookies de rastreo comercial ni facilitamos datos a redes de publicidad de terceros. Únicamente empleamos cookies y almacenamiento local indispensables para la sesión de usuario y la persistencia de idioma.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'notice' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border-b border-slate-800 pb-4">
                                <h2 className="text-xl font-bold text-white">Aviso Legal y Estado del Servicio</h2>
                                <p className="text-xs text-slate-500 mt-1">Versión del Sistema: <span className="text-emerald-400 font-mono">v1.0.0_Launch</span> &bull; Información Mercantil y LSSI</p>
                            </div>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">1. Información General (Art. 10 LSSI-CE)</h3>
                                <p>
                                    El dominio <span className="text-blue-400">royalteamchess.com</span> corresponde a la plataforma digital Royal Team Chess. Dirección electrónica de contacto y soporte: <span className="text-blue-400 font-mono">contact@royalteamchess.com</span>.
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">2. Estado del Servicio y Mantenimiento de Ligas</h3>
                                <p>
                                    El servicio opera en su versión de lanzamiento 1.0. El cálculo automático de ascensos y descensos de clubes entre las 6 divisiones se ejecuta de forma no interruptiva los días 1 de cada mes a las 00:00 (hora central europea).
                                </p>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-base font-semibold text-white">3. Exclusión de Responsabilidad por Factores de Red</h3>
                                <p>
                                    Dada la naturaleza distribuida y en tiempo real de las partidas, Royal Team Chess no responderá por desconexiones atribuibles a inestabilidades en la red del usuario o interrupciones de su proveedor de acceso a Internet.
                                </p>
                            </section>

                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                                <CheckCircle2 size={18} className="shrink-0" />
                                <span>Plataforma construida conforme a las normas de seguridad web, privacidad y transparencia al consumidor.</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-xs bg-slate-900/50">
                <p>&copy; 2026 Royal Team Chess. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
}
