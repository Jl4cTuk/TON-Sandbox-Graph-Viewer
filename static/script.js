let cy = null;
const FIELD_ORDER = [
    "from", 
    "to", 
    "on", 
    "value", 
    "op", 
    "success", 
    "exitCode", 
    "totalFees", 
    "lt", 
    "now", 
    "endStatus", 
    "oldStatus", 
    "actionResultCode", 
    "change", 
    "deploy", 
    "destroyed", 
    "inMessageBounceable", 
    "inMessageBounced"
];
let HIGHLIGHT_ASCII = false;

function showNodeInfo(data) {
    const infoTable = document.getElementById("info-table").querySelector("tbody");
    const bodyHex = document.getElementById("body-hex");
    const bodyDecoded = document.getElementById("body-decoded");

    infoTable.innerHTML = "";
    bodyHex.textContent = "No data";
    bodyDecoded.textContent = "No data";

    if (!data.keys || Object.keys(data.keys).length === 0) {
        infoTable.innerHTML = "<tr><td colspan='2'>No data</td></tr>";
        return;
    }

    const sortedKeys = Object.keys(data.keys).sort((a, b) => {
        let indexA = FIELD_ORDER.indexOf(a);
        let indexB = FIELD_ORDER.indexOf(b);
        if (indexA === -1) indexA = FIELD_ORDER.length;
        if (indexB === -1) indexB = FIELD_ORDER.length;
        return indexA - indexB;
    });

    for (const key of sortedKeys) {
        const value = data.keys[key];

        if (key === "body") {
            bodyHex.textContent = value;
            const decodedText = decodeHex(value);
            bodyDecoded.textContent = decodedText;

            if (HIGHLIGHT_ASCII) {
                bodyDecoded.innerHTML = highlightNotASCII(decodedText);
            }
        } else {
            infoTable.innerHTML += `
                <tr>
                    <td>${key}</td>
                    <td class="copy-text">${value}</td>
                </tr>`;
        }
    }

    document.querySelectorAll(".copy-text").forEach(cell => {
        cell.addEventListener("click", () => {
            navigator.clipboard.writeText(cell.textContent).then(() => {
                showToast("Copied");
            });
        });
    });
}


function highlightNotASCII(text) {
    return text.replace(/([^A-Za-z0-9])/g, '<span class="non-ascii-char">$1</span>');
}

async function loadGraphList() {
    try {
        const response = await fetch("/graphs");
        const files = await response.json();
        const select = document.getElementById("graphSelect");

        select.innerHTML = "";
        files.forEach(file => {
            const option = document.createElement("option");
            option.value = file;
            option.textContent = file;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error while getting graphs:", error);
    }
}

async function loadSelectedGraph() {
    const select = document.getElementById("graphSelect");
    if (!select.value) return;
    await loadGraph(select.value);
}

async function loadGraph(filename) {
    try {
        const response = await fetch(`/graph/${filename}`);
        const graphData = await response.json();

        if (!graphData || !Array.isArray(graphData)) {
            console.error("Error: bad JSON");
            return;
        }

        if (cy) cy.destroy();

        cy = cytoscape({
            container: document.getElementById("cy"),
            elements: graphData,
            style: [
                {
                    selector: "node",
                    style: {
                        label: "data(label)",
                        "background-color": "#a58400",
                        "text-halign": "center",
                        "text-valign": "center",
                        "color": "#EEEEEE",
                        "font-size": "12px",
                    }
                },
                {
                    selector: "edge",
                    style: {
                        width: 2,
                        "line-color": "#aaa"
                    }
                }
            ],
            layout: {
                name: "breadthfirst",
                directed: true,
                spacingFactor: 1,
                roots: "#0",
                fit: true,
                avoidOverlap: true
            },
            wheelSensitivity: 0.2,
            userZoomingEnabled: true,
            minZoom: 0.5,
            maxZoom: 2.5
        });

        cy.on("tap", "node", function(event) {
            showNodeInfo(event.target.data());
        });

    } catch (error) {
        console.error("Error on graph load:", error);
    }
}

function decodeHex(hexString) {
    if (!hexString) return "";
    let s = hexString.replace(/^0x/i, "").trim();
    let result = "";
    for (let i = 0; i < s.length; i += 2) {
        let code = parseInt(s.substr(i, 2), 16);
        if (!isNaN(code)) {
            result += String.fromCharCode(code);
        }
    }
    return result || "";
}

window.onload = async function() {
    await loadGraphList();
    const select = document.getElementById("graphSelect");
    if (select.value) await loadGraph(select.value);
};

function toggleHighlight() {
    HIGHLIGHT_ASCII = !HIGHLIGHT_ASCII;
    const bodyDecoded = document.getElementById("body-decoded");

    if (bodyDecoded.textContent !== "No data") {
        const decodedText = bodyDecoded.textContent;
        bodyDecoded.innerHTML = HIGHLIGHT_ASCII ? highlightNotASCII(decodedText) : decodedText;
    }
}


function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 200);
}

async function downloadScript() {
    try {
        const response = await fetch("/static/generateGraph.ts");
        if (!response.ok) throw new Error("Error on graph loading");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "generateGraph.ts";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error on downloading:", error);
    }
}

document.getElementById("file-upload").addEventListener("change", function (e) {
    if (this.files.length > 0) {
        uploadFile(this.files[0]);
    }
});

function uploadFile(file) {
    if (file.type !== "application/json") {
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadGraphList();
        } else {
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });
}

async function loadGraphList() {
    try {
        const response = await fetch("/graphs");
        const files = await response.json();
        const select = document.getElementById("graphSelect");

        select.innerHTML = "";
        files.forEach(file => {
            const option = document.createElement("option");
            option.value = file;
            option.textContent = file;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

document.getElementById("graphSelect").addEventListener("focus", loadGraphList);
