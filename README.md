# Node JS Cluster with PM2, RabbitMQ, Redis and Nginx

## Introduction

```sh
pnpm i
pnpm dev
```

```js
const express = require("express");
const fabObj = require("./math-logic/fibonacci-series");

const app = express();

// http://localhost:3000?number=10
app.get("/", (request, response) => {
  const num = +request.query.number;
  if (isNaN(num) || num < 0) {
    return response.send("<h1>Please provide a valid non-negative number</h1>");
  }

  const res = fabObj.calculateFibonacciValue(num);
  response.send(`<h1>${res}</h1>`);
});

app.listen(3000, () => {
  console.log("Express App is running on PORT 3000");
});
```

## First cluster app

### NodeJS cluster module

- Single NodeJS instance in a single thread
- Cluster module allows multi-core system
- Child processes on same port

#### Working of cluster

- Worker processes are spawn with fork()
- Child process can communicate with parent via IPC
- Load balancing

#### Cluster mode methods

- Round Robin
  - Default on Unix
  - Master process is listening on a port and it will distribute the load on workers
- Second method
  - Master process creates the socket to the children
  - Workers accept load directly

#### Cluster methods, properties and events

- Several events
- Disconnect, fork
- IsMaster, IsWorker

#### Worker class methods, properties and events

- Events
- Diconnect, IsConnected, IsDead, Kill, Send
- Id, Process

#### CPU count

```js
// cores array
os.cpus();
// logical cpus
os.cpus().length;
```

### Creating first cluster app

```js
const express = require("express");
const cluster = require("cluster");
const fabObj = require("./math-logic/fibonacci-series");
const { cpus } = require("os");

const totalCPUs = cpus().length;

if (cluster.isMaster) {
  console.log(`Total Number of CPU Counts is ${totalCPUs}`);

  for (let i = 0; i < totalCPUs; i++) {
    cluster.fork();
  }

  cluster.on("online", worker => {
    console.log(`Worker Id is ${worker.id} and PID is ${worker.process.pid}`);
  });

  cluster.on("exit", worker => {
    console.log(
      `Worker Id ${worker.id} and PID is ${worker.process.pid} is offline`
    );
    console.log("Let's fork new worker!");
    cluster.fork();
  });
} else {
  const app = express();
  app.get("/", (request, response) => {
    console.log(
      `Worker Process Id - ${cluster.worker.process.pid} has accepted the request!`
    );

    const number = fabObj.calculateFibonacciValue(+request.query.number);
    response.send(`<h1>${number}</h1>`);
  });

  app.listen(3000, () => console.log("Express App is running on PORT : 3000"));
}
```

### Load testing with loadtest

```sh
pnpm add -g loadtest
```

- n: max number of requests
- c: max concurrent requests
- rps: requests per second

```sh
loadtest -n 1000 -c 100 --rps 200 'http://localhost:3000?number=10'
```

### Load testing with artillery

```sh
pnpm add -g artillery
```

- quick: ad hoc testing
- coust: creates virtual users
- n: number of requests per user

```sh
artillery quick --count 10 -b 20 'http://localhost:3000?number=10'
```
