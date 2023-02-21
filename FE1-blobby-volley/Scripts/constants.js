// Defines the width of the net
var NET_WIDTH = 10;
// Defines the height of the net
var NET_HEIGHT = 290;
// Converts grad to rad
var GRAD_TO_RAD = Math.PI / 180;
// Just saves one operation
var TWOPI = 2 * Math.PI;
// Time of 1 logic step in ms
var LOGIC_STEP = 40;
// Number of time slices per iteration
var TIME_SLICES = 40;
// Frames per second (inverse of LOGIC_STEP)
var FRAMES = 4000 / LOGIC_STEP;
// Sets the g factor
var ACCELERATION = 0.001875;
// The minimum amount of players
var MIN_PLAYERS = 2;
// The maximum amount of players
var MAX_PLAYERS = 4;
// The maximum amount of contacts per move
var MAX_CONTACTS = 3;
// The maximum (horizontal) speed of a player
var MAX_SPEED = 0.4;
// The maximum (vertical) speed of a player
var MAX_JUMP = 1.05;
// The (default) maximum number of points per set
var DEFAULT_MAX_POINTS = 11;
// The (default) maximum number of sets per match
var DEFAULT_MAX_SETS = 3;
// The time between two points in ms
var POINT_BREAK_TIME = 450;
// The start height of the ball in px
var BALL_START_HEIGHT = 250;
// Sets the acceleration of the ball through the player
var BALL_SPEEDUP = 0.4;
// Sets the strength of the reflection of the ball while serving
var BALL_LAUNCH = 1.5;
// Sets strength of the reflection of the ball
var BALL_REFLECTION = 0.8;
// Sets the air resistancy of the ball
var BALL_RESISTANCE = 1;
// Sets the drag coefficient of the ball
var BALL_DRAG = 0.005;
// Sets the increase per iteration of pulse
var PULSE_RECOVERY = 0.0004;
// Sets the decrease per iteration of pulse while running
var PULSE_RUN_DECREASE = 0.0005;
// Sets the decrease per iteration of pulse for jumping
var PULSE_JUMP_DECREASE = 0.17;
// Sets the size of the circles in the won-sets-display
var SETS_WON_RADIUS = 10;
// The list of images to load
var LOAD_IMAGES = [
	'ball.png',
	'orlando.jpg',
	'mauritius.jpg',
	'rio.jpg',
	'green-island.jpg',
	'hawai.jpg',
	'indies.jpg',
	'maldives.jpg',
	'tropical.jpg'
];