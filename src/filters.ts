export type FilterAction = 'allow' | 'deny';

export interface RepositoryFilter {
  include?: string[];
  exclude?: string[];
}

export interface WebhookFilterRule {
  name: string;
  action: FilterAction;
  events?: string[];
  actions?: string[];
  repositories?: string[];
  branches?: string[];
  actors?: string[];
  workflowNames?: string[];
  workflowTriggers?: string[];
  workflowConclusions?: string[];
  commitMessagePatterns?: string[];
}

export interface FilterScope {
  repositories?: RepositoryFilter;
  defaultAction?: FilterAction;
  rules?: WebhookFilterRule[];
}

export interface WebhookFilterConfig {
  version: 1;
  immediate?: FilterScope;
  standup?: FilterScope;
}

export interface EventContext {
  event: string;
  action: string;
  repository: string;
  branch: string;
  actor: string;
  workflowName: string;
  workflowTrigger: string;
  workflowConclusion: string;
  commitMessages: string[];
}

export interface FilterDecision {
  allowed: boolean;
  reason: string;
  rule?: string;
}

function stringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

function validateScope(value: unknown, field: string): FilterScope | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }

  const scope = value as FilterScope;
  if (scope.defaultAction !== undefined && scope.defaultAction !== 'allow' && scope.defaultAction !== 'deny') {
    throw new Error(`${field}.defaultAction must be allow or deny`);
  }
  if (scope.repositories !== undefined) {
    if (!scope.repositories || typeof scope.repositories !== 'object' || Array.isArray(scope.repositories)) {
      throw new Error(`${field}.repositories must be an object`);
    }
    stringArray(scope.repositories.include, `${field}.repositories.include`);
    stringArray(scope.repositories.exclude, `${field}.repositories.exclude`);
  }
  if (scope.rules !== undefined) {
    if (!Array.isArray(scope.rules)) throw new Error(`${field}.rules must be an array`);
    scope.rules.forEach((rule, index) => {
      if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
        throw new Error(`${field}.rules[${index}] must be an object`);
      }
      if (typeof rule.name !== 'string' || !rule.name.trim()) {
        throw new Error(`${field}.rules[${index}].name is required`);
      }
      if (rule.action !== 'allow' && rule.action !== 'deny') {
        throw new Error(`${field}.rules[${index}].action must be allow or deny`);
      }
      for (const key of [
        'events', 'actions', 'repositories', 'branches', 'actors',
        'workflowNames', 'workflowTriggers', 'workflowConclusions',
        'commitMessagePatterns',
      ] as const) {
        stringArray(rule[key], `${field}.rules[${index}].${key}`);
      }
    });
  }
  return scope;
}

export function parseFilterConfig(raw: string | WebhookFilterConfig | undefined): WebhookFilterConfig {
  if (raw === undefined || raw === '') return { version: 1 };

  let parsed: unknown;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('WEBHOOK_FILTER_CONFIG must be valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('WEBHOOK_FILTER_CONFIG must be an object');
  }

  const config = parsed as WebhookFilterConfig;
  if (config.version !== 1) throw new Error('WEBHOOK_FILTER_CONFIG.version must be 1');
  validateScope(config.immediate, 'immediate');
  validateScope(config.standup, 'standup');
  return config;
}

function normalizeRepository(value: string, organization?: string): string {
  if (!value || value.includes('/') || !organization) return value;
  return `${organization}/${value}`;
}

function wildcardMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(value);
}

function matchesAny(value: string, patterns: string[] | undefined): boolean {
  return !patterns || patterns.length === 0 || patterns.some(pattern => wildcardMatch(value, pattern));
}

function repositoryMatches(repository: string, patterns: string[] | undefined, organization?: string): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some(pattern => wildcardMatch(repository, normalizeRepository(pattern, organization)));
}

export function extractEventContext(event: string, payload: any): EventContext {
  const workflow = payload?.workflow_run || {};
  const pullRequest = payload?.pull_request || {};
  const ref = String(payload?.ref || '');

  return {
    event,
    action: String(payload?.action || ''),
    repository: String(payload?.repository?.full_name || ''),
    branch: String(
      workflow.head_branch ||
      pullRequest.head?.ref ||
      (ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref),
    ),
    actor: String(payload?.sender?.login || workflow.actor?.login || ''),
    workflowName: String(workflow.name || ''),
    workflowTrigger: String(workflow.event || ''),
    workflowConclusion: String(workflow.conclusion || ''),
    commitMessages: Array.isArray(payload?.commits)
      ? payload.commits.map((commit: any) => String(commit?.message || '')).filter(Boolean)
      : [],
  };
}

function repositoryAllowed(repository: string, filter: RepositoryFilter | undefined, organization?: string): boolean {
  if (organization && !repository.startsWith(`${organization}/`)) return false;

  const include = filter?.include || [];
  const exclude = filter?.exclude || [];
  if (repositoryMatches(repository, exclude, organization)) {
    // An empty exclusion list matches nothing, despite repositoryMatches' general empty-list behavior.
    if (exclude.length > 0) return false;
  }
  return include.length === 0 || repositoryMatches(repository, include, organization);
}

function ruleMatches(context: EventContext, rule: WebhookFilterRule, organization?: string): boolean {
  if (!matchesAny(context.event, rule.events)) return false;
  if (!matchesAny(context.action, rule.actions)) return false;
  if (!repositoryMatches(context.repository, rule.repositories, organization)) return false;
  if (!matchesAny(context.branch, rule.branches)) return false;
  if (!matchesAny(context.actor, rule.actors)) return false;
  if (!matchesAny(context.workflowName, rule.workflowNames)) return false;
  if (!matchesAny(context.workflowTrigger, rule.workflowTriggers)) return false;
  if (!matchesAny(context.workflowConclusion, rule.workflowConclusions)) return false;
  if (rule.commitMessagePatterns && rule.commitMessagePatterns.length > 0) {
    if (!context.commitMessages.some(message => matchesAny(message, rule.commitMessagePatterns))) return false;
  }
  return true;
}

export function evaluateImmediateFilter(
  event: string,
  payload: any,
  config: WebhookFilterConfig,
  organization?: string,
): FilterDecision {
  const context = extractEventContext(event, payload);
  const scope = config.immediate;

  if (!repositoryAllowed(context.repository, scope?.repositories, organization)) {
    return { allowed: false, reason: 'repository policy' };
  }

  for (const rule of scope?.rules || []) {
    if (ruleMatches(context, rule, organization)) {
      return {
        allowed: rule.action === 'allow',
        reason: `matched rule: ${rule.name}`,
        rule: rule.name,
      };
    }
  }

  const action = scope?.defaultAction || 'allow';
  return { allowed: action === 'allow', reason: `default action: ${action}` };
}
