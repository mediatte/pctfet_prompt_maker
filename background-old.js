// Background service worker for API calls

// 서비스 워커 활성화 확인
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
        const result = await analyzeWithClaude(request.apiKey, request.userInput);
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
          request.existingOptions
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

async function analyzeWithClaude(apiKey, userInput) {
  console.log('Starting Claude API call...');
  
  const prompt = `사용자가 입력한 키워드: "${userInput}"

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
- persona: 역할이나 전문성 (예: "당신은 10년 경력의 마케팅 전문가입니다", "SEO 전문가의 관점에서")
- context: 상황이나 배경 (예: "신제품 출시를 앞두고", "고객 이탈률이 높아지는 상황에서")
- task: 구체적인 작업 (예: "매력적인 이메일 제목 5개 작성", "500자 이내로 소개글 작성")
- format: 출력 형식 (예: "불릿 포인트로 정리", "표 형식으로 작성", "제목-본문-마무리 구조로", "번호 매긴 리스트로")
- example: 참고 예시나 스타일 (예: "Apple의 간결한 스타일처럼", "구체적인 숫자와 데이터 포함")
- tone: 어조나 분위기 (예: "친근하고 대화하는 듯한 톤으로", "전문적이고 신뢰감 있게", "열정적이고 설득력 있게")

다른 설명 없이 JSON만 응답해주세요.`;

  try {
    console.log('Calling Anthropic API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || `API 오류 (${response.status})`);
      } catch (e) {
        throw new Error(`API 호출 실패 (${response.status}): ${errorText.substring(0, 100)}`);
      }
    }

    const data = await response.json();
    console.log('API response received:', data);
    
    const content = data.content[0].text;
    console.log('Content:', content);
    
    // JSON 추출
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('올바른 JSON 응답을 받지 못했습니다. 응답: ' + content.substring(0, 200));
    }
    
    const jsonString = jsonMatch[0];
    console.log('Extracted JSON:', jsonString);
    
    const parsed = JSON.parse(jsonString);
    console.log('Parsed successfully:', parsed);
    
    return parsed;
  } catch (error) {
    console.error('Error in analyzeWithClaude:', error);
    throw error;
  }
}

async function refreshCategoryOptions(apiKey, userInput, category, existingOptions) {
  console.log('Starting category refresh for:', category);
  
  const categoryDescriptions = {
    persona: '역할이나 전문성 (예: "당신은 10년 경력의 마케팅 전문가입니다", "SEO 전문가의 관점에서")',
    context: '상황이나 배경 (예: "신제품 출시를 앞두고", "고객 이탈률이 높아지는 상황에서")',
    task: '구체적인 작업 (예: "매력적인 이메일 제목 5개 작성", "500자 이내로 소개글 작성")',
    format: '출력 형식 (예: "불릿 포인트로 정리", "표 형식으로 작성", "제목-본문-마무리 구조로")',
    example: '참고 예시나 스타일 (예: "Apple의 간결한 스타일처럼", "구체적인 숫자와 데이터 포함")',
    tone: '어조나 분위기 (예: "친근하고 대화하는 듯한 톤으로", "전문적이고 신뢰감 있게", "열정적이고 설득력 있게")'
  };
  
  const categoryNames = {
    persona: 'Persona',
    context: 'Context',
    task: 'Task',
    format: 'Format',
    example: 'Example',
    tone: 'Tone'
  };

  const prompt = `사용자가 입력한 키워드: "${userInput}"

위 키워드를 분석하여 "${categoryNames[category]}" 카테고리에 대한 3-5개의 새로운 옵션을 제안해주세요.

**${categoryNames[category]} 설명:**
${categoryDescriptions[category]}

**이미 제안된 옵션 (중복 피하기):**
${existingOptions.map((opt, i) => `${i+1}. ${opt}`).join('\n')}

${category === 'format' ? '\n**중요**: 마크다운 형식 제거와 관련된 옵션은 이미 추가되어 있으므로 제안하지 마세요.' : ''}

위의 기존 옵션들과 겹치지 않는 완전히 새로운 3-5개의 옵션을 제안해주세요.
각 옵션은 실제 프롬프트에 사용될 수 있는 완전한 문장이나 구문으로 작성해주세요.

응답은 반드시 JSON 배열 형식으로만 제공해주세요:
["옵션1", "옵션2", "옵션3", ...]

다른 설명 없이 JSON 배열만 응답해주세요.`;

  try {
    console.log('Calling Anthropic API for category refresh...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || `API 오류 (${response.status})`);
      } catch (e) {
        throw new Error(`API 호출 실패 (${response.status}): ${errorText.substring(0, 100)}`);
      }
    }

    const data = await response.json();
    console.log('API response received for refresh:', data);
    
    const content = data.content[0].text;
    console.log('Content:', content);
    
    // JSON 배열 추출
    let jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response:', content);
      throw new Error('올바른 JSON 배열 응답을 받지 못했습니다. 응답: ' + content.substring(0, 200));
    }
    
    const jsonString = jsonMatch[0];
    console.log('Extracted JSON:', jsonString);
    
    const parsed = JSON.parse(jsonString);
    console.log('Parsed successfully:', parsed);
    
    return parsed;
  } catch (error) {
    console.error('Error in refreshCategoryOptions:', error);
    throw error;
  }
}

