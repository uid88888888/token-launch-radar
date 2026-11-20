// Token Launch Radar — dashboard logic. No network: all data comes from data.js.
(function () {
  var R = window.RADAR;
  if (!R) return;
  var rows = R.rows;
  var live = R.live;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function pct(n) {
    if (n == null) return '<span class="flat">n/a</span>';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
    var sign = n > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + n.toFixed(1) + '%</span>';
  }
  function age(n) { return n == null ? 'n/a' : n >= 365 ? (n / 365).toFixed(1) + 'y' : n + 'd'; }

  // ---- header stats ----
  var top = rows[0];
  $('stats').innerHTML =
    '<div class="stat"><b>' + rows.length + '</b><span>protocols ranked</span></div>' +
    '<div class="stat"><b>' + R.watchlist_size + '</b><span>on the watchlist</span></div>' +
    '<div class="stat"><b>' + R.early_size + '</b><span>early finds below the floor</span></div>' +
    '<div class="stat"><b>' + money(top ? top.implied_value_usd : 0) + '</b><span>top implied value</span></div>' +
    '<div class="stat"><b>' + R.live_size + '</b><span>already trading, set aside</span></div>';
  $('asOf').textContent = R.as_of;
  document.querySelector('#tabBoard').textContent = 'Ranked board (' + rows.length + ')';
  document.querySelector('#tabLive').textContent = 'Already trading (' + live.length + ')';

  // ---- filter options ----
  var cats = [], chains = [];
  rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    (r.chains || []).forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  cats.forEach(function (c) { $('cat').appendChild(new Option(c, c)); });
  chains.forEach(function (c) { $('chain').appendChild(new Option(c, c)); });

  var state = { q: '', cat: '', chain: '', watchOnly: false, sort: 'value' };
  var maxVal = top ? top.implied_value_usd : 1;

  function sortRows(list) {
    var s = state.sort;
    return list.slice().sort(function (a, b) {
      if (s === 'tvl') return b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1);
      if (s === 'growth') return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d) || (a.slug < b.slug ? -1 : 1);
      if (s === 'age') return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days) || (a.slug < b.slug ? -1 : 1);
      if (s === 'name') return a.name.localeCompare(b.name);
      return b.implied_value_usd - a.implied_value_usd || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1);
    });
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return rows.filter(function (r) {
      if (state.watchOnly && !r.watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function render() {
    var list = sortRows(filtered());
    $('count').textContent = 'Showing ' + list.length + ' of ' + rows.length + ' ranked protocols' +
      (state.watchOnly ? ' — watchlist only' : '') + '. Rank is by implied value; sorting reorders the view, not the rank.';
    $('rows').innerHTML = list.map(function (r) {
      var w = Math.max(2, Math.round(100 * r.implied_value_usd / maxVal));
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' + (r.watchlist ? '<span class="star" title="On the watchlist">&#9733;</span>' : '') +
        '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td class="cat">' + esc(r.category || '—') + '</td>' +
        '<td class="chains">' + esc((r.chains || []).slice(0, 2).join(', ')) + ((r.chains || []).length > 2 ? ' +' + ((r.chains || []).length - 2) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + money(r.implied_value_usd) + '<div class="bar"><i style="width:' + w + '%"></i></div></td>' +
        '</tr>';
    }).join('');
  }

  // ---- detail view ----
  function splitStep(s) {
    var i = s.lastIndexOf(' Cost: ');
    if (i < 0) return { text: s, meta: '' };
    var rest = s.slice(i + 7); // ' Cost: ' is 7 characters
    return { text: s.slice(0, i), meta: rest.replace(/\.?\s*$/, '') };
  }

  function showDetail(slug, scroll) {
    var r = null;
    rows.forEach(function (x) { if (x.slug === slug) r = x; });
    var box = $('detail');
    if (!r) { box.hidden = true; box.innerHTML = ''; return; }
    var growth = r.change_7d == null ? 'no 7-day change reported, counted as 0%' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '% over 7 days';
    var why = '<strong>Why rank ' + r.rank + '?</strong> ' + esc(r.name) + ' holds ' + money(r.tvl_usd) + ' of TVL' +
      (r.age_days == null ? ' with no listing date on record' : ' after ' + r.age_days + ' days tracked') +
      ', ' + growth + ', on ' + (r.chains || []).length + ' chain' + ((r.chains || []).length === 1 ? '' : 's') +
      '. That gives a size base of ' + money(r.base_usd) + ', marked by growth &times;' + r.growth_multiplier +
      ', maturity &times;' + r.maturity_multiplier + ' and breadth &times;' + r.breadth_multiplier +
      ' — an implied value of ' + money(r.implied_value_usd) + '.';
    var chainList = (r.chains || []).slice(0, 4).join(', ') + ((r.chains || []).length > 4 ? ' +' + ((r.chains || []).length - 4) + ' more' : '');
    box.innerHTML =
      '<button class="close" type="button" id="closeDetail">Close &times;</button>' +
      '<h2>' + esc(r.name) + ' <span class="slug">#' + r.rank + ' &middot; ' + esc(r.slug) + '</span></h2>' +
      '<p class="sub">' + esc(r.category || 'Uncategorised') + ' &middot; ' + esc(chainList || 'no chain listed') +
      (r.watchlist ? ' &middot; <span class="star">&#9733; On the watchlist</span>' : ' &middot; Early find below the watchlist floor') + '</p>' +
      '<div class="kv">' +
      '<div><b>' + money(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div><b>' + (r.change_7d == null ? 'n/a' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') + '</b><span>7-day change</span></div>' +
      '<div><b>' + (r.age_days == null ? 'n/a' : r.age_days + ' days') + '</b><span>Tracked since ' + esc(r.listed_at || 'unknown') + '</span></div>' +
      '<div><b>' + money(r.implied_value_usd) + '</b><span>Implied value</span></div>' +
      '</div>' +
      '<h3>Model breakdown</h3>' +
      '<table class="breakdown"><tbody>' +
      '<tr><td>Size base — 1,000,000 &times; (TVL &divide; 1,000,000)<sup>0.8</sup></td><td>' + money(r.base_usd) + '</td></tr>' +
      '<tr><td>Growth multiplier</td><td>&times;' + r.growth_multiplier + '</td></tr>' +
      '<tr><td>Maturity multiplier</td><td>&times;' + r.maturity_multiplier + '</td></tr>' +
      '<tr><td>Breadth multiplier (' + (r.chains || []).length + ' chains)</td><td>&times;' + r.breadth_multiplier + '</td></tr>' +
      '<tr class="total"><td>Implied value</td><td>' + money(r.implied_value_usd) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="why">' + why + '</p>' +
      '<h3>Farm plan — six steps</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) {
        var p = splitStep(s);
        return '<li>' + esc(p.text) + (p.meta ? '<span class="meta">' + esc(p.meta) + '</span>' : '') + '</li>';
      }).join('') + '</ol>' +
      '<p class="note">Token status: this protocol <strong>records no token</strong> in the snapshot — no market cap, no CoinGecko id, no symbol. That is what the record says, never proof it has none.</p>';
    box.hidden = false;
    $('closeDetail').addEventListener('click', function () { box.hidden = true; box.innerHTML = ''; });
    var trs = document.querySelectorAll('#rows tr');
    trs.forEach(function (tr) { tr.classList.toggle('selected', tr.getAttribute('data-slug') === slug); });
    if (scroll) box.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  // ---- live view ----
  $('liveRows').innerHTML = live.map(function (p) {
    return '<tr><td><span class="name">' + esc(p.name) + '</span><br><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td class="cat">' + esc(p.category || '—') + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + money(p.mcap_usd) + '</td>' +
      '<td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- tabs ----
  function setTab(which) {
    $('tabBoard').classList.toggle('active', which === 'board');
    $('tabLive').classList.toggle('active', which === 'live');
    $('boardView').hidden = which !== 'board';
    $('liveView').hidden = which !== 'live';
    document.querySelector('.controls').style.display = which === 'board' ? '' : 'none';
    $('detail').hidden = which !== 'board' ? true : $('detail').hidden;
  }
  $('tabBoard').addEventListener('click', function () { setTab('board'); });
  $('tabLive').addEventListener('click', function () { setTab('live'); });

  // ---- controls ----
  $('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  $('cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  $('chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  $('watchOnly').addEventListener('change', function (e) { state.watchOnly = e.target.checked; render(); });
  $('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
  document.querySelectorAll('#board thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      state.sort = th.getAttribute('data-sort');
      $('sort').value = state.sort;
      render();
    });
  });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr');
    if (tr) showDetail(tr.getAttribute('data-slug'), true);
  });

  // ---- deep links: #detail=<slug>, #view=watchlist|live, #cat=<category> ----
  var hash = window.location.hash || '';
  var m = hash.match(/detail=([^&]+)/);
  var v = hash.match(/view=([^&]+)/);
  var c = hash.match(/cat=([^&]+)/);
  if (v && v[1] === 'live') setTab('live');
  if (v && v[1] === 'watchlist') { state.watchOnly = true; $('watchOnly').checked = true; }
  if (c) { var cn = decodeURIComponent(c[1]); if (cats.indexOf(cn) >= 0) { state.cat = cn; $('cat').value = cn; } }
  render();
  if (m) showDetail(decodeURIComponent(m[1]), true);
})();
