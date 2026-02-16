
import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useEffect } from 'react';
import type { Event, Category, Template, Participant, User, ThemeId, ThemeConfig, ImportRecord } from '../types';
import { supabase } from '../lib/supabase';

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
    portalMetaTitle: string;
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
    | { type: 'UPDATE_PARTICIPANT'; payload: Participant }
    | { type: 'DELETE_PARTICIPANT'; payload: string }
    | { type: 'ADD_IMPORT_HISTORY'; payload: ImportRecord }
    | { type: 'DELETE_IMPORT'; payload: string }
    | { type: 'UPDATE_LOGO'; payload: string }
    | { type: 'UPDATE_THEME'; payload: ThemeId }
    | { type: 'UPDATE_CUSTOM_THEME'; payload: Partial<ThemeConfig['colors']> }
    | { type: 'UPDATE_PORTAL_TEXT'; payload: { title?: string; subtitle?: string; metaTitle?: string } }
    | { type: 'UPDATE_PROFILE'; payload: User }
    | { type: 'REFRESH_DATA'; payload: Partial<AppState> };

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
    portalMetaTitle: 'Portal de Certificados', 
    isLoading: true
};

const normId = (id: any): string => {
    if (id === null || id === undefined) return '';
    return String(id).trim().toLowerCase();
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, isLoading: action.payload };
        case 'SET_INITIAL_STATE': return { ...state, ...action.payload, isLoading: false };
        case 'REFRESH_DATA': return { ...state, ...action.payload };
        case 'LOGIN': return { ...state, isAuthenticated: true, currentUser: action.payload || state.currentUser };
        case 'LOGOUT': return { ...state, isAuthenticated: false, currentUser: defaultInitialState.currentUser, isLoading: false };
        case 'ADD_EVENT': return { ...state, events: [...state.events, action.payload] };
        case 'UPDATE_EVENT': return { ...state, events: state.events.map(e => normId(e.id) === normId(action.payload.id) ? action.payload : e) };
        case 'DELETE_EVENT': return { ...state, events: state.events.filter(e => normId(e.id) !== normId(action.payload)) };
        case 'ADD_CATEGORY': return { ...state, categories: [...state.categories, action.payload] };
        case 'UPDATE_CATEGORY': return { ...state, categories: state.categories.map(c => normId(c.id) === normId(action.payload.id) ? action.payload : c) };
        case 'DELETE_CATEGORY': return { ...state, categories: state.categories.filter(c => normId(c.id) !== normId(action.payload)) };
        case 'ADD_TEMPLATE': return { ...state, templates: [...state.templates, action.payload] };
        case 'UPDATE_TEMPLATE': return { ...state, templates: state.templates.map(t => normId(t.id) === normId(action.payload.id) ? action.payload : t) };
        case 'DELETE_TEMPLATE': return { ...state, templates: state.templates.filter(t => normId(t.id) !== normId(action.payload)) };
        case 'ADD_PARTICIPANTS': {
            // SMART MERGE: Evita duplicados verificando o ID único de cada participante
            const newParticipants = action.payload;
            const newIds = new Set(newParticipants.map(p => normId(p.id)));
            const filteredExisting = state.participants.filter(p => !newIds.has(normId(p.id)));
            return { 
                ...state, 
                participants: [...filteredExisting, ...newParticipants] 
            };
        }
        case 'UPDATE_PARTICIPANT': return { ...state, participants: state.participants.map(p => normId(p.id) === normId(action.payload.id) ? action.payload : p) };
        case 'DELETE_PARTICIPANT': return { ...state, participants: state.participants.filter(p => normId(p.id) !== normId(action.payload)) };
        case 'ADD_IMPORT_HISTORY': return { ...state, importHistory: [...state.importHistory, action.payload] };
        case 'DELETE_IMPORT': return { 
            ...state, 
            importHistory: state.importHistory.filter(h => normId(h.id) !== normId(action.payload)),
            participants: state.participants.filter(p => normId(p.importId) !== normId(action.payload))
        };
        case 'UPDATE_LOGO': return { ...state, appLogo: action.payload };
        case 'UPDATE_THEME': return { ...state, currentTheme: action.payload };
        case 'UPDATE_CUSTOM_THEME': return { ...state, customTheme: { ...state.customTheme, colors: { ...state.customTheme.colors, ...action.payload } } };
        case 'UPDATE_PORTAL_TEXT': return { 
            ...state, 
            portalTitle: action.payload.title ?? state.portalTitle, 
            portalSubtitle: action.payload.subtitle ?? state.portalSubtitle,
            portalMetaTitle: action.payload.metaTitle ?? state.portalMetaTitle
        };
        case 'UPDATE_PROFILE': return { ...state, currentUser: action.payload };
        default: return state;
    }
};

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action>; refreshData: () => Promise<AppState> } | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, defaultInitialState);

    const loadInitialData = async (isRefresh = false): Promise<AppState> => {
        if (!isRefresh) dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: settings } = await supabase.from('app_settings').select('*').maybeSingle();
            
            const [eventsRes, categoriesRes, templatesRes, participantsRes, historyRes] = await Promise.all([
                supabase.from('events').select('*').limit(10000),
                supabase.from('categories').select('*').order('name').limit(10000),
                supabase.from('templates').select('*').limit(10000),
                supabase.from('participants').select('*').limit(10000),
                supabase.from('import_history').select('*').limit(10000)
            ]);

            const dataState: Partial<AppState> = {
                events: (eventsRes.data || []).map(e => ({ ...e, id: normId(e.id) })),
                categories: (categoriesRes.data || []).map(c => ({ 
                    id: normId(c.id), 
                    name: String(c.name || 'Sem nome') 
                })),
                importHistory: (historyRes.data || []).map(h => ({
                    id: normId(h.id),
                    date: h.created_at || h.date,
                    fileName: h.file_name,
                    count: h.count,
                    eventId: normId(h.event_id),
                    categoryName: h.category_name,
                    status: h.status
                })),
                participants: (participantsRes.data || []).map(p => ({
                    id: normId(p.id),
                    name: p.name,
                    email: String(p.email || '').trim().toLowerCase(),
                    eventId: normId(p.event_id),
                    categoryId: normId(p.category_id),
                    importId: normId(p.import_id),
                    customVar1: p.custom_var1 || '',
                    customVar2: p.custom_var2 || '',
                    customVar3: p.custom_var3 || ''
                })),
                templates: (templatesRes.data || []).map(t => ({
                    id: normId(t.id),
                    name: t.name,
                    categoryId: normId(t.category_id),
                    eventId: normId(t.event_id),
                    backgroundImage: t.background_image,
                    text: t.text_content
                })),
                appLogo: settings?.app_logo || '',
                portalTitle: settings?.portal_title || defaultInitialState.portalTitle,
                portalSubtitle: settings?.portal_subtitle || defaultInitialState.portalSubtitle,
                portalMetaTitle: settings?.portal_meta_title || 'Portal de Certificados',
                currentTheme: (settings?.current_theme as ThemeId) || 'blue',
                customTheme: settings?.custom_colors ? { ...defaultInitialState.customTheme, colors: settings.custom_colors } : defaultInitialState.customTheme
            };

            if (session?.user) {
                dataState.isAuthenticated = true;
                dataState.currentUser = { 
                    name: session.user.user_metadata.full_name || 'Admin', 
                    email: session.user.email!, 
                    password: '' 
                };
            }

            const finalState = { ...state, ...dataState, isLoading: false };

            if (isRefresh) {
                dispatch({ type: 'REFRESH_DATA', payload: dataState });
            } else {
                dispatch({ type: 'SET_INITIAL_STATE', payload: dataState });
            }

            return finalState as AppState;
        } catch (err) {
            console.error("ERRO CRÍTICO NO LOAD:", err);
            dispatch({ type: 'SET_LOADING', payload: false });
            return state;
        }
    };

    const refreshData = () => loadInitialData(true);

    useEffect(() => { loadInitialData(); }, []);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                dispatch({ type: 'LOGOUT' });
            } else if (event === 'SIGNED_IN' && session) {
                dispatch({ 
                    type: 'LOGIN', 
                    payload: { 
                        name: session.user.user_metadata.full_name || 'Admin', 
                        email: session.user.email!, 
                        password: '' 
                    } 
                });
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    return <AppContext.Provider value={{ state, dispatch, refreshData }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within an AppProvider');
    return context;
};
