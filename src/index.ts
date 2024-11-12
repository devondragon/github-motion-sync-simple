import { getOrCreateProjectMapping } from './database';
import { syncIssueToMotion } from './motion';
import { Env } from './env';

async function handleGitHubEvent(env: Env, githubEvent: string, payload: any): Promise<Response> {
	const githubUserId = payload.sender?.login;

	if (!githubUserId) return new Response("Sender not found", { status: 400 });
	// Currently we will reject issues from any user other than the one specified in the environment
	if (githubUserId != env.GITHUB_USER_ID) return new Response("Bad user", { status: 400 });

	const motionApiKey = env.MOTION_API_KEY;
	const workspaceId = env.MOTION_WORKSPACE_ID;

	if (githubEvent === "issues") {
		const action = payload.action;
		const issue = payload.issue;
		const repoId = payload.repository.id;
		const repoName = payload.repository.name;
		const repoFullName = payload.repository.full_name;

		try {
			const projectId = await getOrCreateProjectMapping(env, repoId, repoName, repoFullName, workspaceId, motionApiKey, githubUserId);
			await syncIssueToMotion(env, issue, projectId, workspaceId, motionApiKey, githubUserId);
		} catch (error) {
			return new Response(`Error processing event: ${error.message}`, { status: 500 });
		}
	}
	return new Response("Event processed", { status: 200 });
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "POST") {
			const githubEvent = request.headers.get("X-GitHub-Event");
			const payload = await request.json();
			return handleGitHubEvent(env, githubEvent, payload);
		}
		return new Response("Invalid request", { status: 400 });
	}
};
