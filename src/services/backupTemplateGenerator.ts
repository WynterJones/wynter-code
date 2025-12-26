/**
 * Backup Template Generator - Creates self-contained recovery HTML page
 */

import type { EncryptedPayload, BackupMetadata } from "@/types/webBackup";
import { getDecryptionScript } from "./encryption";

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generate the recovery HTML page with embedded encrypted data
 */
export function generateRecoveryHtml(
  payload: EncryptedPayload,
  metadata: BackupMetadata
): string {
  const decryptionScript = getDecryptionScript();
  const payloadJson = JSON.stringify(payload);
  const backupDate = formatDate(metadata.exportedAt);
  const categoryList = metadata.categories.join(", ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="googlebot" content="noindex, nofollow">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Wynter Code Backup</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      width: 100%;
      max-width: 420px;
      text-align: center;
    }

    .lock-container {
      background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 48px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .lock-icon {
      width: 80px;
      height: 80px;
      margin-bottom: 24px;
      transition: transform 0.3s ease;
    }

    .lock-icon.unlocked {
      transform: translateY(-4px);
    }

    .lock-icon path {
      fill: #404040;
      transition: fill 0.3s ease;
    }

    .lock-icon.unlocked path {
      fill: #22c55e;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #ffffff;
    }

    .backup-info {
      font-size: 13px;
      color: #666;
      margin-bottom: 32px;
    }

    .backup-date {
      color: #888;
    }

    .input-group {
      position: relative;
      margin-bottom: 16px;
    }

    input[type="password"] {
      width: 100%;
      padding: 16px 20px;
      font-size: 16px;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 10px;
      color: #fff;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    input[type="password"]:focus {
      border-color: #555;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.05);
    }

    input[type="password"]::placeholder {
      color: #555;
    }

    .btn {
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      font-weight: 500;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-primary {
      background: #ffffff;
      color: #0a0a0a;
    }

    .btn-primary:hover:not(:disabled) {
      background: #e5e5e5;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      background: #333;
      color: #666;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      color: #888;
      border: 1px solid #333;
      margin-top: 12px;
    }

    .btn-secondary:hover {
      background: #1a1a1a;
      border-color: #444;
    }

    .error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
    }

    .error.visible {
      display: block;
    }

    .progress {
      display: none;
      margin-bottom: 16px;
    }

    .progress.visible {
      display: block;
    }

    .progress-bar {
      height: 4px;
      background: #222;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #4ade80);
      border-radius: 2px;
      transition: width 0.3s ease;
      width: 0%;
    }

    .progress-text {
      font-size: 13px;
      color: #888;
    }

    .success {
      display: none;
    }

    .success.visible {
      display: block;
    }

    .success-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .success-icon path {
      fill: #22c55e;
    }

    .success h2 {
      font-size: 20px;
      margin-bottom: 8px;
      color: #22c55e;
    }

    .success p {
      color: #888;
      margin-bottom: 24px;
    }

    .download-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #444;
    }

    .footer a {
      color: #666;
      text-decoration: none;
    }

    .footer a:hover {
      color: #888;
    }

    .hidden {
      display: none !important;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-8px); }
      75% { transform: translateX(8px); }
    }

    .shake {
      animation: shake 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="lock-container">
      <!-- Lock Icon -->
      <svg class="lock-icon" id="lockIcon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path id="lockPath" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
      </svg>

      <!-- Decrypt Form -->
      <div id="decryptForm">
        <h1>Wynter Code Backup</h1>
        <p class="backup-info">
          <span class="backup-date">${backupDate}</span><br>
          <span style="font-size: 11px; color: #555;">Categories: ${categoryList}</span>
        </p>

        <div id="error" class="error"></div>

        <div id="progress" class="progress">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <p class="progress-text" id="progressText">Decrypting...</p>
        </div>

        <form id="form" onsubmit="handleSubmit(event)">
          <div class="input-group">
            <input
              type="password"
              id="password"
              placeholder="Enter backup password"
              autocomplete="off"
              required
            />
          </div>

          <button type="submit" class="btn btn-primary" id="submitBtn">
            <span id="btnText">Unlock</span>
          </button>
        </form>
      </div>

      <!-- Success State -->
      <div id="successState" class="success">
        <svg class="success-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <h2>Backup Unlocked</h2>
        <p>Your data has been decrypted successfully.</p>

        <div class="download-options">
          <button class="btn btn-primary" onclick="downloadJson()">
            Download JSON
          </button>
          <button class="btn btn-secondary" onclick="copyToClipboard()">
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>

    <p class="footer">
      Encrypted with AES-256-GCM &bull; <a href="https://github.com/wynter-code" target="_blank">Wynter Code</a>
    </p>
  </div>

  <script>
    // Embedded encrypted backup data
    const ENCRYPTED_PAYLOAD = ${payloadJson};
    const BACKUP_DATE = "${backupDate}";

    // Decryption library
    ${decryptionScript}

    // State
    let decryptedData = null;

    // DOM elements
    const form = document.getElementById('form');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const errorEl = document.getElementById('error');
    const progressEl = document.getElementById('progress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const decryptFormEl = document.getElementById('decryptForm');
    const successState = document.getElementById('successState');
    const lockIcon = document.getElementById('lockIcon');
    const lockPath = document.getElementById('lockPath');

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
      passwordInput.classList.add('shake');
      setTimeout(() => passwordInput.classList.remove('shake'), 300);
    }

    function hideError() {
      errorEl.classList.remove('visible');
    }

    function showProgress(percent, text) {
      progressEl.classList.add('visible');
      progressFill.style.width = percent + '%';
      progressText.textContent = text;
    }

    function hideProgress() {
      progressEl.classList.remove('visible');
    }

    function showSuccess() {
      decryptFormEl.classList.add('hidden');
      successState.classList.add('visible');
      lockIcon.classList.add('unlocked');
      // Change to unlocked lock icon
      lockPath.setAttribute('d', 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z');
    }

    async function handleSubmit(e) {
      e.preventDefault();
      hideError();

      const password = passwordInput.value;
      if (!password) {
        showError('Please enter your backup password');
        return;
      }

      submitBtn.disabled = true;
      btnText.textContent = 'Decrypting...';

      try {
        showProgress(20, 'Decrypting...');

        const decrypted = await decryptBackup(ENCRYPTED_PAYLOAD, password);

        showProgress(60, 'Decompressing...');

        // Decompress using JSZip (inline minimal implementation)
        const decompressed = await decompressBackup(decrypted);

        showProgress(90, 'Parsing data...');

        decryptedData = JSON.parse(decompressed);

        showProgress(100, 'Complete!');

        setTimeout(() => {
          hideProgress();
          showSuccess();
        }, 500);

      } catch (error) {
        hideProgress();
        submitBtn.disabled = false;
        btnText.textContent = 'Unlock';

        if (error.message === 'Incorrect password') {
          showError('Incorrect password. Please try again.');
        } else {
          showError('Failed to decrypt: ' + error.message);
        }
      }
    }

    async function decompressBackup(data) {
      // Simple inflate implementation for the backup.json file
      // The backup is a ZIP file containing backup.json
      const zip = new Blob([data], { type: 'application/zip' });

      // Use native DecompressionStream if available, otherwise fallback
      if (typeof DecompressionStream !== 'undefined') {
        try {
          // Try to find backup.json in the zip
          // For simplicity, we'll use a minimal zip parser
          return await parseZipAndExtract(data);
        } catch {
          throw new Error('Failed to decompress backup');
        }
      } else {
        throw new Error('Browser does not support decompression');
      }
    }

    // Minimal ZIP parser to extract backup.json
    async function parseZipAndExtract(zipData) {
      const view = new DataView(zipData.buffer);
      let offset = 0;

      // Find local file header (PK signature)
      while (offset < zipData.length - 4) {
        if (view.getUint32(offset, true) === 0x04034b50) {
          // Local file header found
          const compressedSize = view.getUint32(offset + 18, true);
          const uncompressedSize = view.getUint32(offset + 22, true);
          const fileNameLength = view.getUint16(offset + 26, true);
          const extraLength = view.getUint16(offset + 28, true);
          const compressionMethod = view.getUint16(offset + 8, true);

          const fileNameStart = offset + 30;
          const fileName = new TextDecoder().decode(
            zipData.slice(fileNameStart, fileNameStart + fileNameLength)
          );

          if (fileName === 'backup.json') {
            const dataStart = fileNameStart + fileNameLength + extraLength;
            const compressedData = zipData.slice(dataStart, dataStart + compressedSize);

            if (compressionMethod === 8) {
              // DEFLATE compression
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              const reader = ds.readable.getReader();

              writer.write(compressedData);
              writer.close();

              const chunks = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }

              const decompressed = new Uint8Array(
                chunks.reduce((acc, chunk) => acc + chunk.length, 0)
              );
              let pos = 0;
              for (const chunk of chunks) {
                decompressed.set(chunk, pos);
                pos += chunk.length;
              }

              return new TextDecoder().decode(decompressed);
            } else if (compressionMethod === 0) {
              // No compression
              return new TextDecoder().decode(compressedData);
            }
          }

          // Move to next file
          offset = fileNameStart + fileNameLength + extraLength + compressedSize;
        } else {
          offset++;
        }
      }

      throw new Error('backup.json not found in archive');
    }

    function downloadJson() {
      if (!decryptedData) return;

      const json = JSON.stringify(decryptedData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'wynter-code-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    async function copyToClipboard() {
      if (!decryptedData) return;

      try {
        const json = JSON.stringify(decryptedData, null, 2);
        await navigator.clipboard.writeText(json);
        alert('Copied to clipboard!');
      } catch {
        alert('Failed to copy to clipboard');
      }
    }

    // Focus password input on load
    passwordInput.focus();
  </script>
</body>
</html>`;
}
