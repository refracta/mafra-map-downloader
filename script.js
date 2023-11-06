let map = git.map;
let view = map.getView();
let size = map.getSize();
size = size.map(Math.floor);
let resolution = view.getResolution();
let screenMeters = size.map(s => s * resolution);

let numInFlightTiles = 0;
map.getLayers().forEach(function (layer) {
    let source = layer.getSource();
    if (source instanceof ol.source.TileImage) {
        source.on('tileloadstart', function () {++numInFlightTiles})
        source.on('tileloadend', function () {--numInFlightTiles})
    }
})

map.on('postrender', function (evt) {
    if (!evt.frameState)
        return;

    let numHeldTiles = 0;
    let wanted = evt.frameState.wantedTiles;
    for (let layer in wanted)
        if (wanted.hasOwnProperty(layer))
            numHeldTiles += Object.keys(wanted[layer]).length;

    let ready = numInFlightTiles === 0 && numHeldTiles === 0;
    if (map.get('ready') !== ready)
        map.set('ready', ready);
});

map.set('ready', false);

function whenMapIsReady(callback) {
    if (map.get('ready'))
        callback();
    else
        map.once('change:ready', whenMapIsReady.bind(null, callback));
}


function waitRendering() {
    return new Promise(resolve => {
        map.once('postrender', () => {
			whenMapIsReady(resolve);
		});
    });
}

function getOutline() {
    let canvas = document.querySelector('canvas');
    let ctx = canvas.getContext('2d');
    let image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let pixels = image.data;
    let width = image.width;
    let height = image.height;
    let up = [];
    let down = [];
    let left = [];
    let right = [];
    
    for (let x = 0; x < width; x++) {
        up.push(pixels.slice(x * 4, x * 4 + 4));
        down.push(pixels.slice((width * (height - 1) + x) * 4, (width * (height - 1) + x) * 4 + 4));
    }
    
    for (let y = 0; y < height; y++) {
        left.push(pixels.slice(y * width * 4, y * width * 4 + 4));
        right.push(pixels.slice((y * width + (width - 1)) * 4, (y * width + (width - 1)) * 4 + 4));
    }
    return {up, down, left, right};
}

function arePixelArraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < 4; j++) {
      if (arr1[i][j] !== arr2[i][j]) {
        return false;
      }
    }
  }
  return true;
}

function saveCanvas() {
	var canvas=document.querySelector("canvas"),dataURL=canvas.toDataURL("image/png"),link=document.createElement("a");link.href=dataURL,link.download="canvas-image.png",document.body.appendChild(link),link.click(),document.body.removeChild(link);
}
saveCanvas();
let l1 = getOutline();
let center = view.getCenter();
view.setCenter([center[0] + screenMeters[0], center[1]]);
await waitRendering();
let l2 = getOutline();
while (true) {
	center = view.getCenter();
	view.setCenter([center[0] - resolution, center[1]]);
	await waitRendering();
	l2 = getOutline();
	if(arePixelArraysEqual(l1.right, l2.left)) {
		view.setCenter([center[0] + resolution, center[1]]);
		await waitRendering();
		break;
	}
}
saveCanvas()
