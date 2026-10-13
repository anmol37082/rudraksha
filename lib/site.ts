// Edit these to match the company. Used across the public site and metadata.
export const SITE = {
  name: "Evermore Events",
  tagline: "Wedding & event staffing",
  email: "careers@evermore.example",
  phone: "+91 00000 00000",
  address: "Your street, Your city, Your country",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

export const FAQS: [string, string][] = [
  ["Is this a permanent job?", "Yes. We hire permanent team members. Selected candidates are added to our staff roster with an employee ID and a joining date."],
  ["Do I need previous experience?", "It helps, but it is not always required. Each position lists the experience it needs. We train new staff before their first event."],
  ["What documents do I need?", "Usually a resume or CV, an identity proof and an address proof. Each position shows exactly what is required before you apply."],
  ["Can I apply for more than one position?", "Yes, but only once per position."],
  ["How will I know where my application stands?", "Log in and open My applications. You will see a timeline of every step, plus notifications when something changes."],
  ["Is there a fee to apply?", "No. We never charge candidates to apply, interview or join. Please report anyone who asks for money in our name."],
  ["Are my documents safe?", "Your documents are stored privately. Only you and our hiring team can open them."],
];
