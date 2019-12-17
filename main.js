
'use strict';

const os = require('os');
const express = require('express');
const dgram = require('dgram');

var app = express();
var ifaces = os.networkInterfaces();
const server = dgram.createSocket('udp4');

var siteIp = 'localhost';
var sitePort = 8080;
var ALBotReciveIp = 'localhost';
var ALBotRecivePort = 40004;

const characters = new Object();
var colors = 
{
    default:    "white",

    mage:       "rgb(0, 204, 255)",
    warrior:    "rgb(204, 0, 0)",
    ranger:     "rgb(0, 153, 51)",
    priest:     "rgb(255, 102, 255)",
    merchant:   "rgb(230, 184, 0)",
    
    c_rip:      "rgb(204, 0, 0)",
    c_alive:    "rgb(51, 204, 51)",
}

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
            console.log(ifname + ':' + alias, iface.address);
            if(ifname == "Ethernet" || ifname == "wlan0") 
                siteIp = iface.address; // Replacing the localhost with an Ethernet address
        }
        ++alias;
    });
});



server.on('error', (err) => {
    console.log(`server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
    
    var character = JSON.parse(msg);
    if(character && character.name) {
        character['lastUpdate'] = new Date();
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



app.listen(sitePort, siteIp, function() {
    console.log("site listening - " + siteIp + ":" + sitePort);
});

app.get('/', function(req,res) {

    var html = "<html><head>";
    html += "<script>function refresh() {setTimeout(function () {location.reload()}, 2000);} refresh();</script>";
    html += "<style>.character-block { border: 4px solid gray; font-size: 18px; text-align: center; color: white; float: left; margin: 10 }</style></head>";
    
    html += "<body style='background-color: Black'><div>"
    for (const key in characters) {
        if (characters.hasOwnProperty(key) && (new Date() - characters[key].lastUpdate) < 5000) {
            
            var text = "";
            var ctype = (characters[key].ctype ? characters[key].ctype : null);

            html += "<div class='character-block' style='width: 130px; padding: 6px 8px 6px 8px;'>";
            
            // Name and Level
            if(characters[key].name && characters[key].level) {
                html += "<div font-size: 16px;>" + characters[key].name + "<font style='color:gray; font-size: 15'> ["+characters[key].level+"]</font></div>";
            }
            
            // Class type
            if(ctype) {
                html += "<div style='color:" + (colors.hasOwnProperty(ctype) ? colors[ctype] : colors["default"]) + "'>" + characters[key].ctype + "</div>";
            }

            // EXP progress bar
            if(characters[key].xp) {
                html += "<div style='background: black; margin-top: 3px; padding: 2px; border: 1px solid gray; display: block; position: relative;'>"
                        + "<div style='background: rgb(22, 109, 17); width: "+ characters[key].xp +"%; height: 20px;'></div>"
                        + "<div style='position: absolute; left: 10%; top: 0px; line-height: 24px; text-align: center;'>Exp "+ characters[key].xp.toFixed(2) +"%</div>"
                    + "</div>"; 
            }

            // State
            if(characters[key].isRip != null) {
                html += "<div style='padding: 10 0 0 0'>State: <font style='color: " + (characters[key].isRip ? colors["c_rip"] : colors["c_alive"]) + "; font-size: 16px;'>" + (characters[key].isRip ? "RIP" : "ALIVE") + "</font></div>";
            }
            
            // Inventory size
            if(characters[key].inv) {
                html += "<div>INV: " + characters[key].inv + "</div>";
            }

            // Exp per sec
            if(characters[key].xpps) {
                if(ctype != "merchant") html += "<div>" + characters[key].xpps.toFixed(0) + " Xp/sec</div>";
            }

            // Target name 
            if(characters[key].target) {
                if(ctype != "merchant") {
                    html += "<div style='text-align: left; padding: 10 0 0 0'>Target: <font style='font-size: 16px;'>" + characters[key].target + "</font></div>";
                }
            
                // Merchant Gold
                else if(characters[key].gold)  {
                    html += "<div style='text-align: center; padding: 10 0 0 0'>Gold: " + format(characters[key].gold) + "</div>";
                }
            }
            
            // Time to level up
            if(characters[key].toUp) {
                if(ctype != "merchant") {
                    text = characters[key].toUp.d + "d " + characters[key].toUp.h + "h " + characters[key].toUp.m + "m " + characters[key].toUp.s + "s";
                    html += "<div style='text-align: center'>To level up: <br/>" + text + "</div>";
                } 
            }
            
            html += "</div>";
        }
    }
    html += "</div></body></html>";

    res.send(html);
});


function format(num) {
    var str = num.toString();
    var strBaseLength = str.length;
    
    for(let i = 0; i < Math.floor((strBaseLength - 1) / 3); i++) {
        str = insert(str, ",", (str.length - ((i+1)*3 + i)));
    }
    return str;
}
  
function insert(main_string, ins_string, pos) {
    if(typeof(pos) == "undefined") {
        pos = 0;
    }
    if(typeof(ins_string) == "undefined") {
        ins_string = '';
    }
    return main_string.slice(0, pos) + ins_string + main_string.slice(pos);
}