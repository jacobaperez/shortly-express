var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
// var bcrypt = require('bcrypt-node');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({  // restrict eveything?
  secret: 'session',
  resave: false,
  saveUninitialized: true,
  cookie: {secure: true}
}));

app.get('/', 
function(req, res) {
  if (req.session.user) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

// function restrict(req, res, next) {
//   if (req.session.user) {
//     next();
//   } else {
//     req.session.error = 'Access denied!';
//     res.redirect('/login');
//   }
// }
 
// app.get('/', function(request, response) {
//    response.send('This is the homepage');
// });
 
app.get('/login', function(req, res) {
  res.render('login');
});
 
app.post('/login', function(req, res) {
 
  var username = req.body.username;
  var password = req.body.password;
  
  db.each('select * from users', function(err, row) {
    if (err) {
      console.log('Error === ', err);
    } else {
      console.log('Should show user/pw === ', row);
    }
  })

  // users.fetch
  if(username == 'demo' && password == 'demo'){
    req.session.regenerate(function(){
    req.session.user = username;
    res.redirect('/restricted');
    });
  }
  else {
    res.redirect('login');
  }    
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var userInput = req.body.username;
  var pwInput = req.body.password;

  new User({username: userInput, password: pwInput}).fetch()
    .then(function(found) {
    if (found) {
      res.redirect('login');
    } else {
      Users.create({
        username: userInput,
        password: pwInput,
      })
      .then(function(newUser) {
        req.session.regenerate(function() {
          req.session.user = newUser.attributes.username;
          res.writeHead(302, {Location: '/'});
          res.end();
        })
        // res.status(200).send(newUser);
      });
    }
  });
});

// app.get('/logout', function(req, res) {
//   res.redirect('login');
// });
 
app.get('/logout', function(req, res){
  req.session.destroy(function(){
      res.redirect('/');
  });
});
 
// app.get('/restricted', restrict, function(req, res){
//   res.send('This is the restricted area! Hello ' + request.session.user + '! click <a href="/logout">here to logout</a>');
// });


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
