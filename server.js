const express = require("express");
const os = require("os");
const cluster = require("cluster");
const fs = require("fs");

const app = express();
app.use(express.json());

const sleep = ms => {
  const start = Date.now();
  while (new Date() - start < ms) {}
  //return new Promise(resolve => setTimeout(() => resolve(ms), ms));
};

app.get("/", (req, res) => {
  const { pid } = process;
  res.status(200).json({ message: "Hello World", pid });
});

app.get("/timer", async (req, res) => {
  const { pid } = process;

  const delay = await sleep(10000);

  res.status(200).json({ message: "Timer end", delay, pid });
});

if (cluster.isMaster) {
  console.log("Master process started:", process.pid);
  const cores = os.cpus().length;
  for (let i = 0; i < cores; i++) {
    cluster.fork();
  }

  setInterval(() => {
    fs.appendFileSync(
      "log.txt",
      "Hello World from: " +
        process.pid +
        " at " +
        new Date().toLocaleTimeString() +
        "\n"
    );
  }, 1000);
} else {
  app.listen(3000, () => {
    console.log("Server is running on port 3000", process.pid);
  });
}
