// src/event-handlers.ts
import { MatrixMessage } from './types';

export function handlePush(payload: any): MatrixMessage | null {
  const repo = payload.repository?.full_name || 'unknown/repo';
  const repoUrl = payload.repository?.html_url || '';
  const sender = payload.sender?.login || 'unknown';
  const branch = payload.ref?.replace('refs/heads/', '') || 'unknown';
  const commits = payload.commits || [];
  const commitCount = commits.length;
  const commitText = commitCount === 1 ? 'commit' : 'commits';
  const compareUrl = payload.compare;
  
  return {
    msgtype: 'm.notice',
    body: `📤 **${sender}** pushed [${commitCount} ${commitText}](${compareUrl}) to \`${branch}\` in ${repo}`,
    format: 'org.matrix.custom.html',
    formatted_body: `<p>📤 <strong>${sender}</strong> pushed <a href="${compareUrl}">${commitCount} ${commitText}</a> to <code>${branch}</code> in <a href="${repoUrl}">${repo}</a></p>\n`
  };
}

export function handleCreate(payload: any): MatrixMessage | null {
  const repo = payload.repository?.full_name || 'unknown/repo';
  const repoUrl = payload.repository?.html_url || '';
  const sender = payload.sender?.login || 'unknown';
  const refType = payload.ref_type || 'reference';
  const refName = payload.ref || 'unknown';
  
  return {
    msgtype: 'm.notice',
    body: `🌱 **${sender}** created ${refType} \`${refName}\` in ${repo}`,
    format: 'org.matrix.custom.html',
    formatted_body: `<p>🌱 <strong>${sender}</strong> created ${refType} <code>${refName}</code> in <a href="${repoUrl}">${repo}</a></p>\n`
  };
}

export function handleDelete(payload: any): MatrixMessage | null {
  const repo = payload.repository?.full_name || 'unknown/repo';
  const repoUrl = payload.repository?.html_url || '';
  const sender = payload.sender?.login || 'unknown';
  const refType = payload.ref_type || 'reference';
  const refName = payload.ref || 'unknown';
  
  return {
    msgtype: 'm.notice',
    body: `🗑️ **${sender}** deleted ${refType} \`${refName}\` in ${repo}`,
    format: 'org.matrix.custom.html',
    formatted_body: `<p>🗑️ <strong>${sender}</strong> deleted ${refType} <code>${refName}</code> in <a href="${repoUrl}">${repo}</a></p>\n`
  };
}

export function handleWorkflowRun(payload: any, action: string): MatrixMessage | null {
  const repo = payload.repository?.full_name || 'unknown/repo';
  const repoUrl = payload.repository?.html_url || '';
  const workflow = payload.workflow_run;
  
  if (!workflow || action !== 'completed') return null;
  
  const status = workflow.conclusion;
  const workflowName = workflow.name;
  const branch = workflow.head_branch;
  const runUrl = workflow.html_url;
  
  let emoji = '☑';
  let statusText = 'completed successfully 🎉';
  
  if (status === 'failure') {
    emoji = '❌';
    statusText = 'failed';
  } else if (status === 'cancelled') {
    emoji = '⚠️';
    statusText = 'was cancelled';
  }
  
  return {
    msgtype: 'm.notice',
    body: `${emoji} Workflow **${workflowName}** [${statusText}](${runUrl}) for ${repo} on branch \`${branch}\``,
    format: 'org.matrix.custom.html',
    formatted_body: `<p>${emoji} Workflow <strong>${workflowName}</strong> <a href="${runUrl}">${statusText}</a> for <a href="${repoUrl}">${repo}</a> on branch <code>${branch}</code></p>\n`
  };
}

export function handleIssueComment(payload: any): MatrixMessage | null {
  const repo = payload.repository?.full_name || 'unknown/repo';
  const sender = payload.sender?.login || 'unknown';
  const comment = payload.comment;
  const issue = payload.issue;
  
  if (!comment || !issue) return null;
  
  const commentUrl = comment.html_url;
  const commentBody = comment.body;
  const commentPreview = commentBody.split('\n')[0].substring(0, 100);
  const truncated = commentBody.length > 100 || commentBody.includes('\n');
  const previewText = truncated ? commentPreview + '...' : commentPreview;
  
  return {
    msgtype: 'm.notice',
    body: `🗣 **${sender}** [commented](${commentUrl}) on [${repo}#${issue.number}](${issue.html_url})  \n> ${previewText}`,
    format: 'org.matrix.custom.html',
    formatted_body: `🗣 <strong>${sender}</strong> <a href="${commentUrl}">commented</a> on <a href="${issue.html_url}">${repo}#${issue.number}</a><br>\n&gt; ${previewText}`,
    external_url: issue.html_url
  };
}

export function handleFork(payload: any): MatrixMessage | null {
  const repo = payload.repository?.full_name || 'unknown/repo';
  const repoUrl = payload.repository?.html_url || '';
  const sender = payload.sender?.login || 'unknown';
  const forkee = payload.forkee;
  
  if (!forkee) return null;
  
  return {
    msgtype: 'm.notice',
    body: `🍴 **${sender}** forked ${repo} to [${forkee.full_name}](${forkee.html_url})`,
    format: 'org.matrix.custom.html',
    formatted_body: `<p>🍴 <strong>${sender}</strong> forked <a href="${repoUrl}">${repo}</a> to <a href="${forkee.html_url}">${forkee.full_name}</a></p>\n`
  };
}