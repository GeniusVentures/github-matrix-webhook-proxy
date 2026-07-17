import * as assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateImmediateFilter,
  extractEventContext,
  parseFilterConfig,
  WebhookFilterConfig,
} from './filters.js';

const config: WebhookFilterConfig = {
  version: 1,
  immediate: {
    repositories: { include: [], exclude: ['rlp_enodes'] },
    defaultAction: 'allow',
    rules: [
      {
        name: 'keep-scheduled-failures',
        action: 'allow',
        events: ['workflow_run'],
        workflowTriggers: ['schedule'],
        workflowConclusions: ['failure'],
      },
      {
        name: 'ignore-scheduled-workflows',
        action: 'deny',
        events: ['workflow_run'],
        workflowTriggers: ['schedule'],
      },
    ],
  },
};

function workflow(repository: string, conclusion: string) {
  return {
    action: 'completed',
    repository: { full_name: repository },
    sender: { login: 'github-actions[bot]' },
    workflow_run: {
      name: 'Scheduled update',
      event: 'schedule',
      conclusion,
      head_branch: 'main',
    },
  };
}

test('empty includes allow all organization repositories, then excludes win', () => {
  assert.equal(evaluateImmediateFilter('push', {
    repository: { full_name: 'GeniusVentures/SuperGenius' },
    sender: { login: 'Super-Genius' },
  }, config, 'GeniusVentures').allowed, true);

  assert.equal(evaluateImmediateFilter('push', {
    repository: { full_name: 'GeniusVentures/rlp_enodes' },
    sender: { login: 'Super-Genius' },
  }, config, 'GeniusVentures').allowed, false);
});

test('repositories outside the configured organization are denied', () => {
  assert.equal(evaluateImmediateFilter('push', {
    repository: { full_name: 'OtherOrg/example' },
  }, config, 'GeniusVentures').allowed, false);
});

test('first matching rule keeps failures and denies successful schedules', () => {
  assert.equal(evaluateImmediateFilter('workflow_run', workflow('GeniusVentures/SuperGenius', 'failure'), config, 'GeniusVentures').allowed, true);
  assert.equal(evaluateImmediateFilter('workflow_run', workflow('GeniusVentures/SuperGenius', 'success'), config, 'GeniusVentures').allowed, false);
});

test('extracts workflow trigger and branch from workflow_run payloads', () => {
  const context = extractEventContext('workflow_run', workflow('GeniusVentures/SuperGenius', 'success'));
  assert.equal(context.workflowTrigger, 'schedule');
  assert.equal(context.branch, 'main');
});

test('invalid configuration fails closed', () => {
  assert.throws(() => parseFilterConfig('{bad json'));
  assert.throws(() => parseFilterConfig({ version: 2 } as any));
});
