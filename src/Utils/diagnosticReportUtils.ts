import { Code } from "@/types/base/code/code";
import { DiagnosticReportRead } from "@/types/emr/diagnosticReport/diagnosticReport";

interface GetAvailableReportCodesResult {
  usedReportCodes: Set<string>;
  availableReportCodes: Code[];
  canCreateMoreReports: boolean;
}

export function getAvailableReportCodes(
  diagnosticReports: DiagnosticReportRead[],
  diagnosticReportCodes?: Code[],
): GetAvailableReportCodesResult {
  // Get codes that have already been used in diagnostic reports
  const usedReportCodes = new Set(
    diagnosticReports
      .map((report) => report.code?.code)
      .filter((code): code is string => !!code),
  );

  // Get available codes (not yet used for any report)
  const availableReportCodes =
    diagnosticReportCodes?.filter((code) => !usedReportCodes.has(code.code)) ||
    [];

  // Check if more reports can be created
  const canCreateMoreReports =
    availableReportCodes.length > 0 || !diagnosticReportCodes?.length;

  return {
    usedReportCodes,
    availableReportCodes,
    canCreateMoreReports,
  };
}
