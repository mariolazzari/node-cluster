const fabObj = require("../math-logic/fibonacci-series");

process.on("message", number => {
  const fabNum = fabObj.calculateFibonacciValue(number);
  console.log(`Fibonacci-series - 1 PID is ${process.pid}`);
  process.send(fabNum);
});

