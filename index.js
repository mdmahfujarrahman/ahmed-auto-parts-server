const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


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
        const paymentCollection = client.db("ahmed_parts").collection("payments")

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({
                email: requester,
            });
            if (requesterAccount.role == "admin") {
                next();
            } else {
                res.status(403).send({ message: "forbidden" });
            }
        };



        app.post("/create-payment-intent", verifyToken, async (req, res) => {
            const parts = req.body;
            const price = parts.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });


        //all user
        app.get("/users",verifyToken, async (req, res) => {
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

        app.put('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const updateDoc = { 
                $set: { 
                    role: 'admin'
                }
            }
            const results = await userCollection.updateOne(query, updateDoc);
            res.send(results);
        })
        //admin checking
        app.get('/admin/:email', async (req, res)=>{
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});
        })

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

        //user delete
        app.delete('/user/:email',verifyToken, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === "admin";
            if (isAdmin){

               return res.status(403).send({ message: "forbidden" }); 

            } else{
                const filter = { email : email};
                const results = await userCollection.deleteOne(filter);
                res.send(results);
            }   
        })


        //add parts by admin
        app.post("/parts",verifyToken, async (req, res) => {
            const parts = req.body;
            const query = { name: parts.name };
            const exists = await partsCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, parts: exists });
            }
            const results = await partsCollection.insertOne(parts);
            res.send({ success: true, results });
        });

        //all parts
        app.get("/parts", async (req, res) => {
            const parts = await partsCollection.find().toArray();
            res.send(parts);
        });

        //single parts
        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id
            const query = {_id: ObjectId(id)};
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
                   name: updateDetails.name,
                   img: updateDetails.img,
                   description: updateDetails.description,
                   quantity: updateDetails.quantity,
                   price: updateDetails.price,
               },
           };
           const results = await partsCollection.updateOne(filter, updateDoc);
           res.send(results)
       })
       //parts delete
       app.delete("/parts/:id", verifyToken, async (req, res) => {
           const id = req.params.id;
           const filter = { _id: ObjectId(id) };
           const results = await partsCollection.deleteOne(filter);
           res.send(results);
       });




        //Orders
        app.post('/order',verifyToken,  async (req, res) => {
            const orders = req.body;
            const query = {partsName: orders.partsName, user: orders.user};
            const exists = await orderCollection.findOne(query);
            if(exists) {
                return res.send({success: false, order: exists})
            }
            const results = await orderCollection.insertOne(orders)
            res.send({success: true, results})
        })
        
        app.get('/orders',verifyToken, async (req, res) => {
            const order = await orderCollection.find().toArray()
            res.send(order)
        })
        //find order with email address
        app.get('/order',verifyToken, async (req, res) => {
            const user = req.query.user;
            const query = { user: user };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        })
        //single order get
        app.get('/order/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const filter = {_id: ObjectId(id)}
            const results = await orderCollection.findOne(filter)
            res.send(results);
        })

        app.put("/order/:id", verifyToken, async (req, res) => {
            const id = req.params.id
            const payment = req.body
            const filter = {id: ObjectId(id)}
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const results = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(
                filter,
                updateDoc
            );
            res.send(updatedOrder)
        });


        app.put("/parts/:id", verifyToken, async (req, res) => {
            const id = req.params.id;
            const updateDetails = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    name: updateDetails.name,
                    img: updateDetails.img,
                    description: updateDetails.description,
                    quantity: updateDetails.quantity,
                    price: updateDetails.price,
                },
            };
            const results = await partsCollection.updateOne(filter, updateDoc);
            res.send(results);
        });


        //order delete
        app.delete('/order/:id',verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const results = await orderCollection.deleteOne(filter);
            res.send(results);
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
        

    } catch(error){
        console.log(error)
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