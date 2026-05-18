import type { Lead, ReviewSnippet } from "@/lib/types";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface TemplateData {
  lead: Lead;
  id: string;
  headline: string;
  tagline: string;
  cta: string;
  about: string;
  services: Array<{ name: string; desc: string }>;
  reviews: ReviewSnippet[];
  heroPhoto: string | null;
  heroVideo: string | null;
  galleryPhotos: string[];
  yearsEst: number;
  usingRealReviews: boolean;
  nicheTitle: string;
}

export function stars(rating: number) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export const FALLBACK_REVIEWS: ReviewSnippet[] = [
  { author: "James M.", rating: 5, text: "Showed up on time, did the job right, left everything spotless. I will absolutely use them again.", time_desc: "a month ago" },
  { author: "Sarah K.", rating: 5, text: "Called in the morning, they were out by noon. Incredibly professional from start to finish.", time_desc: "2 months ago" },
  { author: "Robert T.", rating: 5, text: "Best experience I've had with a local contractor. Transparent pricing, excellent work, no mess.", time_desc: "3 months ago" },
];

// ── PAGE SCRIPT ───────────────────────────────────────────────────────────────
// accentHex, accentLightHex are colours. bizName/bizCity used in modal copy.

export const PAGE_SCRIPT = (
  accentHex: string,
  accentLightHex: string,
  bizName: string,
  bizCity: string,
  niche: string,
) => `
(function(){
  var accent      = '${accentHex}';
  var accentLight = '${accentLightHex}';
  var BIZ         = ${JSON.stringify(bizName)};
  var CITY        = ${JSON.stringify(bizCity)};
  var NICHE       = ${JSON.stringify(niche)};
  var REDUCED     = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Prevent FOUC on GSAP-animated hero elements ───────────────────────────
  if (!REDUCED) {
    document.querySelectorAll('.hero-word').forEach(function(el){
      el.style.opacity   = '0';
      el.style.transform = 'translateY(56px) rotateX(-45deg)';
    });
    var _hs = document.querySelector('.hero-sub');
    var _hb = document.querySelector('.hero-btns');
    if (_hs) _hs.style.opacity = '0';
    if (_hb) _hb.style.opacity = '0';
  }

  // ── Scroll reveal (IntersectionObserver — no CDN needed) ──────────────────
  var revObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('on'); revObs.unobserve(e.target); }
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(function(el){ revObs.observe(el); });

  // ── Card deck engine ──────────────────────────────────────────────────────
  function initDeck(stageId, prevId, nextId, dotsId) {
    var stage = document.getElementById(stageId);
    if (!stage) return;
    var cards = stage.querySelectorAll('.dk-card');
    var n = cards.length;
    if (n === 0) return;
    var idx = 0;

    function posClass(pos) {
      if (pos ===  0) return 'dk-p0';
      if (pos === -1) return 'dk-pm1';
      if (pos ===  1) return 'dk-pp1';
      if (pos === -2) return 'dk-pm2';
      if (pos ===  2) return 'dk-pp2';
      return 'dk-hid';
    }
    function update() {
      cards.forEach(function(card, i) {
        ['dk-hid','dk-pm2','dk-pm1','dk-p0','dk-pp1','dk-pp2'].forEach(function(c){ card.classList.remove(c); });
        var raw = ((i - idx) % n + n) % n;
        var pos = raw > n / 2 ? raw - n : raw;
        card.classList.add(posClass(pos));
      });
      stage.querySelectorAll('.ph-counter').forEach(function(el, i){ el.style.display = i === idx ? 'block' : 'none'; });
      document.querySelectorAll('#' + dotsId + ' [data-dot]').forEach(function(d, i) {
        d.style.background = i === idx ? accent : 'rgba(253,246,232,0.2)';
        d.style.width = i === idx ? '20px' : '6px';
      });
    }
    function go(dir) { idx = (idx + dir + n) % n; update(); }

    var pb = document.getElementById(prevId), nb = document.getElementById(nextId);
    if (pb) pb.addEventListener('click', function(){ go(-1); });
    if (nb) nb.addEventListener('click', function(){ go(1); });
    cards.forEach(function(card, i){ card.addEventListener('click', function(){ if(i!==idx){idx=i;update();} }); });

    var startX = 0;
    stage.addEventListener('touchstart', function(e){ startX=e.touches[0].clientX; },{passive:true});
    stage.addEventListener('touchend', function(e){ var dx=e.changedTouches[0].clientX-startX; if(Math.abs(dx)>44) go(dx<0?1:-1); },{passive:true});

    var wacc=0, wlocked=false;
    stage.addEventListener('wheel', function(e){
      if(Math.abs(e.deltaX)<Math.abs(e.deltaY)) return;
      e.preventDefault(); if(wlocked) return;
      wacc+=e.deltaX;
      if(Math.abs(wacc)>15){ go(wacc>0?1:-1); wacc=0; wlocked=true; setTimeout(function(){ wlocked=false; },280); }
    },{passive:false});

    document.querySelectorAll('#'+dotsId+' [data-dot]').forEach(function(d){
      d.addEventListener('click', function(){ idx=parseInt(d.dataset.dot); update(); });
    });
    update();
  }
  initDeck('rv-stage','rv-prev','rv-next','rv-dots');
  initDeck('ph-stage','ph-prev','ph-next','ph-dots');

  // ── Hamburger menu (works without GSAP) ───────────────────────────────────
  (function(){
    var hamburger  = document.getElementById('hamburger');
    var overlay    = document.getElementById('nav-overlay');
    var modal      = document.getElementById('nav-modal');
    var modalTitle = document.getElementById('modal-title');
    var modalBody  = document.getElementById('modal-content');
    var modalClose = document.getElementById('modal-close');
    if (!hamburger || !overlay) return;

    var menuOpen = false;

    // ── Modal content ─────────────────────────────────────────────
    var PRIVACY_HTML =
      '<h3>Information We Collect</h3>' +
      '<p>When you contact ' + BIZ + ', we may collect your name, phone number, email address, and service address. This information is used only to respond to your inquiry and schedule your service.</p>' +
      '<h3>How We Use Your Information</h3>' +
      '<p>We use your contact details to follow up on quotes, confirm appointments, and send occasional service reminders. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>' +
      '<h3>Data Retention</h3>' +
      '<p>We retain customer records for as long as necessary to fulfill the services requested and to comply with applicable legal obligations. You may request deletion of your information at any time by contacting us directly.</p>' +
      '<h3>Cookies</h3>' +
      '<p>This site may use basic cookies to improve your browsing experience. No tracking or advertising cookies are used.</p>' +
      '<h3>Contact Us</h3>' +
      '<p>Questions about this policy? Reach us through the contact information on this page or by phone.</p>';

    var LICENSE_HTML =
      '<h3>Licensing</h3>' +
      '<p>' + BIZ + ' holds all required state and local licenses to operate in ' + (CITY || 'our service area') + '. License numbers are available upon request and can be verified through your state licensing board.</p>' +
      '<h3>General Liability Insurance</h3>' +
      '<p>We carry comprehensive general liability insurance to protect your property in the unlikely event of accidental damage during any service we perform. Coverage documentation is available upon request before any work begins.</p>' +
      '<h3>Workers Compensation</h3>' +
      '<p>All employees and regular subcontractors working on your property are covered under our workers compensation policy. This protects you as the homeowner or business owner from liability for on-site injuries.</p>' +
      '<h3>Bonding</h3>' +
      '<p>' + BIZ + ' is fully bonded, providing an additional layer of financial protection for our customers. Proof of bonding is available upon request.</p>' +
      '<h3>Verify Our Credentials</h3>' +
      '<p>We encourage you to verify our license and insurance before any project begins. Simply ask and we will provide all documentation immediately.</p>';

    var TERMS_HTML =
      '<h3>Service Agreements</h3>' +
      '<p>All work performed by ' + BIZ + ' is based on a written estimate agreed upon before the project begins. We do not begin work without your explicit approval of scope and pricing.</p>' +
      '<h3>Payment Terms</h3>' +
      '<p>Payment is due upon completion of work unless alternative arrangements have been agreed upon in writing. We accept cash, check, and major credit cards. A deposit may be required for larger projects.</p>' +
      '<h3>Workmanship Warranty</h3>' +
      '<p>We stand behind our work. Labor performed by ' + BIZ + ' is warranted against defects for a period agreed upon at the time of service. Material warranties are subject to the terms of the manufacturer.</p>' +
      '<h3>Changes to Scope</h3>' +
      '<p>Any changes to the agreed scope of work will be discussed with you before proceeding. Additional costs resulting from unforeseen conditions will be communicated immediately and require your approval.</p>' +
      '<h3>Cancellation</h3>' +
      '<p>You may cancel a scheduled appointment at any time with reasonable notice. Cancellations within 24 hours of a scheduled appointment may be subject to a cancellation fee.</p>';

    // ── Open / close overlay ──────────────────────────────────────
    function openMenu() {
      menuOpen = true;
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded','true');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (!REDUCED && typeof gsap !== 'undefined') {
        gsap.fromTo('.nav-main-item',
          { x: -55, opacity: 0 },
          { x: 0, opacity: 1, stagger: 0.09, duration: 0.75, ease: 'expo.out', delay: 0.08 }
        );
        gsap.fromTo('.nav-sub-row',
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', delay: 0.65 }
        );
        gsap.fromTo('.nav-footer-info',
          { opacity: 0 },
          { opacity: 1, duration: 0.5, ease: 'expo.out', delay: 0.72 }
        );
      }
    }

    function closeMenu(cb) {
      if (!REDUCED && typeof gsap !== 'undefined') {
        gsap.timeline({ onComplete: function(){
          menuOpen = false;
          hamburger.classList.remove('open');
          hamburger.setAttribute('aria-expanded','false');
          overlay.classList.remove('open');
          document.body.style.overflow = '';
          if (cb) cb();
        }})
        .to('.nav-main-item', { x: -35, opacity: 0, stagger: 0.04, duration: 0.28, ease: 'expo.in' });
      } else {
        menuOpen = false;
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded','false');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
        if (cb) setTimeout(cb, 480);
      }
    }

    hamburger.addEventListener('click', function(){ menuOpen ? closeMenu() : openMenu(); });

    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){
        if (modal && modal.classList.contains('open')) closeModal();
        else if (menuOpen) closeMenu();
      }
    });

    // ── 3D tilt per item ──────────────────────────────────────────
    document.querySelectorAll('.nav-main-item').forEach(function(item){
      item.addEventListener('mouseenter', function(){ item.style.transition='transform 0.08s ease'; });
      item.addEventListener('mousemove', function(e){
        var r  = item.getBoundingClientRect();
        var cx = (e.clientX - r.left) / r.width  - 0.5;
        var cy = (e.clientY - r.top)  / r.height - 0.5;
        item.style.transform = 'perspective(1000px) translateZ(30px) rotateX('+(-cy*5)+'deg) rotateY('+(cx*4)+'deg)';
      });
      item.addEventListener('mouseleave', function(){
        item.style.transition = 'transform 0.5s cubic-bezier(.16,1,.3,1)';
        item.style.transform  = 'perspective(1000px) translateZ(0) rotateX(0) rotateY(0)';
      });
    });

    // ── Navigate to page section ──────────────────────────────────
    function navTo(sectionId) {
      closeMenu(function(){
        var el = sectionId === 'hero-section'
          ? null
          : document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // ── Modal ─────────────────────────────────────────────────────
    function openModal(title, html) {
      if (!modal || !modalTitle || !modalBody) return;
      modalTitle.textContent = title;
      modalBody.innerHTML = html;
      modal.classList.add('open');
    }
    function closeModal() { if (modal) modal.classList.remove('open'); }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });

    // ── Wire up all [data-nav] elements ───────────────────────────
    document.querySelectorAll('[data-nav]').forEach(function(el){
      el.addEventListener('click', function(){
        var nav = el.dataset.nav;
        if      (nav === 'privacy') openModal('Privacy Policy',      PRIVACY_HTML);
        else if (nav === 'license') openModal('License & Insurance', LICENSE_HTML);
        else if (nav === 'terms')   openModal('Terms of Service',    TERMS_HTML);
        else                        navTo(nav);
      });
    });
  })();

  // ── Contact / Estimate form ───────────────────────────────────────────────
  (function(){
    var form    = document.getElementById('estimate-form');
    var success = document.getElementById('estimate-success');
    var errEl   = document.getElementById('form-error');
    if (!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var terms = form.querySelector('[name="accept_terms"]');
      if (!terms || !terms.checked) {
        if (errEl) {
          errEl.textContent = 'Please accept the Privacy Policy and Terms of Service to continue.';
          errEl.style.display = 'block';
          errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
      if (errEl) errEl.style.display = 'none';
      form.style.display = 'none';
      if (success) { success.style.display = 'block'; success.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
  })();

  if (REDUCED) return;

  // ── CDN fallback ─────────────────────────────────────────────────────────
  var _fallback = setTimeout(function(){
    document.querySelectorAll('.hero-word').forEach(function(el){
      el.style.transition='opacity 0.6s ease, transform 0.6s ease';
      el.style.opacity='1'; el.style.transform='none';
    });
    var hs2=document.querySelector('.hero-sub'), hb2=document.querySelector('.hero-btns');
    if(hs2){hs2.style.transition='opacity 0.6s';hs2.style.opacity='1';}
    if(hb2){hb2.style.transition='opacity 0.6s';hb2.style.opacity='1';}
  }, 5000);

  function loadScript(src, cb) {
    var s=document.createElement('script'); s.src=src; s.onload=cb; document.head.appendChild(s);
  }

  loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js', function(){
    loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js', function(){
      loadScript('https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js', function(){
        clearTimeout(_fallback);
        gsap.registerPlugin(ScrollTrigger);
        initNicheScene();
        initGSAP();
        initCursor();
      });
    });
  });

  // ── Niche-specific 3D scene ───────────────────────────────────────────────

  // Roof panel helper: flat XZ box + alternating shingle rows
  function buildRoofPanel(width, depth, rows, cols, matA, matB) {
    var grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.BoxGeometry(width, 0.04, depth), matA));
    var sw=(width/cols)*0.86, sh=(depth/rows)*0.80;
    for(var r=0;r<rows;r++){
      for(var c=0;c<cols;c++){
        var ox=(c+0.5)*(width/cols)-width/2; if(r%2===1)ox+=(width/cols)*0.5;
        var oz=(r+0.5)*(depth/rows)-depth/2;
        var s=new THREE.Mesh(new THREE.BoxGeometry(sw,0.03,sh),(r+c)%3===0?matB:matA);
        s.position.set(ox,0.035,oz); grp.add(s);
      }
    }
    return grp;
  }

  // Window helper
  function addWin(grp, glassMat, frameMat, x, y, z, side) {
    var fw=side?0.07:0.54, fh=0.54, fd=side?0.54:0.07;
    var frame=new THREE.Mesh(new THREE.BoxGeometry(fw,fh,fd),frameMat); frame.position.set(x,y,z); grp.add(frame);
    var gw=side?0.07:0.42, gh=0.21, gd=side?0.42:0.07;
    var off=side?0.01:0.02;
    var g1=new THREE.Mesh(new THREE.BoxGeometry(gw,gh,gd),glassMat); g1.position.set(x,y+0.13,z+off); grp.add(g1);
    var g2=new THREE.Mesh(new THREE.BoxGeometry(gw,gh,gd),glassMat); g2.position.set(x,y-0.13,z+off); grp.add(g2);
  }

  // House scene (roofing / construction)
  function buildHouseGroup(aC) {
    var g=new THREE.Group();
    var wallM =new THREE.MeshStandardMaterial({color:0xf2e8d4,roughness:0.88});
    var trimM =new THREE.MeshStandardMaterial({color:0xddd0bc,roughness:0.80});
    var roofM =new THREE.MeshStandardMaterial({color:aC,roughness:0.92,metalness:0.04});
    var darkC =aC.clone(); darkC.multiplyScalar(0.70);
    var roofM2=new THREE.MeshStandardMaterial({color:darkC,roughness:0.96});
    var winM  =new THREE.MeshStandardMaterial({color:0x8ab8d0,roughness:0.05,metalness:0.80,transparent:true,opacity:0.92});
    var doorM =new THREE.MeshStandardMaterial({color:0x3e2410,roughness:0.90});
    var chimM =new THREE.MeshStandardMaterial({color:0x8b7560,roughness:0.90});
    var gndM  =new THREE.MeshStandardMaterial({color:0x3d6e2a,roughness:0.98});

    // Ground
    var gnd=new THREE.Mesh(new THREE.PlaneGeometry(14,10),gndM);
    gnd.rotation.x=-Math.PI/2; gnd.position.y=-1.0; gnd.receiveShadow=true; g.add(gnd);
    // Path
    var pm=new THREE.MeshStandardMaterial({color:0xc8baa8,roughness:0.95});
    var path=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.02,2.2),pm);
    path.position.set(0,-0.99,2.2); g.add(path);

    // House body
    var body=new THREE.Mesh(new THREE.BoxGeometry(3.6,2.2,2.8),wallM);
    body.position.y=0.1; body.castShadow=true; body.receiveShadow=true; g.add(body);
    // Foundation
    var fnd=new THREE.Mesh(new THREE.BoxGeometry(3.72,0.22,2.92),trimM);
    fnd.position.y=-0.88; g.add(fnd);

    // Roof math
    var rise=1.05, run=2.0, depth=3.05;
    var ang=Math.atan2(rise,run), hyp=Math.sqrt(rise*rise+run*run);

    // Gable triangles (front + back)
    [{z:1.41},{z:-1.41}].forEach(function(s){
      var sh=new THREE.Shape();
      sh.moveTo(-run,0); sh.lineTo(run,0); sh.lineTo(0,rise); sh.closePath();
      var gm=new THREE.Mesh(new THREE.ShapeGeometry(sh),wallM);
      gm.position.set(0,1.2,s.z); if(s.z<0)gm.rotation.y=Math.PI; g.add(gm);
    });

    // Roof panels (with shingles)
    var panL=buildRoofPanel(hyp,depth+0.3,9,11,roofM,roofM2);
    panL.position.set(-run/2,1.2+rise/2,0); panL.rotation.z=ang; g.add(panL);
    var panR=buildRoofPanel(hyp,depth+0.3,9,11,roofM,roofM2);
    panR.position.set( run/2,1.2+rise/2,0); panR.rotation.z=-ang; g.add(panR);

    // Ridge
    var ridge=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.10,depth+0.35),chimM);
    ridge.position.set(0,1.2+rise+0.03,0); g.add(ridge);

    // Chimney
    var chim=new THREE.Mesh(new THREE.BoxGeometry(0.38,1.05,0.38),chimM);
    chim.position.set(0.9,1.2+rise*0.55,0.6); chim.castShadow=true; g.add(chim);
    var cap=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.07,0.46),chimM);
    cap.position.set(0.9,1.2+rise+0.1,0.6); g.add(cap);

    // Gutters
    var gutM=new THREE.MeshStandardMaterial({color:0x909090,roughness:0.7,metalness:0.3});
    var gL=new THREE.Mesh(new THREE.BoxGeometry(depth+0.35,0.06,0.09),gutM);
    gL.position.set(-run,1.2,0); gL.rotation.z=ang; g.add(gL);
    var gR=gL.clone(); gR.position.set(run,1.2,0); gR.rotation.z=-ang; g.add(gR);
    var ds=new THREE.Mesh(new THREE.BoxGeometry(0.06,2.1,0.06),gutM);
    ds.position.set(-run-0.03,0.1,1.3); g.add(ds);

    // Windows
    addWin(g,winM,trimM,-1.0,0.28,1.43,false);
    addWin(g,winM,trimM, 1.0,0.28,1.43,false);
    addWin(g,winM,trimM, 1.82,0.28,0.2,true);

    // Attic circle window
    var aw=new THREE.Mesh(new THREE.CircleGeometry(0.18,8),winM);
    aw.position.set(0,1.2+rise*0.52,1.42); g.add(aw);

    // Door
    var dframe=new THREE.Mesh(new THREE.BoxGeometry(0.74,1.18,0.08),trimM);
    dframe.position.set(0,-0.22,1.45); g.add(dframe);
    var door=new THREE.Mesh(new THREE.BoxGeometry(0.57,1.02,0.07),doorM);
    door.position.set(0,-0.25,1.47); door.castShadow=true; g.add(door);
    var knob=new THREE.Mesh(new THREE.SphereGeometry(0.033,8,8),new THREE.MeshStandardMaterial({color:0xd4a017,metalness:0.9,roughness:0.1}));
    knob.position.set(0.21,-0.24,1.51); g.add(knob);
    // Steps
    [0,1].forEach(function(i){
      var st=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.1,(i+1)*0.2),trimM);
      st.position.set(0,-0.85+i*0.1,1.48+(i+1)*0.11); g.add(st);
    });

    return g;
  }

  // Landscape scene
  function buildLandscapeGroup(aC) {
    var g=new THREE.Group();
    var gndM=new THREE.MeshStandardMaterial({color:aC,roughness:0.98});
    var tGeo=new THREE.PlaneGeometry(12,8,22,15);
    var pos=tGeo.attributes.position;
    for(var i=0;i<pos.count;i++){
      var px=pos.getX(i),pz=pos.getZ(i);
      pos.setY(i,Math.sin(px*0.55)*0.30+Math.cos(pz*0.50)*0.22+Math.sin((px+pz)*0.38)*0.14);
    }
    tGeo.computeVertexNormals();
    var terrain=new THREE.Mesh(tGeo,gndM);
    terrain.rotation.x=-Math.PI/2; terrain.position.y=-0.8; terrain.receiveShadow=true; g.add(terrain);
    var trunkM=new THREE.MeshStandardMaterial({color:0x5a3820,roughness:0.9});
    var leafM=new THREE.MeshStandardMaterial({color:aC.clone().multiplyScalar(0.85),roughness:0.95});
    [[1.4,0,0.6],[3.0,0,-0.4],[-1.1,0,0.3],[-2.8,0,0.9]].forEach(function(p,i){
      var h=1.3+i*0.18;
      var tr=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.11,h,8),trunkM);
      tr.position.set(p[0],p[1]+h/2-0.8,p[2]); tr.castShadow=true; g.add(tr);
      [0,1,2].forEach(function(li){
        var lf=new THREE.Mesh(new THREE.ConeGeometry(0.4+li*0.10,0.68,8),leafM);
        lf.position.set(p[0],p[1]+h-0.8+0.34+li*0.40,p[2]); lf.castShadow=true; g.add(lf);
      });
    });
    return g;
  }

  // Generic commercial building (plumbing, HVAC, salon, law, medical, etc.)
  function buildGenericGroup(aC) {
    var g=new THREE.Group();
    var wallM=new THREE.MeshStandardMaterial({color:0xf0e8d8,roughness:0.85});
    var accM =new THREE.MeshStandardMaterial({color:aC,roughness:0.7,metalness:0.1});
    var winM =new THREE.MeshStandardMaterial({color:0x8ab8d0,roughness:0.05,metalness:0.7,transparent:true,opacity:0.9});
    var frmM =new THREE.MeshStandardMaterial({color:0xa0a0a0,roughness:0.5,metalness:0.5});
    var gndM =new THREE.MeshStandardMaterial({color:0x6b8060,roughness:0.98});
    var gnd=new THREE.Mesh(new THREE.PlaneGeometry(14,10),gndM);
    gnd.rotation.x=-Math.PI/2; gnd.position.y=-1.0; gnd.receiveShadow=true; g.add(gnd);
    var main=new THREE.Mesh(new THREE.BoxGeometry(4.0,2.8,2.5),wallM);
    main.position.y=0.4; main.castShadow=true; main.receiveShadow=true; g.add(main);
    var roof=new THREE.Mesh(new THREE.BoxGeometry(4.2,0.18,2.7),accM);
    roof.position.y=1.9; g.add(roof);
    var sign=new THREE.Mesh(new THREE.BoxGeometry(4.05,0.52,0.09),accM);
    sign.position.set(0,1.2,1.27); g.add(sign);
    [-1.2,0,1.2].forEach(function(x){
      var fr=new THREE.Mesh(new THREE.BoxGeometry(0.95,1.16,0.07),frmM);
      fr.position.set(x,0.2,1.26); g.add(fr);
      var wn=new THREE.Mesh(new THREE.BoxGeometry(0.82,1.04,0.07),winM);
      wn.position.set(x,0.2,1.28); g.add(wn);
    });
    var dM=new THREE.MeshStandardMaterial({color:0x353535,roughness:0.5,metalness:0.5});
    var dr=new THREE.Mesh(new THREE.BoxGeometry(0.66,1.32,0.07),dM);
    dr.position.set(0,-0.24,1.285); g.add(dr);
    return g;
  }

  function initNicheScene() {
    var canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    var W = canvas.offsetWidth || window.innerWidth;
    var H = canvas.offsetHeight || window.innerHeight;
    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(48, W/H, 0.1, 100);
    camera.position.set(5.5, 3.2, 8.5);
    camera.lookAt(1.2, 0.4, 0);

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;

    var rC=parseInt(accent.slice(1,3),16)/255, gC=parseInt(accent.slice(3,5),16)/255, bC=parseInt(accent.slice(5,7),16)/255;
    var aC = new THREE.Color(rC,gC,bC);

    // Lighting: warm sun + cool fill + hemisphere
    scene.add(new THREE.AmbientLight(0xfff0e0, 0.50));
    var sun=new THREE.DirectionalLight(0xffe8c0, 2.2);
    sun.position.set(8,14,6); sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=sun.shadow.camera.bottom=-7;
    sun.shadow.camera.right=sun.shadow.camera.top=7;
    scene.add(sun);
    var fill=new THREE.DirectionalLight(0xc8d8f0, 0.7);
    fill.position.set(-5,3,-3); scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xffe8c0, 0x3a6b28, 0.38));

    // Pick scene by niche
    var n=NICHE.toLowerCase(), mainGroup;
    if(/roof|shingle|gutter|siding|fascia|chimney|construct|remodel|home.improv/.test(n)){
      mainGroup=buildHouseGroup(aC);
    } else if(/landscape|lawn|garden|tree|turf|mow|hardscape|irrigat/.test(n)){
      mainGroup=buildLandscapeGroup(aC);
    } else {
      mainGroup=buildGenericGroup(aC);
    }
    mainGroup.position.x=1.2; // offset right so text has room
    scene.add(mainGroup);

    // Atmospheric particles
    var pN=200, pPos=new Float32Array(pN*3), pVel=[];
    for(var i=0;i<pN;i++){
      pPos[i*3]=(Math.random()-0.5)*18; pPos[i*3+1]=(Math.random()-0.5)*12; pPos[i*3+2]=(Math.random()-0.5)*12-3;
      pVel.push({vx:(Math.random()-0.5)*0.003, vy:0.003+Math.random()*0.005});
    }
    var pGeo=new THREE.BufferGeometry(); pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
    scene.add(new THREE.Points(pGeo,new THREE.PointsMaterial({color:aC,size:0.045,transparent:true,opacity:0.28})));

    // Drag-to-rotate on hero section
    var drag={on:false,px:0,py:0,vy:0.0018,vx:0};
    var hero=document.getElementById('hero-section');
    if(hero){
      hero.style.cursor='grab';
      function ds(x,y){drag.on=true;drag.px=x;drag.py=y;drag.vy=0;drag.vx=0;hero.style.cursor='grabbing';}
      function dm(x,y){
        if(!drag.on)return;
        drag.vy=(x-drag.px)*0.009; drag.vx=(y-drag.py)*0.005;
        mainGroup.rotation.y+=drag.vy;
        mainGroup.rotation.x=Math.max(-0.45,Math.min(0.45,mainGroup.rotation.x+drag.vx));
        drag.px=x; drag.py=y;
      }
      function de(){drag.on=false;hero.style.cursor='grab';}
      hero.addEventListener('mousedown',function(e){ds(e.clientX,e.clientY);},{passive:true});
      hero.addEventListener('mousemove',function(e){dm(e.clientX,e.clientY);},{passive:true});
      document.addEventListener('mouseup',de);
      hero.addEventListener('touchstart',function(e){ds(e.touches[0].clientX,e.touches[0].clientY);},{passive:true});
      hero.addEventListener('touchmove',function(e){e.preventDefault();dm(e.touches[0].clientX,e.touches[0].clientY);},{passive:false});
      document.addEventListener('touchend',de);
    }

    window.addEventListener('resize',function(){
      W=canvas.offsetWidth||window.innerWidth; H=canvas.offsetHeight||window.innerHeight;
      camera.aspect=W/H; camera.updateProjectionMatrix(); renderer.setSize(W,H);
    },{passive:true});

    var t=0;
    (function loop(){ requestAnimationFrame(loop); t+=0.008;
      // Auto-rotate + momentum decay
      if(drag.on){ drag.vy*=0.88; drag.vx*=0.88; }
      else { drag.vy+=(0.0018-drag.vy)*0.03; drag.vx*=0.90; }
      mainGroup.rotation.y+=drag.vy;
      mainGroup.rotation.x=Math.max(-0.40,Math.min(0.40,mainGroup.rotation.x+drag.vx));
      // Gentle camera bob
      camera.position.y=3.2+Math.sin(t*0.45)*0.055;
      // Particles drift upward
      var arr=pGeo.attributes.position.array;
      for(var i=0;i<pN;i++){arr[i*3]+=pVel[i].vx;arr[i*3+1]+=pVel[i].vy;if(arr[i*3+1]>6){arr[i*3+1]=-6;arr[i*3]=(Math.random()-0.5)*18;}}
      pGeo.attributes.position.needsUpdate=true;
      renderer.render(scene,camera);
    })();
  }

  // ── GSAP scroll animations ────────────────────────────────────────────────
  function initGSAP() {
    if (typeof gsap === 'undefined') return;

    var words = document.querySelectorAll('.hero-word');
    if (words.length) gsap.to(words,{y:0,rotationX:0,opacity:1,duration:1.15,stagger:0.07,ease:'expo.out',delay:0.2,clearProps:'transform,opacity'});

    gsap.to('.hero-sub',  {opacity:1,y:0,duration:1.0,ease:'expo.out',delay:0.82});
    gsap.to('.hero-btns', {opacity:1,y:0,duration:0.9,ease:'expo.out',delay:1.06});

    gsap.from('.trust-item',{y:32,opacity:0,stagger:0.1,duration:0.75,ease:'expo.out',scrollTrigger:{trigger:'.trust-strip',start:'top 88%'}});

    gsap.from('.svc-card',{y:72,rotateY:14,opacity:0,stagger:0.13,duration:1.0,ease:'expo.out',scrollTrigger:{trigger:'#services-section',start:'top 82%'}});

    document.querySelectorAll('.gsap-section-head').forEach(function(el){
      gsap.from(el,{y:42,opacity:0,duration:0.9,ease:'expo.out',scrollTrigger:{trigger:el,start:'top 87%'}});
    });

    gsap.from('.reviews-head',{y:42,opacity:0,duration:0.9,ease:'expo.out',scrollTrigger:{trigger:'.reviews-head',start:'top 87%'}});
    gsap.from('.about-left', {x:-55,opacity:0,duration:1.05,ease:'expo.out',scrollTrigger:{trigger:'.about-grid',start:'top 80%'}});
    gsap.from('.about-right',{x: 55,opacity:0,duration:1.05,ease:'expo.out',delay:0.1,scrollTrigger:{trigger:'.about-grid',start:'top 80%'}});
    gsap.from('.contact-left', {x:-50,opacity:0,duration:1.1,ease:'expo.out',scrollTrigger:{trigger:'#contact-section',start:'top 82%'}});
    gsap.from('.contact-right',{x: 50,opacity:0,duration:1.1,ease:'expo.out',delay:0.14,scrollTrigger:{trigger:'#contact-section',start:'top 82%'}});

    document.querySelectorAll('[data-count]').forEach(function(el){
      ScrollTrigger.create({ trigger:el, start:'top 82%', once:true,
        onEnter:function(){
          var target=parseFloat(el.dataset.count), isFloat=el.dataset.count.indexOf('.')!==-1, obj={val:0};
          gsap.to(obj,{val:target,duration:1.8,ease:'power2.out',onUpdate:function(){
            el.textContent=isFloat?obj.val.toFixed(1):Math.round(obj.val).toString();
          }});
        }
      });
    });

    gsap.to('#hero-content',{y:-55,opacity:0,ease:'none',scrollTrigger:{trigger:'#hero-section',start:'center top',end:'bottom top',scrub:1.2}});
  }

  // ── Custom cursor ─────────────────────────────────────────────────────────
  function initCursor() {
    var dot=document.getElementById('cursor-dot'), ring=document.getElementById('cursor-ring');
    if(!dot||!ring) return;
    var mx=window.innerWidth/2,my=window.innerHeight/2,rx=mx,ry=my;
    document.addEventListener('mousemove',function(e){ mx=e.clientX;my=e.clientY; dot.style.transform='translate('+(mx-3)+'px,'+(my-3)+'px)'; },{passive:true});
    (function animRing(){ rx+=(mx-rx)*0.1; ry+=(my-ry)*0.1; ring.style.transform='translate('+(rx-16)+'px,'+(ry-16)+'px)'; requestAnimationFrame(animRing); })();
    document.querySelectorAll('a,button,.svc-card,.dk-card,.nav-main-item').forEach(function(el){
      el.addEventListener('mouseenter',function(){ ring.classList.add('cursor-expand'); });
      el.addEventListener('mouseleave',function(){ ring.classList.remove('cursor-expand'); });
    });
  }

})();
`;

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  cream:        "#fdf6e8",
  creamMid:     "#f5edd9",
  creamDeep:    "#eadfc8",
  ink:          "#1e1208",
  inkMid:       "#4a3728",
  inkMuted:     "#8a7060",
  inkGhost:     "#b0998a",
  terra:        "#b85c2a",
  terraMid:     "#d06e36",
  terraLight:   "#fbeadc",
  terraGlow:    "#f5d8c0",
  espresso:     "#1e1208",
  espressoMid:  "#2d1c0f",
  espressoDark: "#140e06",
  gold:         "#c9860a",
};

// ── WARM NEIGHBORHOOD TEMPLATE ────────────────────────────────────────────────

export function WarmNeighborhoodTemplate(d: TemplateData) {
  const {
    lead, id, headline, tagline, cta, about,
    services, reviews, heroPhoto, heroVideo,
    galleryPhotos, yearsEst, usingRealReviews,
  } = d;

  function nicheAccent(niche: string) {
    const n = niche.toLowerCase();
    if (/landscape|lawn|garden|tree|turf|irrigation|mow|hardscape/.test(n))
      return { accent: "#2d6b58", accentMid: "#3a8a70", accentLight: "#e0f0ea" };
    if (/dental|medic|health|doctor|clinic|ortho|chiro/.test(n))
      return { accent: "#1a6b7a", accentMid: "#1f8899", accentLight: "#d8f0f4" };
    if (/law|legal|attorney|firm/.test(n))
      return { accent: "#6b4a1a", accentMid: "#8a6020", accentLight: "#f0e4c8" };
    if (/salon|spa|beauty|hair|nail|barber/.test(n))
      return { accent: "#8a4060", accentMid: "#a85070", accentLight: "#f5e0ea" };
    return { accent: T.terra, accentMid: T.terraMid, accentLight: T.terraLight };
  }

  const { accent, accentMid, accentLight } = nicheAccent(lead.niche);

  const mapsUrl = lead.google_maps_id
    ? `https://www.google.com/maps/place/?q=place_id:${lead.google_maps_id}`
    : null;

  const headlineWords = headline.split(" ");

  const NAV_ITEMS = [
    { label: "Home",     id: "hero-section"     },
    { label: "Services", id: "services-section"  },
    { label: "Reviews",  id: "reviews-section"   },
    { label: "About Us", id: "about-section"     },
    { label: "Contact",  id: "contact-section"   },
  ];

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Figtree:wght@400;500;600&family=Source+Serif+4:ital,wght@1,400&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.cream}; }

        /* ── Custom cursor ───────────────────────────────── */
        @media (pointer: fine) { body, a, button, .svc-card, .dk-card, .nav-main-item { cursor: none; } }
        #cursor-dot {
          position: fixed; pointer-events: none; z-index: 9999;
          width: 6px; height: 6px; border-radius: 50%;
          background: ${accent}; top: 0; left: 0; will-change: transform;
        }
        #cursor-ring {
          position: fixed; pointer-events: none; z-index: 9998;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1.5px solid ${accent}bb; top: 0; left: 0; will-change: transform;
          transition: width .22s, height .22s, border-color .22s, margin .22s;
        }
        #cursor-ring.cursor-expand { width: 52px; height: 52px; border-color: ${accentLight}; margin: -10px 0 0 -10px; }

        /* ── Hamburger button ────────────────────────────── */
        #hamburger {
          display: flex; flex-direction: column; justify-content: center;
          gap: 5px; width: 40px; height: 40px;
          background: none; border: none; padding: 6px;
          position: relative; z-index: 203;
        }
        #hamburger span {
          display: block; height: 2px; border-radius: 2px;
          background: ${T.cream}; transform-origin: center;
          transition: transform 0.38s cubic-bezier(.16,1,.3,1), opacity 0.22s, width 0.3s;
        }
        #hamburger span:nth-child(1) { width: 22px; }
        #hamburger span:nth-child(2) { width: 16px; }
        #hamburger span:nth-child(3) { width: 20px; }
        #hamburger.open span:nth-child(1) { width: 22px; transform: translateY(7px) rotate(45deg); }
        #hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        #hamburger.open span:nth-child(3) { width: 22px; transform: translateY(-7px) rotate(-45deg); }

        /* ── Full-screen nav overlay ─────────────────────── */
        #nav-overlay {
          position: fixed; top: 60px; left: 0; right: 0; bottom: 0;
          z-index: 200; background: ${T.espressoDark};
          display: flex; flex-direction: column;
          transform: translateY(-105%);
          transition: transform 0.58s cubic-bezier(.16,1,.3,1);
          pointer-events: none; overflow-y: auto;
          will-change: transform;
        }
        #nav-overlay.open { transform: translateY(0); pointer-events: all; }

        /* ── Nav overlay inner items ─────────────────────── */
        .nav-main-item {
          display: flex; align-items: baseline; gap: 20px;
          padding: 8px 0; cursor: pointer;
          transform-style: preserve-3d; will-change: transform;
          user-select: none;
        }
        .nav-num {
          font-size: 12px; font-weight: 500; color: ${accent};
          font-family: 'Figtree', sans-serif; letter-spacing: 0.06em;
          min-width: 26px; opacity: 0.65;
          transition: opacity 0.2s;
        }
        .nav-label {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 800;
          font-size: clamp(38px, 7.5vw, 82px);
          color: ${T.cream}; letter-spacing: -0.03em; line-height: 1;
          transition: color 0.2s, letter-spacing 0.3s;
        }
        .nav-main-item:hover .nav-num    { opacity: 1; }
        .nav-main-item:hover .nav-label  { color: ${accentLight}; letter-spacing: -0.01em; }

        .nav-sub-item {
          font-size: 13px; font-weight: 500; color: rgba(253,246,232,0.3);
          cursor: pointer; padding: 5px 0; text-decoration: none; display: inline-block;
          transition: color 0.2s;
        }
        .nav-sub-item:hover { color: rgba(253,246,232,0.7); }

        /* ── Modal ───────────────────────────────────────── */
        #nav-modal {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(14,9,4,0.92); backdrop-filter: blur(14px);
          display: flex; align-items: center; justify-content: center;
          opacity: 0; pointer-events: none;
          transition: opacity 0.28s ease;
          padding: clamp(20px,4vw,48px);
        }
        #nav-modal.open { opacity: 1; pointer-events: all; }
        #modal-body {
          max-width: 620px; width: 100%; max-height: 82vh;
          overflow-y: auto; position: relative;
          background: ${T.espressoMid}; border-radius: 20px;
          padding: clamp(28px,4vw,48px);
          border: 1px solid rgba(253,246,232,0.08);
          box-shadow: 0 48px 120px rgba(0,0,0,0.65);
        }
        #modal-close {
          position: absolute; top: 18px; right: 18px;
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(253,246,232,0.07); border: none;
          color: ${T.cream}; font-size: 18px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        #modal-close:hover { background: rgba(253,246,232,0.14); }
        #modal-title {
          font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700;
          font-size: clamp(20px,3vw,30px); color: ${T.cream};
          margin-bottom: 22px; padding-right: 40px; letter-spacing: -0.02em;
        }
        #modal-content { font-size: 14px; line-height: 1.82; color: rgba(253,246,232,0.45); }
        #modal-content h3 {
          font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700;
          font-size: 14px; color: ${accentLight}; margin: 22px 0 8px;
          letter-spacing: 0.02em; text-transform: uppercase; font-size: 11px;
        }
        #modal-content p { margin-bottom: 12px; }

        /* ── Hero words ──────────────────────────────────── */
        .hero-word { display: inline-block; will-change: transform, opacity; }

        /* ── Animations ──────────────────────────────────── */
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
        @keyframes grain-shift {
          0%{background-position:0% 0%}10%{background-position:-5% -10%}
          20%{background-position:-15% 5%}30%{background-position:7% -25%}
          40%{background-position:-5% 25%}50%{background-position:-15% 10%}
          60%{background-position:15% 0%}70%{background-position:0% 15%}
          80%{background-position:3% 35%}90%{background-position:-10% 10%}
          100%{background-position:0% 0%}
        }
        @keyframes breathe { 0%,100%{opacity:1} 50%{opacity:2.2} }

        .h1 { animation: fadeIn .5s ease .05s both; }
        .reveal { opacity:0; transform:translateY(16px); transition:opacity .65s cubic-bezier(.16,1,.3,1),transform .65s cubic-bezier(.16,1,.3,1); }
        .reveal.on { opacity:1; transform:none; }
        .rd1{transition-delay:.07s}.rd2{transition-delay:.14s}.rd3{transition-delay:.21s}

        /* ── Service card ────────────────────────────────── */
        .svc-card { transition: border-color .2s, box-shadow .25s, transform .3s; }
        .svc-card:hover { border-color:${T.terraGlow}!important; box-shadow:0 12px 40px rgba(184,92,42,0.13); transform:translateY(-4px) scale(1.01); }
        .svc-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:${accent}; border-radius:16px 16px 0 0; }

        /* ── Buttons ─────────────────────────────────────── */
        .btn-primary { transition: opacity .2s, transform .15s; }
        .btn-primary:hover { opacity:.88; }
        .btn-primary:active { transform:scale(0.97); }
        .btn-ghost { transition: background .2s, border-color .2s, transform .15s; }
        .btn-ghost:hover { background:rgba(253,246,232,0.13); }
        .btn-ghost:active { transform:scale(0.97); }

        /* ── Film effects ────────────────────────────────── */
        .warm-grade { position:absolute; inset:0; pointer-events:none; background:rgba(184,92,42,0.07); mix-blend-mode:soft-light; }
        .grain-overlay { position:absolute; inset:0; pointer-events:none; opacity:0.038; mix-blend-mode:overlay;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
          background-size:256px 256px; animation:grain-shift 8s steps(10,end) infinite; }
        .ambient-glow { animation:breathe 6s ease-in-out infinite; }

        /* ── Review link ─────────────────────────────────── */
        .review-link:hover { color:${accentLight}!important; text-decoration:underline; text-underline-offset:3px; text-decoration-color:${accent}88; }

        /* ── Card deck ───────────────────────────────────── */
        .dk-stage { position:relative; overflow:visible; display:flex; align-items:center; justify-content:center; }
        .dk-card { position:absolute; border-radius:20px; overflow:hidden; cursor:pointer;
          transition:transform 0.48s cubic-bezier(0.16,1,0.3,1),opacity 0.48s ease,filter 0.48s ease,box-shadow 0.48s ease;
          user-select:none; -webkit-user-select:none; }
        .dk-card.dk-p0  { transform:translateX(0) scale(1) rotate(0deg); opacity:1; filter:none; z-index:20; box-shadow:0 28px 72px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.06); }
        .dk-card.dk-pm1 { transform:translateX(-148px) scale(0.80) rotate(-5deg); opacity:1; filter:brightness(0.38); z-index:14; }
        .dk-card.dk-pp1 { transform:translateX(148px)  scale(0.80) rotate(5deg);  opacity:1; filter:brightness(0.38); z-index:14; }
        .dk-card.dk-pm2 { transform:translateX(-245px) scale(0.62) rotate(-10deg); opacity:0.55; filter:brightness(0.18); z-index:8; }
        .dk-card.dk-pp2 { transform:translateX(245px)  scale(0.62) rotate(10deg);  opacity:0.55; filter:brightness(0.18); z-index:8; }
        .dk-card.dk-hid { opacity:0; pointer-events:none; z-index:1; transform:translateX(0) scale(0.5); }
        .dk-btn { width:40px; height:40px; border-radius:50%; background:rgba(253,246,232,0.07); border:1.5px solid rgba(253,246,232,0.15); color:${T.cream}; font-size:20px; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:background .2s,border-color .2s; }
        .dk-btn:hover { background:rgba(253,246,232,0.14); border-color:rgba(253,246,232,0.32); }

        /* ── Mobile ──────────────────────────────────────── */
        @media (max-width:720px) {
          .svc-grid,.about-grid { grid-template-columns:1fr!important; }
          .trust-grid { grid-template-columns:repeat(2,1fr)!important; }
          .dual-deck-panels { grid-template-columns:1fr!important; }
          .dk-card.dk-pm1 { transform:translateX(-110px) scale(0.80) rotate(-5deg); }
          .dk-card.dk-pp1 { transform:translateX(110px)  scale(0.80) rotate(5deg); }
          .dk-card.dk-pm2 { transform:translateX(-185px) scale(0.62) rotate(-10deg); }
          .dk-card.dk-pp2 { transform:translateX(185px)  scale(0.62) rotate(10deg); }
        }

        /* ── Reduced motion ──────────────────────────────── */
        @media (prefers-reduced-motion:reduce) {
          .grain-overlay,.ambient-glow { animation:none; }
          .hero-word,.hero-sub,.hero-btns { opacity:1!important; transform:none!important; }
          #cursor-dot,#cursor-ring { display:none; }
          .svc-card:hover { transform:none; }
          #nav-overlay { transition:none; }
        }

        /* ── Contact form ─────────────────────────────────── */
        .contact-grid { display:grid; grid-template-columns:1fr 1fr; gap:clamp(40px,6vw,80px); align-items:start; }
        .form-row-2   { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .form-label   { display:block; font-size:11px; font-weight:600; color:rgba(253,246,232,0.38); letter-spacing:0.06em; text-transform:uppercase; margin-bottom:6px; }
        .form-input   { width:100%; background:rgba(253,246,232,0.05); border:1px solid rgba(253,246,232,0.1); border-radius:8px; padding:12px 14px; font-size:14px; color:rgba(253,246,232,0.85); font-family:'Figtree',system-ui,sans-serif; outline:none; transition:border-color .18s,background .18s; -webkit-appearance:none; appearance:none; }
        .form-input::placeholder { color:rgba(253,246,232,0.2); }
        .form-input:focus { border-color:${accent}66; background:rgba(253,246,232,0.07); }
        .form-select  { background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(253,246,232,0.3)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 13px center; padding-right:36px; cursor:pointer; }
        .form-select option { background:${T.espresso}; color:${T.cream}; }
        .form-check   { display:flex; align-items:flex-start; gap:10px; cursor:pointer; font-size:12px; color:rgba(253,246,232,0.3); line-height:1.65; }
        .form-check input[type=checkbox] { width:15px; height:15px; accent-color:${accent}; margin-top:2px; flex-shrink:0; cursor:pointer; }
        .form-link    { background:none; border:none; color:${accentLight}; font-size:inherit; cursor:pointer; text-decoration:underline; text-underline-offset:2px; text-decoration-color:${accent}55; padding:0; font-family:inherit; display:inline; }
        .form-link:hover { text-decoration-color:${accentLight}; }

        /* ── Social icons ──────────────────────────────────── */
        .social-link  { display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; background:rgba(253,246,232,0.06); border:1px solid rgba(253,246,232,0.1); transition:background .2s,border-color .2s,transform .15s; color:rgba(253,246,232,0.45); text-decoration:none; }
        .social-link:hover { background:rgba(253,246,232,0.13); border-color:rgba(253,246,232,0.22); color:rgba(253,246,232,0.9); transform:translateY(-2px); }

        @media (max-width:720px) {
          .contact-grid,.form-row-2 { grid-template-columns:1fr!important; }
        }
      `}</style>

      {/* Cursor */}
      <div id="cursor-dot" />
      <div id="cursor-ring" />

      {/* ── FULL-SCREEN NAV OVERLAY ───────────────────────────────────────── */}
      <div id="nav-overlay" role="dialog" aria-modal="true" aria-label="Site navigation">
        {/* Main nav items */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "clamp(24px,5vw,56px) clamp(32px,7vw,100px)" }}>
          <nav>
            {NAV_ITEMS.map((item, i) => (
              <div key={item.id} className="nav-main-item" data-nav={item.id}>
                <span className="nav-num">0{i + 1}</span>
                <span className="nav-label">{item.label}</span>
              </div>
            ))}
          </nav>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(253,246,232,0.07)", margin: "clamp(20px,3vw,36px) 0 clamp(16px,2.5vw,28px)" }} />

          {/* Sub-links */}
          <div className="nav-sub-row" style={{ display: "flex", gap: "clamp(20px,4vw,40px)", flexWrap: "wrap" }}>
            <span className="nav-sub-item" data-nav="privacy">Privacy Policy</span>
            <span className="nav-sub-item" data-nav="license">License & Insurance</span>
            <span className="nav-sub-item" data-nav="terms">Terms of Service</span>
          </div>
        </div>

        {/* Footer info inside overlay */}
        <div className="nav-footer-info" style={{ padding: "20px clamp(32px,7vw,100px)", borderTop: "1px solid rgba(253,246,232,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ fontSize: 13, color: "rgba(253,246,232,0.3)", textDecoration: "none", fontWeight: 500 }}>{lead.phone}</a>
          )}
          {lead.city && (
            <span style={{ fontSize: 13, color: "rgba(253,246,232,0.2)", fontWeight: 400 }}>{lead.city}</span>
          )}
        </div>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────────────── */}
      <div id="nav-modal" role="dialog" aria-modal="true">
        <div id="modal-body">
          <button id="modal-close" aria-label="Close">✕</button>
          <div id="modal-title" />
          <div id="modal-content" />
        </div>
      </div>

      <div style={{ fontFamily: "'Figtree', system-ui, sans-serif", color: T.ink, background: T.cream, minHeight: "100vh" }}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 202,
          background: "rgba(30,18,8,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 clamp(20px,4vw,52px)", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 16, color: T.cream, letterSpacing: "-0.01em" }}>
            {lead.business_name}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} style={{ fontSize: 13, fontWeight: 600, color: accentLight, textDecoration: "none", borderBottom: `1px solid ${accentLight}55` }}>
                {lead.phone}
              </a>
            )}
            <button id="hamburger" aria-label="Open navigation" aria-expanded="false" aria-controls="nav-overlay">
              <span /><span /><span />
            </button>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section id="hero-section" style={{ position: "relative", minHeight: "100vh", background: T.espresso, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
          {heroVideo ? (
            <video autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, opacity: 0.5 }}>
              <source src={heroVideo} type="video/mp4" />
            </video>
          ) : heroPhoto ? (
            <img src={heroPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0, opacity: 0.35 }} />
          ) : null}

          <div className="warm-grade" style={{ zIndex: 1 }} />
          <div style={{ position: "absolute", inset: 0, zIndex: 2, background: `radial-gradient(ellipse at 65% 30%, ${accent}22 0%, transparent 52%), linear-gradient(to bottom, rgba(30,18,8,0.05) 0%, rgba(30,18,8,0.78) 60%, ${T.espresso} 100%)` }} />
          <div className="grain-overlay" style={{ zIndex: 3 }} />
          <canvas id="webgl-canvas" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 4, pointerEvents: "none" }} />

          <div id="hero-content" style={{ position: "relative", zIndex: 5, padding: "0 clamp(24px,5vw,56px) clamp(56px,8vh,96px)", width: "100%", maxWidth: 860 }}>
            {lead.rating && (
              <div className="h1" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <span style={{ color: T.gold, fontSize: 14, letterSpacing: 2 }}>{stars(lead.rating)}</span>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="review-link" style={{ fontSize: 13, color: "rgba(253,246,232,0.45)", fontWeight: 400, textDecoration: "none" }}>
                    {lead.rating} · {lead.review_count} reviews on Google
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: "rgba(253,246,232,0.45)", fontWeight: 400 }}>
                    {lead.rating} · {lead.review_count} reviews on Google
                  </span>
                )}
              </div>
            )}

            <h1 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(44px,8.5vw,108px)", lineHeight: 0.93, letterSpacing: "-0.025em", color: "#ffffff", marginBottom: 18, perspective: "800px" }}>
              {headlineWords.map((word, wi) => (
                <span key={wi} className="hero-word" style={{ display: "inline-block" }}>
                  {word}{wi < headlineWords.length - 1 ? " " : ""}
                </span>
              ))}
            </h1>

            {lead.city && (
              <div className="h1" style={{ fontSize: 13, fontWeight: 500, color: accentLight, letterSpacing: "0.04em", marginBottom: 20, opacity: 0.85, animationDelay: "0.4s" }}>
                {lead.city}{lead.niche ? ` · ${d.nicheTitle}` : ""}
              </div>
            )}

            <p className="hero-sub" style={{ fontSize: "clamp(15px,1.5vw,18px)", color: "rgba(253,246,232,0.48)", lineHeight: 1.75, maxWidth: 460, marginBottom: 44, fontWeight: 400 }}>
              {tagline}
            </p>

            <div className="hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="btn-primary" style={{ background: accent, color: "#fff", fontSize: 14, fontWeight: 600, padding: "14px 32px", borderRadius: 8, textDecoration: "none" }}>
                  {lead.phone}
                </a>
              )}
              <a href="#services-section" className="btn-ghost" style={{ background: "rgba(253,246,232,0.08)", color: "rgba(253,246,232,0.82)", fontSize: 14, fontWeight: 500, padding: "14px 32px", borderRadius: 8, border: "1.5px solid rgba(253,246,232,0.18)", textDecoration: "none" }}>
                {cta}
              </a>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
        <section className="trust-strip" style={{ background: accent }}>
          <div className="trust-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", maxWidth: 1200, margin: "0 auto" }}>
            {[
              { n: `${yearsEst}+`,  count: yearsEst,                 label: `Years in ${lead.city || "business"}` },
              { n: lead.review_count ? `${lead.review_count}+` : "100+", count: lead.review_count ?? 100, label: "Happy customers" },
              { n: lead.rating ? `${lead.rating} ★` : "5.0 ★", count: lead.rating ?? 5.0, label: "Google rating" },
              { n: "Free", count: null, label: "Estimates, always" },
            ].map((s, i) => (
              <div key={i} className="trust-item" style={{ padding: "28px 24px", borderRight: i < 3 ? "1px solid rgba(30,18,8,0.12)" : "none" }}>
                <div style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(28px,4vw,48px)", color: "#fff", lineHeight: 1, letterSpacing: "-0.02em", marginBottom: 4 }}>
                  {s.count !== null
                    ? <><span data-count={s.count}>{s.count}</span>{i === 2 ? " ★" : "+"}</>
                    : s.n}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SERVICES ─────────────────────────────────────────────────────── */}
        <section id="services-section" style={{ background: T.cream, padding: "clamp(56px,7vw,88px) clamp(24px,5vw,56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div className="gsap-section-head" style={{ marginBottom: 44 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>What we do</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(26px,3.5vw,44px)", color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                Services you can count on
              </h2>
            </div>
            <div className="svc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {services.map((s, i) => (
                <div key={i} className="svc-card" style={{ background: T.creamMid, borderRadius: 16, padding: "32px 28px", border: `1px solid ${T.creamDeep}`, position: "relative", overflow: "hidden" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 16, letterSpacing: "0.04em" }}>0{i + 1}</div>
                  <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 18, color: T.ink, letterSpacing: "-0.01em", marginBottom: 10 }}>{s.name}</h3>
                  <p style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.7, fontWeight: 400 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REVIEWS + PHOTOS ─────────────────────────────────────────────── */}
        {(reviews.length > 0 || galleryPhotos.length > 1) && (
          <section id="reviews-section" style={{ background: T.espresso, padding: "clamp(56px,7vw,96px) clamp(24px,5vw,56px)", overflow: "hidden", position: "relative" }}>
            <div className="ambient-glow" style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 60%, ${accent}14 0%, transparent 65%)`, pointerEvents: "none" }} />

            <div className="reviews-head" style={{ maxWidth: 1200, margin: "0 auto 56px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: `${T.cream}44`, marginBottom: 12 }}>
                {usingRealReviews ? "Real Google Reviews" : "Customer Reviews"}
                {lead.rating && ` · ${lead.rating} stars`}
              </div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(26px,3.5vw,44px)", color: T.cream, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                What clients say & what we do
              </h2>
            </div>

            <div className="dual-deck-panels" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: reviews.length > 0 && galleryPhotos.length > 1 ? "1fr 1fr" : "1fr", gap: "clamp(32px,5vw,64px)", alignItems: "start" }}>
              {reviews.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${T.cream}55`, marginBottom: 32 }}>What they say</div>
                  <div id="rv-stage" className="dk-stage" style={{ height: 380 }}>
                    {reviews.map((r, i) => (
                      <div key={i} className={`dk-card${i===0?" dk-p0":i===1?" dk-pp1":i===reviews.length-1?" dk-pm1":" dk-hid"}`} style={{ width: 280, background: T.creamMid, padding: "32px 28px 28px" }}>
                        <div style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontSize: 72, lineHeight: 0.7, color: accent, opacity: 0.6, marginBottom: 8, userSelect: "none" }}>&ldquo;</div>
                        <p style={{ fontFamily: "'Source Serif 4',Georgia,serif", fontStyle: "italic", fontSize: "clamp(14px,1.2vw,16px)", color: T.ink, lineHeight: 1.65, fontWeight: 400, marginBottom: 28, minHeight: 120 }}>
                          {r.text.length > 200 ? r.text.slice(0, 200) + "…" : r.text}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 20, borderTop: `1px solid ${T.creamDeep}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", flexShrink: 0 }}>{r.author[0]}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.author}</div>
                            <div style={{ fontSize: 11, color: T.inkGhost, marginTop: 2 }}>{r.time_desc}</div>
                          </div>
                          <div style={{ color: T.gold, fontSize: 11, letterSpacing: 1.5, flexShrink: 0 }}>{"★".repeat(r.rating)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
                    <button id="rv-prev" className="dk-btn" aria-label="Previous review">‹</button>
                    <div id="rv-dots" style={{ display: "flex", gap: 6, flex: 1, justifyContent: "center" }}>
                      {reviews.map((_, i) => <div key={i} data-dot={i} style={{ width: i===0?20:6, height: 6, borderRadius: 3, background: i===0?accent:"rgba(253,246,232,0.2)", transition: "all .28s", cursor: "pointer" }} />)}
                    </div>
                    <button id="rv-next" className="dk-btn" aria-label="Next review">›</button>
                  </div>
                </div>
              )}

              {galleryPhotos.length > 1 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: `${T.cream}55`, marginBottom: 32 }}>Our work</div>
                  <div id="ph-stage" className="dk-stage" style={{ height: 380 }}>
                    {galleryPhotos.map((url, i) => (
                      <div key={i} className={`dk-card${i===0?" dk-p0":i===1?" dk-pp1":i===galleryPhotos.length-1?" dk-pm1":i===2?" dk-pp2":i===galleryPhotos.length-2?" dk-pm2":" dk-hid"}`} style={{ width: 280, height: 300 }}>
                        <img src={url} alt={`${lead.business_name} work ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                        {i === 0 && (
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 20px 16px", background: "linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 100%)" }}>
                            <div className="ph-counter" style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>{`1 of ${galleryPhotos.length}`}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
                    <button id="ph-prev" className="dk-btn" aria-label="Previous photo">‹</button>
                    <div id="ph-dots" style={{ display: "flex", gap: 5, flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
                      {galleryPhotos.map((_, i) => <div key={i} data-dot={i} style={{ width: i===0?20:6, height: 6, borderRadius: 3, background: i===0?accent:"rgba(253,246,232,0.2)", transition: "all .28s", cursor: "pointer" }} />)}
                    </div>
                    <button id="ph-next" className="dk-btn" aria-label="Next photo">›</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── ABOUT ────────────────────────────────────────────────────────── */}
        <section id="about-section" style={{ background: T.cream, padding: "clamp(56px,7vw,88px) clamp(24px,5vw,56px)" }}>
          <div className="about-grid" style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px,6vw,80px)", alignItems: "start" }}>
            <div className="about-left">
              <div style={{ fontSize: 12, fontWeight: 600, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>About us</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(26px,3.5vw,44px)", color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 20 }}>
                {lead.business_name}
              </h2>
              <p style={{ fontSize: 16, color: T.inkMid, lineHeight: 1.85, fontWeight: 400 }}>{about}</p>
            </div>
            <div className="about-right" style={{ display: "flex", flexDirection: "column" }}>
              {["Licensed & fully insured", `${yearsEst}+ years in ${lead.city || "the area"}`, "Background-checked team", "Workmanship warranty on every job", "Free estimates — no obligation", "5-star rated on Google"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${T.creamDeep}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BUSINESS HOURS ───────────────────────────────────────────────── */}
        {lead.business_hours?.length ? (
          <section style={{ background: T.creamMid, padding: "clamp(40px,5vw,60px) clamp(24px,5vw,56px)" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Hours of operation</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: "clamp(22px,3vw,36px)", color: T.ink, letterSpacing: "-0.02em", marginBottom: 24 }}>
                When we're open
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0 48px" }}>
                {lead.business_hours.map((line, i) => {
                  const sep = line.indexOf(": ");
                  const day   = sep > -1 ? line.slice(0, sep) : line;
                  const hrs   = sep > -1 ? line.slice(sep + 2) : "";
                  const closed = hrs.toLowerCase().includes("closed");
                  const jsDay = new Date().getDay(); // 0=Sun,1=Mon…6=Sat; weekday_text[0]=Mon
                  const isToday = ((i + 1) % 7) === jsDay;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.creamDeep}` }}>
                      <span style={{ fontSize: 14, color: isToday ? accent : T.ink, fontWeight: isToday ? 700 : 500 }}>{day}</span>
                      <span style={{ fontSize: 13, color: closed ? "#ef4444" : T.inkMuted, fontWeight: isToday ? 600 : 400 }}>{hrs || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── CONTACT / ESTIMATE FORM ──────────────────────────────────────── */}
        <section id="contact-section" style={{ background: T.espresso, padding: "clamp(64px,9vw,104px) clamp(24px,5vw,56px)", position: "relative", overflow: "hidden" }}>
          <div className="ambient-glow" style={{ position: "absolute", top: 0, left: 0, width: "60%", height: "100%", background: `radial-gradient(ellipse at 15% 50%, ${accent}18 0%, transparent 65%)`, pointerEvents: "none" }} />
          <div className="contact-grid" style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>

            {/* Left — headline + contact info */}
            <div className="contact-left">
              <div style={{ fontSize: 12, fontWeight: 600, color: accentLight, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14, opacity: 0.75 }}>Free estimate</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: "clamp(34px,5vw,64px)", color: T.cream, letterSpacing: "-0.025em", lineHeight: 0.95, marginBottom: 24 }}>
                Request a free<br />estimate today
              </h2>
              <p style={{ fontSize: 15, color: "rgba(253,246,232,0.42)", lineHeight: 1.8, marginBottom: 40, fontWeight: 400 }}>
                Fill out the form and we'll be in touch within 24 hours — no pressure, no obligation.
              </p>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${accent}20`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.03 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                  </div>
                  <span style={{ fontSize: 15, color: accentLight, fontWeight: 600 }}>{lead.phone}</span>
                </a>
              )}
              {lead.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: `${accent}20`, border: `1px solid ${accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <span style={{ fontSize: 14, color: "rgba(253,246,232,0.38)", fontWeight: 400, lineHeight: 1.5 }}>{lead.location}</span>
                </div>
              )}
            </div>

            {/* Right — estimate form */}
            <div className="contact-right" id="estimate-form-wrap">
              <form id="estimate-form" style={{ display: "flex", flexDirection: "column", gap: 14 }} noValidate>
                <div className="form-row-2">
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input name="name" type="text" className="form-input" placeholder="Jane Smith" required />
                  </div>
                  <div>
                    <label className="form-label">Email Address *</label>
                    <input name="email" type="email" className="form-input" placeholder="jane@email.com" required />
                  </div>
                </div>
                <div className="form-row-2">
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input name="phone" type="tel" className="form-input" placeholder="(555) 000-0000" />
                  </div>
                  <div>
                    <label className="form-label">Zip Code</label>
                    <input name="zip" type="text" className="form-input" placeholder="12345" maxLength={10} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Street Address</label>
                  <input name="address" type="text" className="form-input" placeholder="123 Main Street" />
                </div>
                <div className="form-row-2">
                  <div>
                    <label className="form-label">How did you hear about us?</label>
                    <select name="heard" className="form-input form-select">
                      <option value="">Select one…</option>
                      <option value="google-search">Google Search</option>
                      <option value="google-maps">Google Maps</option>
                      <option value="referral">Friend / Referral</option>
                      <option value="social">Social Media</option>
                      <option value="sign">Flyer / Sign</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Service needed *</label>
                    <select name="service" className="form-input form-select" required>
                      <option value="">Select a service…</option>
                      {services.map((s) => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Consent checkboxes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 11, paddingTop: 8, borderTop: "1px solid rgba(253,246,232,0.07)", marginTop: 2 }}>
                  <label className="form-check">
                    <input type="checkbox" name="sms_info" />
                    <span>By checking, I agree to receive informational SMS communications regarding account notifications and customer care.</span>
                  </label>
                  <label className="form-check">
                    <input type="checkbox" name="sms_promo" />
                    <span>By checking, I agree to receive promotional SMS marketing messages from {lead.business_name}.</span>
                  </label>
                  <label className="form-check">
                    <input type="checkbox" name="accept_terms" />
                    <span>
                      By checking, I accept the{" "}
                      <button type="button" className="form-link" data-nav="privacy">Privacy Policy</button>
                      {" "}and{" "}
                      <button type="button" className="form-link" data-nav="terms">Terms of Service</button>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="estimate-submit"
                  style={{
                    background: accent, color: "#fff", fontSize: 15, fontWeight: 700,
                    padding: "16px 36px", borderRadius: 8, border: "none", cursor: "pointer",
                    marginTop: 6, width: "100%", letterSpacing: "-0.01em",
                    fontFamily: "'Figtree',system-ui,sans-serif", transition: "opacity .2s, transform .15s",
                  }}
                >
                  Request Free Estimate →
                </button>
                <p id="form-error" style={{ fontSize: 12, color: "#f87171", marginTop: 2, display: "none" }} />
              </form>

              {/* Success state */}
              <div id="estimate-success" style={{ display: "none", textAlign: "center", padding: "56px 24px" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${accent}22`, border: `2px solid ${accent}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 26, color: accentLight }}>✓</div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 24, color: T.cream, marginBottom: 12, letterSpacing: "-0.02em" }}>
                  Request received!
                </h3>
                <p style={{ fontSize: 15, color: "rgba(253,246,232,0.45)", lineHeight: 1.75 }}>
                  We'll be in touch within 24 hours to confirm your estimate.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ background: T.espressoDark, padding: "24px clamp(24px,5vw,56px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 13, fontWeight: 600, color: "rgba(253,246,232,0.2)", letterSpacing: "0.01em" }}>
              © {new Date().getFullYear()} {lead.business_name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {/* Social icons — only rendered when URLs are found */}
              {(lead.instagram_url || lead.facebook_url || lead.linkedin_url) && (
                <div style={{ display: "flex", gap: 8 }}>
                  {lead.instagram_url && (
                    <a href={lead.instagram_url} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                    </a>
                  )}
                  {lead.facebook_url && (
                    <a href={lead.facebook_url} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                      </svg>
                    </a>
                  )}
                  {lead.linkedin_url && (
                    <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/>
                        <rect x="2" y="9" width="4" height="12"/>
                        <circle cx="4" cy="4" r="2"/>
                      </svg>
                    </a>
                  )}
                </div>
              )}
              <span className="nav-sub-item" data-nav="privacy" style={{ fontSize: 12, color: "rgba(253,246,232,0.15)", fontWeight: 400, cursor: "pointer" }}>Privacy</span>
              <span className="nav-sub-item" data-nav="terms" style={{ fontSize: 12, color: "rgba(253,246,232,0.15)", fontWeight: 400, cursor: "pointer" }}>Terms</span>
              {(lead.city || lead.phone) && (
                <span style={{ fontSize: 12, color: "rgba(253,246,232,0.1)", fontWeight: 400 }}>{[lead.city, lead.phone].filter(Boolean).join(" · ")}</span>
              )}
            </div>
          </div>
        </footer>

      </div>

      <script dangerouslySetInnerHTML={{ __html: PAGE_SCRIPT(accent, accentLight, lead.business_name, lead.city ?? "", lead.niche) }} />
    </>
  );
}

// Variant aliases — all use the single Warm Neighborhood system.
export const DarkPremiumTemplate   = WarmNeighborhoodTemplate;
export const BoldEditorialTemplate = WarmNeighborhoodTemplate;
export const CleanLightTemplate    = WarmNeighborhoodTemplate;
export const PhotoForwardTemplate  = WarmNeighborhoodTemplate;
