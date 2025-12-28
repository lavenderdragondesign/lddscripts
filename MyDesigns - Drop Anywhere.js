// ==UserScript==
// @name         MyDesigns - Drop Anywhere (Multi-Drop Queue + Folder Drop + LDD Overlay)
// @match        https://https://mydesigns.io/app/listings
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const DEBUG = true;

  const LDD_LOGO_URL =
    'https://raw.githubusercontent.com/lavenderdragondesign/lddupscalermodels/main/download%20(21).png';

  const AUTO_CLICK_UPLOAD_ALL = true;
  const AUTO_CONFIRM_UPLOAD_DESIGNS = true;

  const UPLOAD_ALL_TIMEOUT_MS = 20000;
  const CONFIRM_TIMEOUT_MS = 20000;

  const FOLDER_DROP_ENABLED = true;
  const MAX_FILES_PER_DROP = 2000;
  const SORT_FILES = true;

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const log = (...a) => DEBUG && console.log('[LDD Drop]', ...a);
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  // =============================
  // MULTI-DROP QUEUE
  // =============================
  const dropQueue = [];
  let processingQueue = false;
  let armed = true;

  // =============================
  // OVERLAY
  // =============================
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    display: none; align-items: center; justify-content: center;
    background: rgba(12,8,18,.65);
    backdrop-filter: blur(6px);
    font-family: system-ui;
    color: #fff;
  `;

  overlay.innerHTML = `
    <div id="lddCard" style="
      width: min(520px, 92vw);
      border-radius: 22px;
      padding: 18px;
      background: linear-gradient(135deg, rgba(170,110,255,.22), rgba(0,214,255,.14));
      border: 1px solid rgba(255,255,255,.16);
      box-shadow: 0 20px 60px rgba(0,0,0,.5);
    ">
      <div style="display:flex; gap:14px; align-items:center;">
        <img src="${LDD_LOGO_URL}" style="width:48px;height:48px" />
        <div>
          <div style="font-weight:800;font-size:18px">
            LavenderDragonDesign Upload Assist
          </div>
          <div id="lddStatus" style="font-size:13px;opacity:.9">
            Drop files or folders
          </div>
        </div>
      </div>
      <div style="margin-top:12px;font-size:12px;opacity:.8">
        Made with ❤️ by LavenderDragonDesign
      </div>
    </div>
  `;
  document.documentElement.appendChild(overlay);

  const statusEl = () => document.getElementById('lddStatus');
  const setStatus = (t) => statusEl() && (statusEl().textContent = t);
  const showOverlay = (t) => { setStatus(t); overlay.style.display = 'flex'; };
  const hideOverlay = () => overlay.style.display = 'none';

  // =============================
  // HELPERS
  // =============================
  function hardClick(el) {
    if (!el) return;
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }

  function findButtonByText(text) {
    const t = norm(text);
    return [...document.querySelectorAll('button')]
      .find(b => norm(b.textContent).includes(t));
  }

  function findUploadModal() {
    return [...document.querySelectorAll('div')]
      .find(d => d.textContent?.includes('Drag and drop files'));
  }

  function findDropTarget(modal) {
    return modal?.querySelector('[class*="border-dashed"]') ||
           modal?.querySelector('div');
  }

  function fireDrop(target, files) {
    const dt = new DataTransfer();
    files.forEach(f => dt.items.add(f));
    target.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    }));
  }

  async function expandDrop(e) {
    const files = [...(e.dataTransfer?.files || [])];
    if (!FOLDER_DROP_ENABLED) return files;

    const items = [...(e.dataTransfer?.items || [])];
    const out = [];

    async function walk(entry, path = '') {
      if (out.length >= MAX_FILES_PER_DROP) return;
      if (entry.isFile) {
        entry.file(f => {
          out.push(new File([f], path + f.name, { type: f.type }));
        });
      }
      if (entry.isDirectory) {
        const reader = entry.createReader();
        reader.readEntries(entries =>
          entries.forEach(en => walk(en, path + entry.name + '/'))
        );
      }
    }

    for (const it of items) {
      const entry = it.webkitGetAsEntry?.();
      if (entry) await walk(entry);
    }

    await sleep(300);
    return out.length ? out : files;
  }

  // =============================
  // QUEUE PROCESSOR
  // =============================
  async function processQueue() {
    if (processingQueue) return;
    processingQueue = true;
    armed = false;

    while (dropQueue.length) {
      const files = dropQueue.shift();
      showOverlay(`Uploading ${files.length} files • ${dropQueue.length} queued`);

      const uploadBtn = findButtonByText('Upload');
      if (uploadBtn) hardClick(uploadBtn);
      await sleep(300);

      const uploadFilesBtn = findButtonByText('Upload Files');
      if (uploadFilesBtn) hardClick(uploadFilesBtn);

      let modal;
      for (let i = 0; i < 50; i++) {
        modal = findUploadModal();
        if (modal) break;
        await sleep(100);
      }
      if (!modal) continue;

      const target = findDropTarget(modal);
      fireDrop(target, files);

      if (AUTO_CLICK_UPLOAD_ALL) {
        for (let i = 0; i < 200; i++) {
          const btn = findButtonByText('Upload All');
          if (btn && !btn.disabled) {
            hardClick(btn);
            break;
          }
          await sleep(100);
        }
      }

      if (AUTO_CONFIRM_UPLOAD_DESIGNS) {
        for (let i = 0; i < 200; i++) {
          const btn = findButtonByText('Upload designs');
          if (btn && !btn.disabled) {
            hardClick(btn);
            break;
          }
          await sleep(100);
        }
      }

      await sleep(1000);
    }

    hideOverlay();
    processingQueue = false;
    armed = true;
  }

  // =============================
  // DRAG EVENTS
  // =============================
  window.addEventListener('dragover', e => {
    if (!armed) return;
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      showOverlay('Drop files or folders');
    }
  }, true);

  window.addEventListener('drop', async e => {
    if (!armed) return;
    e.preventDefault();
    e.stopPropagation();

    const files = await expandDrop(e);
    if (!files.length) return;

    dropQueue.push(files);
    log('Queued batch:', files.length);

    processQueue();
  }, true);

  log('LDD Multi-Drop uploader active ✅');
})();
