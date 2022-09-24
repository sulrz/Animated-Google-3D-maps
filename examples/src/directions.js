import ThreeJSOverlayView from '@ubilabs/threejs-overlay-view';
import {CatmullRomCurve3, Vector3} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {getMapsApiOptions, loadMapsApi} from '../jsm/load-maps-api';
// import {finished} from 'stream';

// import PIN_MODEL_URL from 'url:../assets/pin.gltf';

const VIEW_PARAMS = {
  center: {lat: 51.50843075, lng: -0.098585086},
  zoom: 18,
  heading: 40,
  tilt: 65
};

const mapContainer = document.querySelector('#map');

let arrData = [];

async function main() {
  const map = await initMap();

  const overlay = new ThreeJSOverlayView(VIEW_PARAMS.center);
  const scene = overlay.getScene();

  overlay.setMap(map);

  //   directionsService.route(
  //     {
  //       origin: '51.51285671796782,-0.08491125264391064',
  //       destination: '51.504897070769616,-0.09169187662507479',
  //       travelMode: 'DRIVING'
  //     },
  //     (response, status) => {
  //       console.log(response);
  //       console.log(status);
  //     }
  //   );

  var axios = require('axios');

  var config = {
    method: 'get',
    url: 'https://maps.googleapis.com/maps/api/directions/json?origin=51.51285671796782,-0.08491125264391064&destination=51.33613617911301,-0.2598771022175562&key=AIzaSyDNBKSzCknMCkDnKHApWbAMQKhSJ_4PKHI',
    headers: {}
  };

  axios(config)
    .then(function (response) {
      const roadData = response.data.routes[0].legs[0].steps;
      console.log(roadData.length);
      for (let i = 0; i < roadData.length; i++) {
        arrData.push(roadData[i].start_location);
        arrData.push(roadData[i].end_location);
      }
      console.log(arrData);
      const jsonData = JSON.stringify(arrData);
      fs.writeFile('directions.json', jsonData);
    })
    .catch(function (error) {
      console.log(error);
    });

  let pinModel = null;
  loadPinModel().then(obj => {
    scene.add(pinModel);

    // since loading the car-model happened asynchronously, we need to
    // explicitly trigger a redraw.
    overlay.requestRedraw();
  });

  // the update-function will animate the car along the spline
  overlay.update = () => {
    overlay.requestRedraw();
  };
}

// export {arrData};

// console.log(arrData);

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
    console.log(JSON.stringify(mapsMouseEvent.latLng.toJSON(), null, 2));
  });

  return map;
}

async function loadPinModel() {
  const loader = new GLTFLoader();

  //   return new Promise(resolve => {
  //     loader.load(PIN_MODEL_URL, gltf => {
  //       const group = gltf.scene;

  //       resolve(group);
  //     });
  //   });
}

main().catch(err => console.error(err));
