"use client";
import { Button } from "@/components/ui";
export function PrintButton() { return <Button className="print:hidden" type="button" onClick={() => window.print()}>Print deployment sheet</Button>; }
