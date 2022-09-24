import {Mesh, MeshStandardMaterial, CylinderGeometry} from 'three';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';

import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

const VIEW_PARAMS = {
  center: {
    lat: 27.9744587,
    lng: 86.93276159,
    altitude: 0.994985
  },
  tilt: 67.5,
  heading: 60,
  zoom: 14
};

var ACUURACY_POINTS = [
  {time: 5589, horizontal: 50.165430, vertical: 15.23450},
  {time: 11401, horizontal: 25.365460, vertical: 	6.48738},
  {time: 16587, horizontal: 20.443460, vertical: 	6.48285},
  {time: 22478, horizontal: 20.187830, vertical: 	6.21373},
  {time: 27731, horizontal: 15.123500, vertical: 	5.23723},
  {time: 33435, horizontal: 14.278480, vertical: 	5.98438},
  {time: 38750, horizontal: 16.123932, vertical: 	4.48284},
  {time: 44006, horizontal: 13.124780, vertical: 	4.58395},
  {time: 49284, horizontal: 14.123270, vertical: 	4.23382},
  {time: 55117, horizontal: 14.128730, vertical: 	4.23892},
  {time: 60971, horizontal: 14.858200, vertical: 	4.58938},
  {time: 66118, horizontal: 12.405830, vertical: 	4.59865},
  {time: 71481, horizontal: 15.284850, vertical: 	4.59835},
  {time: 76894, horizontal: 12.482840, vertical: 	4.43943},
  {time: 82145, horizontal: 10.284840, vertical: 	4.79795},
  {time: 87595, horizontal: 10.273720, vertical: 	5.23884},
  {time: 93277, horizontal: 11.195800, vertical: 	5.47273},
  {time: 98692, horizontal: 11.846220, vertical: 	6.47284},
]

ACUURACY_POINTS = ACUURACY_POINTS.map(point => {return{...point, time: point.time / 10}});

const DURATION = ACUURACY_POINTS[ACUURACY_POINTS.length-1].time - ACUURACY_POINTS[0].time;
const START_HOR_ACC = ACUURACY_POINTS[0].horizontal;
const START_VER_ACC = ACUURACY_POINTS[0].horizontal;

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView({
    ...VIEW_PARAMS.center
  });
  overlay.setMap(map);

  const scene = overlay.getScene();
  const cylinder = new Mesh(
    new CylinderGeometry(START_HOR_ACC, START_HOR_ACC, START_VER_ACC * 2, 100),
    new MeshStandardMaterial({color: 0x0000ff, opacity: 0.5, transparent: true})
  );
  cylinder.rotation.set(Math.PI / 2, 0, 0);
  
  const cylinderPosition = {...VIEW_PARAMS.center};
  overlay.latLngAltToVector3(cylinderPosition, cylinder.position);
  
  scene.add(cylinder);

  var ind = 0;
  var timer = 0.0;
  var currentTime = ACUURACY_POINTS[0].time;
  var startTime = ACUURACY_POINTS[0].time;
  var deltaHorAcc = ACUURACY_POINTS[1].horizontal - START_HOR_ACC;
  var deltaVerAcc = ACUURACY_POINTS[1].vertical - START_VER_ACC;
  var prevTime = 0.0;

  overlay.update = () => {
    if (!cylinder) return;
    if (performance.now() > DURATION) return;
    if (ind + 1 >= ACUURACY_POINTS.length) return;


    if (ACUURACY_POINTS[ind].time - startTime < performance.now()) {
      ind++;

      if (ind + 1 >= ACUURACY_POINTS.length) return;

      deltaHorAcc = ACUURACY_POINTS[ind + 1].horizontal - ACUURACY_POINTS[ind].horizontal;
      deltaVerAcc = ACUURACY_POINTS[ind + 1].vertical - ACUURACY_POINTS[ind].vertical;
      
      timer = 0.0;
      currentTime = ACUURACY_POINTS[ind + 1].time - ACUURACY_POINTS[ind].time;
    }

    var addSizeHor = deltaHorAcc * (timer / currentTime);
    var addSizeVer = deltaVerAcc * (timer / currentTime);

    cylinder.scale.set(ACUURACY_POINTS[ind].horizontal + addSizeHor, ACUURACY_POINTS[ind].horizontal + addSizeHor, (ACUURACY_POINTS[ind].vertical + addSizeVer) * 2);

    timer += performance.now() - prevTime;
    prevTime = performance.now();

    overlay.requestRedraw();
  };
}

async function initMap() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  return new google.maps.Map(document.querySelector('#map'), {
    mapId,
    disableDefaultUI: true,
    backgroundColor: 'transparent',
    gestureHandling: 'greedy',
    ...VIEW_PARAMS
  });
}

main().catch(err => {
  console.error('uncaught error in main: ', err);
});
