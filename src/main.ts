import './prism.css';
import './style.css';
import "./prism";
import Alpine from 'alpinejs';
import { pipeline, env, RawImage, DepthEstimationPipeline } from '@xenova/transformers';
// @ts-expect-error missing types
import Clipboard from '@ryangjchandler/alpine-clipboard';
import Image3d from './image3d';
Alpine.plugin(Clipboard);

// Proxy the WASM backend to prevent the UI from freezing
env.backends.onnx.wasm.proxy = true;

Alpine.data('generator', () => ({
  theme: 'dark',
  tab: 'HTML',
  uploading: false,
  generating: false,
  imageUrl: '',
  originalFilename: '',
  depthMapUrl: '',
  animatedImage: false,
  loadingMoel: true,
  loadingImage: false,
  loadingDepthMap: false,
  generatingAnimation: false,
  depth_estimator: null as DepthEstimationPipeline | null,
  image3d: null as Image3d | null,
  vtv: 15,
  htv: 35,

  init: async function () {
    if (localStorage.getItem('color-theme')) {
      this.theme = localStorage.getItem('color-theme') as string;
      document.documentElement.dataset.theme = localStorage.getItem('color-theme') as string;
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.theme = 'dark';
        document.documentElement.dataset.theme = 'dark';
        localStorage.setItem('color-theme', 'dark');
      } else {
        this.theme = 'light';
        document.documentElement.dataset.theme = 'light';
        localStorage.setItem('color-theme', 'light');
      }
    }
    this.depth_estimator = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
    this.loadingMoel = false;

    this.$watch('vtv', () => {
      if (this.image3d) {
        this.image3d.updateThreshold(this.htv, this.vtv);
        // @ts-expect-error Prism imported globally
        Prism.highlightAll()
      }
    });
    this.$watch('htv', () => {
      if (this.image3d) {
        this.image3d.updateThreshold(this.htv, this.vtv);
        // @ts-expect-error Prism imported globally
        Prism.highlightAll()
      }
    });
  },

  toggleTheme: function () {
    if (localStorage.getItem('color-theme')) {
      if (localStorage.getItem('color-theme') === 'light') {
        this.theme = 'dark';
        document.documentElement.dataset.theme = 'dark';
        localStorage.setItem('color-theme', 'dark');
      } else {
        this.theme = 'light';
        document.documentElement.dataset.theme = 'light';
        localStorage.setItem('color-theme', 'light');
      }
    } else {
      if (document.documentElement.classList.contains('dark')) {
        this.theme = 'light';
        document.documentElement.dataset.theme = 'light';
        localStorage.setItem('color-theme', 'light');
      } else {
        this.theme = 'dark';
        document.documentElement.dataset.theme = 'dark';
        localStorage.setItem('color-theme', 'dark');
      }
    }
  },

  handleFileSelect: async function (e: Event) {
    this.uploading = true;
    this.imageUrl = '';
    this.depthMapUrl = '';
    this.loadingImage = true;
    this.loadingDepthMap = false;
    this.generatingAnimation = false;
    this.animatedImage = false;

    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e2) => {
      this.uploading = false;
      this.loadingImage = false;
      const url = e2.target!.result as string;
      this.imageUrl = url;
      this.originalFilename = file.name;
      this.loadingDepthMap = true;

      if (this.depth_estimator) {
        const image = await RawImage.fromURL(url);
        // @ts-expect-error missing types
        const { depth } = await this.depth_estimator._call(image);
        const mime = 'image/png';
        const blob = await depth.toBlob(mime);
        const dataURL = URL.createObjectURL(blob);
        this.depthMapUrl = dataURL;
        this.loadingDepthMap = false;
        this.generatingAnimation = true;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.animatedImage = true;
        this.image3d = new Image3d([url, dataURL], 'gl', this.htv, this.vtv);
        await new Promise((resolve) => setTimeout(resolve, 100));
        window.dispatchEvent(new Event('resize'));
        this.generatingAnimation = false;
      }
    };
    reader.readAsDataURL(file);
  },

  htmlContent: function() {
    return `<script src="path/to/image3d.js"></script>
<script>new Image3d(['path/to/original/image', 'path/to/depthmap/image'], 'containerId', ${this.htv || 35}, ${this.vtv || 15})</script>
`},
    reactContent: function() {
      return `import {useLayoutEffect} from 'react';
import Image3d from './image3d';

const Image3dComponent = () => {
  useLayoutEffect(() => {
    const image3d = new Image3d(['path/to/original/image', 'path/to/depthmap/image'], 'containerId', ${this.htv || 35}, ${this.vtv || 15});
    return () => image3d.dispose();
  }, []);
  return <div id="containerId" style={{width: '100vw', height: '100vh'}} />;
};`},
}));
Alpine.start();
