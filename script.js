const canvas = document.querySelector("canvas");
/* @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

class Vec3 {
	constructor(x,y,z){
		if(typeof(x) === "number"){
			[this.x, this.y, this.z] = [x, y, z];
		}
		else{
			[this.x, this.y, this.z] = [x.x, x.y, x.z];
		}
	}

	scalaProduct(v){
		return this.x*v.x + this.y*v.y + this.z*v.z;
	}
	
	vectorProduct(v){
		return new Vec3(this.y*v.z-this.z*v.y, -this.x*v.z+this.z*v.x, this.x*v.y-this.y*v.x);
	}

	sub(v){
		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;
		return this;
	}

	add(v){
		this.x += v.x;
		this.y += v.y;
		this.z += v.z;
		return this;
	}

	mul(n){
		this.x *= n;
		this.y *= n;
		this.z *= n;
		return this;
	}

	div(n){
		this.x /= n;
		this.y /= n;
		this.z /= n;
		return this;
	}

	abs(){
		return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	}

	normalization(){
		return this.div(this.abs());
	}

	toString(){
		return "< "+this.x+", "+this.y+", "+this.z+" >";
	}	
}

function fromToVector(fromVec3, toVec3){
	//to - from
	return new Vec3(toVec3).sub(fromVec3);
}


class Face {
	//선을 먼저 그릴 수 있는 지 확인 후 점들을 이어서 내부를 채울 것;
	constructor(...vectors){
		if(vectors === undefined || vectors === null) throw "vectors can't be null";
		if(vectors.length < 3) throw "this is not Face";
		this.list = vectors;
		this.faceVec = fromToVector(vectors[1], vectors[0]).vectorProduct(fromToVector(vectors[1], vectors[2]));
		
		this.faceCenterPosition = new Vec3(vectors[0]);
		for(let i = 1; i < vectors.length; i++){
			this.faceCenterPosition.add(vectors[i]);
		}
		this.faceCenterPosition.div(vectors.length);
	}

	drawFace(color){
		let cameraToFaceVector = fromToVector(Camera.position, this.faceCenterPosition);
		let hiddenSystem = this.faceVec.scalaProduct(cameraToFaceVector);
		if(hiddenSystem >= 0) return;

		//delete dots back of the camera;
		let visiblePoint = this.list.map(vector => {
			let cameraToPoint = fromToVector(Camera.position, vector);
			return cameraToPoint.scalaProduct(Camera.angle) > 0;
		});
		
		let screenPoint = [];
		let index = { prev: visiblePoint.length-1, curr: 0, next: 1 };
		let flag = { prev: visiblePoint.length-1, curr: 0, next: 1 };

		for(let i = 0; i < visiblePoint.length; i++){
			index.curr = i;
			index.next = i < visiblePoint.length-1 ? i+1 : 0;
			Object.entries(index).forEach(([key, value]) => flag[key] = visiblePoint[value] );

			if(flag.curr){
				screenPoint.push( Screen.getAxisPos(this.list[index.curr]) );
			}
			else{
				if(flag.prev){
					screenPoint.push( Screen.getFixedAxisPos(this.list[index.prev], this.list[index.curr]) );
				}
				if(flag.next){
					screenPoint.push( Screen.getFixedAxisPos(this.list[index.next], this.list[index.curr]) );
				}
			}
			index.prev = i;
		}

		//delete dots back of the camera;
		if(screenPoint.length < 3) return;
		
		ctx.beginPath();
		ctx.moveTo(Screen.width/2 + screenPoint[0].x, Screen.height/2 - screenPoint[0].y);
		
		for(let i = 1; i < screenPoint.length; i++){
			ctx.lineTo(Screen.width/2 + screenPoint[i].x, Screen.height/2 - screenPoint[i].y);
		}
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
		
		this.drawWireFrame("gray");
	}

	drawWireFrame(color){
		for(let i = 1; i < this.list.length; i++){
			Screen.drawLine(this.list[i-1], this.list[i], color);
		}
		Screen.drawLine(this.list[this.list.length-1], this.list[0], color);
	}


}

class Box {
	constructor(...arr){
		if(arr.length === 4){

		}
		else if(arr.length === 6){

		}
		else throw "ERROR: Box is not box!";
	}
}

var Screen = {
	width: 0,
	height: 0,
	resize:function(){
		Screen.width = canvas.width = window.innerWidth;
		Screen.height = canvas.height = window.innerHeight;
		
		Camera.updatePosition();
		Camera.updateAngle();
		
		Screen.draw();
	},
	getAxisPos: function(pos){ 
		//3d position to 2d screen position
		let cr = fromToVector(Camera.position, pos);
		let u = new Vec3(cr).normalization();
		let E = Camera.angle;
		let d = Camera.distance;
		let crDotE = E.scalaProduct(cr);
		
		if(crDotE === 0){
			return new Vec3(0, 0, true);
		}
		
		let L = new Vec3(u).mul(cr.abs()/crDotE).sub(E).mul(d);
		return new Vec3(L.scalaProduct(Camera.getBasisAxisX()), L.scalaProduct(Camera.getBasisAxisY()), crDotE > 0);
	},
	getFixedAxisPos:function(inV, outV){
		let E = Camera.angle;
		let invertE = new Vec3(0,0,0).sub(E);
		let inVoutV = fromToVector(inV, outV);
		let CinV = fromToVector(Camera.position, inV);
		let d = Camera.distance;
		
		let target = inVoutV.mul((E.scalaProduct(CinV) - d) / invertE.scalaProduct(inVoutV));
		target.add(inV).sub(Camera.position).sub(new Vec3(E).mul(d));
		
		//console.log(E.scalaProduct(target));
		
		return new Vec3(target.scalaProduct(Camera.getBasisAxisX()), target.scalaProduct(Camera.getBasisAxisY()), true);
	},
	drawDot: function(/* @type {vec3}*/pos){
		let v = Screen.getAxisPos(pos);
		if(v.z === false) return;
		
		ctx.beginPath();
		ctx.arc(Screen.width/2 + v.x, Screen.height/2 - v.y, 2, 0, 2*Math.PI, true);
		ctx.fillStyle = "white";
		ctx.closePath();
		ctx.fill();
	},
	drawLine: function(from, to, color){
		let fromW = Screen.getAxisPos(from);
		let toW = Screen.getAxisPos(to);
		if(fromW.z === false && toW.z === false) return;
		else{
			if(fromW.z === false) fromW = Screen.getFixedAxisPos(to, from);
			if(toW.z === false) toW = Screen.getFixedAxisPos(from, to);
		}
		
		ctx.beginPath();
		ctx.moveTo(Screen.width/2 + fromW.x, Screen.height/2 - fromW.y);
		ctx.lineTo(Screen.width/2 + toW.x, Screen.height/2 - toW.y);
		ctx.lineWidth = 3;
		ctx.strokeStyle = typeof(color) === "undefined" ? "white" : color;
		ctx.stroke();
	},
	draw:function(){
		ctx.clearRect(0, 0, Screen.width, Screen.height);
		let d = 0.5;
		
		let boxVectors = [
			new Vec3(d, d, d),
			new Vec3(-d, d, d),
			new Vec3(-d, d, -d),
			new Vec3(d, d, -d),
			new Vec3(d, -d, d),
			new Vec3(-d, -d, d),
			new Vec3(-d, -d, -d),
			new Vec3(d, -d, -d)
			];
		
		let boxFaces = [
			new Face(boxVectors[0], boxVectors[1], boxVectors[2], boxVectors[3]),
			new Face(boxVectors[4], boxVectors[5], boxVectors[1], boxVectors[0]),
			new Face(boxVectors[5], boxVectors[6], boxVectors[2], boxVectors[1]),
			new Face(boxVectors[6], boxVectors[7], boxVectors[3], boxVectors[2]),
			new Face(boxVectors[7], boxVectors[4], boxVectors[0], boxVectors[3]),
			new Face(boxVectors[7], boxVectors[6], boxVectors[5], boxVectors[4])
			];
		
		for(let i = 0; i < 6; i++){
			boxFaces[i].drawFace("skyblue");
		}
		
		//xyz axis
		//Screen.drawLine(new vec3(0,0,0), new vec3(20,0,0), "red");
		//Screen.drawLine(new vec3(0,0,0), new vec3(0,20,0), "green");
		//Screen.drawLine(new vec3(0,0,0), new vec3(0,0,20), "blue");
	}
};

var Camera = {
	position: new Vec3(0, 0, 0),
	angle: new Vec3(1, 0, 0),
	angleV: 0,
	angleH: 0,
	distance: 0.4,
	basisX: new Vec3(0,0,-1),
	basisY: new Vec3(0,1,0),
	updatePosition: function(){
		
	},
	updateAngle: function(){
		if(Camera.angleV > Math.PI/2) Camera.angleV = Math.PI/2;
		else if(Camera.angleV < -Math.PI/2) Camera.angleV = -Math.PI/2;

		Camera.angle.x = Math.cos(Camera.angleV)*Math.cos(Camera.angleH);
		Camera.angle.y = Math.sin(Camera.angleV);
		Camera.angle.z = Math.cos(Camera.angleV)*Math.sin(Camera.angleH);
		
		Camera.basisX.x = Math.cos(Camera.angleV)*Math.sin(Camera.angleH);
		Camera.basisX.y = 0;
		Camera.basisX.z = -Math.cos(Camera.angleV)*Math.cos(Camera.angleH);
		
		Camera.basisY.x = -Math.sin(Camera.angleV)*Math.cos(Camera.angleH);
		Camera.basisY.y = Math.cos(Camera.angleV);
		Camera.basisY.z = -Math.sin(Camera.angleV)*Math.sin(Camera.angleH);
		
		let max = Screen.width > Screen.height ? Screen.width : Screen.height;
		
		Camera.basisX.mul(-max);
		Camera.basisY.mul(max);
	},
	getBasisAxisX:function(){
		return Camera.basisX;
	},
	getBasisAxisY:function(){
		return Camera.basisY;
	}
};

var Mouse = {
	clicked: false,
	startPosition:[0, 0],
	startAngle:[0, 0]
};

function init(){
	Screen.resize();
	
	let d = 1;
	Camera.position.x = -d;
	Camera.position.y = d;
	Camera.position.z = -d;
	
	Camera.angleV = -Math.PI / 6;
	Camera.angleH = Math.PI / 4;
	Camera.updateAngle();
	
	window.addEventListener("resize", Screen.resize);
	
	canvas.addEventListener("touchstart",function(e){
		if(e.touches[0].pageX > Screen.width/2){
			Camera.position.x += 0.3;
		}
		else{
			Camera.position.x -= 0.3;
		}
		let pos = Camera.position;
		//console.log("camera pos:", pos.x, pos.y, pos.z);
		Camera.updateAngle();
		
		Screen.draw();
	});

	window.addEventListener("keydown", function(event){
		switch(event.key){
			case "w": Camera.position.add(new Vec3(Camera.angle).mul(0.3)); break;
			case "a": Camera.position.sub(new Vec3(Camera.getBasisAxisX()).div(Camera.getBasisAxisX().abs()).mul(0.3)); break;
			case "s": Camera.position.sub(new Vec3(Camera.angle).mul(0.3)); break;
			case "d": Camera.position.add(new Vec3(Camera.getBasisAxisX()).div(Camera.getBasisAxisX().abs()).mul(0.3)); break;
			case "q": Camera.position.y += 0.3; break;
			case "e": Camera.position.y -= 0.3; break;

			case "ArrowUp": Camera.angleV += 0.05; Camera.updateAngle(); break;
			case "ArrowDown": Camera.angleV -= 0.05; Camera.updateAngle(); break;
			case "ArrowLeft": Camera.angleH += 0.05; Camera.updateAngle(); break;
			case "ArrowRight": Camera.angleH -= 0.05; Camera.updateAngle(); break;
		}

		Screen.draw();
	});

	window.addEventListener("keyup", function(event){

	});

	window.addEventListener("mousedown", function(event){
		if(event.which === 1){
			Mouse.clicked = true;
			Mouse.startPosition = [event.screenX, event.screenY];
			Mouse.startAngle = [Camera.angleH, Camera.angleV]
		}
	});

	window.addEventListener("mousemove", function(event){
		if(Mouse.clicked){
			let deltaX = Mouse.startPosition[0] - event.screenX;
			let deltaY = Mouse.startPosition[1] - event.screenY;

			Camera.angleH = deltaX * 0.001 + Mouse.startAngle[0];
			Camera.angleV = deltaY * 0.001 + Mouse.startAngle[1];
			Camera.updateAngle();
			Screen.draw();
		}
	});

	window.addEventListener("mousewheel", function(event){
		//console.log(event.deltaY);
	});

	window.addEventListener("mouseup", function(event){
		if(event.which === 1)
			Mouse.clicked = false;
	});

	
	Screen.draw();
}
init();