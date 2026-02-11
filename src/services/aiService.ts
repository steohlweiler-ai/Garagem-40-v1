export interface AddressSuggestion {
  address: string;
  mapsLink: string;
}

export class AIService {
  constructor() {}

  async getAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
    // AI disabled - returning no suggestions
    return [];
  }

  async scanPlate(base64Image: string): Promise<string> {
    // AI disabled - returning empty
    return "";
  }

  async refineNotes(notes: string): Promise<string> {
    // AI disabled - returning original notes
    return notes;
  }

  async speak(text: string): Promise<boolean> {
    // AI disabled - returning failure
    console.log("TTS is disabled: ", text);
    return false;
  }
}

export const aiService = new AIService();
