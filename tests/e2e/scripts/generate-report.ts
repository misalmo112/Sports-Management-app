import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Generate detailed test report from Playwright results
 * 
 * This script:
 * 1. Runs the academy-admin-panel tests
 * 2. Parses the test results
 * 3. Generates a comprehensive markdown report
 */

interface TestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
  category: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

function extractCategory(testTitle: string): string {
  // Extract category from test title
  const categories = [
    'Authentication & Navigation',
    'Overview Dashboard',
    'Students Management',
    'Classes Management',
    'Attendance Management',
    'Finance Management',
    'User Management',
    'Settings',
    'Media Management',
    'Reports',
    'Complaints',
  ];

  for (const category of categories) {
    if (testTitle.includes(category) || testTitle.toLowerCase().includes(category.toLowerCase().replace(/\s+/g, ''))) {
      return category;
    }
  }

  // Try to extract from describe block
  if (testTitle.includes('should')) {
    const parts = testTitle.split('should')[0].trim();
    return parts || 'Other';
  }

  return 'Other';
}

function parsePlaywrightResults(): TestResult[] {
  const results: TestResult[] = [];
  const testResultsDir = path.join(__dirname, '../test-results');
  const lastRunFile = path.join(testResultsDir, '.last-run.json');
  const jsonReportFile = path.join(__dirname, '../playwright-report/results.json');
  const testResultsJsonFile = path.join(__dirname, '../test-results-json.json');

  // Try to parse JSON reporter output first (from stdout redirect)
  try {
    if (fs.existsSync(testResultsJsonFile)) {
      const fileContent = fs.readFileSync(testResultsJsonFile, 'utf-8');
      // Extract JSON from the file (may have other output)
      const jsonMatch = fileContent.match(/\{[\s\S]*"config"[\s\S]*\}/);
      if (jsonMatch) {
        const report = JSON.parse(jsonMatch[0]);
        
        if (report.suites) {
          for (const suite of report.suites) {
            for (const spec of suite.specs || []) {
              for (const test of spec.tests || []) {
                const testResult = test.results?.[0];
                if (testResult) {
                  const category = extractCategory(test.title || spec.title || '');
                  results.push({
                    title: test.title || spec.title || 'Unknown Test',
                    status: testResult.status === 'passed' ? 'passed' : 
                            testResult.status === 'failed' || testResult.status === 'unexpected' ? 'failed' : 'skipped',
                    duration: testResult.duration || 0,
                    error: testResult.error?.message,
                    category,
                  });
                }
              }
            }
          }
        }
        
        if (results.length > 0) {
          return results;
        }
      }
    }
  } catch (error) {
    console.warn('Could not parse test-results-json.json file:', error);
  }

  // Try to parse JSON reporter output from playwright-report
  try {
    if (fs.existsSync(jsonReportFile)) {
      const report = JSON.parse(fs.readFileSync(jsonReportFile, 'utf-8'));
      
      if (report.suites) {
        for (const suite of report.suites) {
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              const category = extractCategory(test.title || spec.title || '');
              results.push({
                title: test.title || spec.title || 'Unknown Test',
                status: test.results?.[0]?.status === 'passed' ? 'passed' : 
                        test.results?.[0]?.status === 'failed' ? 'failed' : 'skipped',
                duration: test.results?.[0]?.duration || 0,
                error: test.results?.[0]?.error?.message,
                category,
              });
            }
          }
        }
      }
      
      if (results.length > 0) {
        return results;
      }
    }
  } catch (error) {
    console.warn('Could not parse JSON report file:', error);
  }

  // Fallback to last-run.json
  try {
    if (fs.existsSync(lastRunFile)) {
      const lastRun = JSON.parse(fs.readFileSync(lastRunFile, 'utf-8'));
      
      // Parse test results from last run
      if (lastRun.tests) {
        for (const test of lastRun.tests) {
          const category = extractCategory(test.title || '');
          results.push({
            title: test.title || 'Unknown Test',
            status: test.status || 'skipped',
            duration: test.duration || 0,
            error: test.error?.message,
            category,
          });
        }
      }
    }
  } catch (error) {
    console.warn('Could not parse last run file:', error);
  }

  return results;
}

function generateReport(results: TestResult[]): string {
  const summary: TestSummary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    duration: results.reduce((sum, r) => sum + r.duration, 0),
  };

  // Group by category
  const byCategory: Record<string, TestResult[]> = {};
  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  }

  let report = `# Academy Admin Panel E2E Test Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Test Account:** Set via E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (e.g. in .env.e2e).\n\n`;

  // Summary
  report += `## Test Summary\n\n`;
  report += `| Metric | Count |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Tests | ${summary.total} |\n`;
  report += `| Passed | ${summary.passed} |\n`;
  report += `| Failed | ${summary.failed} |\n`;
  report += `| Skipped | ${summary.skipped} |\n`;
  report += `| Total Duration | ${(summary.duration / 1000).toFixed(2)}s |\n`;
  report += `| Pass Rate | ${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0}% |\n\n`;

  // Results by Category
  report += `## Test Results by Category\n\n`;
  
  for (const [category, categoryResults] of Object.entries(byCategory)) {
    const categoryPassed = categoryResults.filter(r => r.status === 'passed').length;
    const categoryFailed = categoryResults.filter(r => r.status === 'failed').length;
    const categorySkipped = categoryResults.filter(r => r.status === 'skipped').length;
    
    report += `### ${category}\n\n`;
    report += `**Summary:** ${categoryPassed} passed, ${categoryFailed} failed, ${categorySkipped} skipped\n\n`;
    
    report += `| Test | Status | Duration |\n`;
    report += `|------|--------|----------|\n`;
    
    for (const result of categoryResults) {
      const statusIcon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
      const duration = `${(result.duration / 1000).toFixed(2)}s`;
      report += `| ${result.title} | ${statusIcon} ${result.status} | ${duration} |\n`;
    }
    
    report += `\n`;
  }

  // Detailed Test Logs
  report += `## Detailed Test Logs\n\n`;
  
  for (const [category, categoryResults] of Object.entries(byCategory)) {
    report += `### ${category}\n\n`;
    
    for (const result of categoryResults) {
      report += `#### ${result.title}\n\n`;
      report += `- **Status:** ${result.status}\n`;
      report += `- **Duration:** ${(result.duration / 1000).toFixed(2)}s\n`;
      
      if (result.error) {
        report += `- **Error:** \`${result.error}\`\n`;
      }
      
      if (result.screenshot) {
        report += `- **Screenshot:** ${result.screenshot}\n`;
      }
      
      report += `\n`;
    }
  }

  // Coverage Report
  report += `## Coverage Report\n\n`;
  report += `### Tested Actions\n\n`;
  
  const actions = [
    'Authentication & Login',
    'Navigation Menu',
    'Overview Dashboard View',
    'Students List View',
    'Student Creation',
    'Student Details View',
    'Student Search/Filter',
    'Classes List View',
    'Class Creation',
    'Class Details View',
    'Class Enrollments View',
    'Attendance List View',
    'Mark Attendance',
    'Attendance Filtering',
    'Billing Items List',
    'Billing Item Creation',
    'Invoices List View',
    'Invoice Creation',
    'Invoice Details View',
    'Receipts List View',
    'Receipt Creation',
    'Users List View',
    'User Tabs (ADMIN/COACH/PARENT)',
    'Invite Coach',
    'Invite Parent',
    'Locations Settings',
    'Sports Settings',
    'Age Categories Settings',
    'Terms Settings',
    'Pricing Settings',
    'Media Library View',
    'Reports View',
    'Complaints View',
  ];
  
  report += `| Action | Tested |\n`;
  report += `|--------|--------|\n`;
  
  for (const action of actions) {
    // Check if action was tested based on test titles
    const tested = results.some(r => 
      r.title.toLowerCase().includes(action.toLowerCase().split(' ')[0]) ||
      r.status !== 'skipped'
    );
    report += `| ${action} | ${tested ? '✅' : '❌'} |\n`;
  }
  
  report += `\n`;

  // Issues Found
  const failedTests = results.filter(r => r.status === 'failed');
  if (failedTests.length > 0) {
    report += `## Issues Found\n\n`;
    
    for (const test of failedTests) {
      report += `### ${test.title}\n\n`;
      report += `- **Category:** ${test.category}\n`;
      if (test.error) {
        report += `- **Error:** \`${test.error}\`\n`;
      }
      report += `\n`;
    }
  } else {
    report += `## Issues Found\n\n`;
    report += `No issues found. All tests passed! ✅\n\n`;
  }

  // Recommendations
  report += `## Recommendations\n\n`;
  
  if (summary.failed > 0) {
    report += `1. **Investigate Failed Tests:** Review the ${summary.failed} failed test(s) and fix the underlying issues.\n`;
  }
  
  if (summary.skipped > 0) {
    report += `2. **Review Skipped Tests:** ${summary.skipped} test(s) were skipped. Ensure prerequisites are met.\n`;
  }
  
  report += `3. **Improve Test Coverage:** Consider adding more edge case tests.\n`;
  report += `4. **Performance:** Total test duration was ${(summary.duration / 1000).toFixed(2)}s. Consider optimizing slow tests.\n`;
  report += `5. **Maintenance:** Keep test selectors stable and update tests when UI changes.\n\n`;

  // Footer
  report += `---\n\n`;
  report += `*Report generated automatically by E2E test suite*\n`;

  return report;
}

function main() {
  console.log('Generating Academy Admin Panel E2E Test Report...\n');

  // Try to parse existing results
  let results = parsePlaywrightResults();

  // If no results found, provide instructions
  if (results.length === 0) {
    console.log('No existing test results found.');
    console.log('Please run: npx playwright test academy-admin-panel.spec.ts --reporter=json,list\n');
    console.log('Or use: npm run test:admin-panel:with-report\n');
  }

  // Generate report
  const report = generateReport(results);

  // Write report
  const reportPath = path.join(__dirname, '../academy-admin-panel-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log(`✅ Report generated: ${reportPath}`);
  console.log(`\nSummary:`);
  console.log(`- Total Tests: ${results.length}`);
  console.log(`- Passed: ${results.filter(r => r.status === 'passed').length}`);
  console.log(`- Failed: ${results.filter(r => r.status === 'failed').length}`);
  console.log(`- Skipped: ${results.filter(r => r.status === 'skipped').length}`);
}

if (require.main === module) {
  main();
}

export { generateReport, parsePlaywrightResults };
