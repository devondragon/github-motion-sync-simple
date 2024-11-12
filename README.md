# GitHub Issue to Motion Sync

Effortlessly synchronize your GitHub Issues to Motion, ensuring that your project management workflow stays in sync with your development process. This service uses Cloudflare Workers and Cloudflare D1 to securely and efficiently manage tasks across platforms, integrating GitHub issue tracking with Motion workspaces and projects.

## Key Features

- **Seamless GitHub Issue Sync**: Automatically sync new and updated GitHub issues with Motion tasks, keeping your workflow in Motion up-to-date with GitHub’s latest changes.
- **Project Mapping**: Each GitHub repository is mapped to a project in Motion, and the sync automatically creates a new project in Motion if it doesn’t exist.
- **Efficient Data Handling**: Powered by Cloudflare Workers and D1 Database, ensuring low latency, high security, and minimal operational overhead.

## Table of Contents

- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)


# Getting Started

You can clone this repository, and run it on your own Cloudflare account, or you can use my free hosted version.

## Free Hosted Version

Coming soon!

## Running It Yourself

### Prerequisites

- [Cloudflare Account](https://dash.cloudflare.com/) with access to Workers and D1 Database.
- [GitHub Account](https://github.com/) with necessary permissions to set up GitHub webhooks and read issues.
- [Motion API Key](https://docs.usemotion.com/docs/motion-rest-api) with access to manage tasks and projects.


### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/github-motion-sync.git
   cd github-motion-sync
   ```

2. **Create Cloudflare D1 Database**:
   This database will hold relationships and mappings from GitHub to Motion.

   ```bash
   npx wrangler d1 create github-motion-sync-simple
   ```

3. **Set Up Cloudflare Configuration**:
   Ensure your `wrangler.toml` is correctly configured with the D1 Database and Worker details.

      ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "github_motion_sync-simple"
   database_id = "$YOUR DB ID HERE$"
   ```


4. **Apply Database Migrations**:

Run migrations locally with:
```bash
wrangler d1 migrations apply github_motion_sync_db
```

For remote environment:
```bash
wrangler d1 migrations apply github_motion_sync_db --remote
```

5. **Get Secrets**
   - Motion API Key: Login to your account on the Motion website, go to Settings, then API, then API Keys, and create an API Key.
   - Motion Workspace ID: Run the workspaces.js script to get the internal ID for the Motion Workspace.

```bash
node workspaces.js "$MOTION_API_KEY"
```
This will output a list of your Motion Workspaces with their Name, and then their ID.  Please save the ID of the Workspace you want to use.


6. **Set Environment Variables**:
   - MOTION_API_KEY - The key you got in the Get Motion API Key step above
   - MOTION_WORKSPACE_ID - The ID you saved in the step above
   - GITHUB_USER_ID - your GitHub username

Push secrets to Cloudflare using `wrangler secret put $KEYNAME`
Wrangler will prompt you to provide the secert for the key name

  ```bash
  npx wrangler secret put MOTION_API_KEY
   ```

   ```bash
  npx wrangler secret put MOTION_WORKSPACE_ID
   ```
   ```bash
  npx wrangler secret put GITHUB_USER_ID
   ```


7. **Deploy to Cloudflare**

   ```bash
   npx wrangler deploy
   ```

   You can use the default URL or configure a custom domain for the Worker.  You'll use this URL for the GitHub Webhook (next).

8. **Configure GitHub Repository Webhooks**
   1. In your GitHub repository settings, navigate to **Webhooks** and click **Add webhook**.
   2. Set the **Payload URL** to your Worker’s endpoint, e.g., `https://your-worker.example.workers.dev`.
   3.  Select **application/json** as the **Content type**.
   4.  Choose the **Just the `issues` event** option to trigger syncs on new or updated issues.
   5.  Save the webhook.

Repeat for all Repositories whose Issues you want synced to Motion.

DONE!


## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository** and create your branch:
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes** and test thoroughly.

3. **Submit a pull request** with a detailed description of your changes.

### Development Guidelines

- Keep code modular, following the structure laid out in `src/`.
- Add comments where necessary, and ensure functions are well-documented.
- Run tests and check compatibility with the latest versions of Node and `wrangler`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Questions?

For any questions or feedback, feel free to [open an issue](https://github.com/your-username/github-motion-sync/issues) or reach out directly.
