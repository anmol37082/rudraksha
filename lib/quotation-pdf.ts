function ascii(value: unknown) {
  return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
}

function pdfText(value: unknown) {
  return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: unknown, width = 88) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > width) {
      if (current) lines.push(current);
      current = "";
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
    } else if (!current) current = word;
    else if (`${current} ${word}`.length <= width) current += ` ${word}`;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function money(amount: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)}`;
}

export function quotationDocumentLines(snapshot: any) {
  const client = snapshot.client ?? {};
  const event = snapshot.event ?? {};
  const lines: { text: string; size?: number; gap?: number }[] = [
    { text: "RUUDRAKSHA EVENTS - SERVICE QUOTATION", size: 18, gap: 10 },
    { text: `${snapshot.quotationNumber ?? "Quotation"}  |  Version ${snapshot.version ?? 1}`, size: 11 },
    { text: `Validity: ${snapshot.validUntil ? new Date(snapshot.validUntil).toLocaleDateString("en-IN") : "Not specified"}`, gap: 8 },
    { text: "CLIENT / EVENT PLANNER", size: 12, gap: 3 },
    { text: client.name ?? "", size: 10 },
    { text: [client.businessName, client.contactPerson].filter(Boolean).join(" | "), size: 9 },
    { text: [client.email, client.phone].filter(Boolean).join(" | "), size: 9 },
    { text: client.address ?? "", size: 9, gap: 8 },
    { text: "EVENT DETAILS", size: 12, gap: 3 },
    { text: event.eventName ?? "", size: 10 },
    { text: `Type: ${event.eventType || "Not specified"} | Host: ${event.coupleOrHostName || "Not specified"}`, size: 9 },
    { text: `Dates: ${event.eventDate ? new Date(event.eventDate).toLocaleDateString("en-IN") : "-"} to ${event.eventEndDate ? new Date(event.eventEndDate).toLocaleDateString("en-IN") : "-"}`, size: 9 },
    { text: `Estimated guests: ${event.estimatedGuestCount ?? "Not specified"}`, size: 9 },
    { text: "Venues:", size: 9 },
    ...((event.venues ?? []).map((venue: any) => ({ text: `- ${[venue.name, venue.address, venue.city, venue.state].filter(Boolean).join(", ")}`, size: 9 }))),
    { text: "APPROVED SCOPE AND CHARGES", size: 12, gap: 3 },
    { text: "Description | Quantity | Unit | Rate | Amount", size: 9 },
    ...((snapshot.lines ?? []).map((line: any) => ({
      text: `${line.description} | ${line.quantity} | ${line.unit} | ${money(line.unitRate, snapshot.currency ?? "INR")} | ${money(line.amount, snapshot.currency ?? "INR")}`,
      size: 9,
    }))),
    { text: `Subtotal: ${money(snapshot.subtotal, snapshot.currency ?? "INR")}`, size: 10, gap: 4 },
    { text: `Tax (${snapshot.taxRate ?? 0}%): ${money(snapshot.taxAmount, snapshot.currency ?? "INR")}`, size: 10 },
    { text: `Discount: ${money(snapshot.discount, snapshot.currency ?? "INR")}`, size: 10 },
    { text: `GRAND TOTAL: ${money(snapshot.grandTotal, snapshot.currency ?? "INR")}`, size: 13, gap: 8 },
    { text: `Invitation / RSVP services included: ${snapshot.rsvpIncluded ? "Yes" : "No"}`, size: 10, gap: 4 },
    { text: "PAYMENT MILESTONES", size: 12, gap: 3 },
    ...((snapshot.paymentMilestones ?? []).map((item: any) => ({ text: `${item.name} - ${item.percentage}% (${money(item.amount, snapshot.currency ?? "INR")}) - ${item.dueDescription}`, size: 9 }))),
    { text: "TERMS & CONDITIONS", size: 12, gap: 4 },
    ...((snapshot.terms ?? []).map((term: string, index: number) => ({ text: `${index + 1}. ${term}`, size: 9 }))),
    ...(snapshot.revisionReason ? [{ text: `Revision: ${snapshot.revisionReason}`, size: 9, gap: 4 }] : []),
    { text: "This quotation records the selected scope and commercial values for review. A separate service agreement is required before event confirmation.", size: 9, gap: 6 },
  ];
  return lines.flatMap((line) => [...wrap(line.text).map((text, index) => ({ text, size: index === 0 ? line.size ?? 10 : 9, gap: index === 0 ? line.gap ?? 0 : 0 }))]);
}

export function createQuotationPdf(snapshot: any) {
  const lines = quotationDocumentLines(snapshot);
  const perPage = 48;
  const pages: typeof lines[] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  if (!pages.length) pages.push([]);
  const fontId = 3 + pages.length * 2;
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageIds = pages.map((_, index) => 3 + index * 2);
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    let y = 790;
    const commands = page.map((line) => {
      y -= line.gap ?? 0;
      const command = `BT /F1 ${line.size ?? 10} Tf 50 ${y} Td (${pdfText(line.text)}) Tj ET`;
      y -= line.size && line.size > 12 ? 22 : 14;
      return command;
    }).join("\n");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(commands, "ascii")} >>\nstream\n${commands}\nendstream`;
  });
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  let pdf = "%PDF-1.4\n%ASCII\n";
  const offsets = new Array(objects.length).fill(0);
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(pdf, "ascii");
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}
