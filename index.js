const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config()
const MongoClient = require('mongodb').MongoClient;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pk8dw.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


const port = 5002
const app = express()

app.use(cors());
app.use(bodyParser.json());



client.connect(err => {
  const ordersCollection = client.db("HomeService").collection("orders");

  app.post("/addOrder", (req, res) => {
    const order = req.body;
    ordersCollection.insertOne(order)
    .then(result => {
        res.send(result.insertedCount > 0);
    })
})

app.get("/orderList", (req, res) => {
  ordersCollection.find({})
  .toArray((err, documents) => {
    res.send(documents)
  })
})

  
  
});


app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port);