// Configuration
const API_URL = 'http://localhost:3000';

// State
let uploadedFile = null;
let sessionDocuments = [];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initUploadZone();
  initVerifyZone();
  loadStats();
  checkHealth();
});

// === Navigation ===
function initNavigation() {
  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Scroll-based nav background opacity
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// === Upload Zone (Drag & Drop) ===
function initUploadZone() {
  const zone = document.getElementById('dropZone');
  const fileInput = document.getElementById('uploadFileInput');

  ['dragenter', 'dragover'].forEach(event => {
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(event => {
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
    });
  });

  zone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelected(files[0], 'upload');
  });

  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelected(e.target.files[0], 'upload');
  });
}

// === Verify Zone ===
function initVerifyZone() {
  const zone = document.getElementById('verifyDropZone');
  const fileInput = document.getElementById('verifyFileInput');

  ['dragenter', 'dragover'].forEach(event => {
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(event => {
    zone.addEventListener(event, (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
    });
  });

  zone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelected(files[0], 'verify');
  });

  zone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileSelected(e.target.files[0], 'verify');
  });
}

// === Handle File Selection ===
function handleFileSelected(file, mode) {
  if (mode === 'upload') {
    uploadedFile = file;
    showFilePreview(file, 'uploadPreview');
    document.getElementById('uploadActions').style.display = 'flex';
    document.getElementById('aiResultsPanel').style.display = 'none';
  } else {
    showFilePreview(file, 'verifyPreview');
    document.getElementById('verifyActions').style.display = 'flex';
    document.getElementById('verifyResults').style.display = 'none';
  }
}

function showFilePreview(file, containerId) {
  const container = document.getElementById(containerId);
  const sizeStr = file.size < 1024 * 1024
    ? (file.size / 1024).toFixed(1) + ' KB'
    : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
  
  const icon = getFileIcon(file.type);

  container.innerHTML = `
    <div class="file-preview">
      <div class="file-icon">${icon}</div>
      <div class="file-info">
        <span class="file-name">${file.name}</span>
        <span class="file-meta">${sizeStr} • ${file.type || 'Unknown type'}</span>
      </div>
    </div>
  `;
  container.style.display = 'block';
}

function getFileIcon(mimeType) {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType?.includes('word')) return '📝';
  return '📎';
}

// === AI Analysis (Pre-Upload) ===
async function analyzeFile() {
  if (!uploadedFile) return showToast('No file selected', 'error');

  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing...';

  try {
    const formData = new FormData();
    formData.append('file', uploadedFile);

    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed');

    displayAIResults(data.analysis);
    showToast('AI analysis complete', 'success');

  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🤖 Analyze with AI';
  }
}

function displayAIResults(analysis) {
  const panel = document.getElementById('aiResultsPanel');
  panel.style.display = 'block';

  // Animate risk gauge
  animateRiskGauge(analysis.riskScore, analysis.riskLevel);

  // Risk level label
  document.getElementById('riskLevel').textContent = analysis.riskLevel;
  document.getElementById('riskLevel').className = `risk-badge risk-${analysis.riskLevel.toLowerCase()}`;
  document.getElementById('riskScoreValue').textContent = analysis.riskScore;

  // Findings
  const findingsContainer = document.getElementById('findingsList');
  findingsContainer.innerHTML = analysis.findings.map(f => `
    <div class="finding-card finding-${f.severity.toLowerCase()}">
      <div class="finding-header">
        <span class="severity-badge severity-${f.severity.toLowerCase()}">${f.severity}</span>
        <span class="finding-type">${f.type}</span>
      </div>
      <p class="finding-message">${f.message}</p>
      <p class="finding-detail">${f.detail}</p>
    </div>
  `).join('');

  // Recommendations
  const recsContainer = document.getElementById('recommendationsList');
  recsContainer.innerHTML = analysis.recommendations.map(r => `
    <div class="recommendation-card rec-${r.type.toLowerCase()}">
      <span class="rec-icon">${r.icon}</span>
      <span class="rec-message">${r.message}</span>
    </div>
  `).join('');

  // Hashes
  document.getElementById('hashSha256').textContent = analysis.hashes.sha256;
  document.getElementById('hashMd5').textContent = analysis.hashes.md5;

  // Show register button if risk is acceptable
  document.getElementById('registerBtn').style.display = 'inline-flex';

  // Scroll to results
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function animateRiskGauge(score, level) {
  const circle = document.getElementById('riskGaugeCircle');
  const circumference = 2 * Math.PI * 54; // radius 54
  const offset = circumference - (score / 100) * circumference;
  
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;

  // Color based on level
  const colors = { LOW: '#00b894', MEDIUM: '#fdcb6e', HIGH: '#e17055', CRITICAL: '#d63031' };
  circle.style.stroke = colors[level] || '#6c5ce7';

  // Animate
  requestAnimationFrame(() => {
    circle.style.transition = 'stroke-dashoffset 1.5s ease-out';
    circle.style.strokeDashoffset = offset;
  });
}

// === Register Document ===
async function registerDocument() {
  if (!uploadedFile) return showToast('No file selected', 'error');

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Registering on blockchain...';

  try {
    const formData = new FormData();
    formData.append('file', uploadedFile);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');

    // Add to session documents
    sessionDocuments.unshift({
      hash: data.data.hash,
      fileName: data.data.fileName,
      mimeType: data.data.mimeType,
      ipfsCid: data.data.ipfsCid,
      blockNumber: data.data.blockNumber,
      riskScore: data.data.aiAnalysis.riskScore,
      timestamp: new Date().toISOString()
    });
    renderDocumentHistory();
    loadStats();

    showToast('Document registered on blockchain! ✨', 'success');

    // Show success state
    document.getElementById('uploadSuccess').style.display = 'block';
    document.getElementById('successHash').textContent = data.data.hash;
    document.getElementById('successBlock').textContent = data.data.blockNumber;
    document.getElementById('successTx').textContent = data.data.transactionHash;
    document.getElementById('successIpfs').textContent = data.data.ipfsCid;

  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⛓️ Register on Blockchain';
  }
}

// === Verify Document ===
async function verifyDocument() {
  const fileInput = document.getElementById('verifyFileInput');
  const file = fileInput.files[0] || document.getElementById('verifyDropZone')._file;
  
  if (!file) return showToast('No file selected for verification', 'error');

  const btn = document.getElementById('verifyBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Verifying...';

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/verify`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Verification failed');

    displayVerifyResults(data);
    showToast(data.verified ? 'Document verified! ✅' : 'Document not found ❌', data.verified ? 'success' : 'warning');

  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔍 Verify Document';
  }
}

function displayVerifyResults(result) {
  const panel = document.getElementById('verifyResults');
  panel.style.display = 'block';

  const statusClass = result.verified
    ? (result.data?.isRevoked ? 'revoked' : 'verified')
    : 'not-found';
  const statusText = result.verified
    ? (result.data?.isRevoked ? 'REVOKED' : 'VERIFIED')
    : 'NOT FOUND';
  const statusIcon = result.verified
    ? (result.data?.isRevoked ? '⚠️' : '✅')
    : '❌';

  let detailsHtml = '';
  if (result.verified && result.data) {
    detailsHtml = `
      <div class="verify-details">
        <div class="detail-row"><span class="detail-label">File Name</span><span class="detail-value">${result.data.fileName}</span></div>
        <div class="detail-row"><span class="detail-label">SHA-256 Hash</span><span class="detail-value mono">${result.hash}</span></div>
        <div class="detail-row"><span class="detail-label">Uploader</span><span class="detail-value mono">${result.data.uploader}</span></div>
        <div class="detail-row"><span class="detail-label">Registered</span><span class="detail-value">${new Date(result.data.registeredAt).toLocaleString()}</span></div>
        <div class="detail-row"><span class="detail-label">IPFS CID</span><span class="detail-value mono">${result.data.ipfsCid}</span></div>
        <div class="detail-row"><span class="detail-label">Document Type</span><span class="detail-value">${result.data.documentType}</span></div>
        <div class="detail-row"><span class="detail-label">AI Risk Score</span><span class="detail-value">${result.data.aiRiskScore}/100</span></div>
      </div>
    `;
  }

  panel.innerHTML = `
    <div class="verify-status status-${statusClass}">
      <span class="status-icon">${statusIcon}</span>
      <span class="status-text">${statusText}</span>
    </div>
    <p class="verify-message">${result.message}</p>
    ${result.hash ? `<p class="verify-hash">Hash: <code>${result.hash}</code></p>` : ''}
    ${detailsHtml}
  `;

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// === Document History ===
function renderDocumentHistory() {
  const container = document.getElementById('documentHistory');
  const section = document.getElementById('historySection');

  if (sessionDocuments.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  container.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>File Name</th>
          <th>SHA-256 Hash</th>
          <th>IPFS CID</th>
          <th>Risk Score</th>
          <th>Block #</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        ${sessionDocuments.map(doc => `
          <tr>
            <td>${doc.fileName}</td>
            <td class="mono">${doc.hash.slice(0, 16)}...</td>
            <td class="mono">${doc.ipfsCid.slice(0, 16)}...</td>
            <td><span class="risk-badge-sm risk-${getRiskClass(doc.riskScore)}">${doc.riskScore}</span></td>
            <td>${doc.blockNumber}</td>
            <td>${new Date(doc.timestamp).toLocaleTimeString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function getRiskClass(score) {
  if (score <= 15) return 'low';
  if (score <= 40) return 'medium';
  if (score <= 70) return 'high';
  return 'critical';
}

// === Stats ===
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/stats`);
    const data = await response.json();
    if (data.success) {
      animateCounter('statTotal', data.stats.totalDocuments);
      document.getElementById('statContract').textContent = 
        data.stats.contractAddress.slice(0, 10) + '...' + data.stats.contractAddress.slice(-8);
    }
  } catch (error) {
    console.log('Stats unavailable:', error.message);
  }
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  const start = parseInt(el.textContent) || 0;
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// === Health Check ===
async function checkHealth() {
  const indicator = document.getElementById('healthIndicator');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    indicator.classList.add('healthy');
    indicator.title = `Connected • Block #${data.blockNumber}`;
  } catch {
    indicator.classList.add('unhealthy');
    indicator.title = 'Backend disconnected';
  }
}

// === Toast Notifications ===
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// === Reset Upload ===
function resetUpload() {
  uploadedFile = null;
  document.getElementById('uploadFileInput').value = '';
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('uploadActions').style.display = 'none';
  document.getElementById('aiResultsPanel').style.display = 'none';
  document.getElementById('uploadSuccess').style.display = 'none';
}