import nodePath from 'node:path';
import {summary} from '@actions/core';

import type {AggregatedResult, Reporter, TestContext, Config} from '@jest/reporters'

class GithubReporter implements Reporter {
  #createReport: boolean;
  #rootDir: string;
  #githubServerUrl: string;
  #githubRepository: string;
  #githubSha: string;

  constructor(globalConfig: Config.GlobalConfig) {
    this.#createReport =
      process.env.GITHUB_ACTIONS !== undefined &&
      process.env.GITHUB_SERVER_URL !== undefined &&
      process.env.GITHUB_REPOSITORY !== undefined &&
      process.env.GITHUB_SHA !== undefined;
    
    this.#rootDir = globalConfig.rootDir;
    this.#githubServerUrl = process.env.GITHUB_SERVER_URL ?? "";
    this.#githubRepository = process.env.GITHUB_REPOSITORY ?? "";
    this.#githubSha = process.env.GITHUB_SHA ?? "";
  }

  #getRelativePath(path: string): string {
    return nodePath.relative(this.#rootDir, path);
  }

  #getGithubPermanentUrl(path: string): string {
    const relativePath = nodePath.relative(process.env.GITHUB_WORKSPACE ?? "", path);
    return `${this.#githubServerUrl}/${this.#githubRepository}/blob/${this.#githubSha}/${relativePath}`;
  }

  #createLink(text: string, href: string): string {
    return `[${text}](${href})`;
  }

  #createLinkToTestFile(testFilePath: string): string {
    return this.#createLink(this.#getRelativePath(testFilePath), this.#getGithubPermanentUrl(testFilePath));
  }

  onRunStart() {
    // do nothing
  }

  async onRunComplete(testContexts: Set<TestContext>, {testResults, numFailedTests, numPassedTests, numPendingTests}: AggregatedResult) {
    if (!this.#createReport) {
      return;
    }

    summary.addHeading("Jest Results");
    summary.addHeading("Summary", 2);

    const headerRow = "| Test | Failed | Skipped | Passed | Total |"
    const dividerRow = "|---|---|---|---|---|"
    const rows = testResults.map(({testFilePath, numFailingTests, numPassingTests, numPendingTests}) =>
     `| ${this.#createLinkToTestFile(testFilePath)} | ${numFailingTests} | ${numPendingTests} | ${numPassingTests} | ${numFailingTests + numPendingTests + numPassingTests} |`
    );
    const totalRow = `| **Total** | **${numFailedTests}** | **${numPendingTests}** | **${numPassedTests}** | **${numFailedTests + numPendingTests + numPassedTests}** |`;
    summary.addRaw(`\n${[headerRow, dividerRow, ...rows, totalRow].join("\n")}\n\n`)

    if (numFailedTests > 0) {
      summary.addHeading("Failed Tests", 2);

      testResults
        .map(({testResults, testFilePath}) => ({
          testResults,
           ghPermaLink: this.#createLinkToTestFile(testFilePath),
            relativePath: this.#getRelativePath(testFilePath)
          }))
        .flatMap(({testResults, ghPermaLink, relativePath}) => testResults.map(result => ({result, ghPermaLink, relativePath})))
        .forEach(({result: {ancestorTitles, title, failureMessages, status}, ghPermaLink, relativePath}) => {
          if (status !== "failed") {
            return;
          }
  
          const label = `${[relativePath, ...ancestorTitles, title].join(" ▸ ")}`
          const content = `\n\n${ghPermaLink}\n\n\`\`\`\n${failureMessages.join()}\n\`\`\`\n`;
          summary.addDetails(label, content);
        });
    }

    await summary.write();
  }

  getLastError() {
    // do nothing
  }
}

export default GithubReporter;
