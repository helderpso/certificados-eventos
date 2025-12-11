
import React from 'react';
import { AppProvider } from './context/AppContext';
import MainRouter from './components/MainRouter';
import ThemeManager from './components/ThemeManager';

const App: React.FC = () => {
    return (
        <AppProvider>
            <ThemeManager />
            <MainRouter />
        </AppProvider>
    );
};

export default App;
