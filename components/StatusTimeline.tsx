import { STATUS_LABEL } from "@/lib/constants";
import { fmtDate } from "@/lib/client";

const PATH = ["NEW", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED"];

/** Shows the happy path, or the path actually taken if the application was rejected. */
export function StatusTimeline({ status, history }: { status: string; history: { to: string; at: string }[] }) {
  const reached = new Map(history.map((h) => [h.to, h.at]));
  const steps = status === "REJECTED" ? [...history.map((h) => h.to).filter((s) => s !== "REJECTED"), "REJECTED"] : PATH;
  const uniq = [...new Set(steps)];
  const current = uniq.indexOf(status);
  return (
    <ol className="space-y-0">
      {uniq.map((s, i) => {
        const done = i <= current;
        const bad = s === "REJECTED";
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1 h-3.5 w-3.5 rounded-full border-2 ${bad ? "border-rose-600 bg-rose-600" : done ? "border-forest-600 bg-forest-600" : "border-forest-200 bg-white"}`} />
              {i < uniq.length - 1 && <span className={`w-0.5 flex-1 ${i < current ? "bg-forest-600" : "bg-forest-100"}`} />}
            </div>
            <div className="pb-5">
              <p className={`text-sm ${done ? "font-medium text-forest-900" : "text-stone-400"}`}>{s === "NEW" ? "Application submitted" : STATUS_LABEL[s]}</p>
              {reached.get(s) && <p className="text-xs text-stone-500">{fmtDate(reached.get(s))}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
