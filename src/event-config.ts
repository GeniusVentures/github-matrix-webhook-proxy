// src/event-config.ts
import { EventActionMap } from './types';
import { 
  handlePush, 
  handleCreate, 
  handleDelete, 
  handleWorkflowRun, 
  handleIssueComment, 
  handleFork 
} from './event-handlers';

export const eventActionMap: EventActionMap = {
  repository: {
    created: {
      emoji: '🎉',
      template: '**{sender}** created new repository {repo}',
      htmlTemplate: '🎉 <strong>{sender}</strong> created new repository <a href="{repoUrl}">{repo}</a>',
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
      htmlTemplate: '📦 <strong>{sender}</strong> archived repository <a href="{repoUrl}">{repo}</a>',
      useRepoUrl: true
    },
    unarchived: {
      emoji: '📂',
      template: '**{sender}** unarchived repository {repo}',
      htmlTemplate: '📂 <strong>{sender}</strong> unarchived repository <a href="{repoUrl}">{repo}</a>',
      useRepoUrl: true
    },
    publicized: {
      emoji: '🌍',
      template: '**{sender}** made {repo} public',
      htmlTemplate: '🌍 <strong>{sender}</strong> made <a href="{repoUrl}">{repo}</a> public',
      useRepoUrl: true
    },
    privatized: {
      emoji: '🔒',
      template: '**{sender}** made {repo} private',
      htmlTemplate: '🔒 <strong>{sender}</strong> made <a href="{repoUrl}">{repo}</a> private',
      useRepoUrl: true
    },
    renamed: {
      emoji: '✏️',
      template: '**{sender}** renamed repository from {oldName} to {repo}',
      htmlTemplate: '✏️ <strong>{sender}</strong> renamed repository from {oldName} to <a href="{repoUrl}">{repo}</a>',
      useRepoUrl: true
    },
    transferred: {
      emoji: '➡️',
      template: '**{sender}** transferred {repo} to {newOwner}',
      htmlTemplate: '➡️ <strong>{sender}</strong> transferred <a href="{repoUrl}">{repo}</a> to {newOwner}',
      useRepoUrl: true
    },
    edited: {
      emoji: '📝',
      template: '**{sender}** edited repository settings for {repo}',
      htmlTemplate: '📝 <strong>{sender}</strong> edited repository settings for <a href="{repoUrl}">{repo}</a>',
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