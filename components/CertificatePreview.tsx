
import React, { useMemo } from 'react';
import type { Certificate } from '../types';

interface CertificatePreviewProps {
    certificate: Certificate;
}

const CertificatePreview: React.FC<CertificatePreviewProps> = ({ certificate }) => {
    const { template, participant, event } = certificate;

    const htmlContent = useMemo(() => {
        let text = template.text;
        
        // Basic variable replacement
        // Note: In a production app, consider using a library for safer HTML interpolation
        text = text.replace(/{{PARTICIPANT_NAME}}/g, participant.name || '');
        text = text.replace(/{{EVENT_NAME}}/g, event.name || '');
        text = text.replace(/{{DATE}}/g, new Date(event.date).toLocaleDateString() || '');
        
        // Handle categories if present
        // text = text.replace(/{{CATEGORY}}/g, participant.categoryId || '');

        return text;
    }, [template.text, participant, event]);

    return (
        <div 
            className="w-[1123px] h-[794px] relative bg-cover bg-center overflow-hidden shadow-2xl"
            style={{ backgroundImage: `url(${template.backgroundImage})` }}
        >
            <div className="absolute inset-0 flex flex-col justify-center items-center p-16">
                 {/* 
                   We render the user's HTML directly. 
                   The user is an admin, so we assume some level of trust, 
                   but in a public SaaS, we would strip scripts here.
                */}
                <div 
                    className="w-full max-w-5xl"
                    style={{ textShadow: '0px 2px 4px rgba(255,255,255,0.5)' }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }} 
                />
            </div>
        </div>
    );
};

export default CertificatePreview;
