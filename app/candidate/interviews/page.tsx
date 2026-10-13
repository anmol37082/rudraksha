import { requirePage } from "@/lib/guard";
import { Interview } from "@/models";
import { plain } from "@/lib/api";
import { fmtDate } from "@/lib/client";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";

export default async function Interviews() {
  const user = await requirePage("CANDIDATE");
  const items = plain(await Interview.find({ candidateId: user._id }).sort({ date: -1 }).populate("positionId", "title").lean()) as any[];
  return (
    <>
      <PageTitle title="Interviews" />
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((i) => (
            <Card key={i._id}>
              <div className="flex items-start justify-between gap-2"><h2 className="text-xl">{i.positionId?.title}</h2><Badge status={i.status} /></div>
              <p className="mt-2 font-medium">{fmtDate(i.date)} at {i.time}</p>
              <p className="text-sm text-stone-700">{i.type === "IN_PERSON" ? `In person: ${i.location}` : i.type === "VIDEO" ? "Video call" : "Phone call"}</p>
              {i.meetingLink && i.status === "SCHEDULED" && <a className="text-sm text-forest-700 underline" href={i.meetingLink} target="_blank" rel="noopener noreferrer">Join link</a>}
              {i.interviewer && <p className="text-sm">Interviewer: {i.interviewer}</p>}
              {i.instructions && <p className="mt-2 text-sm text-stone-700">{i.instructions}</p>}
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No interviews yet" text="When we schedule an interview, the details will appear here." />}
    </>
  );
}
