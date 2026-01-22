
import React, { useEffect } from 'react';
import { useAppContext, THEMES } from '../context/AppContext';

const ThemeManager: React.FC = () => {
    const { state } = useAppContext();
    
    // Determine which theme configuration to use
    const theme = state.currentTheme === 'custom' 
        ? state.customTheme 
        : THEMES[state.currentTheme];

    // Synchronize browser tab title
    useEffect(() => {
        if (state.portalMetaTitle) {
            document.title = state.portalMetaTitle;
        }
    }, [state.portalMetaTitle]);

    return (
        <style>
            {`
                :root {
                    --brand-50: ${theme.colors[50]};
                    --brand-100: ${theme.colors[100]};
                    --brand-500: ${theme.colors[500]};
                    --brand-600: ${theme.colors[600]};
                    --brand-700: ${theme.colors[700]};
                }
            `}
        </style>
    );
};

export default ThemeManager;
