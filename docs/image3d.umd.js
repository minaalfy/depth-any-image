(function(a,n){typeof exports=="object"&&typeof module<"u"?module.exports=n():typeof define=="function"&&define.amd?define(n):(a=typeof globalThis<"u"?globalThis:a||self,a.Image3d=n())})(this,function(){"use strict";var p=Object.defineProperty;var b=(a,n,h)=>n in a?p(a,n,{enumerable:!0,configurable:!0,writable:!0,value:h}):a[n]=h;var i=(a,n,h)=>b(a,typeof n!="symbol"?n+"":n,h);function a(o){const e=["AREA","BASE","BR","COL","COMMAND","EMBED","HR","IMG","INPUT","KEYGEN","LINK","META","PARAM","SOURCE","TRACK","WBR"];return o.nodeType===1&&!e.includes(o.tagName)}function n(o){const e=[];let t=o.length;return new Promise((s,r)=>{if(t===0){s(e);return}const l=function(){--t,t===0&&s(e)},d=function(m){r(m)};for(let m=0;m<o.length;++m){const L=h(o[m],l,d);e.push(L)}})}function h(o,e,t){const s=new Image;return s.onload=e,s.onerror=t,s.src=o,s}function v(o,e,t){return Math.min(Math.max(o,e),t)}function x(o,e,t){const s=o.createShader(e);return s?(o.shaderSource(s,t),o.compileShader(s),o.getShaderParameter(s,o.COMPILE_STATUS)?s:(console.error("Error compiling shader:",o.getShaderInfoLog(s)),o.deleteShader(s),null)):(console.error("Error creating shader."),null)}class c{constructor(e,t,s,r){i(this,"suffix");i(this,"gl");i(this,"location");this.suffix=t,this.gl=r,this.location=r.getUniformLocation(s,e)}set(...e){const t="uniform"+this.suffix,s=[this.location].concat(e);this.gl[t].apply(this.gl,s)}}const u=class u{constructor(e){i(this,"buffer");this.gl=e,this.gl=e,this.buffer=this.gl.createBuffer(),this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.buffer),this.gl.bufferData(this.gl.ARRAY_BUFFER,u.verts,this.gl.STATIC_DRAW)}render(){this.gl.drawArrays(this.gl.TRIANGLE_STRIP,0,4)}};i(u,"verts",new Float32Array([-1,-1,1,-1,-1,1,1,1]));let g=u;const f=`
attribute vec2 a_position;

void main() {
  gl_Position = vec4( a_position, 0, 1 );
}
`,T=`
#ifdef GL_ES
  precision mediump float;
#endif

uniform vec4 resolution;
uniform vec2 mouse;
uniform vec2 threshold;
uniform float time;
uniform float pixelRatio;
uniform sampler2D image0;
uniform sampler2D image1;


vec2 mirrored(vec2 v) {
  vec2 m = mod(v,2.);
  return mix(m,2.0 - m, step(1.0 ,m));
}

void main() {
  // uvs and textures
  vec2 uv = pixelRatio*gl_FragCoord.xy / resolution.xy ;
  vec2 vUv = (uv - vec2(0.5))*resolution.zw + vec2(0.5);
  vUv.y = 1. - vUv.y;
  vec4 tex1 = texture2D(image1,mirrored(vUv));
  vec2 fake3d = vec2(vUv.x + (tex1.r - 0.5)*mouse.x/threshold.x, vUv.y + (tex1.r - 0.5)*mouse.y/threshold.y);
  gl_FragColor = texture2D(image0,mirrored(fake3d));
}
`;class E{constructor(e,t){i(this,"container");i(this,"canvas");i(this,"canvasWebGLContext");i(this,"program");i(this,"ratio",window.devicePixelRatio);i(this,"windowWidth",window.innerWidth);i(this,"windowHeight",window.innerHeight);i(this,"mouseX",0);i(this,"mouseY",0);i(this,"mouseTargetX",0);i(this,"mouseTargetY",0);i(this,"width",0);i(this,"height",0);i(this,"imageURLs");i(this,"textures",[]);i(this,"startTime",new Date().getTime());i(this,"imageAspect",1);i(this,"uRatio");i(this,"uResolution");i(this,"uThreshold");i(this,"uMouse");i(this,"uTime");i(this,"billboard");i(this,"positionLocation");i(this,"maxTilt",15);if(this.container=document.getElementById(t),!this.container||!a(this.container))throw new Error("Container not found or its not accepted");if(this.canvas=document.createElement("canvas"),this.container.appendChild(this.canvas),this.canvasWebGLContext=this.canvas.getContext("webgl"),!this.canvasWebGLContext)throw new Error("WebGL not supported");if(this.program=this.canvasWebGLContext.createProgram(),!this.program)throw new Error("Error creating program");this.billboard=new g(this.canvasWebGLContext),this.imageURLs=e,this.createScene(),this.uRatio=new c("pixelRatio","1f",this.program,this.canvasWebGLContext),this.uResolution=new c("resolution","4f",this.program,this.canvasWebGLContext),this.uThreshold=new c("threshold","2f",this.program,this.canvasWebGLContext),this.uMouse=new c("mouse","2f",this.program,this.canvasWebGLContext),this.uTime=new c("time","1f",this.program,this.canvasWebGLContext),this.positionLocation=this.canvasWebGLContext.getAttribLocation(this.program,"a_position"),this.addTexture(),this.mouseMove(),this.gyro()}resizeHandler(){this.windowWidth=window.innerWidth,this.windowHeight=window.innerHeight,this.width=this.container.offsetWidth,this.height=this.container.offsetHeight,this.canvas.width=this.width*this.ratio,this.canvas.height=this.height*this.ratio,this.canvas.style.width=this.width+"px",this.canvas.style.height=this.height+"px";let e,t;this.height/this.width<this.imageAspect?(e=1,t=this.height/this.width/this.imageAspect):(e=this.width/this.height*this.imageAspect,t=1),this.uResolution.set(this.width,this.height,e,t),this.uRatio.set(1/this.ratio),this.uThreshold.set(35,15),this.canvasWebGLContext.viewport(0,0,this.width*this.ratio,this.height*this.ratio)}updateThreshold(e,t){this.uThreshold.set(e,t)}resize(){this.resizeHandler(),window.addEventListener("resize",this.resizeHandler.bind(this))}createScene(){const e=x(this.canvasWebGLContext,this.canvasWebGLContext.VERTEX_SHADER,f),t=x(this.canvasWebGLContext,this.canvasWebGLContext.FRAGMENT_SHADER,T);e&&this.canvasWebGLContext.attachShader(this.program,e),t&&this.canvasWebGLContext.attachShader(this.program,t),this.canvasWebGLContext.linkProgram(this.program),this.canvasWebGLContext.useProgram(this.program),this.canvasWebGLContext.enableVertexAttribArray(this.positionLocation),this.canvasWebGLContext.vertexAttribPointer(this.positionLocation,2,this.canvasWebGLContext.FLOAT,!1,0,0)}async addTexture(){const e=await n(this.imageURLs);this.start(e)}start(e){const t=this.canvasWebGLContext;this.imageAspect=e[0].naturalHeight/e[0].naturalWidth;for(const l of e){const d=t.createTexture();t.bindTexture(t.TEXTURE_2D,d),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,l),this.textures.push(d)}const s=this.canvasWebGLContext.getUniformLocation(this.program,"image0"),r=this.canvasWebGLContext.getUniformLocation(this.program,"image1");this.canvasWebGLContext.uniform1i(s,0),this.canvasWebGLContext.uniform1i(r,1),this.canvasWebGLContext.activeTexture(this.canvasWebGLContext.TEXTURE0),this.canvasWebGLContext.bindTexture(this.canvasWebGLContext.TEXTURE_2D,this.textures[0]),this.canvasWebGLContext.activeTexture(this.canvasWebGLContext.TEXTURE1),this.canvasWebGLContext.bindTexture(this.canvasWebGLContext.TEXTURE_2D,this.textures[1]),this.resize(),this.render()}gyro(){try{const e=new GyroNorm;e.init({gravityNormalized:!0}).then(()=>{e.start(t=>{const s=t.do.gamma,r=t.do.beta;this.mouseTargetY=v(r,-this.maxTilt,this.maxTilt)/this.maxTilt,this.mouseTargetX=-v(s,-this.maxTilt,this.maxTilt)/this.maxTilt})}).catch(t=>{console.log(t)})}catch(e){console.log("GyroNorm not supported",e)}}mouseMove(){document.addEventListener("mousemove",e=>{const t=this.windowWidth/2,s=this.windowHeight/2;this.mouseTargetX=(t-e.clientX)/t,this.mouseTargetY=(s-e.clientY)/s})}render(){const t=(new Date().getTime()-this.startTime)/1e3;this.uTime.set(t),this.mouseX+=(this.mouseTargetX-this.mouseX)*.05,this.mouseY+=(this.mouseTargetY-this.mouseY)*.05,this.uMouse.set(this.mouseX,this.mouseY),this.billboard.render(),requestAnimationFrame(this.render.bind(this))}}return E});
