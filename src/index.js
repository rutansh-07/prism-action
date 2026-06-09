const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

/**
 * Generates a hex color that gets progressively lighter.
 * Used to create the "Prism" gradient effect down the list.
 * @param {string} color - Base hex color (e.g. '#B8860B')
 * @param {number} percent - How much to lighten (0-100)
 * @returns {string} - New lightened hex color
 */
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return (
        R.toString(16).padStart(2, '0') +
        G.toString(16).padStart(2, '0') +
        B.toString(16).padStart(2, '0')
    ).toUpperCase();
}

/**
 * Converts a plain repo name into a shields.io badge URL.
 * GitHub allows images in Markdown, so this bypasses the CSS color stripping issue.
 * @param {string} name - Repository name
 * @param {string} hexColor - Hex color WITHOUT the '#' symbol
 * @param {string} repoUrl - Full URL to the repository
 * @returns {string} - Markdown image link string
 */
function makeBadge(name, hexColor, repoUrl) {
    // Shields.io requires dashes replaced with double-dashes in the label
    const safeName = name.replace(/-/g, '--').replace(/_/g, '__');
    const badgeUrl = `https://img.shields.io/badge/${safeName}-${hexColor}?style=for-the-badge&logo=github&logoColor=white`;
    return `[![${name}](${badgeUrl})](${repoUrl})`;
}

/**
 * Main function that runs the entire Prism Action.
 */
async function run() {
    try {
        // ── Step 1: Read inputs from the workflow YAML ─────────────────────────
        const token      = core.getInput('github-token', { required: true });
        const username   = core.getInput('username',     { required: true });
        const outputFile = core.getInput('output-file');

        // ── Step 2: Create the authenticated GitHub API client ─────────────────
        const octokit = github.getOctokit(token);

        // ── Step 3: Fetch up to 50 repos, sorted by most recently updated ──────
        core.info(`⏳ Fetching repositories for: ${username}...`);
        const { data: repos } = await octokit.rest.repos.listForUser({
            username,
            sort:      'updated',
            direction: 'desc',
            per_page:  50,
        });

        if (repos.length === 0) {
            core.warning(`No public repositories found for user: ${username}`);
            return;
        }

        // ── Step 4: Separate repos into Starred vs Others ──────────────────────
        const starredRepos = repos.filter(r => r.stargazers_count > 0);
        const otherRepos   = repos.filter(r => r.stargazers_count === 0);

        core.info(`✅ Found ${starredRepos.length} starred and ${otherRepos.length} other repositories.`);

        // ── Step 5: Build the Markdown output using Shields.io image badges ────
        //    This is the KEY FIX: GitHub strips inline CSS colors from Markdown,
        //    but it ALWAYS renders images. Shields.io generates color badges as
        //    images, so our gradient will actually be visible on any README.md!

        let markdownOutput = `## 🌈 Prism Repo View for [${username}](https://github.com/${username})\n\n`;

        // ── Starred Repos Section ──────────────────────────────────────────────
        if (starredRepos.length > 0) {
            markdownOutput += `### 🌟 Starred Repositories\n`;
            markdownOutput += `> Sorted from most recently updated (darkest) to oldest (lightest)\n\n`;

            starredRepos.forEach((repo, index) => {
                // Base: Dark Gold. Gets 4% lighter with each step down.
                const hex   = lightenColor('#B8860B', index * 4);
                const badge = makeBadge(repo.name, hex, repo.html_url);
                const stars = `⭐ ${repo.stargazers_count}`;
                const date  = new Date(repo.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
                const lang  = repo.language ? ` · ${repo.language}` : '';
                markdownOutput += `${badge} ${stars}${lang} · Updated: ${date}\n\n`;
            });
        } else {
            markdownOutput += `### 🌟 Starred Repositories\n`;
            markdownOutput += `> No starred repositories found.\n\n`;
        }

        // ── Other Repos Section ────────────────────────────────────────────────
        if (otherRepos.length > 0) {
            markdownOutput += `---\n\n### 📦 Other Repositories\n`;
            markdownOutput += `> Sorted from most recently updated (darkest) to oldest (lightest)\n\n`;

            otherRepos.forEach((repo, index) => {
                // Base: Dark Blue. Gets 4% lighter with each step down.
                const hex   = lightenColor('#00008B', index * 4);
                const badge = makeBadge(repo.name, hex, repo.html_url);
                const date  = new Date(repo.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });
                const lang  = repo.language ? ` · ${repo.language}` : '';
                markdownOutput += `${badge}${lang} · Updated: ${date}\n\n`;
            });
        }

        // ── Step 6: Set the output variable for downstream workflow steps ──────
        core.setOutput('markdown-list', markdownOutput);

        // ── Step 7: Write to file ──────────────────────────────────────────────
        if (outputFile) {
            fs.writeFileSync(outputFile, markdownOutput, 'utf8');
            core.info(`💾 Successfully wrote results to: ${outputFile}`);
        }

        // ── Step 8: Write to the Actions run Summary tab on GitHub.com ─────────
        await core.summary
            .addHeading('🌈 Prism Action Results')
            .addRaw(markdownOutput)
            .write();

        core.info('🎉 Prism Action completed successfully!');

    } catch (error) {
        // If ANYTHING goes wrong, mark this Action step as Failed with a message
        core.setFailed(`❌ Prism Action failed: ${error.message}`);
    }
}

run();