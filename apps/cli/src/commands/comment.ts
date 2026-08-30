import pc from 'picocolors';
import { apiRequest } from '../client.js';
import { theme } from '../theme.js';

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

export async function listCommentsCommand(bugId: string, options: { json?: boolean }) {
  try {
    const res = await apiRequest(`/api/v1/bugs/${bugId}/comments`);
    const comments = res.comments || [];

    if (options.json) {
      console.log(JSON.stringify(comments, null, 2));
      return;
    }

    if (comments.length === 0) {
      console.log(pc.gray(`No comments found on bug #${bugId}.`));
      return;
    }

    console.log(theme.primaryBold(`\n══ Bug #${bugId} Discussion Thread (${comments.length} Comments) ══`));

    for (const c of comments) {
      const author = c.author_name || c.author_username || c.author_email || 'Anonymous';
      const time = c.created_at ? new Date(c.created_at).toLocaleString() : '';
      console.log(`\n${pc.bold(pc.cyan(`● ${author}`))} ${pc.gray(`· ${time}`)}`);
      console.log(`${c.body}`);
    }
    console.log('');
  } catch (err: any) {
    console.error(pc.red(`Error listing comments on bug #${bugId}: ${err.message}`));
    process.exit(1);
  }
}

export async function addCommentCommand(bugId: string, textArg?: string) {
  try {
    let body = textArg;

    if (!body) {
      // Try to read piped input from stdin
      body = await readStdin();
    }

    if (!body || body.trim().length === 0) {
      console.error(pc.red('Error: Comment body is required (pass as argument or pipe via stdin)'));
      process.exit(1);
    }

    const res = await apiRequest(`/api/v1/bugs/${bugId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });

    console.log(theme.primaryBold(`\n✓ Comment added to bug #${bugId}`));
  } catch (err: any) {
    console.error(pc.red(`Error posting comment to bug #${bugId}: ${err.message}`));
    process.exit(1);
  }
}
