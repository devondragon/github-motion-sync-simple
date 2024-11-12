import { Env } from './env';
import { getMotionTaskId, saveTaskMapping, getWorkspaceData, insertWorkspaceData } from './database';

interface Issue {
	title: string;
	body: string;
	state: string;
	id: string;
	html_url: string;
}

interface TaskData {
	name: string;
	description: string;
	status: string;
	projectId: string;
	workspaceId: string;
}

interface ProjectResponse {
	id: string;
	name: string;
	workspaceId: string;
}

interface StatusResponse {
	name: string;
	isDefaultStatus: boolean;
	isResolvedStatus: boolean;
}

const motionApiEndpoint = "https://api.usemotion.com/v1/";

function getHeaders(apiKey: string): HeadersInit {
	return {
		"X-API-Key": apiKey,
		"Content-Type": "application/json",
	};
}

export async function syncIssueToMotion(
	env: Env,
	issue: Issue,
	projectId: string,
	workspaceId: string,
	motionApiKey: string,
	githubUserId: string
): Promise<void> {
	try {
		const workspaceData = await getWorkspaceData(env, workspaceId);
		const defaultStatus = workspaceData.defaultStatus;
		const resolvedStatus = workspaceData.resolveStatus;

		const taskData: TaskData = {
			name: issue.title,
			description: `${issue.html_url}\n\n${issue.body}`,
			status: issue.state === "closed" ? resolvedStatus : defaultStatus,
			projectId,
			workspaceId,
		};

		const motionTaskId = await getMotionTaskId(env, issue.id);

		if (motionTaskId) {
			await updateMotionTask(env, issue, motionTaskId, taskData, motionApiKey, githubUserId);
		} else {
			await createMotionTask(env, issue, taskData, motionApiKey, githubUserId);
		}
	} catch (error) {
		console.error("Error in syncIssueToMotion:", error.message, error.stack);
		throw error;
	}
}

async function createMotionTask(
	env: Env,
	issue: Issue,
	taskData: TaskData,
	motionApiKey: string,
	githubUserId: string
): Promise<void> {
	try {
		const response = await fetch(`${motionApiEndpoint}tasks`, {
			method: "POST",
			headers: getHeaders(motionApiKey),
			body: JSON.stringify(taskData),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Failed to create Motion task. Status: ${response.status}, Response: ${errorText}`);
			throw new Error("Failed to create Motion task");
		}

		const responseData = (await response.json()) as { id: string };
		await saveTaskMapping(env, issue.id, githubUserId, responseData.id, taskData.projectId);
	} catch (error) {
		console.error("Error in createMotionTask:", error.message, error.stack);
		throw error;
	}
}

export async function getProject(
	projectId: string,
	motionApiKey: string
): Promise<ProjectResponse | null> {
	try {
		const response = await fetch(`${motionApiEndpoint}projects/${projectId}`, {
			method: "GET",
			headers: getHeaders(motionApiKey),
		});

		if (!response.ok) {
			const errorText = await response.text();
			if (response.status === 404) {
				console.warn(`Motion project with ID ${projectId} not found.`);
				return null;
			} else {
				console.error(`Failed to fetch Motion project. Status: ${response.status}, Response: ${errorText}`);
				throw new Error("Failed to fetch Motion project");
			}
		}

		return response.json() as Promise<ProjectResponse>;
	} catch (error) {
		console.error("Error in getProject:", error.message, error.stack);
		throw error;
	}
}

async function updateMotionTask(
	env: Env,
	issue: Issue,
	motionTaskId: string,
	taskData: TaskData,
	motionApiKey: string,
	githubUserId: string
): Promise<void> {
	try {
		const { workspaceId, ...taskDataForPatch } = taskData;

		const response = await fetch(`${motionApiEndpoint}tasks/${motionTaskId}`, {
			method: "PATCH",
			headers: getHeaders(motionApiKey),
			body: JSON.stringify(taskDataForPatch),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Failed to update Motion task. Status: ${response.status}, Response: ${errorText}`);
			if (response.status === 404) {
				console.warn(`Motion task with ID ${motionTaskId} not found. Attempting to create a new task instead.`);
				await createMotionTask(env, issue, taskData, motionApiKey, githubUserId);
				return;
			}
			throw new Error(`Failed to update Motion task with ID ${motionTaskId}`);
		}

		console.log(`Successfully updated Motion task with ID ${motionTaskId}`);
	} catch (error) {
		console.error("Error in updateMotionTask:", error.message, error.stack);
		throw error;
	}
}

export async function createMotionProject(
	env: Env,
	repoId: string,
	repoName: string,
	workspaceId: string,
	motionApiKey: string
): Promise<string> {
	try {
		let workspaceData = await getWorkspaceData(env, workspaceId);

		if (!workspaceData) {
			console.log(`Fetching statuses for workspace ID: ${workspaceId}`);
			const { defaultStatus, resolveStatus } = await fetchWorkspaceStatuses(workspaceId, motionApiKey);
			await insertWorkspaceData(env, workspaceId, defaultStatus, resolveStatus);
			workspaceData = { default_status: defaultStatus, resolve_status: resolveStatus };
		}

		console.log(`Creating Motion project for repoId: ${repoId} in workspace ID: ${workspaceId}`);
		const response = await fetch(`${motionApiEndpoint}projects`, {
			method: "POST",
			headers: getHeaders(motionApiKey),
			body: JSON.stringify({ name: repoName, workspaceId }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Failed to create Motion project. Status: ${response.status}, Response: ${errorText}`);
			throw new Error("Failed to create Motion project");
		}

		const data = (await response.json()) as ProjectResponse;
		console.log(`Created Motion project with ID: ${data.id}`);
		return data.id;
	} catch (error) {
		console.error("Error in createMotionProject:", error);
		throw error;
	}
}

async function fetchWorkspaceStatuses(
	workspaceId: string,
	motionApiKey: string
): Promise<{ defaultStatus: string; resolveStatus: string }> {
	try {
		const response = await fetch(`${motionApiEndpoint}statuses?workspaceId=${workspaceId}`, {
			method: "GET",
			headers: getHeaders(motionApiKey),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Failed to fetch statuses for workspace ID: ${workspaceId}. Response: ${errorText}`);
			throw new Error("Failed to fetch workspace statuses");
		}

		const statuses: StatusResponse[] = await response.json();
		const defaultStatus = statuses.find(status => status.isDefaultStatus)?.name;
		const resolveStatus = statuses.find(status => status.isResolvedStatus)?.name;

		if (!defaultStatus || !resolveStatus) {
			throw new Error(`Unable to determine default or resolved status for workspace ID: ${workspaceId}`);
		}

		console.log(`Fetched statuses for workspace ID: ${workspaceId}. Default: ${defaultStatus}, Resolved: ${resolveStatus}`);
		return { defaultStatus, resolveStatus };
	} catch (error) {
		console.error(`Error fetching workspace statuses for workspace ID: ${workspaceId}`, error);
		throw error;
	}
}
