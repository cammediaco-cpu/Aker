
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import type { ScriptRequest, PromptResult, StoryScene, ConsistencyGuide, ChatMessage, FunctionCall, VideoPromptDetails } from '../types';

let ai: GoogleGenAI | null = null;
const model = "gemini-2.5-flash";

export function initializeGemini(apiKey: string) {
  if (!apiKey) {
    throw new Error("API key không được để trống.");
  }
  ai = new GoogleGenAI({ apiKey });
}

/**
 * Xác thực một API key bằng cách thực hiện một yêu cầu thử nghiệm.
 * @param apiKey API key cần kiểm tra.
 * @returns `true` nếu key hợp lệ, `false` nếu không.
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    try {
        const tempAi = new GoogleGenAI({ apiKey });
        // Thực hiện một yêu cầu rất nhỏ và nhanh để xác thực
        await tempAi.models.generateContent({
            model: model,
            contents: "hello",
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return true;
    } catch (error) {
        console.error("Lỗi xác thực API Key:", error);
        return false;
    }
}


function checkClient() {
    if (!ai) {
        throw new Error("Gemini AI client chưa được khởi tạo. Vui lòng cung cấp API key.");
    }
}

export const PROMPT_DURATION_SECONDS = 8;
const BATCH_SIZE = 4;

const offerToGenerateScriptTool: FunctionDeclaration = {
  name: 'offerToGenerateScript',
  description: 'Call this function when you have gathered enough information and are confident you can write a good script. Ask the user if they are ready to proceed with script generation.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: []
  },
};

/**
 * Gửi yêu cầu trò chuyện đến Gemini và nhận phản hồi.
 * Dùng cho việc brainstorming ý tưởng với vai trò "Đạo diễn AI".
 * @param chatHistory Lịch sử cuộc trò chuyện.
 * @returns Phản hồi dạng text và function call (nếu có) của AI.
 */
export async function getChatResponse(chatHistory: ChatMessage[]): Promise<{ text: string; functionCall?: FunctionCall }> {
  checkClient();
  const systemInstruction = `You are a creative, expert film director acting as a helpful AI assistant. Your goal is to help the user flesh out their idea for a video. 
  Ask insightful, open-ended questions about characters, setting, mood, story, visual style, and key moments. 
  You can also analyze images the user provides to understand their visual inspiration, characters, or setting.
  Keep your responses concise, friendly, and conversational, in VIETNAMESE. 
  Maintain a professional and safe-for-work tone. You can discuss action and conflict, but avoid describing graphic details like blood or gore.
  Do NOT write the script. Your job is to brainstorm and gather details from the user.
  Once you have a solid understanding of the concept (characters, setting, basic plot), use the 'offerToGenerateScript' function to ask the user if they're ready to create the script.`;

  const contents = chatHistory.map(message => {
    const textPart = { text: message.text };
    const imageParts = message.images?.map(img => ({
        inlineData: {
            mimeType: img.mimeType,
            data: img.data,
        }
    })) || [];
    
    return {
        role: message.role === 'ai' ? 'model' : 'user',
        parts: [textPart, ...imageParts],
    };
  });

  try {
    const response = await ai!.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        tools: [{ functionDeclarations: [offerToGenerateScriptTool] }],
      },
    });

    const functionCalls = response.functionCalls;
    const firstCall = functionCalls && functionCalls[0];

    return {
        text: response.text,
        functionCall: firstCall ? { name: firstCall.name, args: firstCall.args } : undefined,
    };

  } catch (error) {
    console.error("Lỗi khi lấy phản hồi chat từ Gemini:", error);
    return { text: "Rất tiếc, tôi đang gặp sự cố nhỏ. Bạn có thể thử lại sau giây lát không?" };
  }
}

// Helper to handle API calls and parsing, now with cancellation
async function makeApiCall<T>(systemPrompt: any, responseSchema: object, signal: AbortSignal): Promise<T> {
    checkClient();
    if (signal.aborted) throw new DOMException('Aborted by user', 'AbortError');
    try {
        const response = await ai!.models.generateContent({
            model: model,
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });
        const cleanJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanJsonText) as T;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error("JSON không hợp lệ:", error.message);
            throw new Error("Không thể phân tích phản hồi JSON từ AI. Vui lòng thử lại.");
        }
        throw new Error("Yêu cầu đến AI thất bại.");
    }
}

// ================= STEP 1: GENERATE STORY =================

export async function generateStory(
  request: ScriptRequest,
  onProgress: (update: { progress: number; message: string }) => void,
  signal: AbortSignal
): Promise<StoryScene[]> {
  const totalSeconds = (request.minutes * 60) + request.seconds;
  const totalPrompts = Math.ceil(totalSeconds / PROMPT_DURATION_SECONDS);
  const allScenes: StoryScene[] = [];
  
  const content = request.chatHistory
      .map(m => `${m.role === 'user' ? 'User' : 'AI Director'}: ${m.text}`)
      .join('\n');

  const storySchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        sceneNumber: { type: Type.INTEGER },
        description: { type: Type.STRING },
      },
      required: ['sceneNumber', 'description'],
    },
  };

  for (let i = 0; i < totalPrompts; i += BATCH_SIZE) {
    if (signal.aborted) throw new DOMException('Aborted by user', 'AbortError');
    const promptsInThisBatch = Math.min(BATCH_SIZE, totalPrompts - i);
    const startScene = i + 1;
    const endScene = i + promptsInThisBatch;

    const systemPrompt = `
      You are a creative storyteller. Your task is to write a part of a larger story for a video based on a user's idea.
      User's idea (from a rich brainstorming conversation with an AI Director): "${content}"
      Total scenes in video: ${totalPrompts}

      Current Task: Write exactly ${promptsInThisBatch} scenes, from scene ${startScene} to ${endScene}.
      The story must be continuous and engaging. Each scene description should be a concise summary of the key visual event, in VIETNAMESE.
      
      IMPORTANT CONTENT RESTRICTION: The story can contain intense action, fighting (like punching and kicking), and conflict. However, you must strictly AVOID any graphic or gory descriptions. Do not describe blood, open wounds, or gruesome death scenes. Focus on the choreography of the action and the emotional impact, not the gore.

      Existing story so far (for context, can be empty):
      ${allScenes.map(s => `Scene ${s.sceneNumber}: ${s.description}`).join('\n')}

      Return a JSON array of objects, where each object has "sceneNumber" (integer) and "description" (string in Vietnamese).
    `;

    const batchResults = await makeApiCall<StoryScene[]>(systemPrompt, storySchema, signal);
    allScenes.push(...batchResults);

    const progress = Math.round(((i + BATCH_SIZE) / totalPrompts) * 100);
    onProgress({ progress: progress, message: `Bước 1/3: Đang sáng tạo cốt truyện... (Cảnh ${Math.min(endScene, totalPrompts)}/${totalPrompts})` });
  }

  return allScenes;
}

// ================= STEP 2: ANALYZE STORY FOR CONSISTENCY =================

export async function generateConsistencyGuide(
    story: StoryScene[],
    signal: AbortSignal
): Promise<ConsistencyGuide> {
    const fullStoryText = story.map(s => `Scene ${s.sceneNumber}: ${s.description}`).join('\n');
    
    const consistencySchema = {
        type: Type.OBJECT,
        properties: {
            charactersAndAppearance: { type: Type.STRING, description: "Detailed description of main characters, their appearance, clothing, and consistent traits in ENGLISH." },
            settingAndMood: { type: Type.STRING, description: "Description of the primary setting, atmosphere, mood, and time of day in ENGLISH." },
            keyObjectsAndStyle: { type: Type.STRING, description: "Description of recurring key objects, overall visual style, color palette, and art direction in ENGLISH." },
        },
        required: ['charactersAndAppearance', 'settingAndMood', 'keyObjectsAndStyle'],
    };

    const systemPrompt = `
      You are a film production assistant. Analyze the following video story script and create a "Consistency Guide" to ensure the final video is coherent.
      
      Full Story Script (in Vietnamese):
      ${fullStoryText}

      Your task is to provide a detailed guide in ENGLISH, focusing on:
      1.  **Characters & Appearance**: Who are the main characters? What do they look like? What are they wearing?
      2.  **Setting & Mood**: Where and when does the story take place? What is the overall mood (e.g., mysterious, joyful, futuristic)?
      3.  **Key Objects & Style**: Are there any important objects that reappear? What is the visual style (e.g., cinematic, anime, hyperrealistic)?

      Return a single JSON object with the specified structure.
    `;

    const guide = await makeApiCall<ConsistencyGuide>(systemPrompt, consistencySchema, signal);
    return guide;
}

// ================= STEP 3: GENERATE PROMPTS =================

function getSceneObjective(sceneNumber: number, totalScenes: number): string {
    const position = sceneNumber / totalScenes;
    if (sceneNumber === 1) return "Establish the main character's core dream, inner desire, or the central theme of the story.";
    if (position <= 0.25) return "Introduce the character's world, their daily life, or the initial setting.";
    if (position <= 0.5) return "Introduce the first obstacle, an emotional shift, or an inciting incident that pushes the character to act.";
    if (position <= 0.75) return "Build tension towards the climax. The character takes decisive action or faces a major challenge.";
    if (sceneNumber === totalScenes -1) return "Depict the story's climax, the peak of action or emotion, or a major turning point/revelation.";
    if (sceneNumber === totalScenes) return "Show the resolution, the aftermath, or a final emotional echo that resonates with the opening scene.";
    return "Continue the narrative flow, developing the plot and characters logically from the previous scene.";
}


export async function generatePrompts(
    request: ScriptRequest,
    story: StoryScene[],
    guide: ConsistencyGuide,
    onProgress: (update: { progress: number; message: string }) => void,
    signal: AbortSignal
): Promise<PromptResult[]> {
    const totalPrompts = story.length;
    const allPrompts: PromptResult[] = [];
    const ratioOnly = request.aspectRatio.split(' ')[0];
    
    const promptSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phanCanh: { type: Type.STRING, description: "The original Vietnamese scene description." },
          videoPrompt: {
            type: Type.OBJECT,
            properties: {
              scene_id: { type: Type.STRING, description: "e.g., 'scene_01'" },
              objective_in_scene: { type: Type.STRING, description: "The narrative purpose of this scene." },
              duration: { type: Type.INTEGER, description: `Duration in seconds, should be ${PROMPT_DURATION_SECONDS}.` },
              style: { type: Type.STRING, description: "e.g., 'cinematic, golden hour, soft focus, 8k, ultra realistic'" },
              setting: {
                type: Type.OBJECT,
                properties: {
                  location: { type: Type.STRING },
                  time_of_day: { type: Type.STRING },
                  environment_details: { type: Type.STRING }
                },
                required: ['location', 'time_of_day', 'environment_details']
              },
              camera: {
                type: Type.OBJECT,
                properties: {
                  opening_frame: { type: Type.STRING },
                  movement: { type: Type.STRING },
                  angle: { type: Type.STRING },
                  shot_type: { type: Type.STRING }
                },
                required: ['opening_frame', 'movement', 'angle', 'shot_type']
              },
              visual_sequence: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time_range: { type: Type.STRING, description: "e.g., '0-3s', '3-8s'" },
                    description: { type: Type.STRING }
                  },
                  required: ['time_range', 'description']
                }
              },
              characters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      description: { type: Type.STRING, description: "From the consistency guide" },
                      action: { type: Type.STRING, description: "Specific action in this scene" },
                      emotion: { type: Type.STRING, description: "Specific emotion in this scene" }
                    },
                    required: ['name', 'description', 'action', 'emotion']
                }
              },
              character_interaction: {
                  type: Type.STRING,
                  description: "High-level description of the interaction between characters in this scene."
              },
              audio: {
                type: Type.OBJECT,
                properties: {
                  ambient_sound: { type: Type.STRING },
                  sfx: { type: Type.STRING },
                  voiceover: {
                    type: Type.OBJECT,
                    properties: { text: { type: Type.STRING }, tone: { type: Type.STRING } },
                  }
                }
              },
              aspect_ratio: { type: Type.STRING },
              transition_from_previous: { type: Type.STRING },
              starting_image_prompt: {
                  type: Type.STRING,
                  description: "A detailed text-to-image prompt for the opening frame of the scene. Only generate if requested."
              },
            },
            required: ['scene_id', 'objective_in_scene', 'duration', 'style', 'setting', 'camera', 'visual_sequence', 'characters', 'audio', 'aspect_ratio']
          },
        },
        required: ['phanCanh', 'videoPrompt'],
      },
    };

    for (let i = 0; i < totalPrompts; i += BATCH_SIZE) {
        if (signal.aborted) throw new DOMException('Aborted by user', 'AbortError');
        const scenesForBatch = story.slice(i, i + BATCH_SIZE);

        const scenesWithObjectives = scenesForBatch.map(s => ({
            ...s,
            objective: getSceneObjective(s.sceneNumber, totalPrompts)
        }));

        const scenesText = scenesWithObjectives.map(s => `Scene ${s.sceneNumber} (Objective: ${s.objective}): ${s.description}`).join('\n');
        const isFirstBatch = i === 0;

        let previousPromptContext = "";
        if (!isFirstBatch && allPrompts.length > 0) {
            const lastPromptDetails = allPrompts[allPrompts.length - 1].videoPrompt;
            previousPromptContext = `
            **CONTEXT FROM PREVIOUS SCENE'S PROMPT (FOR CONTINUITY):**
            This is the detailed prompt for the scene that comes *immediately before* the ones you are about to create. The 'opening_frame' of your new scene MUST perfectly match the end state of this scene to ensure a seamless cut.
            \`\`\`json
            ${JSON.stringify(lastPromptDetails, null, 2)}
            \`\`\`
            `;
        }

        const imagePromptInstruction = request.generateImagePrompts ? `
            11. **STARTING IMAGE PROMPT (MANDATORY FOR THIS REQUEST):**
                - You MUST generate an additional field: \`starting_image_prompt\`.
                - This field must contain a highly detailed, descriptive text-to-image prompt in ENGLISH.
                - The prompt should be a single, cohesive paragraph perfect for an AI image generator (like Midjourney, Stable Diffusion).
                - It must visually describe the scene's VERY FIRST frame, as defined in \`camera.opening_frame\`.
                - It must incorporate all relevant visual details from the Consistency Guide (characters, clothing, setting, mood, style, lighting, color palette).
                - Example structure: "dramatic cinematic YouTube thumbnail, [scene description from camera.opening_frame], [character details], [setting details], [style details from guide], professional color grading, sharp focus, 8k".
        ` : '';

        const systemPrompt = `
            You are a Master Cinematographer and AI Video Virtuoso. Your mission is to translate a story into a series of highly structured, visually-driven JSON prompts in ENGLISH for a film. Each prompt will define an ${PROMPT_DURATION_SECONDS}-second video clip.

            **THE CORE PRINCIPLE: CINEMATIC REALISM & PHYSICAL ACCURACY.**
            Every field must serve the scene's objective and be described with precise, physical language. The video model is your camera, and this JSON is your shot list.

            **CONTENT SAFETY GUIDELINE: AVOID GORE.**
            Action, fighting (punching, kicking), and intense conflict are allowed and encouraged for dramatic storytelling. However, you MUST strictly avoid all graphic, gory, or gruesome imagery. Do not describe blood, open wounds, dismemberment, or brutal killing. Focus on cinematic tension, action choreography (the movement and impact of a fight), and emotional impact rather than graphic details. Suggestive actions are preferred over explicit ones (e.g., "a character lunges with a knife, the scene cuts just before impact, focusing on the other character's reaction" is better than "the knife stabs the character").

            **MANDATORY CONSISTENCY GUIDE (must follow for the entire film):**
            - Characters: ${guide.charactersAndAppearance}
            - Setting/Mood: ${guide.settingAndMood}
            - Style/Objects: ${guide.keyObjectsAndStyle}
            
            ${previousPromptContext}

            **Current Task:**
            - Generate detailed video prompts in the required JSON structure for the following story scenes:
            ${scenesText}
            - The original Vietnamese description for each scene should be placed in the 'phanCanh' field.

            **CRITICAL INSTRUCTIONS FOR JSON FIELD CONSTRUCTION:**

            1.  **objective_in_scene**: Use the provided objective for each scene. This is your creative north star.
            2.  **style**: This is critical for realism. Start with a powerful base: "photorealistic, hyper-detailed, physically-based rendering (PBR), cinematic shot, 8k, sharp focus, professional color grading, realistic lighting, Unreal Engine 5 quality". Then, add specific style elements from the Consistency Guide.
            3.  **setting**: Be descriptive. 'environment_details' should paint a picture with physical properties (e.g., "Warm orange sky reflecting off damp asphalt, soft clouds drifting slowly, gentle wind causing laundry lines to sway realistically").
            4.  **camera.opening_frame**: Define the VERY FIRST frame of the ${PROMPT_DURATION_SECONDS}-second clip with precision. This is critical for continuity.
            5.  **camera.movement**: Describe the camera's path throughout the ${PROMPT_DURATION_SECONDS} seconds. Use real-world cinematography terms (e.g., "Slow dolly-in for 3 seconds, holds for 2 seconds, then a subtle handheld shake begins as the character starts running").
            6.  **visual_sequence**: This is the heart of the prompt. Break the ${PROMPT_DURATION_SECONDS}-second scene into a **maximum of 3 logical, continuous time ranges** (e.g., "0-3s", "3-8s"). **For simple or single continuous actions, using just one or two sequences is ideal.** The goal is fluidity, not a checklist. Describe the action with attention to physics. For example, instead of just "the cup falls," describe the entire continuous event: "the ceramic cup tilts on the edge, slides off, accelerates downwards, and shatters on the wooden floor, with small fragments scattering realistically from the impact." This entire action could be a single sequence (e.g., "1-4s").
            7.  **CHARACTER DYNAMICS & INTERACTION (VERY IMPORTANT):**
                -   **'characters' (array):** For each significant character in the scene, create one object in this array. Use names from the guide. 'description' MUST match the guide. 'action' and 'emotion' must be specific to THIS scene and its objective, described with physical mannerisms.
                -   **'character_interaction' (string, optional):** If there are two or more characters, this field is MANDATORY. It defines the core dynamic between them. Examples: "Character A comforts a crying Character B", "Two characters argue intensely over a map", "A detective interrogates a suspect who remains stoic". The individual 'action' and 'emotion' in the 'characters' array MUST reflect and support this overall interaction. If only one character is present, omit this field.
            8.  **audio**: Your goal is to create an immersive cinematic soundscape. Focus on detailed 'ambient_sound' (e.g., "Distant city traffic hum, low wind whistling through cracked window panes") and impactful 'sfx' (e.g., "Sharp crack of a twig underfoot, metallic clank of a key in a lock, the specific sound of fabric rustling"). **CRUCIALLY, DO NOT add a 'voiceover' field.** This is a film, not a narration.
            9.  **Continuity (For all scenes except the first):**
                - Analyze 'previousPromptContext'. Your 'camera.opening_frame' MUST describe the scene exactly as the previous one ended.
                - Set 'transition_from_previous' to "hard cut". The seamlessness comes from matching frames.
            10. **First Scene Only:** For Scene 1, 'transition_from_previous' MUST be "Fade in from black".
            
            ${imagePromptInstruction}

            Return a valid JSON array of objects. Do not include markdown. The prompts must be in ENGLISH.
        `;
        
        const batchResults = await makeApiCall<PromptResult[]>(systemPrompt, promptSchema, signal);

        batchResults.forEach((result, index) => {
            const sceneNumber = i + index + 1;
            result.videoPrompt.scene_id = `scene_${String(sceneNumber).padStart(2, '0')}`;
            result.videoPrompt.duration = PROMPT_DURATION_SECONDS;
            result.videoPrompt.aspect_ratio = ratioOnly;

            // Ensure voiceover is stripped out if the model adds it anyway
            if (result.videoPrompt.audio.voiceover) {
                delete result.videoPrompt.audio.voiceover;
            }
            
            // Ensure starting_image_prompt is stripped out if not requested
            if (!request.generateImagePrompts && result.videoPrompt.starting_image_prompt) {
                delete result.videoPrompt.starting_image_prompt;
            }
            
            if (isFirstBatch && index === 0) {
               result.videoPrompt.transition_from_previous = "Fade in from black";
            } else if (result.videoPrompt.transition_from_previous !== "hard cut") {
               result.videoPrompt.transition_from_previous = "hard cut";
            }
        });

        allPrompts.push(...batchResults);
        
        const progress = Math.round(((i + BATCH_SIZE) / totalPrompts) * 100);
        onProgress({ progress: progress, message: `Bước 3/3: Tạo prompt chuyên sâu... (${Math.min(i + BATCH_SIZE, totalPrompts)}/${totalPrompts})` });
    }
    return allPrompts;
}

// ================= SEO & THUMBNAIL GENERATION =================

async function makeSeoApiCall<T>(systemPrompt: string, responseSchema: object): Promise<T> {
    checkClient();
    try {
        const response = await ai!.models.generateContent({
            model: model,
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
            },
        });
        const cleanJsonText = response.text.trim().replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanJsonText) as T;
    } catch (error) {
        console.error("Lỗi gọi API SEO Gemini:", error);
        if (error instanceof SyntaxError) {
            console.error("JSON không hợp lệ:", error.message);
            throw new Error("Không thể phân tích phản hồi JSON từ AI. Vui lòng thử lại.");
        }
        throw new Error("Yêu cầu đến AI thất bại.");
    }
}

function getStoryAndGuideText(story: StoryScene[], guide: ConsistencyGuide): string {
    const fullStoryText = story.map(s => `Scene ${s.sceneNumber}: ${s.description}`).join('\n');
    return `
        **Video Story (Vietnamese):**
        ${fullStoryText}

        **Video Style Guide (English):**
        - Characters & Appearance: ${guide.charactersAndAppearance}
        - Setting & Mood: ${guide.settingAndMood}
        - Key Objects & Style: ${guide.keyObjectsAndStyle}
    `;
}

export async function generateSeoTitles(story: StoryScene[], guide: ConsistencyGuide): Promise<string[]> {
    const storyAndGuideText = getStoryAndGuideText(story, guide);
    const systemPrompt = `
      You are a YouTube SEO expert and viral content strategist. Your task is to generate 3 compelling, click-worthy, and SEO-optimized video titles in ENGLISH.
      The titles must be based on the following video script summary and style guide.
      They should create curiosity, be concise (ideally under 70 characters), and include relevant keywords.
      ${storyAndGuideText}
      Return a single JSON object with a key "titles" containing an array of 3 title strings.
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['titles']
    };
    const result = await makeSeoApiCall<{ titles: string[] }>(systemPrompt, schema);
    return result.titles;
}

export async function generateSeoDescription(story: StoryScene[], guide: ConsistencyGuide): Promise<string> {
    const storyAndGuideText = getStoryAndGuideText(story, guide);
    const systemPrompt = `
      You are a YouTube SEO expert. Write a detailed, engaging, and SEO-optimized YouTube description in ENGLISH based on the provided video story.
      The description should:
      1. Start with a strong, compelling hook to grab the viewer's attention within the first two lines.
      2. Briefly summarize the video's narrative or key message.
      3. Naturally weave in relevant keywords based on the story and themes.
      4. Be well-structured with paragraphs for readability.
      5. The description should be engaging. It can mention action or conflict from the story, but must avoid any graphic, gory, or bloody details.
      6. DO NOT include placeholders like '[Link]', hashtags, or calls to subscribe. Focus solely on the descriptive content.
      ${storyAndGuideText}
      Return a single JSON object with a key "description" containing the full description text as a single string.
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING }
        },
        required: ['description']
    };
    const result = await makeSeoApiCall<{ description: string }>(systemPrompt, schema);
    return result.description;
}

export async function generateSeoTags(story: StoryScene[], guide: ConsistencyGuide): Promise<string> {
    const storyAndGuideText = getStoryAndGuideText(story, guide);
    const systemPrompt = `
      You are a YouTube SEO expert. Based on the provided video story, generate a comprehensive list of relevant SEO tags.
      Include a mix of:
      - Broad keywords (e.g., cinematic short film, animation, emotional story).
      - Specific keywords related to characters, setting, and plot points.
      - Thematic keywords (e.g., dreams, courage, overcoming adversity).
      ${storyAndGuideText}
      Return a single JSON object with a key "tags" containing a single string of comma-separated tags. Do not add a space after the comma. Example: "tag1,tag2,tag3".
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            tags: { type: Type.STRING }
        },
        required: ['tags']
    };
    const result = await makeSeoApiCall<{ tags: string }>(systemPrompt, schema);
    return result.tags;
}

export async function generateImprovedThumbnailTexts(story: StoryScene[], guide: ConsistencyGuide, originalTexts: string[]): Promise<string[]> {
    const storyAndGuideText = getStoryAndGuideText(story, guide);
    const systemPrompt = `
      You are a YouTube viral content strategist with expertise in maximizing click-through rates (CTR). Your task is to rewrite up to 3 pieces of user-provided text to make them powerful, attention-grabbing headlines for a video thumbnail.

      **VIDEO CONTEXT:**
      ${storyAndGuideText}

      **USER'S ORIGINAL TEXTS:**
      1. "${originalTexts[0] || 'No text provided'}"
      2. "${originalTexts[1] || 'No text provided'}"
      3. "${originalTexts[2] || 'No text provided'}"

      **YOUR INSTRUCTIONS:**
      1.  **Analyze Context:** Deeply understand the video's story, mood, and characters.
      2.  **Rewrite for Impact:** For each original text, create a new, much more compelling version.
          - If the user provides text, transform it.
          - If the user provides NO text ("No text provided"), create a powerful headline from scratch based on the video's most dramatic or emotional themes.
      3.  **Apply Viral Tactics:**
          - **ALL CAPS:** All output text must be in uppercase.
          - **Short & Punchy:** Use as few words as possible. 2-4 powerful words are ideal.
          - **Emotional & Curious:** Evoke strong emotions (wonder, fear, excitement) or create a curiosity gap.
          - **Clarity:** The text must be instantly understandable.
      4.  **Maintain Order:** The output array must have exactly 3 strings, corresponding to the 3 original texts.

      **EXAMPLE:**
      - Original: "a boy who wanted to fly" -> Rewritten: "HE TOUCHED THE SKY"
      - Original: "the robot found a friend" -> Rewritten: "THE LAST FRIEND"
      - Original: "" (No text) -> Rewritten: "A SECRET REVEALED"

      Return a single JSON object with a key "texts" containing an array of 3 rewritten text strings.
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            texts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of exactly 3 rewritten thumbnail texts, in ALL CAPS."
            }
        },
        required: ['texts']
    };
    const result = await makeSeoApiCall<{ texts: string[] }>(systemPrompt, schema);
    return result.texts;
}

export async function generateThumbnailPrompts(story: StoryScene[], guide: ConsistencyGuide, improvedTexts: string[]): Promise<string[]> {
    const fullStoryText = story.map(s => `Scene ${s.sceneNumber}: ${s.description}`).join('\n');
    const systemPrompt = `
      You are a world-class AI art director specializing in creating viral YouTube thumbnails. Your task is to generate 3 distinct and visually striking prompts for an AI image generator, based on the provided video story, style guide, and desired thumbnail text.

      **MANDATORY CONSISTENCY GUIDE (The generated image MUST strictly follow this):**
      - Characters & Appearance: ${guide.charactersAndAppearance}
      - Setting & Mood: ${guide.settingAndMood}
      - Key Objects & Style: ${guide.keyObjectsAndStyle}

      **VIDEO STORY (For context):**
      ${fullStoryText}

      **AI-IMPROVED THUMBNAIL TEXTS (These will be placed on the image):**
      1. Text for Thumbnail 1: "${improvedTexts[0] || 'No text provided'}"
      2. Text for Thumbnail 2: "${improvedTexts[1] || 'No text provided'}"
      3. Text for Thumbnail 3: "${improvedTexts[2] || 'No text provided'}"

      **YOUR TASK:**
      Generate 3 unique prompts. For each prompt, you must:

      **1.  ACHIEVE PERFECT CONSISTENCY:** The visual style, character appearance, lighting, and mood described in your prompt MUST PERFECTLY MATCH the **Consistency Guide**. This is the most important rule.
      
      **CONTENT SAFETY:** The prompt can describe intense action or conflict. However, it must not describe blood, gore, or graphic violence. Focus on dramatic and emotional imagery (e.g., a character's determined face during a fight, a mysterious glowing object) rather than gruesome details.

      **2.  DESIGN FOR THE TEXT (ABSOLUTE REQUIREMENT):** The composition you describe MUST be explicitly designed to accommodate the text provided above.
          - **If text IS provided:** You are creating a background for text. The prompt's main goal is to describe a visually stunning scene where the subject is intentionally offset (e.g., on the left or right third of the frame) leaving a large, clear, and visually appealing area of negative space for the text to be overlaid later. The main character's gaze or action should direct attention towards this negative space. **This is not optional.** Failure to create a composition suitable for text will ruin the thumbnail.
          - **If text is NOT provided ("No text provided"):** Only in this case should you create a powerful, self-contained image that fills the entire frame, focusing on a climactic or emotional moment.

      **3.  MAXIMIZE CLICKABILITY (CTR):**
          - **Emotion is Key:** The prompt should describe a scene with high emotional impact. Character expressions should be vivid (e.g., "face etched with a look of pure determination," "eyes wide with awe and wonder").
          - **Dynamic Composition:** Use strong camera angles (dramatic low angle, intimate close-up), high contrast lighting (e.g., strong rim light, deep shadows), and a clear focal point.
          - **Focus:** Describe one single, powerful moment from the story. Avoid cluttered or confusing scenes.

      **4.  TECHNICAL SPECIFICATIONS:**
          - The prompt should be a detailed paragraph in ENGLISH.
          - The output should be for a 16:9 aspect ratio image.
          - Start the prompt with strong keywords like: "ultra realistic photo, dramatic cinematic YouTube thumbnail, professional color grading, sharp focus..." and incorporate details from the style guide.

      Return a single JSON object with a key "prompts" containing an array of 3 detailed prompt strings.
    `;
    const schema = {
        type: Type.OBJECT,
        properties: {
            prompts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['prompts']
    };
    const result = await makeSeoApiCall<{ prompts: string[] }>(systemPrompt, schema);
    return result.prompts;
}
