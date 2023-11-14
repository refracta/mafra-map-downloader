# 농지공간포털 지도 다운로더
[농지공간포털](https://njy.mafra.go.kr/map/mapMain.do)의 지도 구간을 다운로드 받기 위한 프로그램입니다.
브라우저 확장 스크립트 `script.js`와 병합 프로그램 `merge.js`로 이루어져 있습니다.

## 확장 스크립트 (script.js)

### Install 
1. [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)를 브라우저에 설치합니다.
2. [농지공간포털 지도 다운로더](https://greasyfork.org/ko/scripts/479601-%EB%86%8D%EC%A7%80%EA%B3%B5%EA%B0%84%ED%8F%AC%ED%84%B8-%EC%A7%80%EB%8F%84-%EB%8B%A4%EC%9A%B4%EB%A1%9C%EB%8D%94) 스크립트를 설치합니다.

### How to use?
 - [농지공간포털](https://njy.mafra.go.kr/map/mapMain.do)에 접속해서 우상단의 빨간색 인쇄 버튼을 클릭합니다.
현재 보고있는 지점을 좌상단 시작 타일로 `1000m x 200m`의 공간을 자동으로 캡처합니다.

### Config
브라우저의 개발자 도구창(F12 or Ctrl + Shift + I)을 열고 Console 탭에서 환경변수를 설정하여, 원하는 설정이 가능합니다.
```js
window.airMode = false;
// 항공 사진 모드 캡처를 사용하지 않습니다. (기본 값: true)
window.range2D = [10000, 10000];
// 캡처할 공간 거리를 지정합니다. (기본 값 [1000, 200])
window.startCenter = [268228.91755557084, 441646.6275384163];
// 캡처 시작점을 임의로 지정합니다. (기본 값: 현재 지도 위치)
// git.map.getView().getCenter()를 입력하여 현재 위치값을 확인할 수 있습니다.
window.zoomLevel = 11;
// 줌 레벨을 설정합니다.
```

## 병합 프로그램 (merge.js)
### Install
1. [nodejs](https://nodejs.org/)를 설치합니다.
2. `npm install`
3. 프로젝트 경로에 `images` 폴더를 만든 뒤, 브라우저에서 다운로드 받은 모든 이미지들을 넣습니다.
4. `node merge.js`
5. 병합된 지도 사진이 프로젝트 경로의 `output.png` 파일로 저장됩니다.
