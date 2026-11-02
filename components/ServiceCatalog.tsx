"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";

const suggestions = [
  "Guest check-in", "Guest check-out", "Registration desk", "Room allotment coordination", "Guest guidance",
  "Guest schedule management", "Guest query assistance", "Planner, host, hotel and vendor coordination", "Digital invitations",
  "Invitation reminders", "RSVP confirmations", "RSVP declines", "Travel details collection", "Preliminary rooming lists",
  "Transport sheets", "Vehicle allocation", "Flight arrival tracking", "Flight departure tracking", "Train arrival tracking",
  "Train departure tracking", "Airport pickup", "Railway station pickup", "Bus stand pickup", "Luggage handling",
  "Driver / vehicle issue reporting", "Guest shadow assistance", "Logistics assistance", "Welcome hostesses",
  "F&B coordination", "Butler services", "Security manpower", "Other approved event support",
];

export function ServiceCatalog({ initial }: { initial: any[] }) {
  const router = useRouter();
  const [services, setServices] = useState(initial);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(form: HTMLFormElement) {
    setBusy(true); setError("");
    const data = new FormData(form);
    const body = {
      name: data.get("name"), category: data.get("category"), description: data.get("description"),
      isOptional: data.get("isOptional") === "on", isRegulated: data.get("isRegulated") === "on", isActive: data.get("isActive") === "on",
    };
    const result = editing ? await api(`/api/services/${editing._id}`, "PUT", body) : await api("/api/services", "POST", body);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setServices((items) => editing ? items.map((item) => item._id === editing._id ? result.data : item) : [result.data, ...items]);
    setEditing(null); form.reset(); router.refresh();
  }

  function edit(service: any) { setEditing(service); window.scrollTo({ top: 0, behavior: "smooth" }); }

  return <div className="space-y-6">
    <form method="post" key={editing?._id ?? "new-service"} className="card grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(e.currentTarget); }}>
      <h2 className="sm:col-span-2 font-serif text-xl">{editing ? `Edit ${editing.name}` : "Add a service"}</h2>
      <Field label="Service name"><Input name="name" required defaultValue={editing?.name} list="service-suggestions" /><datalist id="service-suggestions">{suggestions.map((name) => <option key={name} value={name} />)}</datalist></Field>
      <Field label="Category"><Select name="category" required defaultValue={editing?.category ?? "Hospitality & Guest Management"}><option>Hospitality & Guest Management</option><option>Invitations & RSVP</option><option>Logistics & Transport</option><option>Event Support</option><option>Other</option></Select></Field>
      <div className="sm:col-span-2"><Field label="Description"><Textarea name="description" maxLength={3000} defaultValue={editing?.description} /></Field></div>
      <div className="sm:col-span-2 flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isOptional" defaultChecked={editing?.isOptional} />Optional service (such as RSVP)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isRegulated" defaultChecked={editing?.isRegulated} />Regulated service (security/medical)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />Active</label>
      </div>
      {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{error}</p>}
      <div className="sm:col-span-2 flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save service" : "Add service"}</Button>{editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel edit</Button>}</div>
    </form>
    {services.length ? <div className="responsive-table overflow-x-auto rounded-2xl border border-forest-200/70 bg-white"><table className="w-full min-w-[640px]"><thead className="bg-forest-50"><tr>{["Service", "Category", "Scope", "Status", ""].map((label) => <th key={label} className="th">{label}</th>)}</tr></thead><tbody className="divide-y divide-forest-100">{services.map((service) => <tr key={service._id}>
      <td className="td"><p className="font-medium">{service.name}</p><p className="text-xs text-stone-500">{service.description || "No description"}</p></td><td className="td">{service.category}</td>
      <td className="td">{service.isOptional ? "Optional" : "Standard"}{service.isRegulated ? " · Regulated" : ""}</td><td className="td"><Badge status={service.isActive ? "ACTIVE" : "INACTIVE"} /></td>
      <td className="td text-right"><Button small variant="outline" type="button" onClick={() => edit(service)}>Edit</Button></td>
    </tr>)}</tbody></table></div> : <p className="text-sm text-stone-600">No services yet. Add them from the categories described in the agreement. Adding a service to this catalogue does not include it in any client quotation.</p>}
  </div>;
}
