import { embed, embedMany, generateText, streamText, type StreamTextResult } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { ZodSchema } from 'zod';
import type { AIConfig } from '../types/agent.js';

export interface AIRequestOptions {
  system?: string;
  schema?: ZodSchema<any>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: AIConfig['provider'];
}

export type AIStream = AsyncIterable<string>;

export interface AIEmbeddingOptions {
  model?: string;
  provider?: AIConfig['provider'];
}

export class AIClient {
  private readonly config: AIConfig;

  constructor(config: AIConfig = {}) {
    this.config = config;
  }

  async generate<T = any>(prompt: string, options: AIRequestOptions = {}): Promise<T | string> {
    const model = this.buildModel(options);
    const response = await generateText({
      // type cast to avoid provider-model signature drift
      model: model as any,
      prompt,
      system: options.system,
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxTokens ?? this.config.maxTokens,
      schema: options.schema
    } as any);

    if (options.schema && (response as any).object !== undefined) {
      return (response as any).object as T;
    }

    return (response as any).text as string;
  }

  async stream(prompt: string, options: AIRequestOptions = {}): Promise<AIStream> {
    const model = this.buildModel(options);
    const streamResult: StreamTextResult<any> = await streamText({
      model: model as any,
      prompt,
      system: options.system,
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxTokens ?? this.config.maxTokens
    } as any);

    return streamResult.textStream;
  }

  async embed(value: string, options: AIEmbeddingOptions = {}) {
    const model = this.buildEmbeddingModel(options);
    const result = await embed({
      model: model as any,
      value
    } as any);
    return (result as any).embedding as number[];
  }

  async embedMany(values: string[], options: AIEmbeddingOptions = {}) {
    const model = this.buildEmbeddingModel(options);
    const result = await embedMany({
      model: model as any,
      values
    } as any);
    return (result as any).embeddings as number[][];
  }

  private buildModel(options: AIRequestOptions) {
    const provider = options.provider ?? this.config.provider ?? 'openai';
    const modelName = options.model ?? this.config.model ?? 'gpt-4o';

    if (provider === 'anthropic') {
      const anthropic = createAnthropic({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl
      });
      return anthropic(modelName) as any;
    }

    // Default to OpenAI / OpenRouter compatible models
    const openai = createOpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl
    });
    return openai(modelName) as any;
  }

  private buildEmbeddingModel(options: AIEmbeddingOptions) {
    const provider = options.provider ?? this.config.provider ?? 'openai';
    const modelName = options.model ?? this.config.embeddingModel ?? 'text-embedding-3-small';

    if (provider === 'anthropic') {
      throw new Error('Embedding generation is not supported for Anthropic provider');
    }

    const openai = createOpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl
    }) as any;

    if (typeof openai.embedding !== 'function') {
      throw new Error('Embedding model is not available for the configured provider');
    }

    return openai.embedding(modelName) as any;
  }
}
