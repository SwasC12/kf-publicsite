import { Component } from '@angular/core';

/** Animated line-art perfume flask: sloshing/rising liquid, bubbles, spray puff.
 *  Pure inline SVG + CSS — no video, on-brand monochrome. */
@Component({
  selector: 'app-mixing',
  standalone: true,
  template: `
    <svg class="mix" viewBox="0 0 200 210" role="img" aria-label="Preparing your perfume">
      <defs>
        <clipPath id="flaskClip"><circle cx="105" cy="138" r="49" /></clipPath>
      </defs>

      <!-- liquid (clipped to the flask) -->
      <g clip-path="url(#flaskClip)">
        <rect x="56" y="90" width="98" height="100" fill="#faf6f0" />
        <g class="level">
          <path class="wave" fill="#141210"
            d="M-80 60 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 L280 200 L-80 200 Z" />
        </g>
        <circle class="bubble b1" cx="92" cy="180" r="4" fill="#faf6f0" />
        <circle class="bubble b2" cx="116" cy="180" r="3" fill="#faf6f0" />
        <circle class="bubble b3" cx="104" cy="180" r="2.5" fill="#faf6f0" />
      </g>

      <!-- flask outline + cap + atomizer bulb -->
      <circle cx="105" cy="138" r="54" fill="none" stroke="#141210" stroke-width="6" />
      <rect x="90" y="83" width="30" height="10" rx="3" fill="#faf6f0" stroke="#141210" stroke-width="5" />
      <rect x="95" y="69" width="20" height="16" rx="4" fill="#faf6f0" stroke="#141210" stroke-width="5" />
      <path d="M95 78 C82 71 78 74 70 74" fill="none" stroke="#141210" stroke-width="5" stroke-linecap="round" />
      <ellipse cx="53" cy="74" rx="15" ry="12" fill="#faf6f0" stroke="#141210" stroke-width="5" />
      <line class="mark m1" x1="30" y1="66" x2="22" y2="64" stroke="#141210" stroke-width="3" stroke-linecap="round" />
      <line class="mark m2" x1="30" y1="74" x2="21" y2="74" stroke="#141210" stroke-width="3" stroke-linecap="round" />
      <line class="mark m3" x1="30" y1="82" x2="22" y2="84" stroke="#141210" stroke-width="3" stroke-linecap="round" />

      <!-- spray puff from the nozzle -->
      <g class="spray">
        <circle cx="126" cy="70" r="7" fill="#cbc5bc" />
        <circle cx="135" cy="64" r="6" fill="#d6d1c9" />
        <circle cx="137" cy="74" r="5" fill="#cbc5bc" />
        <circle cx="131" cy="70" r="8" fill="#d6d1c9" />
        <path class="sparkle" d="M148 60 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#141210" />
      </g>
    </svg>
  `,
  styles: [`
    :host { display: block; }
    .mix { width: 160px; height: 168px; }
    .level { animation: rise 1.4s ease-out both, bob 3.2s 1.4s ease-in-out infinite; }
    .wave { animation: slosh 2s linear infinite; }
    .bubble { animation: bubbleUp 2.6s ease-in infinite; }
    .bubble.b2 { animation-delay: 0.9s; }
    .bubble.b3 { animation-delay: 1.7s; }
    .spray { transform-origin: 130px 70px; animation: puff 2.4s ease-out infinite; }
    .mark { animation: markFlash 2.4s ease-out infinite; opacity: 0; }
    @keyframes slosh { to { transform: translateX(-80px); } }
    @keyframes rise { from { transform: translateY(38px); } to { transform: translateY(6px); } }
    @keyframes bob { 0%, 100% { transform: translateY(6px); } 50% { transform: translateY(2px); } }
    @keyframes bubbleUp {
      0% { transform: translateY(0); opacity: 0; }
      20% { opacity: 0.9; }
      100% { transform: translateY(-64px); opacity: 0; }
    }
    @keyframes puff {
      0% { opacity: 0; transform: translate(0, 0) scale(0.35); }
      30% { opacity: 0.95; }
      100% { opacity: 0; transform: translate(30px, -22px) scale(1.25); }
    }
    @keyframes markFlash { 0%, 60% { opacity: 0; } 15% { opacity: 1; } 40% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) {
      .level, .wave, .bubble, .spray, .mark { animation: none; }
      .level { transform: translateY(6px); }
      .spray { opacity: 0.6; }
    }
  `],
})
export class MixingComponent {}
