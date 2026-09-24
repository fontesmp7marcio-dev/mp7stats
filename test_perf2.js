async function run() {
  const t0 = Date.now();
  const promises = [];
  for (let i=0; i<10; i++) {
    promises.push(fetch("https://www.statshub.com/api/team/17/performance").then(r => r.json()));
  }
  await Promise.all(promises);
  console.log("Time for 10 requests:", Date.now() - t0, "ms");
}
run();
