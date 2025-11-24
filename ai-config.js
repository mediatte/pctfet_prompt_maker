// AI 제공자 및 모델 설정

const AI_PROVIDERS = {
  anthropic: {
    name: 'Anthropic (Claude)',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (최고 지능)' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 (빠름)' }
    ],
    apiKeyPlaceholder: 'Anthropic API 키 (sk-ant-...)',
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  openai: {
    name: 'OpenAI (GPT)',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (최신)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (빠름)' },
      { id: 'o1', name: 'o1 (추론 특화)' },
      { id: 'o1-mini', name: 'o1-mini (추론 빠름)' }
    ],
    apiKeyPlaceholder: 'OpenAI API 키 (sk-...)',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  gemini: {
    name: 'Google (Gemini)',
    models: [
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (최신)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (빠름)' }
    ],
    apiKeyPlaceholder: 'Google API 키',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/'
  },
  ollama: {
    name: 'Ollama (로컬)',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'gemma2', name: 'Gemma 2' }
    ],
    apiKeyPlaceholder: 'API 키 불필요 (로컬)',
    endpoint: 'http://localhost:11434/api/generate'
  }
};

// 기본 설정
const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

