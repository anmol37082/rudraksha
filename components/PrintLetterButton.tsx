"use client";
import { Button } from "./ui";

export function PrintLetterButton() {
  return <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>Print / Save as PDF</Button>;
}
