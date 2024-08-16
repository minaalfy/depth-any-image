declare global {
  interface Window {
    GyroNorm: any;
  }
}

const vertex = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4( a_position, 0, 1 );
}
`;

const fragment = `
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
`;

function canAcceptChildren(element: HTMLElement): boolean {
  const selfClosingTags = ['AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'];
  return element.nodeType === 1 && !selfClosingTags.includes(element.tagName);
}

function loadImages(urls: string[]): Promise<HTMLImageElement[]> {
  const images: HTMLImageElement[] = [];
  let imagesToLoad = urls.length;

  return new Promise((resolve, reject) => {
    if (imagesToLoad === 0) {
      resolve(images);
      return;
    }

    const onImageLoad = function () {
      --imagesToLoad;
      if (imagesToLoad === 0) {
        resolve(images);
      }
    };

    const onImageError: OnErrorEventHandler = function (error) {
      reject(error);
    };

    for (let ii = 0; ii < urls.length; ++ii) {
      const image = loadImage(urls[ii], onImageLoad, onImageError);
      images.push(image);
    }
  });
}

function loadImage(url: string, onLoad: () => void, onError: OnErrorEventHandler): HTMLImageElement {
  const img = new Image();
  img.onload = onLoad;
  img.onerror = onError;
  img.src = url;
  return img;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error("Error creating shader.");
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}


class Uniform {
  private suffix: string;
  private gl: WebGLRenderingContext;
  private location: WebGLUniformLocation | null;

  constructor(name: string, suffix: string, program: WebGLProgram, gl: WebGLRenderingContext) {
    this.suffix = suffix;
    this.gl = gl;
    this.location = gl.getUniformLocation(program, name);
  }

  set(...values: number[]) {
    const method = 'uniform' + this.suffix;
    const args = [this.location].concat(values);
    (this.gl as any)[method].apply(this.gl, args); //eslint-disable-line
  }
}

class Rect {
  private buffer: WebGLBuffer;
  static verts = new Float32Array([
    -1, -1,
    1, -1,
    -1, 1,
    1, 1,
  ]);

  constructor(private gl: WebGLRenderingContext) {
    this.gl = gl;
    this.buffer = this.gl.createBuffer() as WebGLBuffer;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, Rect.verts, this.gl.STATIC_DRAW);
  }

  render() {
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }
}

export default class Image3d {
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    canvasWebGLContext: WebGLRenderingContext;
    program: WebGLProgram;
    ratio = window.devicePixelRatio;
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;
    mouseX = 0;
    mouseY = 0;
    mouseTargetX = 0;
    mouseTargetY = 0;
    width = 0;
    height = 0;
    imageURLs: string[];
    textures: WebGLTexture[] = [];
    startTime = new Date().getTime();
    imageAspect = 1;
    uRatio: Uniform;
    uResolution: Uniform;
    uThreshold: Uniform;
    uMouse: Uniform;
    uTime: Uniform;
    billboard: Rect;
    positionLocation: number;
    maxTilt = 15;
  
    constructor(imageURLs: string[], containerId: string, hth: number, vth: number) {
      this.container = document.getElementById(containerId) as HTMLElement;
      if (!this.container || !canAcceptChildren(this.container)) {
        throw new Error('Container not found or its not accepted');
      }
      this.canvas = document.createElement('canvas');
      this.container.appendChild(this.canvas);
      this.canvasWebGLContext = this.canvas.getContext('webgl')!;
      if (!this.canvasWebGLContext) {
        throw new Error('WebGL not supported');
      }
      this.program = this.canvasWebGLContext.createProgram()!;
      if (!this.program) {
        throw new Error('Error creating program');
      }
      this.billboard = new Rect(this.canvasWebGLContext);
      this.imageURLs = imageURLs;
      this.createScene();
      this.uRatio = new Uniform('pixelRatio', '1f', this.program, this.canvasWebGLContext);
      this.uResolution = new Uniform('resolution', '4f', this.program, this.canvasWebGLContext);
      this.uThreshold = new Uniform('threshold', '2f', this.program, this.canvasWebGLContext);
      this.uMouse = new Uniform('mouse', '2f', this.program, this.canvasWebGLContext);
      this.uTime = new Uniform('time', '1f', this.program, this.canvasWebGLContext);
      this.uThreshold.set(hth, vth);
      this.positionLocation = this.canvasWebGLContext.getAttribLocation(this.program, 'a_position');
      this.addTexture();
      this.mouseMove();
      this.gyro();
    }
  
    resizeHandler() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.canvas.width = this.width * this.ratio;
      this.canvas.height = this.height * this.ratio;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      let a1, a2;
      if (this.height / this.width < this.imageAspect) {
        a1 = 1;
        a2 = this.height / this.width / this.imageAspect;
      } else {
        a1 = (this.width / this.height) * this.imageAspect;
        a2 = 1;
      }
      this.uResolution.set(this.width, this.height, a1, a2);
      this.uRatio.set(1 / this.ratio);
      this.uThreshold.set(35, 15);
      this.canvasWebGLContext.viewport(0, 0, this.width * this.ratio, this.height * this.ratio);
    }
  
    resize() {
      this.resizeHandler();
      window.addEventListener('resize', this.resizeHandler.bind(this));
    }
  
    createScene() {
      const shaderVertex = createShader(this.canvasWebGLContext, this.canvasWebGLContext.VERTEX_SHADER, vertex)!;
      const shaderFragment = createShader(this.canvasWebGLContext!, this.canvasWebGLContext!.FRAGMENT_SHADER, fragment)!;
      if (shaderVertex) this.canvasWebGLContext!.attachShader(this.program, shaderVertex);
      if (shaderFragment) this.canvasWebGLContext!.attachShader(this.program, shaderFragment);
      this.canvasWebGLContext.linkProgram(this.program);
      this.canvasWebGLContext.useProgram(this.program);
      this.canvasWebGLContext.enableVertexAttribArray(this.positionLocation);
      this.canvasWebGLContext.vertexAttribPointer(this.positionLocation, 2, this.canvasWebGLContext.FLOAT, false, 0, 0);
    }
  
    async addTexture() {
      const images = await loadImages(this.imageURLs);
      this.start(images);
    }
  
    start(images: HTMLImageElement[]) {
      const gl = this.canvasWebGLContext;
      this.imageAspect = images[0].naturalHeight / images[0].naturalWidth;
      for (const image of images) {
        const texture = gl.createTexture() as WebGLTexture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Set the parameters so we can render any size image.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // Upload the image into the texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        this.textures.push(texture);
      }
      // lookup the sampler locations.
      const u_image0Location = this.canvasWebGLContext.getUniformLocation(this.program, 'image0');
      const u_image1Location = this.canvasWebGLContext.getUniformLocation(this.program, 'image1');
      // set which texture units to render with.
      this.canvasWebGLContext.uniform1i(u_image0Location, 0); // texture unit 0
      this.canvasWebGLContext.uniform1i(u_image1Location, 1); // texture unit 1
  
      this.canvasWebGLContext.activeTexture(this.canvasWebGLContext.TEXTURE0);
      this.canvasWebGLContext.bindTexture(this.canvasWebGLContext.TEXTURE_2D, this.textures[0]);
      this.canvasWebGLContext.activeTexture(this.canvasWebGLContext.TEXTURE1);
      this.canvasWebGLContext.bindTexture(this.canvasWebGLContext.TEXTURE_2D, this.textures[1]);
      // start application
      this.resize();
      this.render();
    }
  
    gyro() {
      if(!window.GyroNorm) return;
      try {
        // @ts-expect-error don't want to import the whole module
        const gn = new GyroNorm();
        gn.init({ gravityNormalized: true })
          .then(() => {
            gn.start((data) => {
              const y = data.do.gamma;
              const x = data.do.beta;
              this.mouseTargetY = clamp(x, -this.maxTilt, this.maxTilt) / this.maxTilt;
              this.mouseTargetX = -clamp(y, -this.maxTilt, this.maxTilt) / this.maxTilt;
            });
          })
          .catch((e: Error) => {
            console.log(e);
          });
      } catch (error) {
        console.log('GyroNorm not supported', error);
      }
    }
  
    mouseMove() {
      document.addEventListener('mousemove', (e) => {
        const halfX = this.windowWidth / 2;
        const halfY = this.windowHeight / 2;
        this.mouseTargetX = (halfX - e.clientX) / halfX;
        this.mouseTargetY = (halfY - e.clientY) / halfY;
      });
    }
  
    render() {
      const now = new Date().getTime();
      const currentTime = (now - this.startTime) / 1000;
      this.uTime.set(currentTime);
      // inertia
      this.mouseX += (this.mouseTargetX - this.mouseX) * 0.05;
      this.mouseY += (this.mouseTargetY - this.mouseY) * 0.05;
      this.uMouse.set(this.mouseX, this.mouseY);
      // render
      this.billboard.render();
      requestAnimationFrame(this.render.bind(this));
    }

    dispose() {
      this.canvas.remove();
      window.removeEventListener('resize', this.resizeHandler.bind(this));
      document.removeEventListener('mousemove', this.mouseMove);
    }
  }
  