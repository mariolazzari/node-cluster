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

## PM2

### Introducing PM2

### Running app with PM2

- Process manager for NodeJS apps.
- Built-in load balancer
- Keep alive forever
- Reload on crash
- Monitoring

```sh
pnpm add -g pm2
pm2 [start|restart|stop|delete] ecosystem.config.js
# monitor process
pm2 monit
# list apps
pm2 list
```

### PM2 example

```sh
# generate ecosystem file
pm2 ecosystem
```

```js
module.exports = {
  apps: [
    {
      name: "Express App",
      script: "server.js",
      instances: "MAX",
      autorestart: true,
      watch: true,
      max_memory_restart: "1G",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

## Master and child process communication

### Introduction to child_process module

- Spawn child process
- fork()

```js
const { fork } = require("child_process");

const worker1 = fork("./workers/fab-series-worker1");
const worker2 = fork("./workers/fab-series-worker2");
```

#### fork() method

- Returns ChildProcess object which implements IPC between parent and child
- Implements EventEmitter which allow parent to register event listener functions
- When event occurs on child process, event listener is fired on parent process
- Spawing to many child process is bad practice
- Each process has its own memory space

### IPC example

```js
const express = require("express");
const cluster = require("cluster");
const { cpus } = require("os");
const { fork } = require("child_process");

const totalCPUs = cpus().length;

if (cluster.isMaster) {
  console.log(`Master Process Id is - ${process.pid}`);

  const worker1 = fork("./workers/fab-series-worker1");
  const worker2 = fork("./workers/fab-series-worker2");

  console.log(`Child Process ID is ${worker1.pid}`);
  console.log(`Child Process ID is ${worker2.pid}`);

  worker1.on("message", function (number) {
    // Receive results from child process - 1
    console.log(`Fab Number from Child Process - 1 is ${number}`);
  });
  worker2.on("message", function (number) {
    // Receive results from child process - 2
    console.log(`Fab Number from Child Process - 2 is ${number}`);
  });
  cluster.on("online", worker => {
    console.log(`Message received from - ${worker.process.pid}`);
    worker.on("message", num => {
      if (num % 2 === 0) {
        worker1.send(num);
      } else {
        worker2.send(num);
      }
    });
  });
  for (let i = 0; i < totalCPUs - 2; i++) {
    let worker = cluster.fork();
    console.log(`Worker started on PID - ${worker.process.pid}`);
  }
  console.log(`Total Number of CPU Count is ${totalCPUs}`);
} else {
  const app = express();
  //http://localhost:3000?number=20
  app.get("/", (request, response) => {
    process.send(request.query.number);
    console.log(`Process Id ${process.pid} received the request!`);
    response.send(
      "<h3>The request has been received successfully! We will send an email once your calculation is ready!</h3>"
    );
    response.end();
  });

  app.listen(3000, () => console.log("Express App is running on PORT : 3000"));
}
```

### PM2 and RabbitMQ

#### What is RabbiMQ

- Open source message broker
- 2 roles
  - Producer
  - Consumer
- Distribute messages between multiple consumer
- Load balance between workers

#### RabbitMQ core

- Producer: sends messages
- Consumer: receives messages
- Queue: stores messages
- Message: content sent by producer to consumer
- Channel: connects producer and consumer
- AMQP: Advanced Message Queue Protocol

#### Amqplib package

```sh
pnpm add amqplib
```

```js
const rq = require("amqplib/callback_api");

const fabObj = require("../math-logic/fibonacci-series");

function sendValueInFabQueue1(num) {
  rq.connect("amqp://localhost", (err, connection) => {
    if (err) process.exit();
    const queueName = "FabSeries1";
    connection.createChannel((error, channel) => {
      if (error) {
        console.log(error);
        process.exit();
      } else {
        let fabNum = fabObj.calculateFibonacciValue(num);
        channel.assertQueue(queueName, { durable: false });
        channel.sendToQueue(queueName, Buffer.from(fabNum.toString()));
        console.log(`Queue Name is - ${queueName}`);
      }
    });
  });
}

module.exports = sendValueInFabQueue1;
```

#### List queues

[RabbitMQ queues](http://localhost:15672/#/queues)

```sh
rabbimqctl list_queues
```

### RabbitMQ example

```js
const rq = require("amqplib/callback_api");

const fabObj = require("../math-logic/fibonacci-series");

function sendValueInFabQueue1(num) {
  rq.connect("amqp://localhost", (err, connection) => {
    if (err) process.exit();
    const queueName = "FabSeries1";
    connection.createChannel((error, channel) => {
      if (error) {
        console.log(error);
        process.exit();
      } else {
        let fabNum = fabObj.calculateFibonacciValue(num);
        channel.assertQueue(queueName, { durable: false });
        channel.sendToQueue(queueName, Buffer.from(fabNum.toString()));
        console.log(`Queue Name is - ${queueName}`);
      }
    });
  });
}

module.exports = sendValueInFabQueue1;
```

### RabbitMQ web interrfac

[RabbitMQ web inteface](http://localhost:15672)
