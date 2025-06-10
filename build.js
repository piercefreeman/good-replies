const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [
    'src/popup.ts',
    'src/content.ts',
    'src/background.ts'
  ],
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'chrome100',
  minify: !isWatch,
  sourcemap: isWatch,
};

async function buildCSS() {
  try {
    await execAsync('./node_modules/.bin/tailwindcss -i src/styles.css -o dist/styles.css --minify');
    console.log('CSS built successfully!');
  } catch (error) {
    console.error('CSS build failed:', error);
    throw error;
  }
}

async function build() {
  try {
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }
    fs.mkdirSync('dist', { recursive: true });

    // Copy static files
    fs.copyFileSync('manifest.json', 'dist/manifest.json');
    if (fs.existsSync('popup.html')) {
      fs.copyFileSync('popup.html', 'dist/popup.html');
    }

    // Build CSS
    await buildCSS();

    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build completed successfully!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();