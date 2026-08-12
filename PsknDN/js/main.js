/* ============================================================
   main.js — Slide Navigation, Typing, Music, Animations
   "For My Love (Don't Be Angry)"
   ============================================================ */

'use strict';

// ============================================================
// STATE
// ============================================================
let currentSlide   = 0;
const TOTAL_SLIDES = 5;
let musicStarted   = false;
let typingDone     = false;

// ============================================================
// CUSTOM CURSOR — hanya untuk perangkat mouse (bukan touch)
// ============================================================
const isMouseDevice = window.matchMedia('(pointer: fine)').matches;

let mouseX = 0, mouseY = 0;
let ringX  = 0, ringY  = 0;
let cursorDot  = null;
let cursorRing = null;

if (isMouseDevice) {
    cursorDot  = document.createElement('div');
    cursorRing = document.createElement('div');
    cursorDot.className  = 'custom-cursor';
    cursorRing.className = 'cursor-ring';
    document.body.append(cursorDot, cursorRing);

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top  = mouseY + 'px';
    });

    (function animateCursorRing() {
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top  = ringY + 'px';
        requestAnimationFrame(animateCursorRing);
    })();
}

// ============================================================
// STARS (Slide 1)
// ============================================================
function generateStars() {
    const container = document.getElementById('starsContainer');
    if (!container) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 130; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2.2 + 0.4;
        star.style.cssText = `
            width:${size}px;
            height:${size}px;
            top:${Math.random() * 100}%;
            left:${Math.random() * 100}%;
            --dur:${(Math.random() * 4 + 2).toFixed(2)}s;
            --delay:${(Math.random() * 4).toFixed(2)}s;
        `;
        fragment.appendChild(star);
    }
    container.appendChild(fragment);
}

// ============================================================
// SLIDE NAVIGATION
// ============================================================
function showSlide(index) {
    if (index < 0 || index >= TOTAL_SLIDES) return;

    const slides = document.querySelectorAll('.slide');
    const dots   = document.querySelectorAll('.dot');
    const dotsEl = document.getElementById('slideDots');

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    slides[index].classList.add('active');
    dots[index].classList.add('active');

    // Scroll slide to top on change
    slides[index].scrollTop = 0;

    currentSlide = index;

    // Show nav dots from slide 2 onward
    if (index > 0) {
        dotsEl.classList.add('visible');
    } else {
        dotsEl.classList.remove('visible');
    }

    // Per-slide triggers
    switch (index) {
        case 1: triggerGreeting();  break;
        case 2: triggerTimeline();  break;
        case 4: triggerCards();     break;
    }
}

/** Public helpers used by inline onclick handlers */
function goToSlide(index)  { showSlide(index); }
function nextSlide()       { showSlide(currentSlide + 1); }
function restartSlides()   { showSlide(0); }
function startJourney()    { showSlide(1); }

// ============================================================
// SLIDE 2 — GREETING + TYPING EFFECT
// ============================================================
function triggerGreeting() {
    const el      = document.getElementById('typingText');
    const subtext = document.getElementById('greetingSubtext');
    const btn     = document.getElementById('greetingBtn');

    // Reset state if user navigates back & forward
    el.textContent = '';
    subtext.classList.remove('visible');
    btn.classList.remove('visible');
    typingDone = false;

    // Start background music
    startMusic();

    const text = 'Hai, Rosita. Aku bikin sesuatu khusus buat kamu.';
    let   i    = 0;

    function typeChar() {
        if (i < text.length) {
            el.textContent += text[i++];
            setTimeout(typeChar, 58);
        } else {
            typingDone = true;
            setTimeout(() => subtext.classList.add('visible'), 450);
            setTimeout(() => btn.classList.add('visible'),    1300);
        }
    }

    setTimeout(typeChar, 600);
}

// ============================================================
// MUSIC
// ============================================================
function startMusic() {
    if (musicStarted) return;

    const music = document.getElementById('bgMusic');
    music.volume = 0;

    const playPromise = music.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {
            // Autoplay blocked — silently fail, user already clicked to get here
        });
    }

    musicStarted = true;

    // Gentle fade-in to 42% volume
    let vol = 0;
    const FADE_TARGET = 0.42;
    const fadeInterval = setInterval(() => {
        vol = Math.min(vol + 0.018, FADE_TARGET);
        music.volume = vol;
        if (vol >= FADE_TARGET) clearInterval(fadeInterval);
    }, 120);
}

// ============================================================
// SLIDE 3 — TIMELINE ANIMATION
// ============================================================
function triggerTimeline() {
    const items = document.querySelectorAll('.timeline-item');

    // Reset first (if revisiting)
    items.forEach(item => item.classList.remove('visible'));

    setTimeout(() => {
        items.forEach((item, i) => {
            setTimeout(() => item.classList.add('visible'), i * 280);
        });
    }, 250);
}

// ============================================================
// SLIDE 5 — CARDS + CLOSING MESSAGE ANIMATION
// ============================================================
function triggerCards() {
    const cards  = document.querySelectorAll('.thing-card');
    const closing = document.getElementById('closingMsg');

    // Reset
    cards.forEach(c => c.classList.remove('visible'));
    if (closing) closing.classList.remove('visible');

    setTimeout(() => {
        cards.forEach((card, i) => {
            setTimeout(() => card.classList.add('visible'), i * 200);
        });

        // Closing message after all cards are in
        if (closing) {
            setTimeout(() => closing.classList.add('visible'), cards.length * 200 + 400);
        }
    }, 250);
}

// ============================================================
// KEYBOARD NAVIGATION
// ============================================================
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
            nextSlide();
            break;
        case 'ArrowLeft':
        case 'ArrowUp':
            if (currentSlide > 0) showSlide(currentSlide - 1);
            break;
    }
});

// ============================================================
// TOUCH/SWIPE SUPPORT (mobile)
// ============================================================
let touchStartY = 0;
let touchStartX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Only trigger if horizontal swipe is dominant and larger than threshold
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) {
            nextSlide();  // swipe left → forward
        } else if (currentSlide > 0) {
            showSlide(currentSlide - 1);  // swipe right → back
        }
    }
}, { passive: true });

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    generateStars();
    showSlide(0);
});
