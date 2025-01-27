const http = require('http');
const fs = require('fs');
const finalHandler = require('finalhandler');
const queryString = require('querystring');
const Router = require('router');
const bodyParser   = require('body-parser');
const uid = require('rand-token').uid;
const queryHandler = require('../utils/queryHandler');
const arrayEquals = require('../utils/arrayEquals');
const postErrorMessage = require('../utils/postErrorMessage');
const validApiKeys = require('../initial-data/validApiKeys');
const getValidTokenFromRequest = require('../utils/getValidTokenFromRequest');
const { PORT } = require('../utils/url');
const accessTokens = require('../utils/accessTokens');


const myRouter = Router();
myRouter.use(bodyParser.json());

let products = [];
let brands = [];
let cart = [];
let users = [];


let server = http.createServer( (req, res) => {
  if (!validApiKeys.includes(req.headers["x-authentication"])) {
    res.writeHead(401)
    res.end('Must enter a valid API key')
  }

  myRouter(req, res, finalHandler(req, res))
}).listen(PORT, error => {
  if (error) {
    return console.log("Error on Server Startup: ", error);
  }

  fs.readFile('/Users/joshuacushing/code/Parsity/evals/sunglasses-io/initial-data/products.json', "utf8", (error, data) => {
    if (error) throw error;
    products = JSON.parse(data);
    console.log(`Server setup: ${products.length} products loaded`);
  });

  fs.readFile('/Users/joshuacushing/code/Parsity/evals/sunglasses-io/initial-data/brands.json', "utf8", (error, data) => {
    if (error) throw error;
    brands = JSON.parse(data);
    console.log(`Server setup: ${brands.length} brands loaded`);
  });

  fs.readFile('/Users/joshuacushing/code/Parsity/evals/sunglasses-io/initial-data/users.json', "utf8", (error, data) => {
    if (error) throw error;
    users = JSON.parse(data)
    console.log(`Server setup: ${users.length} users loaded
    Listening on PORT ${PORT}`);
  });
});

myRouter.post('/login', (req, res) => {
  const reqUsername = req.body.username;
  const reqPassword = req.body.password

  const usernameAndPassword = users.find(user => user.login.username === reqUsername && user.login.password === reqPassword)
  
    if (!reqUsername || !reqPassword) {
      res.writeHead(401)
      res.end('Must enter a username and password')
    } else if (!usernameAndPassword) {
      res.writeHead(401)
      res.end('Invalid username or password')
    } else {
      let currentAccessToken = accessTokens.find(tokenObject => {
        return tokenObject.username == reqUsername;
      }) 
      if (currentAccessToken) {
        const newDate = new Date()
        currentAccessToken.lastUpdated = JSON.stringify(newDate)
        res.writeHead(200)
        res.end('Login Successful')
      } else {
        const newDate = new Date()
        let newAccessToken = {
          username: reqUsername,
          lastUpdated: Math.abs(newDate),
          accessToken: uid(16)
        }
        accessTokens.push(newAccessToken)
        console.log(accessTokens)
        res.writeHead(200)
        res.end('Login Successful')
      }
    }
})

myRouter.get('/sunglasses', (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(JSON.stringify(products))
})

myRouter.delete('/sunglasses', (req, res) => {
  res.writeHead(405)
  res.end('Cannot delete this resource')
})

myRouter.get('/sunglasses/brands', (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(JSON.stringify(brands))
})

myRouter.delete('/sunglasses/brands', (req, res) => {
  res.writeHead(405)
  res.end('Cannot delete this resource')
})

myRouter.get('/sunglasses/:product', (req, res) => {
  if (queryHandler(products, req)) {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(queryHandler(products, req)))
  } else {
    res.writeHead(404)
    res.end('searched product not found')
  }
})

myRouter.get('/sunglasses/brands/:brand', (req, res) => {
  if (queryHandler(brands, req)) {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(queryHandler(brands, req)))
  } else {
    res.writeHead(404)
    res.end('searched brand not found')
  }
})

myRouter.post('/cart', (req, res) => {
  
  const toPost = req.body

  const canonList = [ 'id', 'categoryId', 'name', 'description', 'price', 'imageUrls' ]
  let listToCheck = []

  
  for (let prop in toPost) {
    listToCheck.push(prop)
  }

  if (!arrayEquals(canonList, listToCheck)) {
    res.writeHead(404)
    res.end(postErrorMessage)
  } else if (!getValidTokenFromRequest(req)) {
    res.writeHead(401)
    res.end('Must be logged in to perform this action')
  } else {
    cart.push(toPost)
    res.writeHead(201)
    res.end(`${toPost.name} posted to cart.`);
  }
})

myRouter.get('/cart', (req, res) => {
  if (!getValidTokenFromRequest(req)) {
    res.writeHead(401)
    res.end('Must be logged in to perform this action')
  } else {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(cart))
  }
})

myRouter.delete('/cart', (req, res) => {
  if (!getValidTokenFromRequest(req)) {
    res.writeHead(401)
    res.end('Must be logged in to perform this action')
  } else {
    res.writeHead(405)
    res.end('Cannot delete entire cart. Can only delete individual items.')
  }
})

myRouter.delete('/cart/:id', (req, res) => {
  const reqID = req.params.id

  let isMatched = false;

  cart.map(obj => {
    if (obj.id === reqID) {
      isMatched = true;
    }
  })
  
  if (!getValidTokenFromRequest(req)) {
    res.writeHead(401)
    res.end('Must be logged in to perform this action')
  } else if (!isMatched) {
    res.writeHead(404)
    res.end('The item ID does not match any items in your cart.');
  } else {
    let indexForObjectToDelete;

    cart.map((obj, i) => {
      if (obj.id === reqID) {
        indexForObjectToDelete = i;
        cart.splice(indexForObjectToDelete, 1)
      }
    })
    res.writeHead(201)
    res.end(`Item successfully removed from the cart`)
  }
})

module.exports = server;