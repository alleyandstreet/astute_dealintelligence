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

interface LabState {
    prompt: string;
    format: 'reel' | 'linkedin' | 'thread' | 'carousel';
    persona: string;
    blueprint: any | null;
    outline: any | null;
    thinking?: string;
}

interface ContentStateContextType {
    generatorState: GeneratorState;
    setGeneratorState: React.Dispatch<React.SetStateAction<GeneratorState>>;
    hookLabState: HookLabState;
    setHookLabState: React.Dispatch<React.SetStateAction<HookLabState>>;
    labState: LabState;
    setLabState: React.Dispatch<React.SetStateAction<LabState>>;
    resetGenerator: () => void;
    resetHookLab: () => void;
    resetLab: () => void;
    restoreBlueprint: (saved: any) => void;
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

const initialLabState: LabState = {
    prompt: "",
    format: 'reel',
    persona: "Professional",
    blueprint: null,
    outline: null,
    thinking: ""
};

const ContentStateContext = createContext<ContentStateContextType | undefined>(undefined);

export function ContentStateProvider({ children }: { children: ReactNode }) {
    const [generatorState, setGeneratorState] = useState<GeneratorState>(initialGeneratorState);
    const [hookLabState, setHookLabState] = useState<HookLabState>(initialHookLabState);
    const [labState, setLabState] = useState<LabState>(initialLabState);

    const resetGenerator = () => setGeneratorState(initialGeneratorState);
    const resetHookLab = () => setHookLabState(initialHookLabState);
    const resetLab = () => setLabState(initialLabState);

    return (
        <ContentStateContext.Provider value={{
            generatorState,
            setGeneratorState,
            hookLabState,
            setHookLabState,
            labState,
            setLabState,
            resetGenerator,
            resetHookLab,
            resetLab,
            restoreBlueprint: (saved: any) => {
                setLabState({
                    prompt: saved.prompt,
                    format: saved.format as any,
                    persona: saved.persona,
                    blueprint: saved.blueprint,
                    outline: saved.outline,
                    thinking: saved.thinking || ""
                });
            }
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
