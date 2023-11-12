// ==UserScript==
// @name         농지공간포털 지도 다운로더
// @version      0.2
// @description  농지공간포털의 지도를 다운로드 하는 스크립트입니다. 빨간색 버튼을 클릭하면 다운로드가 시작됩니다.
// @author       refracta
// @match        https://njy.mafra.go.kr/map/mapMain.do
// @icon         https://www.google.com/s2/favicons?sz=64&domain=go.kr
// @grant        none
// @license MIT
// ==/UserScript==

(async function () {
    function waitFor(checkFunction, checkDelay = 100) {
        return new Promise(resolve => {
            let i = setInterval(_ => {
                try {
                    let check = checkFunction();
                    check ? clearInterval(i) || resolve(check) : void 0
                } catch (e) {
                }
            }, checkDelay);
        });
    }

    let map = await waitFor(_ => git.map);
    map.getView().setZoom(13);
    map.getView().setCenter([268228.91755557084, 441646.6275384163]);

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    function hashImageData(imageData) {
        return imageData.data.reduce((hash, byte) => hash + byte, 0);
    }

    function waitCanvas(samplingTime = 250, n = 4) {
        let canvas = document.querySelector('canvas');
        return new Promise(async (resolve, reject) => {
            const context = canvas.getContext('2d');
            let queue = [hashImageData(context.getImageData(0, 0, canvas.width, canvas.height))];
            let currentHash;
            do {
                await sleep(samplingTime);
                currentHash = hashImageData(context.getImageData(0, 0, canvas.width, canvas.height));
                queue.push(currentHash);
                queue = queue.slice(-n);
            } while (!(queue.length === n && queue.reduce((a, c) => a && currentHash === c, true)))
            resolve();
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

    function setAirMode(visible) {
        git.layer.getLayerById('AIR_21', map).setVisible(visible);
    }

    function arePixelArraysEqual(arr1, arr2, missRate = 0) {
        if (arr1.length !== arr2.length) {
            return false;
        }
        if (missRate === 0) {
            for (let i = 0; i < arr1.length; i++) {
                for (let j = 0; j < 4; j++) {
                    if (arr1[i][j] !== arr2[i][j]) {
                        return false;
                    }
                }
            }
            return true;
        } else {
            let count = 0;
            for (let i = 0; i < arr1.length; i++) {
                for (let j = 0; j < 4; j++) {
                    if (arr1[i][j] !== arr2[i][j]) {
                        count++;
                    }
                }
            }
            return count / (arr1.length * 4) < missRate;
        }
    }

    function saveCanvas(name = 'canvas-image.png') {
        console.log(`saveCanvas(${name})`);
        let canvas = document.querySelector("canvas");
        let dataURL = canvas.toDataURL("image/png");
        let link = document.createElement("a");
        link.href = dataURL;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function createElement(str) {
        let div = document.createElement('div');
        div.innerHTML = str;
        let container = document.createDocumentFragment();
        for (let i = 0; i < div.childNodes.length; i++) {
            let node = div.childNodes[i].cloneNode(true);
            container.appendChild(node);
        }
        return container.childNodes[0];
    }

    document.querySelector('.mapControl_list').append(createElement(`<li>
    <div id="autoDownload" class="item">
    <a href="#" title="다운로드" class="btn btn_map_control15" style="background-color: red">
        <span>다운로드</span>
    </a>
    </div>
</li>`));

    function updateText(text) {
        let pinpoint = document.querySelector('.location_wrap > .pinpoint');
        let notificationBar = document.querySelector('#notification-bar');
        if (!notificationBar) {
            let span = document.createElement('span');
            span.id = 'notification-bar';
            pinpoint.append(span);
            notificationBar = span;
        }
        notificationBar.textContent = ' ※ ' + text;
    }

    document.querySelector('#autoDownload').addEventListener('click', async e => {
        await waitCanvas();
        let view = map.getView();
        let size = map.getSize();
        size = size.map(Math.floor);
        let resolution = view.getResolution();
        let screenMeters = size.map(s => s * resolution);
        let startCenter = window.startCenter || view.getCenter();
        view.setCenter(startCenter);
        await waitCanvas();
        let range2D = window.range2D || [1000, 200];
        range2D[1] = -range2D[1];
        let airMode = window.airMode !== undefined ? window.airMode : true;
        let endCenter = startCenter.map((e, i) => e + range2D[i]);

        async function move(x, y) {
            view.setCenter([x, y]);
            await waitCanvas();
        }

        async function moveRelative(xDelta, yDelta) {
            let center = view.getCenter();
            await move(center[0] + xDelta, center[1] + yDelta);
        }

        const deltaMap = {};

        async function movePrecisely(direction, previousOutline) {
            console.log(`movePrecisely(${direction})`);
            if (direction === 'up') {
                await moveRelative(0, screenMeters[1] + resolution);
            } else if (direction === 'down') {
                await moveRelative(0, -screenMeters[1] - resolution);
            } else if (direction === 'left') {
                await moveRelative(-screenMeters[0] - resolution, 0);
            } else if (direction === 'right') {
                await moveRelative(screenMeters[0] + resolution, 0);
            }

            let center = view.getCenter();
            let counter = 1;
            let deltas = Object.keys(deltaMap).sort((a, b) => deltaMap[b] - deltaMap[a]);
            while (true) {
                let delta;
                if (deltas.length > 0) {
                    delta = deltas.shift();
                } else {
                    delta = counter;
                    while (deltaMap[delta]) {
                        delta++;
                    }
                    counter = delta + 1;
                }
                console.log(`center=${center} direction=${direction}, delta=${delta}, deltaMap=${JSON.stringify(deltaMap)}`);

                if (direction === 'up') {
                    await move(center[0], center[1] - resolution * delta);
                } else if (direction === 'down') {
                    await move(center[0], center[1] + resolution * delta);
                } else if (direction === 'left') {
                    await move(center[0] + resolution * delta, center[1]);
                } else if (direction === 'right') {
                    await move(center[0] - resolution * delta, center[1]);
                }

                let pixelCheck;
                if (direction === 'up') {
                    pixelCheck = arePixelArraysEqual(previousOutline.up, getOutline().down);
                } else if (direction === 'down') {
                    pixelCheck = arePixelArraysEqual(previousOutline.down, getOutline().up);
                } else if (direction === 'left') {
                    pixelCheck = arePixelArraysEqual(previousOutline.left, getOutline().right);
                } else if (direction === 'right') {
                    pixelCheck = arePixelArraysEqual(previousOutline.right, getOutline().left);
                }

                if (pixelCheck) {
                    if (direction === 'up') {
                        await moveRelative(0, resolution);
                    } else if (direction === 'down') {
                        await moveRelative(0, -resolution);
                    } else if (direction === 'left') {
                        await moveRelative(-resolution, 0);
                    } else if (direction === 'right') {
                        await moveRelative(resolution, 0);
                    }
                    deltaMap[delta] = deltaMap[delta] === undefined ? 1 : deltaMap[delta] + 1;
                    return;
                }
            }
        }

        console.log(`Size: ${size}`);
        console.log(`Resolution: ${resolution}`);
        console.log(`screenMeters: ${screenMeters}`);
        console.log(`startCenter: ${startCenter}`);
        console.log(`endCenter: ${endCenter}`);

        let outline = getOutline();
        let newCenter = startCenter;
        for (let y = startCenter[1], yCount = 0;
             y > endCenter[1];
             y = newCenter[1], yCount++) {
            let yCenter = newCenter;
            let yOutline = outline;
            for (let x = startCenter[0], xCount = 0;
                 x < endCenter[0];
                 x = newCenter[0], xCount++) {
                updateText(`CurrentProcess: ${Math.floor(x - startCenter[0])}/${Math.floor(endCenter[0] - startCenter[0])}, ${Math.floor(startCenter[1] - y)}/${Math.floor(startCenter[1] - endCenter[1])}`)
                // Core logic
                if (airMode) {
                    setAirMode(true);
                    await waitCanvas();
                }
                saveCanvas(`${xCount}x${yCount}.png`);
                if (airMode) {
                    setAirMode(false);
                    await waitCanvas();
                }

                // Next X
                await movePrecisely('right', outline);
                newCenter = view.getCenter();
                outline = getOutline();
            }
            // Next Y
            await move(yCenter[0], yCenter[1]);
            await movePrecisely('down', yOutline);
            newCenter = view.getCenter();
            outline = getOutline();
        }
    });
})();