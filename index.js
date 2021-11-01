const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const { query } = require('express');
const port = process.env.PORT || 5000;
var admin = require('firebase-admin');

// firebase admin initialization

var serviceAccount = require('./ema-john-react-b5737-firebase-adminsdk-86xcu-957afd145a.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

// connection uri

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhwc1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    console.log('database connected successfully');
    const database = client.db('emaJohnShopping');
    const productCollection = database.collection('products');
    const ordersCollection = database.collection('orders');

    // GET PRODUCTS API
    app.get('/products', async (req, res) => {
      const cursor = productCollection.find({});
      const page = req.query.page; // page number
      const size = parseInt(req.query.size); // product count
      const count = await cursor.count();
      let products;
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }
      res.send({
        products,
        count,
      });
    });

    // use post to get data by keys

    app.post('/products/byKeys', async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });

    // GET API
    app.get('/orders', verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const query = { email: email };
        const cursor = ordersCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      } else {
        res.status(401).json({ message: 'User Not Authorized' });
      }
    });

    // POST ORDER API
    app.post('/orders', async (req, res) => {
      const orders = req.body;
      orders.createdAt = new Date();
      const result = await ordersCollection.insertOne(orders);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// deafult route

app.get('/', (req, res) => {
  res.send('ema john server running');
});

app.listen(port, () => {
  console.log('Running server ar port:', port);
});
