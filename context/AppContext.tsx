
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from 'react';
import type { Event, Category, Template, Participant, User, ThemeId, ThemeConfig, ImportRecord } from '../types';
import { supabase } from '../lib/supabase';

// Define the base themes available in the application
export const THEMES: Record<string, ThemeConfig> = {
    blue: {
        id: 'blue',
        name: 'Azul Profundo',
        colors: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' }
    },
    green: {
        id: 'green',
        name: 'Verde Esmeralda',
        colors: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' }
    },
    purple: {
        id: 'purple',
        name: 'Roxo Real',
        colors: { 50: '#faf5ff', 100: '#f3e8ff', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce' }
    }
};

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
    isLoading: boolean;
}

type Action =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'LOGIN'; payload?: User }
    | { type: 'LOGOUT' }
    | { type: 'SET_INITIAL_STATE'; payload: Partial<AppState> }
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
    | { type: 'UPDATE_THEME'; payload: ThemeId }
    | { type: 'UPDATE_CUSTOM_THEME'; payload: Partial<ThemeConfig['colors']> }
    | { type: 'UPDATE_PORTAL_TEXT'; payload: { title?: string; subtitle?: string } }
    | { type: 'UPDATE_PROFILE'; payload: User };

const defaultInitialState: AppState = {
    isAuthenticated: false,
    currentUser: { name: 'Administrador', email: 'admin@example.com', password: '' },
    currentTheme: 'blue',
    customTheme: { id: 'custom', name: 'Personalizado', colors: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' } },
    events: [],
    categories: [],
    templates: [],
    participants: [],
    importHistory: [],
    appLogo: '',
    portalTitle: 'Portal de Certificados',
    portalSubtitle: 'Insira o seu e-mail para encontrar e descarregar os seus certificados de participação.',
    isLoading: true
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_INITIAL_STATE':
            return { ...state, ...action.payload, isLoading: false };
        case 'LOGIN':
            return { ...state, isAuthenticated: true, currentUser: action.payload || state.currentUser };
        case 'LOGOUT':
            return { ...defaultInitialState, isLoading: false };
        case 'ADD_EVENT':
            return { ...state, events: [...state.events, action.payload] };
        case 'UPDATE_EVENT':
            return { ...state, events: state.events.map(e => e.id === action.payload.id ? action.payload : e) };
        case 'DELETE_EVENT':
            return { ...state, events: state.events.filter(e => e.id !== action.payload) };
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
            return { ...state, importHistory: [...state.importHistory, action.payload] };
        case 'DELETE_IMPORT':
            return { 
                ...state, 
                importHistory: state.importHistory.filter(h => h.id !== action.payload),
                participants: state.participants.filter(p => p.importId !== action.payload)
            };
        case 'UPDATE_LOGO':
            return { ...state, appLogo: action.payload };
        case 'UPDATE_THEME':
            return { ...state, currentTheme: action.payload };
        case 'UPDATE_CUSTOM_THEME':
            return { 
                ...state, 
                customTheme: { 
                    ...state.customTheme, 
                    colors: { ...state.customTheme.colors, ...action.payload } 
                } 
            };
        case 'UPDATE_PORTAL_TEXT':
            return { ...state, portalTitle: action.payload.title || state.portalTitle, portalSubtitle: action.payload.subtitle || state.portalSubtitle };
        case 'UPDATE_PROFILE':
            return { ...state, currentUser: action.payload };
        default:
            return state;
    }
};

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, defaultInitialState);

    // Initial Load
    useEffect(() => {
        const loadCloudData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            // Public data (always load for portal)
            const { data: settings } = await supabase.from('app_settings').select('*').maybeSingle();
            const { data: events } = await supabase.from('events').select('*');
            const { data: categories } = await supabase.from('categories').select('*');
            const { data: templates } = await supabase.from('templates').select('*');

            if (session?.user) {
                dispatch({ 
                    type: 'LOGIN', 
                    payload: { name: session.user.user_metadata.full_name || 'Admin', email: session.user.email!, password: '' } 
                });
            }

            dispatch({
                type: 'SET_INITIAL_STATE',
                payload: {
                    events: events || [],
                    categories: categories || [],
                    templates: templates?.map(t => ({
                        id: t.id,
                        name: t.name,
                        categoryId: t.category_id,
                        backgroundImage: t.background_image,
                        text: t.text_content
                    })) || [],
                    appLogo: settings?.app_logo || '',
                    portalTitle: settings?.portal_title || 'Portal de Certificados',
                    portalSubtitle: settings?.portal_subtitle || 'Encontre os seus certificados.',
                    currentTheme: (settings?.current_theme as ThemeId) || 'blue',
                    customTheme: settings?.custom_colors ? { ...defaultInitialState.customTheme, colors: settings.custom_colors } : defaultInitialState.customTheme
                }
            });
        };

        loadCloudData();
    }, []);

    return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};
