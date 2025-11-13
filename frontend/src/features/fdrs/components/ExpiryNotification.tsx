import { differenceInDays, isValid } from "date-fns";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { FDR } from "../types/fdr";

interface ExpiryNotificationProps {
  fdrs: FDR[];
}

export function ExpiryNotification({ fdrs }: ExpiryNotificationProps) {
  try {
    // ✅ Validate prop type and ensure array safety
    if (!Array.isArray(fdrs) || fdrs.length === 0) {
      return null;
    }

    // ✅ Filter out expiring FDRs safely
    const expiringFDRs = fdrs.filter((fdr) => {
      try {
        if (!fdr || !fdr.maturityDate) return false;

        const maturityDate = new Date(fdr.maturityDate);
        if (!isValid(maturityDate)) return false; // skip invalid date formats

        const daysUntilMaturity = differenceInDays(maturityDate, new Date());
        return daysUntilMaturity <= 30 && daysUntilMaturity > 0;
      } catch {
        // Ignore individual FDR errors to avoid breaking entire list
        return false;
      }
    });

    if (expiringFDRs.length === 0) {
      return null;
    }

    // ✅ UI: Show alert when some are expiring
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div>
          <AlertTitle>FDRs Expiring Soon</AlertTitle>
          <AlertDescription>
            You have <strong>{expiringFDRs.length}</strong>{" "}
            FDR{expiringFDRs.length > 1 ? "s" : ""} expiring within the next{" "}
            30 days. Please review and take necessary action.
          </AlertDescription>
        </div>
      </Alert>
    );
  } catch (error) {
    console.error("Error rendering ExpiryNotification:", error);

    // ✅ Fallback: Gracefully render no notification (avoid breaking UI)
    return null;
  }
}
