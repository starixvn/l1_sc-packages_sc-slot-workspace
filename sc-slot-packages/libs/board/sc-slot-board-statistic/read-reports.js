import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads all report files from the reports directory and collects them into an array
 * @returns {Array} Array of parsed report objects
 */
function readAllReports() {
  const reportsDir = path.join(__dirname, "reports");
  const reports = [];

  try {
    // Read all files in the reports directory
    const files = fs.readdirSync(reportsDir);

    // Filter for JSON files that match the report pattern
    const reportFiles = files.filter((file) => file.endsWith(".json") && file.startsWith("report-"));

    // Sort files numerically by their report number
    reportFiles.sort((a, b) => {
      const numA = parseInt(a.match(/report-(\d+)/)[1]);
      const numB = parseInt(b.match(/report-(\d+)/)[1]);
      return numA - numB;
    });

    console.log(`Found ${reportFiles.length} report files`);

    // Read and parse each report file
    for (const file of reportFiles) {
      try {
        const filePath = path.join(reportsDir, file);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const reportData = JSON.parse(fileContent);

        // Each report file contains an array with one object
        if (Array.isArray(reportData) && reportData.length > 0) {
          reports.push({
            filename: file,
            reportNumber: parseInt(file.match(/report-(\d+)/)[1]),
            data: reportData[0], // Extract the actual report object
          });
        }

        console.log(`✓ Loaded ${file}`);
      } catch (error) {
        console.error(`✗ Error reading ${file}:`, error.message);
      }
    }

    console.log(`\nSuccessfully loaded ${reports.length} reports`);
    return reports;
  } catch (error) {
    console.error("Error reading reports directory:", error.message);
    return [];
  }
}

/**
 * Get summary statistics from all reports
 * @param {Array} reports - Array of report objects
 * @returns {Object} Summary statistics
 */
function getReportSummary(reports) {
  if (reports.length === 0) {
    return { error: "No reports found" };
  }

  const rtpValues = reports.map((r) => r.data.report.rtp);
  const maxWinValues = reports.map((r) => r.data.report.maxWin);
  const tumbleWinValues = reports.map((r) => r.data.report.tumbleWinRatio);
  const multiplierValues = reports.map((r) => r.data.report.multiplierRatio);
  const freeSpinsValues = reports.map((r) => r.data.report.freeSpinsRatio);
  const hitMaxWinValues = reports.map((r) => r.data.report.hitMaxWin);
  const totalPayoutValues = reports.map((r) => r.data.report.totalPayout || 0);
  const totalBetValues = reports.map((r) => r.data.report.totalBet || 0);

  return {
    totalReports: reports.length,
    reportRange: {
      first: reports[0].reportNumber,
      last: reports[reports.length - 1].reportNumber,
    },
    rtpStats: {
      min: Math.min(...rtpValues),
      max: Math.max(...rtpValues),
      avg: rtpValues.reduce((sum, val) => sum + val, 0) / rtpValues.length,
    },
    maxWinStats: {
      min: Math.min(...maxWinValues),
      max: Math.max(...maxWinValues),
      avg: maxWinValues.reduce((sum, val) => sum + val, 0) / maxWinValues.length,
    },
    tumbleWinStats: {
      min: Math.min(...tumbleWinValues),
      max: Math.max(...tumbleWinValues),
      avg: tumbleWinValues.reduce((sum, val) => sum + val, 0) / tumbleWinValues.length,
    },
    multiplierStats: {
      min: Math.min(...multiplierValues),
      max: Math.max(...multiplierValues),
      avg: multiplierValues.reduce((sum, val) => sum + val, 0) / multiplierValues.length,
    },
    freeSpinsStats: {
      min: Math.min(...freeSpinsValues),
      max: Math.max(...freeSpinsValues),
      avg: freeSpinsValues.reduce((sum, val) => sum + val, 0) / freeSpinsValues.length,
    },
    hitMaxWinStats: {
      min: Math.min(...hitMaxWinValues),
      max: Math.max(...hitMaxWinValues),
      avg: hitMaxWinValues.reduce((sum, val) => sum + val, 0) / hitMaxWinValues.length,
    },
    totalPayoutStats: {
      min: Math.min(...totalPayoutValues),
      max: Math.max(...totalPayoutValues),
      avg: totalPayoutValues.reduce((sum, val) => sum + val, 0) / totalPayoutValues.length,
      total: totalPayoutValues.reduce((sum, val) => sum + val, 0),
    },
    totalBetStats: {
      min: Math.min(...totalBetValues),
      max: Math.max(...totalBetValues),
      avg: totalBetValues.reduce((sum, val) => sum + val, 0) / totalBetValues.length,
      total: totalBetValues.reduce((sum, val) => sum + val, 0),
    },
  };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Reading all reports...\n");

  const allReports = readAllReports();

  if (allReports.length > 0) {
    console.log("\n=== REPORT SUMMARY ===");
    const summary = getReportSummary(allReports);
    console.log(JSON.stringify(summary, null, 2));

    console.log("\n=== SAMPLE REPORT STRUCTURE ===");
    console.log("First report keys:", Object.keys(allReports[0].data));
    console.log("Report data keys:", Object.keys(allReports[0].data.report));
    console.log("Symbols count:", Object.keys(allReports[0].data.symbols).length);
  }
}

// Export functions for use in other modules
export { readAllReports, getReportSummary };
