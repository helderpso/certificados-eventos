
import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Loader2, Search, Award, AlertCircle, Lock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { Certificate } from '../../types';
import CertificatePreview from '../../components/CertificatePreview';

const CertificateFinder: React.FC = () => {
    const { state } = useAppContext();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [foundCertificates, setFoundCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    
    const previewRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail.includes('@')) {
            setError('Por favor, introduza um e-mail válido.');
            return;
        }
        setError(null);
        setIsLoading(true);
        setSearched(true);
        
        setTimeout(() => {
            const certs = state.participants
                .filter(p => p.email.toLowerCase() === trimmedEmail)
                .map(participant => {
                    const event = state.events.find(e => e.id === participant.eventId);
                    const template = state.templates.find(t => t.categoryId === participant.categoryId);
                    if (event && template) return { participant, event, template };
                    return null;
                })
                .filter((c): c is Certificate => c !== null);
            setFoundCertificates(certs);
            setIsLoading(false);
        }, 600);
    };

    const handleDownload = async (cert: Certificate) => {
        const key = `${cert.participant.id}-${cert.event.id}`;
        const element = previewRefs.current[key];
        if (!element) return;

        setIsDownloading(key);
        setTimeout(async () => {
            try {
                const imgElement = element.querySelector('img');
                if (imgElement) {
                    await imgElement.decode().catch(() => {});
                }

                // ESCALA OTIMIZADA: 3.5x (~4000px)
                const canvas = await html2canvas(element, {
                    scale: 3.5, 
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    logging: false
                });

                // JPEG 0.95 para redução drástica de peso (ex: de 40MB para 5MB)
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height],
                    compress: true // Ativar compressão interna do PDF
                });

                pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
                pdf.save(`Certificado_${cert.event.name.replace(/\s/g, '_')}_${cert.participant.name.replace(/\s/g, '_')}.pdf`);
            } catch (err) {
                console.error(err);
                alert("Ocorreu um erro ao gerar o seu certificado otimizado.");
            } finally {
                setIsDownloading(null);
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex flex-col items-center justify-between p-4 font-sans">
            <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center py-12">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-white">
                    {state.appLogo && <img src={state.appLogo} alt="Logo" className="h-20 mx-auto mb-6 object-contain" />}
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{state.portalTitle}</h1>
                    <p className="text-gray-600 mt-4 max-w-lg mx-auto leading-relaxed">{state.portalSubtitle}</p>
                    
                    <form onSubmit={handleSearch} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="O seu e-mail de inscrição" 
                                required 
                                className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-100 rounded-2xl outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm bg-white font-medium" 
                            />
                        </div>
                        <button type="submit" disabled={isLoading} className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Procurar'}
                        </button>
                    </form>
                    {error && <p className="text-red-500 text-xs font-bold mt-4 animate-pulse">{error}</p>}
                </div>

                {searched && !isLoading && (
                    <div className="mt-10 space-y-4 animate-fadeIn">
                        {foundCertificates.map((cert) => {
                            const key = `${cert.participant.id}-${cert.event.id}`;
                            return (
                                <div key={key} className="bg-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 border border-brand-100 hover:border-brand-300 transition-all group">
                                    <div className="text-center sm:text-left">
                                        <p className="font-black text-xl text-gray-900 group-hover:text-brand-600 transition-colors">{cert.event.name}</p>
                                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                                            <span className="px-3 py-1 bg-brand-50 text-brand-700 text-[10px] font-black rounded-full uppercase tracking-wider border border-brand-100">
                                                {state.categories.find(c => c.id === cert.participant.categoryId)?.name || 'Participante'}
                                            </span>
                                            <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                ID: {cert.participant.id.slice(0,8)}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDownload(cert)} 
                                        disabled={isDownloading === key} 
                                        className="w-full sm:w-auto bg-green-600 text-white px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black hover:bg-green-700 transition-all shadow-lg hover:shadow-green-200 active:scale-95 disabled:opacity-50"
                                    >
                                        {isDownloading === key ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                                        {isDownloading === key ? 'A otimizar PDF...' : 'Baixar PDF'}
                                    </button>
                                </div>
                            );
                        })}
                        {foundCertificates.length === 0 && (
                            <div className="bg-white/40 backdrop-blur-sm p-12 rounded-3xl text-center shadow-inner border-2 border-dashed border-gray-300">
                                <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-bold">Nenhum certificado disponível para este e-mail.</p>
                                <p className="text-xs text-gray-400 mt-2">Verifique se o e-mail está correto ou contacte a organização.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Renderização invisível para PDF */}
            <div className="absolute" style={{ top: '-10000px', left: '-10000px', pointerEvents: 'none', width: '1123px' }}>
                {foundCertificates.map(cert => {
                     const key = `${cert.participant.id}-${cert.event.id}`;
                    return <div key={key} ref={el => { previewRefs.current[key] = el; }}><CertificatePreview certificate={cert} /></div>
                })}
            </div>

            <footer className="py-8 w-full text-center">
                <button onClick={() => window.location.hash = '/admin'} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-brand-600 flex items-center justify-center gap-2 mx-auto transition-all bg-white px-4 py-2 rounded-full shadow-sm">
                    <Lock size={12}/> Acesso Administrativo
                </button>
            </footer>
        </div>
    );
};

export default CertificateFinder;
