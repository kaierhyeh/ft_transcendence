var PADDLE_WIDTH = 10;
var PADDLE_HEIGHT = 50;
var BALL_SIZE = 10;
var WIN_SCORE = 11;
var PADDLE_SPEED = 6;
var Pong4 = /** @class */ (function () {
    function Pong4() {
        var _this = this;
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.paused = false;
        this.keys = {};
        this.canvas = document.getElementById("pong");
        this.ctx = this.canvas.getContext("2d");
        this.leftPaddle1 = { x: 20, y: this.canvas.height / 4 - PADDLE_HEIGHT / 2 };
        this.leftPaddle2 = { x: 20, y: (3 * this.canvas.height) / 4 - PADDLE_HEIGHT / 2 };
        this.rightPaddle1 = { x: this.canvas.width - 30, y: this.canvas.height / 4 - PADDLE_HEIGHT / 2 };
        this.rightPaddle2 = { x: this.canvas.width - 30, y: (3 * this.canvas.height) / 4 - PADDLE_HEIGHT / 2 };
        var angle = Math.random() * (Math.PI / 2) - Math.PI / 4;
        var speed = 5;
        this.ball = {
            x: this.canvas.width / 2 - BALL_SIZE / 2,
            y: this.canvas.height / 2 - BALL_SIZE / 2,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed
        };
        document.addEventListener("keydown", function (e) {
            _this.keys[e.key] = true;
        });
        document.addEventListener("keyup", function (e) {
            _this.keys[e.key] = false;
        });
    }
    Pong4.prototype.drawRect = function (x, y, w, h) {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(x, y, w, h);
    };
    Pong4.prototype.drawBall = function (x, y, size) {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(x, y, size, size);
    };
    Pong4.prototype.drawCenterLine = function () {
        for (var i = 0; i < this.canvas.height; i += 20) {
            this.drawRect(this.canvas.width / 2 - 1, i, 2, 10);
        }
    };
    Pong4.prototype.drawScore = function () {
        this.ctx.font = "64px Bit5x3";
        this.ctx.fillStyle = "white";
        this.ctx.fillText(this.scoreLeft.toString(), this.canvas.width / 4, 50);
        this.ctx.fillText(this.scoreRight.toString(), 3 * this.canvas.width / 4, 50);
    };
    Pong4.prototype.resetBall = function (to) {
        var _this = this;
        var speed = 7;
        var angle = Math.atan2(this.ball.dy, this.ball.dx);
        this.ball.y = Math.max(0, Math.min(this.canvas.height - BALL_SIZE, this.ball.y));
        this.ball.x = this.canvas.width / 2 - BALL_SIZE / 2;
        if (to === "right") {
            this.ball.dx = -Math.abs(Math.cos(angle) * speed);
        }
        else {
            this.ball.dx = Math.abs(Math.cos(angle) * speed);
        }
        this.ball.dy = Math.sin(angle) * speed;
        this.paused = true;
        setTimeout(function () {
            _this.paused = false;
        }, 1000);
    };
    Pong4.prototype.moveBall = function () {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        if (this.ball.y <= 0 || this.ball.y + BALL_SIZE >= this.canvas.height) {
            if (this.ball.y <= 0)
                this.ball.y = 0;
            else
                this.ball.y = this.canvas.height - BALL_SIZE;
            this.ball.dy *= -1;
        }
        if (this.ball.dx < 0 && this.ball.x <= this.leftPaddle1.x + PADDLE_WIDTH &&
            this.ball.x + BALL_SIZE >= this.leftPaddle1.x &&
            this.ball.y + BALL_SIZE >= this.leftPaddle1.y &&
            this.ball.y <= this.leftPaddle1.y + PADDLE_HEIGHT) {
            var paddleCenter = this.leftPaddle1.y + PADDLE_HEIGHT / 2;
            var ballCenter = this.ball.y + BALL_SIZE / 2;
            var impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
            var angle = impact * Math.PI / 4;
            var speed = Math.sqrt(Math.pow(this.ball.dx, 2) + Math.pow(this.ball.dy, 2)) * 1.05;
            this.ball.dx = Math.abs(Math.cos(angle) * speed);
            this.ball.dy = Math.sin(angle) * speed;
            this.ball.x = this.leftPaddle1.x + PADDLE_WIDTH;
            if (this.ball.y < this.leftPaddle1.y)
                this.ball.y = this.leftPaddle1.y - BALL_SIZE;
            else if (this.ball.y > this.leftPaddle1.y + PADDLE_HEIGHT)
                this.ball.y = this.leftPaddle1.y + PADDLE_HEIGHT;
        }
        if (this.ball.dx < 0 && this.ball.x <= this.leftPaddle2.x + PADDLE_WIDTH &&
            this.ball.x + BALL_SIZE >= this.leftPaddle2.x &&
            this.ball.y + BALL_SIZE >= this.leftPaddle2.y &&
            this.ball.y <= this.leftPaddle2.y + PADDLE_HEIGHT) {
            var paddleCenter = this.leftPaddle2.y + PADDLE_HEIGHT / 2;
            var ballCenter = this.ball.y + BALL_SIZE / 2;
            var impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
            var angle = impact * Math.PI / 4;
            var speed = Math.sqrt(Math.pow(this.ball.dx, 2) + Math.pow(this.ball.dy, 2)) * 1.05;
            this.ball.dx = Math.abs(Math.cos(angle) * speed);
            this.ball.dy = Math.sin(angle) * speed;
            this.ball.x = this.leftPaddle2.x + PADDLE_WIDTH;
            if (this.ball.y < this.leftPaddle2.y)
                this.ball.y = this.leftPaddle2.y - BALL_SIZE;
            else if (this.ball.y > this.leftPaddle2.y + PADDLE_HEIGHT)
                this.ball.y = this.leftPaddle2.y + PADDLE_HEIGHT;
        }
        if (this.ball.dx > 0 && this.ball.x + BALL_SIZE >= this.rightPaddle1.x &&
            this.ball.x <= this.rightPaddle1.x + PADDLE_WIDTH &&
            this.ball.y + BALL_SIZE >= this.rightPaddle1.y &&
            this.ball.y <= this.rightPaddle1.y + PADDLE_HEIGHT) {
            var paddleCenter = this.rightPaddle1.y + PADDLE_HEIGHT / 2;
            var ballCenter = this.ball.y + BALL_SIZE / 2;
            var impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
            var angle = impact * Math.PI / 4;
            var speed = Math.sqrt(Math.pow(this.ball.dx, 2) + Math.pow(this.ball.dy, 2)) * 1.05;
            this.ball.dx = -Math.abs(Math.cos(angle) * speed);
            this.ball.dy = Math.sin(angle) * speed;
            this.ball.x = this.rightPaddle1.x - BALL_SIZE;
            if (this.ball.y < this.rightPaddle1.y)
                this.ball.y = this.rightPaddle1.y - BALL_SIZE;
            else if (this.ball.y > this.rightPaddle1.y + PADDLE_HEIGHT)
                this.ball.y = this.rightPaddle1.y + PADDLE_HEIGHT;
        }
        if (this.ball.dx > 0 && this.ball.x + BALL_SIZE >= this.rightPaddle2.x &&
            this.ball.x <= this.rightPaddle2.x + PADDLE_WIDTH &&
            this.ball.y + BALL_SIZE >= this.rightPaddle2.y &&
            this.ball.y <= this.rightPaddle2.y + PADDLE_HEIGHT) {
            var paddleCenter = this.rightPaddle2.y + PADDLE_HEIGHT / 2;
            var ballCenter = this.ball.y + BALL_SIZE / 2;
            var impact = (ballCenter - paddleCenter) / (PADDLE_HEIGHT / 2);
            var angle = impact * Math.PI / 4;
            var speed = Math.sqrt(Math.pow(this.ball.dx, 2) + Math.pow(this.ball.dy, 2)) * 1.05;
            this.ball.dx = -Math.abs(Math.cos(angle) * speed);
            this.ball.dy = Math.sin(angle) * speed;
            this.ball.x = this.rightPaddle2.x - BALL_SIZE;
            if (this.ball.y < this.rightPaddle2.y)
                this.ball.y = this.rightPaddle2.y - BALL_SIZE;
            else if (this.ball.y > this.rightPaddle2.y + PADDLE_HEIGHT)
                this.ball.y = this.rightPaddle2.y + PADDLE_HEIGHT;
        }
        if (this.ball.x < 0) {
            this.scoreRight++;
            this.resetBall("right");
        }
        if (this.ball.x > this.canvas.width) {
            this.scoreLeft++;
            this.resetBall("left");
        }
    };
    Pong4.prototype.movePaddles = function () {
        if (this.keys["w"] && this.leftPaddle1.y > 0)
            this.leftPaddle1.y -= PADDLE_SPEED;
        if (this.keys["s"] && this.leftPaddle1.y + PADDLE_HEIGHT < this.canvas.height / 2)
            this.leftPaddle1.y += PADDLE_SPEED;
        if (this.keys["a"] && this.leftPaddle2.y > this.canvas.height / 2)
            this.leftPaddle2.y -= PADDLE_SPEED;
        if (this.keys["z"] && this.leftPaddle2.y + PADDLE_HEIGHT < this.canvas.height)
            this.leftPaddle2.y += PADDLE_SPEED;
        if (this.keys["ArrowUp"] && this.rightPaddle1.y > 0)
            this.rightPaddle1.y -= PADDLE_SPEED;
        if (this.keys["ArrowDown"] && this.rightPaddle1.y + PADDLE_HEIGHT < this.canvas.height / 2)
            this.rightPaddle1.y += PADDLE_SPEED;
        if (this.keys["o"] && this.rightPaddle2.y > this.canvas.height / 2)
            this.rightPaddle2.y -= PADDLE_SPEED;
        if (this.keys["l"] && this.rightPaddle2.y + PADDLE_HEIGHT < this.canvas.height)
            this.rightPaddle2.y += PADDLE_SPEED;
    };
    Pong4.prototype.gameOver = function () {
        return this.scoreLeft === WIN_SCORE || this.scoreRight === WIN_SCORE;
    };
    Pong4.prototype.game = function () {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawCenterLine();
        this.drawRect(this.leftPaddle1.x, this.leftPaddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        this.drawRect(this.leftPaddle2.x, this.leftPaddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        this.drawRect(this.rightPaddle1.x, this.rightPaddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        this.drawRect(this.rightPaddle2.x, this.rightPaddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);
        this.drawBall(this.ball.x, this.ball.y, BALL_SIZE);
        this.drawScore();
        if (this.gameOver()) {
            this.ctx.font = "64px Bit5x3";
            this.ctx.fillStyle = "white";
            if (this.scoreLeft === WIN_SCORE) {
                this.ctx.fillText("Left Team Wins!", this.canvas.width / 2 - 220, this.canvas.height / 2 + 32);
            }
            else {
                this.ctx.fillText("Right Team Wins!", this.canvas.width / 2 - 220, this.canvas.height / 2 + 32);
            }
        }
        else if (!this.paused) {
            this.moveBall();
        }
        this.movePaddles();
        requestAnimationFrame(this.game.bind(this));
    };
    Pong4.prototype.start = function () {
        this.game();
    };
    return Pong4;
}());
