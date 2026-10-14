import Link from "next/link";
import { requirePage } from "@/lib/guard";
import { Application, CandidateProfile, Interview, Notification, Position } from "@/models";
import { isProfileSetupComplete } from "@/lib/profile";
import { redirect } from "next/navigation";

const actions = [
  { href: "/jobs", label: "Positions", description: "Browse and apply for new roles", icon: "briefcase", color: "text-[#164332]" },
  { href: "/candidate/applications", label: "Applications", description: "Track your submissions", icon: "application", color: "text-[#90713B]" },
  { href: "/candidate/profile", label: "My Profile", description: "View and update your profile", icon: "profile", color: "text-[#164332]" },
  { href: "/candidate/documents", label: "Documents", description: "Manage your documents", icon: "document", color: "text-[#09251B]" },
  { href: "/candidate/interviews", label: "Interviews", description: "View upcoming interviews", icon: "calendar", color: "text-[#164332]" },
  { href: "/contact", label: "Help & Support", description: "Get assistance anytime", icon: "support", color: "text-[#90713B]" },
];

function AppIcon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "briefcase": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3.5" y="7.5" width="17" height="13" rx="2.5" /><path d="M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7M3.5 12h17M10 12v2h4v-2" /></svg>;
    case "application": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M8 4.5h8a2 2 0 0 1 2 2v13H6v-13a2 2 0 0 1 2-2Z" /><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 17h3" /></svg>;
    case "profile": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
    case "document": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M7 3.5h7l5 5V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 3.5v5h5M9 13h6M9 17h6" /></svg>;
    case "calendar": return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M3.5 10h17M8 14h2M14 14h2M8 17h2" /></svg>;
    default: return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H6a2 2 0 0 1-2-2v-4ZM20 13h-3v6h1a2 2 0 0 0 2-2v-4ZM17 19a5 5 0 0 1-5 2" /></svg>;
  }
}

export default async function Dashboard() {
  const user = await requirePage("CANDIDATE");
  const profile = await CandidateProfile.findOne({ userId: user._id }).lean();
  if (!isProfileSetupComplete(user, profile)) redirect("/candidate/profile");
  const [applications, interviews, notifications, activePositions, applicationCount, shortlistedCount, interviewCount, hiredCount] = await Promise.all([
    Application.find({ candidateId: user._id }).sort({ appliedAt: -1 }).limit(10).select("status appliedAt positionId").populate("positionId", "title").lean(),
    Interview.find({ candidateId: user._id }).sort({ date: -1 }).limit(10).select("status date positionId").populate("positionId", "title").lean(),
    Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(5).select("title message createdAt isRead").lean(),
    Position.countDocuments({ status: "ACTIVE" }),
    Application.countDocuments({ candidateId: user._id }),
    Application.countDocuments({ candidateId: user._id, status: "SHORTLISTED" }),
    Interview.countDocuments({ candidateId: user._id }),
    Application.countDocuments({ candidateId: user._id, status: "SELECTED" }),
  ]) as [any[], any[], any[], number, number, number, number, number];

  const firstName = user.name.split(" ")[0];
  const profilePhoto = profile?.profilePhoto ?? profile?.documents?.find((document: any) => document.documentType === "PASSPORT_PHOTO");
  const profilePhotoUrl = profilePhoto
    ? `/api/files?publicId=${encodeURIComponent(profilePhoto.publicId)}&type=${profilePhoto.resourceType}`
    : null;
  const recentActivity = [
    ...applications.map((item: any) => ({
      title: item.positionId?.title ?? "Position application",
      detail: `Application ${String(item.status).toLowerCase().replaceAll("_", " ")}`,
      date: item.appliedAt ?? item.createdAt,
      href: `/candidate/applications`,
      icon: "application",
    })),
    ...interviews.map((item: any) => ({
      title: item.positionId?.title ?? "Interview",
      detail: item.status === "SCHEDULED" ? "Interview scheduled" : `Interview ${String(item.status).toLowerCase()}`,
      date: item.date,
      href: "/candidate/interviews",
      icon: "calendar",
    })),
    ...notifications.map((item: any) => ({
      title: item.title,
      detail: item.message,
      date: item.createdAt,
      href: "/candidate/notifications",
      icon: "document",
    })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 3);
  const stats = [
    { label: "Applied", value: applicationCount, icon: "briefcase" },
    { label: "Shortlisted", value: shortlistedCount, icon: "application" },
    { label: "Interviews", value: interviewCount, icon: "calendar" },
    { label: "Hired", value: hiredCount, icon: "profile" },
  ];
  const documentCount = profile?.documents?.length ?? 0;

  return <div className="candidate-dashboard">
    <section className="candidate-welcome" aria-label="Welcome">
      <div>
        <span className="candidate-welcome-kicker">WELCOME BACK</span>
        <h1>Hello,<br /><strong>{firstName} 👋</strong></h1>
        <p>Manage your profile, applications<br className="hidden sm:block" /> and more from here.</p>
      </div>
      <Link href="/candidate/profile" className="candidate-avatar" aria-label="Edit profile">{profilePhotoUrl ? <img src={profilePhotoUrl} alt="" /> : <span>{firstName.slice(0, 1).toUpperCase()}</span>}<small>✎ Edit Profile</small></Link>
    </section>

    <section className="candidate-promo" aria-label="Explore opportunities">
      <div className="candidate-promo-copy">
        <span>BE A PART OF</span>
        <h2>Memorable<br />Celebrations</h2>
        <p>Get hired for premium weddings<br />and special events.</p>
        <Link href="/jobs">Explore Opportunities <span aria-hidden="true">→</span></Link>
      </div>
    </section>

    <section aria-label="Candidate services" className="candidate-service-grid">
      {actions.map((action) => <Link key={action.href} href={action.href} aria-label={`${action.label}: ${action.description}`} className="candidate-service-card">
        <span className={`candidate-service-icon ${action.color}`}><AppIcon name={action.icon} /></span>
        <strong>{action.label}</strong>
        <span className="candidate-service-description">{action.description}</span>
        {action.href === "/jobs" && <small>{activePositions} open roles</small>}
        {action.href === "/candidate/documents" && <small>{documentCount} uploaded</small>}
        <span className="candidate-card-arrow" aria-hidden="true">›</span>
      </Link>)}
    </section>

    <section className="candidate-stats-section" aria-label="Quick stats">
      <div className="candidate-section-heading"><h2>Quick Stats</h2><Link href="/candidate/applications">View all <span aria-hidden="true">→</span></Link></div>
      <div className="candidate-stats-grid">
        {stats.map((stat) => <div key={stat.label} className="candidate-stat-card"><span className="candidate-stat-icon"><AppIcon name={stat.icon} /></span><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
      </div>
    </section>

    <section className="candidate-activity-section" aria-label="Recent activity">
      <div className="candidate-section-heading"><h2>Recent Activity</h2><Link href="/candidate/notifications">View all <span aria-hidden="true">→</span></Link></div>
      <div className="candidate-activity-list">
        {recentActivity.length ? recentActivity.map((item, index) => <Link key={`${item.href}-${index}`} href={item.href} className="candidate-activity-item">
          <span className="candidate-activity-icon"><AppIcon name={item.icon} /></span>
          <span className="candidate-activity-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
          <span className="candidate-activity-date">{item.date ? new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span>
          <span className="candidate-activity-arrow" aria-hidden="true">›</span>
        </Link>) : <p className="candidate-activity-empty">Your recent applications and updates will appear here.</p>}
      </div>
    </section>

    <section className="candidate-help-card" aria-label="Support">
      <span className="candidate-help-icon"><AppIcon name="support" /></span>
      <span><strong>Need Help?</strong><small>Our team is here to support you.</small></span>
      <Link href="/contact">Contact Support <span aria-hidden="true">→</span></Link>
    </section>
  </div>;
}
