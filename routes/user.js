var express = require('express');
var bcrypt = require('bcryptjs');
var cloudinary = require('cloudinary');
var fs = require('fs');
var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });
var router = express.Router();

module.exports = function(models)
{
    /*
        Expected request body
        {
            "username": "string",
            "password": "string"
        }
    */
    router.route('/login')
        .post(function(req,res){
            // find username
            models.User.findOne({ where: {username: req.body.username} })
                .then(function(u){
                    if(u === null)
                    {
                        res.sendStatus(404);
                        return;
                    }
                    // test if users password hash matches
                    bcrypt.hash(req.body.password, u.salt, function(err, hash) {
                        if(err)
                        {
                            res.sendStatus(500);
                        }
                        else
                        {
                            if(u.password === hash)
                            {
                                res.json(u);
                            }   
                            else
                            {
                                res.sendStatus(404);
                            }                             
                        }
                    });
                }).catch(function(e){
                    res.sendStatus(404);
                });
        });

    router.route('/')
        .get(function(req,res){
            models.User.findAll().then(function(u) {
                res.json(u.map(function(item){
                    return {
                                id: item.id,
                                username: item.username,
                                profileImageSmall: item.profileImageSmall
                            }
                }));
            });
        })
        
        /*
        Expected request body
        {
            "username": "string",
            "password": "string"        
        }
        */
        .post(function(req,res){

            var password = req.body.password;
            // check if username exists
            models.User.findOne({ where: {username: req.body.username} })
                .then(function(u){
                    if(u === null) // continue user registration if existing user is not found
                    {                        
                        bcrypt.genSalt(2, function(err, salt) {
                            bcrypt.hash(password, salt, function(err, hash) {
                                // Store hash in your password DB. 
                                if(err)
                                {
                                    res.sendStatus(500);
                                }
                                else
                                {
                                    models.User.create({
                                        username: req.body.username,
                                        password: hash,
                                        salt: salt,
                                        profileImageSmall: ""    
                                    }).then(function(i) {
                                        res.json({
                                            id: i.dataValues.id
                                        });        
                                    });
                                }
                            });
                        });
                    }
                    else
                    {
                        res.sendStatus(409); // error if user with same username is found
                    }                    
                }).catch(function(){
                     res.sendStatus(500);
                });                       
        });

    router.route('/:userId')
        .get(function(req,res){
            models.User.findById(req.params.userId).then(function(u) {
                res.json({
                            id: u.id,
                            username: u.username,
                            profileImageSmall: u.profileImageSmall
                         });
            }); 
        });

    router.route('/:userId/photo')
        .post(upload.single('image'), function(req, res, next) {
        
            if(req.file != undefined)
            {
                cloudinary.uploader.upload(req.file.path, function(cloudinaryResult) { 
                    models.User.findById(req.params.userId).then(function(u){
                        if(u===null)
                        {
                            res.sendStatus(400);
                            return;
                        }

                        fs.unlink(req.file.path, function(err) {
                            if (err)
                            {
                                console.log("file deletion error " + err);
                            };                            
                        });

                        u.set('profileImageSmall', cloudinary.url(cloudinaryResult.public_id, { width: 50, height: 50, crop: 'fill' }));
                        u.save().then(function(u) {                                   
                            res.json(u);
                        });                    
                    });
                })                                
            }
            else
            {
                res.sendStatus(400);
            }                                
        });        

    return {
        router: router
    };
}