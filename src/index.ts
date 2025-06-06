// src/index.ts
export interface Env {
  MATRIX_TOKEN: string;
  MATRIX_ROOM_ID: string;
  GITHUB_WEBHOOK_SECRET: string;
}

interface MatrixMessage {
  msgtype: string;
  body: string;
  format?: string;
  formatted_body?: string;
  external_url?: string;
}

interface EventConfig {
  emoji: string;
  template: string;
  htmlTemplate?: string;
  useRepoUrl?: boolean;
  simple?: boolean; // For text-only messages like labels
}

type EventMap = Record<string, EventConfig>;
type EventActionMap = Record<string, EventMap | ((payload: any, action: string) => MatrixMessage | null)>;

async function verifyGitHubSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  
  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const computed = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const expected = parts[1];
  if (computed.length !== expected.length) return false;
  
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  
  return result === 0;
}

// Event configuration map
const eventActionMap: EventActionMap = {
  repository: {
    created: {
      emoji: '🎉',
      template: '**{sender}** created new repository {repo}',
      htmlTemplate: '<p>🎉 <strong>{sender}</strong> created new repository <a href="{repoUrl}">{repo}</a></p>\n',
      useRepoUrl: true
    },
    deleted: {
      emoji: '🗑️',
      template: 'Repository {repo} was deleted by **{sender}**',
      htmlTemplate: '🗑️ Repository {repo} was deleted by <strong>{sender}</strong>',
      useRepoUrl: false
    },
    archived: {
      emoji: '📦',
      template: '**{sender}** archived repository {repo}',
      htmlTemplate: '<p>📦 <strong>{sender}</strong> archived repository <a href="{repoUrl}">{repo}</a></p>\n',
      useRepoUrl: true
    },
    unarchived: {
      emoji: '📂',
      template: '**{sender}** unarchived repository {repo}',
      htmlTemplate: '<p>📂 <strong>{sender}</strong> unarchived repository <a href="{repoUrl}">{repo}</a></p>\n',
      useRepoUrl: true
    },
    publicized: {
      emoji: '🌍',
      template: '**{sender}** made {repo} public',
      htmlTemplate: '<p>🌍 <strong>{sender}</strong> made <a href="{repoUrl}">{repo}</a> public</p>\n',
      useRepoUrl: true
    },
    privatized: {
      emoji: '🔒',
      template: '**{sender}** made {repo} private',
      htmlTemplate: '<p>🔒 <strong>{sender}</strong> made <a href="{repoUrl}">{repo}</a> private</p>\n',
      useRepoUrl: true
    },
    renamed: {
      emoji: '✏️',
      template: '**{sender}** renamed repository from {oldName} to {repo}',
      htmlTemplate: '<p>✏️ <strong>{sender}</strong> renamed repository from {oldName} to <a href="{repoUrl}">{repo}</a></p>\n',
      useRepoUrl: true
    },
    transferred: {
      emoji: '➡️',
      template: '**{sender}** transferred {repo} to {newOwner}',
      htmlTemplate: '<p>➡️ <strong>{sender}</strong> transferred <a href="{repoUrl}">{repo}</a> to {newOwner}</p>\n',
      useRepoUrl: true
    },
    edited: {
      emoji: '📝',
      template: '**{sender}** edited repository settings for {repo}',
      htmlTemplate: '<p>📝 <strong>{sender}</strong> edited repository settings for <a href="{repoUrl}">{repo}</a></p>\n',
      useRepoUrl: true
    }
  },
  
  label: {
    created: {
      emoji: '🏷️',
      template: '**{sender}** created label "{labelName}" in {repo}',
      simple: true
    },
    edited: {
      emoji: '🏷️',
      template: '**{sender}** edited label "{labelName}" in {repo}',
      simple: true
    },
    deleted: {
      emoji: '🏷️',
      template: '**{sender}** deleted label "{labelName}" from {repo}',
      simple: true
    }
  },
  
  issues: {
    opened: {
      emoji: '📥',
      template: '**{sender}** created new issue [{repo}#{number}]({url}): "{title}"{assignees}',
      htmlTemplate: '📥 <strong>{sender}</strong> created new issue <a href="{url}">{repo}#{number}</a>: &quot;{title}&quot;{assignees}'
    },
    closed: {
      emoji: '⬛',
      template: '**{sender}** closed issue [{repo}#{number}]({url}): "{title}"',
      htmlTemplate: '⬛ <strong>{sender}</strong> closed issue <a href="{url}">{repo}#{number}</a>: &quot;{title}&quot;'
    },
    reopened: {
      emoji: '🔄',
      template: '**{sender}** reopened issue [{repo}#{number}]({url}): "{title}"',
      htmlTemplate: '🔄 <strong>{sender}</strong> reopened issue <a href="{url}">{repo}#{number}</a>: &quot;{title}&quot;'
    },
    edited: {
      emoji: '📝',
      template: '**{sender}** edited issue [{repo}#{number}]({url}): "{title}"',
      htmlTemplate: '📝 <strong>{sender}</strong> edited issue <a href="{url}">{repo}#{number}</a>: &quot;{title}&quot;'
    },
    assigned: {
      emoji: '👤',
      template: '**{sender}** assigned issue [{repo}#{number}]({url}) to {assignee}',
      htmlTemplate: '👤 <strong>{sender}</strong> assigned issue <a href="{url}">{repo}#{number}</a> to {assignee}'
    },
    unassigned: {
      emoji: '👤',
      template: '**{sender}** unassigned issue [{repo}#{number}]({url}) from {assignee}',
      htmlTemplate: '👤 <strong>{sender}</strong> unassigned issue <a href="{url}">{repo}#{number}</a> from {assignee}'
    },
    labeled: {
      emoji: '🏷️',
      template: '**{sender}** added label "{labelName}" to issue [{repo}#{number}]({url})',
      htmlTemplate: '🏷️ <strong>{sender}</strong> added label &quot;{labelName}&quot; to issue <a href="{url}">{repo}#{number}</a>'
    },
    unlabeled: {
      emoji: '🏷️',
      template: '**{sender}** removed label "{labelName}" from issue [{repo}#{number}]({url})',
      htmlTemplate: '🏷️ <strong>{sender}</strong> removed label &quot;{labelName}&quot; from issue <a href="{url}">{repo}#{number}</a>'
    }
  },
  
  pull_request: {
    opened: {
      emoji: '📂',
      template: 'Pull request [#{number}: {title}]({url}) opened by {sender} in {repo}',
      htmlTemplate: '<p>📂 Pull request <a href="{url}">#{number}: {title}</a> opened by {sender} in <a href="{repoUrl}">{repo}</a></p>\n'
    },
    closed: {
      emoji: '❌',
      template: 'Pull request [#{number}: {title}]({url}) closed by {sender} in {repo}',
      htmlTemplate: '<p>❌ Pull request <a href="{url}">#{number}: {title}</a> closed by {sender} in <a href="{repoUrl}">{repo}</a></p>\n'
    },
    merged: {
      emoji: '✅',
      template: 'Pull request [#{number}: {title}]({url}) merged by {sender} in {repo}',
      htmlTemplate: '<p>✅ Pull request <a href="{url}">#{number}: {title}</a> merged by {sender} in <a href="{repoUrl}">{repo}</a></p>\n'
    },
    reopened: {
      emoji: '♻️',
      template: 'Pull request [#{number}: {title}]({url}) reopened by {sender} in {repo}',
      htmlTemplate: '<p>♻️ Pull request <a href="{url}">#{number}: {title}</a> reopened by {sender} in <a href="{repoUrl}">{repo}</a></p>\n'
    },
    synchronize: {
      emoji: '🔄',
      template: 'Pull request [#{number}: {title}]({url}) updated by {sender} in {repo}',
      htmlTemplate: '<p>🔄 Pull request <a href="{url}">#{number}: {title}</a> updated by {sender} in <a href="{repoUrl}">{repo}</a></p>\n'
    }
  },
  
  star: {
    created: {
      emoji: '⭐',
      template: '**{sender}** starred {repo}',
      htmlTemplate: '<p>⭐ <strong>{sender}</strong> starred <a href="{repoUrl}">{repo}</a></p>\n'
    },
    deleted: {
      emoji: '💫',
      template: '**{sender}** unstarred {repo}',
      htmlTemplate: '<p>💫 <strong>{sender}</strong> unstarred <a href="{repoUrl}">{repo}</a></p>\n'
    }
  },
  
  release: {
    published: {
      emoji: '🎉',
      template: 'New release [{name}]({url}) published in {repo}',
      htmlTemplate: '<p>🎉 New release <a href="{url}">{name}</a> published in <a href="{repoUrl}">{repo}</a></p>\n'
    },
    created: {
      emoji: '📦',
      template: 'Release [{name}]({url}) created in {repo}',
      htmlTemplate: '<p>📦 Release <a href="{url}">{name}</a> created in <a href="{repoUrl}">{repo}</a></p>\n'
    },
    edited: {
      emoji: '✏️',
      template: 'Release [{name}]({url}) edited in {repo}',
      htmlTemplate: '<p>✏️ Release <a href="{url}">{name}</a> edited in <a href="{repoUrl}">{repo}</a></p>\n'
    },
    deleted: {
      emoji: '🗑️',
      template: 'Release {name} deleted from {repo}',
      htmlTemplate: '<p>🗑️ Release {name} deleted from <a href="{repoUrl}">{repo}</a></p>\n'
    }
  },
  
  // Special handlers for complex events
  push: handlePush,
  create: handleCreate,
  delete: handleDelete,
  workflow_run: handleWorkflowRun,
  issue_comment: handleIssueComment,
  fork: handleFork
};

// Template replacement function
function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/{(\w+)}/g, (match, key) => data[key] || match);
}

// Special handlers for complex events
function handlePush(payload: any): MatrixMessage | null {
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

function handleCreate(payload: any): MatrixMessage | null {
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

function handleDelete(payload: any): MatrixMessage | null {
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

function handleWorkflowRun(payload: any, action: string): MatrixMessage | null {
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

function handleIssueComment(payload: any): MatrixMessage | null {
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

function handleFork(payload: any): MatrixMessage | null {
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

function formatGitHubEvent(eventHeader: string, payload: any): MatrixMessage {
  const action = payload.action || '';
  const eventConfig = eventActionMap[eventHeader];
  
  // If it's a function handler, call it
  if (typeof eventConfig === 'function') {
    const result = eventConfig(payload, action);
    if (result) return result;
  }
  
  // If it's a configuration map, process it
  if (eventConfig && typeof eventConfig === 'object') {
    const actionConfig = eventConfig[action];
    
    if (actionConfig) {
      // Extract common data
      const repo = payload.repository?.full_name || 'unknown/repo';
      const repoUrl = payload.repository?.html_url || '';
      const sender = payload.sender?.login || 'unknown';
      
      const data: Record<string, string> = {
        repo,
        repoUrl,
        sender,
        emoji: actionConfig.emoji
      };
      
      // Add event-specific data
      if (eventHeader === 'repository' && action === 'renamed') {
        data.oldName = payload.changes?.repository?.name?.from || 'unknown';
      } else if (eventHeader === 'repository' && action === 'transferred') {
        data.newOwner = payload.changes?.owner?.from?.login || 'unknown';
      } else if (eventHeader === 'label') {
        data.labelName = payload.label?.name || 'unknown';
      } else if (eventHeader === 'issues' || eventHeader === 'pull_request') {
        const item = payload.issue || payload.pull_request;
        if (item) {
          data.number = item.number?.toString() || '';
          data.title = item.title || '';
          data.url = item.html_url || '';
          
          if (action === 'opened' && payload.issue) {
            const assignees = item.assignees?.map((a: any) => a.login).join(', ') || '';
            data.assignees = assignees ? ` assigned to ${assignees}` : '';
          }
          
          if (action === 'assigned' || action === 'unassigned') {
            data.assignee = payload.assignee?.login || 'unknown';
          }
          
          if (action === 'labeled' || action === 'unlabeled') {
            data.labelName = payload.label?.name || 'unknown';
          }
        }
      } else if (eventHeader === 'release') {
        const release = payload.release;
        if (release) {
          data.name = release.name || release.tag_name || 'unknown';
          data.url = release.html_url || '';
        }
      }
      
      // Handle special case for PR merged
      let config = actionConfig;
      if (eventHeader === 'pull_request' && action === 'closed' && payload.pull_request?.merged) {
        config = eventConfig.merged || actionConfig;
      }
      
      // Build message
      const body = `${config.emoji} ${fillTemplate(config.template, data)}`;
      
      if (config.simple) {
        return { msgtype: 'm.notice', body };
      }
      
      const formatted_body = config.htmlTemplate ? 
        fillTemplate(config.htmlTemplate, data) : 
        body;
      
      return {
        msgtype: 'm.notice',
        body,
        format: 'org.matrix.custom.html',
        formatted_body
      };
    }
  }
  
  // Default fallback for unknown events
  const repo = payload.repository?.full_name || 'unknown/repo';
  const repoUrl = payload.repository?.html_url || '';
  
  return {
    msgtype: 'm.notice',
    body: `📌 GitHub ${eventHeader} event${action ? ` (${action})` : ''} occurred in ${repo}`,
    format: 'org.matrix.custom.html',
    formatted_body: `<p>📌 GitHub ${eventHeader} event${action ? ` (${action})` : ''} occurred in <a href="${repoUrl}">${repo}</a></p>\n`
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    console.log(`Worker version: 1.1.0`);
    console.log(`Received ${request.method} request to ${request.url}`);

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    if (path !== '/webhook' && path !== '/webhook/') {
      return new Response('Not found', { status: 404 });
    }

    try {
      const body = await request.text();
      
      const signature = request.headers.get('X-Hub-Signature-256');
      const isValid = await verifyGitHubSignature(body, signature, env.GITHUB_WEBHOOK_SECRET);
      
      if (!isValid) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      let githubPayload;
      try {
        githubPayload = JSON.parse(body);
      } catch (e) {
        return new Response('Invalid JSON', { status: 400 });
      }

      // Get event type from header
      const eventType = request.headers.get('X-GitHub-Event') || 'unknown';
      
      // Filter out label events from ghost users (GitHub system events during repo creation)
      if (eventType === 'label' && githubPayload.sender?.login === 'ghost') {
        console.log('Filtered out GitHub system label event (ghost user)');
        return new Response(JSON.stringify({ 
          status: 'filtered',
          reason: 'GitHub system label event' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Transform GitHub event to Matrix message format
      const matrixContent = formatGitHubEvent(eventType, githubPayload);
      
      // Log key details about the webhook
      const deliveryId = request.headers.get('X-GitHub-Delivery');
      console.log('GitHub Event Type:', eventType);
      console.log('GitHub Delivery ID:', deliveryId);
      console.log('GitHub Action:', githubPayload.action);
      console.log('Sender:', githubPayload.sender?.login);
      
      // Use GitHub delivery ID for transaction ID
      const txnId = `github_${deliveryId}`;
      const matrixUrl = `https://matrix.org/_matrix/client/v3/rooms/${encodeURIComponent(env.MATRIX_ROOM_ID)}/send/m.room.message/${txnId}`;
      
      console.log('Sending to Matrix:', matrixUrl);
      console.log('Token exists:', !!env.MATRIX_TOKEN);
      console.log('Token length:', env.MATRIX_TOKEN?.length);
      console.log('First 10 chars of token:', env.MATRIX_TOKEN?.substring(0, 10) + '...');
      
      // Send to Matrix
      const matrixResponse = await fetch(matrixUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MATRIX_TOKEN}`,
        },
        body: JSON.stringify(matrixContent),
      });

      const responseBody = await matrixResponse.text();
      
      if (!matrixResponse.ok) {
        console.error(`Matrix error: ${matrixResponse.status} - ${responseBody}`);
      }
      
      return new Response(responseBody, {
        status: matrixResponse.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { status: 500 });
    }
  },
};