import { useReducer, useCallback } from 'react';
import type { GeneratorState, GeneratorAction, ScriptRequest } from '../types';
import { 
    generateStory as generateStoryService, 
    generateConsistencyGuide as generateConsistencyGuideService, 
    generatePrompts as generatePromptsService,
} from '../services/geminiService';

const initialState: GeneratorState = {
    step: 'idle',
    progress: 0,
    stepMessage: '',
    error: null,
    request: null,
    story: [],
    consistencyGuide: null,
    results: [],
    abortController: null,
};

function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
    switch (action.type) {
        case 'START_GENERATION':
            return {
                ...initialState,
                step: 'generating_story',
                request: action.payload.request,
                abortController: action.payload.controller,
                stepMessage: 'Bắt đầu quá trình...'
            };
        case 'START_GUIDE_GENERATION':
            return {
                ...state,
                step: 'generating_guide',
                progress: 0,
                stepMessage: 'Bước 2/3: Phân tích nhân vật và bối cảnh...',
            };
        case 'START_PROMPTS_GENERATION':
             return {
                ...state,
                step: 'generating_prompts',
                progress: 0,
                stepMessage: 'Bước 3/3: Bắt đầu tạo prompts chuyên sâu...',
            };
        case 'SET_PROGRESS':
            return {
                ...state,
                progress: action.payload.progress,
                stepMessage: action.payload.message,
            };
        case 'SET_STORY_SUCCESS':
            return {
                ...state,
                step: 'story_complete',
                story: action.payload,
                progress: 100,
                stepMessage: 'Cốt truyện đã sẵn sàng để bạn xem lại.'
            };
        case 'SET_GUIDE_SUCCESS':
             return {
                ...state,
                step: 'guide_complete',
                consistencyGuide: action.payload,
                progress: 100,
                stepMessage: 'Phân tích hoàn tất. Sẵn sàng tạo prompts.'
            };
        case 'SET_PROMPTS_SUCCESS':
            return {
                ...state,
                step: 'complete',
                results: action.payload,
                progress: 100,
                stepMessage: 'Hoàn thành!',
                abortController: null,
            };
        case 'SET_ERROR':
            return {
                ...state,
                step: 'error',
                error: action.payload,
                abortController: null,
            };
        case 'CANCEL':
             return {
                ...state,
                step: 'error',
                error: 'Quá trình tạo kịch bản đã được hủy.',
                abortController: null,
            };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

export function useScriptGenerator() {
    const [state, dispatch] = useReducer(generatorReducer, initialState);

    const handleApiError = (err: unknown) => {
        console.error(err);
        if (err instanceof DOMException && err.name === 'AbortError') {
          dispatch({ type: 'CANCEL' });
        } else {
          const message = "Đã xảy ra lỗi. Lỗi: " + (err instanceof Error ? err.message : String(err));
          dispatch({ type: 'SET_ERROR', payload: message });
        }
    };
    
    const startGeneration = useCallback(async (request: ScriptRequest) => {
        const controller = new AbortController();
        dispatch({ type: 'START_GENERATION', payload: { request, controller }});

        try {
            const onProgress = (update: { progress: number; message: string }) => {
                dispatch({ type: 'SET_PROGRESS', payload: { progress: update.progress, message: update.message } });
            };
            const story = await generateStoryService(request, onProgress, controller.signal);
            dispatch({ type: 'SET_STORY_SUCCESS', payload: story });
        } catch (err) {
            handleApiError(err);
        }
    }, []);

    const generateConsistencyGuide = useCallback(async () => {
        if (!state.story.length || !state.abortController) return;
        
        dispatch({ type: 'START_GUIDE_GENERATION' });

        try {
            const guide = await generateConsistencyGuideService(state.story, state.abortController.signal);
            dispatch({ type: 'SET_GUIDE_SUCCESS', payload: guide });
        } catch (err) {
            handleApiError(err);
        }
    }, [state.story, state.abortController]);

    const generateFinalPrompts = useCallback(async () => {
        if (!state.request || !state.story.length || !state.consistencyGuide || !state.abortController) return;

        dispatch({ type: 'START_PROMPTS_GENERATION' });

        try {
            const onProgress = (update: { progress: number; message: string }) => {
                dispatch({ type: 'SET_PROGRESS', payload: { progress: update.progress, message: update.message } });
            };
            const prompts = await generatePromptsService(state.request, state.story, state.consistencyGuide, onProgress, state.abortController.signal);
            dispatch({ type: 'SET_PROMPTS_SUCCESS', payload: prompts });
        } catch (err) {
            handleApiError(err);
        }
    }, [state.request, state.story, state.consistencyGuide, state.abortController]);

    const cancelGeneration = useCallback(() => {
        state.abortController?.abort();
    }, [state.abortController]);

    const resetGeneration = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    return {
        state,
        startGeneration,
        generateConsistencyGuide,
        generateFinalPrompts,
        cancelGeneration,
        resetGeneration,
    };
}