const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require("mongodb");
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


async function run(){
    
    
    
    try{

        await client.connect();
        const partsCollection = client.db("ahmed_parts").collection("parts");
        const reviewsCollection = client
            .db("ahmed_parts")
            .collection("reviews");

        //all parts
        app.get('/parts', async (req, res) => {
            const parts = await partsCollection.find().toArray()
            res.send(parts)
        })


        //all reviews
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find().toArray()
            res.send(reviews)
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