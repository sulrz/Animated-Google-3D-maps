import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {CatmullRomCurve3, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';
import dataPoints from '../../src/XLSXParser/datajson4.json';
import PERSON_MODEL_URL from 'url:../assets/low_poly_person.glb';

const CAR_FRONT = new Vector3(0, 1, 0);

const VIEW_PARAMS = {
  center: {lat: dataPoints[0].Latitude, lng: dataPoints[0].Longitude},
  zoom: 18,
  heading: 40,
  tilt: 65
};

const ANIMATION_DURATION = 20000;
let answer = dataPoints.map(item => {
  return {
    lat: item.Latitude,
    lng: item.Longitude,
    altitude: item.Altitude
  };
});

console.log(answer);
// dataPoints = dataPoints.map(({Latitude: lat, Longitude: lng}) => ({lat, lng}));
// console.log(dataPoints);

const ANIMATION_POINTS = answer;
// [
//   {lat: 40.78017131, lng: -73.96810659, altitude: 1.191633802},
//   {lat: 40.7803053, lng: -73.96775031, altitude: 0.942729652},
//   {lat: 40.77999979, lng: -73.96709096, altitude: 1.066590352},
//   {lat: 40.78025706, lng: -73.96605064, altitude: 2.582525378},
//   {lat: 40.78118795, lng: -73.96516988, altitude: 1.061874673},
//   {lat: 40.78205682, lng: -73.96513996, altitude: 1.336640946},
//   {lat: 40.78258892, lng: -73.96570807, altitude: 0.337218268},
//   {lat: 40.78239453, lng: -73.9670961, altitude: 0.71900696},
//   {lat: 40.78163486, lng: -73.96779419, altitude: 2.482616507},
//   {lat: 40.78047792, lng: -73.96793906, altitude: 0.627920173}
// ];

// const ANIMATION_POINTS = [
//   {lat: 51.50843075, lng:	-0.098585086, altitude: 0},
//     {lat: 51.50817223, lng:	-0.09859787, altitude: 3},
//     {lat: 51.50840261, lng:	-0.098512051, altitude: 6},
//     {lat: 51.5086788 , lng: -0.09849205, altitude: 9},
//     {lat: 51.50917358, lng: 	-0.098467999, altitude: 12},
//     {lat: 51.50959378, lng: 	-0.098424099, altitude: 15},
//     {lat: 51.51008767, lng: 	-0.09837941, altitude: 18},
//     {lat: 51.51052555, lng: 	-0.098353134, altitude: 21},
//     {lat: 51.51085497, lng: 	-0.098416265, altitude: 24},
//     {lat: 51.51116061, lng: 	-0.098394436, altitude: 27},
// ];

const mapContainer = document.querySelector('#map');
const tmpVec3 = new Vector3();

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
  const scene = overlay.getScene();

  overlay.setMap(map);

  // create a Catmull-Rom spline from the points to smooth out the corners
  // for the animation
  const points = ANIMATION_POINTS.map(p => overlay.latLngAltToVector3(p));
  const curve = new CatmullRomCurve3(points, true, 'catmullrom', 0.2);
  curve.updateArcLengths();

  const trackLine = createTrackLine(curve);
  scene.add(trackLine);

  let carModel = null;
  loadCarModel().then(obj => {
    carModel = obj;
    scene.add(carModel);

    // since loading the car-model happened asynchronously, we need to
    // explicitly trigger a redraw.
    overlay.requestRedraw();
  });

  // the update-function will animate the car along the spline
  overlay.update = () => {
    trackLine.material.resolution.copy(overlay.getViewportSize());

    if (!carModel) return;
    if (performance.now() > ANIMATION_DURATION) return;

    const animationProgress = performance.now() / ANIMATION_DURATION;

    // const animationProgress =
    //   (performance.now() % ANIMATION_DURATION) / ANIMATION_DURATION;

    curve.getPointAt(animationProgress, carModel.position);
    curve.getTangentAt(animationProgress, tmpVec3);
    carModel.quaternion.setFromUnitVectors(CAR_FRONT, tmpVec3);

    overlay.requestRedraw();
  };
}

/**
 * Load the Google Maps API and create the fullscreen map.
 */
async function initMap() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  return new google.maps.Map(mapContainer, {
    mapId,
    disableDefaultUI: true,
    backgroundColor: 'transparent',
    gestureHandling: 'greedy',
    ...VIEW_PARAMS
  });
}

/**
 * Create a mesh-line from the spline to render the track the car is driving.
 */
function createTrackLine(curve) {
  const numPoints = 10 * curve.points.length;
  const curvePoints = curve.getSpacedPoints(numPoints);
  const positions = new Float32Array(numPoints * 3);

  for (let i = 0; i < numPoints; i++) {
    curvePoints[i].toArray(positions, 3 * i);
  }

  const trackLine = new Line2(
    new LineGeometry(),
    new LineMaterial({
      color: 0x0f9d58,
      linewidth: 5
    })
  );

  trackLine.geometry.setPositions(positions);

  return trackLine;
}

/**
 * Load and prepare the car-model for animation.
 */
async function loadCarModel() {
  const loader = new GLTFLoader();

  return new Promise(resolve => {
    loader.load(PERSON_MODEL_URL, gltf => {
      const group = gltf.scene;
      console.log(group);
      const carModel = group.getObjectByName('Sketchfab_model');
      console.log(carModel);

      carModel.scale.setScalar(0.1);
      carModel.rotation.set(0, 0, Math.PI, 'ZXY');

      resolve(group);
    });
  });
}

main().catch(err => console.error(err));