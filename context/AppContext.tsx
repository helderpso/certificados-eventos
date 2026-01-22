
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from 'react';
import type { Event, Category, Template, Participant, User, ThemeId, ThemeConfig, ImportRecord } from '../types';
import { supabase } from '../lib/supabase';

interface AppState {
    isAuthenticated: boolean;
    currentUser: User;
    currentTheme: ThemeId;
    customTheme: ThemeConfig;
    events: Event[];
    categories: Category[];
    templates: Template[];
    participants: Participant[];
    importHistory: ImportRecord[];
    appLogo?: string;
    portalTitle: string;
    portalSubtitle: string;
    isSyncing?: boolean;
}

type Action =
    | { type: 'LOGIN'; payload?: User }
    | { type: 'LOGOUT' }
    | { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
    | { type: 'UPDATE_PROFILE'; payload: User }
    | { type: 'SET_THEME'; payload: ThemeId }
    | { type: 'UPDATE_CUSTOM_THEME'; payload: Partial<ThemeConfig['colors']> }
    | { type: 'ADD_EVENT'; payload: Event }
    | { type: 'UPDATE_EVENT'; payload: Event }
    | { type: 'DELETE_EVENT'; payload: string }
    | { type: 'ADD_CATEGORY'; payload: Category }
    | { type: 'UPDATE_CATEGORY'; payload: Category }
    | { type: 'DELETE_CATEGORY'; payload: string }
    | { type: 'ADD_TEMPLATE'; payload: Template }
    | { type: 'UPDATE_TEMPLATE'; payload: Template }
    | { type: 'DELETE_TEMPLATE'; payload: string }
    | { type: 'ADD_PARTICIPANTS'; payload: Participant[] }
    | { type: 'DELETE_PARTICIPANT'; payload: string }
    | { type: 'ADD_IMPORT_HISTORY'; payload: ImportRecord }
    | { type: 'DELETE_IMPORT'; payload: string }
    | { type: 'UPDATE_LOGO'; payload: string }
    | { type: 'UPDATE_PORTAL_TEXT'; payload: { title?: string; subtitle?: string } };

const STORAGE_KEY = 'certify_pro_v1_state';

const sampleTemplateBg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMTIzIiBoZWlnaHQ9Ijc5NCIgdmlld0JveD0iMCAwIDExMjMgNzk0Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjdmYWZjIi8+PHJlY3QgeD0iMzAiIHk9IjMwIiB3aWR0aD0iMTA2MyIgaGVpZ2h0PSI3MzQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQyOTllMSIgc3Ryb2tlLXdpZHRoPSI1Ii8+PHBhdGggZD0iTSA1MCw1MCBMIDE1MCw1MCBMIDE1MCwxNTAgTCA1MCwxNTAgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDI5OWUxIiBzdHJva2Utd2lkdGg9IjIiIHRyYW5zZm9ybT0icm90YXRlKDQ1IDEwMCAxMDApIi8+PHBhdGggZD0iTSA5NzMsNTAgTCAxMDczLDUwIEwgMTA3MywxNTAgTCA5NzMsMTUwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQyOTllMSIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zm9ybT0icm90YXRlKDQ1IDEwMjIzIDEwMCkiLz48cGF0aCBkPSJNIDUwLDY0NCBMIDE1MCw2NDQgTCAxNTAsNzQ0IEwgNTAsNzQ0IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQyOTllMSIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zm9ybT0icm90YXRlKDQ1IDEwMCA2OTQpIi8+PHBhdGggZD0iTSA5NzMsNjQ0IEwgMTA3Myw2NDQgTCAxMDczLDc0NCBMIDk3Myw3NDQgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDI5OWUxIiBzdHJva2Utd2lkdGg9IjIiIHRyYW5zZm9ybT0icm90YXRlKDQ1IDEwMjMgNjk0KSIvPjwvc3ZnPg==';

export const THEMES: Record<string, ThemeConfig> = {
    blue: {
        id: 'blue',
        name: 'Azul Corporativo',
        colors: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' }
    },
    green: {
        id: 'green',
        name: 'Verde Natureza',
        colors: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' }
    },
    purple: {
        id: 'purple',
        name: 'Roxo Moderno',
        colors: { 50: '#f5f3ff', 100: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' }
    },
    custom: {
        id: 'custom',
        name: 'Personalizado',
        colors: { 50: '#ffffff', 100: '#f3f4f6', 500: '#6b7280', 600: '#4b5563', 700: '#374151' }
    }
};

const defaultInitialState: AppState = {
    isAuthenticated: false,
    currentUser: { name: 'Administrador', email: 'admin@example.com', password: 'password' },
    currentTheme: 'blue',
    customTheme: { id: 'custom', name: 'Personalizado', colors: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' } },
    events: [],
    categories: [
        { id: 'cat1', name: 'Congressista' },
        { id: 'cat2', name: 'Staff' },
        { id: 'cat3', name: 'Orador' }
    ],
    templates: [],
    participants: [],
    importHistory: [],
    appLogo: '',
    portalTitle: 'Portal de Certificados',
    portalSubtitle: 'Insira o seu e-mail para encontrar e descarregar os seus certificados de participação.'
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SET_INITIAL_STATE':
            return { ...state, ...action.payload };
        case 'LOGIN':
            return { ...state, isAuthenticated: true, currentUser: action.payload || state.currentUser };
        case 'LOGOUT':
            supabase.auth.signOut();
            return { ...state, isAuthenticated: false };
        case 'UPDATE_PROFILE':
            return { ...state, currentUser: action.payload };
        case 'SET_THEME':
            return { ...state, currentTheme: action.payload };
        case 'UPDATE_CUSTOM_THEME':
            return {
                ...state,
                customTheme: { ...state.customTheme, colors: { ...state.customTheme.colors, ...action.payload } }
            };
        case 'ADD_EVENT':
            return { ...state, events: [...state.events, action.payload] };
        case 'UPDATE_EVENT':
            return { ...state, events: state.events.map(e => e.id === action.payload.id ? action.payload : e) };
        case 'DELETE_EVENT':
            return {
                ...state,
                events: state.events.filter(e => e.id !== action.payload),
                participants: state.participants.filter(p => p.eventId !== action.payload),
            };
        case 'ADD_CATEGORY':
            return { ...state, categories: [...state.categories, action.payload] };
        case 'UPDATE_CATEGORY':
            return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
        case 'DELETE_CATEGORY':
            return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
        case 'ADD_TEMPLATE':
            return { ...state, templates: [...state.templates, action.payload] };
        case 'UPDATE_TEMPLATE':
             return { ...state, templates: state.templates.map(t => t.id === action.payload.id ? action.payload : t) };
        case 'DELETE_TEMPLATE':
            return { ...state, templates: state.templates.filter(t => t.id !== action.payload) };
        case 'ADD_PARTICIPANTS':
            return { ...state, participants: [...state.participants, ...action.payload] };
        case 'DELETE_PARTICIPANT':
            return { ...state, participants: state.participants.filter(p => p.id !== action.payload) };
        case 'ADD_IMPORT_HISTORY':
            return { ...state, importHistory: [action.payload, ...state.importHistory] };
        case 'DELETE_IMPORT':
            return {
                ...state,
                importHistory: state.importHistory.filter(h => h.id !== action.payload),
                participants: state.participants.filter(p => p.importId !== action.payload)
            };
        case 'UPDATE_LOGO':
            return { ...state, appLogo: action.payload };
        case 'UPDATE_PORTAL_TEXT':
            return {
                ...state,
                portalTitle: action.payload.title ?? state.portalTitle,
                portalSubtitle: action.payload.subtitle ?? state.portalSubtitle,
            };
        default:
            return state;
    }
};

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, defaultInitialState);

    // 1. Initial Load from LocalStorage + Supabase Session Check
    useEffect(() => {
        const init = async () => {
            // Load LocalStorage as cache
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                dispatch({ type: 'SET_INITIAL_STATE', payload: JSON.parse(saved) });
            }

            // Check Supabase Session
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                dispatch({ 
                    type: 'LOGIN', 
                    payload: { name: session.user.user_metadata.full_name || 'Admin', email: session.user.email!, password: '' } 
                });
                
                // Here you would fetch actual data from Supabase tables
                // fetchAppData(session.user.id);
            }
        };
        init();
    }, []);

    // 2. Sync to LocalStorage (as fallback/cache)
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        
        // 3. Sync to Supabase (only if authenticated)
        if (state.isAuthenticated) {
            syncToSupabase(state);
        }
    }, [state]);

    const syncToSupabase = async (currentState: AppState) => {
        // Exemplo de como persistir as definições globais numa tabela 'settings'
        // No Supabase real, cada ação do reducer dispararia um comando SQL específico
        // mas para esta demonstração, mostramos o conceito de sincronização
        console.log("Sincronizando com Supabase Cloud...");
        // await supabase.from('settings').upsert({ id: 'global', theme: currentState.currentTheme, ... });
    };

    return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
