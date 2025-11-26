const app = Vue.createApp({
    data() {
        return {
            pid: null,
            page: null,
            xml: null,
            pageWidth: 0,
            pageHeight: 0,
            blocks: [],
            highlightIndex: -1,
        };
    },

    async mounted() {
        const params = new URLSearchParams(location.search);
        this.pid = params.get("pid");
        this.page = params.get("page");

        const xmlPath = `../../data/${this.pid}/${this.pid}_${this.page}.xml`;

        const xmlText = await fetch(xmlPath).then(r => r.text());
        this.xml = new DOMParser().parseFromString(xmlText, "text/xml");

        this.parseXML();
        this.draw();
    },

    computed: {
        pageLabel() {
            return `${this.pid} ? page ${this.page}`;
        }
    },

    methods: {
        parsePolygon(pointsStr) {
            return pointsStr.split(",").map(Number);
        },

        parseXML() {
            const page = this.xml.getElementsByTagName("PAGE")[0];
            this.pageWidth = parseFloat(page.getAttribute("WIDTH"));
            this.pageHeight = parseFloat(page.getAttribute("HEIGHT"));

            const textBlocks = page.getElementsByTagName("TEXTBLOCK");

            this.blocks = [];

            for (let tb of textBlocks) {
                const lines = [...tb.getElementsByTagName("LINE")].map(ln => ({
                    X: parseFloat(ln.getAttribute("X")),
                    Y: parseFloat(ln.getAttribute("Y")),
                    WIDTH: parseFloat(ln.getAttribute("WIDTH")),
                    HEIGHT: parseFloat(ln.getAttribute("HEIGHT")),
                    STRING: ln.getAttribute("STRING"),
                    TYPE: ln.getAttribute("TYPE")
                }));

                // shape polygon
                const polyEl = tb.getElementsByTagName("POLYGON")[0];
                const poly = polyEl ? this.parsePolygon(polyEl.getAttribute("POINTS")) : null;

                this.blocks.push({
                    type: lines[0]?.TYPE ?? "text",
                    lines: lines,
                    polygon: poly
                });
            }
        },

        draw() {
            const canvas = document.getElementById("pageCanvas");
            const ctx = canvas.getContext("2d");

            const scale = Math.min(
                canvas.width / this.pageWidth,
                canvas.height / this.pageHeight
            );

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            this.blocks.forEach((blk, idx) => {
                if (!blk.polygon) return;

                const scaled = blk.polygon.map((v, i) =>
                    (i % 2 === 0)
                        ? v * scale            // x
                        : v * scale            // y
                );

                ctx.beginPath();
                ctx.moveTo(scaled[0], scaled[1]);
                for (let i = 2; i < scaled.length; i += 2) {
                    ctx.lineTo(scaled[i], scaled[i+1]);
                }
                ctx.closePath();

                ctx.lineWidth = (idx === this.highlightIndex) ? 3 : 1.5;
                ctx.strokeStyle = (idx === this.highlightIndex) ? "red" : "black";
                ctx.stroke();
            });
        },

        highlightBlock(index) {
            this.highlightIndex = index;
            this.draw();
        },

        clearHighlight() {
            this.highlightIndex = -1;
            this.draw();
        }
    }
});

app.mount("#app");
