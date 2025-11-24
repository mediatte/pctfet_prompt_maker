// Sidepanel script
let selectedOptions = {
  persona: [],
  context: [],
  task: [],
  format: [],
  example: [],
  tone: []
};

let currentData = {
  persona: [],
  context: [],
  task: [],
  format: [],
  example: [],
  tone: []
};

let apiKey = '';
let lastUserInput = '';
let currentProvider = 'anthropic';
let currentModel = 'claude-haiku-4-5-20251001';

// DOM Elements
const aiProviderSelect = document.getElementById('aiProvider');
const aiModelSelect = document.getElementById('aiModel');
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const userInput = document.getElementById('userInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const promptElements = document.getElementById('promptElements');
const resultSection = document.getElementById('resultSection');
const resultText = document.getElementById('resultText');
const copyBtn = document.getElementById('copyBtn');
const copyNotification = document.getElementById('copyNotification');

// Initialize AI provider selection
function initAIProviders() {
  // Load saved settings
  chrome.storage.local.get(['aiProvider', 'aiModel'], (result) => {
    if (result.aiProvider) {
      currentProvider = result.aiProvider;
      aiProviderSelect.value = currentProvider;
    }
    if (result.aiModel) {
      currentModel = result.aiModel;
    }
    updateModelOptions();
  });
}

// Update model dropdown based on provider
function updateModelOptions() {
  const provider = AI_PROVIDERS[currentProvider];
  aiModelSelect.innerHTML = '';
  
  provider.models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.name;
    aiModelSelect.appendChild(option);
  });
  
  aiModelSelect.value = currentModel;
  apiKeyInput.placeholder = provider.apiKeyPlaceholder;
  
  // Update header subtitle
  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    subtitle.textContent = `${provider.name} - ${provider.models.find(m => m.id === currentModel)?.name || ''}`;
  }
}

// AI Provider change handler
aiProviderSelect.addEventListener('change', () => {
  currentProvider = aiProviderSelect.value;
  currentModel = AI_PROVIDERS[currentProvider].models[0].id;
  updateModelOptions();
  chrome.storage.local.set({ aiProvider: currentProvider, aiModel: currentModel });
});

// AI Model change handler
aiModelSelect.addEventListener('change', () => {
  currentModel = aiModelSelect.value;
  chrome.storage.local.set({ aiModel: currentModel });
  updateModelOptions();
});

// Initialize on load
initAIProviders();

// Load saved API key
chrome.storage.local.get(['claudeApiKey'], (result) => {
  if (result.claudeApiKey) {
    apiKey = result.claudeApiKey;
    apiKeyInput.value = '••••••••••••';
    apiKeyInput.disabled = true;
    saveApiKeyBtn.textContent = '변경';
  }
});

// Save API key
saveApiKeyBtn.addEventListener('click', () => {
  if (apiKeyInput.disabled) {
    apiKeyInput.disabled = false;
    apiKeyInput.value = '';
    apiKeyInput.focus();
    saveApiKeyBtn.textContent = '저장';
  } else {
    const key = apiKeyInput.value.trim();
    if (key) {
      apiKey = key;
      chrome.storage.local.set({ claudeApiKey: key }, () => {
        apiKeyInput.value = '••••••••••••';
        apiKeyInput.disabled = true;
        saveApiKeyBtn.textContent = '변경';
        showNotification('API 키가 저장되었습니다!');
      });
    } else {
      alert('API 키를 입력해주세요.');
    }
  }
});

// Analyze button
analyzeBtn.addEventListener('click', async () => {
  const input = userInput.value.trim();
  
  if (!apiKey) {
    alert('먼저 Claude API 키를 입력하고 저장해주세요.');
    return;
  }
  
  if (!input) {
    alert('단어나 키워드를 입력해주세요.');
    return;
  }

  lastUserInput = input;
  
  loading.classList.remove('hidden');
  promptElements.classList.add('hidden');
  resultSection.classList.add('hidden');
  analyzeBtn.disabled = true;

  chrome.runtime.sendMessage(
    { 
      action: 'analyzeWithClaude', 
      apiKey: apiKey, 
      userInput: input,
      provider: currentProvider,
      model: currentModel
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        alert('통신 오류가 발생했습니다: ' + chrome.runtime.lastError.message);
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
        return;
      }

      if (!response) {
        console.error('No response received');
        alert('응답을 받지 못했습니다. 익스텐션을 다시 로드해주세요.');
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
        return;
      }

      console.log('Response:', response);

      if (response.success) {
        displayOptions(response.data);
        loading.classList.add('hidden');
        promptElements.classList.remove('hidden');
        resultSection.classList.remove('hidden');
      } else {
        console.error('API error:', response.error);
        alert('분석 중 오류가 발생했습니다: ' + response.error);
        loading.classList.add('hidden');
      }
      analyzeBtn.disabled = false;
    }
  );
});

// Display options
function displayOptions(data) {
  selectedOptions = {
    persona: [],
    context: [],
    task: [],
    format: [],
    example: [],
    tone: []
  };

  currentData = { ...data };

  renderCategory('persona', data.persona);
  renderCategory('context', data.context);
  renderCategory('task', data.task);
  
  // Format 카테고리에 "마크다운 형식 제거" 필수 추가
  const formatOptions = [...data.format];
  const markdownOption = '마크다운 형식을 사용하지 말고 순수 텍스트로만 응답';
  if (!formatOptions.includes(markdownOption)) {
    formatOptions.unshift(markdownOption); // 맨 앞에 추가
  }
  currentData.format = formatOptions;
  renderCategory('format', formatOptions);
  
  renderCategory('example', data.example);
  renderCategory('tone', data.tone);

  updatePrompt();
}

function renderCategory(category, options) {
  const container = document.getElementById(`${category}Options`);
  container.innerHTML = '';

  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'toggle-option';
    button.textContent = option;
    button.dataset.category = category;
    button.dataset.index = index;
    button.dataset.value = option;

    button.addEventListener('click', (e) => {
      // 일반 클릭: 입력칸에 복사 (새로운 동작)
      copyToCustomInput(category, option);
    });

    // 우클릭도 같은 동작
    button.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      copyToCustomInput(category, option);
    });

    container.appendChild(button);
  });
}

// toggleOption 함수는 더 이상 사용하지 않음 (입력칸 + 반영 버튼 방식으로 변경)

function updatePrompt() {
  let prompt = '';
  let sections = [];

  if (selectedOptions.persona.length > 0) {
    sections.push('【역할/페르소나】\n' + selectedOptions.persona.join('\n'));
  }

  if (selectedOptions.context.length > 0) {
    sections.push('【상황/맥락】\n' + selectedOptions.context.join('\n'));
  }

  if (selectedOptions.task.length > 0) {
    sections.push('【작업/과제】\n' + selectedOptions.task.join('\n'));
  }

  if (selectedOptions.format.length > 0) {
    sections.push('【형식】\n' + selectedOptions.format.join('\n'));
  }

  if (selectedOptions.example.length > 0) {
    sections.push('【예시/참고】\n' + selectedOptions.example.join('\n'));
  }

  if (selectedOptions.tone.length > 0) {
    sections.push('【어조/톤】\n' + selectedOptions.tone.join('\n'));
  }

  prompt = sections.join('\n\n');
  
  // 기존 내용이 있으면 유지하고, 없으면 업데이트
  if (resultText.value.trim() === '' || resultText.value === '옵션을 선택하고 \'반영\' 버튼을 눌러주세요...') {
    resultText.value = prompt || '옵션을 선택하고 \'반영\' 버튼을 눌러주세요...';
  } else {
    // 사용자가 수정했을 수 있으므로 내용 유지
    resultText.value = prompt;
  }
}

// Copy button
copyBtn.addEventListener('click', async () => {
  const text = resultText.value;
  
  if (!text || text === '옵션을 선택하면 여기에 프롬프트가 생성됩니다.') {
    alert('복사할 프롬프트가 없습니다.');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showNotification('클립보드에 복사되었습니다!');
  } catch (error) {
    console.error('Copy failed:', error);
    resultText.select();
    document.execCommand('copy');
    showNotification('클립보드에 복사되었습니다!');
  }
});

function showNotification(message) {
  copyNotification.textContent = message;
  copyNotification.classList.remove('hidden');
  
  setTimeout(() => {
    copyNotification.classList.add('hidden');
  }, 2000);
}

// Refresh buttons for each category
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-refresh')) {
    const category = e.target.dataset.category;
    refreshCategory(category, e.target);
  }
});

function refreshCategory(category, button) {
  if (!apiKey) {
    alert('먼저 Claude API 키를 입력하고 저장해주세요.');
    return;
  }

  if (!lastUserInput) {
    alert('먼저 키워드를 입력하고 분석해주세요.');
    return;
  }

  button.classList.add('loading');
  button.disabled = true;

  chrome.runtime.sendMessage(
    {
      action: 'refreshCategory',
      apiKey: apiKey,
      userInput: lastUserInput,
      category: category,
      existingOptions: currentData[category],
      provider: currentProvider,
      model: currentModel
    },
    (response) => {
      button.classList.remove('loading');
      button.disabled = false;

      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        alert('통신 오류가 발생했습니다: ' + chrome.runtime.lastError.message);
        return;
      }

      if (!response) {
        console.error('No response received');
        alert('응답을 받지 못했습니다.');
        return;
      }

      if (response.success) {
        // Add new options to existing ones
        const newOptions = response.data;
        currentData[category] = [...currentData[category], ...newOptions];
        
        // Re-render category with all options
        renderCategory(category, currentData[category]);
        
        showNotification(`${getCategoryName(category)} 옵션이 추가되었습니다!`);
      } else {
        console.error('API error:', response.error);
        alert('새로고침 중 오류가 발생했습니다: ' + response.error);
      }
    }
  );
}

function getCategoryName(category) {
  const names = {
    persona: 'Persona',
    context: 'Context',
    task: 'Task',
    format: 'Format',
    example: 'Example',
    tone: 'Tone'
  };
  return names[category] || category;
}

// Copy option to custom input for editing
// Copy option to custom input for editing
function copyToCustomInput(category, text) {
  const input = document.querySelector(`.custom-input[data-category="${category}"]`);
  if (input) {
    input.value = text;
    input.focus();
    input.select();
    
    // 입력칸을 하이라이트
    input.style.borderColor = '#667eea';
    input.style.background = '#f8f9ff';
    
    // 알림 간소화
    showNotification(`입력칸에 복사됨 → 편집 후 "반영" 클릭`);
  }
}

// Apply custom input - 최종 프롬프트에 반영
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-apply')) {
    const category = e.target.dataset.category;
    const input = document.querySelector(`.custom-input[data-category="${category}"]`);
    
    if (!input || !input.value.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    
    const customValue = input.value.trim();
    
    // Clear existing selections for this category and add new one
    selectedOptions[category] = [customValue];
    updatePrompt();
    
    // Visual feedback
    e.target.classList.add('applied');
    setTimeout(() => {
      e.target.classList.remove('applied');
    }, 300);
    
    // Clear input
    input.value = '';
    input.style.borderColor = '';
    input.style.background = '';
    
    showNotification(`최종 프롬프트에 반영되었습니다!`);
  }
});

// Enter key in custom input
document.addEventListener('keypress', (e) => {
  if (e.target.classList.contains('custom-input') && e.key === 'Enter') {
    const category = e.target.dataset.category;
    const applyBtn = document.querySelector(`.btn-apply[data-category="${category}"]`);
    if (applyBtn) {
      applyBtn.click();
    }
  }
});

