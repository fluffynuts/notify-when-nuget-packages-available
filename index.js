const { NugetClient } = require("node-nuget-client");
const notifier = require("node-notifier");
const nodeNotifier = require("node-notifier");
const { addListener } = require("node-notifier");

let last = [];
let haveNotified = false;
async function check() {
    const client = new NugetClient(),
        searchResults = await client.search("PeanutButter"),
        mine = searchResults.data.filter(o => o.projectUrl && o.projectUrl.indexOf("fluffynuts") > -1),
        packageVersions = mine.map(o => ({ id: o.id, version: o.version }));

    if (last.length === 0) {
        reportStartState(packageVersions);
        last = packageVersions;
        return;
    }

    const
        lastMap = makeMap(last),
        currentMap = makeMap(packageVersions),
        versions = gatherAllVersions(packageVersions),
        notifications = [];
    Object.keys(currentMap).forEach(pkgId => {
        if (lastMap[pkgId] !== currentMap[pkgId]) {
            notifications.push(`${pkgId} -> ${currentMap[pkgId]}`);
        }
    });

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
            log("no new pb package versions seen");
        }
    }
}

function zeroPad(val) {
    val = (val || "").toString();
    return val.length < 2
        ? `0${val}`
        : val;
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
    return packageVersions.reduce(
        (acc, cur) => {
            if (acc.indexOf(cur.version) === -1) {
                acc.push(cur.version);
            }
            return acc;
        }, []);
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