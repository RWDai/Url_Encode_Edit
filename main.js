const urlInput = document.querySelector('#urlInput');
const statusLine = document.querySelector('#statusLine');
const queryList = document.querySelector('#queryList');
const queryTemplate = document.querySelector('#queryRowTemplate');
const queryCount = document.querySelector('#queryCount');
const addQueryBtn = document.querySelector('#addQuery');
const resetBtn = document.querySelector('#resetSample');
const baseFields = document.querySelectorAll('[data-field]');

const SAMPLE_URL =
  'https://demo.example.com:8080/api/%E8%B5%84%E6%BA%90?name=%E5%BC%A0%E4%B8%89&description=%F0%9F%93%88+Docs&token=abc123&redirect=https%3A%2F%2Fexample.org%2Fcallback&note=Hello%20World%20%F0%9F%9A%80';

const state = {
  protocol: 'https',
  hostname: '',
  port: '',
  pathname: '/',
  query: [],
};

let nextQueryId = 0;

init();

function init() {
  resetBtn.addEventListener('click', () => {
    urlInput.value = SAMPLE_URL;
    syncFromUrlInput(SAMPLE_URL);
  });

  urlInput.addEventListener('input', (event) => {
    syncFromUrlInput(event.target.value);
  });

  baseFields.forEach((field) => {
    field.addEventListener('input', () => {
      const key = field.dataset.field;
      state[key] = field.value;
      rebuildUrlFromState();
    });
  });

  queryList.addEventListener('input', (event) => {
    if (!event.target.classList.contains('query-input')) return;
    const row = event.target.closest('.query-row');
    if (!row) return;
    const field = event.target.name;
    if (field === 'value') {
      autoResize(event.target);
    }
    updateQueryRow(row.dataset.id, field, event.target.value);
  });

  queryList.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('.icon-btn');
    if (!deleteBtn) return;
    const row = deleteBtn.closest('.query-row');
    removeQueryRow(row.dataset.id);
  });

  addQueryBtn.addEventListener('click', () => {
    addQueryRow();
    renderQueryRows(state.query.length - 1);
    rebuildUrlFromState();
  });

  // 初始化示例
  urlInput.value = SAMPLE_URL;
  syncFromUrlInput(SAMPLE_URL);
}

function syncFromUrlInput(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    updateStatus('请输入完整的 URL');
    return;
  }

  const { prepared, inferredProtocol } = prepareUrl(trimmed);

  try {
    const parsed = new URL(prepared);
    populateState(parsed);
    renderBaseFields();
    renderQueryRows();
    urlInput.value = parsed.toString();
    const info = inferredProtocol
      ? '已自动补全 https:// 并解析 URL'
      : `已解析 ${state.query.length} 个 Query 参数`;
    updateStatus(info);
  } catch (error) {
    updateStatus(`无法解析 URL：${error.message}`, true);
  }
}

function prepareUrl(value) {
  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value);
  if (hasProtocol) {
    return { prepared: value, inferredProtocol: false };
  }
  return { prepared: `https://${value}`, inferredProtocol: true };
}

function populateState(url) {
  state.protocol = url.protocol.replace(/:$/, '') || 'https';
  state.hostname = url.hostname;
  state.port = url.port;
  state.pathname = safeDecodePath(url.pathname);
  state.query = Array.from(url.searchParams.entries()).map(([key, value]) =>
    createQueryRow(key, value)
  );
}

function renderBaseFields() {
  document.querySelector('#protocolField').value = state.protocol;
  document.querySelector('#hostnameField').value = state.hostname;
  document.querySelector('#portField').value = state.port;
  document.querySelector('#pathnameField').value = state.pathname;
}

function renderQueryRows(focusIndex = null) {
  queryList.innerHTML = '';
  const fragment = document.createDocumentFragment();
  state.query.forEach((row) => {
    const node = queryTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = row.id;
    const keyInput = node.querySelector("input[name='key']");
    const valueInput = node.querySelector("textarea[name='value']");
    keyInput.value = row.key;
    valueInput.value = row.value;
    autoResize(valueInput);
    fragment.appendChild(node);
  });
  queryList.appendChild(fragment);
  queryCount.value = `${state.query.length} 个参数`;

  if (focusIndex != null) {
    const target = queryList.children[focusIndex];
    if (target) {
      const keyInput = target.querySelector("input[name='key']");
      requestAnimationFrame(() => keyInput?.focus());
    }
  }
}

function rebuildUrlFromState() {
  const hostname = state.hostname.trim();
  if (!hostname) {
    updateStatus('域名不能为空', true);
    return;
  }

  try {
    const protocol = sanitizeProtocol(state.protocol);
    const base = new URL(`${protocol}://${hostname}`);
    base.port = state.port.trim();
    base.pathname = sanitizePath(state.pathname);
    base.search = '';
    state.query.forEach(({ key, value }) => {
      if (!key && !value) return;
      base.searchParams.append(key, value);
    });
    urlInput.value = base.toString();
    updateStatus(`已同步 ${state.query.length} 个参数`);
  } catch (error) {
    updateStatus(`无法生成 URL：${error.message}`, true);
  }
}

function updateQueryRow(id, field, value) {
  const target = state.query.find((row) => row.id === id);
  if (!target) return;
  target[field] = value;
  rebuildUrlFromState();
}

function autoResize(element) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

function removeQueryRow(id) {
  const index = state.query.findIndex((row) => row.id === id);
  if (index === -1) return;
  state.query.splice(index, 1);
  renderQueryRows();
  rebuildUrlFromState();
}

function addQueryRow(key = '', value = '') {
  state.query.push(createQueryRow(key, value));
}

function createQueryRow(key = '', value = '') {
  return { id: `q-${nextQueryId++}`, key, value };
}

function safeDecodePath(pathname) {
  if (!pathname) return '/';
  try {
    return decodeURI(pathname) || '/';
  } catch (error) {
    return pathname;
  }
}

function sanitizePath(value) {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function sanitizeProtocol(value) {
  const fallback = 'https';
  if (!value) return fallback;
  return value.replace(/:$/, '').trim() || fallback;
}

function updateStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle('error', Boolean(isError));
}
