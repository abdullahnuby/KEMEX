/* One-off tool: collapse stacked sprint override layers in global.css.
 * Cascade model (equal selector text, per property):
 *  - later source declaration wins over earlier, regardless of @media
 *  - !important beats non-!important regardless of order
 *  - a declaration inside @media M is only killed by a later declaration
 *    that applies everywhere M applies: i.e. a later base declaration, or a
 *    later declaration in a media condition that is a superset of M.
 * Only declarations with the EXACT same selector text and property name are
 * considered overriding (shorthand/longhand interplay is left untouched =
 * conservative, output keeps valid cascade).
 */
const fs = require('fs');

const src = fs.readFileSync(process.argv[2], 'utf8');

// ---------- tokenizer ----------
function parseRules(css, mediaCtx) {
  const nodes = [];
  let i = 0;
  const n = css.length;
  let pendingComments = [];
  const flushComments = () => {
    if (pendingComments.length) { nodes.push({ type: 'comments', text: pendingComments.join('\n') }); pendingComments = []; }
  };
  while (i < n) {
    // skip whitespace
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      pendingComments.push(css.slice(i, end === -1 ? n : end + 2));
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (css[i] === '@') {
      // at-rule: read prelude to '{' or ';'
      let j = i;
      while (j < n && css[j] !== '{' && css[j] !== ';') j++;
      const prelude = css.slice(i, j).trim();
      const name = (prelude.match(/^@([\w-]+)/) || [])[1] || '';
      if (css[j] === ';' || j >= n) {
        flushComments();
        nodes.push({ type: 'raw', text: css.slice(i, j + 1) });
        i = j + 1;
        continue;
      }
      // find matching close brace
      let depth = 0, k = j;
      for (; k < n; k++) {
        if (css[k] === '{') depth++;
        else if (css[k] === '}') { depth--; if (depth === 0) break; }
      }
      const body = css.slice(j + 1, k);
      if (name === 'media') {
        flushComments();
        const cond = prelude.replace(/^@media\s*/i, '').trim();
        nodes.push({ type: 'media', cond, rules: parseRules(body, cond) });
      } else {
        // keyframes etc: preserve verbatim
        flushComments();
        nodes.push({ type: 'raw', text: css.slice(i, k + 1) });
      }
      i = k + 1;
      continue;
    }
    // qualified rule: selector up to '{'
    let j = i;
    while (j < n && css[j] !== '{') j++;
    if (j >= n) { // garbage without block
      flushComments();
      nodes.push({ type: 'raw', text: css.slice(i) });
      break;
    }
    const rawSel = css.slice(i, j);
    let k = j + 1, depth = 1;
    for (; k < n; k++) {
      if (css[k] === '{') depth++;
      else if (css[k] === '}') { depth--; if (depth === 0) break; }
    }
    const declSrc = css.slice(j + 1, k);
    const comments = pendingComments; pendingComments = [];
    nodes.push({ type: 'rule', selector: rawSel.replace(/\/\*[\s\S]*?\*\//g, '').trim(), decls: parseDecls(declSrc), comments, media: mediaCtx });
    i = k + 1;
  }
  flushComments();
  return nodes;
}

function parseDecls(s) {
  const out = [];
  let depth = 0, cur = '', inQ = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) { cur += c; if (c === inQ) inQ = null; continue; }
    if (c === '"' || c === "'") { inQ = c; cur += c; continue; }
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ';' && depth === 0) { push(cur); cur = ''; continue; }
    cur += c;
  }
  push(cur);
  function push(chunk) {
    chunk = chunk.trim();
    if (!chunk) return;
    const idx = chunk.indexOf(':');
    if (idx === -1) return;
    let prop = chunk.slice(0, idx).trim();
    let value = chunk.slice(idx + 1).trim();
    let imp = false;
    const m = value.match(/!\s*important\s*$/i);
    if (m) { imp = true; value = value.slice(0, m.index).trim(); }
    if (!prop || !value) return;
    out.push({ prop, value, imp });
  }
  return out;
}

// ---------- collapse ----------
const nodes = parseRules(src, null);

function parseCond(cond) {
  // returns {max, min, raw} in px where possible; null features -> other
  const c = cond.toLowerCase();
  let max = null, min = null;
  const re = /\((max|min)-width\s*:\s*([\d.]+)(px|rem|em)\)/g;
  let m, other = false, count = 0;
  while ((m = re.exec(c))) {
    count++;
    let v = parseFloat(m[2]) * (m[3] === 'px' ? 1 : 16);
    if (m[1] === 'max') max = max === null ? v : Math.min(max, v);
    else min = min === null ? v : Math.max(min, v);
  }
  // detect non-width features
  const feats = c.match(/\(([^()]+)\)/g) || [];
  for (const f of feats) if (!/(max|min)-width/.test(f)) other = true;
  return { max, min, other, cond: c };
}
function isSuperset(laterC, earlierC) {
  if (!earlierC) return true; // earlier is base; only a base later decl kills it (handled by caller)
  if (!laterC) return true;   // later is base -> applies everywhere
  const L = parseCond(laterC), E = parseCond(earlierC);
  if (E.other || L.other) return laterC === earlierC;
  if (L.max !== null && (E.max === null || E.max > L.max)) return false;
  if (L.min !== null && (E.min === null || E.min < L.min)) return false;
  return true;
}

// per selector, ordered surviving decls
const table = new Map(); // sel -> [{prop,value,imp,media,order}]
let order = 0;
function walk(list) {
  for (const node of list) {
    if (node.type === 'rule') {
      for (const sel of node.selector.split(',').map(s => s.trim()).filter(Boolean)) {
        if (!table.has(sel)) table.set(sel, []);
        const arr = table.get(sel);
        for (const d of node.decls) {
          d.media = node.media; d.order = ++order;
          let killed = false;
          for (const e of arr) {
            if (e.prop !== d.prop) continue;
            if (!d.imp && e.imp) { killed = true; break; } // later non-important loses
            if (d.imp || !e.imp) {
              // d wins only if it applies wherever e applies
              if (d.media == null || isSuperset(d.media, e.media)) { e.dead = true; }
            }
          }
          if (!killed) arr.push(d);
        }
      }
    } else if (node.type === 'media') {
      walk(node.rules);
    }
  }
}
walk(nodes);
for (const arr of table.values()) for (const d of arr) if (d.dead) d.drop = true;

// ---------- serialize (preserve original decl order per selector) ----------
const rulesByFirstOrder = new Map(); // sel -> min order
for (const [sel, arr] of table) {
  const live = arr.filter(d => !d.drop);
  if (!live.length) continue;
  rulesByFirstOrder.set(sel, Math.min(...live.map(d => d.order)));
  table.set(sel, live);
}
const selOrder = [...rulesByFirstOrder.entries()].sort((a, b) => a[1] - b[1]).map(e => e[0]);

const commentsForSel = new Map();
(function collectComments(list) {
  let last = null;
  for (const node of list) {
    if (node.type === 'comments') { if (last) last._after = (last._after || []).concat(node.text); }
    else { if (node.type === 'rule' && node.comments.length) commentsForSel.set(node.selector, (commentsForSel.get(node.selector) || []).concat(node.comments)); last = node; }
  }
})(nodes);
// also keep comments preceding media/raw nodes by emitting them with the node: handled by keeping a full node stream
// Simpler: rebuild output by walking original node stream, emitting each selector's merged rules at FIRST occurrence position.
const out = [];
const emitted = new Set();
const fmtDecl = d => `  ${d.prop}:${d.value}${d.imp ? ' !important' : ''}`;
function emitSelector(sel) {
  const arr = table.get(sel);
  if (!arr || !arr.length) return;
  const cs = commentsForSel.get(sel) || [];
  for (const c of cs) out.push(c);
  // runs of same media context
  let run = null;
  for (const d of arr) {
    if (!run || run.media !== d.media) {
      if (run) closeRun(run);
      run = { media: d.media, decls: [] };
    }
    run.decls.push(d);
  }
  closeRun(run);
  function closeRun(r) {
    if (!r || !r.decls.length) return;
    const body = r.decls.map(fmtDecl).join('\n');
    if (r.media == null) out.push(`${sel}{\n${body}\n}`);
    else out.push(`@media ${r.media}{\n${sel}{\n${body}\n}\n}`);
  }
  emitted.add(sel);
}
function walkOut(list) {
  for (const node of list) {
    if (node.type === 'comments') { out.push(node.text); continue; }
    if (node.type === 'raw') { out.push(node.text); continue; }
    if (node.type === 'media') {
      const before = out.length;
      out.push(`@media ${node.cond}{`);
      walkOut(node.rules);
      // dedupe: if nothing new emitted besides selectors already emitted, remove
      out.push(`}`);
      continue;
    }
    if (node.type === 'rule' && !emitted.has(node.selector)) emitSelector(node.selector);
  }
}
// PROBLEM: media nodes walk-out re-emits selectors that also have base rules at
// first-occurrence position; that breaks "emit at first occurrence".
// Simpler, order-safe approach: emit every selector's runs at the position of
// its FIRST surviving declaration. Compute a global stream of decl events.
out.length = 0;
emitted.clear();
const events = []; // {order, kind:'decl', sel, d} | {order, kind:'node', node}
for (const [sel, arr] of table) for (const d of arr) events.push({ order: d.order, kind: 'decl', sel, d });
// attach raw/media/comment nodes at approx positions: we don't track order for them;
// emit raw nodes (keyframes etc) and top-level comments FIRST, then decls in order.
// @keyframes don't interact with the cascade ordering, and comments are inert,
// so this is safe.
for (const node of nodes) {
  if (node.type === 'comments') out.push(node.text);
  else if (node.type === 'raw') out.push(node.text);
  else if (node.type === 'media') {
    // inner raw nodes (e.g. keyframes inside media) — rare; emit verbatim
    for (const inner of node.rules) if (inner.type === 'raw' || inner.type === 'comments') out.push(inner.text);
  }
}
events.sort((a, b) => a.order - b.order);
let openMedia = null;
let openSel = null;
let cur = [];
let declCount = 0;
function closeAll() {
  if (openSel !== null) { out.push(openSel + '{' + cur.join(';') + '}'); openSel = null; cur = []; }
  if (openMedia !== null) { out.push('}'); openMedia = null; }
}
for (const ev of events) {
  if (ev.kind === 'decl') {
    const media = ev.d.media;
    if (openMedia !== media || openSel !== ev.sel) {
      closeAll();
      if (media != null) { out.push(`@media ${media}{`); openMedia = media; }
      if (!emitted.has(ev.sel)) {
        const cs = commentsForSel.get(ev.sel) || [];
        for (const c of cs) out.push(c);
        emitted.add(ev.sel);
      }
      out.push(`${ev.sel}{`);
      openSel = ev.sel;
    }
    cur.push(`${ev.d.prop}:${ev.d.value}${ev.d.imp ? '!important' : ''}`);
  }
}
closeAll();
console.error('surviving declarations:', declCount);
// count original declarations
let origCount = 0;
(function count(list){ for (const nd of list) { if (nd.type==='rule') origCount += nd.decls.length; else if (nd.type==='media') count(nd.rules); } })(nodes);
console.error('original declarations:', origCount);

let outCss = out.join('\n');
if (!outCss.endsWith('\n')) outCss += '\n';
fs.writeFileSync(process.argv[3], outCss);

const before = src.split('\n').length, after = outCss.split('\n').length;
console.error(`lines ${before} -> ${after}`);
