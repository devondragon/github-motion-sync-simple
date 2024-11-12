import { createMotionProject, getProject } from './motion';
import { Env } from './env';

export async function getOrCreateProjectMapping(
	env: Env,
	repoId: string,
	repoName: string,
	repoFullName: string,
	workspaceId: string,
	motionApiKey: string,
	githubUserId: string
): Promise<string> {
	console.log(`Starting project mapping for repoId: ${repoId}, repoName: ${repoName}, workspaceId: ${workspaceId}`);

	try {
		const projectRecord = await env.DB.prepare("SELECT motion_project_id FROM repo_project_map WHERE github_repo_id = ?")
			.bind(repoId)
			.first();

		if (projectRecord) {
			console.log(`Found existing project mapping for repoId: ${repoId} with projectId: ${projectRecord.motion_project_id}`);
			// Check to see if the project still exists in Motion
			const project = await getProject(projectRecord.motion_project_id as string, motionApiKey);
			if (!project) {
				console.warn(`Motion project with ID ${projectRecord.motion_project_id} not found. Creating a new project instead.`);
				const newProjectId = await createMotionProject(env, repoId, repoName, workspaceId, motionApiKey);
				console.log(`Successfully created new Motion project with ID: ${newProjectId} for repoId: ${repoId}`);

				await env.DB.prepare("UPDATE repo_project_map SET motion_project_id = ? WHERE github_repo_id = ? AND github_user_id = ?")
					.bind(newProjectId, repoId, githubUserId)
					.run();

				console.log(`Updated project mapping in database for repoId: ${repoId} with new projectId: ${newProjectId}`);
				return newProjectId;
			}
			return projectRecord.motion_project_id as string;
		} else {
			console.log(`No existing project mapping found for repoId: ${repoId}. Creating new project in Motion.`);
			const projectId = await createMotionProject(env, repoId, repoName, workspaceId, motionApiKey);
			console.log(`Successfully created Motion project with ID: ${projectId} for repoId: ${repoId}`);

			await env.DB.prepare("INSERT INTO repo_project_map (github_repo_id, github_repo_name, github_repo_full_name, motion_project_id, github_user_id) VALUES (?, ?, ?, ?, ?)")
				.bind(repoId, repoName, repoFullName, projectId, githubUserId)
				.run();

			console.log(`Inserted new project mapping into database for repoId: ${repoId} with projectId: ${projectId}`);
			return projectId;
		}
	} catch (error) {
		console.error(`Error handling project mapping for repoId: ${repoId}, workspaceId: ${workspaceId}`, error);
		throw new Error("Failed to get or create project mapping");
	}
}

export async function getMotionTaskId(env: Env, githubIssueId: string): Promise<string | null> {
	try {
		const result = await env.DB.prepare("SELECT motion_task_id FROM issue_task_map WHERE github_issue_id = ?")
			.bind(githubIssueId)
			.first();

		if (result) {
			console.log(`Found Motion task ID: ${result.motion_task_id} for GitHub issue ID: ${githubIssueId}`);
			return result.motion_task_id as string;
		} else {
			console.warn(`No Motion task found for GitHub issue ID: ${githubIssueId}`);
			return null;
		}
	} catch (error) {
		console.error(`Error fetching Motion task ID for GitHub issue ID: ${githubIssueId}`, error);
		throw new Error("Failed to fetch Motion task ID");
	}
}

export async function saveTaskMapping(env: Env, githubIssueId: string, githubUserId: string, motionTaskId: string, githubRepoId: string): Promise<void> {
	try {
		console.log(`Saving task mapping for GitHub issue ID: ${githubIssueId}, GitHub user ID: ${githubUserId}, Motion task ID: ${motionTaskId}, GitHub repo ID: ${githubRepoId}`);
		await env.DB.prepare("INSERT INTO issue_task_map (github_issue_id, github_user_id, motion_task_id, github_repo_id) VALUES (?, ?, ?, ?)")
			.bind(githubIssueId, githubUserId, motionTaskId, githubRepoId)
			.run();
		console.log(`Successfully saved task mapping for GitHub issue ID: ${githubIssueId}`);
	} catch (error) {
		console.error(`Error saving task mapping for GitHub issue ID: ${githubIssueId}, GitHub owner ID: ${githubUserId}, Motion task ID: ${motionTaskId}, GitHub repo ID: ${githubRepoId}`, error);
		throw new Error("Failed to save task mapping");
	}
}


export async function getWorkspaceData(env: Env, workspaceId: string): Promise<{ defaultStatus: string; resolveStatus: string } | null> {
	try {
		const result = await env.DB.prepare("SELECT default_status, resolve_status FROM motion_workspace WHERE motion_workspace_id = ?")
			.bind(workspaceId)
			.first();

		if (result) {
			console.log(`Workspace data found for workspace ID: ${workspaceId}`);
			return {
				defaultStatus: result.default_status as string,
				resolveStatus: result.resolve_status as string
			};
		} else {
			console.log(`No workspace data found for workspace ID: ${workspaceId}`);
			return null;
		}
	} catch (error) {
		console.error(`Error fetching workspace data for workspace ID: ${workspaceId}`, error);
		throw new Error("Failed to fetch workspace data");
	}
}


export async function insertWorkspaceData(env: Env, workspaceId: string, defaultStatus: string, resolveStatus: string): Promise<void> {
	try {
		await env.DB.prepare(`
			INSERT INTO motion_workspace (motion_workspace_id, default_status, resolve_status)
			VALUES (?, ?, ?)
		`)
			.bind(workspaceId, defaultStatus, resolveStatus)
			.run();

		console.log(`Inserted workspace data for workspace ID: ${workspaceId} with default status "${defaultStatus}" and resolved status "${resolveStatus}"`);
	} catch (error) {
		console.error(`Error inserting workspace data for workspace ID: ${workspaceId}`, error);
		throw new Error("Failed to insert workspace data");
	}
}
