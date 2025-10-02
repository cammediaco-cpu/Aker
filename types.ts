
export interface ImagePart {
  mimeType: string;
  data: string; // base64 encoded string
}

export interface FunctionCall {
  name: string;
  args: object;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  images?: ImagePart[];
  functionCall?: FunctionCall;
}

export interface ScriptRequest {
  chatHistory: ChatMessage[];
  minutes: number;
  seconds: number;
  aspectRatio: string;
  generateImagePrompts: boolean;
}

export interface VoiceoverDetails {
  text: string;
  tone: string;
}

export interface AudioDetails {
  ambient_sound?: string;
  sfx?: string;
  voiceover?: VoiceoverDetails;
}

// =================== CẤU TRÚC PROMPT MỚI DỰA TRÊN TÀI LIệu ===================

export interface SettingDetails {
    location: string;
    time_of_day: string;
    environment_details: string;
}

export interface CameraDetails {
    opening_frame: string; // e.g., "Low angle shot from behind the boy..."
    movement: string; // e.g., "Slow upward pan for the first 3 seconds, then steady mid shot"
    angle: string; // e.g., "Eye-level", "Low angle", "High angle"
    shot_type: string; // e.g., "Wide shot", "Medium shot", "Close-up"
}

export interface VisualSequenceEvent {
    time_range: string; // e.g., "0-3s", "3-6s"
    description: string; // e.g., "The boy stands on the rooftop with arms wide open..."
}

export interface CharacterDetails {
    name: string;
    description: string; // Consistent description from the guide
    action: string; // Specific action for this scene
    emotion: string; // Specific emotion for this scene
}

export interface VideoPromptDetails {
  scene_id: string; // e.g., "scene_01"
  objective_in_scene: string; // e.g., "Establish the boy’s dream of flying"
  duration: number; // in seconds, e.g., 8
  style: string; // e.g., "cinematic, golden hour, soft focus"
  setting: SettingDetails;
  camera: CameraDetails;
  visual_sequence: VisualSequenceEvent[];
  characters: CharacterDetails[]; // Hỗ trợ nhiều nhân vật
  character_interaction?: string; // Mô tả sự tương tác giữa các nhân vật
  audio: AudioDetails;
  aspect_ratio: string;
  transition_from_previous?: string; // e.g., "hard cut", "fade in", "match cut"
  starting_image_prompt?: string;
}

// ==============================================================================

export interface PromptResult {
  phanCanh: string; // Mô tả tiếng Việt của phân cảnh
  videoPrompt: VideoPromptDetails; // Đối tượng prompt JSON chi tiết
}

export interface StoryScene {
    sceneNumber: number;
    description: string;
}

export interface ConsistencyGuide {
    charactersAndAppearance: string;
    settingAndMood: string;
    keyObjectsAndStyle: string;
}

// =================== STATE MANAGEMENT CHO QUY TRÌNH TẠO KỊCH BẢN ===================

export type GeneratorStep =
  | 'idle'
  | 'generating_story'
  | 'story_complete'
  | 'generating_guide'
  | 'guide_complete'
  | 'generating_prompts'
  | 'complete'
  | 'error';

export interface GeneratorState {
    step: GeneratorStep;
    progress: number;
    stepMessage: string;
    error: string | null;
    request: ScriptRequest | null;
    story: StoryScene[];
    consistencyGuide: ConsistencyGuide | null;
    results: PromptResult[];
    abortController: AbortController | null;
}

export type GeneratorAction =
  | { type: 'START_GENERATION'; payload: { request: ScriptRequest; controller: AbortController } }
  | { type: 'START_GUIDE_GENERATION' }
  | { type: 'START_PROMPTS_GENERATION' }
  | { type: 'SET_PROGRESS'; payload: { progress: number; message: string } }
  | { type: 'SET_STORY_SUCCESS'; payload: StoryScene[] }
  | { type: 'SET_GUIDE_SUCCESS'; payload: ConsistencyGuide }
  | { type: 'SET_PROMPTS_SUCCESS'; payload: PromptResult[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

// =================== API KEY MANAGEMENT ===================

export interface ApiKeyEntry {
  id: string;
  name: string;
  key: string;
}
