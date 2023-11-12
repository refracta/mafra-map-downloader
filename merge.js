const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

let coordinates = fs.readdirSync('images').map(f => f.split('.png')[0].split('x').map(e => parseInt(e))).map(e => ({
    x: e[0],
    y: e[1]
}));
console.log(coordinates);

let maxX = -Infinity, maxY = -Infinity;
coordinates.forEach(coord => {
    maxX = Math.max(maxX, coord.x);
    maxY = Math.max(maxY, coord.y);
});

sharp('images/0x0.png').metadata().then(metadata => {
    const tileWidth = metadata.width;
    const tileHeight = metadata.height;
    const canvasWidth = tileWidth * (maxX + 1);
    const canvasHeight = tileHeight * (maxY + 1);

    let canvas = sharp({
        create: {
            width: canvasWidth,
            height: canvasHeight,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
            }
        }
        , limitInputPixels: canvasWidth * canvasHeight
    });

    let imageComposites = [];
    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
            const imagePath = path.join(__dirname + '/images/', `${x}x${y}.png`);
            if (fs.existsSync(imagePath)) {
                imageComposites.push({
                    input: imagePath,
                    top: y * tileHeight,
                    left: x * tileWidth
                });
            }
        }
    }

    canvas.composite(imageComposites).toFile('output.png', (err, info) => {
        if (err) {
            console.error('Error saving image:', err);
            return;
        }
        console.log('Image saved:', info);
    });
}).catch(err => {
    console.error('Error reading image size:', err);
});