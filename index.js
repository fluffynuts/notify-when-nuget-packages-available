const { NugetClient } = require("node-nuget-client");
const notifier = require("node-notifier");
const nodeNotifier = require("node-notifier");
const { addListener } = require("node-notifier");
const yargs = require("yargs");

let lastMap = {};
let haveExperiencedUpgrade = false;
async function check(monitor) {
    console.log(`check: ${monitor}`);
    const
        client = new NugetClient(),
        searchResults = await client.search(monitor),
        packageVersions = searchResults.data.map(o => ({ id: o.id, version: o.version }));
        
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
        haveExperiencedUpgrade = true;
    }
    Object.keys(currentMap).forEach(pkgId => {
        console.log(`${pkgId} :: ${currentMap[pkgId]}`);
    });
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

function gatherArgs() {
    return yargs.usage(`Usage: $0 [name]... {name}
eg: $0 NSubstitute NExpect
`);
}

(async function () {
    const monitor = gatherArgs().argv._;
    if (!monitor.length) {
        console.error("please provide one or more names to monitor");
        return;
    }
    while (true) {
        try {
            await Promise.all(monitor.map(check));
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (e) {
            console.error(e);
        }
    }
})();