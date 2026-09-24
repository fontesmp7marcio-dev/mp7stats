async function run() {
  const res = await fetch("https://www.statshub.com/api/team/17/performance");
  const data = await res.json();
  console.log(Object.keys(data.data[0].statistics));
  console.log("event:", data.data[0].event);
}
run();
