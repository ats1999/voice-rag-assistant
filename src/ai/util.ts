import { GenerateContentResponse } from '@google/genai';
import { InternalServerErrorException } from '@nestjs/common';

export function validateModelResponse(response: GenerateContentResponse) {
  if (!response || !response.candidates?.length) {
    throw new InternalServerErrorException('Failed to get an AI response!');
  }

  const candidate = response.candidates[0];
  const isValidGeneration = candidate.finishReason === 'STOP';

  if (!isValidGeneration) {
    console.log(JSON.stringify(response));
    throw new InternalServerErrorException(
      'LLM response incomplete. The model stopped before completing the output.',
    );
  }
}
