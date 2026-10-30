import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { REPORT_REASONS } from "@/convex/lib/catalog";
import { useMutation } from "convex/react";
import { Flag, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  trigger,
}: {
  targetType: "activity" | "circle" | "member";
  targetId: string;
  targetLabel: string;
  trigger?: ReactNode;
}) {
  const report = useMutation(api.safety.report);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const result = await report({
        targetType,
        targetId,
        reason,
        details,
      });
      toast.success(
        result.alreadyReported
          ? "You already have an open report for this. A moderator will review it."
          : "Report sent to a human moderator. You can track it in the safety centre.",
      );
      setOpen(false);
      setDetails("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Flag className="size-3.5" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetType === "member" ? "a member" : `this ${targetType}`}</DialogTitle>
          <DialogDescription>
            Reporting “{targetLabel}”. Only moderators see this report; the person
            reported is never shown who reported them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>What happened?</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="report-details">What should a moderator know?</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Include what happened, when, and whether you felt unsafe. Don't include passwords or identity documents."
              rows={4}
              maxLength={1000}
              className="mt-1.5 resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {details.length}/1000
            </p>
          </div>
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            This reports to a review queue in the prototype. It does not contact
            emergency services. If you are in immediate danger, call 112 in India.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || details.trim().length < 10}
            className="gap-2"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
