const encodedInput = document.querySelector('#encodedInput');
const tokensContainer = document.querySelector('#tokens');
const statusLine = document.querySelector('#statusLine');
const tokenCount = document.querySelector('#tokenCount');
const appendBtn = document.querySelector('#appendToken');
const tokenTemplate = document.querySelector('#tokenTemplate');

let tokens = [];

const SAMPLE = '%E4%BD%A0%E5%A5%BD%20World%F0%9F%98%8A';

init();

function init() {
  encodedInput.value = SAMPLE;
  syncFromEncoded(SAMPLE);
  encodedInput.addEventListener('input', (event) => {
    syncFromEncoded(event.target.value);
  });

  tokensContainer.addEventListener('input', handleTokenInput);
  tokensContainer.addEventListener('keydown', handleTokenKeydown);
  tokensContainer.addEventListener('focusin', (event) => {
    if (event.target.classList.contains('token')) {
      event.target.select();
    }
  });

  appendBtn.addEventListener('click', () => {
    tokens.push('');
    renderTokens(tokens.length - 1);
    updateEncodedFromTokens();
  });
}

function syncFromEncoded(encodedValue) {
  if (encodedValue.length === 0) {
    tokens = [];
    renderTokens();
    updateStatus('请输入 URL 编码内容');
    return;
  }

  const normalized = encodedValue;
  try {
    const decoded = decodeURIComponent(normalized);
    tokens = Array.from(decoded);
    renderTokens();
    updateStatus(`已解析 ${tokens.length} 个单元`);
  } catch (error) {
    const hint = error instanceof URIError ? '请检查 % 后是否紧跟两个十六进制字符。' : '';
    updateStatus(`无法解码：${error.message}。${hint}`, true);
  }
}

function updateStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle('error', Boolean(isError));
}

function renderTokens(focusIndex = null) {
  tokensContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();

  tokens.forEach((char, index) => {
    const tokenNode = tokenTemplate.content.firstElementChild.cloneNode(true);
    tokenNode.value = char;
    tokenNode.dataset.index = index;
    fragment.appendChild(tokenNode);
  });

  tokensContainer.appendChild(fragment);
  tokenCount.value = `${tokens.length} 个单元`;

  if (focusIndex !== null) {
    requestAnimationFrame(() => focusToken(focusIndex));
  }
}

function updateEncodedFromTokens() {
  const rebuilt = tokens.map((char) => encodeURIComponent(char)).join('');

  encodedInput.value = rebuilt;
  updateStatus(`已同步 ${tokens.length} 个单元`);
}

function handleTokenInput(event) {
  const input = event.target;
  if (!input.classList.contains('token')) return;
  const index = Number(input.dataset.index);
  const chars = Array.from(input.value);

  let focusIndex = index;

  if (chars.length === 0) {
    tokens.splice(index, 1);
    focusIndex = Math.max(0, index - 1);
  } else {
    tokens.splice(index, 1, ...chars);
    focusIndex = index + chars.length - 1;
  }

  renderTokens(focusIndex);
  updateEncodedFromTokens();
}

function handleTokenKeydown(event) {
  const input = event.target;
  if (!input.classList.contains('token')) return;
  const index = Number(input.dataset.index);

  if (event.key === 'ArrowLeft' && input.selectionStart === 0 && index > 0) {
    event.preventDefault();
    focusToken(index - 1, 'end');
  }

  if (
    event.key === 'ArrowRight' &&
    input.selectionStart === input.value.length &&
    index < tokens.length - 1
  ) {
    event.preventDefault();
    focusToken(index + 1, 'start');
  }
}

function focusToken(index, position = 'start') {
  const target = tokensContainer.querySelector(`[data-index="${index}"]`);
  if (!target) return;
  target.focus();
  const caret = position === 'end' ? target.value.length : 0;
  target.setSelectionRange(caret, caret);
}
