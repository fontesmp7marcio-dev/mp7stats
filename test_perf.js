async function run() {
  const res = await fetch("https://www.statshub.com/api/team/17/performance");
  const data = await res.json();
  console.log(data.data.length);
}
run();
