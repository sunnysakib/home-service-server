const express = require("express");
const jwt = require('jsonwebtoken');
const cors = require("cors");
require("dotenv").config();
// const client = require('./utilites/client')
// const { ObjectId } = require("mongodb");
const verifyJWT = require("./utilites/verifyJWT");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const serviceRoute = require('./routes/v1/service.route')

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.l0zzvp8.mongodb.net/?retryWrites=true&w=majority`;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
  });

// module.exports = client;


async function run(){
  try{
      await client.connect();
      const serviceCollection = client.db('homeService').collection('services');
      const bookingCollection = client.db('homeService').collection('bookings');
      const userCollection = client.db('homeService').collection('users');
      const technicianCollection = client.db('homeService').collection('technicians');
      
      // app.use('/service', serviceRoute)
      app.get('/service', async (req, res) =>{
        const query = {};
        const cursor = serviceCollection.find(query).project({ name: 1 });
        const services = await cursor.toArray();
        res.send(services);
      })

      app.get('/user', verifyJWT, async (req, res) => {
        const users = await userCollection.find().toArray();
        res.send(users);
      });


      app.get('/admin/:email', async(req, res) =>{
        const email = req.params.email;
        const user = await userCollection.findOne({email: email});
        const isAdmin = user.role === 'admin';
        res.send({admin: isAdmin})
      })
  

      app.put('/user/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
          const filter = { email: email };
          const updateDoc = {
            $set: { role: 'admin' },
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);
        }
        else{
          res.status(403).send({message: 'forbidden'});
        }
  
      })

      app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET , { expiresIn: '1h' })
        res.send({ result, token});
      })

      app.get('/available', async(req, res) =>{
        const date = req.query.date;
  
        const services = await serviceCollection.find().toArray();

        const query = {date: date};
        const bookings = await bookingCollection.find(query).toArray();
  
        services.forEach(service=>{
          const serviceBookings = bookings.filter(book => book.serviceBooking === service.name);
          const bookedSlots = serviceBookings.map(book => book.slot);
          const available = service.slots.filter(slot => !bookedSlots.includes(slot));
          service.slots = available;
        });
        res.send(services);
      }) 
      
      
      // SERVICE BOOKING DATA GET/POST
      app.get('/booking',verifyJWT, async(req, res) =>{
        const customerEmail = req.query.customerEmail;
        const decodedEmail = req.decoded.email;
        if (customerEmail === decodedEmail) {
          const query = { customerEmail: customerEmail };
          const bookings = await bookingCollection.find(query).toArray();
          return res.send(bookings);
        }
        else {
          return res.status(403).send({ message: 'forbidden access' });
        }
      })
  
      app.post('/booking', async (req, res) => {
        const booking = req.body;
        const query = { serviceBooking: booking.serviceBooking, date: booking.date, customerEmail: booking.customerEmail }
        const exists = await bookingCollection.findOne(query);
        if (exists) {
          return res.send({ success: false, booking: exists })
        }
        const result = await bookingCollection.insertOne(booking);
        return res.send({ success: true, result });
      })


      app.get('/booking/:id', verifyJWT, async(req, res) =>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const booking = await bookingCollection.findOne(query);
        res.send(booking);
      })
      //--------x-------//



      app.get('/technician',verifyJWT, async(req, res) =>{
        const technician = await technicianCollection.find().toArray();
        res.send(technician);
      })
  
      app.post('/technician', verifyJWT, async (req, res) => {
        const technician = req.body;
        const result = await technicianCollection.insertOne(technician);
        res.send(result);
      });

      app.delete('/technician/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
        const filter = {email: email};
        const result = await technicianCollection.deleteOne(filter);
        res.send(result);
      })

  } finally{

  }
}
run().catch(console.dir)

app.get("/", (req, res) => {
  res.send("Hello!!");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});


