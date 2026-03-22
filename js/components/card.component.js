import { fmtRelative, truncate } from '../utils/format.utils.js';

/**
 * Project card component.
 * Returns an HTML string for a project card.
 */
export function projectCard(project, onClick, onDelete) {
  const statusColors = {
    intake: 'badge-muted',
    questions: 'badge-accent',
    brief: 'badge-accent',
    generating: 'badge-warning',
    preview: 'badge-accent',
    done: 'badge-success',
  };

  const statusLabels = {
    intake: 'Intake',
    questions: 'Questioning',
    brief: 'Brief',
    generating: 'Generating',
    preview: 'Preview',
    done: 'Complete',
  };

  return `
    <div class="card card-interactive project-card" data-id="${project.id}" data-name="${project.name}" role="button" tabindex="0">
      <div class="flex-between mb-3">
        <span class="badge ${statusColors[project.status] || 'badge-muted'}">${statusLabels[project.status] || project.status}</span>
        <div class="flex gap-1">
          <button class="btn btn-icon btn-glass btn-sm" data-duplicate="${project.id}" aria-label="Duplicate project" title="Duplicate project">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button class="btn btn-icon btn-danger btn-sm" data-delete="${project.id}" aria-label="Delete project" title="Delete project">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
      <h3 style="margin-bottom:4px">${project.name}</h3>
      ${project.description ? `<p class="text-sm">${truncate(project.description, 80)}</p>` : ''}
      <div class="flex-between mt-3">
        <span class="text-xs text-dim">${fmtRelative(project.updatedAt)}</span>
        ${project.partCount > 0 ? `<span class="text-xs text-muted">${project.partCount} part${project.partCount !== 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>
  `;
}

export default { projectCard };
