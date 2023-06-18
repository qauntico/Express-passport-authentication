require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");

//we won't be requiring password local because it is one of those dependeces that passport-local-mongoose depends on 
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

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
        username: String,
        googleId: String,
        secret: String
        //password: String
    });
    //this is what we will use to harsh and sought or passwords and save them to the database
    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);
    
    const User = new mongoose.model("User", userSchema);
    //we use passport-local-mongoose to create a passport local login strategy
    passport.use(User.createStrategy());
    //setting up passport to serialize and serialized our user 
    passport.serializeUser(function(user, cb) {
        process.nextTick(function() {
          return cb(null, {
            id: user.id,
            username: user.username,
            picture: user.picture
          });
        });
      });
      
      passport.deserializeUser(function(user, cb) {
        process.nextTick(function() {
          return cb(null, user);
        });
      });

    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
      },
      function(accessToken, refreshToken, profile, cb) {
        //console.log(profile)
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
          return cb(err, user);
        });
      }
    ));

    app.get("/", (req,res) => {
        res.render("home");
    });
    app.get('/auth/google',
    //here we are telling passport to authenticate our user using the google strategy
        passport.authenticate('google', { scope: ['profile'] })
    );
    app.get('/auth/google/secrets', 
    //this is where the user will be authenticated locally and their session saved
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect('/secrets');
    });
    app.get("/login", (req,res) => {
        res.render("login");
    });
    app.get("/register", (req,res) => {
        res.render("register");
    });
    app.get("/secrets",async function(req,res){
        await User.find({"secret" : {$ne: null}}).then(result => {
            res.render("secrets", {usersWithSecrets: result});
        }).catch(err => {
            console.log(err);
        });
        
    });
    app.get("/submit", (req,res) => {
        if (req.isAuthenticated()){
            res.render("submit");
        }else{
            res.redirect("/login");
        }
    });
    app.post("/submit",async (req,res) => {
        const secret = req.body.secret;
        await User.findById(req.user.id).exec().then(async (result) => {
            result.secret = secret;
            await result.save();
            res.redirect("/secrets");
        }).catch(err => {
            console.log(err)
        });
    })
    app.post("/logout", function(req,res,next){
        req.logout(function(err) {
            if (err) { return next(err); }
            res.redirect('/');
          });
    });
    app.post("/register",async (req,res) => {
        User.register({username: req.body.username, email: req.body.email}, req.body.password, function(err, user){
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