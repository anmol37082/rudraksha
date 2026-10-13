import { SITE } from "@/lib/site";
import { fmtDate } from "@/lib/client";
import { Card } from "./ui";
import { fileUrl } from "./FileLink";
import { PrintLetterButton } from "./PrintLetterButton";

export function JoiningLetter({ letter }: { letter: any }) {
  return (
    <article className="mx-auto max-w-3xl print:max-w-none">
      <div className="mb-4 flex justify-end print:hidden"><PrintLetterButton /></div>
      <Card className="space-y-6 print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-forest-100 pb-5 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-gold-700">{SITE.name}</p>
          <h2 className="mt-2 text-3xl">Joining letter</h2>
          <p className="mt-2 text-sm text-stone-500">Issued {fmtDate(letter.issuedAt)} · Letter version {letter.version}</p>
        </header>

        <p>Dear {letter.candidateName},</p>
        <p className="text-sm leading-6 text-stone-700">
          We are pleased to welcome you to the team. Your joining details and employee information are recorded below.
        </p>

        <dl className="grid gap-x-6 gap-y-3 rounded-md bg-forest-50 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-stone-500">Employee ID</dt><dd className="font-semibold">{letter.employeeId}</dd></div>
          <div><dt className="text-stone-500">Position</dt><dd className="font-medium">{letter.position}</dd></div>
          <div><dt className="text-stone-500">Joining date</dt><dd className="font-medium">{fmtDate(letter.joiningDate)}</dd></div>
          <div><dt className="text-stone-500">Work location</dt><dd className="font-medium">{letter.location || "As discussed with the hiring team"}</dd></div>
          <div><dt className="text-stone-500">Compensation</dt><dd className="font-medium">{letter.compensation || "As stated in your written offer"}</dd></div>
          <div><dt className="text-stone-500">Email</dt><dd className="font-medium">{letter.candidateEmail}</dd></div>
          <div><dt className="text-stone-500">Phone</dt><dd className="font-medium">{letter.candidatePhone || "-"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-stone-500">Address</dt><dd className="font-medium">{letter.address || "-"}</dd></div>
          {letter.dateOfBirth && <div><dt className="text-stone-500">Date of birth</dt><dd className="font-medium">{fmtDate(letter.dateOfBirth)}</dd></div>}
        </dl>

        <section>
          <h3 className="text-xl">Terms and conditions</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-stone-700">
            {(letter.terms ?? []).map((term: string, i: number) => <li key={`${i}-${term}`}>{term}</li>)}
          </ol>
        </section>

        <section className="grid gap-8 border-t border-forest-100 pt-5 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Passport-size photo</p>
            <img src={fileUrl(letter.photo)} alt={`Passport photo of ${letter.candidateName}`} className="mt-2 h-32 w-28 rounded border border-forest-100 object-cover" />
          </div>
          <div>
            <p className="text-sm font-medium">Employee signature</p>
            {letter.signature.format === "pdf" ? (
              <a href={fileUrl(letter.signature)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-forest-700 underline">View uploaded signature document</a>
            ) : (
              <img src={fileUrl(letter.signature)} alt={`Signature of ${letter.candidateName}`} className="mt-2 h-20 max-w-48 object-contain object-left" />
            )}
            <p className="mt-2 border-t border-stone-400 pt-1 text-xs text-stone-500">Signature on file · {letter.candidateName}</p>
          </div>
        </section>

        <footer className="border-t border-forest-100 pt-4 text-xs text-stone-500">
          This joining letter is stored in the company staff record and in your staff portal. You can print or save this page for your copy.
        </footer>
      </Card>
    </article>
  );
}
