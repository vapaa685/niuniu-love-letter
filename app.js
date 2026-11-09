'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (selector) => document.querySelector(selector);

// Reveal content progressively, while keeping everything visible without JavaScript.
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
}

let scrollQueued = false;
function updateProgress() {
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  $('.progress').style.transform = `scaleX(${distance > 0 ? window.scrollY / distance : 0})`;
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) { requestAnimationFrame(updateProgress); scrollQueued = true; }
}, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

const dialog = $('#letter-dialog');
$('#open-letter').addEventListener('click', () => dialog.showModal());
$('#close-letter').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => $('#open-letter').focus({ preventScroll: true }));

function heartBurst(target, count = 20) {
  if (reducedMotion.matches) return;
  const bounds = target.getBoundingClientRect();
  const colors = ['#cc819f', '#e6a3bf', '#d6a3c4', '#afc4da', '#e2bd89'];
  for (let i = 0; i < count; i += 1) {
    const heart = document.createElement('span');
    heart.className = 'burst-heart';
    heart.textContent = i % 4 === 0 ? '✧' : '♡';
    const angle = Math.random() * Math.PI * 2;
    const reach = 75 + Math.random() * 150;
    const duration = 1200 + Math.random() * 800;
    heart.style.setProperty('--x', `${bounds.left + bounds.width / 2}px`);
    heart.style.setProperty('--y', `${bounds.top + bounds.height / 2}px`);
    heart.style.setProperty('--dx', `${Math.cos(angle) * reach}px`);
    heart.style.setProperty('--dy', `${Math.sin(angle) * reach - 70}px`);
    heart.style.setProperty('--rotate', `${Math.random() * 100 - 50}deg`);
    heart.style.setProperty('--duration', `${duration}ms`);
    heart.style.setProperty('--size', `${15 + Math.random() * 19}px`);
    heart.style.setProperty('--color', colors[i % colors.length]);
    $('#petals').append(heart);
    window.setTimeout(() => heart.remove(), duration + 50);
  }
}

// The quiz is intentionally local to this visit; only D adds a punishment round.
let punishmentCount = 0;
let answered = false;
document.querySelectorAll('[data-answer]').forEach((button) => {
  button.addEventListener('click', () => {
    if (answered) return;
    answered = true;
    const isD = button.dataset.answer === 'D';
    if (isD) punishmentCount += 1;
    let message;
    if (isD) {
      message = punishmentCount === 1 ? '行，寒假等着被我狠狠惩罚吧' : `惩罚时间×${punishmentCount}`;
    } else {
      message = punishmentCount > 0 ? '骗牛牛的，选对了我也惩罚你，嘻嘻' : '嘻嘻，寒假等着被我狠狠奖励吧';
    }
    $('#result-message').textContent = message;
    $('#result-eyebrow').textContent = isD ? '哼哼，文文记住啦' : '嘻嘻，抓到一只小牛牛';
    $('#result-note').textContent = isD ? '给牛牛一个重新选择的机会。' : '这份偏爱，只对牛牛生效。';
    $('#retry-quiz').hidden = !isD;
    $('#result-next').hidden = isD;
    $('#attempt-label').textContent = punishmentCount > 0 ? `文文的小本本 ×${punishmentCount}` : '答对啦 ♡';
    $('#quiz-question').hidden = true;
    $('#quiz-result').hidden = false;
    $('#result-message').focus({ preventScroll: true });
    if (!isD) heartBurst($('#result-message'), 24);
  });
});
$('#retry-quiz').addEventListener('click', () => {
  answered = false;
  $('#quiz-result').hidden = true;
  $('#quiz-question').hidden = false;
  $('#question-heading').focus({ preventScroll: true });
});

let kisses = 0;
try { kisses = Math.max(0, Number.parseInt(localStorage.getItem('wenwen-kisses'), 10) || 0); } catch { /* Private mode may disable storage. */ }
function showKisses() {
  $('#kiss-hint').textContent = kisses > 0 ? `牛牛已经收下了 ${kisses} 个亲亲，再亲一下 ♡` : '点一下，收下文文的亲亲';
}
showKisses();
$('#send-kiss').addEventListener('click', (event) => {
  kisses += 1;
  try { localStorage.setItem('wenwen-kisses', String(kisses)); } catch { /* The interaction still works without storage. */ }
  showKisses();
  heartBurst(event.currentTarget, 25);
  if (soundEnabled) playNote(880, audioContext.currentTime, 0.6, 0.07);
});

// A quiet, original music-box phrase. Audio only starts after a deliberate tap.
let audioContext;
let masterGain;
let soundEnabled = false;
let melodyTimer;
const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 523.25, 0, 440, 523.25, 659.25, 587.33, 523.25, 392, 523.25, 0];
let melodyIndex = 0;
function playNote(frequency, start, duration = 1.6, volume = 0.08) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function musicStep() {
  if (!soundEnabled || document.hidden) return;
  const note = melody[melodyIndex % melody.length];
  if (note) playNote(note, audioContext.currentTime);
  if (melodyIndex % 4 === 0) playNote(261.63, audioContext.currentTime, 2.2, 0.035);
  melodyIndex += 1;
}
$('#sound-toggle').addEventListener('click', async () => {
  const toggle = $('#sound-toggle');
  toggle.disabled = true;
  try {
    if (!audioContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      audioContext = new Audio();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.6;
      masterGain.connect(audioContext.destination);
    }
    if (soundEnabled) {
      clearInterval(melodyTimer);
      await audioContext.suspend();
      soundEnabled = false;
    } else {
      await audioContext.resume();
      soundEnabled = true;
      musicStep();
      melodyTimer = setInterval(musicStep, 650);
    }
    toggle.setAttribute('aria-pressed', String(soundEnabled));
    toggle.setAttribute('aria-label', soundEnabled ? '关闭轻柔音乐' : '开启轻柔音乐');
    $('#sound-label').textContent = soundEnabled ? '声音开' : '声音关';
  } catch {
    clearInterval(melodyTimer);
    soundEnabled = false;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', '当前浏览器无法播放音乐，点击重试');
    $('#sound-label').textContent = '暂不可用';
  } finally { toggle.disabled = false; }
});
document.addEventListener('visibilitychange', () => {
  if (audioContext && soundEnabled) {
    const operation = document.hidden ? audioContext.suspend() : audioContext.resume();
    operation.catch(() => {});
  }
});
