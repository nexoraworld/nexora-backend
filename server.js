const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

/* ========================
   MongoDB
======================== */
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB connected"))
.catch(err=>console.log(err));

/* ========================
   USER MODEL
======================== */
const userSchema = new mongoose.Schema({
  username:String,
  password:String
});
const User = mongoose.model("User", userSchema);

/* ========================
   PRODUCT MODEL (GELİŞTİRİLDİ)
======================== */
const productSchema = new mongoose.Schema({
  name:String,
  price:Number,
  owner:String
});
const Product = mongoose.model("Product", productSchema);

/* ========================
   JWT MIDDLEWARE
======================== */
function auth(req,res,next){
  const header=req.headers.authorization;
  if(!header) return res.status(401).json({message:"No token"});
  try{
    const token=header.split(" ")[1];
    const decoded=jwt.verify(token,"SECRET");
    req.user=decoded;
    next();
  }catch{
    res.status(401).json({message:"Invalid token"});
  }
}

/* ========================
   AUTH
======================== */
app.post("/auth/register", async(req,res)=>{
  const {username,password}=req.body;
  const user=new User({username,password});
  await user.save();
  res.json({message:"Registered"});
});

app.post("/auth/login", async(req,res)=>{
  const {username,password}=req.body;
  const user=await User.findOne({username,password});
  if(!user) return res.json({message:"Wrong credentials"});

  const token=jwt.sign({username:user.username},"SECRET");
  res.json({token});
});

/* ========================
   PRODUCTS
======================== */

// GET
app.get("/products", async(req,res)=>{
  const products=await Product.find();
  res.json(products);
});

// POST
app.post("/products", auth, async(req,res)=>{
  const product=new Product({
    name:req.body.name,
    price:req.body.price,
    owner:req.user.username
  });
  await product.save();
  res.json(product);
});

// DELETE
app.delete("/products/:id", auth, async(req,res)=>{
  const product=await Product.findById(req.params.id);
  if(product.owner!==req.user.username){
    return res.status(403).json({message:"Not yours"});
  }
  await Product.findByIdAndDelete(req.params.id);
  res.json({message:"Deleted"});
});

const PORT=process.env.PORT||5000;
app.listen(PORT, ()=>console.log("Server running"));
