var config = {
		hostname: 'twilio-manager.mktgdept.com',
		port: 8002,
		secret: 'some random characters for security'
	},
	util = require('util'),
	express = require('express'),
	crypto = require('crypto'),
	twilio = require('twilio'),
	app = express.createServer(
		express.bodyParser(),
		express.cookieParser(),
		express.session({ secret: config.secret }),
		express.static(__dirname + '/public')
	),
	md5 = function(text) {
		return crypto.createHash('md5').update(text).digest('hex');
	};

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.set('view options', {
		layout: false
	});
});

app.get('/', function(req, res) {
	if(req.session.user)	
		res.render('index', { locals: { accounts: req.session.user.accounts } });
	else
		res.render('login');
});

app.post('/login', function(req, res) {
	var account_sid = req.body.account_sid,
		auth_token = req.body.auth_token;
	if(!account_sid||!auth_token)
		return res.send('Invalid Account SID or Auth Token.');

	var client = new twilio.RestClient(account_sid, auth_token);

	client.apiCall('GET', '/2010-04-01/Accounts.json', null, function(data, client) {
		if(401==data.status)
			return res.send('Invalid Account SID or Auth Token.');
		req.session.user = {
			account_sid: account_sid,
			auth_token: auth_token,
			accounts: {}
		};
		var accountsToCheck = data.accounts.length, sid;
		for(var i = 0; i < accountsToCheck; i++)
			req.session.user.accounts[data.accounts[i].sid] = {
				friendly_name: data.accounts[i].friendly_name,
				auth_token: data.accounts[i].auth_token,
				numbers: {}
			};
		for(sid in req.session.user.accounts) {
			client = new twilio.RestClient(sid, req.session.user.accounts[sid].auth_token);
			client.getIncomingNumbers(null, function(data) {
				for(var x = 0; x < data.incoming_phone_numbers.length; x++)
					req.session.user.accounts[data.incoming_phone_numbers[x].account_sid].numbers[data.incoming_phone_numbers[x].sid] = {
						friendly_name: data.incoming_phone_numbers[x].friendly_name
					};
				accountsToCheck--;
				if(0 >= accountsToCheck)
					res.redirect('/');
			});
		}
	}, function() {
		res.send('Invalid Account SID or Auth Token.');
	}, true);
});

app.post('/move', function(req, res) {
	var
		sid = req.body.sid,
		oldSid = req.body.oldSid,
		newSid = req.body.newSid,
		client = new twilio.RestClient(req.session.user.account_sid, req.session.user.auth_token);
	client.apiCall('POST', '/2010-04-01/Accounts/' + oldSid + '/IncomingPhoneNumbers/' + sid + '.json', { params: { AccountSid: newSid } }, function(data) {
		req.session.user.accounts[newSid].numbers[sid] = req.session.user.accounts[oldSid].numbers[sid];
		delete req.session.user.accounts[oldSid].numbers[sid];
		res.send('ok');
	}, null, true);
});

app.listen(config.port, config.hostname);
