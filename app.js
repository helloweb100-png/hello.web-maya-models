/* ==========================================================================
   MAYA MODELS · Landing corporativa · app.js
   - Sin dependencias. Cada módulo es independiente y falla en silencio.
   - No se usa window.onscroll: el scroll se resuelve con CSS scroll-driven
     animations (styles.css) e IntersectionObserver, sin recalcular por frame.
   - Respeta prefers-reduced-motion y dispositivos sin puntero fino.
   ========================================================================== */
(() => {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasIO = 'IntersectionObserver' in window;

    /** Número de WhatsApp (formato internacional sin "+") */
    const WA_NUMBER = '523311778898';

    /* ----------------------------------------------------------------------
       1. TEMA CLARO / OSCURO (con transición circular desde el botón)
       ---------------------------------------------------------------------- */
    function initTheme() {
        const btn = $('#theme-toggle');
        const meta = $('#meta-theme-color');
        if (!btn) return;

        const paint = (theme) => {
            root.setAttribute('data-theme', theme);
            if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0708' : '#f5f4f6');
            btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
            window.dispatchEvent(new Event('mm:theme'));
        };
        paint(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

        btn.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('mm-theme', next); } catch (e) { /* almacenamiento bloqueado */ }

            if (!document.startViewTransition || reduceMotion) { paint(next); return; }

            const r = btn.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            const transition = document.startViewTransition(() => paint(next));
            transition.ready.then(() => {
                root.animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                    { duration: 850, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' }
                );
            }).catch(() => {});
        });
    }

    /* ----------------------------------------------------------------------
       2. LOADER (progreso real: carga de página + fuentes + tiempo mínimo)
       ---------------------------------------------------------------------- */
    function initLoader() {
        const loader = $('#loader');
        const arc = $('.ld-arc');
        const pctEl = $('#ld-pct');
        const statusEl = $('#ld-status');

        const reveal = () => {
            root.classList.remove('is-loading');
            document.body.classList.add('is-ready');
        };
        if (!loader) { reveal(); return; }

        const MIN_MS = reduceMotion ? 350 : 2000;
        const messages = [
            [0, 'Preparando escenario'],
            [32, 'Encendiendo luces'],
            [62, 'Afinando reflectores'],
            [92, 'Listos para el show']
        ];
        const state = { load: document.readyState === 'complete', fonts: false };
        let progress = 0;
        let lastMsg = -1;
        let finished = false;
        const t0 = performance.now();

        if (!state.load) window.addEventListener('load', () => { state.load = true; }, { once: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { state.fonts = true; });
        else state.fonts = true;
        // Seguro: nunca dejamos al usuario esperando más de 6 s
        setTimeout(() => { state.load = true; state.fonts = true; }, 6000);

        const paintUI = (value) => {
            const v = Math.min(100, value);
            if (arc) arc.style.strokeDashoffset = String(100 - v);
            if (pctEl) pctEl.textContent = String(Math.floor(v));
            let idx = 0;
            messages.forEach((m, i) => { if (v >= m[0]) idx = i; });
            if (idx !== lastMsg && statusEl) { lastMsg = idx; statusEl.textContent = messages[idx][1]; }
        };

        const finish = () => {
            if (finished) return;
            finished = true;
            paintUI(100);
            reveal();
            loader.classList.add('is-exit');
            setTimeout(() => loader.classList.add('is-gone'), 1800);
        };

        const tick = (now) => {
            const elapsed = now - t0;
            const ready = state.load && state.fonts && elapsed >= MIN_MS;
            const target = ready ? 100 : Math.min(90, (elapsed / MIN_MS) * 90);
            progress = Math.min(target, progress + Math.max(0.35, (target - progress) * 0.09));
            paintUI(progress);
            if (progress >= 99.9) { setTimeout(finish, 320); return; }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    /* ----------------------------------------------------------------------
       3. HEADER: estado al hacer scroll, enlace activo y menú móvil
       ---------------------------------------------------------------------- */
    function initHeader() {
        const header = $('#header');
        const sentinel = $('#top-sentinel');
        if (header && sentinel && hasIO) {
            new IntersectionObserver(([entry]) => {
                header.classList.toggle('is-scrolled', !entry.isIntersecting);
            }).observe(sentinel);
        }

        // Enlace activo según la sección visible en el centro del viewport
        const links = $$('.nav a[data-nav]');
        const sections = $$('main > section[id]');
        if (links.length && sections.length && hasIO) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const id = entry.target.id;
                    links.forEach((link) => link.classList.toggle('is-active', link.dataset.nav === id));
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            sections.forEach((s) => io.observe(s));
        }
    }

    function initMenu() {
        const btn = $('#menu-toggle');
        const menu = $('#menu');
        if (!btn || !menu) return;

        $$('.menu-nav a', menu).forEach((a, i) => a.style.setProperty('--n', String(i)));
        const focusables = () => [btn, ...$$('a[href]', menu)];

        const setOpen = (open) => {
            menu.classList.toggle('is-open', open);
            if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            root.classList.toggle('menu-open', open);
            if (open) setTimeout(() => $('.menu-nav a', menu).focus({ preventScroll: true }), 120);
        };

        btn.addEventListener('click', () => setOpen(!menu.classList.contains('is-open')));
        menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
        document.addEventListener('keydown', (e) => {
            if (!menu.classList.contains('is-open')) return;
            if (e.key === 'Escape') { setOpen(false); btn.focus(); return; }
            if (e.key === 'Tab') {
                const list = focusables();
                const first = list[0];
                const last = list[list.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
    }

    /* ----------------------------------------------------------------------
       4. REVEAL AL HACER SCROLL
       ---------------------------------------------------------------------- */
    function initReveal() {
        const items = $$('[data-reveal]');
        if (!items.length) return;
        if (!hasIO || reduceMotion) { items.forEach((el) => el.classList.add('is-in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        items.forEach((el) => io.observe(el));
    }

    /* ----------------------------------------------------------------------
       5. CONTADORES
       ---------------------------------------------------------------------- */
    function initCounters() {
        const els = $$('[data-count]');
        if (!els.length || !hasIO || reduceMotion) return;
        const write = (el, value) => { el.textContent = Math.round(value) + (el.dataset.suffix || ''); };
        els.forEach((el) => write(el, 0));

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                const el = entry.target;
                const to = Number(el.dataset.count);
                const start = performance.now();
                const duration = 1900;
                const step = (now) => {
                    const k = Math.min(1, (now - start) / duration);
                    write(el, to * (1 - Math.pow(1 - k, 4)));
                    if (k < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            });
        }, { threshold: 0.6 });
        els.forEach((el) => io.observe(el));
    }

    /* ----------------------------------------------------------------------
       6. MANIFIESTO: separa palabras (el CSS las ilumina con el scroll)
       ---------------------------------------------------------------------- */
    function initManifesto() {
        const p = $('[data-words]');
        if (!p) return;
        const words = p.textContent.trim().replace(/\s+/g, ' ').split(' ');
        p.textContent = '';
        words.forEach((word, i) => {
            const span = document.createElement('span');
            span.className = 'mw';
            span.textContent = word;
            p.appendChild(span);
            if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
        });
    }

    /* ----------------------------------------------------------------------
       7. HERO: campo de partículas en canvas (red de luz carmesí)
       ---------------------------------------------------------------------- */
    function initParticles() {
        const canvas = $('#fx');
        const hero = $('#inicio');
        const ctx = canvas && canvas.getContext('2d');
        if (!canvas || !hero || !ctx) return;

        let W = 0, H = 0, particles = [], raf = 0, running = false, inView = true;
        const mouse = { x: -9999, y: -9999, on: false };
        let pal = readPalette();

        function readPalette() {
            const light = root.getAttribute('data-theme') === 'light';
            return light
                ? { dot: '200,16,31', line: '150,20,32', glow: '225,29,46', a: 0.8 }
                : { dot: '255,96,108', line: '255,140,148', glow: '255,59,74', a: 0.95 };
        }

        function spawn(initial) {
            return {
                x: Math.random() * W,
                y: initial ? Math.random() * H : H + 12,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -(0.12 + Math.random() * 0.42),
                r: 0.7 + Math.random() * 1.8,
                ember: Math.random() > 0.82,
                tw: Math.random() * Math.PI * 2
            };
        }

        function resize() {
            const rect = hero.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = Math.max(1, Math.round(rect.width));
            H = Math.max(1, Math.round(rect.height));
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.round(Math.min(120, Math.max(32, (W * H) / 15500)));
            particles = Array.from({ length: count }, () => spawn(true));
            if (!running) draw();
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            const link = W < 700 ? 88 : 124;
            const link2 = link * link;

            for (const p of particles) {
                p.x += p.vx; p.y += p.vy; p.tw += 0.03;
                if (mouse.on) {
                    const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
                    if (d2 < 22500) {
                        const f = (1 - Math.sqrt(d2) / 150) * 0.9;
                        p.x += dx * 0.02 * f; p.y += dy * 0.02 * f;
                    }
                }
                if (p.y < -12 || p.x < -12 || p.x > W + 12) Object.assign(p, spawn(false));
            }

            ctx.lineWidth = 1;
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
                    if (d2 < link2) {
                        ctx.strokeStyle = `rgba(${pal.line},${(1 - Math.sqrt(d2) / link) * 0.3 * pal.a})`;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
                if (mouse.on) {
                    const dx = a.x - mouse.x, dy = a.y - mouse.y, d2 = dx * dx + dy * dy;
                    if (d2 < 19600) {
                        ctx.strokeStyle = `rgba(${pal.glow},${(1 - Math.sqrt(d2) / 140) * 0.5})`;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                    }
                }
            }

            for (const p of particles) {
                const tw = 0.65 + 0.35 * Math.sin(p.tw);
                ctx.fillStyle = `rgba(${pal.dot},${(p.ember ? 0.95 : 0.6) * tw * pal.a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.ember ? 1.4 : 1), 0, 6.2832); ctx.fill();
                if (p.ember) {
                    ctx.fillStyle = `rgba(${pal.glow},${0.13 * tw})`;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5.5, 0, 6.2832); ctx.fill();
                }
            }
        }

        const loop = () => { if (!running) return; draw(); raf = requestAnimationFrame(loop); };
        const start = () => { if (running || reduceMotion || !inView || document.hidden) return; running = true; raf = requestAnimationFrame(loop); };
        const stop = () => { running = false; cancelAnimationFrame(raf); };

        resize();
        if (reduceMotion) return;

        if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }).observe(hero);
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        window.addEventListener('mm:theme', () => { pal = readPalette(); });
        if ('ResizeObserver' in window) {
            let t = 0;
            new ResizeObserver(() => { clearTimeout(t); t = setTimeout(resize, 160); }).observe(hero);
        } else window.addEventListener('resize', resize);

        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = hero.getBoundingClientRect();
                mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
            });
            hero.addEventListener('pointerleave', () => { mouse.on = false; });
        }
        start();
    }

    /* ----------------------------------------------------------------------
       8. HERO: parallax suave y foco de luz que sigue al cursor
       ---------------------------------------------------------------------- */
    function initHeroPointer() {
        const hero = $('#inicio');
        const visual = $('.hero-visual');
        if (!hero || !visual) return;
        $$('[data-depth]', visual).forEach((el) => el.style.setProperty('--depth', el.dataset.depth));
        if (reduceMotion || !finePointer) return;

        let tx = 0, ty = 0, cx = 0, cy = 0, mx = 0, my = 0, sx = 0, sy = 0, raf = 0;
        const clamp = (v) => Math.max(-1, Math.min(1, v));

        const loop = () => {
            cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
            sx += (mx - sx) * 0.12; sy += (my - sy) * 0.12;
            visual.style.setProperty('--px', cx.toFixed(3));
            visual.style.setProperty('--py', cy.toFixed(3));
            hero.style.setProperty('--mx', sx.toFixed(1) + 'px');
            hero.style.setProperty('--my', sy.toFixed(1) + 'px');
            const moving = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 || Math.abs(mx - sx) > 0.5 || Math.abs(my - sy) > 0.5;
            raf = moving ? requestAnimationFrame(loop) : 0;
        };
        const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            mx = e.clientX - r.left; my = e.clientY - r.top;
            tx = clamp((e.clientX - (r.left + r.width * 0.72)) / (r.width * 0.5));
            ty = clamp((e.clientY - (r.top + r.height * 0.5)) / (r.height * 0.5));
            kick();
        });
        hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
    }

    /* ----------------------------------------------------------------------
       9. BOTONES MAGNÉTICOS y SPOTLIGHT de tarjetas (solo puntero fino)
       ---------------------------------------------------------------------- */
    function initPointerEffects() {
        if (reduceMotion || !finePointer) return;
        $$('[data-magnetic]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - r.left - r.width / 2;
                const y = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${(x * 0.2).toFixed(1)}px, ${(y * 0.3).toFixed(1)}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
        $$('.bn').forEach((card) => {
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                card.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
    }

    /* ----------------------------------------------------------------------
       10. SERVICIOS: tabs accesibles con autoplay (la barra CSS marca el ritmo)
       ---------------------------------------------------------------------- */
    function initTabs() {
        const wrap = $('[data-tabs]');
        if (!wrap) return;
        const tabs = $$('[role="tab"]', wrap);
        const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
        panels.forEach((panel) => $$('.chips li', panel).forEach((li, i) => li.style.setProperty('--i', String(i))));

        let current = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
        let auto = !reduceMotion;
        wrap.dataset.auto = auto ? 'on' : 'off';

        const select = (index, focus) => {
            current = index;
            tabs.forEach((tab, i) => {
                const on = i === index;
                tab.setAttribute('aria-selected', String(on));
                tab.tabIndex = on ? 0 : -1;
                tab.classList.toggle('is-active', on);
                panels[i].hidden = !on;
                panels[i].classList.toggle('is-active', on);
            });
            // Reinicia la barra de progreso del tab activo
            const bar = $('.tab-bar', tabs[index]);
            if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
            if (focus) tabs[index].focus();
            // Centra el tab activo dentro del carrusel de pestañas (móvil), sin mover la página
            const list = tabs[index].parentElement;
            if (list.scrollWidth > list.clientWidth) {
                const left = tabs[index].offsetLeft - (list.clientWidth - tabs[index].offsetWidth) / 2;
                list.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        };

        const stopAuto = () => { auto = false; wrap.dataset.auto = 'off'; };

        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => { stopAuto(); select(i); });
            tab.addEventListener('keydown', (e) => {
                const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
                if (e.key in keys) {
                    e.preventDefault(); stopAuto();
                    select((i + keys[e.key] + tabs.length) % tabs.length, true);
                } else if (e.key === 'Home') { e.preventDefault(); stopAuto(); select(0, true); }
                else if (e.key === 'End') { e.preventDefault(); stopAuto(); select(tabs.length - 1, true); }
            });
        });

        // Avanza cuando termina la barra del tab activo
        wrap.addEventListener('animationend', (e) => {
            if (e.animationName === 'tabbar' && auto) select((current + 1) % tabs.length);
        });

        // Pausa si el usuario interactúa o la sección no está visible
        const pause = (on) => (on ? wrap.setAttribute('data-paused', '') : wrap.removeAttribute('data-paused'));
        let hovering = false, visible = true;
        const sync = () => pause(hovering || !visible);
        wrap.addEventListener('pointerenter', () => { hovering = true; sync(); });
        wrap.addEventListener('pointerleave', () => { hovering = false; sync(); });
        wrap.addEventListener('focusin', () => { hovering = true; sync(); });
        wrap.addEventListener('focusout', () => { hovering = false; sync(); });
        if (hasIO) new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.25 }).observe(wrap);
    }

    /* ----------------------------------------------------------------------
       11. COBERTURA: el radar resalta una ciudad a la vez
       ---------------------------------------------------------------------- */
    function initCoverage() {
        const section = $('#cobertura');
        const items = $$('[data-city]', section || document);
        if (!section || !items.length) return;
        const keys = ['gdl', 'cg', 'col', 'cdmx'];
        let idx = 0, timer = 0, paused = false, inView = false;

        const set = (key) => items.forEach((el) => el.classList.toggle('is-on', el.dataset.city === key));
        const next = () => { set(keys[idx]); idx = (idx + 1) % keys.length; };
        const stop = () => { clearInterval(timer); timer = 0; };
        const start = () => { if (reduceMotion || timer || paused || !inView) return; next(); timer = setInterval(next, 2600); };

        if (reduceMotion) { set(keys[0]); return; }
        if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }, { threshold: 0.3 }).observe(section);
        $$('#cities li').forEach((li) => {
            li.addEventListener('pointerenter', () => { paused = true; stop(); set(li.dataset.city); });
            li.addEventListener('pointerleave', () => { paused = false; start(); });
        });
    }

    /* ----------------------------------------------------------------------
       12. FAQ: un solo detalle abierto (respaldo para navegadores sin name="")
       ---------------------------------------------------------------------- */
    function initFaq() {
        const list = $$('.faq-list details');
        list.forEach((d) => d.addEventListener('toggle', () => {
            if (d.open) list.forEach((o) => { if (o !== d) o.open = false; });
        }));
    }

    /* ----------------------------------------------------------------------
       13. FORMULARIO: valida y abre WhatsApp con el mensaje ya armado
       ---------------------------------------------------------------------- */
    function initForm() {
        const form = $('#quote-form');
        if (!form) return;
        const submit = $('.form-submit', form);
        const label = $('.btn-label', form);
        const note = $('#form-note');
        const defaultNote = note.textContent;
        const defaultLabel = label.textContent;

        const dateInput = $('#f-fecha');
        if (dateInput) {
            const d = new Date();
            dateInput.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        const rules = {
            nombre: (v) => (v.trim().length >= 2 ? '' : 'Escribe tu nombre para saber a quién responder.'),
            servicio: (v) => (v ? '' : 'Elige qué necesitas para tu evento.'),
            ciudad: (v) => (v ? '' : 'Selecciona la ciudad del evento.')
        };

        const setError = (name, message) => {
            const input = form.elements[name];
            const field = input.closest('.field');
            const out = $('#e-' + name);
            field.classList.toggle('has-error', Boolean(message));
            if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
            if (out) out.textContent = message;
        };
        const check = (name) => {
            const message = rules[name](form.elements[name].value);
            setError(name, message);
            return !message;
        };

        Object.keys(rules).forEach((name) => {
            const el = form.elements[name];
            el.addEventListener('blur', () => { if (el.value || el.closest('.field').classList.contains('has-error')) check(name); });
            el.addEventListener('input', () => { if (el.closest('.field').classList.contains('has-error')) check(name); });
            el.addEventListener('change', () => { if (el.closest('.field').classList.contains('has-error')) check(name); });
        });

        const formatDate = (iso) => {
            const [y, m, d] = iso.split('-').map(Number);
            return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(y, m - 1, d));
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const results = Object.keys(rules).map((name) => [name, check(name)]);
            const firstBad = results.find(([, ok]) => !ok);
            if (firstBad) { form.elements[firstBad[0]].focus(); return; }

            const data = Object.fromEntries(new FormData(form).entries());
            const lines = [
                `Hola Maya Models, soy ${data.nombre.trim()}${data.empresa && data.empresa.trim() ? ` de ${data.empresa.trim()}` : ''}.`,
                `Quiero cotizar: ${data.servicio}.`,
                `Ciudad del evento: ${data.ciudad}.`
            ];
            if (data.fecha) lines.push(`Fecha aproximada: ${formatDate(data.fecha)}.`);
            if (data.mensaje && data.mensaje.trim()) lines.push(`Detalles: ${data.mensaje.trim()}`);
            const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;

            submit.classList.add('is-loading');
            label.textContent = 'Abriendo WhatsApp...';
            window.open(url, '_blank', 'noopener');

            setTimeout(() => {
                submit.classList.remove('is-loading');
                label.textContent = 'Mensaje listo';
                note.textContent = 'Se abrió WhatsApp con tu solicitud. Si no se abrió, ';
                const link = document.createElement('a');
                link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'toca aquí';
                note.append(link, '.');
                note.classList.add('is-ok');
                setTimeout(() => { label.textContent = defaultLabel; }, 5000);
            }, 1000);
        });

        form.addEventListener('reset', () => { note.textContent = defaultNote; note.classList.remove('is-ok'); });
    }

    /* ----------------------------------------------------------------------
       14. WHATSAPP FLOTANTE: invitación breve y año del footer
       ---------------------------------------------------------------------- */
    function initFloat() {
        const wa = $('#wa-float');
        if (wa) {
            setTimeout(() => wa.classList.add('show-tip'), 7000);
            setTimeout(() => wa.classList.remove('show-tip'), 12500);
        }
        const year = $('#year');
        if (year) year.textContent = String(new Date().getFullYear());
    }

    /* ----------------------------------------------------------------------
       ARRANQUE
       ---------------------------------------------------------------------- */
    const modules = [
        initTheme, initLoader, initHeader, initMenu, initReveal, initCounters, initManifesto,
        initParticles, initHeroPointer, initPointerEffects, initTabs, initCoverage, initFaq, initForm, initFloat
    ];
    modules.forEach((fn) => {
        try { fn(); } catch (err) { console.warn('[Maya Models] módulo no iniciado:', fn.name, err); }
    });
})();
