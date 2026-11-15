// Tiny zero-dependency Markdown -> HTML (headings, lists, quotes, code, images, links, bold/italic).
// Raw HTML in the source is escaped, so editors can't break the page by accident.
export const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ext = (u) => /^https?:\/\//i.test(u);

export function inline(s, resolve = (x) => x) {
  const stash = [];
  s = String(s).replace(/`([^`]+)`/g, (_, c) => `\u0000${stash.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  s = s.replace(/\\([\\*_\[\]()#`>~|+.!-])/g, (_, c) => `\u0000${stash.push(esc(c)) - 1}\u0000`); // \* \_ escapes from rich-text editors
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${resolve(u.replace(/&amp;/g, '&'))}" alt="${a}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    u = u.replace(/&amp;/g, '&');
    return `<a href="${resolve(u)}"${ext(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a || b}</strong>`)
       .replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>').replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[+i]);
}

// opts.resolve: rewrite URLs (base path); opts.block: (line) => html|null for custom block shortcodes
export function md(src = '', opts = {}) {
  const resolve = opts.resolve || ((x) => x);
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isBlank = (l) => !l.trim();
  while (i < lines.length) {
    const l = lines[i];
    if (isBlank(l)) { i++; continue; }
    const custom = opts.block && opts.block(l.trim());
    if (custom) { out.push(custom); i++; continue; }
    let m;
    if (/^```/.test(l)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    if ((m = l.match(/^(#{1,4})\s+(.*)$/))) { const n = Math.min(m[1].length + 1, 4); out.push(`<h${n}>${inline(m[2], resolve)}</h${n}>`); i++; continue; }
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (/^>\s?/.test(l)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${md(buf.join('\n'), opts)}</blockquote>`); continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l), buf = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*([-*+]|\d+\.)\s+/, ''), resolve)}</li>`);
      out.push(`<${ordered ? 'ol' : 'ul'}>${buf.join('')}</${ordered ? 'ol' : 'ul'}>`); continue;
    }
    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,4}\s|```|>\s?|\s*([-*+]|\d+\.)\s+)/.test(lines[i]) && !(opts.block && opts.block(lines[i].trim()))) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '), resolve)}</p>`);
  }
  return out.join('\n');
}
export const stripMd = (s = '') => String(s).replace(/\[\[product:[^\]]+\]\]/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`]/g, '').replace(/\s+/g, ' ').trim();
