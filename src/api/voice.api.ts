import { apiClient } from './client';

export interface VoiceRewriteRequest {
  fieldKey: string;
  text: string;
  fieldType?: string;
  deckId?: string;
  hotelName?: string;
  destination?: string;
}

export interface VoiceRewriteResponse {
  original: string;
  fieldType: string;
  variations: string[];
  llm: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
    latencyMs: number;
  };
}

export async function rewriteVoice(req: VoiceRewriteRequest): Promise<VoiceRewriteResponse> {
  const res = await apiClient.post<VoiceRewriteResponse>('/voice/rewrite', req);
  return res.data;
}
