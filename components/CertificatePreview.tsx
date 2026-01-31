
import React, { useMemo } from 'react';
import type { Certificate } from '../types';

interface CertificatePreviewProps {
    certificate: Certificate;
}

const CertificatePreview: React.FC<CertificatePreviewProps> = ({ certificate }) => {
    const { template, participant, event } = certificate;

    const htmlContent = useMemo(() => {
        let text = template.text;
        
        // Substituição básica de variáveis
        text = text.replace(/{{PARTICIPANT_NAME}}/g, participant.name || '');
        text = text.replace(/{{EVENT_NAME}}/g, event.name || '');
        text = text.replace(/{{DATE}}/g, new Date(event.date).toLocaleDateString('pt-PT') || '');
        
        // Variáveis Personalizadas
        text = text.replace(/{{CUSTOM_1}}/g, participant.customVar1 || '');
        text = text.replace(/{{CUSTOM_2}}/g, participant.customVar2 || '');
        text = text.replace(/{{CUSTOM_3}}/g, participant.customVar3 || '');
        
        return text;
    }, [template.text, participant, event]);

    return (
        <div 
            className="certificate-container"
            style={{ 
                width: '1123px', 
                height: '794px', 
                position: 'relative', 
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            {/* 
                USO DE TAG IMG: Fundamental para manter a qualidade original. 
                Imagens em CSS background são frequentemente renderizadas com sub-sampling pelo browser.
            */}
            <img 
                src={template.backgroundImage} 
                alt="Background"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    zIndex: 1
                }}
            />

            <div 
                className="content-wrapper"
                style={{ 
                    width: '100%', 
                    padding: '80px',
                    boxSizing: 'border-box',
                    zIndex: 10,
                    textAlign: 'center',
                    position: 'relative'
                }}
            >
                <div 
                    className="html-render"
                    style={{ 
                        wordWrap: 'break-word',
                        maxWidth: '100%'
                    }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }} 
                />
            </div>
        </div>
    );
};

export default CertificatePreview;
