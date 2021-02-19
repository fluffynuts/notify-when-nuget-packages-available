const { NugetClient } = require("node-nuget-client");
const notifier = require("node-notifier");
const nodeNotifier = require("node-notifier");
const { addListener } = require("node-notifier");

let lastMap = {};
let haveNotified = false;
async function check() {
    const client = new NugetClient(),
        searchResults = await client.search("PeanutButter"),
        mine = searchResults.data.filter(o => o.projectUrl && o.projectUrl.indexOf("fluffynuts") > -1),
        packageVersions = mine.map(o => ({ id: o.id, version: o.version }));

    if (Object.keys(lastMap).length === 0) {
        reportStartState(packageVersions);
        lastMap = makeMap(packageVersions);
        return;
    }

    const
        currentMap = makeMap(packageVersions),
        versions = gatherAllVersions(packageVersions),
        notifications = [];
    Object.keys(currentMap).forEach(pkgId => {
        if (lastMap[pkgId] !== currentMap[pkgId]) {
            notifications.push(`${pkgId} -> ${currentMap[pkgId]}`);
        }
    });

    Object.keys(currentMap).forEach(k => lastMap[k] = currentMap[k]);

    if (notifications.length) {
        const
            message = notifications.join("\n"),
            title = "Package updates incoming!";
        log(title);
        log(message);
        nodeNotifier.notify({
            title,
            message,
            icon: "no icon plz, kthx"
        });
        haveNotified = true;
    } else {
        if (versions.length > 1) {
            log(`publication is still in progress: have versions: ${versions.join(", ")}`);
        } else {
            log("no new package versions seen");
        }
    }
}

function zeroPad(val) {
    val = (val || "").toString();
    while (val.length < 2) {
        val = `0${val}`
    }
    return val;
}

function log(str) {
    const
        now = new Date(),
        timestamp = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${zeroPad(now.getHours())}:${zeroPad(now.getMinutes())}:${zeroPad(now.getSeconds())}`;
    console.log(`[${timestamp}] ${str}`);
}

function makeMap(packageVersions) {
    return packageVersions.reduce((acc, cur) => {
        acc[cur.id] = cur.version;
        return acc;
    }, {});
}

function gatherAllVersions(packageVersions) {
    var counts = packageVersions.reduce(
        (acc, cur) => {
            if (acc[cur.version] === undefined) {
                acc[cur.version] = 1;
            } else {
                acc[cur.version]++;
            }
            return acc;
        }, {});

    return Object.keys(counts).map(k => `${k} -> ${counts[k]}`);
}

function reportStartState(packages) {
    log("package versions at startup");
    packages.forEach(p => console.log(`  ${p.id} :: ${p.version}`));
}

(async function () {
    while (true) {
        try {
            await check();
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (e) {
            console.error(e);
        }
    }
})();