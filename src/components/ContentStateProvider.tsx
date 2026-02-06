"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface GeneratorState {
    input: string;
    persona: string;
    variations: {
        instagram: any[];
        linkedin: any[];
        twitter: any[];
        threads: any[];
        facebook: any[];
    };
    activeTab: 'instagram' | 'linkedin' | 'twitter' | 'threads' | 'facebook';
    selectedCaption: { caption: string, hashtags: any } | null;
    scheduledDate: Date | null;
    mediaFiles: File[];
    step: 1 | 2;
}

interface HookLabState {
    hookInput: string;
    persona: string;
    generatedHooks: any[];
}

interface ContentStateContextType {
    generatorState: GeneratorState;
    setGeneratorState: React.Dispatch<React.SetStateAction<GeneratorState>>;
    hookLabState: HookLabState;
    setHookLabState: React.Dispatch<React.SetStateAction<HookLabState>>;
    resetGenerator: () => void;
    resetHookLab: () => void;
}

const initialGeneratorState: GeneratorState = {
    input: "",
    persona: "Professional",
    variations: { instagram: [], linkedin: [], twitter: [], threads: [], facebook: [] },
    activeTab: 'instagram',
    selectedCaption: null,
    scheduledDate: null,
    mediaFiles: [],
    step: 1
};

const initialHookLabState: HookLabState = {
    hookInput: "",
    persona: "Professional",
    generatedHooks: []
};

const ContentStateContext = createContext<ContentStateContextType | undefined>(undefined);

export function ContentStateProvider({ children }: { children: ReactNode }) {
    const [generatorState, setGeneratorState] = useState<GeneratorState>(initialGeneratorState);
    const [hookLabState, setHookLabState] = useState<HookLabState>(initialHookLabState);

    const resetGenerator = () => setGeneratorState(initialGeneratorState);
    const resetHookLab = () => setHookLabState(initialHookLabState);

    return (
        <ContentStateContext.Provider value={{
            generatorState,
            setGeneratorState,
            hookLabState,
            setHookLabState,
            resetGenerator,
            resetHookLab
        }}>
            {children}
        </ContentStateContext.Provider>
    );
}

export function useContentState() {
    const context = useContext(ContentStateContext);
    if (context === undefined) {
        throw new Error("useContentState must be used within a ContentStateProvider");
    }
    return context;
}
