import nodePath from 'node:path';
import {summary} from '@actions/core';

import type {AggregatedResult, Reporter, TestContext, Config} from '@jest/reporters'

class GithubReporter implements Reporter {
  #rootDir: string;

  constructor(globalConfig: Config.GlobalConfig) {
    this.#rootDir = globalConfig.rootDir;
  }

  #getRelativePath(path: string): string {
    return nodePath.relative(this.#rootDir, path);
  }

  onRunStart() {
    // do nothing
  }

  async onRunComplete(testContexts: Set<TestContext>, {testResults, numFailedTests, numPassedTests, numPendingTests}: AggregatedResult) {
    if (process.env.GITHUB_ACTIONS === undefined) {
      return;
    }

    summary.addHeading("Jest Results");

    const rows = testResults.map(({testFilePath, numFailingTests, numPassingTests, numPendingTests}) => [
      this.#getRelativePath(testFilePath),
      `${numFailingTests}`,
      `${numPendingTests}`,
      `${numPassingTests}`,
      `${numFailingTests + numPendingTests + numPassingTests}`
    ]);

    const totalRow = [
      "**Total**",
      `**${numFailedTests}**`,
      `**${numPendingTests}**`,
      `**${numPassedTests}**`,
      `**${numFailedTests + numPendingTests + numPassedTests}**`
    ];

    summary.addTable([
      ["Test", "Failed", "Skipped", "Passed", "Total"],
      ...rows,
      totalRow
    ]);

    testResults
      .map(({testResults, testFilePath}) => ({testResults, relativePath: this.#getRelativePath(testFilePath)}))
      .flatMap(({testResults, relativePath}) => testResults.map(result => ({result, relativePath})))
      .forEach(({result, relativePath}) => {
        if (result.status !== "failed") {
          return;
        }

        summary.addHeading([relativePath, ...result.ancestorTitles, result.title].join(" > "), 2);
        summary.addCodeBlock(result.failureMessages.join());
      })

    await summary.write();
  }

  getLastError() {
    // do nothing
  }
}

export default GithubReporter;