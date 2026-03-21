import { confidenceColor, fmtConfidence } from '../utils/format.utils.js';

/**
 * Confidence arc meter.
 * Usage: confidenceMeter.render(container, confidence)
 */

const SIZE = 120;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_RATIO = 0.75; // 270° arc

const confidenceMeter = {
  html(confidence = 0) {
    const clamped = Math.max(0, Math.min(100, confidence));
    const color = confidenceColor(clamped);
    const dashOffset = CIRCUMFERENCE * ARC_RATIO * (1 - clamped / 100);
    const rotation = -135; // start at bottom-left

    return `
      <div class="confidence-meter">
        <div class="confidence-arc" style="width:${SIZE}px;height:${SIZE}px">
          <svg width="${SIZE}" height="${SIZE}" class="confidence-arc-svg" style="transform:rotate(${rotation}deg)">
            <circle class="confidence-arc-track"
              cx="${SIZE/2}" cy="${SIZE/2}" r="${RADIUS}"
              stroke-dasharray="${CIRCUMFERENCE * ARC_RATIO} ${CIRCUMFERENCE * (1 - ARC_RATIO)}"
            />
            <circle class="confidence-arc-fill"
              cx="${SIZE/2}" cy="${SIZE/2}" r="${RADIUS}"
              stroke="${color}"
              stroke-dasharray="${CIRCUMFERENCE * ARC_RATIO} ${CIRCUMFERENCE * (1 - ARC_RATIO)}"
              stroke-dashoffset="${dashOffset}"
            />
          </svg>
          <div class="confidence-value">
            <span class="confidence-number" style="color:${color}">${Math.round(clamped)}</span>
            <span class="confidence-label">confidence</span>
          </div>
        </div>
        <div class="text-center">
          <span class="badge ${clamped >= 80 ? 'badge-success' : clamped >= 60 ? 'badge-warning' : 'badge-error'}">
            ${fmtConfidence(clamped)}
          </span>
        </div>
      </div>
    `;
  },

  render(container, confidence) {
    container.innerHTML = this.html(confidence);
  },

  update(container, confidence) {
    const fill = container.querySelector('.confidence-arc-fill');
    const num = container.querySelector('.confidence-number');
    const badge = container.querySelector('.badge');
    if (!fill || !num) { this.render(container, confidence); return; }

    const clamped = Math.max(0, Math.min(100, confidence));
    const color = confidenceColor(clamped);
    const dashOffset = CIRCUMFERENCE * ARC_RATIO * (1 - clamped / 100);

    fill.setAttribute('stroke', color);
    fill.setAttribute('stroke-dashoffset', dashOffset);
    num.textContent = Math.round(clamped);
    num.style.color = color;
    if (badge) {
      badge.className = `badge ${clamped >= 80 ? 'badge-success' : clamped >= 60 ? 'badge-warning' : 'badge-error'}`;
      badge.textContent = fmtConfidence(clamped);
    }
  }
};

export default confidenceMeter;
