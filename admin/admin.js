let data = null;
let postsData = null;
let tcbData = null;
let dirty = false;
let postsDirty = false;
let tcbDirty = false;

// ===== GitHub API integration =====
const GH_OWNER = 'kintaGitLabo';
const GH_REPO = 'shinshindo-kyukyubako';
const GH_BRANCH = 'main';

function getToken() {
  return localStorage.getItem('ghToken') || '';
}
function setToken(t) {
  if (t) localStorage.setItem('ghToken', t);
  else localStorage.removeItem('ghToken');
}
function toast(msg, type = 'info') {
  const t = document.getElementById('publish-toast');
  t.textContent = msg;
  t.style.background = type === 'error' ? '#c0392b' : type === 'success' ? '#2ecc71' : '#333';
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.hidden = true; }, 5000);
}

// UTF-8 safe base64 encode
function b64(str) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`, {
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghPut(path, content, message) {
  const token = getToken();
  if (!token) throw new Error('GitHubトークンが未設定です。設定から登録してください。');
  const current = await ghGet(path);
  const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: b64(content), sha: current.sha, branch: GH_BRANCH })
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function publishVideos() {
  const btn = document.getElementById('publish-videos');
  btn.disabled = true;
  btn.textContent = '保存中...';
  try {
    await ghPut('data/videos.json', JSON.stringify(data, null, 2), 'Update videos.json via admin panel');
    dirty = false; cleanFlag();
    toast('✅ サイト情報・動画データを保存しました。30秒〜2分で公開版に反映されます。', 'success');
  } catch (e) {
    toast('❌ 保存失敗: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 GitHubに保存（サイト・動画）';
  }
}

async function publishPosts() {
  const btn = document.getElementById('publish-posts');
  btn.disabled = true;
  btn.textContent = '保存中...';
  try {
    await ghPut('data/posts.json', JSON.stringify(postsData, null, 2), 'Update posts.json via admin panel');
    postsDirty = false;
    toast('✅ 投稿データを保存しました。30秒〜2分で公開版に反映されます。', 'success');
  } catch (e) {
    toast('❌ 保存失敗: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 GitHubに保存（投稿）';
  }
}

function initSettings() {
  const input = document.getElementById('gh-token');
  const status = document.getElementById('token-status');
  const stored = getToken();
  if (stored) {
    input.placeholder = '保存済み: ' + stored.slice(0, 10) + '...（変更する場合のみ入力）';
    status.textContent = '✓ トークンは保存済みです';
    status.style.color = '#2ecc71';
  }
  document.getElementById('save-token').onclick = () => {
    const v = input.value.trim();
    if (!v) { status.textContent = 'トークンを入力してください'; status.style.color = '#c0392b'; return; }
    setToken(v);
    input.value = '';
    input.placeholder = '保存済み: ' + v.slice(0, 10) + '...';
    status.textContent = '✓ 保存しました'; status.style.color = '#2ecc71';
  };
  document.getElementById('clear-token').onclick = () => {
    if (confirm('保存済みトークンを削除しますか？')) {
      setToken('');
      input.value = ''; input.placeholder = 'github_pat_...';
      status.textContent = 'トークンを削除しました'; status.style.color = '#c0392b';
    }
  };
  document.getElementById('test-token').onclick = async () => {
    if (!getToken()) { status.textContent = 'トークンを先に保存してください'; status.style.color = '#c0392b'; return; }
    status.textContent = '接続中...'; status.style.color = '#666';
    try {
      await ghGet('data/videos.json');
      status.textContent = '✅ 接続成功。書き込み可能です。';
      status.style.color = '#2ecc71';
    } catch (e) {
      status.textContent = '❌ 接続失敗: ' + e.message;
      status.style.color = '#c0392b';
    }
  };
  document.getElementById('publish-videos').onclick = publishVideos;
  document.getElementById('publish-posts').onclick = publishPosts;
}
initSettings();

const $ = sel => document.querySelector(sel);
const flag = () => {
  dirty = true;
  document.getElementById('dirty-flag').textContent = '未保存の変更があります';
  document.getElementById('dirty-flag').classList.add('dirty');
};
const cleanFlag = () => {
  dirty = false;
  document.getElementById('dirty-flag').textContent = '保存済み';
  document.getElementById('dirty-flag').classList.remove('dirty');
};

function get(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
function set(obj, path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
  target[last] = val;
}

async function loadFromServer() {
  const res = await fetch('../data/videos.json?t=' + Date.now());
  data = await res.json();
  render();
  cleanFlag();
}

function bindInputs(scope = document) {
  scope.querySelectorAll('[data-path]').forEach(el => {
    el.value = get(data, el.dataset.path) ?? '';
    el.oninput = () => { set(data, el.dataset.path, el.value); flag(); };
  });
}

function bindArrayTextarea(scope, path, textarea) {
  textarea.value = (get(data, path) || []).join('\n');
  textarea.oninput = () => {
    set(data, path, textarea.value.split('\n').map(s => s.trim()).filter(Boolean));
    flag();
  };
}

function renderVideos() {
  const box = document.getElementById('videos');
  box.innerHTML = '';
  data.videos.forEach((v, i) => {
    const cats = data.categories.map(c => `<option value="${c.slug}" ${c.slug===v.category?'selected':''}>${c.name}</option>`).join('');
    const details = document.createElement('details');
    details.className = 'video-item card';
    details.innerHTML = `
      <summary>
        <span>${i+1}. ${v.title} ${v.published?'':'（非公開）'}</span>
        <span class="flag">/support/${v.slug}/</span>
      </summary>
      <div class="row"><label>タイトル</label><input data-vpath="title"></div>
      <div class="row"><label>スラッグ</label><input data-vpath="slug"></div>
      <div class="row"><label>カテゴリ</label><select data-vpath="category">${cats}</select></div>
      <div class="row"><label>タグ（カンマ区切り）</label><input data-vtags></div>
      <div class="row"><label>動画URL</label><input data-vpath="videoUrl" placeholder="YouTube URL"></div>
      <div class="row"><label>動画の向き</label><select data-vorient><option value="landscape" ${v.orientation!=='portrait'?'selected':''}>横型（16:9）</option><option value="portrait" ${v.orientation==='portrait'?'selected':''}>縦型（9:16 iPhone等）</option></select></div>
      <div class="row"><label>サムネイル</label><input data-vpath="thumbnail"></div>
      <div class="row"><label>説明文</label><textarea data-vpath="description"></textarea></div>
      <div class="row"><label>対象症状（1行1件）</label><textarea data-vlist="targetSymptoms"></textarea></div>
      <div class="row"><label>注意事項（1行1件）</label><textarea data-vlist="cautions"></textarea></div>
      <div class="row"><label>使用テープ（1行1件）</label><textarea data-vlist="tapes"></textarea></div>
      <div class="row"><label>巻き方ポイント（1行1件）</label><textarea data-vlist="tips"></textarea></div>
      <div class="row"><label>プロモ用タイトル</label><input data-vpath="promoTitle"></div>
      <div class="row"><label>プロモ用説明文</label><textarea data-vpath="promoShort"></textarea></div>
      <div class="row"><label>公開</label><select data-vpub><option value="true" ${v.published?'selected':''}>公開</option><option value="false" ${!v.published?'selected':''}>非公開</option></select></div>
      <div class="row"><label>表示順</label><input type="number" data-vpath="order"></div>

      <div class="actions">
        <button data-act="preview">プレビュー</button>
        <button data-act="qr">QRコード生成</button>
        <button data-act="up">↑上へ</button>
        <button data-act="down">↓下へ</button>
        <button data-act="del" class="danger">削除</button>
      </div>
      <div class="qr-container"></div>
    `;

    // bind fields
    details.querySelectorAll('[data-vpath]').forEach(el => {
      const key = el.dataset.vpath;
      el.value = v[key] ?? '';
      el.oninput = () => {
        v[key] = el.type === 'number' ? Number(el.value) : el.value;
        flag();
      };
    });
    const tagsInput = details.querySelector('[data-vtags]');
    tagsInput.value = (v.tags || []).join(', ');
    tagsInput.oninput = () => {
      v.tags = tagsInput.value.split(',').map(s => s.trim()).filter(Boolean);
      flag();
    };
    details.querySelectorAll('[data-vlist]').forEach(el => {
      const key = el.dataset.vlist;
      el.value = (v[key] || []).join('\n');
      el.oninput = () => {
        v[key] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
        flag();
      };
    });
    const pubSel = details.querySelector('[data-vpub]');
    pubSel.onchange = () => { v.published = pubSel.value === 'true'; flag(); };
    const orientSel = details.querySelector('[data-vorient]');
    orientSel.onchange = () => { v.orientation = orientSel.value; flag(); };

    // actions
    details.querySelector('[data-act="preview"]').onclick = () => {
      window.open(`../support/${v.slug}/`, '_blank');
    };
    details.querySelector('[data-act="qr"]').onclick = () => {
      const container = details.querySelector('.qr-container');
      const url = `${location.origin}/support/${v.slug}/`;
      container.innerHTML = '';
      const box = document.createElement('div');
      box.className = 'qr-box';
      const target = document.createElement('div');
      box.appendChild(target);
      new QRCode(target, { text: url, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
      // qrcodejs renders both canvas + img; grab canvas for PNG
      setTimeout(() => {
        const canvas = target.querySelector('canvas');
        if (canvas) {
          const dl = document.createElement('a');
          dl.textContent = `PNGダウンロード: qr-${v.slug}.png`;
          dl.style.display = 'block';
          dl.style.marginTop = '6px';
          dl.href = canvas.toDataURL('image/png');
          dl.download = `qr-${v.slug}.png`;
          box.appendChild(dl);
        }
        const urlLine = document.createElement('div');
        urlLine.style.fontSize = '11px';
        urlLine.style.color = '#666';
        urlLine.textContent = url;
        box.appendChild(urlLine);
      }, 100);
      container.appendChild(box);
    };
    details.querySelector('[data-act="up"]').onclick = () => { if (i>0) { [data.videos[i-1], data.videos[i]] = [data.videos[i], data.videos[i-1]]; flag(); renderVideos(); } };
    details.querySelector('[data-act="down"]').onclick = () => { if (i<data.videos.length-1) { [data.videos[i+1], data.videos[i]] = [data.videos[i], data.videos[i+1]]; flag(); renderVideos(); } };
    details.querySelector('[data-act="del"]').onclick = () => {
      if (confirm(`「${v.title}」を削除しますか？`)) { data.videos.splice(i,1); flag(); renderVideos(); }
    };

    box.appendChild(details);
  });
}

function render() {
  bindInputs();
  renderVideos();
}

document.getElementById('reload-server').onclick = () => {
  if (dirty && !confirm('未保存の変更が失われます。再読込しますか？')) return;
  loadFromServer();
};
document.getElementById('load-file').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => { data = JSON.parse(r.result); render(); cleanFlag(); };
  r.readAsText(file);
};
document.getElementById('download').onclick = () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'videos.json';
  a.click();
  cleanFlag();
};
document.getElementById('add-video').onclick = () => {
  const maxOrder = data.videos.reduce((m,v)=>Math.max(m, v.order||0), 0);
  data.videos.push({
    slug: 'new-video-' + Date.now(),
    title: '新しい動画', category: data.categories[0]?.slug || '',
    tags: [], videoUrl: '', thumbnail: '', description: '',
    targetSymptoms: [], cautions: [], tapes: [], tips: [],
    promoTitle: '', promoShort: '', orientation: 'landscape',
    published: false, order: maxOrder + 1
  });
  flag();
  renderVideos();
};

window.addEventListener('beforeunload', e => {
  if (dirty || postsDirty || tcbDirty) { e.preventDefault(); e.returnValue = ''; }
});

loadFromServer();
loadTcb();

// ---------- Instagram posts ----------
async function loadPosts() {
  const res = await fetch('../data/posts.json?t=' + Date.now());
  postsData = await res.json();
  renderPostsAdmin();
}

function flagPosts() {
  postsDirty = true;
}

function renderPostsAdmin() {
  const box = document.getElementById('posts-admin');
  box.innerHTML = '';
  (postsData.posts || []).forEach((p, i) => {
    const details = document.createElement('details');
    details.className = 'video-item';
    details.style.background = '#fff';
    details.style.border = '1px solid var(--color-border)';
    details.style.borderRadius = 'var(--radius)';
    details.style.padding = '10px 14px';
    details.style.margin = '8px 0';
    const audChecks = postsData.audiences.map(a =>
      `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:13px;">
        <input type="checkbox" data-aud="${a.slug}" ${(p.audience||[]).includes(a.slug)?'checked':''}> ${a.name}
      </label>`
    ).join('');
    details.innerHTML = `
      <summary>${i+1}. ${p.url || '(未入力)'} ${p.published===false?'（非公開）':''}</summary>
      <div class="row"><label>Instagram URL</label><input data-ppath="url" placeholder="https://www.instagram.com/p/xxxx/"></div>
      <div class="row"><label>対象</label><div>${audChecks}</div></div>
      <div class="row"><label>院からの一言</label><textarea data-ppath="comment" placeholder="任意"></textarea></div>
      <div class="row"><label>公開日</label><input type="date" data-ppath="publishedAt"></div>
      <div class="row"><label>公開</label><select data-ppub><option value="true" ${p.published!==false?'selected':''}>公開</option><option value="false" ${p.published===false?'selected':''}>非公開</option></select></div>
      <div class="actions">
        <button data-pact="up">↑上へ</button>
        <button data-pact="down">↓下へ</button>
        <button data-pact="del" class="danger">削除</button>
      </div>
    `;
    details.querySelectorAll('[data-ppath]').forEach(el => {
      const key = el.dataset.ppath;
      el.value = p[key] ?? '';
      el.oninput = () => { p[key] = el.value; flagPosts(); };
    });
    details.querySelectorAll('[data-aud]').forEach(cb => {
      cb.onchange = () => {
        p.audience = p.audience || [];
        if (cb.checked) { if (!p.audience.includes(cb.dataset.aud)) p.audience.push(cb.dataset.aud); }
        else { p.audience = p.audience.filter(x => x !== cb.dataset.aud); }
        flagPosts();
      };
    });
    const pubSel = details.querySelector('[data-ppub]');
    pubSel.onchange = () => { p.published = pubSel.value === 'true'; flagPosts(); };
    details.querySelector('[data-pact="up"]').onclick = () => { if (i>0) { [postsData.posts[i-1], postsData.posts[i]] = [postsData.posts[i], postsData.posts[i-1]]; flagPosts(); renderPostsAdmin(); } };
    details.querySelector('[data-pact="down"]').onclick = () => { if (i<postsData.posts.length-1) { [postsData.posts[i+1], postsData.posts[i]] = [postsData.posts[i], postsData.posts[i+1]]; flagPosts(); renderPostsAdmin(); } };
    details.querySelector('[data-pact="del"]').onclick = () => {
      if (confirm('この投稿を削除しますか？')) { postsData.posts.splice(i,1); flagPosts(); renderPostsAdmin(); }
    };
    box.appendChild(details);
  });
}

document.getElementById('add-post').onclick = () => {
  const today = new Date().toISOString().slice(0,10);
  postsData.posts.unshift({ url:'', audience:[], comment:'', publishedAt: today, published:true });
  flagPosts();
  renderPostsAdmin();
};
document.getElementById('download-posts').onclick = () => {
  const blob = new Blob([JSON.stringify(postsData, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'posts.json';
  a.click();
  postsDirty = false;
};

loadPosts();

// ---------- TEAM CARE BOX links ----------
async function loadTcb() {
  try {
    const res = await fetch('../data/tcb-links.json?t=' + Date.now());
    tcbData = await res.json();
  } catch (e) {
    console.error('[tcb] load failed', e);
    tcbData = { cta: { taping: {}, symptom: {}, selfcare: {} } };
  }
  renderTcb();
  renderTcbStats();
}

function flagTcb() {
  tcbDirty = true;
  const el = document.getElementById('dirty-flag');
  el.textContent = '未保存の変更があります';
  el.classList.add('dirty');
}

function renderTcb() {
  document.querySelectorAll('#tcb-card [data-tpath]').forEach(el => {
    el.value = get(tcbData, el.dataset.tpath) ?? '';
    el.oninput = () => { set(tcbData, el.dataset.tpath, el.value); flagTcb(); };
  });
}

function renderTcbStats() {
  const box = document.getElementById('tcb-stats');
  if (!box) return;
  let counts = {};
  try {
    const raw = localStorage.getItem('tcb_click_count');
    if (raw) counts = JSON.parse(raw);
  } catch (_) {}
  const labels = {
    taping: '① テーピング（初回タップ）',
    symptom: '② 症状絞り込み（初回タップ）',
    selfcare: '③ セルフケア（初回タップ）',
    taping_reopen: '① テーピング（再訴求ボタン）',
    symptom_reopen: '② 症状絞り込み（再訴求ボタン）',
    selfcare_reopen: '③ セルフケア（再訴求ボタン）',
    line: 'LINEで相談',
    reserve: '来院予約',
    refill: 'テーピング補充'
  };
  const rows = Object.keys(labels).map(k => {
    const c = counts[k] || 0;
    return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #eee;"><span>${labels[k]}</span><strong>${c}</strong></div>`;
  }).join('');
  box.innerHTML = rows + `<p style="font-size:11px;color:#999;margin:8px 0 0;">合計: ${Object.values(counts).reduce((a,b)=>a+b,0)}</p>`;
}

async function publishTcb() {
  const btn = document.getElementById('tcb-publish');
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = '保存中...';
  try {
    await ghPut('data/tcb-links.json', JSON.stringify(tcbData, null, 2), 'Update tcb-links.json via admin panel');
    tcbDirty = false;
    if (!dirty && !postsDirty) cleanFlag();
    toast('✅ TCBリンクを保存しました。30秒〜2分で公開版に反映されます。', 'success');
  } catch (e) {
    toast('❌ 保存失敗: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

document.getElementById('tcb-reload').onclick = () => {
  if (tcbDirty && !confirm('未保存の変更が失われます。再読込しますか？')) return;
  loadTcb();
};

document.getElementById('tcb-download').onclick = () => {
  const blob = new Blob([JSON.stringify(tcbData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tcb-links.json';
  a.click();
};

document.getElementById('tcb-publish').onclick = publishTcb;

document.getElementById('tcb-preview').onclick = () => {
  window.open('../team-care-box/', '_blank');
};

document.getElementById('tcb-qr').onclick = () => {
  const container = document.getElementById('tcb-qr-container');
  // Compose the public URL of the LP based on the current origin.
  // On GitHub Pages the base path is /shinshindo-kyukyubako/team-care-box/
  // Locally it's /team-care-box/ — respect whatever origin+path we're on.
  const base = location.origin + location.pathname.replace(/\/admin\/.*$/, '');
  const url = base + '/team-care-box/';
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'qr-box';
  const target = document.createElement('div');
  box.appendChild(target);
  new QRCode(target, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  setTimeout(() => {
    const canvas = target.querySelector('canvas');
    if (canvas) {
      const dl = document.createElement('a');
      dl.textContent = '📥 PNGダウンロード: qr-team-care-box.png';
      dl.style.display = 'block';
      dl.style.marginTop = '8px';
      dl.style.color = 'var(--color-primary-dark)';
      dl.href = canvas.toDataURL('image/png');
      dl.download = 'qr-team-care-box.png';
      box.appendChild(dl);
    }
    const urlLine = document.createElement('div');
    urlLine.style.fontSize = '11px';
    urlLine.style.color = '#666';
    urlLine.style.marginTop = '4px';
    urlLine.style.wordBreak = 'break-all';
    urlLine.textContent = url;
    box.appendChild(urlLine);
  }, 100);
  container.appendChild(box);
};

document.getElementById('tcb-stats-clear').onclick = () => {
  if (!confirm('この端末に保存されているクリックカウントをリセットしますか？')) return;
  localStorage.removeItem('tcb_click_count');
  renderTcbStats();
};
