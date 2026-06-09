const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

/**
 * Helper function to generate a color gradient.
 * Takes a base hex color and lightens it based on a percentage.
 * This creates the visual "Prism" effect.
 */
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (
        0x1000000 + 
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + 
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + 
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

async function run() {
    try {
        // 1. Get inputs from the workflow
        const token = core.getInput('github-token', { required: true });
        const username = core.getInput('username', { required: true });
        const outputFile = core.getInput('output-file');

        // 2. Initialize GitHub API client
        const octokit = github.getOctokit(token);

        // 3. Fetch user repositories (automatically sorted by most recently updated)
        core.info(`Fetching repositories for user: ${username}...`);
        const { data: repos } = await octokit.rest.repos.listForUser({
            username: username,
            sort: 'updated',
            direction: 'desc',
            per_page: 50 // Limit to 50 for performance
        });

        // 4. Group repositories: Starred vs Unstarred
        const starredRepos = [];
        const otherRepos = [];

        repos.forEach(repo => {
            if (repo.stargazers_count > 0) {
                starredRepos.push(repo);
            } else {
                otherRepos.push(repo);
            }
        });

        // 5. Generate Output with Color Gradients
        let markdownOutput = `### 🌟 Starred Repositories (Recent to Oldest)\n\n`;
        
        // Base color for Starred: Dark Gold
        const baseStarredColor = '#B8860B'; 
        
        starredRepos.forEach((repo, index) => {
            // Increase lightness by 5% for each step down
            const color = lightenColor(baseStarredColor, index * 5); 
            markdownOutput += `- <span style="color:${color}; font-weight:bold;">${repo.name}</span> - ⭐ ${repo.stargazers_count} (Updated: ${new Date(repo.updated_at).toLocaleDateString()})\n`;
        });

        markdownOutput += `\n### 📦 Other Repositories\n\n`;
        
        // Base color for Others: Dark Blue
        const baseOtherColor = '#00008B';
        
        otherRepos.forEach((repo, index) => {
            const color = lightenColor(baseOtherColor, index * 5);
            markdownOutput += `- <span style="color:${color};">${repo.name}</span> (Updated: ${new Date(repo.updated_at).toLocaleDateString()})\n`;
        });

        // 6. Set the output variable so other steps can use it
        core.setOutput('markdown-list', markdownOutput);
        
        // 7. Write to a file if requested
        if (outputFile) {
            fs.writeFileSync(outputFile, markdownOutput);
            core.info(`Successfully wrote results to ${outputFile}`);
        }
        
        // 8. Output to GitHub Action Step Summary (Shows up in the Actions UI)
        core.summary
            .addHeading('Prism Action Results')
            .addRaw(markdownOutput)
            .write();

    } catch (error) {
        // Robust error handling: Fail the step gracefully if something breaks
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

// Execute the action
run();