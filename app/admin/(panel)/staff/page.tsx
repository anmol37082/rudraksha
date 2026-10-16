import { connectDB } from "@/lib/mongodb";
import { pageParams, plain } from "@/lib/api";
import { Staff, CandidateProfile } from "@/models";
import { fmtDate } from "@/lib/client";
import { EmptyState, PageTitle, Pagination, Table } from "@/components/ui";
import { StaffStatus } from "@/components/SmallActions";
import { fileUrl } from "@/components/FileLink";
import Link from "next/link";
import styles from "./page.module.css";

export default async function AdminStaff({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, limit, skip } = pageParams(sp, 20);
  await connectDB();
  const [rows, total] = await Promise.all([Staff.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate("candidateId", "name email phone").lean(), Staff.countDocuments()]);
  const items = plain(rows) as any[];
  const profiles = await CandidateProfile.find({ userId: { $in: items.map((s) => s.candidateId?._id) } }).select("userId profilePhoto").lean();
  const photo = new Map<string, any>(profiles.map((p: any) => [String(p.userId), p.profilePhoto]));
  return (
    <>
      <PageTitle title="Permanent staff" />
      {items.length ? (
        <div className={styles.tableWrap}><Table head={["", "Employee", "Position", "Contact", "Joined", "Status", ""]}>
          {items.map((s) => {
            const ph = photo.get(s.candidateId?._id);
            return (
              <tr key={s._id}>
                <td className="td w-12">{ph ? <img src={fileUrl(ph)} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-forest-100" />}</td>
                <td className="td"><div className={styles.employeeInfo}><p className="font-medium">{s.candidateId?.name}</p><p className="text-xs text-stone-500">{s.employeeId}</p></div></td>
                <td className="td">{s.position}</td><td className="td"><div className={styles.contactInfo}><p>{s.candidateId?.email}</p><p className="text-xs text-stone-500">{s.candidateId?.phone}</p></div></td>
                <td className="td">{fmtDate(s.joiningDate)}</td><td className={`${styles.statusCell} td`}><StaffStatus id={s._id} status={s.status} /></td>
                <td className={`${styles.staffAction} td text-right`}><Link className="text-forest-700 underline" href={`/admin/staff/${s._id}`}>Joining letter</Link></td>
              </tr>
            );
          })}
        </Table></div>
      ) : <EmptyState title="No staff yet" text="Select a candidate, then convert them to permanent staff from the application page." />}
      <div className={styles.pagination}><Pagination page={page} total={total} limit={limit} path="/admin/staff" params={{}} /></div>
    </>
  );
}
