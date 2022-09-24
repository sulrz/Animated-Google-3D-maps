import {Mesh, MeshStandardMaterial, CylinderGeometry, SphereGeometry, CircleBufferGeometry} from 'three';
import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';

import {CatmullRomCurve3, Vector3} from 'three';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';

import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';

import data from '../../src/XLSXParser/datajson4.json';
import CAR_MODEL_URL from 'url:../assets/low_poly_person.glb';

const CAR_FRONT = new Vector3(0, 1, 0);

let dataPoints = data.map(point => {
  return {
    ...point, lat: point.Latitude, 
    lng: point.Longitude, 
    "Timestamp": point["Timestamp"],
    "Horizontal accuracy": point["Horizontal accuracy"] / 3, 
    "Vertical accuracy": point["Vertical accuracy"] / 3
  };
});

const VIEW_PARAMS = {
  center: {lat: dataPoints[0]["Latitude"], lng: dataPoints[0]["Longitude"]},
  tilt: 67.5,
  heading: 60,
  zoom: 17
};

const mapContainer = document.querySelector('#map');
const tmpVec3 = new Vector3();

const DURATION = dataPoints[dataPoints.length-1]["Timestamp"] / 20;
const START_HOR_ACC = dataPoints[0]["Horizontal accuracy"];
const START_VER_ACC = dataPoints[0]["Horizontal accuracy"];

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView({
    ...VIEW_PARAMS.center
  });
  overlay.setMap(map);

  const scene = overlay.getScene();

  // create cylinder and add to scene
  const cylinder = new Mesh(
    new CylinderGeometry(START_HOR_ACC, START_HOR_ACC, START_VER_ACC * 2, 100),
    new MeshStandardMaterial({color: 0x0000ff, opacity: 0.3, transparent: true})
  );
  cylinder.scale.set(dataPoints[0]["Horizontal accuracy"] * 2, (dataPoints[0]["Vertical accuracy"]) * 4, dataPoints[0]["Horizontal accuracy"] * 2);
  cylinder.rotation.set(Math.PI / 2, 0, 0);
  const cylinderPosition = {...VIEW_PARAMS.center};
  overlay.latLngAltToVector3(cylinderPosition, cylinder.position);
  scene.add(cylinder);
  /////////////////////////////////////////

  // create trackline and add to scene
  const points = dataPoints.map(p => overlay.latLngAltToVector3(p));
  const curve = new CatmullRomCurve3(points, true, 'catmullrom', 0.2);

  curve.updateArcLengths();

  const trackLine = createTrackLine(curve);
  scene.add(trackLine);
  /////////////////////////////////////////
  
  // create car and add to scene
  let personModel = null;
  loadCarModel().then(obj => {
    personModel = obj;
    scene.add(personModel);

    // const carPosition = {...VIEW_PARAMS.center};
    // overlay.latLngAltToVector3(carPosition, personModel.position);

    // personModel.scale.set(0.1, 0.1, 0.1);
    // personModel.rotation.set(0, 0, Math.PI / 2);
    
    overlay.requestRedraw();
  });
  ////////////////////////////////////////
  
  var ind = 0;
  var timer = 0.0;
  var prevTime = 0.0;
  var currentTime = dataPoints[0]["Timestamp"];
  
  var deltaHorAcc = 0;
  var deltaVerAcc = 0;

  overlay.update = () => {
    overlay.requestRedraw();

    if (!cylinder) return;
    if (performance.now() > DURATION) return;
    if (ind + 1 >= dataPoints.length) return;
    
    const animationProgress = performance.now() / DURATION;
    curve.getPointAt(animationProgress, personModel.position);
    curve.getPointAt(animationProgress, cylinder.position);
    personModel.quaternion.setFromUnitVectors(CAR_FRONT, tmpVec3);
    curve.getTangentAt(animationProgress, tmpVec3);

    if (timer / currentTime >= 1) {
      ind++;

      if (ind + 1 >= dataPoints.length) return;


      var timeDiff = (dataPoints[ind + 1]["Timestamp"] - dataPoints[ind]["Timestamp"]) / 1000;

      deltaHorAcc = dataPoints[ind + 1]["Horizontal accuracy"] - dataPoints[ind]["Horizontal accuracy"];
      deltaHorAcc /= timeDiff;
      deltaVerAcc = dataPoints[ind + 1]["Vertical accuracy"] - dataPoints[ind]["Vertical accuracy"];
      deltaVerAcc /= timeDiff;

      timer = 0.0;
      currentTime = dataPoints[ind + 1]["Timestamp"] - dataPoints[ind]["Timestamp"];
    }

    var addSizeHor = deltaHorAcc / ((performance.now() - prevTime));
    var addSizeVer = deltaVerAcc / ((performance.now() - prevTime));

    cylinder.scale.set(cylinder.scale.x + addSizeHor, cylinder.scale.y + addSizeVer * 2, cylinder.scale.z + addSizeHor);

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
    // disableDefaultUI: true,
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
      linewidth: 0.005
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
      const carModel = group.getObjectByName('Sketchfab_model');

      carModel.scale.setScalar(0.03);
      carModel.rotation.set(0, 0, Math.PI, 'ZXY');

      resolve(group);
    });
  });
}

main().catch(err => {
  console.error('uncaught error in main: ', err);
});
