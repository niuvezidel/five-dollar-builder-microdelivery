import fs from "node:fs/promises";
import path from "node:path";

function normalizeValue(value) {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }
  return value;
}

function extractVerifyData(html) {
  const match = html.match(
    /<script[^>]*id=["']verify-data["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) {
    throw new Error("verify-data script block was not found");
  }
  return JSON.parse(match[1]);
}

function compareObjects(expected, actual, prefix = "") {
  const reasons = [];
  const expectedEntries = Object.entries(expected ?? {});
  for (const [key, expectedValue] of expectedEntries) {
    const fieldName = prefix ? `${prefix}.${key}` : key;
    const actualValue = actual?.[key];

    if (
      expectedValue &&
      typeof expectedValue === "object" &&
      !Array.isArray(expectedValue)
    ) {
      reasons.push(...compareObjects(expectedValue, actualValue, fieldName));
      continue;
    }

    const left = normalizeValue(expectedValue);
    const right = normalizeValue(actualValue);
    if (left !== right) {
      reasons.push(
        `${fieldName}: expected ${JSON.stringify(left)} but found ${JSON.stringify(right)}`,
      );
    }
  }
  return reasons;
}

async function loadSampleFiles(inputPath) {
  const stat = await fs.stat(inputPath);
  if (stat.isDirectory()) {
    const files = await fs.readdir(inputPath);
    return files
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map((file) => path.join(inputPath, file));
  }
  return [inputPath];
}

async function verifySample(samplePath) {
  const raw = await fs.readFile(samplePath, "utf8");
  const sample = JSON.parse(raw);

  const response = await fetch(sample.url, {
    headers: {
      "user-agent": "five-dollar-builder-verifier/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  });

  const html = await response.text();
  const observed = extractVerifyData(html);
  const reasons = compareObjects(sample.claim, observed);
  const decision = reasons.length === 0 ? "ACCEPT" : "REJECT";
  const expectedResult = sample.expectedResult || decision;

  return {
    sample: sample.name,
    url: sample.url,
    decision,
    expectedResult,
    behaviorMatchesExpectation: decision === expectedResult,
    reasons,
    observed,
    claim: sample.claim,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage: node verifier/verify_web_snapshot.mjs <sample.json|sample-directory> [more-samples...]",
    );
    process.exit(1);
  }

  const allFiles = [];
  for (const arg of args) {
    const files = await loadSampleFiles(arg);
    allFiles.push(...files);
  }

  const results = [];
  for (const file of allFiles) {
    try {
      results.push(await verifySample(file));
    } catch (error) {
      results.push({
        sample: path.basename(file),
        decision: "ERROR",
        expectedResult: "UNKNOWN",
        behaviorMatchesExpectation: false,
        reasons: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  const summary = {
    total: results.length,
    acceptCount: results.filter((item) => item.decision === "ACCEPT").length,
    rejectCount: results.filter((item) => item.decision === "REJECT").length,
    errorCount: results.filter((item) => item.decision === "ERROR").length,
    expectationPassCount: results.filter((item) => item.behaviorMatchesExpectation).length,
    expectationFailCount: results.filter((item) => !item.behaviorMatchesExpectation).length,
  };

  console.log(JSON.stringify({ summary, results }, null, 2));

  if (summary.expectationFailCount > 0 || summary.errorCount > 0) {
    process.exit(2);
  }
}

await main();
