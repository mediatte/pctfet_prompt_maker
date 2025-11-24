// Popup script
let selectedOptions = {
  persona: [],
  context: [],
  task: [],
  format: [],
  example: [],
  tone: []
};

let apiKey = '';

// DOM Elements
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
    // 변경 모드
    apiKeyInput.disabled = false;
    apiKeyInput.value = '';
    apiKeyInput.focus();
    saveApiKeyBtn.textContent = '저장';
  } else {
    // 저장 모드
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

  // Show loading
  loading.classList.remove('hidden');
  promptElements.classList.add('hidden');
  resultSection.classList.add('hidden');
  analyzeBtn.disabled = true;

  // Call background script
  chrome.runtime.sendMessage(
    { 
      action: 'analyzeWithClaude', 
      apiKey: apiKey, 
      userInput: input 
    },
    (response) => {
      // Check for runtime errors
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        alert('통신 오류가 발생했습니다: ' + chrome.runtime.lastError.message);
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
        return;
      }

      // Check if response exists
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
  // Reset selected options
  selectedOptions = {
    persona: [],
    context: [],
    task: [],
    format: [],
    example: [],
    tone: []
  };

  // Render each category
  renderCategory('persona', data.persona);
  renderCategory('context', data.context);
  renderCategory('task', data.task);
  renderCategory('format', data.format);
  renderCategory('example', data.example);
  renderCategory('tone', data.tone);

  // Initial prompt update
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

    button.addEventListener('click', () => {
      toggleOption(button, category, option);
    });

    container.appendChild(button);
  });
}

function toggleOption(button, category, value) {
  button.classList.toggle('active');

  if (button.classList.contains('active')) {
    selectedOptions[category].push(value);
  } else {
    const index = selectedOptions[category].indexOf(value);
    if (index > -1) {
      selectedOptions[category].splice(index, 1);
    }
  }

  updatePrompt();
}

function updatePrompt() {
  let prompt = '';
  let sections = [];

  // Persona
  if (selectedOptions.persona.length > 0) {
    sections.push('【역할/페르소나】\n' + selectedOptions.persona.join('\n'));
  }

  // Context
  if (selectedOptions.context.length > 0) {
    sections.push('【상황/맥락】\n' + selectedOptions.context.join('\n'));
  }

  // Task
  if (selectedOptions.task.length > 0) {
    sections.push('【작업/과제】\n' + selectedOptions.task.join('\n'));
  }

  // Format
  if (selectedOptions.format.length > 0) {
    sections.push('【형식】\n' + selectedOptions.format.join('\n'));
  }

  // Example
  if (selectedOptions.example.length > 0) {
    sections.push('【예시/참고】\n' + selectedOptions.example.join('\n'));
  }

  // Tone
  if (selectedOptions.tone.length > 0) {
    sections.push('【어조/톤】\n' + selectedOptions.tone.join('\n'));
  }

  prompt = sections.join('\n\n');
  resultText.value = prompt || '옵션을 선택하면 여기에 프롬프트가 생성됩니다.';
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
    // Fallback method
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

