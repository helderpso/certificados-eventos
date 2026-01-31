
export interface Event {
    id: string;
    name: string;
    date: string;
}

export interface Category {
    id: string;
    name:string;
}

export interface Template {
    id: string;
    name: string;
    categoryId: string;
    eventId?: string; // Associação opcional a um evento específico
    backgroundImage: string; // base64 string
    text: string; // includes {{PARTICIPANT_NAME}}
}

export interface Participant {
    id: string;
    name: string;
    email: string;
    eventId: string;
    categoryId: string;
    importId?: string; // Links this participant to a specific batch import
    customVar1?: string;
    customVar2?: string;
    customVar3?: string;
}

export interface Certificate {
    participant: Participant;
    event: Event;
    template: Template;
}

export interface User {
    name: string;
    email: string;
    password: string; // In a real app, this would be hashed/handled by backend
}

export interface ImportRecord {
    id: string;
    date: string;
    fileName: string;
    count: number;
    eventId: string;
    categoryName: string;
    status: 'success' | 'partial' | 'error';
}

export type ThemeId = 'blue' | 'green' | 'purple' | 'custom';

export interface ThemeConfig {
    id: ThemeId;
    name: string;
    colors: {
        50: string;
        100: string;
        500: string;
        600: string;
        700: string;
    };
}
