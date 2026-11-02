const { MongoClient } = require("mongodb");
(async () => {
  const client = new MongoClient("mongodb://127.0.0.1:27028/ruudraksha_phase106_ui_2202761032354dc19a451fb6ebffb83d");
  await client.connect(); const db=client.db(); const events=await db.collection("events").find({}, {projection:{status:1}}).toArray();
  const rows=[]; for(const e of events){const quotes=await db.collection("quotations").find({eventId:e._id},{projection:{status:1,version:1}}).toArray();rows.push({event:String(e._id),status:e.status,quotes:quotes.map(q=>({status:q.status,version:q.version}))});}
  console.log(JSON.stringify({events:rows,agreements:await db.collection("agreements").countDocuments(),guestCount:await db.collection("guests").countDocuments(),taskCount:await db.collection("eventtasks").countDocuments(),changeCount:await db.collection("eventchangerequests").countDocuments()})); await client.close();
})().catch(e=>{console.log(e.name);process.exit(1)});
