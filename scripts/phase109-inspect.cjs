const mongoose = require("mongoose");
const uri = "mongodb://127.0.0.1:27028/ruudraksha_phase106_ui_2202761032354dc19a451fb6ebffb83d";
(async () => {
  await mongoose.connect(uri, { autoIndex: false });
  const db = mongoose.connection.db;
  for (const name of ["events", "quotations", "manpowerrequirements", "ratecards", "eventstaffassignments", "shiftrecords", "services", "guests", "clients", "users", "candidates", "applications", "staffs", "auditlogs"]) {
    try {
      const collection = db.collection(name);
      const count = await collection.countDocuments();
      let sample = [];
      if (name === "events") sample = await collection.find({}, { projection: { eventName: 1, status: 1, eventDate: 1, eventEndDate: 1, clientId: 1 } }).limit(20).toArray();
      if (name === "quotations") sample = await collection.find({}, { projection: { eventId: 1, quotationNumber: 1, status: 1, version: 1, rsvpIncluded: 1, lines: 1 } }).limit(20).toArray();
      if (name === "manpowerrequirements") sample = await collection.find({}, { projection: { role: 1, status: 1, standardShiftHours: 1 } }).limit(20).toArray();
      if (name === "ratecards") sample = await collection.find({}, { projection: { role: 1, isActive: 1, standardShiftHours: 1, version: 1, effectiveFrom: 1, effectiveTo: 1, currency: 1, pricingUnit: 1, overtimeRules: 1 } }).limit(20).toArray();
      if (name === "services") sample = await collection.find({}, { projection: { name: 1, category: 1, isActive: 1 } }).limit(20).toArray();
      if (name === "clients") sample = await collection.find({}, { projection: { eventName: 1, status: 1, eventDate: 1, eventEndDate: 1, clientId: 1 } }).limit(20).toArray();
      if (name === "staffs") sample = await collection.find({}, { projection: { employeeId: 1, status: 1 } }).limit(20).toArray();
      if (name === "eventstaffassignments") sample = await collection.find({}, { projection: { eventId: 1, requirementId: 1, staffId: 1, role: 1, status: 1, eventDate: 1, shiftStart: 1, shiftEnd: 1 } }).limit(20).toArray();
      if (name === "manpowerrequirements") sample = await collection.find({}, { projection: { eventId: 1, role: 1, approvalStatus: 1, eventDate: 1, shiftStart: 1, shiftEnd: 1, requiredQuantity: 1, standardShiftHours: 1 } }).limit(20).toArray();
      if (name === "quotations") sample = sample.map(q => ({ ...q, _id: String(q._id), lines: q.lines?.map(line => ({ kind: line.kind, standardShiftHours: line.standardShiftHours, sourceId: String(line.sourceId) })) }));
      else sample = sample.map(x => ({ ...x, _id: String(x._id) }));
      console.log(JSON.stringify({ collection: name, count, sample }));
    } catch { console.log(JSON.stringify({ collection: name, missing: true })); }
  }
  await mongoose.disconnect();
})().catch(error => { console.log(JSON.stringify({ inspect: "failed", name: error.name })); process.exitCode = 1; });



