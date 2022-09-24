const xlsx = require("xlsx");
const fs = require("fs");

const wb = xlsx.readFile("./hacknu-dev-data.xlsx", { cellDates: true });
console.log(wb.SheetNames.length);
for (let i = 0; i < wb.SheetNames.length; i++) {
  const ws = wb.Sheets[wb.SheetNames[i]];
  const data = xlsx.utils.sheet_to_json(ws);
  fs.writeFileSync(`./datajson${i}.json`, JSON.stringify(data));
}
// const ws = wb.Sheets["dev9"];
// // console.log(ws);
// const data = xlsx.utils.sheet_to_json(ws);

// fs.writeFileSync("./datajson.json", JSON.stringify(data));
// console.log(data);
