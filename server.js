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
