
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
    backgroundImage: string; // base64 string
    text: string; // includes {{PARTICIPANT_NAME}}
}

export interface Participant {
    id: string;
    name: string;
    email: string;
    eventId: string;
    categoryId: string;
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
