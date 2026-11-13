'use strict';
// 鼻歌（「ラ」で1音節ずつ歌った録音。0秒＝曲の0秒）から、音符・6/8 の楽譜・カラオケの線を作る
// genre-songs/hum_transcribe.py をブラウザに移したもの（高さは YIN 法）
const HumTranscribe = (() => {
  const NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  const hzToMidi = (f) => 69 + 12 * Math.log2(f / 440);
  const median = (a) => { const b = [...a].sort((x, y) => x - y); const n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
  const std = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };

  // 1フレームごとの高さ（MIDI、声がなければ null）と音量
  const analyse = (x, sr) => {
    const hop = Math.round(sr / 100); // 0.01秒
    const W = Math.round(sr * 0.04);
    const maxTau = Math.floor(sr / 65);
    const minTau = Math.floor(sr / 1100);
    const n = Math.max(0, Math.floor((x.length - W - maxTau - 2) / hop));
    const pitch = new Array(n).fill(null);
    const rms = new Float32Array(n);
    const d = new Float32Array(maxTau + 2);
    for (let f = 0; f < n; f++) {
      const o = f * hop;
      let e = 0;
      for (let i = 0; i < W; i++) e += x[o + i] * x[o + i];
      rms[f] = Math.sqrt(e / W);
      if (rms[f] < 1e-4) continue;
      d[0] = 1;
      let sum = 0;
      for (let tau = 1; tau <= maxTau; tau++) {
        let s = 0;
        for (let i = 0; i < W; i++) { const v = x[o + i] - x[o + i + tau]; s += v * v; }
        sum += s;
        d[tau] = sum > 0 ? (s * tau) / sum : 1;
      }
      let tau = -1;
      for (let t = minTau; t <= maxTau; t++) {
        if (d[t] < 0.15) { while (t + 1 <= maxTau && d[t + 1] < d[t]) t++; tau = t; break; }
      }
      if (tau < 0) continue;
      const a = d[tau - 1];
      const b = d[tau];
      const c = tau + 1 <= maxTau ? d[tau + 1] : b;
      const den = a + c - 2 * b;
      pitch[f] = hzToMidi(sr / (tau + (den ? (a - c) / (2 * den) : 0)));
    }
    return { pitch, rms, dt: hop / sr };
  };

  // 「ラ」の区切り：声の途切れ・音量のへこみ（l の子音）・高さの変化
  const detectNotes = (x, sr) => {
    const { pitch, rms, dt } = analyse(x, sr);
    const sorted = Float32Array.from(rms).sort();
    const loud = sorted[Math.floor(sorted.length * 0.98)] || 0;
    const m = pitch.map((p, i) => (p != null && rms[i] > 0.06 * loud ? p : null));
    const w = Math.round(0.08 / dt);
    const dip = new Array(rms.length).fill(false);
    for (let i = w; i < rms.length - w; i++) {
      let lmin = Infinity; for (let k = i - 2; k <= i + 2; k++) lmin = Math.min(lmin, rms[k]);
      let a = 0; for (let k = i - w; k < i; k++) a = Math.max(a, rms[k]);
      let b = 0; for (let k = i; k < i + w; k++) b = Math.max(b, rms[k]);
      if (rms[i] === lmin && rms[i] < 0.55 * Math.min(a, b)) dip[i] = true;
    }
    const notes = [];
    let cur = [];
    let away = [];
    const close = () => {
      if (cur.length && (cur[cur.length - 1][0] - cur[0][0] + 1) * dt >= 0.07) {
        notes.push({ t0: cur[0][0] * dt, t1: (cur[cur.length - 1][0] + 1) * dt, mf: median(cur.map((c) => c[1])) });
      }
      cur = [];
    };
    let gap = 0;
    m.forEach((v, i) => {
      if (v == null) { gap++; if (gap * dt > 0.04 || dip[i]) { close(); away = []; } return; }
      // 短い途切れ（0.04秒以下）でも、前と同じ高さで出直したら新しい「ラ」
      if (gap > 0 && cur.length && Math.abs(v - median(cur.slice(-12).map((c) => c[1]))) <= 0.7 && gap * dt >= 0.02) { close(); away = []; }
      gap = 0;
      if (dip[i] && cur.length) { close(); away = []; }
      if (!cur.length) { cur.push([i, v]); return; }
      const med = median(cur.slice(-12).map((c) => c[1]));
      if (Math.abs(v - med) > 0.7) {
        away.push([i, v]);
        if (away.length * dt >= 0.07 && std(away.map((c) => c[1])) < 0.5) { close(); cur = away; away = []; }
      } else { away = []; cur.push([i, v]); }
    });
    close();
    return { notes, contour: { rate: 1 / dt, midi: m } };
  };

  const DUR = { 1: '16', 2: '8', 3: '8.', 4: 'q', 6: 'q.', 8: 'h', 12: 'h.' };
  const pieces = (n) => { const out = []; for (const d of [12, 8, 6, 4, 3, 2, 1]) while (n >= d) { out.push(DUR[d]); n -= d; } return out; };
  const nameOf = (m) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

  // 音符 → 6/8 の楽譜（歌の小節 firstBar〜lastBar）と歌詞・カラオケの線
  const toScore = (raw, syllables, g) => {
    const step = g.barsec / g.steps;
    const firstT = g.bar1 + (g.firstBar - 1) * g.barsec;
    const nbar = g.lastBar - g.firstBar + 1;
    const nSteps = nbar * g.steps;
    const sel = raw.filter((n) => n.t0 >= firstT - step / 2 && n.t0 < firstT + nSteps * step).map((n) => ({ ...n }));
    let prev = 0;
    sel.forEach((n) => {
      const a = Math.max(prev, Math.round((n.t0 - firstT) / step));
      const b = Math.max(a + 1, Math.round((n.t1 - firstT) / step));
      n.a = a; n.b = Math.min(b, nSteps); prev = n.b;
    });
    const kept = sel.filter((n) => n.a < nSteps);
    kept.forEach((n, k) => { if (k + 1 < kept.length) n.b = Math.min(n.b, kept[k + 1].a); n.text = syllables[k] ?? '♪'; });
    const mel = [];
    const lyrics = [];
    for (let bar = 0; bar < nbar; bar++) {
      const b0 = bar * g.steps;
      const b1 = b0 + g.steps;
      const toks = [];
      const words = [];
      let pos = b0;
      kept.forEach((n) => {
        if (n.a < b0 || n.a >= b1) return;
        const b = Math.min(n.b, b1);
        if (n.a > pos) pieces(n.a - pos).forEach((d) => toks.push(`r/${d}`));
        const ps = pieces(b - n.a);
        toks.push(`${nameOf(n.midi)}/${ps[0]}`);
        ps.slice(1).forEach((d) => toks.push(`r/${d}`));
        words.push(n.text);
        pos = b;
      });
      if (pos < b1) pieces(b1 - pos).forEach((d) => toks.push(`r/${d}`));
      mel.push(toks.join(' '));
      lyrics.push(words.join(' '));
    }
    const rate = 50;
    const total = Math.round((g.bar1 + g.lastBar * g.barsec + 1) * rate);
    const line = new Array(total).fill(null);
    kept.forEach((n) => { for (let k = Math.floor(n.t0 * rate); k < Math.min(total, Math.ceil(n.t1 * rate)); k++) line[k] = n.midi; });
    return {
      firstBar: g.firstBar, mel, lyrics,
      notes: kept.map((n) => ({ t0: +n.t0.toFixed(3), t1: +n.t1.toFixed(3), midi: n.midi, text: n.text })),
      line: { rate, midi: line },
      found: kept.length, sylCount: syllables.length,
    };
  };

  // 鼻歌と元の歌の「出だし」の並びを比べて、ずれ（秒）を見つける（Bluetooth イヤホンの遅れなど）
  const envOnset = (x, sr) => {
    const hop = Math.round(sr / 100);
    const n = Math.floor(x.length / hop);
    const e = new Float32Array(n);
    for (let f = 0; f < n; f++) { let s = 0; for (let i = 0; i < hop; i++) { const v = x[f * hop + i] || 0; s += v * v; } e[f] = Math.log(1e-6 + s); }
    const on = new Float32Array(n);
    for (let f = 1; f < n; f++) on[f] = Math.max(0, e[f] - e[f - 1]);
    return on;
  };
  const findLag = (hum, ref, sr, from, to, maxLag = 0.6) => {
    const a = envOnset(hum, sr);
    const b = envOnset(ref, sr);
    const f0 = Math.round(from * 100);
    const f1 = Math.min(a.length, b.length, Math.round(to * 100));
    let best = 0;
    let bestV = -Infinity;
    for (let lag = -Math.round(maxLag * 100); lag <= Math.round(maxLag * 100); lag++) {
      let s = 0;
      for (let f = f0; f < f1; f++) { const k = f + lag; if (k >= 0 && k < a.length) s += a[k] * b[f]; }
      if (s > bestV) { bestV = s; best = lag; }
    }
    return best / 100; // 正＝鼻歌が遅れている
  };

  return {
    run(x, sr, opt) {
      const { notes, contour } = detectNotes(x, sr);
      const off = (opt.offsetMs || 0) / 1000;
      const raw = notes.map((n) => ({ t0: n.t0 - off, t1: n.t1 - off, midi: Math.round(n.mf) + (opt.shift || 0) }));
      const score = toScore(raw, opt.syllables, opt.grid);
      return { ...score, contour, contourOffset: off };
    },
    findLag,
  };
})();
