
document.querySelector('.menu')?.addEventListener('click',()=>document.querySelector('.links').classList.toggle('open'));
const cookie=document.querySelector('.cookie'); if(!localStorage.getItem('hc-cookie')) cookie?.classList.add('show');
document.querySelectorAll('[data-cookie]').forEach(b=>b.onclick=()=>{localStorage.setItem('hc-cookie',b.dataset.cookie);cookie.classList.remove('show')});
function rm(){let w=+document.querySelector('#rmWeight').value,r=+document.querySelector('#rmReps').value;if(!w||!r)return;document.querySelector('#rmOut').textContent='1RM estimé : '+Math.round(w*(1+r/30))+' kg'}
function pace(){let d=+document.querySelector('#distance').value,t=document.querySelector('#time').value.split(':').map(Number);if(!d||t.length<2)return;let sec=t.length===3?t[0]*3600+t[1]*60+t[2]:t[0]*60+t[1],p=sec/d,m=Math.floor(p/60),s=Math.round(p%60).toString().padStart(2,'0');document.querySelector('#paceOut').textContent='Allure moyenne : '+m+':'+s+' / km'}



/* ============================================================
   v2 - CALCULATEURS ET ESPACE MEMBRE
   ============================================================ */
function hcPace(sPerKm){
  const m=Math.floor(sPerKm/60), s=Math.round(sPerKm%60).toString().padStart(2,'0');
  return m+':'+s+' /km';
}
/* Zones d'allure : modele indicatif etabli a partir d'une performance recente.
   Ne remplace pas un test de terrain encadre. */
function hcZonesDESACTIVE(){
  const el=document.querySelector('#zOut'); if(!el) return;
  const raw=document.querySelector('#zTime').value.trim();
  const t=raw.split(':').map(Number);
  if(!raw||t.some(isNaN)||t.length<2){ el.textContent='Renseigne un temps valide, par exemple 22:00 ou 0:22:00.'; return; }
  const sec=t.length===3?t[0]*3600+t[1]*60+t[2]:t[0]*60+t[1];
  const km=parseFloat(document.querySelector('#zDist').value)||5;
  const pace=sec/km;
  const vma=3600/pace*1.06;
  const zones=[
    ['Endurance fondamentale',0.60,0.70,'Base aerobie, allure de conversation'],
    ['Endurance active',0.70,0.78,'Footing soutenu regulier'],
    ['Allure specifique 10 km',0.78,0.83,'Travail au seuil bas'],
    ['Allure specifique 5 km',0.83,0.89,'Seuil, effort soutenu'],
    ['Fractionne 3000 m',0.89,0.95,'VO2 max, intervalles courts'],
    ['Vitesse et cote',0.95,1.05,'Puissance, repetitions tres courtes']
  ];
  const lines=zones.map(function(z){
    const a=vma*z[1], b=vma*z[2];
    return '<div style="margin-bottom:6px"><b>'+z[0]+'</b> &nbsp;'+hcPace(3600/b)+' a '+hcPace(3600/a)+
           ' <span class="muted">('+a.toFixed(1)+' a '+b.toFixed(1)+' km/h) - '+z[3]+'</span></div>';
  });
  el.innerHTML='<div style="margin-bottom:10px">VMA estimee : <b>'+vma.toFixed(1)+' km/h</b></div>'+lines.join('');
}

/* Records personnels : stockes uniquement dans le navigateur de l'utilisateur. */
var HC_PR='hc-records';
function hcLoadPR(){ try{ return JSON.parse(localStorage.getItem(HC_PR))||[] }catch(e){ return [] } }
function hcDrawPR(){
  var tb=document.querySelector('#prBody'); if(!tb) return;
  var rows=hcLoadPR();
  if(!rows.length){ tb.innerHTML='<tr><td colspan="4" class="muted">Aucun record enregistre pour le moment.</td></tr>'; return; }
  tb.innerHTML=rows.map(function(r,i){
    return '<tr><td>'+r.dist+'</td><td>'+r.time+'</td><td>'+r.date+'</td>'+
           '<td><button type="button" class="pr-del" data-i="'+i+'" style="background:none;border:0;color:#ff9a9a;cursor:pointer;font-weight:800">Supprimer</button></td></tr>';
  }).join('');
  tb.querySelectorAll('.pr-del').forEach(function(b){
    b.onclick=function(){ var r=hcLoadPR(); r.splice(parseInt(b.dataset.i,10),1); localStorage.setItem(HC_PR,JSON.stringify(r)); hcDrawPR(); };
  });
}
function hcAddPR(){
  var d=document.querySelector('#prDist'), t=document.querySelector('#prTime');
  if(!d||!t||!d.value.trim()||!t.value.trim()) return;
  var rows=hcLoadPR();
  rows.push({dist:d.value.trim(),time:t.value.trim(),date:new Date().toLocaleDateString('fr-FR')});
  localStorage.setItem(HC_PR,JSON.stringify(rows));
  d.value=''; t.value=''; hcDrawPR();
}

/* ============================================================
   v2 - ESPACE MEMBRE (interface de demonstration)
   Comptes et commandes enregistres sur le serveur (Cloudflare D1).
   ============================================================ */
/* ---- aide : appels serveur ---- */
var HC = (function(){
  var cache = null;
  function api(path, body){
    return fetch(path, {method:'POST', credentials:'same-origin', headers:{'content-type':'application/json'}, body:JSON.stringify(body||{})})
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ if(!r.ok) throw new Error(d.error||'Une erreur est survenue.'); return d; }); })
      .catch(function(e){ if(e instanceof TypeError) throw new Error('Impossible de joindre le serveur. Réessaie dans un instant.'); throw e; });
  }
  function me(force){
    if(cache && !force) return cache;
    cache = fetch('/api/me', {credentials:'same-origin'}).then(function(r){ return r.ok ? r.json() : {user:null,orders:[]}; }).catch(function(){ return {user:null,orders:[]}; });
    return cache;
  }
  function esc(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  return {api:api, me:me, esc:esc};
})();

function hcTab(name){
  document.querySelectorAll('[data-tab]').forEach(function(s){ s.classList.toggle('panel-off', s.dataset.tab!==name); });
  document.querySelectorAll('[data-tabbtn]').forEach(function(b){ b.classList.toggle('on', b.dataset.tabbtn===name); });
}
function hcMsg(id,txt){ var e=document.querySelector(id); if(e) e.textContent=txt; }

document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('[data-tabbtn]').forEach(function(b){ b.onclick=function(){ hcTab(b.dataset.tabbtn); }; });

  var pa=document.querySelector('#prAdd'); if(pa) pa.onclick=hcAddPR;
  hcDrawPR();

  /* Comptes reels : appels au serveur (/api) */
  var rb=document.querySelector('#rBtn'); if(rb) rb.onclick=function(){
    var p=document.querySelector('#rPwd').value, p2=document.querySelector('#rPwd2').value, e=document.querySelector('#rEmail').value.trim();
    if(!document.querySelector('#rPrenom').value.trim()||!document.querySelector('#rNom').value.trim()){ hcMsg('#rMsg','Renseigne ton prénom et ton nom.'); return; }
    if(e.indexOf('@')<0){ hcMsg('#rMsg','Renseigne une adresse email valide.'); return; }
    if(p.length<8){ hcMsg('#rMsg','Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if(p!==p2){ hcMsg('#rMsg','Les deux mots de passe ne correspondent pas.'); return; }
    rb.disabled=true; hcMsg('#rMsg','Création du compte…');
    HC.api('/api/register',{prenom:document.querySelector('#rPrenom').value,nom:document.querySelector('#rNom').value,email:e,tel:document.querySelector('#rTel').value,password:p})
      .then(function(){ location.href='espace.html'; })
      .catch(function(err){ rb.disabled=false; hcMsg('#rMsg',err.message); });
  };

  var cb=document.querySelector('#cBtn'); if(cb) cb.onclick=function(){
    var e=document.querySelector('#cEmail').value.trim();
    if(e.indexOf('@')<0){ hcMsg('#cMsg','Renseigne une adresse email valide.'); return; }
    cb.disabled=true; hcMsg('#cMsg','Connexion…');
    HC.api('/api/login',{email:e,password:document.querySelector('#cPwd').value})
      .then(function(){ location.href='espace.html'; })
      .catch(function(err){ cb.disabled=false; hcMsg('#cMsg',err.message); });
  };

  var fl=document.querySelector('#forgotLink'); if(fl) fl.onclick=function(ev){
    ev.preventDefault();
    hcMsg('#cMsg','Mot de passe oublié ? Écris-moi sur WhatsApp (07 67 92 71 63) ou à castillovictor77600@gmail.com : je le réinitialise pour toi.');
  };

  /* déjà connecté : on envoie directement vers Mon espace */
  if(document.querySelector('#rBtn')) HC.me().then(function(d){ if(d.user) location.href='espace.html'; });
});

/* v3 — compteur de personnes coachées */
(function(){
  var KEY='hc-coached-count';
  var BASE=21;
  var n=parseInt(localStorage.getItem(KEY)||BASE,10);
  if(isNaN(n)||n<BASE) n=BASE;
  var el=document.getElementById('coachedCount');
  var fill=document.getElementById('counterFill');
  if(el){
    el.textContent=n;
    if(fill){ setTimeout(function(){ fill.style.width=Math.min(100,(n/50)*100)+'%'; },150); }
  }
  window.hcIncrementCoached=function(){
    n=n+1; localStorage.setItem(KEY,n);
    if(el) el.textContent=n;
    if(fill) fill.style.width=Math.min(100,(n/50)*100)+'%';
    return n;
  };
})();

/* v3 — codes à usage unique (démo locale) */
(function(){
  var KEY='hc-used-codes';
  function used(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  window.hcRedeemCode=function(code){
    code=(code||'').trim().toUpperCase();
    if(!code) return {ok:false,msg:'Entre un code.'};
    if(used().indexOf(code)!==-1) return {ok:false,msg:'Ce code a déjà été utilisé.'};
    var u=used(); u.push(code); localStorage.setItem(KEY,JSON.stringify(u));
    return {ok:true,msg:'Code validé. Ton accès est ouvert.'};
  };
})();

document.getElementById('giftBtn')?.addEventListener('click',function(){
  var c=document.getElementById('giftCode').value;
  var r=window.hcRedeemCode(c);
  var out=document.getElementById('giftOut');
  out.textContent=r.msg; out.style.color=r.ok?'var(--green)':'#ff7a7a';
  if(r.ok && window.hcIncrementCoached) window.hcIncrementCoached();
});


/* ============================================================
   HYBRIDE COACHING — Traduction FR / EN (v5, refaite proprement)
   Chaque texte est mémorisé une fois, puis restauré exactement.
   ============================================================ */
(function(){
  var DICT = { "DÉCOUVRIR MA PHILOSOPHIE DU COACHING": "DISCOVER MY COACHING PHILOSOPHY", "MASQUER MA PHILOSOPHIE": "HIDE MY PHILOSOPHY", "ACHETER LE PDF · 15 €": "BUY THE PDF · €15", "FORMATION PDF": "PDF COURSE", "Pas de coaching sur piste ✗": "No track coaching ✗", "MA PHILOSOPHIE D'ENTRAÎNEMENT": "MY TRAINING PHILOSOPHY", "COMMENT JE TRAVAILLE": "HOW I WORK", "Une saison se construit dans la durée. Voici les principes qui guident chaque plan que j'écris.": "A season is built over time. These are the principles behind every plan I write.", "Une saison complète": "A complete season", "Hiver : on construit le volume et la base aérobie, avec des allures faciles. Été : on réduit le volume, on monte en qualité, on travaille des allures plus rapides et les qualités de vitesse et d'explosivité. L'objectif est d'être complet, pas seulement rapide sur une distance.": "Winter: build volume and the aerobic base at easy paces. Summer: cut the volume, raise the quality, work at faster paces and develop speed and explosiveness. The goal is to be complete, not just fast over one distance.", "On travaille d'abord tes points forts": "We build on your strengths first", "Un point fort solidifié tire le reste vers le haut. On consolide ce que tu fais déjà bien avant de corriger les faiblesses.": "A solid strength pulls everything else up. We lock in what you already do well before fixing weaknesses.", "Le volume s'adapte à ton niveau": "Volume adapts to your level", "Le nombre de séances par semaine change selon ton profil, avec un minimum de 3 et un maximum de 6.": "The number of weekly sessions changes with your profile, with a minimum of 3 and a maximum of 6.", "Entraînement croisé": "Cross training", "Vélo et musculation servent à ajouter du volume sans casser le corps : prévention des blessures et charge mieux répartie.": "Cycling and strength work add volume without breaking the body: injury prevention and a better spread load.", "Décharge toutes les 4 semaines": "A deload every 4 weeks", "Une semaine allégée n'est pas perdue : c'est là que les adaptations se consolident.": "An easier week is not lost time: that is when adaptations consolidate.", "Double projet possible": "Two goals in one season", "Plusieurs distances peuvent se préparer sur la même saison, à condition d'organiser les cycles correctement.": "Several distances can be prepared in the same season, as long as the cycles are organised properly.", "UN EXEMPLE RÉEL": "A REAL EXAMPLE", "Voici comment Fabio a été accompagné. C'est un exemple, pas un modèle à copier : chaque plan est construit sur mesure.": "Here is how Fabio was coached. It is an example, not a template: every plan is built to measure.", "Sa semaine type": "His typical week", "Deux séances de course en période générale, trois quand une compétition approche, deux en affûtage. Plus la musculation en prévention des blessures, et du vélo le week-end.": "Two running sessions in the general phase, three as a race approaches, two while tapering. Plus strength work for injury prevention, and cycling at the weekend.", "Son volume": "His volume", "De 15 à 30 km par semaine, pas plus. Une progression très progressive, jamais de saut brutal.": "From 15 to 30 km a week, no more. Very gradual progression, never a brutal jump.", "Ses objectifs": "His goals", "Des courses à peu près tous les deux mois, avec une semaine de décharge toutes les 4 semaines.": "A race roughly every two months, with a deload week every 4 weeks.", "Son affûtage": "His taper", "À l'approche de la course, moins de musculation, plus de qualité et de spécifique, à volume égal.": "As the race gets close, less strength work, more quality and race-specific work, at the same volume.", "Son suivi": "His follow-up", "Le plan était sur un Google Sheets partagé : séances et retours de l'athlète, mis à jour chaque week-end, accessible sur téléphone comme sur ordinateur, et personnalisable à tout moment.": "The plan lived in a shared Google Sheet: sessions and the athlete's feedback, updated every weekend, available on phone and computer, editable at any time.", "Le contact": "Contact", "Un appel tous les deux semaines, en option, pour faire le point et ajuster.": "An optional call every two weeks to review and adjust.", "Programmes": "Programs", "Coaching": "Coaching", "Avis": "Reviews", "Résultats": "Results", "Mon parcours": "About me", "Outils": "Tools", "Mon espace": "My space", "Contact": "Contact", "Mentions légales": "Legal notice", "CGV": "Terms of sale", "Confidentialité": "Privacy", "Cookies": "Cookies", "by Victor Castillo": "by Victor Castillo", "FORCE. ENDURANCE.<br>VITESSE. PUISSANCE.": "STRENGTH. ENDURANCE.<br>SPEED. POWER.", "Une approche fondée sur la pratique, l'apprentissage en STAPS, les connaissances scientifiques et l'expérience du terrain.": "An approach built on practice, STAPS training, scientific knowledge and field experience.", "Ma philosophie :": "My philosophy:", "la discipline, la régularité, la patience, le travail et la foi. Ce sont les vraies clés — bien avant n'importe quel programme.": "discipline, consistency, patience, hard work and faith. These are the real keys — long before any program.", "DÉCOUVRIR LES PROGRAMMES": "SEE THE PROGRAMS", "COACHING PERSONNALISÉ": "PERSONAL COACHING", "Victor Castillo": "Victor Castillo", "Étudiant en L2 STAPS<br>Entraînement sportif — Paris Cité": "L2 STAPS student<br>Sport Training — Paris Cité", "DEPUIS 2026": "SINCE 2026", "personnes coachées": "people coached", "Sportifs accompagnés individuellement depuis le début de l'aventure Hybride Coaching.": "Athletes individually coached since the beginning of Hybride Coaching.", "CHOISIS TON OBJECTIF": "CHOOSE YOUR GOAL", "PROGRAMMES": "PROGRAMS", "FORCE": "STRENGTH", "DÉTENTE": "VERTICAL JUMP", "PERFORMANCE ATHLÉTIQUE": "ATHLETIC PERFORMANCE", "MUSCULATION": "MUSCLE BUILDING", "COURSE À PIED<br>COACHING PERSONNALISÉ": "RUNNING<br>PERSONAL COACHING", "2 mois · 30 €": "2 months · €30", "Du 5 km au marathon": "From 5K to marathon", "Sur route uniquement · pas de coaching sur piste": "Road only · no track coaching", "DEMANDER MON PROGRAMME": "REQUEST MY PROGRAM", "DÉCOUVRIR →": "DISCOVER →", "Les contenus détaillés et les prix seront finalisés avant l'ouverture des ventes. Aucun paiement n'est encore activé.": "Detailed content and prices will be finalised before sales open. No payment is enabled yet.", "AVIS CLIENTS": "CLIENT REVIEWS", "CE QU'ILS EN DISENT": "WHAT THEY SAY", "sur 12 avis vérifiés": "from 12 verified reviews", "Note moyenne calculée à partir des retours reçus depuis 2026.": "Average rating based on feedback received since 2026.", "Témoignages publiés avec l'accord des personnes concernées.": "Reviews published with the consent of the people involved.", "« Je cours depuis des années, mais j'ai vraiment progressé quand on a structuré mes séances. Le suivi est sérieux et adapté. »": "“I've been running for years, but I truly progressed once my sessions were structured. The coaching is serious and tailored.”", "« Le suivi course à pied m'a fait progresser sur route sans me griller. Le plan s'adaptait vraiment à mon emploi du temps. »": "“The running coaching helped me progress on the road without burning out. The plan genuinely fitted my schedule.”", "« Un entraînement intense et exigeant, mais qui vaut clairement le coup. On progresse et on comprend pourquoi. »": "“Intense and demanding training, but clearly worth it. You progress and you understand why.”", "Fabio, 53 ans": "Fabio, 53", "Valentine, 24 ans": "Valentine, 24", "Steve, 18 ans": "Steve, 18", "Course à pied · 10 km": "Running · 10K", "Course à pied · 5 km sur route": "Running · 5K on road", "Performance · basket": "Performance · basketball", "PREUVES À L'APPUI": "PROOF IN HAND", "LA PROGRESSION": "PROGRESS", "Des progressions réelles, avec le contexte. Les résultats varient selon le profil, l'assiduité et la récupération.": "Real progress, with context. Results vary with the individual, consistency and recovery.", "Développé couché": "Bench press", "Évolution basket": "Basketball progression", "Course à pied · progression sur route": "Running · road progression", "Victor, 19 ans · progression 2023-2026": "Victor, 19 · progress 2023-2026", "Steve, 18 ans · 2022 → 2023": "Steve, 18 · 2022 → 2023", "Valentine, 24 ans · en 3 mois": "Valentine, 24 · in 3 months", "Données publiées avec l'accord des personnes concernées. Les progressions dépendent du point de départ, de la régularité et du contexte individuel.": "Data published with the consent of the people involved. Progress depends on the starting point, consistency and individual context.", "L'ATHLÈTE DERRIÈRE LA MÉTHODE": "THE ATHLETE BEHIND THE METHOD", "VICTOR CASTILLO": "VICTOR CASTILLO", "J'ai 19 ans. Étudiant en L2 STAPS, mention Entraînement sportif, à Paris Cité, je construis une approche qui associe les connaissances scientifiques, l'apprentissage universitaire et l'expérience pratique du terrain.": "I'm 19. A second-year STAPS student, specialising in sport training, at Paris Cité, I'm building an approach that combines scientific knowledge, university learning and hands-on field experience.", "J'ai commencé la musculation seul, sans club, parce qu'un athlète doit toujours travailler son corps : c'est la machine qui fait performer, dans n'importe quel sport.": "I started strength training alone, with no club, because an athlete must always work on their body: it's the machine that performs, in any sport.", "Ancien basketteur compétitif jusqu'au niveau national dans les catégories jeunes U15 et U18, avec des sélections départementales, je suis aujourd'hui athlète de demi-fond. J'ai pratiqué plus de 9 sports à différents niveaux : basket, athlétisme, natation, rugby, football, judo, tennis, vélo, musculation et course à pied. Trois d'entre eux au niveau régional, et des médailles départementales en judo (champion et 3e de Seine-et-Marne).": "A former competitive basketball player up to national level in the U15 and U18 youth categories, with regional selections, I'm now a middle-distance athlete. I've practised more than 9 sports at various levels: basketball, athletics, swimming, rugby, football, judo, tennis, cycling, strength training and running. Three of them at regional level, plus departmental medals in judo (champion and 3rd in Seine-et-Marne).", "Je participe aussi à l'encadrement de jeunes athlètes sur les disciplines de course, de saut et de lancer.<br><br>J'entraîne depuis 2022, d'abord mon entourage et mes amis, puis ma famille, et aujourd'hui des sportifs rencontrés sur les réseaux. Le sport est au centre de ma vie depuis l'âge de 5-6 ans : c'est devenu une évidence, et c'est ce que je veux transmettre.": "I also help coach young athletes in running, jumping and throwing.<br><br>I've been coaching since 2022 — first friends and people around me, then family, and now athletes I've met through social media. Sport has been at the centre of my life since I was 5 or 6: it became obvious, and that's what I want to pass on.", "En parallèle, je crée du contenu sur les réseaux sociaux depuis 2023 : plus de 3 millions de vues cumulées, plus de 2 000 abonnés, et un partenariat avec une marque de nutrition sportive.": "Alongside this, I've been creating content on social media since 2023: over 3 million cumulative views, more than 2,000 followers, and a partnership with a sports nutrition brand.", "La foi en Dieu accompagne mon cheminement et ma vision de la progression.": "Faith in God accompanies my journey and my vision of progress.", "PARTENAIRE": "PARTNER", "PROZIS": "PROZIS", "Équipement et compléments via mon lien partenaire.": "Equipment and supplements through my partner link.", "COMMANDER AVEC MON LIEN": "ORDER WITH MY LINK", "Lien affilié : je peux recevoir une commission sur les achats, sans coût supplémentaire pour toi.": "Affiliate link: I may receive a commission on purchases, at no extra cost to you.", "OUTILS GRATUITS": "FREE TOOLS", "CALCULATEURS": "CALCULATORS", "Estimations indicatives : elles ne remplacent ni une évaluation individuelle ni un test physiologique.": "Indicative estimates: they replace neither an individual assessment nor a physiological test.", "Calculateur de 1RM": "1RM calculator", "Charge soulevée (kg)": "Weight lifted (kg)", "Nombre de répétitions": "Number of reps", "CALCULER": "CALCULATE", "1RM estimé : ": "Estimated 1RM: ", "Calculateur d'allure": "Pace calculator", "Distance (km)": "Distance (km)", "Temps (hh:mm:ss ou mm:ss)": "Time (hh:mm:ss or mm:ss)", "Allure moyenne : ": "Average pace: ", "PARLONS DE TON OBJECTIF": "LET'S TALK ABOUT YOUR GOAL", "CONTACT": "CONTACT", "Le formulaire sera relié à un service d'envoi avant la mise en ligne. Tu peux déjà me contacter par email ou Instagram.": "The form will be connected to a sending service before launch. You can already reach me by email or Instagram.", "Nom": "Name", "Email": "Email", "Objectif principal": "Main goal", "Niveau actuel": "Current level", "Parle-moi de ton objectif, tes contraintes et tes disponibilités": "Tell me about your goal, your constraints and your availability", "ENVOYER LA DEMANDE": "SEND MY REQUEST", "Respect de ta vie privée": "We respect your privacy", "Ce site utilise uniquement les cookies nécessaires pour le moment. Les statistiques seront ajoutées après configuration et consentement.": "This site currently uses only essential cookies. Analytics will be added after configuration and consent.", "Accepter": "Accept", "Refuser": "Refuse", "ESPACE MEMBRE": "MEMBER AREA", "Aperçu": "Preview", "espace membre en préparation — les comptes ne sont pas encore ouverts": "member area in preparation — accounts are not open yet", "Les inscriptions seront ouvertes prochainement. En attendant, écris-moi directement à castillovictor77600@gmail.com.": "Sign-ups will open soon. In the meantime, write to me directly at castillovictor77600@gmail.com.", "CRÉER MON COMPTE": "CREATE MY ACCOUNT", "J'AI DÉJÀ UN COMPTE": "I ALREADY HAVE AN ACCOUNT", "CONNEXION": "LOG IN", "Prénom": "First name", "Nom de famille": "Last name", "Mot de passe": "Password", "Confirmer le mot de passe": "Confirm password", "Téléphone (facultatif)": "Phone (optional)", "SE CONNECTER": "LOG IN", "Mot de passe oublié ?": "Forgot your password?", "MA BIBLIOTHÈQUE": "MY LIBRARY", "Mes programmes": "My programs", "OUVRIR": "OPEN", "Mes programmes sur devis": "My custom programs", "SUIVRE MA COMMANDE": "TRACK MY ORDER", "J'AI UN CODE": "I HAVE A CODE", "Entre ton code": "Enter your code", "VALIDER MON CODE": "VALIDATE MY CODE", "Chaque code est à usage unique. Une fois utilisé, il ne peut plus servir.": "Each code can be used once. Once used, it no longer works.", "MON ESPACE": "MY SPACE", "TABLEAU DE BORD": "DASHBOARD", "Profil": "Profile", "Commandes": "Orders", "Informations": "Information", "Programmes achetés": "Programs purchased", "Accompagnement en cours": "Current coaching", "Langue": "Language", "VOIR TOUS LES AVIS": "SEE ALL REVIEWS", "VOIR LES DÉTAILS DE MA PHILOSOPHIE": "SEE MY COACHING PHILOSOPHY", "MASQUER LES DÉTAILS": "HIDE THE DETAILS" };

  var SKIP = {SCRIPT:1,STYLE:1,NOSCRIPT:1,CODE:1,PRE:1};

  function nodes(){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){
        if(!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if(SKIP[n.parentNode && n.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        if(n.parentNode && n.parentNode.closest && n.parentNode.closest('.lang')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var out=[], n;
    while((n=walker.nextNode())) out.push(n);
    return out;
  }

  var memo = null;

  function collect(){
    memo = nodes().map(function(n){
      return {node:n, fr:n.nodeValue};
    });
  }

  function apply(lang){
    if(!memo) collect();
    memo.forEach(function(item){
      var n = item.node;
      if(!n || !n.parentNode) return;
      if(lang === 'en'){
        var raw = item.fr;
        var lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0];
        var core = raw.trim();
        var tr = DICT[core];
        n.nodeValue = tr ? (lead + tr + tail) : raw;
      } else {
        n.nodeValue = item.fr;
      }
    });
    // placeholders
    document.querySelectorAll('[data-ph-fr]').forEach(function(el){
      el.placeholder = (lang==='en') ? el.getAttribute('placeholder') : el.getAttribute('data-ph-fr');
    });
    // attributs alt d'images
    if(lang==='en'){
      document.querySelectorAll('img[alt]').forEach(function(img){
        if(!img.dataset.altFr){ img.dataset.altFr = img.alt; }
        var a = img.dataset.altFr, lead=a.match(/^\s*/)[0], tail=a.match(/\s*$/)[0], core=a.trim();
        img.alt = DICT[core] ? (lead+DICT[core]+tail) : a;
      });
    } else {
      document.querySelectorAll('img[data-alt-fr]').forEach(function(img){ img.alt = img.dataset.altFr; });
    }
    document.documentElement.lang = (lang==='en') ? 'en' : 'fr';
    try{ localStorage.setItem('hc-lang', lang); }catch(e){}
    // boutons : on surligne la langue active, sans jamais traduire les libellés
    document.querySelectorAll('.lang button').forEach(function(b){
      var on = (b.dataset.lang === lang);
      b.style.color = on ? '#35ff84' : 'inherit';
      b.style.fontWeight = on ? '900' : '400';
      b.style.textDecoration = 'none';
    });
  }

  // construction des boutons FR | EN (libellés figés)
  document.querySelectorAll('.lang').forEach(function(box){
    box.innerHTML = '<button type="button" data-lang="fr">FR</button><span>|</span><button type="button" data-lang="en">EN</button>';
    box.querySelectorAll('button').forEach(function(b){
      b.style.cssText = 'background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:0 3px';
      b.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        apply(b.dataset.lang);
      });
    });
  });

  collect();
  var saved = 'fr';
  try{ saved = localStorage.getItem('hc-lang') || 'fr'; }catch(e){}
  apply(saved);
})();


/* ============================================================
   v5 — CHARGE DE TRAVAIL (1 à 20 répétitions)
   Table de pourcentages moyens du 1RM selon le nombre de reps,
   d'apres les cadrages de la litterature en musculation.
   ============================================================ */
var HC_REPS_TABLE = [
  {reps:1,  pct:100, min:100, max:100, zone:"Force maximale"},
  {reps:2,  pct:95,  min:92,  max:97,  zone:"Force maximale"},
  {reps:3,  pct:92,  min:89,  max:94,  zone:"Force maximale"},
  {reps:4,  pct:89,  min:86,  max:92,  zone:"Force maximale"},
  {reps:5,  pct:86,  min:83,  max:89,  zone:"Force"},
  {reps:6,  pct:83,  min:80,  max:86,  zone:"Force"},
  {reps:7,  pct:80,  min:77,  max:83,  zone:"Force / hypertrophie"},
  {reps:8,  pct:78,  min:74,  max:81,  zone:"Hypertrophie"},
  {reps:9,  pct:75,  min:71,  max:79,  zone:"Hypertrophie"},
  {reps:10, pct:73,  min:68,  max:77,  zone:"Hypertrophie"},
  {reps:11, pct:70,  min:65,  max:75,  zone:"Hypertrophie"},
  {reps:12, pct:68,  min:63,  max:73,  zone:"Hypertrophie"},
  {reps:13, pct:66,  min:61,  max:71,  zone:"Hypertrophie / endurance"},
  {reps:14, pct:64,  min:59,  max:69,  zone:"Hypertrophie / endurance"},
  {reps:15, pct:62,  min:57,  max:67,  zone:"Endurance de force"},
  {reps:16, pct:60,  min:55,  max:65,  zone:"Endurance de force"},
  {reps:17, pct:59,  min:54,  max:63,  zone:"Endurance de force"},
  {reps:18, pct:57,  min:52,  max:61,  zone:"Endurance de force"},
  {reps:19, pct:56,  min:51,  max:60,  zone:"Endurance musculaire"},
  {reps:20, pct:54,  min:50,  max:58,  zone:"Endurance musculaire"}
];

function hcRounded(x){ return Math.round(x*2)/2; }

function hcEstimate1RM(weight, reps){
  if(!weight || !reps || reps < 1) return 0;
  if(reps === 1) return weight;
  var epley = weight * (1 + reps/30);
  var brzycki = weight * (36 / (37 - reps));
  return (epley + brzycki) / 2;
}

function hcRepsTable(){
  var out = document.getElementById('rmTable');
  var res = document.getElementById('rmOut');
  if(!out) return;
  var w = parseFloat(document.getElementById('rmWeight').value);
  var r = parseInt(document.getElementById('rmReps').value, 10);
  if(!w || !r || r < 1 || r > 20){
    if(res){ res.style.color = '#ff9a9a'; res.textContent = 'Renseigne une charge valide et un nombre de repetitions entre 1 et 20.'; }
    out.innerHTML = '';
    return;
  }
  var rm = hcEstimate1RM(w, r);
  if(res){ res.style.color = 'var(--green)'; res.textContent = '1RM estime : ' + hcRounded(rm) + ' kg';
    if(window.HC_APERCU_FORCE) window.HC_APERCU_FORCE(hcRounded(rm)); }
  var rows = HC_REPS_TABLE.map(function(l){
    var charge = rm * l.pct / 100;
    var cMin = rm * l.min / 100, cMax = rm * l.max / 100;
    var cls = (l.reps === r) ? ' class="rowactive"' : '';
    return '<tr'+cls+'><td><b>'+l.reps+'</b></td>'+
           '<td>'+hcRounded(charge)+' kg</td>'+
           '<td>'+l.min+' - '+l.max+' % <span class="muted">('+hcRounded(cMin)+' - '+hcRounded(cMax)+' kg)</span></td>'+
           '<td class="muted">'+l.zone+'</td></tr>';
  }).join('');
  out.innerHTML = '<div style="overflow-x:auto;margin-top:18px">'+
    '<table class="rmtab"><thead><tr><th>Rep.</th><th>Charge de travail</th><th>Plage conseillee</th><th>Objectif</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="muted" style="font-size:12.5px;margin-top:10px">Estimations basees sur des moyennes scientifiques. La tolerance aux repetitions varie beaucoup selon les personnes : teste et ajuste.</p>';
}

/* ============================================================
   v5 — ZONES D'ENTRAINEMENT a partir de plusieurs chronos
   ============================================================ */
var HC_PERFS = [];

function hcParseTime(raw){
  var t = (raw||'').trim().split(':').map(Number);
  if(t.some(isNaN) || t.length < 2) return 0;
  if(t.length === 3) return t[0]*3600 + t[1]*60 + t[2];
  return t[0]*60 + t[1];
}
function hcFmtTime(sec){
  var m = Math.floor(sec/60), s = Math.round(sec%60);
  if(s === 60){ m += 1; s = 0; }
  return m + ':' + String(s).padStart(2,'0');
}
function hcFmtPace(secPerKm){
  var m = Math.floor(secPerKm/60), s = Math.round(secPerKm%60);
  if(s === 60){ m += 1; s = 0; }
  return m + ":" + String(s).padStart(2,'0');
}
function hcDistLabel(d){
  return (d % 1 === 0 ? d : d.toString().replace('.', ',')) + ' km';
}
function hcWhenLabel(w){
  return w === 0 ? 'moins de 3 semaines' : (w === 1 ? '1 a 3 mois' : 'plus de 3 mois');
}

function hcDrawPerfs(){
  var box = document.getElementById('perfList');
  if(!box) return;
  if(!HC_PERFS.length){
    box.innerHTML = '<p class="muted" style="font-size:13px;margin:8px 0">Aucun chrono ajoute pour le moment.</p>';
    return;
  }
  box.innerHTML = HC_PERFS.map(function(p, i){
    return '<div class="perfitem"><span><b>'+hcDistLabel(p.dist)+'</b> - '+hcFmtTime(p.sec)+
           ' <span class="muted">('+hcWhenLabel(p.when)+')</span></span>'+
           '<button type="button" class="perfdel" data-i="'+i+'">Supprimer</button></div>';
  }).join('');
  box.querySelectorAll('.perfdel').forEach(function(b){
    b.onclick = function(){ HC_PERFS.splice(parseInt(b.dataset.i,10),1); hcDrawPerfs(); };
  });
}

function hcAddPerf(){
  var d = parseFloat(document.getElementById('perfDist').value);
  var raw = document.getElementById('perfTime').value;
  var when = parseInt(document.getElementById('perfWhen').value, 10) || 0;
  var sec = hcParseTime(raw);
  var res = document.getElementById('zOut');
  if(!sec){
    if(res){ res.style.color = '#ff9a9a'; res.textContent = 'Renseigne un temps valide, par exemple 22:00 ou 0:22:00.'; }
    return;
  }
  HC_PERFS.push({dist:d, sec:sec, when:when});
  document.getElementById('perfTime').value = '';
  if(res) res.textContent = '';
  hcDrawPerfs();
}

function hcComputeVMA(perfs){
  if(!perfs || !perfs.length) return 0;
  var poids = [1, 0.85, 0.65], somme = 0, total = 0;
  perfs.forEach(function(p){
    var t3000 = p.sec * Math.pow(3000 / (p.dist * 1000), 1.06);
    var w = poids[p.when] || 0.65;
    somme += t3000 * w; total += w;
  });
  return 3600 / ((somme/total) / 3) * 1.04;
}
function hcZonesList(vma){
  var z = [
    ['Recuperation', 0.55, 0.65],
    ['Endurance fondamentale', 0.65, 0.75],
    ['Endurance active (SV1)', 0.75, 0.82],
    ['Allure semi / marathon', 0.80, 0.85],
    ['Allure 10 km (SV2)', 0.85, 0.88],
    ['Allure 5 km', 0.88, 0.92],
    ['VO2 max / fractionne', 0.92, 1.00],
    ['Vitesse / cotes', 1.00, 1.10]
  ];
  return z.map(function(x){
    return {nom:x[0], a: hcFmtPace(3600/(vma*x[1])), b: hcFmtPace(3600/(vma*x[2]))};
  });
}
function hcComputeZones(){
  var out = document.getElementById('zOut');
  if(!out) return;
  if(!HC_PERFS.length){
    out.style.color = '#ff9a9a';
    out.textContent = 'Ajoute au moins un chrono recent pour calculer tes zones.';
    return;
  }
  var poids = [1, 0.85, 0.65];
  var somme = 0, totalPoids = 0;
  HC_PERFS.forEach(function(p){
    var t3000 = p.sec * Math.pow(3000 / (p.dist * 1000), 1.06);  /* modele de Riegel */
    var w = poids[p.when] || 0.65;
    somme += t3000 * w;
    totalPoids += w;
  });
  var t3000moyen = somme / totalPoids;
  var vma = 3600 / (t3000moyen / 3) * 1.04;

  function allure(pct){ return hcFmtPace(3600 / (vma * pct)) + ' /km'; }

  var zones = [
    ['Recuperation',           0.55, 0.65, 'Footing tres lent, retour au calme'],
    ['Endurance fondamentale', 0.65, 0.75, 'Allure de conversation, base aerobie'],
    ['Endurance active (SV1)', 0.75, 0.82, 'Footing soutenu, seuil bas'],
    ['Allure semi / marathon', 0.80, 0.85, 'Allure course longue distance'],
    ['Allure 10 km (SV2)',     0.85, 0.88, 'Seuil, effort soutenu'],
    ['Allure 5 km',            0.88, 0.92, 'Travail au seuil haut'],
    ['VO2 max / fractionne',   0.92, 1.00, 'Intervalles courts, 1 a 5 min'],
    ['Vitesse / cotes',        1.00, 1.10, 'Sprints courts, puissance']
  ];
  var lignes = zones.map(function(z){
    return '<div class="zone"><b>'+z[0]+'</b> <span class="zonepace">'+allure(z[1])+' -> '+allure(z[2])+'</span>'+
           '<span class="muted zonehint">'+z[3]+'</span></div>';
  }).join('');
  var recap = HC_PERFS.map(function(p){ return hcDistLabel(p.dist)+' en '+hcFmtTime(p.sec); }).join(' - ');

  out.style.color = 'var(--text)';
  if(window.HC_APERCU_COURSE) window.HC_APERCU_COURSE(vma, hcZonesList(vma));
  if(window.HC_APERCU_COURSE) window.HC_APERCU_COURSE(vma, hcZonesList(vma));
  out.innerHTML = '<div class="zonehead">VMA estimee : <b>'+vma.toFixed(1)+' km/h</b>'+
    '<span class="muted"> - 3 000 m equivalent : '+hcFmtTime(t3000moyen)+'</span></div>'+lignes+
    '<p class="muted" style="font-size:12.5px;margin-top:12px">Chronos utilises : '+recap+
    '. Les chronos recents pesent davantage. Estimation indicative : elle ne remplace pas un test de terrain encadre.</p>';
}

window.HC_CALC = {
  rm: hcEstimate1RM,
  vma: hcComputeVMA,
  zones: hcZonesList
};

document.getElementById('rmBtn')?.addEventListener('click', hcRepsTable);
document.getElementById('addPerf')?.addEventListener('click', hcAddPerf);
document.getElementById('zBtn')?.addEventListener('click', hcComputeZones);
hcDrawPerfs();


/* ============================================================
   v6 — "TON APERCU PERSONNALISE" : le calculateur vend
   Apres un calcul, on propose un apercu de programme + un pack.
   ============================================================ */
(function(){
  var html = ''
    + '<div id="apercu" class="apercu" style="display:none">'
    + '<div class="eyebrow">TON APERCU PERSONNALISE</div>'
    + '<h3 id="apercuTitre">Ton plan type</h3>'
    + '<div id="apercuCorps"></div>'
    + '<div id="apercuPack" class="packbox"></div>'
    + '</div>';
  var ancre = document.getElementById('zOut') || document.getElementById('rmOut');
  if(!ancre) return;
  var box = document.createElement('div');
  box.innerHTML = html;
  ancre.parentNode.insertBefore(box.firstChild, ancre.nextSibling);

  function afficher(titre, corps, pack){
    var a = document.getElementById('apercu');
    var t = document.getElementById('apercuTitre');
    var c = document.getElementById('apercuCorps');
    var p = document.getElementById('apercuPack');
    if(!a) return;
    t.textContent = titre;
    c.innerHTML = corps;
    p.innerHTML = pack;
    a.style.display = 'block';
    a.scrollIntoView({behavior:'smooth', block:'nearest'});
  }

  window.HC_APERCU_FORCE = function(rmKg){
    var corps = '<p class="muted">Sur la base de ton 1RM estime de <b>'+rmKg+' kg</b> : tes 2 prochaines semaines.</p>'
      + '<div class="prog">'
      + '<div class="progjour"><b>Lundi</b> Force basse, 4 x 5 reps a '+(Math.round(rmKg*0.80*2)/2)+' kg, repos 3 min</div>'
      + '<div class="progjour"><b>Mercredi</b> Hypertrophie, 3 x 10 reps a '+(Math.round(rmKg*0.70*2)/2)+' kg, repos 90 s</div>'
      + '<div class="progjour"><b>Vendredi</b> Force haute, 5 x 3 reps a '+(Math.round(rmKg*0.90*2)/2)+' kg, repos 4 min</div>'
      + '<div class="progjour"><b>Dimanche</b> Rappel technique, 3 x 8 reps a '+(Math.round(rmKg*0.65*2)/2)+' kg, sans forcer</div>'
      + '</div>'
      + '<p class="muted" style="margin-top:12px">Volume conseille : 10 a 14 series par groupe musculaire et par semaine. Progression de 2,5 % toutes les 2 semaines tant que la technique tient.</p>';
    var pack = '<b>Ce que contient le programme complet</b>'
      + '<ul class="packlist">'
      + '<li>Ton plan de force detaille, semaine par semaine, jusqu a 12 semaines</li>'
      + '<li>Toutes tes charges de travail de 1 a 20 repetitions</li>'
      + '<li>La progression hebdomadaire et les semaines de decharge</li>'
      + '<li>La prevention des blessures et les exercices correctifs</li>'
      + '<li>Un appel tous les 15 jours et le suivi de ta progression</li>'
      + '</ul>'
      + '<div class="packprix"><s>45 &euro; / mois</s> <span class="reduc">-33 %</span> <b>30 &euro; par mois</b> <span class="muted">sur 2 mois</span></div>'
      + '<a class="btn" href="#offres-coaching">D&eacute;bloquer mon programme complet</a>';
    afficher('Tes 2 prochaines semaines', corps, pack);
  };

  window.HC_APERCU_COURSE = function(vma, zones){
    var z = zones.slice(1).map(function(x){ return x.nom+', '+x.a+' a '+x.b; }).join(' | ');
    var corps = '<p class="muted">Sur la base de tes chronos, ta VMA estimee est de <b>'+vma.toFixed(1)+' km/h</b>.</p>'
      + '<div class="prog">'
      + '<div class="progjour"><b>Mardi</b> '+zones[2].nom+', 45 min a '+zones[2].a+' a '+zones[2].b+'</div>'
      + '<div class="progjour"><b>Jeudi</b> '+zones[5].nom+', 6 x 3 min a '+zones[5].a+' a '+zones[5].b+', recup 2 min</div>'
      + '<div class="progjour"><b>Samedi</b> '+zones[1].nom+', 1 h a '+zones[1].a+' a '+zones[1].b+'</div>'
      + '<div class="progjour"><b>Un autre jour</b> Renforcement et prevention des blessures, 40 min</div>'
      + '</div>'
      + '<p class="muted" style="margin-top:12px">Toutes tes allures : '+z+'</p>';
    var pack = '<b>Ce que contient le suivi complet</b>'
      + '<ul class="packlist">'
      + '<li>Ton plan sur Google Sheets, accessible sur telephone et ordinateur</li>'
      + '<li>Une mise a jour chaque week-end, adaptee a tes retours</li>'
      + '<li>Le cycle hiver (volume) puis le cycle ete (qualite et vitesse)</li>'
      + '<li>Le renforcement et la prevention des blessures</li>'
      + '<li>Un appel tous les 15 jours, en option</li>'
      + '</ul>'
      + '<div class="packprix"><b>30 &euro; les 2 mois</b> <span class="muted">ou 120 &euro; la saison complete, soit 10 &euro; par mois</span></div>'
      + '<a class="btn" href="#offres-coaching">D&eacute;bloquer mon plan complet</a>';
    afficher('Ta semaine type', corps, pack);
  };
})();

/* v9 - ouverture de la section philosophie */
document.getElementById('philoBtn')?.addEventListener('click',function(){
  var sec=document.getElementById('philosophie');
  if(!sec) return;
  sec.classList.toggle('open');
  var ouvert = sec.classList.contains('open');
  this.textContent = ouvert ? 'MASQUER MA PHILOSOPHIE' : 'DÉCOUVRIR MA PHILOSOPHIE DU COACHING';
  if(ouvert) sec.scrollIntoView({behavior:'smooth',block:'start'});
});

/* ============================================================
   v12 — Paiement PayPal : collecte des informations puis redirection
   ============================================================ */
document.addEventListener('DOMContentLoaded', function(){
  /* v13 : colle ici ton pseudo PayPal.me. */
  var PAYPAL_ME = 'victormoney77';
  var PROG = null;
  var modale = document.getElementById('paywall');

  function ouvrir(nom, prix){
    PROG = {nom:nom, prix:prix};
    document.getElementById('payProgramme').textContent = nom;
    document.getElementById('payPrix').textContent = prix;
    document.getElementById('payOk').hidden = true;
    document.getElementById('payForm').hidden = false;
    modale.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function fermer(){
    modale.hidden = true;
    document.body.style.overflow = '';
  }

  window.HC_OUVRIR_PAIEMENT = ouvrir;

  document.querySelectorAll('[data-pay]').forEach(function(b){
    b.addEventListener('click', function(e){
      e.preventDefault();
      ouvrir(b.dataset.pay, b.dataset.prix);
    });
  });

  document.getElementById('payClose')?.addEventListener('click', fermer);
  modale?.addEventListener('click', function(e){ if(e.target === modale) fermer(); });

  document.querySelectorAll('.paytab').forEach(function(t){
    t.addEventListener('click', function(){
      document.querySelectorAll('.paytab').forEach(function(x){ x.classList.remove('on'); });
      t.classList.add('on');
      var compte = t.dataset.mode === 'compte';
      document.getElementById('payNoteCompte').hidden = !compte;
    });
  });

  /* v20 : second moyen de paiement. Colle ici ton pseudo Revolut.me (ex : 'victor123').
     Tant que c'est vide, le bouton "Payer par carte (Revolut)" reste caché. */
  var REVOLUT_ME = 'sportifhybride';
  var btnRev = document.getElementById('payRevolut');
  if(REVOLUT_ME && btnRev) btnRev.hidden = false;

  var USER = null;      /* utilisateur connecté (ou null) */
  var pwdBox = null;    /* champ mot de passe injecté pour "Créer mon compte" */
  var msgBox = document.createElement('p');
  msgBox.className = 'mini'; msgBox.id = 'payMsg'; msgBox.style.color = '#ff9a9a';
  document.getElementById('payForm')?.appendChild(msgBox);

  function modeCompte(){ var t=document.querySelector('.paytab.on'); return !!t && t.dataset.mode === 'compte' && !USER; }
  function majMode(){
    var f = document.getElementById('payForm'); if(!f) return;
    if(modeCompte() && !pwdBox){
      pwdBox = document.createElement('div');
      pwdBox.innerHTML = '<input id="payPwd" type="password" placeholder="Mot de passe (8 caractères minimum)" autocomplete="new-password">';
      document.getElementById('payMail').insertAdjacentElement('afterend', pwdBox);
    }
    if(pwdBox) pwdBox.hidden = !modeCompte();
  }
  document.querySelectorAll('.paytab').forEach(function(t){ t.addEventListener('click', majMode); });

  /* si connecté : champs préremplis, onglets masqués */
  HC.me().then(function(d){
    if(!d.user) return;
    USER = d.user;
    var set = function(id,v){ var e=document.getElementById(id); if(e){ e.value = v||''; e.readOnly = true; } };
    set('payPrenom', d.user.prenom); set('payNom', d.user.nom); set('payTel', d.user.tel || '—'); set('payMail', d.user.email);
    if(!d.user.tel){ var tl=document.getElementById('payTel'); if(tl){ tl.value=''; tl.readOnly=false; } }
    var tabs = document.querySelector('.paytabs'); if(tabs) tabs.hidden = true;
    var note = document.getElementById('payNoteCompte'); if(note) note.hidden = true;
  });

  function erreur(t){ msgBox.textContent = t; }

  /* vérifie le formulaire, crée (si besoin) le compte puis la commande sur le serveur.
     Renvoie une promesse : le paiement ne s'ouvre qu'une fois la commande enregistrée. */
  function valider(){
    erreur('');
    var p = document.getElementById('payPrenom').value.trim();
    var n = document.getElementById('payNom').value.trim();
    var t = document.getElementById('payTel').value.trim();
    var m = document.getElementById('payMail').value.trim();
    if(!p || !n || !t || !m){ erreur('Renseigne ton prénom, ton nom, ton téléphone et ton email pour continuer.'); return Promise.reject(); }
    var cons = document.getElementById('payConsent');
    if(cons && !cons.checked){ erreur('Coche la case pour confirmer l’envoi immédiat du contenu et la renonciation au droit de rétractation.'); return Promise.reject(); }
    var etape = Promise.resolve();
    if(modeCompte()){
      var pw = document.getElementById('payPwd') ? document.getElementById('payPwd').value : '';
      if(pw.length < 8){ erreur('Choisis un mot de passe d’au moins 8 caractères.'); return Promise.reject(); }
      etape = HC.api('/api/register', {prenom:p, nom:n, tel:t, email:m, password:pw}).then(function(d){ USER = d.user; });
    }
    return etape
      .then(function(){ return HC.api('/api/orders', {produit:PROG.nom, methode:PROG.methode, client:{prenom:p, nom:n, tel:t, email:m}}); })
      .then(function(d){
        PROG.ref = d.ref;
        if(parseInt(String(PROG.prix).replace(/[^0-9]/g,''),10) !== d.prix_eur){ throw new Error('Le prix a changé : recharge la page.'); }
        document.getElementById('payForm').hidden = true;
        document.getElementById('payOk').hidden = false;
      })
      .catch(function(e){ erreur(e && e.message ? e.message : 'Une erreur est survenue.'); throw e; });
  }

  var recu = ' Après le paiement, envoie ton reçu à castillovictor77600@gmail.com ou sur WhatsApp en rappelant ta référence pour recevoir ton programme. Il apparaît ensuite dans ta bibliothèque.';

  document.getElementById('payGo')?.addEventListener('click', function(){
    PROG.methode = 'paypal';
    valider().then(function(){
      if(!PAYPAL_ME) return;
      var montant = String(PROG.prix).replace(/[^0-9,\.]/g,'').replace(',','.');
      document.getElementById('payOk').innerHTML = '<p><b>Merci !</b> Commande <b>'+PROG.ref+'</b> enregistrée. Redirection vers PayPal…</p><p class="muted">'+recu+'</p>';
      setTimeout(function(){ window.location.href = 'https://www.paypal.me/' + PAYPAL_ME + '/' + montant + 'EUR'; }, 2600);
    }).catch(function(){});
  });

  btnRev?.addEventListener('click', function(){
    PROG.methode = 'revolut';
    valider().then(function(){
      if(!REVOLUT_ME) return;
      document.getElementById('payOk').innerHTML = '<p><b>Merci !</b> Commande <b>'+PROG.ref+'</b> enregistrée. Ouverture de Revolut…</p><p class="muted">Indique le montant de ' + PROG.prix + ' dans Revolut.' + recu + '</p>';
      setTimeout(function(){ window.location.href = 'https://revolut.me/' + REVOLUT_ME; }, 3400);
    }).catch(function(){});
  });
});

/* Bibliothèque / Mon espace : données réelles du compte */
(function(){
  var box = document.getElementById('mesAchats');
  var hello = document.getElementById('hello');
  var stat = document.getElementById('statsBox');
  var table = document.getElementById('cmdBody');
  var lib = document.getElementById('libItems');
  if(!box && !hello && !table && !lib) return;
  var STATUT = {payee:['Payée — disponible','' ], en_attente:['En attente de paiement','wait'], annulee:['Annulée','wait']};
  function datefr(d){ return d ? d.slice(0,10).split('-').reverse().join('/') : '-'; }
  function pill(st){ var x = STATUT[st] || [st,'wait']; return '<span class="status-pill '+x[1]+'">'+x[0]+'</span>'; }
  function lien(){ return 'https://wa.me/33767927163'; }

  HC.me().then(function(d){
    if(!d.user){
      var pane = document.querySelector('main.wrap');
      if(pane){
        pane.innerHTML = '<div class="eyebrow">MON ESPACE</div><h1 style="font-size:clamp(38px,6vw,64px)">CONNEXION REQUISE</h1>'
          + '<p class="muted" style="max-width:680px">Connecte-toi ou crée ton compte pour retrouver tes programmes et tes commandes.</p>'
          + '<div class="buttons" style="margin-top:22px"><a class="btn" href="compte.html">ME CONNECTER / CRÉER MON COMPTE</a></div>';
      }
      return;
    }
    var o = d.orders || [], payees = o.filter(function(x){ return x.status==='payee'; });
    if(hello) hello.textContent = 'BONJOUR ' + String(d.user.prenom).toUpperCase();
    if(stat) stat.innerHTML =
      '<div class="proof"><strong>'+payees.length+'</strong><span>Programmes disponibles</span></div>'
     +'<div class="proof"><strong>'+(o.length-payees.length-o.filter(function(x){return x.status==='annulee';}).length)+'</strong><span>Commandes en attente</span></div>'
     +'<div class="proof"><strong>'+o.length+'</strong><span>Commandes</span></div>';
    if(table) table.innerHTML = o.length ? o.map(function(x){
      return '<tr><td>'+HC.esc(x.ref)+'</td><td>'+HC.esc(x.produit)+'</td><td>'+x.prix_eur+' €</td><td>'+datefr(x.created_at)+'</td><td>'+pill(x.status)+'</td></tr>';
    }).join('') : '<tr><td colspan="5" class="muted">Aucune commande pour le moment.</td></tr>';
    var info = document.getElementById('infoBody');
    if(info) info.innerHTML = '<tr><td>Nom</td><td>'+HC.esc(d.user.prenom+' '+d.user.nom)+'</td></tr><tr><td>Email</td><td>'+HC.esc(d.user.email)+'</td></tr><tr><td>Téléphone</td><td>'+HC.esc(d.user.tel||'-')+'</td></tr>';
    if(box || lib){
      var vide = document.getElementById('achatsVide');
      var cible = box || lib;
      if(!o.length){ cible.innerHTML=''; if(vide) vide.hidden=false; }
      else {
        if(vide) vide.hidden = true;
        cible.innerHTML = o.map(function(x,i){
          var ok = x.status==='payee';
          return '<article class="card" style="min-height:200px"><div class="card-body"><span class="num">'+String(i+1).padStart(2,'0')+'</span><h3>'+HC.esc(x.produit).toUpperCase()+'</h3>'
            + '<p class="muted">Réf. '+HC.esc(x.ref)+' · '+pill(x.status)+'</p>'
            + (ok ? '<a class="btn" target="_blank" rel="noopener" href="'+lien()+'?text='+encodeURIComponent('Bonjour Victor, je souhaite recevoir mon programme '+x.produit+' (réf. '+x.ref+')')+'">RECEVOIR / OUVRIR MON PROGRAMME</a>'
                    : '<p class="muted">Dès que ton paiement est reçu, ton programme apparaît ici.</p>')
            + '</div></article>';
        }).join('');
      }
    }
    var out = document.getElementById('logoutBtn');
    if(out) out.onclick = function(){ HC.api('/api/logout').then(function(){ location.href='compte.html'; }); };
    var del = document.getElementById('delBtn');
    if(del) del.onclick = function(){
      if(!confirm('Supprimer définitivement ton compte ? Tes informations personnelles seront effacées.')) return;
      HC.api('/api/account/delete').then(function(){ location.href='index.html'; }).catch(function(e){ alert(e.message); });
    };
  });
})();


/* v15 - choix de la formule de coaching : clic sur une carte = selection */
document.addEventListener('DOMContentLoaded', function(){
  var cartes = document.querySelectorAll('.offres.choix .offre');
  if(!cartes.length) return;
  function choisir(c){ cartes.forEach(function(x){ x.classList.remove('sel'); }); c.classList.add('sel'); }
  cartes.forEach(function(c){
    c.setAttribute('tabindex','0');
    c.addEventListener('click', function(){ choisir(c); });
    c.addEventListener('keydown', function(e){ if((e.key==='Enter'||e.key===' ') && e.target===c){ e.preventDefault(); choisir(c); } });
  });
});


/* v20 - aide avant paiement : WhatsApp + e-mail */
document.addEventListener('DOMContentLoaded', function(){
  var NUM = '33767927163', MAIL = 'castillovictor77600@gmail.com';
  function wa(msg){ return 'https://wa.me/' + NUM + '?text=' + encodeURIComponent(msg); }
  function ml(sujet, msg){ return 'mailto:' + MAIL + '?subject=' + encodeURIComponent(sujet) + '&body=' + encodeURIComponent(msg); }
  function liens(titre){
    return '<a class="wa-link" target="_blank" rel="noopener" href="' + wa('Bonjour Victor, j\'ai une question sur : ' + titre) + '">WhatsApp</a>' +
           '<a class="wa-link mail-link" href="' + ml('Question sur : ' + titre, 'Bonjour Victor,\n\nJ\'ai une question sur : ' + titre + '\n\n') + '">E-mail</a>';
  }
  var boutons = document.querySelectorAll('[data-pay]');
  if(!boutons.length) return;
  var h1 = document.querySelector('h1');
  var titre = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : 'ton programme';
  var dernier = boutons[boutons.length - 1];
  var conteneur = dernier.closest('.grid, .offres, .actions05') || dernier.parentElement;
  var p = document.createElement('p');
  p.className = 'wa-help';
  p.innerHTML = '<span class="muted">Une question avant de payer ?</span> ' + liens(titre);
  conteneur.insertAdjacentElement('afterend', p);
  var form = document.getElementById('payForm');
  if(form){
    var q = document.createElement('p');
    q.className = 'wa-help'; q.id = 'payWa';
    q.innerHTML = '<span class="muted">Une question ?</span> ' + liens(titre);
    form.appendChild(q);
    document.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('[data-pay]');
      if(!b) return;
      q.innerHTML = '<span class="muted">Une question ?</span> ' + liens(b.getAttribute('data-pay') + ' (' + b.getAttribute('data-prix') + ')');
    });
  }
});

/* v20 - photos et videos de preuve.
   Pour en ajouter : mets le fichier dans assets/preuves/ puis ajoute une ligne ci-dessous.
   Cles : victor, steve, fabio, valentine, parcours.
   Types : {t:'img', src:'assets/preuves/photo.webp', alt:'Description'}
           {t:'video', src:'assets/preuves/video.mp4'}   (25 Mo maximum par fichier)
           {t:'youtube', id:'IDENTIFIANT_DE_LA_VIDEO'}   (recommande pour les videos lourdes) */
window.HC_MEDIA = {
  victor: [{t:'img', src:'assets/preuves/victor-avant.webp', alt:'Développé couché : avant', label:'Avant'},{t:'img', src:'assets/preuves/victor-apres.webp', alt:'Développé couché : après', label:'Après'}],
  steve: [],
  fabio: [{t:'img', src:'assets/preuves/fabio-avant.webp', alt:'Fabio : avant', label:'Avant'},{t:'img', src:'assets/preuves/fabio-course.webp', alt:'Fabio sur la ligne de course', label:'Après'}],
  valentine: [],
  parcours: []
};
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('[data-media]').forEach(function(box){
    var items = (window.HC_MEDIA || {})[box.dataset.media] || [];
    if(!items.length){ box.hidden = true; return; }
    box.innerHTML = items.map(function(m){
      if(m.t === 'img'){
        var im = '<img loading="lazy" src="' + m.src + '" alt="' + (m.alt || 'Preuve de progression') + '">';
        return m.label ? '<figure><span class="mlabel">' + m.label + '</span>' + im + '</figure>' : im;
      }
      if(m.t === 'video') return '<video controls preload="metadata" playsinline src="' + m.src + '"></video>';
      if(m.t === 'youtube') return '<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/' + m.id + '" title="Video" allowfullscreen></iframe>';
      return '';
    }).join('');
  });
});

/* v20 - avis : "Lire la suite" sur les longs temoignages + liens Google */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.avis blockquote.long').forEach(function(bq){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'avis-more'; b.textContent = 'Lire la suite';
    b.addEventListener('click', function(){
      var open = bq.classList.toggle('open');
      b.textContent = open ? 'Réduire' : 'Lire la suite';
    });
    bq.insertAdjacentElement('afterend', b);
  });
  /* Quand ta fiche Google existe, colle ici ses deux liens (voir et laisser un avis) */
  var GOOGLE_VOIR = '', GOOGLE_LAISSER = '';
  var g = document.getElementById('googleAvis');
  if(g && (GOOGLE_VOIR || GOOGLE_LAISSER)){
    g.innerHTML = (GOOGLE_VOIR ? '<a class="btn alt" target="_blank" rel="noopener" href="' + GOOGLE_VOIR + '">VOIR LES AVIS GOOGLE</a>' : '') +
                  (GOOGLE_LAISSER ? '<a class="btn" target="_blank" rel="noopener" href="' + GOOGLE_LAISSER + '">LAISSER UN AVIS GOOGLE</a>' : '');
    g.hidden = false;
  }
});

/* v26 - photo du podium de Fabio (cote course a pied) + agrandissement du tableau */
window.HC_MEDIA.fabioCourse = [{t:'img', src:'assets/preuves/fabio-podium.webp', alt:'Fabio sur la première marche du podium'}];
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.zoomable').forEach(function(img){
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', function(){
      var o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;z-index:100;background:#000d;overflow:auto;padding:20px;cursor:zoom-out';
      o.innerHTML = '<img src="' + img.src + '" alt="' + img.alt + '" style="width:min(1000px,100%);margin:auto;display:block;border-radius:8px">';
      o.addEventListener('click', function(){ o.remove(); });
      document.body.appendChild(o);
    });
  });
});
