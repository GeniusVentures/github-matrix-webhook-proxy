// src/formatter.ts
import { MatrixMessage, EventConfig } from './types';
import { eventActionMap } from './event-config';
import { fillTemplate } from './utils';

export function formatGitHubEvent(eventHeader: string, payload: any): MatrixMessage {
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
      let config = actionConfig as EventConfig;
      if (eventHeader === 'pull_request' && action === 'closed' && payload.pull_request?.merged) {
        config = (eventConfig.merged as EventConfig) || actionConfig;
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