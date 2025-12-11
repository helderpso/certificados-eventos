
import React from 'react';
import { useAppContext, THEMES } from '../context/AppContext';

const ThemeManager: React.FC = () => {
    const { state } = useAppContext();
    
    // Determine which theme configuration to use
    // If it's custom, we use the one from the state, otherwise we use the static definition
    const theme = state.currentTheme === 'custom' 
        ? state.customTheme 
        : THEMES[state.currentTheme];

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
