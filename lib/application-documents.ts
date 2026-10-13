type CandidateFiles = { profilePhoto?: any; documents?: any[] } | null | undefined;

/** Include the single profile photo as the required passport photo in each application. */
export function documentsForApplication(profile: CandidateFiles) {
  const documents = [...(profile?.documents ?? [])];
  if (profile?.profilePhoto && !documents.some((d) => d.documentType === "PASSPORT_PHOTO")) {
    documents.unshift({ ...profile.profilePhoto, documentType: "PASSPORT_PHOTO" });
  }
  return documents;
}
