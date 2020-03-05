import * as express from 'express';

var app = express();

app.get("/", (req, res, next) => {
    res.send("you've hit me");
})

app.listen(8080, () => {
    console.log("Listening on 8080")
})