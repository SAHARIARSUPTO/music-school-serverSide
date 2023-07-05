const express = require("express");
const { ObjectId } = require("mongodb");
const cors = require("cors");
require('dotenv').config();
const stripe = require('stripe')(process.env.TEST_KEY);
const jwt = require('jsonwebtoken');
const app = express();

const port = 3000;
app.use(express.json());

//middlewares
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' });
  }
  
  //bearer
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://music_school:musicschool@cluster0.nyrjtse.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Enable CORS
    app.use(cors());

    // Create a new user
    app.post("/users", async (req, res) => {
      const database = client.db("musicSchool");
      const userCollection = database.collection("users");
      const user = req.body;
      user.role = 'user'; // Set the default role as 'user'
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
//add new class
app.post("/classes", async (req, res) => {
  try {
    const database = client.db("musicSchool");
    const classesCollection = database.collection("classes");
    const newClassData = req.body; 
    
    const result = await classesCollection.insertOne(newClassData);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error inserting NewClassData:", error);
    res.status(500).json({ error: "Error inserting NewClassData" });
  }
});
    // Patch user role to admin
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const userCollection = client.db("musicSchool").collection("users");
      const result = await userCollection.updateOne(filter, updateDoc);

      // Retrieve the updated user document
      const updatedUser = await userCollection.findOne({ _id: new ObjectId(id) });

      res.json(updatedUser); // Send the updated user object to the client
    });

    // Instructors Section
    app.get("/instructors", async (req, res) => {
      try {
        const collection = client.db("musicSchool").collection("instructors");
        const data = await collection.find().toArray();
        res.json(data);
      } catch (error) {
        console.error("Error retrieving data from MongoDB:", error);
        res.status(500).send("Error retrieving data from MongoDB");
      }
    });
    app.get("/classes", async (req, res) => {
      try {
        const collection = client.db("musicSchool").collection("classes");
        const data = await collection.find().toArray();
        res.json(data);
      } catch (error) {
        console.error("Error retrieving data from MongoDB:", error);
        res.status(500).send("Error retrieving data from MongoDB");
      }
    });

app.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const collection = client.db("musicSchool").collection("users");
    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error retrieving user from MongoDB:", error);
    res.status(500).json({ error: "Error retrieving user" });
  }
});
    app.get("/instructors/:id", async (req, res) => {
      try {
        const userId = req.params.id;
        const collection = client.db("musicSchool").collection("instructors");
        const user = await collection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
      } catch (error) {
        console.error("Error retrieving user from MongoDB:", error);
        res.status(500).send("Error retrieving user from MongoDB");
      }
    });

    // Users Section
    app.get("/users", async (req, res) => {
      try {
        const collection = client.db("musicSchool").collection("users");
        const data = await collection.find().toArray();
        const usersWithRole = data.map(user => ({ ...user, role: user.role || 'user' }));
        res.json(usersWithRole);
      } catch (error) {
        console.error("Error retrieving data from MongoDB:", error);
        res.status(500).send("Error retrieving data from MongoDB");
      }
    });

app.get('/users/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const userCollection = client.db("musicSchool").collection("users");
    const query = { email: email };
    const user = await userCollection.findOne(query);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = { admin: user.role === 'admin' };
    res.status(200).json(result);
  } catch (error) {
    console.error("Error retrieving user:", error);
    res.status(500).json({ error: "Error retrieving user" });
  }
});

app.post('/create-payment-intent',async (req,res)=>{
  const {price}=req.body;
  const amount = price*100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card'],
  });
  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });
      res.send({ token });
    });

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);