/* Shared leaderboard for the newer games (Supabase table public.arcade_scores).
   The publishable key is meant to be public; the table only allows select and insert.
   ArcadeBoard.create({game, unit, mount, onAdded}) draws an "add my score" form and the top 10.
   board.setScore(n) shows the form for n points (0 hides it); one row per player, points added up. */
(function(){
  var URL = 'https://ppqlwnqpimictchkpqyu.supabase.co/rest/v1/arcade_scores';
  var KEY = 'sb_publishable_UoMfluUBvmWgHxPD3gvBaA_zxN6LudO';
  var NAME_KEY = 'gamesPlayerName';

  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function nameKey(n){ return String(n).replace(/\s+/g,' ').trim().toLowerCase(); }
  function loadName(){ try { return JSON.parse(localStorage.getItem(NAME_KEY)) || ''; } catch(e){ return ''; } }
  function saveName(n){ try { localStorage.setItem(NAME_KEY, JSON.stringify(n)); } catch(e){} }

  var css = document.createElement('style');
  css.textContent =
    '.ab{display:flex;flex-direction:column;gap:12px}' +
    '.ab-form{display:flex;flex-direction:column;gap:8px;border:2px dashed var(--border);border-radius:16px;padding:12px}' +
    '.ab-form label{font-weight:800}' +
    '.ab-row{display:flex;gap:8px}' +
    '.ab-row input{flex:1;min-width:0;font-size:16px;padding:12px;border-radius:12px;border:2px solid var(--border);background:var(--surface);color:var(--text)}' +
    '.ab-row input:focus{outline:3px solid var(--accent);outline-offset:1px}' +
    '.ab-row button{border:0;border-radius:12px;background:var(--accent);color:var(--accent-ink);font-weight:800;font-size:16px;padding:0 18px;min-height:48px;cursor:pointer}' +
    '.ab-row button:disabled{opacity:.6}' +
    '.ab-msg{margin:0;font-weight:700;font-size:14px;min-height:1.2em}.ab-msg.bad{color:var(--bad)}' +
    '.ab-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}' +
    '.ab-list li{display:grid;grid-template-columns:2ch 1fr auto;gap:10px;align-items:center;padding:8px 12px;border-radius:12px;background:var(--surface-2)}' +
    '.ab-list li.me{box-shadow:inset 0 0 0 2px var(--accent)}' +
    '.ab-list .rk{color:var(--text-muted);font-weight:800}.ab-list li:nth-child(-n+3) .rk{color:var(--gold)}' +
    '.ab-list .who{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800}' +
    '.ab-list .who small{display:block;color:var(--text-muted);font-weight:700;font-size:12px}' +
    '.ab-list .n{font-family:Fredoka,system-ui,sans-serif;font-size:19px}' +
    '.ab-list .n small{font-family:Nunito,system-ui,sans-serif;font-size:11px;color:var(--text-muted);font-weight:800;margin-left:3px}' +
    '.ab-empty{margin:0;color:var(--text-muted);font-size:14px}';
  document.head.appendChild(css);

  function fetchBoard(game){
    return fetch(URL + '?select=name,points&game=eq.' + encodeURIComponent(game) + '&order=created_at.desc&limit=1000',
      {headers:{apikey:KEY}, cache:'no-store'})
      .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(rows){
        var by = {}, list = [];
        rows.forEach(function(r){
          var k = nameKey(r.name), p = by[k];
          if (!p){ p = by[k] = {key:k, name:r.name.trim(), total:0, games:0, best:0}; list.push(p); }
          p.total += r.points; p.games++; p.best = Math.max(p.best, r.points);
        });
        return list.sort(function(a,b){ return b.total - a.total || b.best - a.best || a.games - b.games; });
      });
  }

  window.ArcadeBoard = { create: function(o){
    var mount = o.mount, unit = o.unit || 'points', score = 0, sent = false;
    mount.className = (mount.className + ' ab').trim();
    mount.innerHTML =
      '<form class="ab-form hidden" autocomplete="off"><label></label>' +
      '<div class="ab-row"><input maxlength="16" placeholder="Your name" autocomplete="nickname"><button type="submit">Add</button></div>' +
      '<p class="ab-msg" aria-live="polite"></p></form><div class="ab-body"><p class="ab-empty">Loading the leaderboard&hellip;</p></div>';
    var form = mount.querySelector('form'), label = form.querySelector('label'), input = form.querySelector('input'),
        btn = form.querySelector('button'), msg = form.querySelector('.ab-msg'), body = mount.querySelector('.ab-body');

    function render(mineKey){
      return fetchBoard(o.game).then(function(players){
        if (!players.length){ body.innerHTML = '<p class="ab-empty">No scores yet. Be the first on the board!</p>'; return null; }
        var mine = null;
        players.forEach(function(p, i){ if (p.key === mineKey) mine = {rank:i+1, p:p}; });
        body.innerHTML = '<ol class="ab-list">' + players.slice(0,10).map(function(p, i){
          return '<li' + (p.key === mineKey ? ' class="me"' : '') + '><span class="rk">' + (i+1) + '</span>' +
            '<span class="who">' + esc(p.name) + '<small>' + p.games + (p.games === 1 ? ' score' : ' scores') + ' &middot; best ' + p.best + '</small></span>' +
            '<span class="n">' + p.total + '<small>' + esc(unit) + '</small></span></li>';
        }).join('') + '</ol>';
        return mine;
      }).catch(function(e){
        body.innerHTML = '<p class="ab-empty">The leaderboard isn&rsquo;t available right now.</p>';
        return null;
      });
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var name = input.value.replace(/\s+/g,' ').trim().slice(0,16);
      if (!name){ msg.className = 'ab-msg bad'; msg.textContent = 'Type your name first.'; input.focus(); return; }
      if (sent || score < 1) return;
      btn.disabled = input.disabled = true; msg.className = 'ab-msg'; msg.textContent = 'Adding your score…';
      saveName(name);
      fetch(URL, {method:'POST', headers:{apikey:KEY, 'Content-Type':'application/json'},
        body: JSON.stringify({game:o.game, name:name, points:score})})
        .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); })
        .then(function(){
          sent = true;
          return render(nameKey(name)).then(function(mine){
            msg.textContent = mine ? 'Added! ' + mine.p.name + ' is number ' + mine.rank + ' with ' + mine.p.total + ' ' + unit + '.' : 'Score added.';
            btn.textContent = 'Added';
            if (o.onAdded) o.onAdded();
          });
        })
        .catch(function(){
          btn.disabled = input.disabled = false; msg.className = 'ab-msg bad';
          msg.textContent = 'Couldn’t add your score. Check the internet and try again.';
        });
    });

    render('');
    return {
      setScore: function(n){
        score = n; sent = false;
        form.classList.toggle('hidden', !(n > 0));
        label.textContent = 'Put your ' + n + ' ' + (n === 1 ? unit.replace(/s$/, '') : unit) + ' on the leaderboard';
        input.value = loadName(); input.disabled = btn.disabled = false; btn.textContent = 'Add'; msg.className = 'ab-msg'; msg.textContent = '';
      },
      refresh: function(){ return render(''); }
    };
  }};
})();
