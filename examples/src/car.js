import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {CatmullRomCurve3, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

import CAR_MODEL_URL from 'url:../assets/lowpoly-sedan.glb';
import PIN_URL from 'url:../assets/pin.gltf';

var axios = require('axios');

const CAR_FRONT = new Vector3(0, 1, 0);

const VIEW_PARAMS = {
  center: {lat: 51.49992826386113, lng: -0.15997018684951847},
  zoom: 16,
  heading: 40,
  tilt: 65
};

const ANIMATION_DURATION = 20000;
var overallTime = 0;
var prevTime = 0;

const mapContainer = document.querySelector('#map');
const tmpVec3 = new Vector3();

async function main(arrData) {
  overallTime = 0;
  const ANIMATION_POINTS = arrData;
  const map = await initMap();
  const elevator = new google.maps.ElevationService();

  const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
  const scene = overlay.getScene();

  overlay.setMap(map);

  const points = ANIMATION_POINTS.map(p => overlay.latLngAltToVector3(p));
  const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  curve.updateArcLengths();

  const displayAltitude = (location, elevator) => {
    elevator
      .getElevationForLocations({
        locations: [location]
      })
      .then(({results}) => {
        if (results[0]) {
          console.log(results[0].elevation);
        } else {
          console.log('no res');
        }
      })
      .catch(e => console.log(e));
  };

  ANIMATION_POINTS.map(p => displayAltitude(p, elevator));

  // create end pointer and add to scene
  var loader = new GLTFLoader();               
  loader.load(
    PIN_URL,
    gltf => {
      gltf.scene.scale.set(15,15,15);
      gltf.scene.rotation.x = 180 * Math.PI/180; // rotations are in radians
      var position1 = overlay.latLngAltToVector3(ANIMATION_POINTS[ANIMATION_POINTS.length - 1]);
      var position2 = overlay.latLngAltToVector3(ANIMATION_POINTS[0]);
      gltf.scene.position.set(position1.x - position2.x, position1.y - position2.y, 20);
      scene.add(gltf.scene);
    }
  );
  /////////////////////////////////////////

  const trackLine = createTrackLine(curve);
  scene.add(trackLine);

  let carModel = null;
  loadCarModel().then(obj => {
    carModel = obj;
    carModel.scale.set(0.3, 0.3, 0.3);
    
    scene.add(carModel);
    overlay.requestRedraw();
  });

  // the update-function will animate the car along the spline
  overlay.update = () => {
    trackLine.material.resolution.copy(overlay.getViewportSize());

    if (!carModel) return;
    if (overallTime > ANIMATION_DURATION) return;

    const animationProgress = overallTime / ANIMATION_DURATION;

    curve.getPointAt(animationProgress, carModel.position);
    curve.getTangentAt(animationProgress, tmpVec3);
    carModel.quaternion.setFromUnitVectors(CAR_FRONT, tmpVec3);

    overallTime += performance.now() - prevTime;
    prevTime = performance.now();
    overlay.requestRedraw();
  };
}

async function fetchRoad(destinationCoordinate) {
  if (destinationCoordinate === null) {
    return;
  }
  var config = {
    method: 'get',
    url: `https://maps.googleapis.com/maps/api/directions/json?origin=51.49992826386113,-0.15997018684951847&destination=${destinationCoordinate.lat},${destinationCoordinate.lng}&key=AIzaSyDNBKSzCknMCkDnKHApWbAMQKhSJ_4PKHI&alternatives=false`,
    headers: {}
  };

  let arrData = [];

  await axios(config)
    .then(function (response) {
      const roadData = response.data.routes[0].legs[0].steps;
      for (let i = 0; i < roadData.length; i++) {
        arrData.push(roadData[i].start_location);
        arrData.push(roadData[i].end_location);
      }
    })
    .catch(function (error) {
      console.log(error);
    });

  prevTime = performance.now();
  main(arrData);
  return arrData;
}

/**
 * Load the Google Maps API and create the fullscreen map.
 */
async function initMap() {
  const {mapId} = getMapsApiOptions();
  await loadMapsApi();

  const map = new google.maps.Map(mapContainer, {
    mapId,
    disableDefaultUI: true,
    backgroundColor: 'transparent',
    gestureHandling: 'greedy',
    ...VIEW_PARAMS
  });

  map.addListener('click', mapsMouseEvent => {
    fetchRoad(mapsMouseEvent.latLng.toJSON());
    console.log(JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2));
  });

  return map;
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
    loader.load(CAR_MODEL_URL, gltf => {
      const group = gltf.scene;
      const carModel = group.getObjectByName('sedan');

      carModel.scale.setScalar(50);
      carModel.rotation.set(Math.PI / 2, 0, Math.PI, 'ZXY');

      resolve(group);
    });
  });
}

main().catch(err => console.error(err));
