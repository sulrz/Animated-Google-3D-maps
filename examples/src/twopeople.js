import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {CatmullRomCurve3, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';
import dataPoints from '../../src/XLSXParser/datajson7.json';
import PERSON_MODEL_URL from 'url:../assets/low_poly_person.glb';
import {Mesh, MeshStandardMaterial, CylinderGeometry, SphereGeometry, CircleBufferGeometry} from 'three';

const PERSON_FRONT = new Vector3(0, 1, 0);

const VIEW_PARAMS = {
  center: {lat: dataPoints[0].Latitude, lng: dataPoints[0].Longitude},
  zoom: 18,
  heading: 40,
  tilt: 65
};

let alice = dataPoints.filter((person) => {
    return person.Identifier==="Alice";
});

let bob = dataPoints.filter((person) => {
    return person.Identifier==="Bob";
});

let answerAlice = alice.map(item => {
  return {
    ...item,
    lat: item.Latitude,
    lng: item.Longitude,
    altitude: item.Altitude,
    Timestamp: item.Timestamp / 15,
    "Horizontal accuracy": item["Horizontal accuracy"] / 5, 
    "Vertical accuracy": item["Vertical accuracy"] / 5
  };
});

let answerBob = bob.map(item => {
    return {
      ...item,
      lat: item.Latitude,
      lng: item.Longitude,
      altitude: item.Altitude,
      Timestamp: item.Timestamp / 15,
      "Horizontal accuracy": item["Horizontal accuracy"] / 5, 
      "Vertical accuracy": item["Vertical accuracy"] / 5
    };
  });

const DURATION_ALICE = answerAlice[answerAlice.length-1].Timestamp;
const DURATION_BOB = answerBob[answerBob.length-1].Timestamp;

const ANIMATION_POINTS_ALICE = answerAlice;
const ANIMATION_POINTS_BOB = answerBob;

const mapContainer = document.querySelector('#map');
const tmpVec3 = new Vector3();

const START_HOR_ACC1 = answerAlice[0]["Horizontal accuracy"];
const START_VER_ACC1 = answerAlice[0]["Horizontal accuracy"];

const START_HOR_ACC2 = answerBob[0]["Horizontal accuracy"];
const START_VER_ACC2 = answerBob[0]["Horizontal accuracy"];

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
  const scene = overlay.getScene();

  overlay.setMap(map);

  // create track line alice
  const pointsAlice = ANIMATION_POINTS_ALICE.map(p => overlay.latLngAltToVector3(p));
  const curveAlice = new CatmullRomCurve3(pointsAlice, true, 'catmullrom', 0.2);
  const trackLineAlice = createTrackLine(curveAlice);
  curveAlice.updateArcLengths();
  scene.add(trackLineAlice);
  /////////////////////////////
  
  // create track line bob
  const pointsBob = ANIMATION_POINTS_BOB.map(p => overlay.latLngAltToVector3(p));
  const curveBob = new CatmullRomCurve3(pointsBob, true, 'catmullrom', 0.2);
  const trackLineBob = createTrackLine(curveBob);
  curveBob.updateArcLengths();
  scene.add(trackLineBob);
  /////////////////////////////

  // create cylinder and add to scene
  const cylinder1 = new Mesh(
    new CylinderGeometry(START_HOR_ACC1, START_HOR_ACC1, START_VER_ACC1 * 2, 100),
    new MeshStandardMaterial({color: 0xff0000, opacity: 0.3, transparent: true})
  );
  cylinder1.scale.set(answerAlice[0]["Horizontal accuracy"], (answerAlice[0]["Vertical accuracy"]) * 2, answerAlice[0]["Horizontal accuracy"]);
  cylinder1.rotation.set(Math.PI / 2, 0, 0);
  const cylinderPosition1 = {...VIEW_PARAMS.center};
  overlay.latLngAltToVector3(cylinderPosition1, cylinder1.position);
  scene.add(cylinder1);
  /////////////////////////////////////////

  // create cylinder and add to scene
  const cylinder2 = new Mesh(
    new CylinderGeometry(START_HOR_ACC2, START_HOR_ACC2, START_VER_ACC2 * 2, 100),
    new MeshStandardMaterial({color: 0x0000ff, opacity: 0.3, transparent: true})
  );
  cylinder2.scale.set(answerBob[0]["Horizontal accuracy"], (answerBob[0]["Vertical accuracy"]) * 2, answerBob[0]["Horizontal accuracy"]);
  cylinder2.rotation.set(Math.PI / 2, 0, 0);
  const cylinderPosition2 = {...VIEW_PARAMS.center};
  overlay.latLngAltToVector3(cylinderPosition2, cylinder2.position);
  scene.add(cylinder2);
  /////////////////////////////////////////
  
  // create alice
  let personModelAlice = null;
  loadPersonModel().then(obj => {
    personModelAlice = obj;
    scene.add(personModelAlice);

    overlay.requestRedraw();
  });
  /////////////////////////////////

  // create bob
  let personModelBob = null;
  loadPersonModel().then(obj => {
    personModelBob = obj;
    scene.add(personModelBob);

    overlay.requestRedraw();
  });
  /////////////////////////////////

  var prevTime = 0.0;
  //////////////////////////
  var ind1 = 0;
  var timer1 = 0.0;
  var currentTime1 = answerAlice[0]["Timestamp"];
  
  var deltaHorAcc1 = 0;
  var deltaVerAcc1 = 0;
  //////////////////////////

  //////////////////////////
  var ind2 = 0;
  var timer2 = 0.0;
  var currentTime2 = answerBob[0]["Timestamp"];
  
  var deltaHorAcc2 = 0;
  var deltaVerAcc2 = 0;
  //////////////////////////

  // the update-function will animate the car along the spline
  overlay.update = () => {
    overlay.requestRedraw();
    ///////////////////////////////
    trackLineAlice.material.resolution.copy(overlay.getViewportSize());
    trackLineBob.material.resolution.copy(overlay.getViewportSize());

    if (!personModelAlice) return;
    if (!personModelBob) return;

    let animationProgress1 = 1;
    if (performance.now() < DURATION_ALICE)
      animationProgress1 = performance.now() / DURATION_ALICE;

    let animationProgress2 = 1;
    if (performance.now() < DURATION_BOB)
      animationProgress2 = performance.now() / DURATION_BOB;

    curveAlice.getPointAt(animationProgress1, personModelAlice.position);
    curveAlice.getPointAt(animationProgress1, cylinder1.position);
    curveAlice.getTangentAt(animationProgress1, tmpVec3);
    personModelAlice.quaternion.setFromUnitVectors(PERSON_FRONT, tmpVec3);

    curveBob.getPointAt(animationProgress2, personModelBob.position);
    curveBob.getPointAt(animationProgress2, cylinder2.position);
    curveBob.getTangentAt(animationProgress2, tmpVec3);
    personModelBob.quaternion.setFromUnitVectors(PERSON_FRONT, tmpVec3);
    ///////////////////////////////

    ///////////////////////////////
    if (timer1 / currentTime1 >= 1) {
      ind1++;

      if (ind1 + 1 < answerAlice.length) {
        var timeDiff1 = (answerAlice[ind1 + 1]["Timestamp"] - answerAlice[ind1]["Timestamp"]) / 1000;

        deltaHorAcc1 = answerAlice[ind1 + 1]["Horizontal accuracy"] - answerAlice[ind1]["Horizontal accuracy"];
        deltaHorAcc1 /= timeDiff1;
        deltaVerAcc1 = answerAlice[ind1 + 1]["Vertical accuracy"] - answerAlice[ind1]["Vertical accuracy"];
        deltaVerAcc1 /= timeDiff1;

        timer1 = 0.0;
        currentTime1 = answerAlice[ind1 + 1]["Timestamp"] - answerAlice[ind1]["Timestamp"];
      }
    }

    if (ind1 < answerAlice.length) {
      var addSizeHor1 = deltaHorAcc1 / ((performance.now() - prevTime));
      var addSizeVer1 = deltaVerAcc1 / ((performance.now() - prevTime));

      cylinder1.scale.set(cylinder1.scale.x + addSizeHor1, cylinder1.scale.y + addSizeVer1 * 2, cylinder1.scale.z + addSizeHor1);
    }
    ///////////////////////////////
    

    ///////////////////////////////
    if (timer2 / currentTime2 >= 1) {
      ind2++;

      if (ind2 + 1 < answerBob.length) {
        var timeDiff2 = (answerBob[ind2 + 1]["Timestamp"] - answerBob[ind2]["Timestamp"]) / 1000;

        deltaHorAcc2 = answerBob[ind2 + 1]["Horizontal accuracy"] - answerBob[ind2]["Horizontal accuracy"];
        deltaHorAcc2 /= timeDiff2;
        deltaVerAcc2 = answerBob[ind2 + 1]["Vertical accuracy"] - answerBob[ind2]["Vertical accuracy"];
        deltaVerAcc2 /= timeDiff2;

        timer2 = 0.0;
        currentTime2 = answerBob[ind2 + 1]["Timestamp"] - answerBob[ind2]["Timestamp"];
      }
    }

    if (ind2 < answerBob.length) {
      var addSizeHor2 = deltaHorAcc2 / ((performance.now() - prevTime));
      var addSizeVer2 = deltaVerAcc2 / ((performance.now() - prevTime));

      cylinder2.scale.set(cylinder2.scale.x + addSizeHor2, cylinder2.scale.y + addSizeVer2 * 2, cylinder2.scale.z + addSizeHor2);
    }
    ///////////////////////////////

    timer1 += performance.now() - prevTime;
    timer2 += performance.now() - prevTime;
    // console.log(timer1)
    prevTime = performance.now();

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
      linewidth: 0.02
    })
  );

  trackLine.geometry.setPositions(positions);

  return trackLine;
}

/**
 * Load and prepare the car-model for animation.
 */
async function loadPersonModel() {
  const loader = new GLTFLoader();

  return new Promise(resolve => {
    loader.load(PERSON_MODEL_URL, gltf => {
      const group = gltf.scene;
      const personModel = group.getObjectByName('Sketchfab_model');

      personModel.scale.setScalar(0.01);
      personModel.rotation.set(0, 0, Math.PI, 'ZXY');

      resolve(group);
    });
  });
}

main().catch(err => console.error(err));
