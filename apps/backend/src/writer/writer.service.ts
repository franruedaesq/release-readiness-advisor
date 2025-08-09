import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { RiskAnalysisResult } from '../risk/risk.service';

@Injectable()
export class WriterService {
  generateReport(analysisResult: RiskAnalysisResult, runId: number): string {
    const { riskScore, riskLevel, summary, evidence } = analysisResult;
    const reportId = uuidv4();
    const generationDate = new Date().toUTCString();

    const evidenceSection =
      evidence.length > 0
        ? '### 🔍 Evidence Found\n' +
          evidence.map((e) => `\`\`\`\n${e.trim()}\n\`\`\``).join('\n\n')
        : '### 🔍 Evidence Found\nNo specific evidence chunks were retrieved by the query.';

    const report = `
# Release Readiness Report

**Report ID:** \`${reportId}\`
**Analysis Date:** ${generationDate}
**Workflow Run ID:** \`${runId}\`

---

## 📊 Risk Assessment

| Metric      | Value                             |
|-------------|-----------------------------------|
| **Risk Score** | **${riskScore} / 100** |
| **Risk Level** | **${riskLevel}** |

**Summary:** ${summary}

---

${evidenceSection}
`;
    return report.trim();
  }
}
