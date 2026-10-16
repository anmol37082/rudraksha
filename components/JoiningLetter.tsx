import { SITE } from "@/lib/site";
import { fmtDate } from "@/lib/client";
import { Card } from "./ui";
import { fileUrl } from "./FileLink";
import { PrintLetterButton } from "./PrintLetterButton";
import styles from "./JoiningLetter.module.css";

export function JoiningLetter({ letter }: { letter: any }) {
  return (
    <article className={styles.letter}>
      <div className={styles.printActions}><PrintLetterButton /></div>
      <Card className={styles.card}>
        <header className={styles.letterHeader}>
          <p className={styles.brandName}>{SITE.name}</p>
          <h2 className={styles.letterTitle}>Joining letter</h2>
          <p className={styles.issued}>Issued {fmtDate(letter.issuedAt)} · Letter version {letter.version}</p>
        </header>

        <p>Dear {letter.candidateName},</p>
        <p className={styles.intro}>
          We are pleased to welcome you to the team. Your joining details and employee information are recorded below.
        </p>

        <dl className={styles.details}>
          <div><dt className={styles.detailLabel}>Employee ID</dt><dd className={styles.detailStrong}>{letter.employeeId}</dd></div>
          <div><dt className={styles.detailLabel}>Position</dt><dd className={styles.detailValue}>{letter.position}</dd></div>
          <div><dt className={styles.detailLabel}>Joining date</dt><dd className={styles.detailValue}>{fmtDate(letter.joiningDate)}</dd></div>
          <div><dt className={styles.detailLabel}>Work location</dt><dd className={styles.detailValue}>{letter.location || "As discussed with the hiring team"}</dd></div>
          <div><dt className={styles.detailLabel}>Compensation</dt><dd className={styles.detailValue}>{letter.compensation || "As stated in your written offer"}</dd></div>
          <div><dt className={styles.detailLabel}>Email</dt><dd className={styles.detailValue}>{letter.candidateEmail}</dd></div>
          <div><dt className={styles.detailLabel}>Phone</dt><dd className={styles.detailValue}>{letter.candidatePhone || "-"}</dd></div>
          <div className={styles.fullSpan}><dt className={styles.detailLabel}>Address</dt><dd className={styles.detailValue}>{letter.address || "-"}</dd></div>
          {letter.dateOfBirth && <div><dt className={styles.detailLabel}>Date of birth</dt><dd className={styles.detailValue}>{fmtDate(letter.dateOfBirth)}</dd></div>}
        </dl>

        <section>
          <h3 className={styles.sectionTitle}>Terms and conditions</h3>
          <ol className={styles.termsList}>
            {(letter.terms ?? []).map((term: string, i: number) => <li key={`${i}-${term}`}>{term}</li>)}
          </ol>
        </section>

        <section className={styles.signatureSection}>
          <div>
            <p className={styles.assetLabel}>Passport-size photo</p>
            <img src={fileUrl(letter.photo)} alt={`Passport photo of ${letter.candidateName}`} className={styles.photo} />
          </div>
          <div>
            <p className={styles.assetLabel}>Employee signature</p>
            {letter.signature.format === "pdf" ? (
              <a href={fileUrl(letter.signature)} target="_blank" rel="noopener noreferrer" className={styles.signatureLink}>View uploaded signature document</a>
            ) : (
              <img src={fileUrl(letter.signature)} alt={`Signature of ${letter.candidateName}`} className={styles.signature} />
            )}
            <p className={styles.signatureNote}>Signature on file · {letter.candidateName}</p>
          </div>
        </section>

        <footer className={styles.footer}>
          This joining letter is stored in the company staff record and in your staff portal. You can print or save this page for your copy.
        </footer>
      </Card>
    </article>
  );
}
