require('dotenv').config();
const { createHash } = require('crypto');
const passport = require('passport');
const session = require('express-session')
const LocalStrategy = require('passport-local').Strategy
const path = require('path');
const express = require('express');

let app;

function _authenticated(req, res, next){
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/adm/login');
}

function initPassPort(){
    console.log('init passport');
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true
    }));

    app.use(passport.initialize());

    app.use(passport.session());

    passport.use('local-user', new LocalStrategy({
        usernameField : 'user_username',
        passwordField : 'user_password'
    }, (username, password, done) => {
        console.log('login attempt', username, passport);
        if (username === process.env.ADMIN_LOGIN && createHash(password) === process.env.ADMIN_PWD){
            let u = { authed : true };
            return done(null, u);
        }
        return done("Touche pas au grisbi salope !", false);
    }));

    passport.serializeUser( (userObj, done) => { done(null, userObj )});
    passport.deserializeUser((userObj, done) => { done (null, userObj )});


}

function registerAdminRoutes(){
    console.log('Register admin routes');
    app.post ("/adm/login", passport.authenticate('local-user', {
        successRedirect: "/adm/dashboard",
        failureRedirect: "/adm/login",
    }));

    app.get('/adm/login',  (req, res) => {
        const hasError = req.query.failed && req.query.failed == 1;
        let lastUnsername = req.query.user ? req.query.user : '';
        
        res.render('login', { 
            error        : hasError,
            loginField   : 'user_username',
            passField    : 'user_password',
            lastUnsername: lastUnsername
        });
    });

    app.get('/adm/dashboard', _authenticated, (req, res) => {
        
    });

}

function registerAdmin(expressApp){
    app = expressApp;

    app.set('views', [path.resolve("./assets/views"), path.resolve("./apps")]);
    app.set('view engine', 'pug');
    app.use(express.static(path.resolve('./assets/css')));

   initPassPort();
   registerAdminRoutes();

}

module.exports = { registerAdmin };