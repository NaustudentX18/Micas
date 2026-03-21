/**
 * Engineering validation panel component.
 * Renders a ValidationReport (from validation.engine.js).
 */

function severityIcon(severity) {
  if (severity === 'error') return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  if (severity === 'warning') return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
}

function riskClass(score) {
  if (score <= 30) return 'risk-low';
  if (score <= 65) return 'risk-medium';
  return 'risk-high';
}

function riskLabel(score) {
  if (score <= 30) return 'Low Risk';
  if (score <= 65) return 'Medium Risk';
  return 'High Risk';
}

const validationPanel = {
  html(report) {
    if (!report) return '';
    const { score, issues = [], warnings = [], recommendations = [], orientation } = report;
    const riskScore = 100 - score;
    const cls = riskClass(riskScore);
    const allItems = [
      ...issues.map(i => ({ ...i, severity: 'error' })),
      ...warnings.map(w => ({ ...w, severity: 'warning' })),
      ...recommendations.map(r => ({ ...r, severity: 'info' }))
    ];

    return `
      <div class="glass-panel p-5 mt-4">
        <div class="flex-between mb-4">
          <h3>Engineering Validation</h3>
          <span class="badge ${score >= 80 ? 'badge-success' : score >= 50 ? 'badge-warning' : 'badge-error'}">
            Score: ${score}/100
          </span>
        </div>

        <!-- Print risk bar -->
        <div class="${cls} mb-4">
          <div class="flex-between mb-2">
            <span class="text-sm font-medium">Print Risk</span>
            <span class="text-sm ${riskScore <= 30 ? 'text-success' : riskScore <= 65 ? 'text-warning' : 'text-error'}">${riskLabel(riskScore)}</span>
          </div>
          <div class="risk-bar">
            <div class="risk-bar-fill" style="width:${riskScore}%"></div>
          </div>
        </div>

        ${orientation ? `
          <div class="glass-inset p-3 mb-4 flex gap-3 items-start">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;margin-top:2px"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            <div>
              <div class="text-sm font-semibold" style="color:var(--color-accent)">Recommended Orientation</div>
              <div class="text-sm text-muted mt-1">${orientation.description}</div>
            </div>
          </div>
        ` : ''}

        ${allItems.length > 0 ? `
          <div>
            ${allItems.map(item => `
              <div class="validation-item">
                <div class="validation-icon">${severityIcon(item.severity)}</div>
                <div>
                  <div class="validation-title">${item.title || item.message}</div>
                  ${item.description ? `<div class="validation-desc">${item.description}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="flex gap-3 items-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span class="text-sm" style="color:var(--color-success)">No issues detected — model looks printable!</span>
          </div>
        `}
      </div>
    `;
  },

  render(container, report) {
    container.innerHTML = this.html(report);
  }
};

export default validationPanel;
