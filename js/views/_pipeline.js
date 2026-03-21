/**
 * Shared pipeline navigation header used across all project views.
 */

const STEPS = [
  { id: 'intake',     label: 'Intake',    path: 'intake' },
  { id: 'questions',  label: 'Questions', path: 'questions' },
  { id: 'brief',      label: 'Brief',     path: 'brief' },
  { id: 'generator',  label: 'Generate',  path: 'generator' },
  { id: 'preview',    label: 'Preview',   path: 'preview' },
  { id: 'export',     label: 'Export',    path: 'export' },
];

export function pipelineNav(activeStep, projectId) {
  return `
    <div class="pipeline-steps mb-6">
      ${STEPS.map((step, i) => {
        const stepIdx = STEPS.findIndex(s => s.id === activeStep);
        const isActive = step.id === activeStep;
        const isDone = i < stepIdx;
        const cls = isActive ? 'active' : isDone ? 'done' : '';
        return `
          ${i > 0 ? '<div class="pipeline-connector"></div>' : ''}
          <div class="pipeline-step ${cls}">
            <div class="pipeline-step-dot"></div>
            <span class="pipeline-step-label">${step.label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export const PIPELINE_STEPS = STEPS;
