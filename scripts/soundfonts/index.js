

const fs = require('fs')
require('es6-object-assign').polyfill();

const args = process.argv.slice(2);
let samples = {}
const folder = args[0]+'/'
const instrumentName = args[1]
let files = fs.readdirSync(folder)

let doOnce = true

files.forEach(fileName => {
    if (fileName !== 'samples' && fileName != '.DS_Store') {
        if (doOnce) {
            //doOnce = false
            console.log(fileName);
            let startOfFileName = 4
            let endOfFileName = fileName.length - 4
            let displayNameTemp = fileName.slice(startOfFileName, endOfFileName)
            displayNameTemp = displayNameTemp.replace('_', ' ')
            displayNameTemp = displayNameTemp.toLowerCase()
            let displayName = displayNameTemp.charAt(0).toUpperCase() + displayNameTemp.slice(1)
            console.log('displayName', displayName);

            let text = fs.readFileSync(folder + fileName, 'utf-8')
            // something sligthly wrong with regex in transform function, it misses last region, so add an extra <region> to text at end
            text += '<region>'
            let sfzJSON = parseSFZ(text)
            //console.log('sfzJSON', sfzJSON);
            let id = displayName.toLowerCase().replace(' ', '')
            console.log('id', id);
            samples[id] = {
                id,
                label: displayName,
                samples: sfzJSON
            }
        }
    }
});

let fileString = 'const Samples = ' + JSON.stringify(samples) + ' export default Samples;';
console.log(fileString);
//console.log(samples);

fs.writeFile(instrumentName + '.js', fileString, function (err) {
    if (err) return console.log(err);
    console.log('Created file: ' + instrumentName + '.js');
});

function transform (sfzText) {
    sfzText = sfzText.replace(/\/\/.*$/gm, "");
    return matchAll(sfzText, /<(.*?)>\s([\s\S]*?)((?=<)|\Z)/gm).map(function (res) {
        var kvs = matchAll(res[2], /(.*?)=(.*?)($|\s(?=.*?=))/gm);
        var prop = {};
        //console.log('match', kvs);
        kvs.forEach(function (kv) {
            prop[kv[1].replace(/\s/gm, "")] = /^\d*$/g.test(kv[2])
                ? Number(kv[2])
                : kv[2];
            if (/^[a-gA-G]#?\d$/.test(kv[2]))
                prop[kv[1]] = name2num(kv[2]);
        });
        if (prop.sample)
            prop.sample = prop.sample.replace(/\\/g, "/");
        return {
            type: res[1],
            property: prop,
        };
    });
}

function applyScopeHeaders (sfz) {
    var global;
    var group;
    return sfz
        .map(function (s) {
            if (s.type === "global")
                global = s;
            else if (s.type === "group")
                group = s;
            else {
                if (global)
                    s.property = Object.assign(Object.assign({}, s.property), global.property);
                if (group)
                    s.property = Object.assign(Object.assign({}, s.property), group.property);
                return s.property;
            }
        })
        .filter(function (s) { return typeof s !== "undefined"; });
}
function parseSFZ (sfzText) {
    return applyScopeHeaders(transform(sfzText));
}
function matchAll (str, regexp) {
    var match = null;
    var res = [];
    while ((match = regexp.exec(str)) !== null) {
        res.push(match);
    }
    return res;
}
function name2num (name) {
    var tmp = name.match(/^([a-gA-G])(#?)(\d)$/);
    if (!tmp)
        return -1;
    var d = tmp[1].toLowerCase();
    var s = tmp[2];
    var o = Number(tmp[3]);
    var res = (o + 1) * 12 + (s === "#" ? 1 : 0);
    switch (d) {
        case "c":
            return res;
        case "d":
            return res + 2;
        case "e":
            return res + 4;
        case "f":
            return res + 5;
        case "g":
            return res + 7;
        case "a":
            return res + 9;
        case "b":
            return res + 11;
        default:
            return -1;
    }
}
