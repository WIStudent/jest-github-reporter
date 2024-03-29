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

  #getGithubPermanentUrl(path: string, line?: number): string {
    const relativePath = nodePath.relative(process.env.GITHUB_WORKSPACE ?? "", path);
    const lineHash = line ? `#L${line}` : "";
    return `${this.#githubServerUrl}/${this.#githubRepository}/blob/${this.#githubSha}/${relativePath}/${lineHash}`;
  }

  #createLink(text: string, href: string): string {
    return `[${text}](${href})`;
  }

  #createLinkToTestFile(testFilePath: string, line?: number): string {
    const lineSuffix = line ? `:${line}` : "";
    return this.#createLink(`${this.#getRelativePath(testFilePath)}${lineSuffix}`, this.#getGithubPermanentUrl(testFilePath, line));
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
          testFilePath,
          relativePath: this.#getRelativePath(testFilePath)
        }))
        .flatMap(({testResults, testFilePath, relativePath}) => testResults.map(result => ({result, testFilePath, relativePath})))
        .forEach(({result: {ancestorTitles, title, failureMessages, status, location}, testFilePath, relativePath}) => {
          if (status !== "failed") {
            return;
          }
          const ghPermaLink = this.#createLinkToTestFile(testFilePath, location?.line);
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
