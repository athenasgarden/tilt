let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(frequency: number, duration: number, type: OscillatorType, gainValue: number) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime);
  gain.gain.setValueAtTime(gainValue, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration + 0.02);
}

export function playCoin() {
  const ac = audio();
  if (!ac) return;
  blip(880, 0.09, "square", 0.05);
  window.setTimeout(() => blip(1320, 0.12, "square", 0.045), 70);
}

export function playError() {
  blip(180, 0.16, "square", 0.04);
}

export function playHighScore() {
  blip(660, 0.08, "square", 0.05);
  window.setTimeout(() => blip(880, 0.08, "square", 0.05), 90);
  window.setTimeout(() => blip(1320, 0.16, "square", 0.05), 180);
}
