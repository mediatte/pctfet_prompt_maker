// Background service worker - Multi AI Provider Support
console.log('Background service worker loaded!');

// 아이콘 클릭 시 사이드바 열기
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'analyzeWithClaude') {
    console.log('Received analyze request:', request.userInput);
    
    (async () => {
      try {
        const result = await analyzeWithAI(
          request.apiKey, 
          request.userInput, 
          request.provider, 
          request.model
        );
        console.log('Analysis successful:', result);
        sendResponse({ success: true, data: result });
      } catch (error) {
        console.error('Analysis failed:', error);
        sendResponse({ success: false, error: error.message || String(error) });
      }
    })();
    
    return true;
  }
  
  if (request.action === 'refreshCategory') {
    console.log('Received refresh request for category:', request.category);
    
    (async () => {
      try {
        const result = await refreshCategoryOptions(
          request.apiKey, 
          request.userInput, 
          request.category,
          request.existingOptions,
          request.provider,
          request.model
        );
        console.log('Refresh successful:', result);
        sendResponse({ success: true, data: result });
      } catch (error) {
        console.error('Refresh failed:', error);
        sendResponse({ success: false, error: error.message || String(error) });
      }
    })();
    
    return true;
  }
  
  console.warn('Unknown action:', request.action);
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

// Main analysis function
async function analyzeWithAI(apiKey, userInput, provider, model) {
  console.log(`Starting AI analysis with ${provider}/${model}...`);
  
  const prompt = createAnalysisPrompt(userInput);
  
  switch (provider) {
    case 'anthropic':
      return await callAnthropicAPI(apiKey, prompt, model);
    case 'openai':
      return await callOpenAIAPI(apiKey, prompt, model);
    case 'gemini':
      return await callGeminiAPI(apiKey, prompt, model);
    case 'ollama':
      return await callOllamaAPI(prompt, model);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// Category refresh function
async function refreshCategoryOptions(apiKey, userInput, category, existingOptions, provider, model) {
  console.log(`Refreshing ${category} with ${provider}/${model}...`);
  
  const prompt = createRefreshPrompt(userInput, category, existingOptions);
  
  let response;
  switch (provider) {
    case 'anthropic':
      response = await callAnthropicAPI(apiKey, prompt, model);
      break;
    case 'openai':
      response = await callOpenAIAPI(apiKey, prompt, model);
      break;
    case 'gemini':
      response = await callGeminiAPI(apiKey, prompt, model);
      break;
    case 'ollama':
      response = await callOllamaAPI(prompt, model);
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  
  // Extract JSON array from response
  return extractJSONArray(response);
}

// Prompt templates
function createAnalysisPrompt(userInput) {
  return `사용자가 입력한 키워드: "${userInput}"

위 키워드를 분석하여 프롬프트 작성에 필요한 6가지 요소별로 3-5개의 구체적인 옵션을 제안해주세요.
각 요소는 실제 프롬프트에 사용될 수 있는 완전한 문장이나 구문으로 작성해주세요.

응답은 반드시 아래의 정확한 JSON 형식으로만 제공해주세요:

{
  "persona": ["옵션1", "옵션2", "옵션3"],
  "context": ["옵션1", "옵션2", "옵션3"],
  "task": ["옵션1", "옵션2", "옵션3"],
  "format": ["옵션1", "옵션2", "옵션3"],
  "example": ["옵션1", "옵션2", "옵션3"],
  "tone": ["옵션1", "옵션2", "옵션3"]
}

각 요소별 설명:
- persona: 역할이나 전문성 (예: "당신은 10년 경력의 마케팅 전문가입니다")
- context: 상황이나 배경 (예: "신제품 출시를 앞두고")
- task: 구체적인 작업 (예: "매력적인 이메일 제목 5개 작성")
- format: 출력 형식 (예: "불릿 포인트로 정리", "번호 매긴 리스트로")
- example: 참고 예시나 스타일 (예: "Apple의 간결한 스타일처럼")
- tone: 어조나 분위기 (예: "친근하고 대화하는 듯한 톤으로")

다른 설명 없이 JSON만 응답해주세요.`;
}

function createRefreshPrompt(userInput, category, existingOptions) {
  const categoryNames = {
    persona: 'Persona',
    context: 'Context',
    task: 'Task',
    format: 'Format',
    example: 'Example',
    tone: 'Tone'
  };
  
  const categoryDescriptions = {
    persona: '역할이나 전문성',
    context: '상황이나 배경',
    task: '구체적인 작업',
    format: '출력 형식',
    example: '참고 예시나 스타일',
    tone: '어조나 분위기'
  };

  return `사용자가 입력한 키워드: "${userInput}"

위 키워드를 분석하여 "${categoryNames[category]}" 카테고리에 대한 3-5개의 새로운 옵션을 제안해주세요.

**${categoryNames[category]} 설명:**
${categoryDescriptions[category]}

**이미 제안된 옵션 (중복 피하기):**
${existingOptions.map((opt, i) => `${i+1}. ${opt}`).join('\n')}

${category === 'format' ? '\n**중요**: 마크다운 형식 제거와 관련된 옵션은 이미 추가되어 있으므로 제안하지 마세요.' : ''}

위의 기존 옵션들과 겹치지 않는 완전히 새로운 3-5개의 옵션을 제안해주세요.

응답은 반드시 JSON 배열 형식으로만 제공해주세요:
["옵션1", "옵션2", "옵션3", ...]

다른 설명 없이 JSON 배열만 응답해주세요.`;
}

// Anthropic (Claude) API
async function callAnthropicAPI(apiKey, prompt, model) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API 오류 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// OpenAI API
async function callOpenAIAPI(apiKey, prompt, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API 오류 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Google Gemini API
async function callGeminiAPI(apiKey, prompt, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 오류 (${response.status}): ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Ollama API (로컬)
async function callOllamaAPI(prompt, model) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API 오류 (${response.status}). Ollama가 실행 중인지 확인하세요.`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Ollama에 연결할 수 없습니다. Ollama가 실행 중인지 확인하세요. (http://localhost:11434)');
    }
    throw error;
  }
}

// JSON extraction helpers
function extractJSONArray(text) {
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    throw new Error('JSON 배열을 찾을 수 없습니다: ' + text.substring(0, 200));
  }
  return JSON.parse(jsonMatch[0]);
}

function extractJSONObject(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON 객체를 찾을 수 없습니다: ' + text.substring(0, 200));
  }
  return JSON.parse(jsonMatch[0]);
}

// Use extractJSONObject for full analysis
async function analyzeWithAI(apiKey, userInput, provider, model) {
  console.log(`Starting AI analysis with ${provider}/${model}...`);
  
  const prompt = createAnalysisPrompt(userInput);
  
  let responseText;
  switch (provider) {
    case 'anthropic':
      responseText = await callAnthropicAPI(apiKey, prompt, model);
      break;
    case 'openai':
      responseText = await callOpenAIAPI(apiKey, prompt, model);
      break;
    case 'gemini':
      responseText = await callGeminiAPI(apiKey, prompt, model);
      break;
    case 'ollama':
      responseText = await callOllamaAPI(prompt, model);
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  
  console.log('Response text:', responseText);
  return extractJSONObject(responseText);
}

