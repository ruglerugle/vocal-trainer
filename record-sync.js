'use strict';
// ---- 練習の記録を端末どうしで合わせる（ヴォーカルトレーナーの会員がログインしているときだけ） ----
// localStorage の記録をサーバー（/api/record）に送り、ほかの端末の記録と合わせたものを受け取る。
// ほかのファイルの定数には頼らない（index.html の saveStore から scheduleRecordPush を呼ぶ）
const RECORD_STORE_KEY = 'vocalTrainer_v1';
const RELOAD_FLAG = 'vocalTrainer_recordReloaded';

const readLocalRecord = () => {
  try {
    const raw = localStorage.getItem(RECORD_STORE_KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    console.warn('記録を読み込めませんでした', e);
    return {};
  }
};

// 戻り値: 'synced'（合わせた）・'reloading'（ほかの端末の記録が入ったので読み直す）・'signed-out'
const syncRecord = async ({ reloadOnChange = false } = {}) => {
  const local = readLocalRecord();
  const res = await fetch('/api/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ value: local, mtime: typeof local.mtime === 'number' ? local.mtime : 0 }),
  });
  if (res.status === 401) return 'signed-out';
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `記録を合わせられませんでした（${res.status}）`);
  if (!data.changed) return 'synced';
  try {
    localStorage.setItem(RECORD_STORE_KEY, JSON.stringify(data.value));
  } catch (e) {
    console.warn('合わせた記録を保存できませんでした', e);
    return 'synced';
  }
  // 画面は開いたときの記録で動いているので、1回だけ読み直す（読み直しが続かないよう印を付ける）
  if (reloadOnChange && !sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.setItem(RELOAD_FLAG, '1');
    location.reload();
    return 'reloading';
  }
  return 'synced';
};

// 記録を書いたら、少し待ってまとめて送る（ログインしていないときは何もしない）
let recordPushTimer = 0;
let recordSignedIn = false;
const scheduleRecordPush = () => {
  if (!recordSignedIn) return;
  clearTimeout(recordPushTimer);
  recordPushTimer = setTimeout(() => {
    syncRecord().catch((e) => console.warn('記録を送れませんでした', e));
  }, 5000);
};
// 画面を閉じる・裏に回すときは、待たずに送る
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' || !recordSignedIn || !recordPushTimer) return;
  clearTimeout(recordPushTimer);
  recordPushTimer = 0;
  const local = readLocalRecord();
  fetch('/api/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({ value: local, mtime: typeof local.mtime === 'number' ? local.mtime : 0 }),
  }).catch((e) => console.warn('記録を送れませんでした', e));
});
