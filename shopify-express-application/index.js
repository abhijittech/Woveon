const dotenv = require('dotenv').config();
const express = require('express');

const bodyParser = require('body-parser');

const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products';
const forwardingAddress = "https://38fd04bd.ngrok.io"; // Replace this with your HTTPS Forwarding address



//install route
app.get('/shopify', (req, res) => {
  const shop = req.query.shop;
  console.log('shop parameter ='+ shop);
  if (shop) {
    const state = nonce();
    const redirectUri = forwardingAddress + '/shopify/callback';
	console.log('redirect url='+redirectUri);
    const installUrl = 'https://' + shop +
      '/admin/oauth/authorize?client_id=' + apiKey +
      '&scope=' + scopes +
      '&state=' + state +
      '&redirect_uri=' + redirectUri;

    res.cookie('state', state);
    res.redirect(installUrl);
  } else {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }
});

// Callback Route
app.get('/shopify/callback', (req, res) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }

  if (shop && hmac && code) {
    const map = Object.assign({}, req.query);
	delete map['signature'];
	delete map['hmac'];
	const message = querystring.stringify(map);
	const providedHmac = Buffer.from(hmac, 'utf-8');
	const generatedHash = Buffer.from(
	  crypto
		.createHmac('sha256', apiSecret)
		.update(message)
		.digest('hex'),
		'utf-8'
	  );
	let hashEquals = false;
	// timingSafeEqual will prevent any timing attacks. Arguments must be buffers
	try {
	  hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
	// timingSafeEqual will return an error if the input buffers are not the same length.
	} catch (e) {
	  hashEquals = false;
	};

	if (!hashEquals) {
	  return res.status(400).send('HMAC validation failed');
	}

	const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
	const accessTokenPayload = {
	  client_id: apiKey,
	  client_secret: apiSecret,
	  code,
	};

	request.post(accessTokenRequestUrl, { json: accessTokenPayload })
	.then((accessTokenResponse) => {
	  const accessToken = accessTokenResponse.access_token;

	  //const shopRequestUrl = 'https://' + shop + '/admin/shop.json';
	  const shopRequestUrl = 'https://' + shop + '/admin/orders/count.json';
	  
	  
		const shopRequestHeaders = {
		  'X-Shopify-Access-Token': accessToken,
		};

		request.get(shopRequestUrl, { headers: shopRequestHeaders })
		.then((shopResponse) => {
		  res.end(shopResponse);
		})
		.catch((error) => {
		  res.status(error.statusCode).send(error.error.error_description);
		});
	  // TODO
	  // Use access token to make API call to 'shop' endpoint
	})
	.catch((error) => {
	  res.status(error.statusCode).send(error.error.error_description);
	});

    // TODO
    // Validate request is from Shopify
    // Exchange temporary code for a permanent access token
      // Use access token to make API call to 'shop' endpoint
  } else {
    res.status(400).send('Required parameters missing');
  }
});
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

app.post('/new_online_order', (req, res) => {
  // let Shopify know we received the order details ok
  res.send('OK');

  // the body of the data received
  const theData = req.body;
  console.log(theData);
  var fs = require("fs");
  var millisecond = new Date().getTime();
  // var filename = 'shopify_order_'+ millisecond+'.json';
  var filename = 'shopify_order.json';
  fs.writeFile( filename,  JSON.stringify(theData), "utf8" );
});

/* 
Expose a route for React/ui to echo this order
*/
app.get('/getLatestShopifyOrder', (req, res) => {
  
  var fs = require('fs')
  const orderData = fs.readFile('shopify_order.json', 'utf8', function (err,data) {
	  if (err) {
		return console.log(err);
	  }
	  res.send(data);
  });
  
  
});
app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});