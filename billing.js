'use strict';
// ---- 有料版（月額480円）：パスキーの会員・Stripe の支払い・すべてのステージと曲 ----
// サーバーは vocal-billing（このサイトの /api/*）。index.html の本体より先に読み込み、本体の定数は関数の中でだけ使う

// 有料版の案内を出し、ステージに鍵をかけるか。止めるときは false にする（鍵もなくなる）
const BILLING_ON = true;
const PRICE_LABEL = '月480円';

let account = { signedIn: false, paid: false, name: '', customer: false, periodEnd: 0, cancelAtEnd: false };

const apiPost = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `エラー（${res.status}）`);
  return data;
};
const apiGet = async (url) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `エラー（${res.status}）`);
  return data;
};

// ---- パスキー（学習記録 my.habatakijuku.com の app.js と同じ変換） ----
const toBytes = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};
const toB64url = (buf) => {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const creationOptions = (o) => ({
  ...o,
  challenge: toBytes(o.challenge),
  user: { ...o.user, id: toBytes(o.user.id) },
  excludeCredentials: (o.excludeCredentials || []).map((c) => ({ ...c, id: toBytes(c.id) })),
});
const requestOptions = (o) => ({
  ...o,
  challenge: toBytes(o.challenge),
  allowCredentials: (o.allowCredentials || []).map((c) => ({ ...c, id: toBytes(c.id) })),
});
const registrationJSON = (cred) => ({
  id: cred.id,
  rawId: toB64url(cred.rawId),
  type: cred.type,
  response: {
    clientDataJSON: toB64url(cred.response.clientDataJSON),
    attestationObject: toB64url(cred.response.attestationObject),
    transports: cred.response.getTransports ? cred.response.getTransports() : [],
  },
  clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
  authenticatorAttachment: cred.authenticatorAttachment || undefined,
});
const authenticationJSON = (cred) => ({
  id: cred.id,
  rawId: toB64url(cred.rawId),
  type: cred.type,
  response: {
    clientDataJSON: toB64url(cred.response.clientDataJSON),
    authenticatorData: toB64url(cred.response.authenticatorData),
    signature: toB64url(cred.response.signature),
    userHandle: cred.response.userHandle ? toB64url(cred.response.userHandle) : undefined,
  },
  clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
  authenticatorAttachment: cred.authenticatorAttachment || undefined,
});
const explainPasskey = (e) =>
  e && e.name === 'NotAllowedError' ? 'パスキーの操作が取り消されたか、時間切れになりました。' :
  e && e.name === 'InvalidStateError' ? 'この端末のパスキーは、もう登録してあります。' :
  (e && e.message) || 'パスキーを使えませんでした。';

// ---- 会員の状態と完全版の曲 ----
const refreshAccount = async () => {
  account = await apiGet('/api/me');
  recordSignedIn = account.signedIn;
  if (account.paid) await loadFullSongs();
  renderPlan();
  refreshScreens();
  // ログインしていれば、ほかの端末の記録と合わせる（変わっていたら1回だけ読み直す）
  if (account.signedIn) await syncRecord({ reloadOnChange: true });
};

// 有料版の人は、曲の道を完全版のメロディに差し替える
const loadFullSongs = async () => {
  if (!SONGS.some((s) => s.locked)) return;
  const { songs } = await apiGet('/api/songs');
  SONGS.splice(0, SONGS.length, ...songs);
  buildSongStages();
};

// 鍵の有無が変わったら、ホームと練習の画面を描き直す
const refreshScreens = () => {
  renderHome();
  if (view === 'play' && !run) { renderStageInfo(); renderIdle(); }
};

// 鍵のかかったステージ・曲の続きを押したとき
const openUpsell = (message) => {
  if (!BILLING_ON) return;
  $('upsellMsg').textContent = message;
  $('upsellDlg').showModal();
};

let toastQueue = Promise.resolve();
const toast = (text) => {
  toastQueue = toastQueue.then(() => new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); done(); }, 3200);
  }));
};

const dateLabel = (secs) => {
  const d = new Date(secs * 1000);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

const renderPlan = () => {
  if (!BILLING_ON) return;
  $('planField').hidden = false;
  const btn = (id, label, ghost) => `<button type="button" data-plan="${id}"${ghost ? ' class="ghost"' : ''}>${label}</button>`;
  let status;
  let btns;
  if (account.paid) {
    status = `有料版をお使いです（${account.name}）。${account.cancelAtEnd ? `${dateLabel(account.periodEnd)}で終了します` : `次の更新日は${dateLabel(account.periodEnd)}です`}。`;
    btns = btn('portal', 'お支払い・解約', true) + btn('logout', 'ログアウト', true);
  } else if (account.signedIn) {
    status = `${account.name} でログイン中（練習の記録は端末どうしで同期されます）。有料版にすると、すべてのステージと曲を練習できます（${PRICE_LABEL}）。`;
    btns = btn('buy', `有料版にする（${PRICE_LABEL}）`) + (account.customer ? btn('portal', 'お支払いの履歴', true) : '') + btn('logout', 'ログアウト', true);
  } else {
    status = `有料版（${PRICE_LABEL}）にすると、すべてのステージと曲を練習できます。無料の会員登録だけでも、練習の記録をスマホとパソコンで同期できます。`;
    btns = btn('buy', `有料版にする（${PRICE_LABEL}）`) + btn('signup', '記録を同期する（無料）', true) + btn('login', 'ログイン', true);
  }
  $('planStatus').textContent = status;
  $('planBtns').innerHTML = btns;
};

// ---- 申し込み・ログインの画面 ----
const openAcct = (view, message = '') => {
  const dlg = $('acctDlg');
  dlg.querySelectorAll('[data-view]').forEach((el) => { el.hidden = el.dataset.view !== view; });
  $('acctMsg').textContent = message;
  $('acctError').hidden = true;
  if (!dlg.open) dlg.showModal();
};
const acctError = (msg) => {
  $('acctError').textContent = msg;
  $('acctError').hidden = false;
};
const closeAcct = () => { if ($('acctDlg').open) $('acctDlg').close(); };

let afterSignIn = null; // ログインできたら続けてすること（申し込みなど）

const startCheckout = async () => {
  const { url } = await apiPost('/api/checkout');
  location.href = url;
};

const buyPlan = async () => {
  if (!account.signedIn) {
    afterSignIn = startCheckout;
    openAcct('register', '有料版の申し込みには、ヴォーカルトレーナー用のパスキー（指紋・顔・PINでログインするしくみ）を使います。パスワードやメールアドレスは要りません。');
    return;
  }
  try {
    await startCheckout();
  } catch (e) {
    alert(e.message);
  }
};

const signedInDone = async (recovery) => {
  await refreshAccount();
  const next = () => {
    closeAcct();
    const fn = afterSignIn;
    afterSignIn = null;
    if (fn) fn().catch((e) => alert(e.message));
  };
  if (!recovery) return next();
  // 復旧コードは1回だけ見せる
  $('acctRecovery').textContent = recovery;
  openAcct('recovery');
  $('acctRecoveryDone').onclick = next;
};

const registerPasskey = async () => {
  if (!window.PublicKeyCredential) return acctError('このブラウザはパスキーに対応していません。新しいブラウザで開いてください。');
  try {
    const opt = await apiPost('/api/register/options', { name: $('acctName').value });
    const cred = await navigator.credentials.create({ publicKey: creationOptions(opt) });
    const done = await apiPost('/api/register/verify', { response: registrationJSON(cred) });
    await signedInDone(done.recovery);
  } catch (e) {
    acctError(explainPasskey(e));
  }
};

const loginPasskey = async () => {
  if (!window.PublicKeyCredential) return acctError('このブラウザはパスキーに対応していません。');
  try {
    const opt = await apiPost('/api/login/options');
    const cred = await navigator.credentials.get({ publicKey: requestOptions(opt) });
    await apiPost('/api/login/verify', { response: authenticationJSON(cred) });
    await signedInDone('');
  } catch (e) {
    acctError(explainPasskey(e));
  }
};

const recoverAccount = async () => {
  try {
    const done = await apiPost('/api/recover', { code: $('acctCode').value });
    // 使った復旧コードは無効になるので新しいコードを見せ、この端末のパスキーを作ってもらう
    afterSignIn = async () => {
      const opt = await apiPost('/api/passkey/options');
      const cred = await navigator.credentials.create({ publicKey: creationOptions(opt) });
      await apiPost('/api/passkey/verify', { response: registrationJSON(cred) });
    };
    await signedInDone(done.recovery);
  } catch (e) {
    acctError(e.message);
  }
};

const onPlanButton = async (what) => {
  try {
    if (what === 'buy') await buyPlan();
    else if (what === 'login') { afterSignIn = null; openAcct('login'); }
    else if (what === 'signup') {
      afterSignIn = null;
      openAcct('register', '練習の記録をスマホとパソコンで同期するための、ヴォーカルトレーナー用のパスキーを作ります（無料）。パスワードやメールアドレスは要りません。');
    }
    else if (what === 'portal') location.href = (await apiPost('/api/portal')).url;
    else if (what === 'logout') {
      await apiPost('/api/logout');
      location.reload();
    }
  } catch (e) {
    alert(e.message);
  }
};

// 支払い画面から戻ってきたとき
const handleCheckoutReturn = async () => {
  const q = new URLSearchParams(location.search);
  const result = q.get('checkout');
  if (!result) return;
  history.replaceState(null, '', location.pathname);
  if (result === 'cancel') {
    toast('申し込みは取り消されました');
    return;
  }
  const sessionId = q.get('session_id');
  if (result === 'done' && sessionId) {
    account = await apiPost('/api/checkout/confirm', { sessionId });
    if (account.paid) {
      await loadFullSongs();
      toast('有料版になりました。すべてのステージと曲を練習できます');
    } else {
      alert('お支払いの確認に時間がかかっています。少ししてから開き直してください。');
    }
    renderPlan();
    refreshScreens();
  }
};

// 声の分析のページ（/analyzer/）から「有料版にする」「ログイン」で来たとき
const handleRequestFromAnalyzer = async () => {
  const q = new URLSearchParams(location.search);
  if (!q.has('buy') && !q.has('login')) return;
  history.replaceState(null, '', location.pathname);
  const back = q.get('back') === 'analyzer' ? '/analyzer/' : '';
  if (q.has('buy')) {
    if (account.paid) { if (back) location.href = back; return; }
    await buyPlan();
    return;
  }
  if (account.signedIn) { if (back) location.href = back; return; }
  afterSignIn = back ? async () => { location.href = back; } : null;
  openAcct('login');
};

const initBilling = () => {
  if (!BILLING_ON) return;
  $('planBtns').addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('button[data-plan]') : null;
    if (b) onPlanButton(b.dataset.plan);
  });
  $('acctRegisterBtn').addEventListener('click', registerPasskey);
  $('acctLoginBtn').addEventListener('click', loginPasskey);
  $('acctRecoverBtn').addEventListener('click', recoverAccount);
  $('acctDlg').addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-goto]') : null;
    if (b) openAcct(b.dataset.goto);
  });
  $('acctClose').addEventListener('click', () => { afterSignIn = null; closeAcct(); });
  $('upsellBuy').addEventListener('click', () => { $('upsellDlg').close(); buyPlan(); });
  refreshAccount()
    .then(handleCheckoutReturn)
    .then(handleRequestFromAnalyzer)
    .catch((e) => console.warn('有料版の状態を確かめられませんでした', e));
};
