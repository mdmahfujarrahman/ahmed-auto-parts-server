const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

 const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS_SECRET}@cluster0.2nhyc.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverApi: ServerApiVersion.v1,
    });

//Verify token

function verifyToken(req, res, next) {
    const authHeaders = req.headers.authorization;
    if (!authHeaders) {
        return res.status(401).send({ message: "unAuthorized access" });
    }
    const token = authHeaders.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {

        if(err){
            return res.status(403).send({ message: "Forbidden Access"})
        }
        res.decoded = decoded
        next()
    });
    
    
}   



async function run(){
    
    
    
    try{

        await client.connect();
        const partsCollection = client.db("ahmed_parts").collection("parts");
        const userCollection = client.db("ahmed_parts").collection("users");
        const orderCollection = client.db("ahmed_parts").collection("orders");
        const reviewsCollection = client
            .db("ahmed_parts")
            .collection("reviews");

        //all user
        app.get("/users", async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })
        //find single user
        app.get("/user", verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const users = await userCollection.find(query).toArray();
            res.send(users);
        });

        // users added
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const results = await userCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            const token = jwt.sign(
                { email: email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "1d" }
            );

            res.send({ results, token });
        });

        //user details update
        app.put("/user/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const updateProfile = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    photoURL: updateProfile.photoURL,
                    email: updateProfile.email,
                    displayName: updateProfile.displayName,
                    phone: updateProfile.phone,
                    education: updateProfile.education,
                    address: updateProfile.address,
                },
            };
            const results = await userCollection.updateOne(
                filter,
                updateDoc,
                options
            );
            res.send(results);
        });



        //all parts
        app.get('/parts', async (req, res) => {
            const parts = await partsCollection.find().toArray()
            res.send(parts)
        })

        //single parts
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const parts = await partsCollection.findOne(query);
            res.send(parts)
        })

       //parts details update
       app.put('/parts/:id', verifyToken, async (req, res) => {
           const id = req.params.id;
           const updateDetails =req.body
           const filter = { _id: ObjectId(id) };
           const updateDoc = {
               $set: {
                   quantity: updateDetails.quantity,
               },
           };
           const results = await partsCollection.updateOne(filter, updateDoc);
           res.send(results)
       })


        //Orders
        app.post('/order',  async (req, res) => {
            const orders = req.body;
            const query = {partsName: orders.partsName, user: orders.user};
            const exists = await orderCollection.findOne(query);
            if(exists) {
                return res.send({success: false, order: exists})
            }
            const results = await orderCollection.insertOne(orders)
            res.send({success: true, results})
        })

        //find order with email address
        app.get('/order',verifyToken, async (req, res) => {
            const user = req.query.user;
            const query = { user: user };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        })




        //all reviews
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find().toArray()
            res.send(reviews)
        })
        //add review
        app.post('/review', async (req, res) => {
            const review = req.body
            const query = { email: review.email};
            const exists = await reviewsCollection.findOne(query)
            if(exists) {
                return res.send({ success: false, review: exists });
            }
            const results = await reviewsCollection.insertOne(review)
            res.send({ success: true, results });
        })
        

    }
    finally{

    }

}


run().catch(console.dir)


//Default router
app.get('/', (req, res) => {
    res.send('Welcome to Ahmed Auto parts Server')
})



app.listen(port, () =>{
    console.log("ahmed auto parts server is running on ", port);
});