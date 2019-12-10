
'use strict';

const os = require('os');
const express = require('express');
const dgram = require('dgram');


var siteIp = 'localhost';
var sitePort = 8080;
var ALBotReciveIp = 'localhost';
var ALBotRecivePort = 40004;


var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            console.log(ifname + ':' + alias, iface.address);
        } else {
            // this interface has only one ipv4 adress
            if(ifname == "Ethernet") 
                siteIp = iface.address; // Replacing the localhost with an Ethernet address
        }
        ++alias;
    });
});


const characters = new Object();

const server = dgram.createSocket('udp4');
server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    
    var character = JSON.parse(msg);
    if(character.name) {
        characters[character.name] = character;
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`server listening ${address.address}:${address.port}`);
});
  
server.bind({
    address: ALBotReciveIp,
    port: ALBotRecivePort,
    exclusive: false
});



var app = express();
app.listen(sitePort, siteIp, function() {
    console.log("site listening - " + siteIp + ":" + sitePort);
});

app.get('/', function(req,res) {

    var html = "<html><head><script>function refresh() {setTimeout(function () {location.reload()}, 2000);} refresh();</script>";
    html+= "<style>.character-block { border: 4px solid gray; font-size: 18px; text-align: center; color: white; float: left; margin: 10 }</style></head>";
    
    html += "<body style='background-color: Black'><div>"
    for (const key in characters) {
        if (characters.hasOwnProperty(key)) {
            const element = characters[key];
            html += "<div class='character-block' style='width: 130px; padding: 6px 8px 6px 8px;'>";
            html += "<div font-size: 16px;>" + characters[key].name + "<font style='color:gray; font-size: 15'> ["+characters[key].level+"]</font></div>";
            html += "<div>" + characters[key].ctype + "</div>";
            html += "<div>State: ";
            if(characters[key].isRip) html += "RIP</div>";
            else html += "ALIVE</div>";

            html += "<div style='background: black; margin-top: 3px; padding: 2px; border: 1px solid gray; display: block; position: relative;'>"
                        + "<div style='background: rgb(22, 109, 17); width: "+ characters[key].xp +"%; height: 20px;'></div>"
                        + "<div style='position: absolute; left: 10%; top: 0px; line-height: 24px; text-align: center;'>Exp "+ characters[key].xp.toFixed(2) +"%</div>"
                    + "</div>"; 
            html += "<div>" + characters[key].xpps.toFixed(0) + " Xp/sec</div>";
            html += "<div>INV " + characters[key].inv + "</div>";
            html += "<div>Target: " + characters[key].target + "</div>";
            //html += "<div>" + characters[key].gps.toFixed(0) + " Gold/sec</div>";
            html += "<div>toUp: " + characters[key].toUp + "</div>";
            html += "</div>";
        }
    }
    html += "</div></body></html>";

    res.send(html);
});


