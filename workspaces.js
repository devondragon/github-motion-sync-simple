const https = require('https');

// Get the API key from command line arguments
const apiKey = process.argv[2];

if (!apiKey) {
    console.error("Usage: node listWorkspaces.js <Motion_API_Key>");
    process.exit(1);
}

// Define the API endpoint
const apiEndpoint = "https://api.usemotion.com/v1/workspaces";

// Make the API request
const options = {
    headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json"
    }
};

https.get(apiEndpoint, options, (res) => {
    let data = '';

    // Collect the data chunks
    res.on('data', chunk => {
        data += chunk;
    });

    // Handle the end of the response
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (!response.workspaces) {
                console.error("Error: Unable to find workspaces in the response.");
                process.exit(1);
            }

            console.log("Workspaces:");
            response.workspaces.forEach(workspace => {
                console.log(`Name: ${workspace.name}, ID: "${workspace.id}"`);
            });
        } catch (error) {
            console.error("Error parsing JSON response:", error);
            process.exit(1);
        }
    });
}).on('error', (error) => {
    console.error("Request failed:", error);
});
