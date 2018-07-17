require('dotenv').config();
const Telnet = require('telnet-client');
const isOnline = require('is-online');
const http = require('http');

function sendReliabilityScore(score) {
  try {
    http
      .get(`${process.env.SERVER}/online/${score}`, resp => {
        // Nothing
      })
      .on('error', err => {
        console.log('Error Sending Status: ' + err.message);
      });
  } catch (e) {
    console.log('Error Sending Status (outer): ' + e.message);
  }
}

function rebootRouter() {
  const connection = new Telnet();

  const params = {
    host: process.env.ROUTER_HOST,
    username: process.env.ROUTER_USERNAME,
    password: process.env.ROUTER_PASSWORD
  };

  connection.on('ready', function(prompt) {
    connection.exec('reboot', function(err, response) {
      connection.end();
    });
  });

  connection.on('error', function(e) {
    console.log('Router Communication Error', e.message);
  });

  connection.connect(params);
}

// in mins
const ONLINE_WAIT = 3;
const OFFLINE_WAIT = 2;

let reliabilityChecks = 1;
let reliabilityPasses = 1;

let wasOffline = false;
let offlineConsecutiveCount = 0;

function checkInternet() {
  isOnline()
    .then(online => {
      // Reset reliability every 24 hours
      if (reliabilityChecks >= (60 * 24) / ONLINE_WAIT) {
        reliabilityChecks = 1;
        reliabilityPasses = 1;
      }
      reliabilityChecks++;
      if (online) {
        console.log('We are online');
        reliabilityPasses++;
        wasOffline = false;
        offlineConsecutiveCount = 0;
        const score = Math.round((reliabilityPasses / reliabilityChecks) * 100);
        sendReliabilityScore(score);
        console.log('Reliability Score', score);
        setTimeout(checkInternet, ONLINE_WAIT * 60 * 1000);
      } else {
        console.log('Ahhh not connected');
        if (wasOffline) {
          offlineConsecutiveCount++;
        }
        wasOffline = true;
        if (offlineConsecutiveCount >= 2) {
          offlineConsecutiveCount = 1;
          rebootRouter();
        }
        setTimeout(checkInternet, OFFLINE_WAIT * 60 * 1000);
      }
    })
    .catch(e => {
      console.log('Could not verify connection', e.message);
    });
}

checkInternet();
