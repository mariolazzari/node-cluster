const express = require("express");
const cluster = require("cluster");
const os = require("os");
const fs = require("fs");

// system info
const { pid } = process;
const cores = os.cpus().length;

// express settings
const app = express();
app.use(express.json());

// sleep function
const sleep = ms => {
  const start = Date.now();
  while (new Date() - start < ms) {}
  //return new Promise(resolve => setTimeout(() => resolve(ms), ms));
  const end = Date.now();

  return (end - start) / 1000;
};

// main route
app.get("/", (req, res) => {
  const { isMaster } = cluster;
  res.status(200).json({ pid, isMaster });
});

// timer route
app.get("/timer", async (req, res) => {
  const delay = sleep(10000);
  res.status(200).json({ message: "Timer end", delay, pid });
});

// fork workers
if (cluster.isMaster) {
  console.log("Primary s running", pid);

  for (let i = 0; i < cores; i++) {
    cluster.fork();
  }

  // jobs
  const message = `Hello World from ${pid} at ${new Date().toLocaleTimeString()}\n`;
  setInterval(() => {
    fs.appendFileSync("log.txt", message);
  }, 1000);
} else {
  app.listen(4000, () => {
    console.log("Server is running on port 3000", pid);
  });
}
