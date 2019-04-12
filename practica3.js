var game = function() {
	
	var Q = window.Q = Quintus({ 
			development: true,
			imagePath: "images/",
			audioPath: "audio/",
			audioSupported: [ 'mp3' ],
			dataPath: "data/"
		}).include("Sprites, Scenes, Input, 2D, Audio, Anim, Touch, UI, TMX").setup({
			width: 700, 
			height: 500, 
		}).controls().touch().enableSound();


	Q.load(["mario_small.png", "mario_small.json", "mainTitle.png", "goomba.png", "goomba.json",
			"princess.png", "bloopa.png", "bloopa.json","coin.png", "coin.json"], function() {

				Q.compileSheets("mario_small.png","mario_small.json");
				Q.compileSheets("goomba.png", "goomba.json");
				Q.compileSheets("bloopa.png", "bloopa.json");
				Q.compileSheets("coin.png", "coin.json");

			});


	Q.Sprite.extend("Mario",{

		init: function(p) {

		 	this.alive = true;
		 	this.lastMileStone = 1;
		    this._super(p, {
		      	sheet: "marioR",
		      	sprite:  "Mario_anim",
		    	jumpSpeed: -400,
		    	speed: 300,
		    	w: 32,
		    	h: 32
		    });
		    this.add('2d, platformerControls, animation, tween');
		    this.on("hit.sprite",function(collision) {
				if(collision.obj.isA("Peach")) {
					Q.audio.play("music_level_complete.mp3");
					Q.stageScene("endGame",1, { label: "You Won!" });
					this.destroy();
				}
			});
		},

		Die: function(){
			if(this.alive){
				this.alive = false;
				Q.audio.play("music_die.mp3");
				this.gravity = 0;
				this.stage.unfollow();
				this.play("die");
				this.del('2d, platformerControls');
				Q.state.dec("lives", 1);
				Q.stageScene("endGame",1, { label: "You Died" });
				this.animate({y: this.p.y-100}, 0.4, Q.Easing.Linear, {callback: this.nowDown});
			}
		},

		bounce: function(){
			this.p.vy = -200;
		},

		nowDown: function(){
			this.animate({y: this.p.y+300}, 0.8, Q.Easing.Linear, {callback: this.changeToDead });
		},

		changeToDead : function(){
			this.destroy();	
		},

		fall: function(){
			if(this.alive){
				this.destroy();
				Q.state.dec("lives", 1);
				Q.audio.play("music_die.mp3");
				Q.stageScene("endGame",1, { label: "You Died" });
			}
		},

		step: function(dt) {
		  	if(this.p.y > 520)
		  		this.stage.follow(Q("Mario").first(), {x: true, y: false});
		
		  	if(this.p.y > 620){
		  		this.fall();
		  	}
		  	if(!this.alive)
		  		this.play("die");
		    else if(this.p.vy != 0) {
		    	this.play("fall_" + this.p.direction);
		    } 
		  	else if(this.p.vx > 0) {
		    	this.play("run_right");
		    } 
		    else if(this.p.vx < 0) {
		    	this.play("run_left");
		    } 
		    else {
		    	this.play("Stand_" + this.p.direction);
		    }		
		}
	});

	Q.Sprite.extend("Goomba",{
		init: function(p) {
		    this._super(p, {
		    	sheet: "goomba",
		    	sprite: "Goomba_anim",
		    	x: 1500,
		    	y: 450,
		    	vx: 100,
		    	scale:1.1
		    });
		    this.add('2d, aiBounce, animation, DefaultEnemy');
		},

		step: function(dt) {
			if(this.p.vx != 0 && this.alive){
				this.play("run");
			}
		}
	});

	Q.Sprite.extend("Peach",{
		init: function(p) {
		    this._super(p, {
		    	asset: "princess.png",	
		    });
		},
	});
	
	Q.Sprite.extend("Bloopa",{
		init: function(p) {
		    this._super(p, {
		    	sheet: "bloopa",
		    	sprite: "Bloopa_anim",
		    	x: 200,
		    	y: 250,
		    	gravity: 1/3,
		    	scale: 1.1
		    });
		    this.add('2d, aiBounce, animation, DefaultEnemy');
			this.on("dead", this, "DEAD");
		},

		step: function(dt) {
			if(this.alive){
				this.play("standing");
				if(this.p.vy == 0)
					this.p.vy =  -300;
			}
		}
	});

	Q.Sprite.extend("Coin",{	 
		init: function(p) {
		 	this.taken = false;
		    this._super(p, {
		    	sheet: "coin",
		    	sprite: "Coin_anim",
		    	sensor: true
		    });
		    this.add('animation, tween');
		    this.on("hit.sprite",function(collision) {
				if(collision.obj.isA("Mario")) {
					if(!this.taken){
						this.taken = true;
						Q.audio.play("coin.mp3");
						this.animate({y: p.y-50}, 0.25, Q.Easing.Linear, {callback: this.destroy});
						Q.state.inc("score", 10);
					}
				}
			});
		},

		step: function(dt) {
			this.play("Shine");
		}
	});

	Q.component("DefaultEnemy", {
		added: function(){
			this.entity.alive = true;
			this.entity.on("bump.left,bump.right,bump.bottom",function(collision) {
				if(collision.obj.isA("Mario")) {
					collision.obj.Die();	
				}
			});
			this.entity.on("bump.top",function(collision, that) {
				if(collision.obj.isA("Mario")) {
					collision.obj.bounce();
					this.DEAD();
				}
			});
			this.entity.on("endAnim", this.entity, "die");
		},

		extend: {
			DEAD: function() {
				if(this.alive){
					Q.audio.play("squish_enemy.mp3");
					this.alive = false;
					Q.state.inc("score", 100);
					this.play("die");
				}
			},

			die: function(){
				this.destroy();
			}
		}
	});

	Q.animations('Mario_anim', {
		run_right: { frames: [1,2,3], rate: 1/10}, 
		run_left: { frames: [17,16,15], rate:1/10 },
		Stand_right: { frames: [0]},
		Stand_left: { frames: [14] },
		fall_right: { frames: [4], loop: false },
		fall_left: { frames: [18], loop: false },
		die: {frames: [12], loop: true}
	});

	Q.animations('Goomba_anim', {
		run: {frames: [0, 1], rate:1/2},
		die: {frames:[2], rate: 1/2, loop:false, trigger: "endAnim"}
	});

	Q.animations('Bloopa_anim', {
		standing: {frames: [0,1], rate: 1/2},
		die: {frames: [2], rate: 1/2, loop:false, trigger: "endAnim"}
	});

	Q.animations('Coin_anim', {
		Shine: {frames:[0,1,2], rate: 1/3, loop: true}
	})

	Q.load(["music_die.mp3", "music_level_complete.mp3", "music_main.mp3", "coin.mp3",  "squish_enemy.mp3"], function(){});

	Q.loadTMX("level.tmx, sprites.json", function() {
		Q.stageScene("mainTitle");
	});

	Q.scene("level1", function(stage) {

		Q.stageTMX("level.tmx",stage);

		Q.audio.play('music_main.mp3',{ loop: true });
		var player = stage.insert(new Q.Mario({x: 150,y: 380,}));

		stage.insert(new Q.Goomba({x: 1000,y: 490}));
		stage.insert(new Q.Goomba({x: 600,y: 490}));
		stage.insert(new Q.Goomba({x:1020,y: 490}));
		stage.insert(new Q.Goomba({x:4013,y: 490}));
		stage.insert(new Q.Goomba({x:2056, y:490}));
		
		stage.insert(new Q.Peach({x: 4804,y: 520}));

		stage.insert(new Q.Bloopa({x:300,y:320}));
		stage.insert(new Q.Bloopa({x:700,y:320}));
		stage.insert(new Q.Bloopa({x:1300,y:45}));
		stage.insert(new Q.Bloopa({x:600,y:320}));
		stage.insert(new Q.Bloopa({x:2600,y:240}));
		stage.insert(new Q.Bloopa({x:3545,y:240}));
		
		stage.insert(new Q.Coin({x:400,y:420}));
		stage.insert(new Q.Coin({x:430,y:420}));
		stage.insert(new Q.Coin({x:460,y:420}));
		stage.insert(new Q.Coin({x:500,y:420}));
		stage.insert(new Q.Coin({x:1400,y:520}));
		stage.insert(new Q.Coin({x:1430,y:520}));
		stage.insert(new Q.Coin({x:1460,y:520}));
		stage.insert(new Q.Coin({x:1430,y:320}));
		stage.insert(new Q.Coin({x:1460,y:320}));
		stage.insert(new Q.Coin({x:3790,y:240}));
		stage.insert(new Q.Coin({x:3820,y:240}));

		stage.insert(new Q.Coin({x:3246,y:525}));
		stage.insert(new Q.Coin({x:3276,y:525}));
		stage.insert(new Q.Coin({x:3306,y:525}));
		stage.insert(new Q.Coin({x:3336,y:525}));
		stage.insert(new Q.Coin({x:3366,y:525}));
		stage.insert(new Q.Coin({x:3396,y:525}));
		

		stage.insert(new Q.Coin({x:3246,y:490}));
		stage.insert(new Q.Coin({x:3276,y:490}));
		stage.insert(new Q.Coin({x:3306,y:490}));
		stage.insert(new Q.Coin({x:3336,y:490}));
		stage.insert(new Q.Coin({x:3366,y:490}));
		stage.insert(new Q.Coin({x:3396,y:490}));
		

		stage.insert(new Q.Coin({x:3246,y:460}));
		stage.insert(new Q.Coin({x:3276,y:460}));
		stage.insert(new Q.Coin({x:3306,y:460}));
		stage.insert(new Q.Coin({x:3336,y:460}));
		stage.insert(new Q.Coin({x:3366,y:460}));
		stage.insert(new Q.Coin({x:3396,y:460}));
		

		stage.insert(new Q.Coin({x:3246,y:430}));
		stage.insert(new Q.Coin({x:3276,y:430}));
		stage.insert(new Q.Coin({x:3306,y:430}));
		stage.insert(new Q.Coin({x:3336,y:430}));
		stage.insert(new Q.Coin({x:3366,y:430}));
		stage.insert(new Q.Coin({x:3396,y:430}));
		
	

		stage.add("viewport").follow(Q("Mario").first());
		stage.viewport.offsetX = -150;
		stage.viewport.offsetY = 160;


	});

	Q.scene("mainTitle", function(stage){	
		var button = new Q.UI.Button({
			x: Q.width/2, 
			y: Q.height/2,
			asset: "mainTitle.png"
		})
		stage.insert(button);
		button.on("click",function() {
			Q.clearStages();
			Q.state.reset({ score: 0, lives: 2 });
			Q.stageScene("level1");
			Q.stageScene("hud", 3);
		});
	});

	Q.scene('endGame',function(stage) {
		Q.audio.stop("music_main.mp3");	
		var container = stage.insert(new Q.UI.Container({
			x: Q.width/2, 
			y: Q.height/2,
			fill: "rgba(0,0,0,0.5)"
		}));
		var button = container.insert(new Q.UI.Button({ 
			x: 0,
			y: 0, 
			fill: "#CCCCCC",
			label: (Q.state.get("lives") > 0 ? "Play Again" : "GAME OVER")
		}))
		var label = container.insert(new Q.UI.Text({
			y: -10 - button.p.h,
			label: stage.options.label 
		}));
		button.on("click",function() {
			Q.clearStages();
			if( Q.state.get("lives") > 0){
				Q.stageScene('level1');
				Q.stageScene("hud", 3);
			}
			else
				Q.stageScene('mainTitle');
		});
		container.fit(20);
	});

    Q.scene("hud", function(stage) {
        var container = stage.insert(new Q.UI.Container({
            x: Q.width/3,
            y: Q.height/6,
            w: Q.width,
            h: 50,
            radius: 0
        }));
        container.insert(new Q.SCORE({
            x: container.p.x/2 - container.p.x,
            y: -container.p.y/3
        }));
        container.insert(new Q.LIVES({
            x: container.p.x/2 + container.p.x,
            y: -container.p.y/3
        }));
    });

    Q.UI.Text.extend("SCORE", {
        init: function(p) {
            this._super(p, {
                label: "SCORE: " + Q.state.get("score"),
                    color: "red",
                    size: "14"
                });
            Q.state.on("change.score", this, "update_label");
        },
 
        update_label: function(score) {
            this.p.label = "SCORE: " +  Q.state.get("score");
        }
    });

    Q.UI.Text.extend("LIVES", {
        init: function(p) {
            this._super(p, {
                label: "LIVES: " + Q.state.get("lives"),
                    color: "red",
                    size: "14"
                });
            Q.state.on("change.lives", this, "update_label");
        },
 
        update_label: function(score) {
            this.p.label = "LIVES: " + Q.state.get("lives");
        }
    });
}