
import React, { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import type { Event, Category, Template, Participant, User, ThemeId, ThemeConfig } from '../types';

interface AppState {
    isAuthenticated: boolean;
    currentUser: User;
    currentTheme: ThemeId;
    customTheme: ThemeConfig;
    events: Event[];
    categories: Category[];
    templates: Template[];
    participants: Participant[];
}

type Action =
    | { type: 'LOGIN' }
    | { type: 'LOGOUT' }
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
    | { type: 'ADD_PARTICIPANTS'; payload: Participant[] };


const sampleTemplateBg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMTIzIiBoZWlnaHQ9Ijc5NCIgdmlld0JveD0iMCAwIDExMjMgNzk0Ij48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjdmYWZjIi8+PHJlY3QgeD0iMzAiIHk9IjMwIiB3aWR0aD0iMTA2MyIgaGVpZ2h0PSI3MzQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQyOTllMSIgc3Ryb2tlLXdpZHRoPSI1Ii8+PHBhdGggZD0iTSA1MCw1MCBMIDE1MCw1MCBMIDE1MCwxNTAgTCA1MCwxNTAgWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDI5OWUxIiBzdHJva2Utd2lkdGg9IjIiIHRyYW5zZm9ybT0icm90YXRlKDQ1IDEwMCAxMDApIi8+PHBhdGggZD0iTSA5NzMsNTAgTCAxMDczLDUwIEwgMTA3MywxNTAgTCA5NzMsMTUwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQyOTllMSIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zvcm09InJvdGF0ZSg0NSAxMDIzIDEwMCkiLz48cGF0aCBkPSJNIDUwLDY0NCBMIDE1MCw2NDQgTCAxNTAsNzQ0IEwgNTAsNzQ0IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQyOTllMSIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zvcm09InJvdGF0ZSg0NSAxMDAgNjk0KSIvPjxwYXRoIGQ9Ik0gOTczLDY0NCBMIDEwNzMsNjQ0IEwgMTA3Myw3NDQgTCA5NzMsNzQ0IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzQyOTllMSIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zvcm09InJvdGF0ZSg0NSAxMDIzIDY5NCkiLz48L3N2Zz4=';

export const THEMES: Record<string, ThemeConfig> = {
    blue: {
        id: 'blue',
        name: 'Azul Corporativo',
        colors: {
            50: '#eff6ff',
            100: '#dbeafe',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
        }
    },
    green: {
        id: 'green',
        name: 'Verde Natureza',
        colors: {
            50: '#ecfdf5',
            100: '#d1fae5',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
        }
    },
    purple: {
        id: 'purple',
        name: 'Roxo Moderno',
        colors: {
            50: '#f5f3ff',
            100: '#ede9fe',
            500: '#8b5cf6',
            600: '#7c3aed',
            700: '#6d28d9',
        }
    },
    custom: {
        id: 'custom',
        name: 'Personalizado',
        colors: {
            50: '#ffffff',
            100: '#f3f4f6',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
        }
    }
};

const initialState: AppState = {
    isAuthenticated: false,
    currentUser: {
        name: 'Administrador',
        email: 'admin@example.com',
        password: 'password'
    },
    currentTheme: 'blue',
    customTheme: {
        id: 'custom',
        name: 'Personalizado',
        colors: {
            50: '#fff1f2',
            100: '#ffe4e6',
            500: '#f43f5e',
            600: '#e11d48',
            700: '#be123c',
        }
    },
    events: [
        { id: 'evt1', name: 'React Conference 2024', date: '2024-10-26' },
        { id: 'evt2', name: 'Web Summit 2024', date: '2024-11-15' },
    ],
    categories: [
        { id: 'cat1', name: 'Congressista' },
        { id: 'cat2', name: 'Staff' },
        { id: 'cat3', name: 'Orador' },
    ],
    templates: [
        {
            id: 'tpl1',
            name: 'Certificado Congressista',
            categoryId: 'cat1',
            backgroundImage: sampleTemplateBg,
            text: '<div style="text-align: center;"><font size="5">Certificamos que</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">participou com distinção como Congressista no evento {{EVENT_NAME}}.</font></div>'
        },
        {
            id: 'tpl2',
            name: 'Certificado Staff',
            categoryId: 'cat2',
            backgroundImage: sampleTemplateBg,
            text: '<div style="text-align: center;"><font size="5">Certificamos e agradecemos a inestimável colaboração de</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">como membro do Staff no evento {{EVENT_NAME}}.</font></div>'
        },
        {
            id: 'tpl3',
            name: 'Certificado Orador',
            categoryId: 'cat3',
            backgroundImage: sampleTemplateBg,
            text: '<div style="text-align: center;"><font size="5">Este certificado é concedido a</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">pela sua excelente apresentação como Orador em {{DATE}}.</font></div>'
        }
    ],
    participants: [
        { id: 'par1', name: 'João Silva', email: 'joao.silva@email.com', eventId: 'evt1', categoryId: 'cat1' },
        { id: 'par2', name: 'Maria Pereira', email: 'maria.p@email.com', eventId: 'evt1', categoryId: 'cat3' },
        { id: 'par3', name: 'João Silva', email: 'joao.silva@email.com', eventId: 'evt2', categoryId: 'cat2' },
    ],
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'LOGIN':
            return { ...state, isAuthenticated: true };
        case 'LOGOUT':
            return { ...state, isAuthenticated: false };
        case 'UPDATE_PROFILE':
            return { ...state, currentUser: action.payload };
        case 'SET_THEME':
            return { ...state, currentTheme: action.payload };
        case 'UPDATE_CUSTOM_THEME':
            return {
                ...state,
                customTheme: {
                    ...state.customTheme,
                    colors: {
                        ...state.customTheme.colors,
                        ...action.payload
                    }
                }
            };
        case 'ADD_EVENT':
            return { ...state, events: [...state.events, action.payload] };
        case 'UPDATE_EVENT':
            return {
                ...state,
                events: state.events.map(e => e.id === action.payload.id ? action.payload : e),
            };
        case 'DELETE_EVENT':
            return {
                ...state,
                events: state.events.filter(e => e.id !== action.payload),
                // Also remove participants associated with this event to keep data clean
                participants: state.participants.filter(p => p.eventId !== action.payload),
            };
        case 'ADD_CATEGORY':
            return { ...state, categories: [...state.categories, action.payload] };
        case 'UPDATE_CATEGORY':
            return {
                ...state,
                categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c),
            };
        case 'DELETE_CATEGORY':
            return {
                ...state,
                categories: state.categories.filter(c => c.id !== action.payload),
            };
        case 'ADD_TEMPLATE':
            return { ...state, templates: [...state.templates, action.payload] };
        case 'UPDATE_TEMPLATE':
             return {
                ...state,
                templates: state.templates.map(t => t.id === action.payload.id ? action.payload : t),
            };
        case 'DELETE_TEMPLATE':
            return {
                ...state,
                templates: state.templates.filter(t => t.id !== action.payload),
            };
        case 'ADD_PARTICIPANTS':
            return {
                ...state,
                participants: [...state.participants, ...action.payload],
            };
        default:
            return state;
    }
};

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
