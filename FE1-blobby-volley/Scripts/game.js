let socket = new WebSocket("wss://hfg-gamer-backend.fly.dev");

socket.onopen = function (e) {
	console.log("[open] Connection established");
	socket.send("My name is FE1");
};

// socket.onmessage = function (event) {
// 	console.log(event.data);
// };

/*
	(abstract) VirtualObject class
*/
var VirtualObject = Class.extend({
	init: function () {

	},
	random: function (min, max) {
		var d = max - min;
		return Math.min(Math.floor(Math.random() * d), max - 1) + min;
	},
	format: function (str) {

		for (var i = 1; i < arguments.length; i++)
			str = str.replace(new RegExp('\\{' + (i - 1) + '\\}', 'g'), arguments[i]);

		return str;
	}
});
/*
	(abstract) Resources class
*/
var Resources = Class.extend({
	init: function (toload) {
		this.toload = toload;
		this.resources = {};
	},
	loaded: function () {
		this.toload--;
	},
	setResource: function (name, value) {
		this.resources[name] = value;
	},
	getResource: function (name) {
		return this.resources[name];
	},
});
/*
	ImageResources class for loading images
*/
var ImageResources = Resources.extend({
	init: function (directory, list) {
		var me = this;
		me._super(list.length);

		for (var i = 0; i < list.length; i++) {
			var item = document.createElement('img');
			item.src = directory + '/' + list[i];
			item.onload = function () {
				me.loaded();
			};
			me.setResource(list[i], item);
		}
	}
});
/*
	Replay class
*/
var Replay = VirtualObject.extend({
	init: function (beach, ball, players) {
		this.beach = beach;
		this.ballx = ball.x;
		this.bally = ball.y;
		this.data = [];
		this.players = [];
		this.count = 0;
		this.contacts = 0;

		for (var i = 0; i < players.length; i++) {
			this.players.push({
				color: players[i].color,
				name: players[i].name,
				points: players[i].points,
				sets: players[i].sets
			});
		}
	},
	addData: function (players) {
		var inputs = [];
		this.contacts = 0;

		for (var i = 0; i < players.length; i++) {
			inputs.push(players[i].input.copy());
			this.contacts += players[i].totalContacts;
		}

		//Before starting to add data - look if the data is worth saving (no action = not worth)
		if (this.count === 0) {
			var containsData = false;

			for (var i = inputs.length; i--;) {
				if (inputs[i]) {
					containsData = true;
					break;
				}
			}

			if (!containsData)
				return;
		}

		this.data.push(inputs);
		this.count++;
	},
	play: function (game, continuation) {
		game.pause();
		var frames = this.count;
		var index = 0;
		var replayBots = [];
		var net = new Net(game.field);
		var ball = new Ball(game.field);
		var view = new ReplayViewPort(replayBots, game.field, net, ball);
		view.setBackground(this.beach);
		ball.x = this.ballx;
		ball.y = this.bally;
		var data = this.data;

		for (var i = 0; i < this.players.length; i++) {
			var bot = new ReplayBot(game, game.players[i].container);
			bot.setIdentity(this.players[i].name, this.players[i].color);
			replayBots.push(bot);
		}

		var iv = setInterval(function () {
			if (index === frames) {
				clearInterval(iv);

				if (continuation)
					continuation.apply(game);

				game.play();
				return;
			}

			var input = data[index++];

			for (var i = replayBots.length; i--;) {
				replayBots[i].steer(input[i]);
			}

			for (var t = TIME_SLICES; t--;) {
				ball.logic();
				net.logic();

				for (var i = replayBots.length; i--;) {
					replayBots[i].logic();
					ball.collision(replayBots[i]);
				}

				ball.collision(net);
			}

			view.paint(ball, replayBots);
		}, LOGIC_STEP / 2);
	},
	stop: function () {
		//TODO
	}
});
/*
	(abstract) DrawObject class
*/
var DrawObject = Class.extend({
	init: function (x, y, width, height) {
		this.setPosition(x || 0, y || 0);
		this.width = width || 0;
		this.height = height || 0;
	},
	setPosition: function (x, y) {
		this.x = x;
		this.y = y;
	},
	paint: function () {

	},
});
/*
	SettingsObject class
*/
var SettingsObject = Class.extend({
	init: function () {

	},
});
/*
	(abstract) Field class
*/
var Field = DrawObject.extend({
	init: function (dx, width) {
		this._super(dx, 0, width, height);
		this.wh = width / 2;
		this.hh = height / 2;
	},
});
/*
	The class for the big field
*/
var BigField = Field.extend({
	init: function () {
		this._super(0, width);
	},
	paint: function () {
		context.strokeStyle = '#cccccc';
		context.beginPath();
		context.rect(0, 0, width, height);
		context.closePath();
		context.stroke();
	}
});
/*
	The class for a player's field
*/
var SubField = Field.extend({
	init: function (index, total) {
		var w = width / total - NET_WIDTH / 2;
		this._super((w + NET_WIDTH) * index, w);
	}
});
/*
	The viewport class
*/
var ViewPort = DrawObject.extend({
	init: function (game) {
		this._super(0, 0, width, height);
		this.field = game.field;
		this.players = game.players;
		this.net = game.net;
		this.ball = game.ball;
		this.game = game;
		this.message = [];
		this.persistent = false;
		this.timeLeft = 0;
		this.radius = SETS_WON_RADIUS;
	},
	setup: function () {
		this.sets = 2 * this.game.maxSets - 1;
		this.factor = 2.5;
		this.offset = (this.game.maxSets - 1) * this.radius * this.factor;
		this.shift = 2 * this.radius;
	},
	setMessage: function (text, time) {
		this.message = text.split('\n');
		this.persistent = !time;

		if (time)
			this.timeLeft = time;
	},
	clearMessage: function () {
		this.message = [];
		this.persistent = false;
		this.timeLeft = 0;
	},
	setBackground: function (beach) {
		this.background = resources.images.getResource(Beaches[beach]);
		document.getElementById('beach').innerHTML = beach;
	},
	paint: function () {
		context.clearRect(0, 0, width, height);
		context.drawImage(this.background, 0, 0);
		this.field.paint();
		this.net.paint();
		this.ball.paint();

		for (var i = this.players.length; i--;)
			this.players[i].paint();

		if (this.ball.getBottom() > height)
			this.paintCursor(this.ball.x);

		this.paintScore();

		for (var i = this.players.length; i--;)
			this.players[i].paintPulse();

		this.paintMessage();
	},
	paintMessage: function () {
		if (!this.persistent) {
			if (!this.timeLeft)
				return;

			this.timeLeft--;
		}

		context.save();
		context.translate(width / 2, height / 2);
		context.textAlign = 'center';
		context.fillStyle = '#8A2BE2';
		context.font = '32pt Merge';

		for (var i = 0; i < this.message.length; i++)
			context.fillText(this.message[i], 0, i * 50);

		context.restore();
	},
	paintScore: function () {
		context.save();
		context.translate(this.field.wh - this.offset, 30);

		for (var i = 0; i < this.sets; i++) {
			if (this.game.sets.length > i)
				context.fillStyle = this.game.sets[i].color;
			else
				context.fillStyle = '#cccccc';

			context.strokeStyle = '#666666';
			context.beginPath();
			context.arc(this.factor * i * this.radius, 0, this.radius, 0, TWOPI, false);
			context.fill();
			context.stroke();
			context.closePath();
		}

		context.fillStyle = '#dddddd';
		context.font = '32pt Merge';
		context.textAlign = 'right';
		context.fillText(this.players[0].points, -this.shift, 15);
		context.textAlign = 'left';
		context.fillText(this.players[1].points, 2 * this.offset + this.shift, 15);
		context.restore();
	},
	paintCursor: function (x) {
		context.save();
		context.translate(x, 10);
		context.fillStyle = '#000000';
		context.beginPath();
		context.moveTo(0, -5);
		context.lineTo(5, 5);
		context.lineTo(-5, 5);
		context.closePath();
		context.fill();
		context.restore();
	}
});
var ReplayViewPort = ViewPort.extend({
	init: function (players, container, net, ball) {
		var pseudo = {
			players: players,
			field: container,
			net: net,
			ball: ball
		};
		this._super(pseudo);
		this.setMessage(Messages.Replay);
	},
	setup: function () { },
	paintScore: function () { }
});
/*
	(abstract) Figure class
*/
var Figure = DrawObject.extend({
	init: function (container, w, h) {
		this.container = container;
		this._super(0, 0, w, h);
		this.friction = BALL_REFLECTION;
		this.wh = this.width / 2;
		this.hh = this.height / 2;
		this.setPositionFromContainerOrigin();
		this.setVelocity(0, 0);
	},
	setPositionFromContainerOrigin: function () {
		var x = this.container.x + this.container.wh;
		var y = this.hh;
		this.setPosition(x, y);
	},
	getTotalVelocity: function () {
		return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
	},
	setVelocity: function (vx, vy) {
		this.vx = vx;
		this.vy = vy;
	},
	setPosition: function (x, y) {
		this.x = x;
		this.y = y;
	},
	getBottom: function () {
		return this.y - this.hh;
	},
	getTop: function () {
		return this.y + this.hh;
	},
	getLeft: function () {
		return this.x - this.wh;
	},
	getRight: function () {
		return this.x + this.wh;
	},
	checkField: function () {
		if (this.y < this.hh) {
			this.y = this.hh;
			this.vy = 0;
		}

		if (this.getLeft() < this.container.x) {
			this.vx = 0;
			this.x = this.container.x + this.wh;
		} else if (this.getRight() > this.container.x + this.container.width) {
			this.vx = 0;
			this.x = this.container.x + this.container.width - this.wh;
		}
	},
	collision: function () { },
	logic: function () {
		this.vy -= ACCELERATION;
		this.x += this.vx;
		this.y += this.vy;
		this.checkField();
	},
	paint: function () { },
	hit: function (dx, dy, ball) {
		var distance = dx * dx + dy * dy;
		var angle = Math.atan2(dy, dx);
		var v = ball.getTotalVelocity();
		var ballVx = Math.cos(angle) * this.friction * v;
		var ballVy = Math.sin(angle) * this.friction * v;
		ballVx += BALL_RESISTANCE * ball.omega * dy / distance;
		ballVy -= BALL_RESISTANCE * ball.omega * dx / distance;
		ball.setVelocity(ballVx, ballVy);
	}
});
/*
	The class for the net
*/
var Net = Figure.extend({
	init: function (container) {
		this._super(container, NET_WIDTH, NET_HEIGHT);
		this.radius = NET_WIDTH / 2;
		this.y = NET_HEIGHT;
		this.originX = this.x;
		this.friction = 1;
	},
	reset: function () {
		this.x = this.originX;
		this.vx = 0;
	},
	collision: function (ball) {
		var dx = ball.x - this.x;
		var dy = ball.y - this.y;
		var br = ball.radius + this.radius;

		if (dy <= 0) {
			var sign = 0;

			if (ball.vx > 0 && dx + br >= 0 && dx <= this.radius)
				sign = -1;
			else if (ball.vx < 0 && dx - br <= 0 && dx + this.radius >= 0)
				sign = 1;

			if (sign != 0) {
				this.vx = ball.vx * 5;
				ball.vx = -ball.vx;
				ball.vy += sign * ball.omega;
			}

			return;
		}

		if (Math.sqrt(dx * dx + dy * dy) <= br)
			this.hit(dx, dy, ball);
	},
	hit: function (dx, dy, ball) {
		this._super(dx, dy, ball);
		ball.spin(this.vx, this.vy, dx, dy);
	},
	logic: function () {
		this.x += this.vx;
		this.vx -= (this.x - this.originX);
		//Damp the force slightly
		this.vx *= 0.99;
	},
	paint: function () {
		context.save();
		context.translate(this.originX, this.container.height);
		var alpha = Math.atan2(this.x - this.originX, this.height);
		context.rotate(alpha);
		context.strokeStyle = '#666666';
		context.fillStyle = '#999999';
		context.lineWidth = 1;
		context.beginPath();
		context.arc(0, -this.y, this.wh, 0, Math.PI, true);
		context.lineTo(-this.wh, 0);
		context.lineTo(this.wh, 0);
		context.lineTo(this.wh, -this.y);
		context.fill();
		context.stroke();
		context.closePath();
		context.restore();
	}
});
/*
	The class for the ball
*/
var Ball = Figure.extend({
	init: function (container) {
		this.radius = 48;
		this.diameter = 2 * this.radius;
		this._super(container, this.diameter, this.diameter);
		this.rotation = 0;
		this.omega = 0;
		this.sleeping = true;
		this.dead = false;
	},
	setVelocity: function (vx, vy) {
		this.sleeping = false;
		this._super(vx, vy);
	},
	setServe: function (subfield) {
		var x = subfield.x + subfield.width / 2;
		var y = BALL_START_HEIGHT;
		this.sleeping = true;
		this.dead = false;
		this.omega = 0;
		this.rotation = 0;
		this.vx = 0;
		this.vy = 0;
		this.setPosition(x, y);
	},
	collision: function (figure) {
		if (this.dead) {
			if (figure instanceof Player && (this.x < figure.container.x || this.x > figure.container.x + figure.container.width))
				figure.scorePoint();

			return;
		}

		figure.collision(this);
	},
	checkField: function () {
		if (this.y <= this.radius) {
			this.dead = true;
			this.y = this.radius;
		}
	},
	logic: function () {
		if (this.sleeping || this.dead)
			return;

		//First let's check for contact with the boundary
		if (this.x <= this.radius) {
			this.vx *= -1;
			this.vy += this.omega;
		} else if (this.x >= this.container.width - this.radius) {
			this.vx *= -1;
			this.vy -= this.omega;
		}

		//Let's handle the spin!
		if (this.omega) {
			var v = this.getTotalVelocity();
			var dx = (this.vy * this.omega * BALL_DRAG) / v;
			var dy = -(this.vx * this.omega * BALL_DRAG) / v;
			this.vx += dx;
			this.vy += dy;
		}

		//Perform the updates on velocity etc.
		this.rotation += this.omega;
		this._super();
	},
	changeSpin: function (vx, vy, dx, dy, sign) {
		var distance = dx * dx + dy * dy;
		var scalar = (dx * vx + dy * vy) / distance;
		var svx = vx + sign * dx * scalar;
		var svy = vy + sign * dy * scalar;
		this.omega += (svx * dy - svy * dx) / distance;
	},
	spin: function (vx, vy, dx, dy) {
		this.changeSpin(this.vx, this.vy, dx, dy, 1);
		this.changeSpin(vx, vy, dx, dy, -1);
	},
	paint: function () {
		context.save();
		context.translate(this.x, this.container.height - this.y);
		context.rotate(this.rotation);
		context.drawImage(resources.images.getResource('ball.png'), -this.radius, -this.radius);
		context.restore();
	},
});
/*
	The class for a (human) player
*/
var Player = Figure.extend({
	init: function (game, container, controls) {
		this.radius = 48;
		this.diameter = 2 * this.radius;
		this._super(container, this.diameter, this.diameter);
		this.game = game;
		this.input = controls;
		this.points = 0;
		this.sets = 0;
		this.pulses = [];
		this.color = 'rgb(0, 0, 0)';
		this.name = 'Player';
		this.reset();
	},
	addContact: function () {
		if (!this.isTouching) {
			this.isTouching = true;
			this.contacts++;
			this.totalContacts++;
			return false;
		}

		return true;
	},
	reset: function () {
		this.input.reset();
		this.setVelocity(0, 0);
		this.setPositionFromContainerOrigin();
		this.pulse = 1.0;
		this.contacts = 0;
		this.totalContacts = 0;
		this.isTouching = false;
	},
	scorePoint: function () {
		this.points++;
		this.game.setServe(this.container);

		if (this.points >= this.game.maxPoints) {
			var over = true;

			for (var i = this.game.players.length; i--;) {
				if (this.game.players[i] !== this && Math.abs(this.game.players[i].points - this.points) < 2) {
					over = false;
					break;
				}
			}

			if (over)
				return this.game.setWon(this);
		}
	},
	hit: function (dx, dy, ball) {
		var f = ball.sleeping ? BALL_LAUNCH : BALL_SPEEDUP;
		this._super(dx, dy, ball);
		var sv = dx * this.vx + dy * this.vy;

		if (sv > 0) {
			var vd = f * sv / (dx * dx + dy * dy);
			ball.vx += dx * vd;
			ball.vy += dy * vd;
		}

		ball.spin(this.vx, this.vy, dx, dy);
	},
	collision: function (ball) {
		var dx = ball.x - this.x;
		var dy = ball.y - this.y;
		var distance = Math.sqrt(dx * dx + dy * dy);
		var br = ball.radius + this.radius;

		if (distance > br) {
			this.isTouching = false;
			return;
		}

		// Be sure that the ball stays outside of the player
		var sigma = br / distance;
		var dxp = sigma * dx;
		var dyp = sigma * dy;
		ball.setPosition(this.x + dxp, this.y + dyp);

		if (this.game.contact(this))
			return;

		if (this.contacts > MAX_CONTACTS) {
			ball.dead = true;
			return;
		}

		this.hit(dx, dy, ball);
	},
	setIdentity: function (name, color) {
		this.name = name;
		this.color = color;
	},
	updatePulse: function () {
		this.pulses.push(this.pulse);

		if (this.pulses.length > 100)
			this.pulses.shift();
	},
	steer: function () {
		this.input.update();
		this.updatePulse();
	},
	logic: function () {
		
		if (this.input.left) {
			this.vx = -this.pulse * MAX_SPEED;
			this.pulse -= PULSE_RUN_DECREASE;
		} else if (this.input.right) {
			this.vx = this.pulse * MAX_SPEED;
			this.pulse -= PULSE_RUN_DECREASE;
		} else
			this.vx = 0;

		if (this.y === this.hh && this.input.up) {
			this.vy = MAX_JUMP + ACCELERATION;
			this.pulse -= PULSE_JUMP_DECREASE;
		}

		if(this.input.up)
			console.log(this.input.up);

		this.pulse = Math.max(Math.min(1, this.pulse + PULSE_RECOVERY), 0.5);
		this._super();
	},
	paint: function () {
		context.save();
		context.translate(this.x, this.container.height - this.y);
		context.fillStyle = this.color;
		context.beginPath();
		context.arc(0, 0, this.radius, 0, TWOPI, true);
		context.fill();
		context.closePath();
		context.restore();
	},
	paintPulse: function () {
		context.save();
		context.translate(this.container.x ? this.container.x + this.container.width - 250 : 50, 45);
		context.fillStyle = 'rgba(150, 150, 150, 0.2)';
		context.fillRect(0, -30, 200, 30);
		context.beginPath();
		context.moveTo(0, 0);

		for (var i = 0; i < this.pulses.length; i++) {
			context.lineTo(2 * i, -30 * (1 / this.pulses[i] - 1));
		}

		context.strokeStyle = this.color;
		context.stroke();
		context.closePath();
		context.fillStyle = '#cccccc';
		context.textAlign = 'center';
		context.font = '24px Merge';
		context.fillText(this.name, 100, -10);
		context.restore();
	}
});
/*
	The class for a (computer) player
*/
var Computer = Player.extend({
	init: function (game, container) {
		this._super(game, container, new Control());
		this.setIdentity('Computer', '#FF6633');
	},
	steer: function () {
		//TODO perform ai to change input
		var r = Math.floor(Math.random() * 6);

		switch (r) {
			case 0:
				this.input.setUp(true);
				break;
			case 1:
				this.input.setLeft(true);
				this.input.setRight(false);
				break;
			case 2:
				this.input.setRight(true);
				this.input.setLeft(false);
				break;
			case 4:
				this.input.setRight(false);
				this.input.setLeft(false);
				break;
			case 5:
				this.input.setUp(false);
				break;
		}

		this._super();
	},
});
/*
	The class for a (replay) player
*/
var ReplayBot = Player.extend({
	init: function (game, container) {
		this._super(game, container, new Control());
	},
	steer: function (data) {
		if (data) {
			this.input.setUp(!!data.u);
			this.input.setLeft(!!data.l);
			this.input.setRight(!!data.r);
		}

		this._super();
	},
	scorePoint: function () {
		//Nothing to do here!
	}
});
/*
	(abstract) Control class
*/
var Control = VirtualObject.extend({
	init: function () {
		this.reset();
		this._super();
	},
	update: function () {
		this.previousUp = this.up;
		this.previousLeft = this.left;
		this.previousRight = this.right;
		this.left = this.bufferLeft;
		this.up = this.bufferUp;
		this.right = this.bufferRight;
	},
	reset: function () {
		this.up = false;
		this.left = false;
		this.right = false;
		this.bufferUp = false;
		this.bufferLeft = false;
		this.bufferRight = false;
		this.previousUp = false;
		this.previousLeft = false;
		this.previousRight = false;
	},
	setUp: function (on) {
		this.bufferUp = on;
	},
	setLeft: function (on) {
		this.bufferLeft = on;
	},
	setRight: function (on) {
		this.bufferRight = on;
	},
	bind: function () { },
	unbind: function () { },
	cancelBubble: function (e) {
		var evt = e || event;

		if (evt.preventDefault)
			evt.preventDefault();
		else
			evt.returnValue = false;

		if (evt.stopPropagation)
			evt.stopPropagation();
		else
			evt.cancelBubble = true;
	},
	copy: function () {
		if (this.previousUp === this.up && this.previousRight === this.right && this.previousLeft === this.left)
			return 0;

		return {
			l: this.left ? 1 : 0,
			u: this.up ? 1 : 0,
			r: this.right ? 1 : 0
		};
	}
});
/*
	The class for controlling the game with the keyboard
*/
var Keyboard = Control.extend({
	init: function (codeArray) {
		var me = this;
		me._super();
		me.codes = {};
		me.codes[codeArray[0]] = me.setUp;
		me.codes[codeArray[1]] = me.setLeft;
		me.codes[codeArray[2]] = me.setRight;

		var handleEvent = false;
		this.downhandler = function (event) {
			handleEvent = me.handler(event, true);
			return handleEvent;
		};
		this.uphandler = function (event) {
			handleEvent = me.handler(event, false);
			return handleEvent;
		};
		this.presshandler = function (event) {
			if (!handleEvent)
				me.cancelBubble(event);
			return handleEvent;
		};

	},
	bind: function () {
		document.addEventListener('keydown', this.downhandler, false);
		document.addEventListener('keyup', this.uphandler, false);
		// document.addEventListener('keypress', this.presshandler, false);
		//The last one is required to cancel bubble event in Opera!
	},
	unbind: function () {
		document.removeEventListener('keydown', this.downhandler, false);
		document.removeEventListener('keyup', this.uphandler, false);
		// document.removeEventListener('keypress', this.presshandler, false);
	},
	handler: function (e, status) {
		if (this.codes[e.keyCode]) {
			// console.log(e);
			(this.codes[e.keyCode]).apply(this, [status]);
			// this.cancelBubble(e);
			return false;
		}

		return true;
	},
});

/*
	The class for controlling the game via websocket
*/
var Websocket = Control.extend({
	init: function (codeArray) {
		var me = this;
		me._super();
		me.codes = {};
		me.codes[codeArray[0]] = me.setUp;
		me.codes[codeArray[1]] = me.setLeft;
		me.codes[codeArray[2]] = me.setRight;


		var handleEvent = false;
		this.websocketHandler = function (event) {
			let handlerState = event.data.charAt(2);
			let setDirection = event.data.slice(0, -1);
			// console.log(handlerState, setDirection);
			if (handlerState == 1) {
				handleEvent = me.handler(setDirection, true);
			}
			else {
				handleEvent = me.handler(setDirection, false);
			}

			return handleEvent;
		};
	},
	bind: function () {

		socket.addEventListener('message', this.websocketHandler);

		// document.addEventListener('keydown', this.downhandler, false);
		// document.addEventListener('keyup', this.uphandler, false);
		// document.addEventListener('keypress', this.presshandler, false);
		//The last one is required to cancel bubble event in Opera!
	},
	unbind: function () {
		socket.removeEventListener('message', this.websocketHandler);
		// document.removeEventListener('keydown', this.downhandler, false);
		// document.removeEventListener('keyup', this.uphandler, false);
		// document.removeEventListener('keypress', this.presshandler, false);
	},
	handler: function (direction, status) {
		if (this.codes[direction]) {
			// console.log(direction, status);
			(this.codes[direction]).apply(this, [status]);
			// this.cancelBubble(e);
			return false;
		}

		return true;
	},
});


/*
	The class for controlling the game via touch
*/
var TouchInput = Control.extend({
	init: function (container) {
		this._super();
	},
});
/*
	The class managing the lobby
*/
var Lobby = VirtualObject.extend({
	init: function () {
		this.messages = [];
		this.created = new Date();
	},
});
/*
	The class for representing an observer
*/
var Observer = VirtualObject.extend({
	init: function () {

	},
});
/*
	The class for the game
*/
var Game = VirtualObject.extend({
	init: function () {
		this.ready = false;
		this.load();
		this.players = [];
		this.observers = [];
		this.replays = [];
		this.instantReplay = null;
		this.sets = [];
		this.lobby = new Lobby();
		this.field = new BigField();
		this.ball = new Ball(this.field);
		this.net = new Net(this.field);
		this.viewPort = new ViewPort(this);
		this.loop = null;
		this.running = false;
		this.maxPoints = DEFAULT_MAX_POINTS;
		this.maxSets = DEFAULT_MAX_SETS;
		this.wait = 0;
		this.beach = '';
		this.beaches = [];

		for (var key in Beaches)
			this.beaches.push(key);
	},
	contact: function (player) {
		var touching = false;

		for (var i = this.players.length; i--;) {
			var gamer = this.players[i];

			if (gamer === player)
				touching = gamer.addContact();
			else
				gamer.contacts = 0;
		}

		return touching;
	},
	reset: function () {
		var i;

		for (i = this.players.length; i--;)
			this.players.pop();

		for (i = this.observers.length; i--;)
			this.observers.pop();

		for (i = this.replays.length; i--;)
			this.replays.pop();

		for (i = this.sets.length; i--;)
			this.sets.pop();
	},
	setWon: function (player) {
		for (var i = 0; i < this.players.length; i++)
			this.players[i].points = 0;

		player.sets++;
		this.sets.push(player);


		if (player.sets === this.maxSets) {
			this.viewPort.setMessage(this.format(Messages.Over, player.name));
			this.endMatch();
		} else {
			this.viewPort.setMessage(this.format(Messages.Set, player.name), 2 * this.wait);
		}
	},
	addPlayer: function (player) {
		this.players.push(player);
	},
	addObserver: function (observer) {
		this.observers.push(observer);
	},
	saveReplay: function () {
		this.replays.push(this.instantReplay);
	},
	recordReplay: function () {
		this.instantReplay = new Replay(this.beach, this.ball, this.players);
	},
	detectInstantReplay: function () {
		if (this.replays.length) {
			var rep = this.replays[this.replays.length - 1];

			if (rep.contacts > 8 && rep.count > 220)
				return true;
		}

		return false;
	},
	playLastReplay: function (continuation) {
		if (this.replays.length) {
			this.replays[this.replays.length - 1].play(this, continuation);
		}
	},
	continuation: function () {
		this.net.reset();

		for (var i = this.players.length; i--;)
			this.players[i].reset();

		this.recordReplay();
	},
	setServe: function (container) {
		this.saveReplay();
		this.ball.setServe(container);

		if (this.detectInstantReplay()) {
			this.playLastReplay(this.continuation);
			return;
		}

		this.wait = Math.ceil(POINT_BREAK_TIME / LOGIC_STEP);
		this.continuation();
	},
	tick: function () {
		if (!this.wait) {
			for (var i = this.players.length; i--;)
				this.players[i].steer();

			this.instantReplay.addData(this.players);

			for (var t = TIME_SLICES; t--;) {
				this.ball.logic();
				this.net.logic();

				for (var i = this.players.length; i--;) {
					this.players[i].logic();
					this.ball.collision(this.players[i]);
				}

				this.ball.collision(this.net);
			}
		} else {
			this.wait--;
		}

		this.viewPort.paint(this.ball, this.players);
	},
	beginMatch: function () {
		var r = this.random(0, this.beaches.length);
		this.viewPort.setMessage(Messages.Start, 100);
		this.beach = this.beaches[r];
		this.viewPort.setBackground(this.beach);
		this.viewPort.setup();
		r = this.random(0, this.players.length);
		this.ball.setServe(this.players[r].container);
		this.continuation();
		this.play();
	},
	endMatch: function () {
		this.saveReplay();
		this.viewPort.paint(this.ball, this.players);
		this.pause();
	},
	play: function () {
		var me = this;

		if (!me.running) {
			me.running = true;

			for (var i = this.players.length; i--;)
				this.players[i].input.bind();

			me.loop = setInterval(function () {
				me.tick();
			}, LOGIC_STEP);
		}
	},
	pause: function () {
		if (this.running) {
			this.running = false;

			for (var i = this.players.length; i--;)
				this.players[i].input.unbind();

			clearInterval(this.loop);
		}
	},
	load: function () {
		//TODO - set ready to true AFTER all resources have been loaded
		this.ready = true;
		resources.images = new ImageResources('Content/', LOAD_IMAGES);
	}
});