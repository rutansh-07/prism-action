# Prism Action 🌈

A custom GitHub Action that fetches a user's repositories, groups them by whether they are starred or not, and applies a beautiful time-based color gradient (darker for recently updated, lighter for older repositories). 

Perfect for dynamically generating lists for your GitHub Profile `README.md`!

## Features
- **Grouping**: Automatically separates your starred repositories from your regular ones.
- **Time-based Color Gradient**: The most recently updated repositories get a dark, bold color. As you move down the list to older repositories, the color gracefully becomes lighter, creating a prism effect.
- **Action Summary**: View the colored list right in your GitHub Actions run summary.

## Inputs

| Name | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| `github-token` | Yes | N/A | GitHub token to authenticate API requests (use `${{ secrets.GITHUB_TOKEN }}`). |
| `username` | Yes | N/A | The GitHub username to fetch repositories for. |
| `output-file` | No | `output.md` | The path where the generated markdown file will be saved. |

## Outputs

| Name | Description |
| ---- | ----------- |
| `markdown-list` | The raw markdown string containing the colored repository list. |

## Example Usage

Create a file in your repository at `.github/workflows/generate-repo-list.yml`:

```yaml
name: Generate Colored Repo List
on:
  workflow_dispatch: # Allows you to run this manually from the Actions tab

jobs:
  filter-repos:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Prism Action
        uses: rutansh-07/prism-action@v1 # <-- CHANGE THIS to your repo name!
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          username: 'rutansh-07'
          output-file: 'my-repos.md'
          
      - name: Display Output
        run: cat my-repos.md