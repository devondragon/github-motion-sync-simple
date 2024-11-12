-- Migration number: 0001 	 2024-11-11T22:28:00.808Z
-- Table to store repository-to-project mappings
CREATE TABLE repo_project_map (
    github_repo_id TEXT,
    github_repo_name TEXT,
    github_repo_full_name TEXT,
    motion_project_id TEXT,
    github_user_id TEXT,
    PRIMARY KEY (github_repo_id, github_user_id)
);

-- Table to store issue-to-task mappings
CREATE TABLE issue_task_map (
    github_issue_id TEXT,
    github_user_id TEXT,
    motion_task_id TEXT,
    github_repo_id TEXT,
    PRIMARY KEY (github_issue_id, github_user_id)
);

-- Table to store Motion workspace configurations
CREATE TABLE motion_workspace (
	motion_workspace_id TEXT PRIMARY KEY,
	github_user_id TEXT,
	default_status TEXT,
	resolve_status TEXT
);
