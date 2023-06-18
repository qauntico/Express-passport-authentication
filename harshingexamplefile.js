require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
const bcrypt = require('bcrypt');
const saltRounds = 15;


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
async function main(){
    await mongoose.connect("mongodb://127.0.0.1:27017/userDB",{ useNewUrlParser:true});
    const userSchema = mongoose.Schema({
        email: String,
        password: String
    });
    //const secret = "liveisn'talwaysthewaywewantsowejusthavetokeepup."
    //userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
    const User = new mongoose.model("User", userSchema);
    app.get("/", (req,res) => {
        res.render("home");
    });
    app.get("/login", (req,res) => {
        res.render("login");
    });
    app.get("/register", (req,res) => {
        res.render("register")
    });
    app.post("/register",async (req,res) => {
        bcrypt.hash(req.body.password, saltRounds,async function(err, hash) {
            // Store hash in your password DB.
            const newUser = new User({
                email: req.body.username,
                password: hash
            });
            await newUser.save().then(res.render("secrets")).catch(err => {
                console.log(err);
            });
        });  
    });
    app.post("/login", async (req,res) => {
        const username = req.body.username;
        const password = req.body.password
        try {
            await User.findOne({email: username}).exec().then(result => {
                bcrypt.compare(password, result.password, function(err, result) {
                    // result == true
                    if (result === true){
                        res.render("secrets")
                    }
                });
            }); 
        }catch(err){
            res.send("thank you ")
        }
        
    });
    

}
main().catch(console.dir)
app.listen(3000, function() {
    console.log("Server started on port 3000");
  });

  ///////////////////////
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
//we won't be requiring password local because it is one of those dependeces that passport-local-mongoose depends on 
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
async function main(){
    //this is creating our session that using the express-session package and express. You can check the docs to see the uses of those configured settings below and how to modify them to fit your usecase
    app.use(session({
        secret: "our little secret.",
        resave: false,
        saveUninitialized: false
    }));
    //here we are initializing passport before start using it for authentication
    app.use(passport.initialize());
    //here we are telling our app to use passport authentication to also set up our session.
    app.use(passport.session());
    await mongoose.connect("mongodb://127.0.0.1:27017/userDB",{ useNewUrlParser:true});
    const userSchema = mongoose.Schema({
        email: String,
        password: String
    });
    //this is what we will use to harsh and sought or passwords and save them to the database
    userSchema.plugin(passportLocalMongoose);
    
    
    const User = new mongoose.model("User", userSchema);
    //we use passport-local-mongoose to create a passport local login strategy
    passport.use(User.createStrategy());
    //setting up passport to serialize and serialized our user 
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
    app.get("/", (req,res) => {
        res.render("home");
    });
    app.get("/login", (req,res) => {
        res.render("login");
    });
    app.get("/register", (req,res) => {
        res.render("register");
    });
    app.get("/secrets", function(req,res){
        //we are first going to check if the user was authenticated 
        if (req.isAuthenticated()){
            res.render("secrets");
        }else{
            res.redirect("/login");
        }
        
    });
    app.post("/logout", function(req,res,next){
        req.logout(function(err) {
            if (err) { return next(err); }
            res.redirect('/');
          });
    });
    app.post("/register",async (req,res) => {
        User.register({username: req.body.username}, req.body.password, function(err, user){
            if (err){
                console.log(err);
                res.redirect("/register");
            }else{
                //the callback function there is only triggered if the user current session was successfully save or a cookies was created to save their current login session
                passport.authenticate("local")(req,res, function(){
                    res.redirect('/secrets');
                })
            }
        })
       
    });
    app.post("/login", async (req,res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        })
        req.login(user, function(err){
            if (err){
                console.log(err);
            }else{
                passport.authenticate("local")(req,res, function(){
                    res.redirect('/secrets');
                });
            }
        });
    });
    

}
main().catch(console.dir)
app.listen(3000, function() {
    console.log("Server started on port 3000");
  });